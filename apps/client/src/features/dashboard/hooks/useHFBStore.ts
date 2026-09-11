import { create } from 'zustand';
import { db } from '../../../lib/db';
import { useBibleRAMCache } from './useBibleRAMCache';
import { apiClient } from '../../../lib/api';
import {
  BIBLE_VERSION_KEYS,
  DEFAULT_PINNED_BIBLE_VERSIONS,
  type BibleVersionCode,
} from '../data/bibleTranslations';

const HFB_PREFERENCES_STORAGE_KEY = 'qworship_hfb_pinned_versions';

const normalizePinnedVersions = (values: unknown): BibleVersionCode[] => {
  if (!Array.isArray(values)) return DEFAULT_PINNED_BIBLE_VERSIONS;
  const normalized = [...new Set(values
    .map(value => String(value).toLowerCase())
    .filter((value): value is BibleVersionCode =>
      BIBLE_VERSION_KEYS.includes(value as BibleVersionCode),
    ))].slice(0, 6);
  return normalized.length ? normalized : DEFAULT_PINNED_BIBLE_VERSIONS;
};

const readStoredPinnedVersions = (): BibleVersionCode[] => {
  if (typeof window === 'undefined') return DEFAULT_PINNED_BIBLE_VERSIONS;
  try {
    return normalizePinnedVersions(JSON.parse(localStorage.getItem(HFB_PREFERENCES_STORAGE_KEY) || 'null'));
  } catch {
    return DEFAULT_PINNED_BIBLE_VERSIONS;
  }
};


import { BIBLE_BOOKS_LCC } from '../data/bibleBooks';

export interface HFBChapterVerse {
  number: number;
  text: string;
}

export interface HFBTranscriptLine {
  id: number;
  text: string;
  ts: string; // timestamp
}

export interface HFBDetectedVerse {
  id: number;
  reference: string;
  verseText: string;
  version: string;
  isActive: boolean;
  verseNum: number;
  book: string;
  chapter: number;
}

export interface HFBProjectedVerse {
  reference: string;
  text: string;
  version: string;
}

/** QUOTE MODE (trial): a verse the pastor appears to be quoting, awaiting operator confirmation. */
export type HFBSubMode = 'reference' | 'quote';

