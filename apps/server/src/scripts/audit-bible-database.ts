import "dotenv/config";
import mongoose from "mongoose";
import { BibleVerse } from "../modules/bible/bible.model.js";
import { getCanonicalBibleCoordinates } from "../modules/bible/bible-admin.service.js";
import { BIBLE_VERSION_KEYS } from "../modules/bible/bible-translations.js";

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) throw new Error("MONGODB_URI or MONGO_URI is required");

await mongoose.connect(mongoUri);
try {
  const canonical = getCanonicalBibleCoordinates();
  const projection = Object.fromEntries([
    ["bookName", 1], ["chapter", 1], ["verse", 1],
    ...BIBLE_VERSION_KEYS.map(version => [version, 1]),
  ]);
  const rows = await BibleVerse.find({}, projection).lean();
  const coverage = Object.fromEntries(
    BIBLE_VERSION_KEYS.map(version => [version.toUpperCase(), 0]),
  );
  let invalidCoordinates = 0;
  for (const row of rows as any[]) {
    if (!canonical.has(`${row.bookName}|${row.chapter}|${row.verse}`)) {
      invalidCoordinates += 1;
      continue;
    }
    for (const version of BIBLE_VERSION_KEYS) {
      if (typeof row[version] === "string" && row[version].trim()) {
        coverage[version.toUpperCase()] += 1;
      }
    }
  }
  console.table({
    databaseRows: rows.length,
    canonicalCoordinates: canonical.size,
    invalidCoordinates,
  });
  console.table(Object.fromEntries(BIBLE_VERSION_KEYS.map(version => [
    version.toUpperCase(),
    {
      populated: coverage[version.toUpperCase()],
      missing: canonical.size - coverage[version.toUpperCase()],
    },
  ])));
} finally {
  await mongoose.disconnect();
}
