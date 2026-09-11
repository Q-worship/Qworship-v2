import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * kjvQuoteIndex — HFB Quote Mode (trial)
 *
 * Word 4-gram inverted index over the bundled KJV so a spoken phrase
 * ("for god so loved the world that he gave his only begotten son") can be
 * resolved to the verse it quotes. This is a *suggestion* engine: the client
 * shows the result as a pill for the operator to confirm, it never projects.
 *
 * Design:
 *   - Text is normalised (lowercase, punctuation stripped, number words → digits)
 *     so Deepgram output and Bible text tokenise identically.
 *   - Each 4-word shingle is hashed (FNV-1a, 32-bit) and stored with the verse
 *     index and its word position: postings[hash] = [verseIdx*1024+pos, ...].
 *   - Query = last N words of the transcript. Every shingle hit is grouped by
 *     (verse, diagonal) where diagonal = versePos - queryPos, so a run of
 *     consecutive hits on one diagonal means the speaker is reading the verse
 *     in order. Run length is the primary confidence signal; IDF weighting
 *     suppresses boilerplate shingles ("and he said unto them").
 *   - Adjacent verses that both match are merged into a span (John 3:16–17).
 *
 * Memory: ~530k unique shingles for the KJV, hashed keys → ~80 MB heap.
 * The index is built lazily on first use so startup cost is only paid when
 * a session actually enters Quote mode.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NGRAM = 4;
const POS_STRIDE = 1024; // max words per verse (Esther 8:9 ≈ 90)
/** Shingles that appear in more verses than this are pure boilerplate. */
const MAX_DF = 200;
/** A following verse joins the span only with a real overlap, not one shared shingle. */
const SPAN_MIN_WORDS = 6;

export interface QuoteCandidate {
  book: string;
  chapter: number;
  verse: number;
  /** Set when the quote continues into the following verse(s). */
  verseEnd?: number;
  /** Number of consecutive transcript words matched in order. */
  consecutiveWords: number;
  /** IDF-weighted score; comparable only within one query. */
  score: number;
  /** True when the match starts at the first word of the verse. */
  startsAtVerseStart: boolean;
  /** The verse text (KJV) — sent to the client so the pill can show it. */
  text: string;
  /** Words of the query that matched, joined. */
  matchedText: string;
}

export interface QuoteMatchOptions {
  /** Minimum consecutive matched words to consider a verse at all. */
  minConsecutiveWords?: number;
  /** top-1 must beat top-2 (from a different, non-adjacent verse) by this ratio. */
  marginRatio?: number;
}

interface IndexedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

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