export interface HFBSuggestedVerse {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  reference: string;
  /** 'read-along' = matched against the loaded chapter; 'global' = matched against the whole KJV. */
  origin: 'read-along' | 'global';
  /** Translation the quote was matched in (read-along uses whatever chapter is loaded). */
  matchedVersion: string;
  /** Verse text in matchedVersion, for the pill preview. */
  text: string;
  matchedText: string;
  confidence: number; // 0–1
  consecutiveWords: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface HFBResolvedVerse {
  number: number;
  text: string;
  source: "ram" | "indexeddb" | "network";
}

/** Canonical verse count for a chapter; falls back to canon max. */
export const chapterVerseCount = (book: string, chapter: number): number =>
  BIBLE_BOOKS_LCC.find(item => item.name === book)?.verses[chapter - 1] ?? 176;

export async function resolveCachedHFBVerse(
  book: string,
  chapter: number,
  verse: number,
  version: string,
): Promise<{ number: number; text: string; source: "ram" | "indexeddb" } | null> {
  const versionKey = version.toLowerCase();
  const ramVerse = useBibleRAMCache.getState()
    .getChapter(versionKey, book, chapter)
    ?.find(item => item.number === verse);
  if (ramVerse?.text?.trim()) return { ...ramVerse, source: "ram" };

  const localVerse = await db.verses
    .where("[version+book+chapter+verse]")
    .equals([versionKey, book, chapter, verse])
    .first();
  if (localVerse?.text?.trim()) {
    return { number: localVerse.verse, text: localVerse.text, source: "indexeddb" };
  }
  return null;
}

/**
 * In-flight chapter fetches, keyed `version|book|chapter`.
 * Concurrent interim frames that miss cache for the same chapter reuse the single request.
 */
const chapterFetches = new Map<string, Promise<HFBChapterVerse[] | null>>();

/**
 * Tier 2. Fetches an entire chapter from the API, seeds IndexedDB and RAM,
 * and returns the normalized verses. Returns null on failure without throwing.
 */
export async function fetchChapterFromNetwork(
  book: string,
  chapter: number,
  version: string,
): Promise<HFBChapterVerse[] | null> {
  const vKey = version.toLowerCase();
  const cacheKey = `${vKey}|${book}|${chapter}`;
  const inFlight = chapterFetches.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async (): Promise<HFBChapterVerse[] | null> => {
    try {
      const response = await apiClient.post('/bible/search', {
        book,
        chapter,
        verseStart: 1,
        verseEnd: chapterVerseCount(book, chapter),
        version: vKey,
      });

      const data = response.data;
      if (!data?.success || !data?.result?.verses?.length) {
        console.warn(`[HFB] Network lookup returned no verses for ${book} ${chapter} (${vKey})`);
        return null;
      }

      const verses: HFBChapterVerse[] = (data.result.verses as any[])
        .map(item => ({
          number: Number(item.number ?? item.verse ?? 0),
          text: String(item[vKey] ?? item.text ?? '').trim(),
        }))
        .filter(item => item.number > 0 && item.text.length > 0)
        .sort((left, right) => left.number - right.number);

      if (!verses.length) return null;

      // Seed both IndexedDB and RAM so subsequent lookups are instant (~0ms)
      try {
        await db.verses.bulkPut(verses.map(item => ({
          version: vKey, book, chapter, verse: item.number, text: item.text,
        })));
      } catch (dbError) {
        console.error('[HFB] Failed to seed IndexedDB', dbError);
      }
      useBibleRAMCache.getState().setChapterInRam(vKey, book, chapter, verses);

      return verses;
    } catch (error) {
      console.warn(`[HFB] Network lookup failed for ${book} ${chapter} (${vKey})`, error);
      return null;
    } finally {
      chapterFetches.delete(cacheKey);
    }
  })();

  chapterFetches.set(cacheKey, request);
  return request;
}

/**
 * Full tiered resolver. RAM -> IndexedDB -> Network.
 */
export async function resolveHFBVerse(
  book: string,
  chapter: number,
  verse: number,
  version: string,
): Promise<HFBResolvedVerse | null> {
  const cached = await resolveCachedHFBVerse(book, chapter, verse, version);
  if (cached) return cached;

  const verses = await fetchChapterFromNetwork(book, chapter, version);
  const match = verses?.find(item => item.number === verse);
  if (!match) {
    console.warn(`[HFB] Unresolvable reference: ${book} ${chapter}:${verse} (${version})`);
    return null;
  }
  return { number: match.number, text: match.text, source: 'network' };
}

interface HFBStore {
  // Version config
  hfbVersion: string;
  setHfbVersion: (version: string) => void;
  hfbPinnedVersions: BibleVersionCode[];
  hfbPreferencesLoaded: boolean;
  setHfbPinnedVersions: (versions: BibleVersionCode[]) => void;
  loadHfbPreferences: () => Promise<void>;
  saveHfbPreferences: (versions: BibleVersionCode[]) => Promise<void>;

  // Strict Mode
  hfbStrictMode: boolean;
  setHfbStrictMode: (strict: boolean) => void;

  // Chapter viewer state
  hfbBookName: string;
  hfbChapter: number;
  hfbChapterVerses: HFBChapterVerse[];
  /** Lower-case version code the loaded hfbChapterVerses belong to (may lag hfbVersion mid-switch). */
  hfbChapterVersion: string;
  hfbChapterLoading: boolean;
  hfbActiveVerseNum: number | null;

  setHfbChapterView: (book: string, chapter: number, verses: HFBChapterVerse[]) => void;
  setHfbChapterLoading: (loading: boolean) => void;
  setHfbActiveVerseNum: (num: number | null) => void;

