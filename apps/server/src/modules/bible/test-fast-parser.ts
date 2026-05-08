import { FastBibleParser } from "./fast-bible-parser.js";
import { BibleService } from "./bible.service.js";

async function runTests() {
  console.log("Starting FastBibleParser Tests...");
  
  // Need to initialize store if it uses BOOK_ALIASES which might be empty before init
  // But BOOK_ALIASES is a static property, so it should be available.
  
  const testCases = [
    { input: "John 3:16", expected: "John 3:16" },
    { input: "Genesis 1 1", expected: "Genesis 1:1" },
    { input: "next verse", expected: "navigate_bible" },
    { input: "switch to niv", expected: "switch_bible_version" },
    { input: "1 John 3 16", expected: "1 John 3:16" },
    { input: "Matthew 24", expected: "Matthew 24:1" },
    { input: "John 316", expected: "John 3:16" },
    { input: "psalm twenty three one", expected: "Psalms 23:1" },
    { input: "look 1 1", expected: "Luke 1:1" },
  ];

  for (const test of testCases) {
    const result = FastBibleParser.parse(test.input);
    console.log(`Input: "${test.input}"`);
    if (result) {
      if (result.name === "project_bible_reference") {
        const args = result.arguments;
        console.log(`  Parsed: ${args.book} ${args.chapter}:${args.verse_start}`);
      } else {
        console.log(`  Command: ${result.name}`);
      }
    } else {
      console.log(`  Result: No match`);
    }
    console.log("---");
  }
}

runTests();
