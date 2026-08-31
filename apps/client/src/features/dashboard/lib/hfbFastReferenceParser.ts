import { BIBLE_BOOKS_LCC } from "../data/bibleBooks";

export interface HFBParsedReference {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  confidence: number;
  explicit: true;
}

export interface HFBContextNavigation {
  chapter: number;
  verse: number;
}

const aliases = new Map<string, string>();
for (const item of BIBLE_BOOKS_LCC) aliases.set(item.name.toLowerCase(), item.name);
[
  ["psalm", "Psalms"], ["psalms", "Psalms"], ["pslams", "Psalms"], ["salm", "Psalms"], ["salms", "Psalms"], ["book of psalms", "Psalms"],
  ["phillippians", "Philippians"], ["phillipians", "Philippians"],
  ["liviticus", "Leviticus"], ["song of songs", "Song of Solomon"],
  ["revelations", "Revelation"], ["mathew", "Matthew"], ["look", "Luke"],
  ["first corinthians", "1 Corinthians"], ["second corinthians", "2 Corinthians"],
  ["first thessalonians", "1 Thessalonians"], ["second thessalonians", "2 Thessalonians"],
  ["first timothy", "1 Timothy"], ["second timothy", "2 Timothy"],
  ["first peter", "1 Peter"], ["second peter", "2 Peter"],
  ["first john", "1 John"], ["second john", "2 John"], ["third john", "3 John"],
  ["first kings", "1 Kings"], ["second kings", "2 Kings"],
  ["first samuel", "1 Samuel"], ["second samuel", "2 Samuel"],
  ["first chronicles", "1 Chronicles"], ["second chronicles", "2 Chronicles"],
  ["1st corinthians", "1 Corinthians"], ["2nd corinthians", "2 Corinthians"],
  ["1st thessalonians", "1 Thessalonians"], ["2nd thessalonians", "2 Thessalonians"],
  ["1st timothy", "1 Timothy"], ["2nd timothy", "2 Timothy"],
  ["1st peter", "1 Peter"], ["2nd peter", "2 Peter"],
  ["1st john", "1 John"], ["2nd john", "2 John"], ["3rd john", "3 John"],
  ["1st kings", "1 Kings"], ["2nd kings", "2 Kings"],
  ["1st samuel", "1 Samuel"], ["2nd samuel", "2 Samuel"],
  ["1st chronicles", "1 Chronicles"], ["2nd chronicles", "2 Chronicles"],
].forEach(([alias, canonical]) => aliases.set(alias, canonical));

