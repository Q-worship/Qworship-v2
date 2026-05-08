import { BibleService } from "./bible.service.js";

/**
 * FastBibleParser
 * A lightweight, high-performance parser designed for sub-10ms reference extraction.
 * Optimized for streaming results (interim transcripts).
 */
export class FastBibleParser {
  private static readonly BOOK_ALIASES: Record<string, string> = BibleService.BOOK_ALIASES;
  
  // Pre-compiled regex for performance
  private static readonly PATTERNS = {
    // John 3:16 or John 3.16
    colon: /^([a-z0-9\s]+?)\s+(\d+)[:.](\d+)(?:\s*[-–—]\s*(\d+))?$/i,
    // John 3 16
    space: /^([a-z0-9\s]+?)\s+(\d+)\s+(\d+)(?:\s+(?:to|through|-)\s+(\d+))?$/i,
    // John 316 (compressed 3-digit format from voice recognition)
    compressed: /^([a-z0-9\s]+?)\s*[,\s]*(\d)(\d{2})$/i,
    // 1 John 3:16
    numberedColon: /^(\d)\s*([a-z\s]+?)\s+(\d+)[:.](\d+)(?:\s*[-–—]\s*(\d+))?$/i,
    // 1 John 3 16
    numberedSpace: /^(\d)\s*([a-z\s]+?)\s+(\d+)\s+(\d+)(?:\s+(?:to|through|-)\s+(\d+))?$/i,
    // Matthew 24 (chapter only)
    chapterOnly: /^([a-z0-9\s]+?)\s+(\d+)$/i,
    // 1 John 3 (chapter only)
    numberedChapterOnly: /^(\d)\s*([a-z\s]+?)\s+(\d+)$/i,
  };

  /**
   * Parses a transcript snippet for Bible references or commands.
   * Returns a command object if a high-confidence match is found.
   */
  static parse(text: string): any | null {
    let cleanText = text.toLowerCase().trim().replace(/[.,!?;]$/, "");
    if (cleanText.length < 3) return null;

    // 0. Normalize spoken numbers ("three" -> "3")
    cleanText = this.normalizeNumbers(cleanText);

    // 1. Check for Version Switch (e.g., "switch to NIV")
    const versionMatch = cleanText.match(/(?:switch to|use|change to|show me|read in)\s+(niv|kjv|nkjv|esv|amp|msg|gn|gnt)/i);
    if (versionMatch) {
      return {
        name: "switch_bible_version",
        arguments: { version: versionMatch[1].toLowerCase() }
      };
    }

    // 2. Check for Navigation (e.g., "next verse", "previous chapter")
    if (/(?:next verse|go next|forward|next one)/i.test(cleanText)) {
      return { name: "navigate_bible", arguments: { direction: "next", scope: "verse" } };
    }
    if (/(?:previous verse|go back|back)/i.test(cleanText)) {
      return { name: "navigate_bible", arguments: { direction: "prev", scope: "verse" } };
    }
    if (/(?:next chapter|following chapter)/i.test(cleanText)) {
      return { name: "navigate_bible", arguments: { direction: "next", scope: "chapter" } };
    }
    if (/(?:previous chapter|last chapter)/i.test(cleanText)) {
      return { name: "navigate_bible", arguments: { direction: "prev", scope: "chapter" } };
    }

    // 3. Check for References
    const ref = this.extractReference(cleanText);
    if (ref) {
      return {
        name: "project_bible_reference",
        arguments: {
          book: ref.book,
          chapter: ref.chapter,
          verse_start: ref.verseStart,
          verse_end: ref.verseEnd || null,
          version: "kjv" // Default
        }
      };
    }

    return null;
  }

