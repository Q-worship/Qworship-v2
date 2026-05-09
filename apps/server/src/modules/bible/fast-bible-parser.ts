import { BibleService } from "./bible.service.js";

/**
 * FastBibleParser — QC56 Stage 2 + QC63 Navigation Expansion + QC64 Version Switch
 *
 * Key improvements over previous version:
 * 1. SCAN-AND-EXTRACT: Scans anywhere inside a sentence for a Bible reference,
 *    not just whole-string matches. Catches "...as written in Matthew 1:5 where..."
 * 2. SPOKEN FORMAT: Handles "Matthew chapter one verse five" natural speech patterns.
 * 3. ORDINAL NUMBERS: "first", "second", "third" etc. normalised to digits.
 * 4. CONFIDENCE SCORING: Every match returns a confidence score (0–1).
 * 5. NO OPENAI DEPENDENCY: Fully self-contained — zero network calls.
 *
 * QC63 — Navigation command expansion:
 * - All 10 user-specified navigation variants now supported:
 *     "Next Verse", "Next", "Show me the Next Verse", "Take me to the Next Verse"
 *     "Previous Verse", "Previous", "Show me the Previous Verse", "Take me to the Previous Verse"
 *     "Take me to Verse 10", "Verse 10"
 * - New goto_verse pattern: extracts verse number from "verse N" / "take me to verse N"
 *
 * QC64 — Version switch expansion:
 * - Replaced single VERSION_PATTERN regex with VERSION_PATTERNS array (16 entries)
 * - Supports all 20 user-specified version commands across 6 Bible versions:
 *     KJV:  "KJV", "Show me the KJV", "King James Version"
 *     NKJV: "NKJV", "Show me the NKJV", "New King James Version"
 *     NIV:  "NIV", "Show me the NIV", "New International Version"
 *     ESV:  "ESV", "Let's see the ESV", "English Standard Version"
 *     AMP:  "AMP", "Amplified", "Amplified Bible", "Amplified Version"
 *     MSG:  "MSG", "Message", "Message Bible", "Message Version"
 */
export class FastBibleParser {
  private static readonly BOOK_ALIASES: Record<string, string> =
    BibleService.BOOK_ALIASES;

  // ─── Spoken-number normalisation maps ────────────────────────────────────

  private static readonly ORDINALS: Record<string, string> = {
    first: "1", second: "2", third: "3", fourth: "4", fifth: "5",
    sixth: "6", seventh: "7", eighth: "8", ninth: "9", tenth: "10",
    eleventh: "11", twelfth: "12", thirteenth: "13", fourteenth: "14",
    fifteenth: "15", sixteenth: "16", seventeenth: "17", eighteenth: "18",
    nineteenth: "19", twentieth: "20", "twenty-first": "21",
    "twenty-second": "22", "twenty-third": "23", "twenty-fourth": "24",
    "twenty-fifth": "25", "twenty-sixth": "26", "twenty-seventh": "27",
    "twenty-eighth": "28", "twenty-ninth": "29", thirtieth: "30",
  };

  private static readonly CARDINALS: Record<string, string> = {
    zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    eleven: "11", twelve: "12", thirteen: "13", fourteen: "14",
    fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18",
    nineteen: "19", twenty: "20", thirty: "30", forty: "40",
    fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  };

  // ─── Pre-compiled scan patterns (applied to full sentence) ───────────────