const bookAlternation = [...aliases.keys()]
  .sort((a, b) => b.length - a.length)
  .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const units: Record<string, number> = {
  zero: 0, o: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const tens: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

const parseNumber = (value: string): number => {
  let cleanValue = value.toLowerCase().trim();
  cleanValue = cleanValue.replace(/\b1\s*['’]?\s*(?:o|oh|0)\s*['’]?\s*(\d)\b/g, "10$1");
  cleanValue = cleanValue.replace(/\b([1-9])\s+[oO0]\s+([0-9])\b/g, "$10$2");
  cleanValue = cleanValue.replace(/\bone\s+['’]?\s*(?:o|oh)\s*['’]?\s*(one|two|three|four|five|six|seven|eight|nine)\b/g, (_, unit) => {
    const uMap: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
    return `10${uMap[unit] || unit}`;
  });
  if (/^\d+$/.test(cleanValue)) return Number(cleanValue);
  if (/^(\d\s+){1,4}\d$/.test(cleanValue)) return Number(cleanValue.replace(/\s+/g, ""));

  const words = cleanValue.replace(/-/g, " ").split(/\s+/).filter(w => w !== "and");
  let total = 0;
  for (const word of words) {
    if (word === "hundred") total = Math.max(1, total) * 100;
    else if (word in units) total += units[word];
    else if (word in tens) total += tens[word];
    else return Number.NaN;
  }
  return total;
};

const numberWords = "(?:\\d+|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen))?)";
const fillerWords = "(?:(?:and\\s+in|and\\s+then\\s+in|and\\s+also|and\\s+at|and\\s+from|and\\s+reading\\s+from|now\\s+in|and|in|at)\\s+)?";

const patterns = [
  new RegExp(`\\b(${bookAlternation})\\s+chapter\\s+(${numberWords})\\s+${fillerWords}verse\\s+(${numberWords})(?:\\s+(?:to|through|and)\\s+(${numberWords}))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+((?:(?:\\d|[oO])\\s+){1,5})${fillerWords}verse\\s+(${numberWords})(?:\\s+(?:to|through|and)\\s+(${numberWords}))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+(${numberWords})\\s+${fillerWords}verse\\s+(${numberWords})(?:\\s+(?:to|through|and)\\s+(${numberWords}))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+(\\d+)\\s*[:.]\\s*(\\d+)(?:\\s*[-–—]\\s*(\\d+))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+chapter\\s+(\\d+)\\s+(\\d+)(?:\\s+(?:to|through|and)\\s+(\\d+))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+(\\d+)\\s+(\\d+)(?:\\s+(?:to|through|and)\\s+(\\d+))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\\s+(${numberWords})\\b`, "i"),
];

const contextualChapterVersePattern = new RegExp(
  `\\bchapter\\s+(${numberWords})\\s+${fillerWords}(?:verse\\s+)?(${numberWords})\\b`,
  "i",
);

/**
 * Scan all chapter+verse commands in a transcript that intentionally omit the book.
 * Returns an ordered array of all valid occurrences.
 */
export function scanHFBContextNavigations(
  text: string,
): Array<HFBContextNavigation & { index: number; text: string }> {
  const clean = text
    .toLowerCase()
    .replace(/[!?;,.:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const results: Array<HFBContextNavigation & { index: number; text: string }> = [];
  const matcher = new RegExp(contextualChapterVersePattern.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(clean)) !== null) {
    const prefix = clean.slice(0, match.index).trim();
    let hasPrecedingBook = false;
    if (prefix.length > 0) {
      for (const [alias] of aliases) {
        if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i").test(prefix)) {
          hasPrecedingBook = true;
          break;
        }
      }
    }
    if (hasPrecedingBook) continue;

    const chapter = parseNumber(match[1]);
    const verse = parseNumber(match[2]);
    if (
      Number.isInteger(chapter) && chapter >= 1 && chapter <= 150 &&
      Number.isInteger(verse) && verse >= 1 && verse <= 176
    ) {
      results.push({ chapter, verse, index: match.index, text: match[0] });
    }
  }

  return results;
}

export function parseHFBContextNavigation(
  text: string,
): HFBContextNavigation | null {
  const all = scanHFBContextNavigations(text);
  return all.length > 0 ? all[all.length - 1] : null;
}

export function parseHFBReference(text: string): HFBParsedReference | null {
  const clean = text.toLowerCase().replace(/[!?;,]+/g, " ").replace(/\s+/g, " ").trim();
  let latest: (HFBParsedReference & { start: number; patternIndex: number }) | null = null;
  for (let index = 0; index < patterns.length; index++) {
    const matcher = new RegExp(patterns[index].source, "gi");
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(clean)) !== null) {
      const book = aliases.get(match[1].toLowerCase());
      const chapter = parseNumber(match[2]);
      const verse = parseNumber(match[3]);
      const verseEnd = match[4] ? parseNumber(match[4]) : undefined;
      if (!book || !Number.isInteger(chapter) || chapter < 1 ||
          !Number.isInteger(verse) || verse < 1 || verse > 176 ||
          (verseEnd !== undefined && (!Number.isInteger(verseEnd) || verseEnd < verse))) continue;
      const bookData = BIBLE_BOOKS_LCC.find(item => item.name === book);
      if (!bookData || chapter > bookData.chapters) continue;
      const candidate = {
        book, chapter, verse, verseEnd,
        confidence: index === 3 ? 0.99 : index === 0 ? 0.96 : index === 2 ? 0.94 : 0.9,
        explicit: true as const,
        start: match.index,
        patternIndex: index,
      };
      if (!latest || candidate.start > latest.start ||
          (candidate.start === latest.start && candidate.patternIndex < latest.patternIndex)) {
        latest = candidate;
      }
    }
  }
  if (!latest) return null;
  const { start: _start, patternIndex: _patternIndex, ...reference } = latest;
  return reference;
}
