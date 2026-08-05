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
  setHfbCurrentPartial: (text: string, references?: Array<{ book: string; chapter: number; verse: number; formatted: string }>) => void;

  // Detected verses
  hfbDetectedVerses: HFBDetectedVerse[];
  setHfbDetectedVerses: (verses: HFBDetectedVerse[] | ((prev: HFBDetectedVerse[]) => HFBDetectedVerse[])) => void;
  addHfbDetectedVerse: (verse: HFBDetectedVerse) => void;

  hfbCurrentProjected: HFBProjectedVerse | null;
  setHfbCurrentProjected: (projected: HFBProjectedVerse | null) => void;
  
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

  hfbBookName: '',
  hfbChapter: 0,
  hfbChapterVerses: [],
  hfbChapterLoading: false,
  hfbActiveVerseNum: null,

  setHfbChapterView: (book, chapter, verses) => set({ hfbBookName: book, hfbChapter: chapter, hfbChapterVerses: verses, hfbChapterLoading: false }),
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
  }),
  hfbCurrentPartial: '',
  hfbCurrentPartialReferences: [],
  setHfbCurrentPartial: (text, references) => set({
    hfbCurrentPartial: text,
    hfbCurrentPartialReferences: references || [],
  }),

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
    set({ hfbBookName: book, hfbChapter: chapter, hfbChapterLoading: true, hfbChapterVerses: [] });
    try {
      const vKey = version.toLowerCase();

      // 0. Try RAM Cache (0.00ms latency)
      const memStartTime = performance.now();
      const ramVerses = useBibleRAMCache.getState().getChapter(vKey, book, chapter);
      const memEndTime = performance.now();
      
      if (ramVerses && ramVerses.length > 0) {
        set({ hfbChapterVerses: ramVerses as any[], hfbChapterLoading: false });
        if (highlightVerse !== undefined) {
           set({ hfbActiveVerseNum: highlightVerse });
        }
        console.log(`🚀 [RAM CACHE HFB] Fetched ${book} ${chapter} (${vKey}) in ${(memEndTime - memStartTime).toFixed(2)}ms`);
        return;
      }

      // 1. Try to fetch from Local IndexedDB
      const startTime = performance.now();
      const localVerses = await db.verses
        .where({ version: vKey, book: book, chapter })
        .toArray();
      const endTime = performance.now();

      if (localVerses && localVerses.length > 0) {
        // QC65 defensive check: if ALL cached verses have empty text, the cache
        // is stale (e.g. AMP/MSG cached before the data was populated). Treat as
        // a miss and fall through to the cloud API to get the real data.
        const hasAnyText = localVerses.some((v: any) => v.text && v.text.trim().length > 0);
        if (!hasAnyText) {
          console.warn(`[IndexedDB HFB] All ${localVerses.length} cached verses for ${book} ${chapter} (${vKey}) are empty — treating as cache miss.`);
          // Purge the stale empty entries so they don't block future fetches
          try {
            await db.verses.where({ version: vKey, book, chapter }).delete();
          } catch (_) { /* non-critical */ }
        } else {
          // Sort verses to ensure correct order
          localVerses.sort((a: any, b: any) => a.verse - b.verse);
          
          const mappedVerses = localVerses.map((v: any) => ({
            number: v.verse,
            text: v.text || '',
          }));

          set({ hfbChapterVerses: mappedVerses, hfbChapterLoading: false });
          if (highlightVerse !== undefined) {
             set({ hfbActiveVerseNum: highlightVerse });
          }
          console.log(`🚀 [IndexedDB HFB] Fetched ${book} ${chapter} (${vKey}) locally in ${(endTime - startTime).toFixed(2)}ms`);
          return; // Success, skip cloud fallback
        }
      }

      console.warn(`[Local DB] Verses not found for ${book} ${chapter} (${vKey}). Falling back to Cloud API...`);
      
      // 2. Fallback to Cloud API if local sync failed or isn't complete
      // Use apiClient (axios) which correctly resolves to https://api.qworship.com/api
      // DO NOT use fetch('/api/bible/search') — relative URLs resolve to qworship.com/api
      // which returns the React SPA HTML, not JSON.
      const resp = await apiClient.post('/bible/search', {
        book, chapter, verseStart: 1, verseEnd: 150, version: vKey
      });
      const data = resp.data;
      if (data?.success && data?.result) {
        const verses = (data.result.verses as any[]).map((v: any) => ({
          number: v.verse,
          text: v[vKey] || "",
        }));

        // --- LAZY SEEDING: Cache to IndexedDB for next time ---
        try {
          const dbVerses = verses.map((v: any) => ({
             version: vKey,
             book: book,
             chapter: chapter,
             verse: v.number,
             text: v.text
          }));
          // Use put to handle potential partial duplicates safely
          await db.verses.bulkPut(dbVerses);
          console.log(`✅ [Lazy Seed] Cached ${book} ${chapter} (${vKey}) to IndexedDB`);
        } catch (dbErr) {
          console.error("[Lazy Seed] Failed to cache to IndexedDB:", dbErr);
        }

        // Also seed RAM cache so next access is instant
        const ramVerses = verses.map((v: any) => ({ number: v.number, text: v.text }));
        useBibleRAMCache.getState().setChapterInRam(vKey, book, chapter, ramVerses);

        set({ hfbChapterVerses: verses, hfbChapterLoading: false });
        if (highlightVerse !== undefined) {
           set({ hfbActiveVerseNum: highlightVerse });
        }
      } else {
        set({ hfbChapterLoading: false });
      }
    } catch (e) {
      console.error("[HFB Store] Fetch Error:", e);
      set({ hfbChapterLoading: false });
    }
  },

  clearAllState: () => set({
    hfbBookName: '',
    hfbChapter: 0,
    hfbChapterVerses: [],
    hfbActiveVerseNum: null,
    hfbTranscriptLines: [],
    hfbCurrentPartial: '',
    hfbDetectedVerses: [],
    hfbCurrentProjected: null,
    hfbLastLatencyMs: null,
    hfbLastLatencySource: null,
  })
}));