  /**
   * Spoken format patterns — match references embedded anywhere in a sentence.
   * Each pattern has named groups: book, chapter, verse (optional), verseEnd (optional).
   *
   * Examples caught:
   *   "as written in Matthew chapter one verse five"
   *   "turn to the book of John chapter three verse sixteen"
   *   "let's look at Psalm 23"
   *   "1 John 3:16"
   *   "Romans 8 28"
   */
  private static readonly SCAN_PATTERNS: Array<{
    re: RegExp;
    extract: (m: RegExpMatchArray) => { rawBook: string; chapter: string; verse?: string; verseEnd?: string } | null;
    confidence: number;
  }> = [
    // "Matthew chapter 1 verse 5" / "Matthew chapter one verse five"
    {
      re: /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+chapter\s+(\w+)\s+verse\s+(\w+)(?:\s+(?:to|through|and)\s+(\w+))?\b/gi,
      extract: (m) => ({ rawBook: m[1], chapter: m[2], verse: m[3], verseEnd: m[4] }),
      confidence: 0.95,
    },
    // "Matthew chapter 7 7" / "Matthew chapter 7 verse 7" without 'verse' keyword
    // This catches the common pattern where Deepgram drops the word 'verse'
    {
      re: /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+chapter\s+(\w+)\s+(\d+)(?:\s+(?:to|through|and)\s+(\d+))?\b/gi,
      extract: (m) => ({ rawBook: m[1], chapter: m[2], verse: m[3], verseEnd: m[4] }),
      confidence: 0.92,
    },
    // "Matthew chapter 1" (no verse yet — partial, used for predictive)
    {
      re: /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+chapter\s+(\w+)\b/gi,
      extract: (m) => ({ rawBook: m[1], chapter: m[2] }),
      confidence: 0.70,
    },
    // "John 3:16" / "John 3:16-18" — colon format
    {
      re: /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+(\d+)[:.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?\b/gi,
      extract: (m) => ({ rawBook: m[1], chapter: m[2], verse: m[3], verseEnd: m[4] }),
      confidence: 0.98,
    },
    // "1 John 3 16" / "John 3 16" — space-separated
    {
      re: /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+(\d+)\s+(\d+)(?:\s+(?:to|through|-)\s+(\d+))?\b/gi,
      extract: (m) => ({ rawBook: m[1], chapter: m[2], verse: m[3], verseEnd: m[4] }),
      confidence: 0.88,
    },
    // "John 316" — compressed 3-digit voice format
    {
      re: /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+(\d)(\d{2})\b/gi,
      extract: (m) => ({ rawBook: m[1], chapter: m[2], verse: m[3] }),
      confidence: 0.85,
    },
    // "John 3" — chapter only (lowest confidence, partial reference)
    {
      re: /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+(\d{1,3})\b/gi,
      extract: (m) => ({ rawBook: m[1], chapter: m[2] }),
      confidence: 0.60,
    },
  ];

  // ─── Navigation & version patterns ───────────────────────────────────────

  /**
   * QC63 — Goto-verse pattern (captures verse number).
   *
   * Matches:
   *   "take me to verse 10"  →  goto verse 10
   *   "go to verse 5"        →  goto verse 5
   *   "show me verse 3"      →  goto verse 3
   *   "jump to verse 7"      →  goto verse 7
   *   "verse 10"             →  goto verse 10  (bare form)
   *
   * NOTE: This is intentionally checked BEFORE the NAV_PATTERNS loop in parse()
   * because "verse N" could otherwise be confused with a partial Bible reference.
   * The pattern only fires when there is NO book name in the transcript (navigation
   * commands are context-free — they operate on the current book+chapter).
   */
  private static readonly GOTO_VERSE_RE =
    /\b(?:take me to|go to|show me|jump to)?\s*verse\s+(\d+)\b/i;

  /**
   * QC63 — Expanded navigation patterns.
   *
   * Supported commands:
   *   Next verse:
   *     "next verse", "next", "go next", "forward", "next one"
   *     "show me the next verse", "take me to the next verse"
   *     "show me the next", "take me to the next"
   *
   *   Previous verse:
   *     "previous verse", "previous", "go back", "back one"
   *     "show me the previous verse", "take me to the previous verse"
   *     "show me the previous", "take me to the previous"
   *
   *   Chapter navigation (unchanged):
   *     "next chapter", "following chapter"
   *     "previous chapter", "last chapter", "go back a chapter"
   *
   * IMPORTANT: Longer / more-specific phrases are listed FIRST so they match
   * before the shorter bare-word patterns ("next", "previous").
   */
  private static readonly NAV_PATTERNS: Array<{ re: RegExp; cmd: any }> = [
    // ── Next verse (all variants) ────────────────────────────────────────────
    {
      re: /\b(?:show me the next verse|take me to the next verse|show me the next|take me to the next|next verse|go next|forward|next one)\b/i,
      cmd: { name: "navigate_bible", arguments: { direction: "next", scope: "verse" } },
    },
    // Bare "next" — must be a standalone word to avoid false positives
    {
      re: /^next$/i,
      cmd: { name: "navigate_bible", arguments: { direction: "next", scope: "verse" } },
    },
    // ── Previous verse (all variants) ────────────────────────────────────────
    {
      re: /\b(?:show me the previous verse|take me to the previous verse|show me the previous|take me to the previous|previous verse|go back|back one)\b/i,
      cmd: { name: "navigate_bible", arguments: { direction: "prev", scope: "verse" } },
    },
    // Bare "previous" — must be a standalone word to avoid false positives
    {
      re: /^previous$/i,
      cmd: { name: "navigate_bible", arguments: { direction: "prev", scope: "verse" } },
    },
    // ── Chapter navigation ────────────────────────────────────────────────────
    { re: /\b(?:next chapter|following chapter)\b/i,            cmd: { name: "navigate_bible", arguments: { direction: "next", scope: "chapter" } } },
    { re: /\b(?:previous chapter|last chapter|go back a chapter)\b/i, cmd: { name: "navigate_bible", arguments: { direction: "prev", scope: "chapter" } } },
  ];

  /**
   * QC64 — Expanded version-switch patterns.
   *
   * Supported commands (20 variants across 6 Bible versions):
   *
   *   KJV:  "KJV", "Show me the KJV", "King James Version"
   *   NKJV: "NKJV", "Show me the NKJV", "New King James Version"
   *   NIV:  "NIV", "Show me the NIV", "New International Version"
   *   ESV:  "ESV", "Let's see the ESV", "English Standard Version"
   *   AMP:  "AMP", "Amplified", "Amplified Bible", "Amplified Version"
   *   MSG:  "MSG", "Message", "Message Bible", "Message Version"
   *
   * Design notes:
   *   - Full version names are matched FIRST (higher specificity) to prevent
   *     partial matches from shadowing them.
   *   - Bare abbreviations use word-boundary anchors (\b) to prevent false
   *     positives inside longer words.
   *   - Each entry maps to a canonical lowercase version key.
   */
  private static readonly VERSION_PATTERNS: Array<{ re: RegExp; version: string }> = [
    // ── KJV ──────────────────────────────────────────────────────────────────
    { re: /\bking\s+james\s+version\b/i,                version: "kjv" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?kjv\b/i, version: "kjv" },
    // ── NKJV ─────────────────────────────────────────────────────────────────
    { re: /\bnew\s+king\s+james\s+version\b/i,          version: "nkjv" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?nkjv\b/i, version: "nkjv" },
    // ── NIV ──────────────────────────────────────────────────────────────────
    { re: /\bnew\s+international\s+version\b/i,         version: "niv" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?niv\b/i, version: "niv" },
    // ── ESV ──────────────────────────────────────────────────────────────────
    { re: /\benglish\s+standard\s+version\b/i,          version: "esv" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?esv\b/i, version: "esv" },
    // ── AMP ──────────────────────────────────────────────────────────────────
    { re: /\bamplified\s+(?:bible|version)\b/i,         version: "amp" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?amplified\b/i, version: "amp" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?amp\b/i,       version: "amp" },
    // ── MSG ──────────────────────────────────────────────────────────────────
    { re: /\bmessage\s+(?:bible|version)\b/i,           version: "msg" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?(?:the\s+)?message\b/i, version: "msg" },
    { re: /\b(?:show\s+me\s+(?:the\s+)?|switch\s+to\s+|use\s+|change\s+to\s+|let'?s?\s+see\s+(?:the\s+)?|read\s+in\s+(?:the\s+)?)?msg\b/i,           version: "msg" },
  ];

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * parseStage — used by the predictive accumulator in audio.socket.ts.
   *
   * Returns the current detection stage for a partial transcript:
   *   { type: 'book_only', book }          — book name detected, no chapter yet
   *   { type: 'book_chapter', book, chapter } — book + chapter detected, no verse
   *   null                                  — no book name found
   *
   * This is intentionally separate from parse() so the accumulator can track
   * progressive state without triggering a full command execution.
   */
  static parseStage(
    text: string,
  ): { type: "book_only"; book: string } | { type: "book_chapter"; book: string; chapter: number } | null {
    if (!text || text.trim().length < 3) return null;

    let clean = text.toLowerCase().trim().replace(/[.,!?;:]+$/, "");
    clean = this.normalizeNumbers(clean);

    // Try book+chapter pattern first (more specific)
    const bookChapterRe = /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+chapter\s+(\d+)\b/gi;
    let m = bookChapterRe.exec(clean);
    if (m) {
      const book = this.normalizeBook(m[1]);
      const chapter = parseInt(m[2]);
      if (book && !isNaN(chapter) && chapter >= 1 && chapter <= 150) {
        return { type: "book_chapter", book, chapter };
      }
    }

    // Also try numeric chapter format: "Matthew 1" (but only if confidence is high enough
    // — avoid false positives from random numbers after book names in normal speech)
    const bookNumRe = /\b([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\s+(\d{1,3})\b/gi;
    bookNumRe.lastIndex = 0;
    let m2 = bookNumRe.exec(clean);
    while (m2) {
      const book = this.normalizeBook(m2[1]);
      const chapter = parseInt(m2[2]);
      if (book && !isNaN(chapter) && chapter >= 1 && chapter <= 150) {
        return { type: "book_chapter", book, chapter };
      }
      m2 = bookNumRe.exec(clean);
    }

    // Try book-only: scan for any known book name in the text
    // Use word-boundary scan across all known aliases
    const words = clean.split(/\s+/);
    // Try 3-word, 2-word, 1-word sequences
    for (let len = 3; len >= 1; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const candidate = words.slice(i, i + len).join(" ");
        const book = this.normalizeBook(candidate);
        if (book) return { type: "book_only", book };
      }
    }

    return null;
  }

  /**
   * Main entry point. Scans the full text for any Bible reference, navigation,
   * or version command. Returns the highest-confidence match found, or null.
   */
  static parse(text: string): any | null {
    if (!text || text.trim().length < 3) return null;

    // Normalise: lowercase, strip trailing punctuation, expand spoken numbers
    let clean = text.toLowerCase().trim().replace(/[.,!?;:]+$/, "");
    clean = this.normalizeNumbers(clean);

    // 1. Version switch — QC64: scan all VERSION_PATTERNS (full names first, then abbreviations)
    for (const vp of this.VERSION_PATTERNS) {
      if (vp.re.test(clean)) {
        return {
          name: "switch_bible_version",
          arguments: { version: vp.version },
        };
      }
    }

    // 2a. Goto-verse (QC63): "verse N" / "take me to verse N" / "go to verse N"
    //     Checked BEFORE NAV_PATTERNS so "verse 10" doesn't get swallowed by
    //     the Bible reference scanner (which could misparse "verse" as a book name).
    //     Only fires when the transcript contains NO recognised book name — if a
    //     book IS present, this is a full reference (e.g. "John chapter 3 verse 16")
    //     and the SCAN_PATTERNS below will handle it correctly.
    const gotoMatch = clean.match(this.GOTO_VERSE_RE);
    if (gotoMatch) {
      const verseNum = parseInt(gotoMatch[1]);
      if (!isNaN(verseNum) && verseNum >= 1 && verseNum <= 176) {
        // Only treat as a navigation command if no book name is present in the text.
        // If a book IS present, fall through to the Bible reference scanner.
        const hasBook = this.parseStage(clean) !== null;
        if (!hasBook) {
          return {
            name: "navigate_bible",
            arguments: { direction: "goto", scope: "verse", verse: verseNum },
          };
        }
      }
    }

    // 2b. Navigation (next/previous verse/chapter)
    for (const nav of this.NAV_PATTERNS) {
      if (nav.re.test(clean)) return nav.cmd;
    }

    // 3. Bible reference — scan entire sentence
    return this.scanForReference(clean);
  }

  /**
   * Scan the full text for an embedded Bible reference.
   * Returns the highest-confidence complete reference found.
   */
  static scanForReference(text: string): any | null {
    let best: { cmd: any; confidence: number } | null = null;

    for (const pattern of this.SCAN_PATTERNS) {
      // Reset lastIndex for global regex
      pattern.re.lastIndex = 0;
      let match: RegExpMatchArray | null;

      while ((match = pattern.re.exec(text)) !== null) {
        const extracted = pattern.extract(match);
        if (!extracted) continue;

        const bookName = this.normalizeBook(extracted.rawBook);
        if (!bookName) continue;

        const chapter = parseInt(this.normalizeNumbers(extracted.chapter));
        if (isNaN(chapter) || chapter < 1 || chapter > 150) continue;

        const verseStart = extracted.verse
          ? parseInt(this.normalizeNumbers(extracted.verse))
          : 1;
        const verseEnd = extracted.verseEnd
          ? parseInt(this.normalizeNumbers(extracted.verseEnd))
          : undefined;

        if (isNaN(verseStart) || verseStart < 1 || verseStart > 176) continue;

        const cmd = {
          name: "project_bible_reference",
          arguments: {
            book: bookName,
            chapter,
            verse_start: verseStart,
            verse_end: verseEnd || null,
            version: "kjv",
          },
          _confidence: pattern.confidence,
        };

        // Keep the highest-confidence match
        if (!best || pattern.confidence > best.confidence) {
          best = { cmd, confidence: pattern.confidence };
        }

        // If we have a near-perfect match (colon format), stop scanning
        if (pattern.confidence >= 0.95) break;
      }

      if (best && best.confidence >= 0.95) break;
    }

    return best ? best.cmd : null;
  }

  // ─── Number normalisation ─────────────────────────────────────────────────

  static normalizeNumbers(text: string): string {
    let t = text;

    // Ordinals first ("first" → "1")
    for (const [word, digit] of Object.entries(this.ORDINALS)) {
      t = t.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
    }

    // Cardinals ("twenty" → "20", then "twenty 3" → "23")
    for (const [word, digit] of Object.entries(this.CARDINALS)) {
      t = t.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
    }

    // Compound spoken numbers: "20 3" → "23", "30 5" → "35" etc.
    t = t.replace(
      /\b(10|20|30|40|50|60|70|80|90)\s+(\d)\b/g,
      (_, tens, ones) => (parseInt(tens) + parseInt(ones)).toString(),
    );

    return t;
  }

  // ─── Book name normalisation ──────────────────────────────────────────────

  private static normalizeBook(raw: string): string | null {
    // Strip noise words: "the book of", "book of", "the"
    let clean = raw
      .toLowerCase()
      .trim()
      .replace(/^(?:the\s+)?book\s+of\s+/i, "")
      .replace(/^the\s+/i, "")
      .trim();

    // Direct alias lookup (covers all 66 books + common abbreviations)
    if (this.BOOK_ALIASES[clean]) return this.BOOK_ALIASES[clean];

    // Speech-specific fuzzy overrides
    const speechMap: Record<string, string> = {
      "look": "Luke",
      "luke": "Luke",
      "acts of the apostles": "Acts",
      "revelations": "Revelation",
      "songs of solomon": "Song of Solomon",
      "song of songs": "Song of Solomon",
      "psalms": "Psalms",
      "psalm": "Psalms",
      "proverb": "Proverbs",
      "proverbs": "Proverbs",
      "mathew": "Matthew",
      "mathews": "Matthew",
      "matthews": "Matthew",
      "marc": "Mark",
      "marks": "Mark",
      "romans": "Romans",
      "roman": "Romans",
      "corinthians": "1 Corinthians",
      "first corinthians": "1 Corinthians",
      "second corinthians": "2 Corinthians",
      "first thessalonians": "1 Thessalonians",
      "second thessalonians": "2 Thessalonians",
      "first timothy": "1 Timothy",
      "second timothy": "2 Timothy",
      "first peter": "1 Peter",
      "second peter": "2 Peter",
      "first john": "1 John",
      "second john": "2 John",
      "third john": "3 John",
      "first kings": "1 Kings",
      "second kings": "2 Kings",
      "first samuel": "1 Samuel",
      "second samuel": "2 Samuel",
      "first chronicles": "1 Chronicles",
      "second chronicles": "2 Chronicles",
      "philippians": "Philippians",
      "philemon": "Philemon",
      "ephesians": "Ephesians",
      "galatians": "Galatians",
      "colossians": "Colossians",
      "hebrews": "Hebrews",
      "obadiah": "Obadiah",
      "nahum": "Nahum",
      "habakkuk": "Habakkuk",
      "zephaniah": "Zephaniah",
      "haggai": "Haggai",
      "zechariah": "Zechariah",
      "malachi": "Malachi",
      "ecclesiastes": "Ecclesiastes",
      "deuteronomy": "Deuteronomy",
      "leviticus": "Leviticus",
      "numbers": "Numbers",
      "genesis": "Genesis",
      "exodus": "Exodus",
    };

    return speechMap[clean] || null;
  }
}