  // Transcript state
  hfbTranscriptLines: HFBTranscriptLine[];
  addHfbTranscriptLine: (line: HFBTranscriptLine) => void;
  clearHfbTranscript: () => void;
  hfbCurrentPartial: string;
  hfbCurrentPartialReferences: Array<{ book: string; chapter: number; verse: number; formatted: string }>;
  hfbLiveTokens: {
    committedText: string;
    candidate?: {
      text: string;
      type: 'reference' | 'navigation' | 'version';
      status: 'evaluating' | 'executed';
      label: string;
    };
    liveTailText: string;
  };
  setHfbCurrentPartial: (text: string, references?: Array<{ book: string; chapter: number; verse: number; formatted: string }>) => void;
  setHfbLiveTokens: (tokens: {
    committedText: string;
    candidate?: {
      text: string;
      type: 'reference' | 'navigation' | 'version';
      status: 'evaluating' | 'executed';
      label: string;
    };
    liveTailText: string;
  }) => void;

  // Detected verses
  hfbDetectedVerses: HFBDetectedVerse[];
  setHfbDetectedVerses: (verses: HFBDetectedVerse[] | ((prev: HFBDetectedVerse[]) => HFBDetectedVerse[])) => void;
  addHfbDetectedVerse: (verse: HFBDetectedVerse) => void;

  hfbCurrentProjected: HFBProjectedVerse | null;
  setHfbCurrentProjected: (projected: HFBProjectedVerse | null) => void;

  // QUOTE MODE (trial)
  hfbSubMode: HFBSubMode;
  setHfbSubMode: (mode: HFBSubMode) => void;
  hfbSuggestedVerse: HFBSuggestedVerse | null;
  setHfbSuggestedVerse: (
    suggestion: HFBSuggestedVerse | null | ((prev: HFBSuggestedVerse | null) => HFBSuggestedVerse | null),
  ) => void;
  
  // Connection state
  hfbConnectionStatus: "idle" | "connecting" | "ready" | "reconnecting" | "disconnected";
  setHfbConnectionStatus: (status: "idle" | "connecting" | "ready" | "reconnecting" | "disconnected") => void;
  hfbLastLatencyMs: number | null;
  hfbLastLatencySource: string | null;
  setHfbLatency: (milliseconds: number, source: string) => void;

  // Async actions
  fetchHFBChapter: (book: string, chapter: number, version: string, highlightVerse?: number) => Promise<void>;
  
  // Quick flush
  clearAllState: () => void;
}

let latestChapterFetchSequence = 0;