function fnv1a(words: string[], start: number): number {
  let h = 0x811c9dc5;
  for (let i = start; i < start + NGRAM; i++) {
    const w = words[i];
    for (let c = 0; c < w.length; c++) {
      h ^= w.charCodeAt(c);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0x20; // word separator
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

class KjvQuoteIndex {
  private verses: IndexedVerse[] = [];
  /** Most shingles occur once; store a bare number then and only allocate an array on the second hit. */
  private postings = new Map<number, number | number[]>();
  private idf = new Map<number, number>();
  private built = false;
  private building: Promise<void> | null = null;

  get isReady() {
    return this.built;
  }

  /** Build from the bundled KJV JSON. Idempotent; concurrent callers share one build. */
  ensureBuilt(): Promise<void> {
    if (this.built) return Promise.resolve();
    if (this.building) return this.building;
    this.building = new Promise<void>((resolve, reject) => {
      // Defer so the first Quote-mode session doesn't block the event loop
      // mid-message; the build itself is synchronous (~1s).
      setImmediate(() => {
        try {
          this.build();
          resolve();
        } catch (err) {
          this.building = null;
          reject(err);
        }
      });
    });
    return this.building;
  }

  private build() {
    const started = performance.now();
    const filePath = path.join(__dirname, "..", "data", "kjv.json");
    const raw: Array<{ book: string; chapter: number; verse: number; text: string }> =
      JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const df = new Map<number, number>();
    this.verses = raw.map((v) => ({
      book: v.book,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
    }));

    raw.forEach((v, verseIdx) => {
      const words = normalizeQuoteText(v.text);
      let lastHash = -1;
      for (let pos = 0; pos + NGRAM <= words.length; pos++) {
        const h = fnv1a(words, pos);
        const packed = verseIdx * POS_STRIDE + pos;
        const existing = this.postings.get(h);
        if (existing === undefined) this.postings.set(h, packed);
        else if (typeof existing === "number") this.postings.set(h, [existing, packed]);
        else existing.push(packed);
        if (h !== lastHash) df.set(h, (df.get(h) ?? 0) + 1);
        lastHash = h;
      }
    });

    const n = this.verses.length;
    for (const [h, count] of df) {
      if (count > MAX_DF) {
        this.postings.delete(h);
        continue;
      }
      this.idf.set(h, Math.log(n / count));
    }

    this.built = true;
    console.log(
      `[KjvQuoteIndex] Built: ${n} verses, ${this.postings.size} shingles in ${Math.round(performance.now() - started)}ms`,
    );
  }

  /**
   * Find the single best verse the given words are quoting, or null when
   * nothing clears the thresholds. `words` should be the normalised tail of
   * the transcript (≈ last 20 words).
   */
  match(words: string[], opts: QuoteMatchOptions = {}): QuoteCandidate | null {
    if (!this.built || words.length < NGRAM) return null;
    const minConsecutive = opts.minConsecutiveWords ?? 5;
    const marginRatio = opts.marginRatio ?? 1.5;

    // key = verseIdx*POS_STRIDE + diagonal(+offset so it's non-negative)
    // value = { run, bestRun, lastQ, score, firstQ, firstVersePos }
    type Run = { verseIdx: number; run: number; bestRun: number; lastQ: number; score: number; startQ: number; startPos: number; bestStartQ: number; bestStartPos: number };
    const runs = new Map<number, Run>();

    for (let q = 0; q + NGRAM <= words.length; q++) {
      const h = fnv1a(words, q);
      const entry = this.postings.get(h);
      if (entry === undefined) continue;
      const weight = this.idf.get(h) ?? 0;
      const list = typeof entry === "number" ? [entry] : entry;
      for (const packed of list) {
        const verseIdx = Math.floor(packed / POS_STRIDE);
        const pos = packed % POS_STRIDE;
        const diagonal = pos - q + POS_STRIDE; // keep non-negative
        const key = verseIdx * (POS_STRIDE * 2) + diagonal;
        let r = runs.get(key);
        if (!r) {
          r = { verseIdx, run: 0, bestRun: 0, lastQ: -2, score: 0, startQ: q, startPos: pos, bestStartQ: q, bestStartPos: pos };
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
        r.score += weight;
      }
    }

    if (runs.size === 0) return null;

    // Collapse diagonals → best run per verse.
    const perVerse = new Map<number, Run>();
    for (const r of runs.values()) {
      const cur = perVerse.get(r.verseIdx);
      if (!cur || r.bestRun > cur.bestRun || (r.bestRun === cur.bestRun && r.score > cur.score)) {
        perVerse.set(r.verseIdx, r);
      }
    }

    const ranked = [...perVerse.values()]
      .map((r) => ({ ...r, consecutiveWords: r.bestRun + NGRAM - 1 }))
      .filter((r) => r.consecutiveWords >= minConsecutive)
      .sort((a, b) => b.consecutiveWords - a.consecutiveWords || b.score - a.score);

    if (ranked.length === 0) return null;
    const top = ranked[0];
    const topVerse = this.verses[top.verseIdx];

    // Span detection: does the following verse continue the quote?
    let verseEnd: number | undefined;
    let cursor = top.verseIdx;
    for (;;) {
      const next = perVerse.get(cursor + 1);
      const nextVerse = this.verses[cursor + 1];
      if (
        !next ||
        !nextVerse ||
        nextVerse.book !== topVerse.book ||
        nextVerse.chapter !== topVerse.chapter ||
        next.bestRun + NGRAM - 1 < SPAN_MIN_WORDS
      ) break;
      verseEnd = nextVerse.verse;
      cursor += 1;
    }

    // Margin check against the best competitor that is not part of the span.
    const competitor = ranked.find((r) => {
      if (r.verseIdx === top.verseIdx) return false;
      const v = this.verses[r.verseIdx];
      const inSpan =
        v.book === topVerse.book &&
        v.chapter === topVerse.chapter &&
        v.verse > topVerse.verse &&
        v.verse <= (verseEnd ?? topVerse.verse);
      return !inSpan;
    });
    if (competitor) {
      const sameLength = competitor.consecutiveWords === top.consecutiveWords;
      if (sameLength && top.score < competitor.score * marginRatio) return null;
    }

    return {
      book: topVerse.book,
      chapter: topVerse.chapter,
      verse: topVerse.verse,
      verseEnd,
      consecutiveWords: top.consecutiveWords,
      score: top.score,
      startsAtVerseStart: top.bestStartPos === 0,
      text: topVerse.text,
      matchedText: words.slice(top.bestStartQ, top.bestStartQ + top.consecutiveWords).join(" "),
    };
  }
}

export const kjvQuoteIndex = new KjvQuoteIndex();
