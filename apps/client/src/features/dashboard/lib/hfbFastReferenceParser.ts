import { BIBLE_BOOKS_LCC } from "../data/bibleBooks";

export interface HFBParsedReference {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  confidence: number;
  explicit: true;
}

const aliases = new Map<string, string>();
for (const item of BIBLE_BOOKS_LCC) aliases.set(item.name.toLowerCase(), item.name);
[
  ["psalm", "Psalms"], ["song of songs", "Song of Solomon"],
  ["revelations", "Revelation"], ["mathew", "Matthew"], ["look", "Luke"],
  ["first corinthians", "1 Corinthians"], ["second corinthians", "2 Corinthians"],
  ["first thessalonians", "1 Thessalonians"], ["second thessalonians", "2 Thessalonians"],
  ["first timothy", "1 Timothy"], ["second timothy", "2 Timothy"],
  ["first peter", "1 Peter"], ["second peter", "2 Peter"],
  ["first john", "1 John"], ["second john", "2 John"], ["third john", "3 John"],
  ["first kings", "1 Kings"], ["second kings", "2 Kings"],
  ["first samuel", "1 Samuel"], ["second samuel", "2 Samuel"],
  ["first chronicles", "1 Chronicles"], ["second chronicles", "2 Chronicles"],
].forEach(([alias, canonical]) => aliases.set(alias, canonical));

const bookAlternation = [...aliases.keys()]
  .sort((a, b) => b.length - a.length)
  .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const units: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const tens: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

const parseNumber = (value: string): number => {
  if (/^\d+$/.test(value)) return Number(value);
  const words = value.toLowerCase().replace(/-/g, " ").split(/\s+/);
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

const patterns = [
  new RegExp(`\\b(${bookAlternation})\\s+chapter\\s+(${numberWords})\\s+verse\\s+(${numberWords})(?:\\s+(?:to|through|and)\\s+(${numberWords}))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+(\\d+)\\s*[:.]\\s*(\\d+)(?:\\s*[-–—]\\s*(\\d+))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+chapter\\s+(\\d+)\\s+(\\d+)(?:\\s+(?:to|through|and)\\s+(\\d+))?\\b`, "i"),
  new RegExp(`\\b(${bookAlternation})\\s+(\\d+)\\s+(\\d+)(?:\\s+(?:to|through|and)\\s+(\\d+))?\\b`, "i"),
];

export function parseHFBReference(text: string): HFBParsedReference | null {
  const clean = text.toLowerCase().replace(/[!?;,]+/g, " ").replace(/\s+/g, " ").trim();
  for (let index = 0; index < patterns.length; index++) {
    const match = clean.match(patterns[index]);
    if (!match) continue;
    const book = aliases.get(match[1].toLowerCase());
    const chapter = parseNumber(match[2]);
    const verse = parseNumber(match[3]);
    const verseEnd = match[4] ? parseNumber(match[4]) : undefined;
    if (!book || !Number.isInteger(chapter) || chapter < 1 ||
        !Number.isInteger(verse) || verse < 1 || verse > 176 ||
        (verseEnd !== undefined && (!Number.isInteger(verseEnd) || verseEnd < verse))) continue;
    const bookData = BIBLE_BOOKS_LCC.find(item => item.name === book);
    if (!bookData || chapter > bookData.chapters) continue;
    return {
      book, chapter, verse, verseEnd,
      confidence: index === 1 ? 0.99 : index === 0 ? 0.96 : 0.9,
      explicit: true,
    };
  }
  return null;
}