export const useHFBStore = create<HFBStore>((set, get) => ({
  hfbVersion: 'KJV',
  setHfbVersion: (version) => set({ hfbVersion: version }),
  hfbPinnedVersions: readStoredPinnedVersions(),
  hfbPreferencesLoaded: false,
  setHfbPinnedVersions: (versions) => {
    const normalized = normalizePinnedVersions(versions);
    if (typeof window !== 'undefined') {
      localStorage.setItem(HFB_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
    }
    set({ hfbPinnedVersions: normalized });
  },
  loadHfbPreferences: async () => {
    if (get().hfbPreferencesLoaded) return;
    try {
      const response = await apiClient.get('/auth/bible-preferences');
      const normalized = normalizePinnedVersions(response.data?.pinnedVersions);
      if (typeof window !== 'undefined') {
        localStorage.setItem(HFB_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
      }
      set({ hfbPinnedVersions: normalized, hfbPreferencesLoaded: true });
    } catch (error) {
      console.warn('[HFB] Using locally cached Bible preferences', error);
      set({ hfbPreferencesLoaded: true });
    }
  },
  saveHfbPreferences: async (versions) => {
    const normalized = normalizePinnedVersions(versions);
    if (normalized.length > 6) throw new Error('Choose no more than 6 translations');
    const response = await apiClient.put('/auth/bible-preferences', {
      pinnedVersions: normalized,
    });
    const saved = normalizePinnedVersions(response.data?.pinnedVersions);
    if (typeof window !== 'undefined') {
      localStorage.setItem(HFB_PREFERENCES_STORAGE_KEY, JSON.stringify(saved));
    }
    set({ hfbPinnedVersions: saved, hfbPreferencesLoaded: true });
  },

  hfbStrictMode: false,
  setHfbStrictMode: (strict) => set({ hfbStrictMode: strict }),

  hfbSubMode: 'reference',
  setHfbSubMode: (mode) => set({ hfbSubMode: mode, hfbSuggestedVerse: null }),
  hfbSuggestedVerse: null,
  setHfbSuggestedVerse: (suggestion) => set((state) => ({
    hfbSuggestedVerse: typeof suggestion === 'function' ? suggestion(state.hfbSuggestedVerse) : suggestion,
  })),

  hfbBookName: '',
  hfbChapter: 0,
  hfbChapterVerses: [],
  hfbChapterVersion: '',
  hfbChapterLoading: false,
  hfbActiveVerseNum: null,

  setHfbChapterView: (book, chapter, verses) => set((state) => ({
    hfbBookName: book, hfbChapter: chapter, hfbChapterVerses: verses,
    hfbChapterVersion: state.hfbVersion.toLowerCase(), hfbChapterLoading: false,
  })),
  setHfbChapterLoading: (loading) => set({ hfbChapterLoading: loading }),
  setHfbActiveVerseNum: (num) => set({ hfbActiveVerseNum: num }),

  hfbTranscriptLines: [],
  addHfbTranscriptLine: (line) => set((state) => {
    const newLines = [...state.hfbTranscriptLines, line];
    // Keep only the immediately useful transcript context.
    return { hfbTranscriptLines: newLines.slice(-10) };
  }),
  clearHfbTranscript: () => set({
    hfbTranscriptLines: [],
    hfbCurrentPartial: '',
    hfbCurrentPartialReferences: [],
    hfbLiveTokens: { committedText: '', liveTailText: '' },
  }),
  hfbCurrentPartial: '',
  hfbCurrentPartialReferences: [],
  hfbLiveTokens: { committedText: '', liveTailText: '' },
  setHfbCurrentPartial: (text, references) => set({
    hfbCurrentPartial: text,
    hfbCurrentPartialReferences: references || [],
  }),
  setHfbLiveTokens: (tokens) => set({ hfbLiveTokens: tokens }),

  hfbDetectedVerses: [],
  setHfbDetectedVerses: (verses) => set((state) => ({
    hfbDetectedVerses: typeof verses === 'function' ? verses(state.hfbDetectedVerses) : verses
  })),
  addHfbDetectedVerse: (verse) => set((state) => {
    const newVerses = [...state.hfbDetectedVerses, verse];
    // MEMORY MGMT: Prune to last 20 detected verses
    return { hfbDetectedVerses: newVerses.slice(-20) };
  }),

  hfbCurrentProjected: null,
  setHfbCurrentProjected: (projected) => set({ hfbCurrentProjected: projected }),

  hfbConnectionStatus: "idle",
  setHfbConnectionStatus: (status) => set({ hfbConnectionStatus: status }),
  hfbLastLatencyMs: null,
  hfbLastLatencySource: null,
  setHfbLatency: (milliseconds, source) => set({
    hfbLastLatencyMs: Math.max(0, Math.round(milliseconds)),
    hfbLastLatencySource: source,
  }),

  fetchHFBChapter: async (book, chapter, version, highlightVerse) => {
    // If the requested chapter is already loaded in Center Stage for this EXACT version, just update the active verse highlight
    const current = get();
    const vKey = version.toLowerCase();
    // Compare against the version the loaded verses actually belong to —
    // callers set hfbVersion before fetching, so hfbVersion alone would
    // short-circuit a translation switch and leave the old text on stage.
    if (
      current.hfbBookName === book &&
      current.hfbChapter === chapter &&
      current.hfbChapterVersion === vKey &&
      current.hfbChapterVerses.length > 0
    ) {
      if (highlightVerse !== undefined) {
        set({ hfbActiveVerseNum: highlightVerse });
      }
      return;
    }

    const fetchSeq = ++latestChapterFetchSequence;
    set({
      hfbBookName: book,
      hfbChapter: chapter,
      hfbVersion: version.toUpperCase(),
      hfbChapterVersion: vKey,
      hfbChapterLoading: true,
      hfbActiveVerseNum: highlightVerse !== undefined ? highlightVerse : null,
      hfbChapterVerses: [],
    });
    try {

      // 0. Try RAM Cache (0.00ms latency)
      const memStartTime = performance.now();
      const ramVerses = useBibleRAMCache.getState().getChapter(vKey, book, chapter);
      const memEndTime = performance.now();
      
      if (ramVerses && ramVerses.length > 0) {
        const hasAnyText = ramVerses.some((v: any) => v.text && v.text.trim().length > 0);
        if (hasAnyText) {
          if (fetchSeq !== latestChapterFetchSequence) return;
          const normalizedRamVerses = (ramVerses as any[]).map((v: any) => ({
            number: Number(v.number ?? v.verse ?? 1),
            text: String(v.text || "").trim(),
          }));
          set({ hfbChapterVerses: normalizedRamVerses, hfbChapterLoading: false });
          if (highlightVerse !== undefined) {
             set({ hfbActiveVerseNum: highlightVerse });
          }
          console.log(`🚀 [RAM CACHE HFB] Fetched ${book} ${chapter} (${vKey}) in ${(memEndTime - memStartTime).toFixed(2)}ms`);
          return;
        }
      }

      // 1. Try to fetch from Local IndexedDB
      const startTime = performance.now();
      const localVerses = await db.verses
        .where({ version: vKey, book: book, chapter })
        .toArray();
      const endTime = performance.now();

      if (fetchSeq !== latestChapterFetchSequence) return;

      if (localVerses && localVerses.length > 0) {
        const hasAnyText = localVerses.some((v: any) => v.text && v.text.trim().length > 0);
        if (!hasAnyText) {
          console.warn(`[IndexedDB HFB] All ${localVerses.length} cached verses for ${book} ${chapter} (${vKey}) are empty — treating as cache miss.`);
          try {
            await db.verses.where({ version: vKey, book, chapter }).delete();
          } catch (_) { /* non-critical */ }
        } else {
          // Sort verses to ensure correct order
          localVerses.sort((a: any, b: any) => (a.verse ?? a.number ?? 0) - (b.verse ?? b.number ?? 0));
          
          const mappedVerses = localVerses.map((v: any) => ({
            number: Number(v.number ?? v.verse ?? 1),
            text: String(v.text || '').trim(),
          }));

          if (fetchSeq !== latestChapterFetchSequence) return;
          set({ hfbChapterVerses: mappedVerses, hfbChapterLoading: false });
          if (highlightVerse !== undefined) {
             set({ hfbActiveVerseNum: highlightVerse });
          }
          console.log(`🚀 [IndexedDB HFB] Fetched ${book} ${chapter} (${vKey}) locally in ${(endTime - startTime).toFixed(2)}ms`);
          return; // Success, skip cloud fallback
        }
      }

      console.warn(`[Local DB] Verses not found for ${book} ${chapter} (${vKey}). Falling back to Cloud API...`);

      const verses = await fetchChapterFromNetwork(book, chapter, version);
      if (fetchSeq !== latestChapterFetchSequence) return;

      if (verses && verses.length > 0) {
        set({ hfbChapterVerses: verses, hfbChapterLoading: false });
        if (highlightVerse !== undefined) {
           set({ hfbActiveVerseNum: highlightVerse });
        }
      } else {
        set({ hfbChapterLoading: false });
      }
    } catch (err) {
      console.error(`❌ [HFB] Failed to fetch chapter for ${book} ${chapter}:`, err);
      if (fetchSeq !== latestChapterFetchSequence) return;
      set({ hfbChapterLoading: false });
    }
  },

  clearAllState: () => set({
    hfbBookName: '',
    hfbChapter: 0,
    hfbChapterVerses: [],
    hfbChapterVersion: '',
    hfbActiveVerseNum: null,
    hfbTranscriptLines: [],
    hfbCurrentPartial: '',
    hfbCurrentPartialReferences: [],
    hfbLiveTokens: { committedText: '', liveTailText: '' },
    hfbDetectedVerses: [],
    hfbCurrentProjected: null,
    hfbSuggestedVerse: null,
    hfbLastLatencyMs: null,
    hfbLastLatencySource: null,
  })
}));
