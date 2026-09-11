import { useCallback, useEffect, useRef } from "react";
import {
  useHFBStore,
  resolveHFBVerse,
  type HFBSuggestedVerse,
} from "./useHFBStore";
import {
  buildChapterQuoteIndex,
  matchReadAlong,
  normalizeQuoteText,
  quoteConfidence,
  type ChapterQuoteIndex,
} from "../lib/hfbQuoteMatcher";

/**
 * useHFBQuoteMode — QUOTE MODE (trial)
 *
 * Owns everything Quote-mode on the client:
 *   - read-along matching against the loaded chapter (tier 1, local)
 *   - receiving global KJV matches from the server (tier 2)
 *   - arbitration between the two, upsert into the single suggestion pill
 *   - pill decay, confirm, dismiss
 *
 * It never projects on its own. `projectVerse` is handed in by
 * useHandsfreeBible so confirmation goes through the exact same path as a
 * server bible_match. To remove the feature: delete this file,
 * lib/hfbQuoteMatcher.ts, HFBQuoteSuggestionPill.tsx, the store fields and
 * the handful of call sites marked "QUOTE MODE (trial)".
 */

const WINDOW_WORDS = 20;
const HISTORY_WORDS = 40;
/** How long a tier's candidate stays eligible for arbitration. */
const CANDIDATE_TTL_MS = 4000;
/** Pill auto-dismisses after this long without reinforcement. */
const PILL_TTL_MS = 45_000;
/** Skip suggesting a verse that was explicitly detected this recently. */
const DETECTED_DEDUP_MS = 10_000;

type Tiered = {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  origin: "read-along" | "global";
  matchedVersion: string;
  text: string;
  matchedText: string;
  consecutiveWords: number;
  confidence: number;
  at: number;
};

interface UseHFBQuoteModeParams {
  projectVerse: (book: string, chapter: number, verse: number, text: string) => void;
}

