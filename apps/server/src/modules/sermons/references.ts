import { FastBibleParser } from "../bible/fast-bible-parser.js";
import type { ISermonTranscript } from "./sermon.model.js";

type Reference = ISermonTranscript["references"][number];
type Segment = { text: string; at?: Date };

/**
 * Finds the scripture references spoken in a transcript.
 *
 * FastBibleParser returns one match per string, and neither live feed is a
 * reliable unit to parse: raw Deepgram segments can split "John 3 verse 16"
 * across a boundary, and HFB's utterance text keeps only its last 24 words.
 * So scan the whole transcript with overlapping word windows instead.
 */
const WINDOW_WORDS = 14;
const STRIDE_WORDS = 5;

// A window ending on one of these may have cut a reference short
// ("John 3 verse 1|6"); the next window sees the whole thing.
const DANGLING =
  /^(\d+|verse|verses|chapter|chapters|and|to|through|thru|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|first|second|third)$/i;

function parseReference(text: string): Omit<Reference, "at"> | null {
  try {
    const cmd = FastBibleParser.parse(text);
    if (cmd?.name !== "project_bible_reference") return null;
    const { book, chapter, verse_start, verse_end } = cmd.arguments ?? {};
    if (!book || !chapter) return null;
    const verses = verse_start ? `:${verse_start}${verse_end && verse_end !== verse_start ? `-${verse_end}` : ""}` : "";
    return { label: `${book} ${chapter}${verses}`, book, chapter, verseStart: verse_start, verseEnd: verse_end };
  } catch {
    return null;
  }
}

export function scanReferences(segments: Segment[]): Reference[] {
  const words: { word: string; at?: Date }[] = [];
  for (const s of segments) {
    for (const word of s.text.split(/\s+/).filter(Boolean)) words.push({ word, at: s.at });
  }

  const found: Reference[] = [];
  const seen = new Set<string>();
  for (let start = 0; start < words.length; start += STRIDE_WORDS) {
    const window = words.slice(start, start + WINDOW_WORDS);
    const atEnd = start + WINDOW_WORDS >= words.length;
    const tail = window.slice(-2).map((w) => w.word.replace(/[.,!?;:]+$/, ""));
    if (!atEnd && tail.some((w) => DANGLING.test(w))) continue;

    // The parser is tuned for spoken commands; punctuation inside a window
    // ("chapter four, verse four.") stops it matching.
    const ref = parseReference(window.map((w) => w.word.replace(/[.,!?;:"]+/g, "")).join(" "));
    if (!ref || seen.has(ref.label)) continue;
    seen.add(ref.label);
    found.push({ ...ref, at: window[0].at ?? new Date() });
    if (atEnd) break;
  }

  // Safety nets for truncations that slipped through:
  // - a window ending early: drop "John 3:1" when "John 3:16" was also found
  //   (and "John 1" when "John 16:3" was);
  // - a window starting late loses "second" from "second Corinthians 5:17",
  //   so the same position under the same book name with a different number
  //   prefix is a duplicate; the first one found saw the whole phrase.
  const position = (r: Reference) => `${r.chapter}${r.verseStart ? `:${r.verseStart}` : ""}`;
  const baseBook = (r: Reference) => r.book.replace(/^\d+\s*/, "").toLowerCase();
  return found.filter(
    (r, i) =>
      !found.some(
        (o, j) =>
          o !== r &&
          ((o.book === r.book && position(o).length > position(r).length && position(o).startsWith(position(r))) ||
            (j < i && o.book !== r.book && baseBook(o) === baseBook(r) && position(o) === position(r)))
      )
  );
}
