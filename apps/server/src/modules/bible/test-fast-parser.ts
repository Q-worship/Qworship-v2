import assert from "node:assert/strict";
import { FastBibleParser } from "./fast-bible-parser.js";

type ExpectedReference = [book: string, chapter: number, verse: number];

function referenceTuple(command: any): ExpectedReference | null {
  if (command?.name !== "project_bible_reference") return null;
  return [
    command.arguments.book,
    command.arguments.chapter,
    command.arguments.verse_start,
  ];
}

function runTests() {
  const references: Array<{ input: string; expected: ExpectedReference }> = [
    { input: "Book of Psalms chapter 23 verse 1", expected: ["Psalms", 23, 1] },
    { input: "Psalms 23 1", expected: ["Psalms", 23, 1] },
    { input: "Pslams chapter 23 verse 1", expected: ["Psalms", 23, 1] },
    { input: "show me Philippians 4 19", expected: ["Philippians", 4, 19] },
    { input: "Phillippians 4 19", expected: ["Philippians", 4, 19] },
    { input: "Liviticus chapter 6 verse 12", expected: ["Leviticus", 6, 12] },
    { input: "1 John 3 16", expected: ["1 John", 3, 16] },

    // QC Review Group 1: Compact round numbers
    { input: "Genesis 10 10", expected: ["Genesis", 10, 10] },
    { input: "Isaiah 30 1", expected: ["Isaiah", 30, 1] },
    { input: "Ezekiel 40 3", expected: ["Ezekiel", 40, 3] },
    { input: "Genesis 20 5", expected: ["Genesis", 20, 5] },
    { input: "Psalm 100 5", expected: ["Psalms", 100, 5] },

    // QC Review Group 2: Large Psalms & 'O' / 'Oh' Pronunciation
    { input: "Psalm 100 verse 5", expected: ["Psalms", 100, 5] },
    { input: "Psalms one hundred verse five", expected: ["Psalms", 100, 5] },
    { input: "Psalm 1'O'3 verse 2", expected: ["Psalms", 103, 2] },
    { input: "Psalm 1'O'5 verse 3", expected: ["Psalms", 105, 3] },
    { input: "Psalm 1 O 5 verse 3", expected: ["Psalms", 105, 3] },
    { input: "Psalm one oh three verse two", expected: ["Psalms", 103, 2] },
    { input: "Psalms 119 verse 105", expected: ["Psalms", 119, 105] },

    // QC Review Group 3: Digit-by-digit phrasing
    { input: "Psalms 1 1 6 verse 16", expected: ["Psalms", 116, 16] },
    { input: "Psalm 1 0 5 verse 3", expected: ["Psalms", 105, 3] },

    // QC Review Group 4: Conversational Sermon Sentences
    { input: "Praise the Lord saints, let's open our Bibles to the book of First Thessalonians chapter 4 verse 17", expected: ["1 Thessalonians", 4, 17] },
    { input: "Church please open your Bible with me to the book of Genesis chapter 10 verse 10", expected: ["Genesis", 10, 10] },
    { input: "Good morning church, let's turn to 2 Corinthians 5 17", expected: ["2 Corinthians", 5, 17] },
    { input: "Now let us look at the book of Isaiah chapter 30 verse 1", expected: ["Isaiah", 30, 1] },

    // QC Review Group 5: Filler Words Before Verse ("and in verse", "and in Verse")
    { input: "Genesis chapter 10 and in verse 3", expected: ["Genesis", 10, 3] },
    { input: "Romans 1 and in verse 5", expected: ["Romans", 1, 5] },
    { input: "Psalms 1 1 9 and in verse 105", expected: ["Psalms", 119, 105] },

    // QC Review Group 6: Compact whole tens
    { input: "Matthew 20 1", expected: ["Matthew", 20, 1] },
    { input: "Genesis 40 7", expected: ["Genesis", 40, 7] },

    // QC Review Group 7: Letter 'O' & 0 digit sequences in Psalms
    { input: "Psalms 1 O 5 verse 2", expected: ["Psalms", 105, 2] },
    { input: "Psalms 1 0 5 verse 2", expected: ["Psalms", 105, 2] },
    { input: "Psalm 1 O 3 verse 1", expected: ["Psalms", 103, 1] },
  ];

  for (const test of references) {
    assert.deepEqual(referenceTuple(FastBibleParser.parse(test.input)), test.expected, test.input);
  }

  // QC Fail-Closed Validation
  assert.equal(
    referenceTuple(FastBibleParser.parse("Psalms 1 1 6")),
    null,
    "Chapter-only digit sequence without explicit verse must fail closed",
  );

  assert.equal(
    FastBibleParser.parse("Psalnms chapter 23 verse 1"),
    null,
    "An unknown book must not fall through to contextual navigation",
  );

  const mixed = FastBibleParser.scanForCommands("Matthew 7 7 next verse");
  assert.deepEqual(
    mixed.map(command => command.name === "project_bible_reference"
      ? referenceTuple(command)?.join(":")
      : `${command.arguments.direction}:${command.arguments.scope}`),
    ["Matthew:7:7", "next:verse"],
    "A newer navigation command must not be hidden by an older reference",
  );

  const repeatedNavigation = FastBibleParser.scanForCommands("next verse next verse");
  assert.equal(repeatedNavigation.length, 2, "Repeated next commands need distinct occurrences");

  const navigationCases = [
    { input: "chapter 4 verse 7", expected: { direction: "goto", scope: "chapter_verse", chapter: 4, verse: 7 } },
    { input: "chapter four and verse seven", expected: { direction: "goto", scope: "chapter_verse", chapter: 4, verse: 7 } },
    { input: "go to verse 10", expected: { direction: "goto", scope: "verse", verse: 10 } },
    { input: "take me to verse 10", expected: { direction: "goto", scope: "verse", verse: 10 } },
    { input: "moving on to verse 12", expected: { direction: "goto", scope: "verse", verse: 12 } },
    { input: "now let's look at verse 5", expected: { direction: "goto", scope: "verse", verse: 5 } },
    { input: "verse 10", expected: { direction: "goto", scope: "verse", verse: 10 } },
    { input: "next verse", expected: { direction: "next", scope: "verse" } },
    { input: "let's look at the next verse", expected: { direction: "next", scope: "verse" } },
    { input: "let us look at the next verse", expected: { direction: "next", scope: "verse" } },
    { input: "previous verse", expected: { direction: "prev", scope: "verse" } },
    { input: "let's look at the previous verse", expected: { direction: "prev", scope: "verse" } },
    { input: "next chapter", expected: { direction: "next", scope: "chapter" } },
    { input: "go back a chapter", expected: { direction: "prev", scope: "chapter" } },
  ];
  for (const test of navigationCases) {
    const commands = FastBibleParser.scanForCommands(test.input);
    assert.equal(commands.length, 1, `${test.input} must produce exactly one navigation command`);
    assert.equal(commands[0].name, "navigate_bible", test.input);
    assert.deepEqual(commands[0].arguments, test.expected, test.input);
  }

  const continuous = FastBibleParser.scanForCommands(
    "lets see Gen 6 10 show me Romans chapter 4 verse 3 " +
    "Leviticus chapter 6 verse 12 Exodus 2 verse 8",
  );
  assert.deepEqual(
    continuous.map(referenceTuple),
    [
      ["Genesis", 6, 10],
      ["Romans", 4, 3],
      ["Leviticus", 6, 12],
      ["Exodus", 2, 8],
    ],
    "Continuous references must remain in spoken order",
  );

  // Verify chapter-only does NOT project (requires explicit verse number per user feedback)
  assert.equal(
    referenceTuple(FastBibleParser.parse("Psalm 23")),
    null,
    "Chapter-only reference without verse must not project",
  );

  // Conversational verse navigation ("Moving on to verse 12")
  const gotoVerse12 = FastBibleParser.parse("Moving on to verse 12");
  assert.equal(gotoVerse12?.name, "navigate_bible");
  assert.equal(gotoVerse12?.arguments?.direction, "goto");
  assert.equal(gotoVerse12?.arguments?.verse, 12);

  const gotoVerse11 = FastBibleParser.parse("Now let's look at verse 11");
  assert.equal(gotoVerse11?.name, "navigate_bible");
  assert.equal(gotoVerse11?.arguments?.verse, 11);

  const gotoVerseTwelveSpoken = FastBibleParser.parse("let's read verse twelve");
  assert.equal(gotoVerseTwelveSpoken?.name, "navigate_bible");
  assert.equal(gotoVerseTwelveSpoken?.arguments?.verse, 12);

  // Next verse variation ("Next verse please")
  const nextVersePlease = FastBibleParser.parse("Next verse please");
  assert.equal(nextVersePlease?.name, "navigate_bible");
  assert.equal(nextVersePlease?.arguments?.direction, "next");

  // Multi-command transcript (Matthew 1:1 + "this is chapter 2 verse 3")
  const multiCmd = FastBibleParser.scanForCommands(
    "god our father and from the lord jesus christ let's go to matthew chapter 1 verse 1 this is chapter 2 verse 3",
  );
  assert.equal(multiCmd.length, 2, "Must capture both Matthew 1:1 and contextual chapter 2 verse 3");
  assert.equal(multiCmd[0].name, "project_bible_reference");
  assert.equal(multiCmd[0].arguments.book, "Matthew");
  assert.equal(multiCmd[0].arguments.chapter, 1);
  assert.equal(multiCmd[0].arguments.verse_start, 1);
  assert.equal(multiCmd[1].name, "navigate_bible");
  assert.equal(multiCmd[1].arguments.direction, "goto");
  assert.equal(multiCmd[1].arguments.scope, "chapter_verse");
  assert.equal(multiCmd[1].arguments.chapter, 2);
  assert.equal(multiCmd[1].arguments.verse, 3);

  console.log(`HFB parser regressions passed (${references.length + 15} groups). All QC review test cases PASSED!`);
}

runTests();
