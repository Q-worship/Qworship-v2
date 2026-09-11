import { kjvQuoteIndex, normalizeQuoteText } from "../handsfreeBible/kjvQuoteIndex.js";

const cases: Array<[string, string]> = [
  ["verbatim", "for god so loved the world that he gave his only begotten son"],
  ["asr mangled", "for god so loved the world that he gave his only forgotten son"],
  ["mid-sentence", "and i want you to remember tonight that the lord is my shepherd i shall not want he maketh me"],
  ["span", "the lord is my shepherd i shall not want he maketh me to lie down in green pastures he leadeth me beside the still waters"],
  ["boilerplate", "and it came to pass that he said unto them"],
  ["too short", "jesus wept"],
  ["nothing", "so this morning we are going to talk about how to raise your children in a difficult economy"],
  ["paraphrase", "god loved the world so much he gave his son"],
  ["numbers", "i can do all things through christ which strengtheneth me"],
  ["romans", "for all have sinned and come short of the glory of god being justified freely"],
];

const mem0 = process.memoryUsage().heapUsed;
await kjvQuoteIndex.ensureBuilt();
const mem1 = process.memoryUsage().heapUsed;
console.log(`heap delta ≈ ${Math.round((mem1 - mem0) / 1024 / 1024)} MB`);

for (const [label, phrase] of cases) {
  const words = normalizeQuoteText(phrase).slice(-20);
  const t = performance.now();
  const c = kjvQuoteIndex.match(words);
  const ms = (performance.now() - t).toFixed(2);
  console.log(`\n[${label}] ${ms}ms`);
  console.log(c ? `  → ${c.book} ${c.chapter}:${c.verse}${c.verseEnd ? "-" + c.verseEnd : ""} | ${c.consecutiveWords}w | score ${c.score.toFixed(1)} | start=${c.startsAtVerseStart} | "${c.matchedText}"` : "  → null");
}
