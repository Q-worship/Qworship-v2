import { create } from 'zustand';
import { db } from '../../../lib/db';
import { useBibleRAMCache } from './useBibleRAMCache';
import { apiClient } from '../../../lib/api';


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

interface HFBStore {
  // Version config
  hfbVersion: string;
  setHfbVersion: (version: string) => void;

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
  setHfbCurrentPartial: (text: string) => void;

  // Detected verses
  hfbDetectedVerses: HFBDetectedVerse[];
  setHfbDetectedVerses: (verses: HFBDetectedVerse[] | ((prev: HFBDetectedVerse[]) => HFBDetectedVerse[])) => void;
  addHfbDetectedVerse: (verse: HFBDetectedVerse) => void;

  hfbCurrentProjected: HFBProjectedVerse | null;
  setHfbCurrentProjected: (projected: HFBProjectedVerse | null) => void;
  
  // Connection state
  hfbConnectionStatus: "idle" | "connecting" | "connected" | "disconnected";
  setHfbConnectionStatus: (status: "idle" | "connecting" | "connected" | "disconnected") => void;

  // Async actions
  fetchHFBChapter: (book: string, chapter: number, version: string, highlightVerse?: number) => Promise<void>;
  
  // Quick flush
  clearAllState: () => void;
}

export const useHFBStore = create<HFBStore>((set) => ({
  hfbVersion: 'KJV',
  setHfbVersion: (version) => set({ hfbVersion: version }),

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
    // MEMORY MGMT: Prune to last 50 lines to prevent UI lag
    return { hfbTranscriptLines: newLines.slice(-50) };
  }),
  clearHfbTranscript: () => set({ hfbTranscriptLines: [] }),
  hfbCurrentPartial: '',
  setHfbCurrentPartial: (text) => set({ hfbCurrentPartial: text }),

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
          text: v[vKey] || v.kjv || "",
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
    hfbDetectedVerses: [],
    hfbCurrentProjected: null,
  })
}));