  private static normalizeNumbers(text: string): string {
    return text
      .replace(/\bninety\b/g, "90")
      .replace(/\beighty\b/g, "80")
      .replace(/\bseventy\b/g, "70")
      .replace(/\bsixty\b/g, "60")
      .replace(/\bfifty\b/g, "50")
      .replace(/\bforty\b/g, "40")
      .replace(/\bthirty\b/g, "30")
      .replace(/\btwenty\b/g, "20")
      .replace(/\bnineteen\b/g, "19")
      .replace(/\beighteen\b/g, "18")
      .replace(/\bseventeen\b/g, "17")
      .replace(/\bsixteen\b/g, "16")
      .replace(/\bfifteen\b/g, "15")
      .replace(/\bfourteen\b/g, "14")
      .replace(/\bthirteen\b/g, "13")
      .replace(/\btwelve\b/g, "12")
      .replace(/\beleven\b/g, "11")
      .replace(/\bten\b/g, "10")
      .replace(/\bnine\b/g, "9")
      .replace(/\beight\b/g, "8")
      .replace(/\bseven\b/g, "7")
      .replace(/\bsix\b/g, "6")
      .replace(/\bfive\b/g, "5")
      .replace(/\bfour\b/g, "4")
      .replace(/\bthree\b/g, "3")
      .replace(/\btwo\b/g, "2")
      .replace(/\bone\b/g, "1")
      // Handle compound numbers like "20 3" -> "23"
      .replace(/\b(20|30|40|50|60|70|80|90)\s+(\d)\b/g, (m, p1, p2) => (parseInt(p1) + parseInt(p2)).toString());
  }

  private static extractReference(text: string) {
    // Try numberedColon first: "1 John 3:16"
    let match = text.match(this.PATTERNS.numberedColon);
    if (match) {
      const bookName = this.normalizeBook(`${match[1]} ${match[2]}`);
      if (bookName) return { book: bookName, chapter: parseInt(match[3]), verseStart: parseInt(match[4]), verseEnd: match[5] ? parseInt(match[5]) : undefined };
    }

    // Try colon: "John 3:16"
    match = text.match(this.PATTERNS.colon);
    if (match) {
      const bookName = this.normalizeBook(match[1]);
      if (bookName) return { book: bookName, chapter: parseInt(match[2]), verseStart: parseInt(match[3]), verseEnd: match[4] ? parseInt(match[4]) : undefined };
    }

    // Try numberedSpace: "1 John 3 16"
    match = text.match(this.PATTERNS.numberedSpace);
    if (match) {
      const bookName = this.normalizeBook(`${match[1]} ${match[2]}`);
      if (bookName) return { book: bookName, chapter: parseInt(match[3]), verseStart: parseInt(match[4]), verseEnd: match[5] ? parseInt(match[5]) : undefined };
    }

    // Try compressed: "John 316"
    match = text.match(this.PATTERNS.compressed);
    if (match) {
      const bookName = this.normalizeBook(match[1]);
      if (bookName) return { book: bookName, chapter: parseInt(match[2]), verseStart: parseInt(match[3]) };
    }

    // Try space: "John 3 16"
    match = text.match(this.PATTERNS.space);
    if (match) {
      const bookName = this.normalizeBook(match[1]);
      if (bookName) return { book: bookName, chapter: parseInt(match[2]), verseStart: parseInt(match[3]), verseEnd: match[4] ? parseInt(match[4]) : undefined };
    }

    // Try numberedChapterOnly: "1 John 3"
    match = text.match(this.PATTERNS.numberedChapterOnly);
    if (match) {
      const bookName = this.normalizeBook(`${match[1]} ${match[2]}`);
      if (bookName) return { book: bookName, chapter: parseInt(match[3]), verseStart: 1 };
    }

    // Try chapterOnly: "John 3"
    match = text.match(this.PATTERNS.chapterOnly);
    if (match) {
      const bookName = this.normalizeBook(match[1]);
      if (bookName) return { book: bookName, chapter: parseInt(match[2]), verseStart: 1 };
    }

    return null;
  }

  private static normalizeBook(name: string): string | null {
    const clean = name.toLowerCase().trim();
    
    // Add common fuzzy matches for speech
    const fuzzyMap: Record<string, string> = {
      "look": "Luke",
      "acts of the apostles": "Acts",
      "revelations": "Revelation",
      "penniless": "Genesis", // Sometimes Genesis sounds like this?
      "songs of solomon": "Song of Solomon",
      "psalms": "Psalms",
      "psalm": "Psalms",
    };

    return this.BOOK_ALIASES[clean] || fuzzyMap[clean] || null;
  }
}
