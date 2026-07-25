import { normalizeBookName } from "./handsfreeBible/index.js";

export const BIBLE_VERSION_KEYS = ["kjv", "nkjv", "amp", "msg", "esv", "niv"] as const;
export type ManagedBibleVersion = typeof BIBLE_VERSION_KEYS[number];

export interface ParsedBibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  line?: number;
}

export interface BibleParseIssue {
  line: number;
  value: string;
  reason: string;
}

const parseObject = (value: any, line?: number): ParsedBibleVerse | null => {
  const rawBook = String(value?.book ?? value?.bookName ?? "").trim();
  const normalized = normalizeBookName(rawBook);
  const chapter = Number(value?.chapter);
  const verse = Number(value?.verse ?? value?.number);
  const text = String(value?.text ?? "").trim();
  if (!normalized || !Number.isInteger(chapter) || chapter < 1 ||
      !Number.isInteger(verse) || verse < 1 || !text) {
    return null;
  }
  return { book: normalized.name, chapter, verse, text, line };
};

export function parseBibleInput(input: string): {
  verses: ParsedBibleVerse[];
  issues: BibleParseIssue[];
  duplicates: string[];
} {
  const trimmed = input.trim();
  const verses: ParsedBibleVerse[] = [];
  const issues: BibleParseIssue[] = [];

  if (!trimmed) return { verses, issues: [{ line: 1, value: "", reason: "Input is empty" }], duplicates: [] };

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const rows = Array.isArray(parsed) ? parsed : (parsed.verses || []);
      if (!Array.isArray(rows)) throw new Error("JSON must be an array or contain a verses array");
      rows.forEach((row, index) => {
        const verse = parseObject(row, index + 1);
        if (verse) verses.push(verse);
        else issues.push({ line: index + 1, value: JSON.stringify(row), reason: "Invalid book, chapter, verse, or empty text" });
      });
    } catch (error: any) {
      return { verses, issues: [{ line: 1, value: trimmed.slice(0, 200), reason: error.message }], duplicates: [] };
    }
  } else {
    trimmed.split(/\r?\n/).forEach((rawLine, index) => {
      const value = rawLine.trim();
      if (!value) return;
      // Supports "John 3:16 text" and "John 3 16 text".
      const match = value.match(/^((?:[1-3]\s*)?[A-Za-z]+(?:\s+(?:of\s+)?[A-Za-z]+){0,3})\s+(\d+)(?::|\s+)(\d+)\s+(.+)$/);
      if (!match) {
        issues.push({ line: index + 1, value, reason: "Expected: Book chapter:verse text" });
        return;
      }
      const verse = parseObject({
        book: match[1], chapter: match[2], verse: match[3], text: match[4],
      }, index + 1);
      if (verse) verses.push(verse);
      else issues.push({ line: index + 1, value, reason: "Unknown book or invalid reference" });
    });
  }

  const seen = new Set<string>();
  const duplicates: string[] = [];
  const unique = verses.filter(item => {
    const key = `${item.book}|${item.chapter}|${item.verse}`;
    if (seen.has(key)) {
      duplicates.push(`${item.book} ${item.chapter}:${item.verse}`);
      return false;
    }
    seen.add(key);
    return true;
  });
  return { verses: unique, issues, duplicates };
}

