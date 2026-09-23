import type { HFBChapterVerse } from "../hooks/useHFBStore";

/**
 * hfbQuoteMatcher — QUOTE MODE (trial), read-along tier.
 *
 * Client-side counterpart of the server's KJV shingle index, scoped to the
 * chapter currently loaded in the center stage. Because the candidate set is
 * tiny (≤176 verses) and the prior is strong (the pastor is almost certainly
 * reading the verse after the active one), this tier:
 *   - runs entirely in the browser with no network hop, in any translation,
 *   - accepts shorter matches than the global tier,
 *   - relaxes the threshold for verses adjacent to the active one,
 *   - reports the verse being read *now* (latest match in the transcript).
 *
 * Same normalisation and diagonal-run algorithm as the server so behaviour
 * is predictable across both tiers.
 */

const NGRAM = 4;

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};

export function normalizeQuoteText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/'s\b/g, "s")
    .replace(/'/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NUMBER_WORDS[w] ?? w);
}

export interface ChapterQuoteIndex {
  key: string;
  verses: Array<{ number: number; text: string; wordCount: number }>;
  /** shingle → [{ verseIdx, pos }] */
  shingles: Map<string, Array<{ verseIdx: number; pos: number }>>;
}

export function buildChapterQuoteIndex(
  key: string,
  chapterVerses: HFBChapterVerse[],
): ChapterQuoteIndex {
  const shingles = new Map<string, Array<{ verseIdx: number; pos: number }>>();
  const verses = chapterVerses.map((v, verseIdx) => {
    const words = normalizeQuoteText(v.text);
    for (let pos = 0; pos + NGRAM <= words.length; pos++) {
      const k = words.slice(pos, pos + NGRAM).join(" ");
      let list = shingles.get(k);
      if (!list) {
        list = [];
        shingles.set(k, list);
      }
      list.push({ verseIdx, pos });
    }
    return { number: v.number, text: v.text, wordCount: words.length };
  });
  return { key, verses, shingles };
}

export interface ReadAlongCandidate {
  verse: number;
  consecutiveWords: number;
  startsAtVerseStart: boolean;
  /** Distance from the active verse (0 = same verse). */
  distance: number;
  text: string;
  matchedText: string;
}

/**
 * Find the verse in the loaded chapter the given words are reading from.
 * `words` = normalised transcript tail (≈ last 20 words).
 */
export function matchReadAlong(
  index: ChapterQuoteIndex,
  words: string[],
  activeVerse: number | null,
): ReadAlongCandidate | null {
  if (words.length < NGRAM) return null;

  type Run = { verseIdx: number; run: number; bestRun: number; lastQ: number; startQ: number; startPos: number; bestStartQ: number; bestStartPos: number };
  const runs = new Map<string, Run>();

  for (let q = 0; q + NGRAM <= words.length; q++) {
    const k = words.slice(q, q + NGRAM).join(" ");
    const list = index.shingles.get(k);
    if (!list) continue;
    for (const { verseIdx, pos } of list) {
      const key = `${verseIdx}:${pos - q}`;
      let r = runs.get(key);
      if (!r) {
        r = { verseIdx, run: 0, bestRun: 0, lastQ: -2, startQ: q, startPos: pos, bestStartQ: q, bestStartPos: pos };
        runs.set(key, r);
      }
      if (r.lastQ === q - 1) {
        r.run += 1;
      } else {
        r.run = 1;
        r.startQ = q;
        r.startPos = pos;
      }
      if (r.run > r.bestRun) {
        r.bestRun = r.run;
        r.bestStartQ = r.startQ;
        r.bestStartPos = r.startPos;
      }
      r.lastQ = q;
    }
  }
  if (runs.size === 0) return null;

  // Every run that clears its (distance-dependent) threshold is a candidate;
  // the one that ends latest in the transcript is where the pastor is *now*.
  // Ranking per run (not per verse) matters: a verse can match twice — an
  // earlier overlap with the previous verse and its own opening words — and
  // it's the later run that tells us he has moved on.
  const candidates = [...runs.values()].map((r) => {
    const consecutiveWords = r.bestRun + NGRAM - 1;
    const verseNum = index.verses[r.verseIdx].number;
    const distance = activeVerse == null ? 99 : Math.abs(verseNum - activeVerse);
    // Adjacent verses need only one shingle; anything further needs a real phrase.
    const minWords = distance <= 2 ? 4 : 6;
    return { r, consecutiveWords, verseNum, distance, minWords };
  }).filter((c) => c.consecutiveWords >= c.minWords)
    .sort((a, b) => b.r.lastQ - a.r.lastQ || b.consecutiveWords - a.consecutiveWords);

  if (candidates.length === 0) return null;
  const top = candidates[0];

  return {
    verse: top.verseNum,
    consecutiveWords: top.consecutiveWords,
    startsAtVerseStart: top.r.bestStartPos === 0,
    distance: top.distance,
    text: index.verses[top.r.verseIdx].text,
    matchedText: words.slice(top.r.bestStartQ, top.r.bestStartQ + top.consecutiveWords).join(" "),
  };
}

/** Map a run length to a 0–1 confidence for the pill. */
export function quoteConfidence(consecutiveWords: number, bonus = 0): number {
  return Math.min(1, 0.4 + (consecutiveWords - 4) * 0.06 + bonus);
}