export function useHFBQuoteMode({ projectVerse }: UseHFBQuoteModeParams) {
  const readAlongRef = useRef<Tiered | null>(null);
  const globalRef = useRef<Tiered | null>(null);
  const lastGlobalSeqRef = useRef(0);
  const recentWordsRef = useRef<string[]>([]);
  const chapterIndexRef = useRef<ChapterQuoteIndex | null>(null);

  const isQuoteMode = () => useHFBStore.getState().hfbSubMode === "quote";

  // ── Arbitration + upsert ──────────────────────────────────────────────
  const reconcile = useCallback(() => {
    const now = Date.now();
    const ra = readAlongRef.current && now - readAlongRef.current.at < CANDIDATE_TTL_MS ? readAlongRef.current : null;
    const gl = globalRef.current && now - globalRef.current.at < CANDIDATE_TTL_MS ? globalRef.current : null;

    let winner: Tiered | null;
    if (ra && gl) {
      const sameChapter = gl.book === ra.book && gl.chapter === ra.chapter;
      // A strong global hit elsewhere is evidence the pastor left the chapter;
      // otherwise the chapter prior wins.
      winner = sameChapter ? ra : gl.consecutiveWords >= 2 * ra.consecutiveWords ? gl : ra;
    } else {
      winner = ra ?? gl;
    }
    if (!winner) return;

    const state = useHFBStore.getState();

    // Don't suggest what's already up, or what the reference detector just handled.
    const active = state.hfbActiveVerseNum;
    const isProjectedVerse =
      winner.book === state.hfbBookName &&
      winner.chapter === state.hfbChapter &&
      winner.verse === active &&
      !(winner.verseEnd && active != null && winner.verseEnd > active);
    if (isProjectedVerse) return;
    const recentlyDetected = state.hfbDetectedVerses.some(
      (d) =>
        d.book === winner!.book &&
        d.chapter === winner!.chapter &&
        d.verseNum === winner!.verse &&
        now - d.id < DETECTED_DEDUP_MS,
    );
    if (recentlyDetected) return;

    const reference = `${winner.book} ${winner.chapter}:${winner.verse}${winner.verseEnd ? `-${winner.verseEnd}` : ""}`;
    state.setHfbSuggestedVerse((prev) => {
      const same =
        prev &&
        prev.book === winner!.book &&
        prev.chapter === winner!.chapter &&
        prev.verse === winner!.verse;
      if (same && prev) {
        return {
          ...prev,
          verseEnd: Math.max(prev.verseEnd ?? 0, winner!.verseEnd ?? 0) || undefined,
          reference,
          origin: winner!.origin,
          matchedText: winner!.matchedText.length > prev.matchedText.length ? winner!.matchedText : prev.matchedText,
          confidence: Math.max(prev.confidence, winner!.confidence),
          consecutiveWords: Math.max(prev.consecutiveWords, winner!.consecutiveWords),
          lastSeenAt: now,
        };
      }
      const next: HFBSuggestedVerse = {
        book: winner!.book,
        chapter: winner!.chapter,
        verse: winner!.verse,
        verseEnd: winner!.verseEnd,
        reference,
        origin: winner!.origin,
        matchedVersion: winner!.matchedVersion,
        text: winner!.text,
        matchedText: winner!.matchedText,
        confidence: winner!.confidence,
        consecutiveWords: winner!.consecutiveWords,
        firstSeenAt: now,
        lastSeenAt: now,
      };
      return next;
    });
  }, []);

  // ── Tier 1: read-along against the loaded chapter ─────────────────────
  const runReadAlong = useCallback((partialText: string) => {
    const state = useHFBStore.getState();
    if (!state.hfbBookName || state.hfbChapterVerses.length === 0) {
      readAlongRef.current = null;
      return;
    }
    const key = `${state.hfbChapterVersion}|${state.hfbBookName}|${state.hfbChapter}|${state.hfbChapterVerses.length}`;
    if (chapterIndexRef.current?.key !== key) {
      chapterIndexRef.current = buildChapterQuoteIndex(key, state.hfbChapterVerses);
    }
    const words = [...recentWordsRef.current, ...normalizeQuoteText(partialText)].slice(-WINDOW_WORDS);
    const c = matchReadAlong(chapterIndexRef.current, words, state.hfbActiveVerseNum);
    if (!c) return;
    readAlongRef.current = {
      book: state.hfbBookName,
      chapter: state.hfbChapter,
      verse: c.verse,
      origin: "read-along",
      matchedVersion: state.hfbChapterVersion,
      text: c.text,
      matchedText: c.matchedText,
      consecutiveWords: c.consecutiveWords,
      confidence: quoteConfidence(c.consecutiveWords, c.distance <= 2 ? 0.15 : 0),
      at: Date.now(),
    };
  }, []);

  const onPartial = useCallback((text: string) => {
    if (!isQuoteMode()) return;
    runReadAlong(text);
    reconcile();
  }, [runReadAlong, reconcile]);

  const onFinal = useCallback((text: string) => {
    if (!isQuoteMode()) return;
    runReadAlong(text);
    reconcile();
    recentWordsRef.current = [...recentWordsRef.current, ...normalizeQuoteText(text)].slice(-HISTORY_WORDS);
  }, [runReadAlong, reconcile]);

  // ── Tier 2: global KJV match from the server ──────────────────────────
  const onServerSuggestion = useCallback((data: {
    seq: number;
    matchedVersion: string;
    candidate: {
      book: string; chapter: number; verse: number; verseEnd?: number;
      consecutiveWords: number; text: string; matchedText: string;
    };
  }) => {
    if (!isQuoteMode()) return;
    if (data.seq <= lastGlobalSeqRef.current) return;
    lastGlobalSeqRef.current = data.seq;
    const c = data.candidate;
    globalRef.current = {
      book: c.book,
      chapter: c.chapter,
      verse: c.verse,
      verseEnd: c.verseEnd,
      origin: "global",
      matchedVersion: data.matchedVersion,
      text: c.text,
      matchedText: c.matchedText,
      consecutiveWords: c.consecutiveWords,
      confidence: quoteConfidence(c.consecutiveWords),
      at: Date.now(),
    };
    reconcile();
  }, [reconcile]);

  // ── Operator actions ──────────────────────────────────────────────────
  const dismissSuggestion = useCallback(() => {
    readAlongRef.current = null;
    globalRef.current = null;
    useHFBStore.getState().setHfbSuggestedVerse(null);
  }, []);

  const confirmSuggestion = useCallback(async () => {
    const pill = useHFBStore.getState().hfbSuggestedVerse;
    if (!pill) return;
    const version = useHFBStore.getState().hfbVersion;
    const resolved = await resolveHFBVerse(pill.book, pill.chapter, pill.verse, version);
    const text =
      resolved?.text ??
      (pill.matchedVersion === version.toLowerCase() ? pill.text : "");
    if (!text) {
      console.warn(`[HFB Quote] Could not resolve ${pill.reference} in ${version}`);
      return;
    }
    dismissSuggestion();
    projectVerse(pill.book, pill.chapter, pill.verse, text);
  }, [projectVerse, dismissSuggestion]);

  // ── Decay + reset on mode change ──────────────────────────────────────
  const hfbSubMode = useHFBStore((s) => s.hfbSubMode);
  useEffect(() => {
    readAlongRef.current = null;
    globalRef.current = null;
    recentWordsRef.current = [];
    lastGlobalSeqRef.current = 0;
    if (hfbSubMode !== "quote") return;
    const timer = window.setInterval(() => {
      const pill = useHFBStore.getState().hfbSuggestedVerse;
      if (pill && Date.now() - pill.lastSeenAt > PILL_TTL_MS) {
        useHFBStore.getState().setHfbSuggestedVerse(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hfbSubMode]);

  return { onPartial, onFinal, onServerSuggestion, confirmSuggestion, dismissSuggestion };
}
