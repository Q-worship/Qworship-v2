import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import {
  BibleImportChange,
  BibleImportJob,
  BibleTranslation,
  BibleVerse,
} from "../modules/bible/bible.model.js";
import {
  BIBLE_TRANSLATIONS,
  BIBLE_VERSION_KEYS,
  getBibleTranslation,
  isBibleVersionCode,
  type BibleVersionCode,
} from "../modules/bible/bible-translations.js";

type BookRow = {
  id: number;
  name: string;
  testament: "old" | "new";
  chapter_count: number;
};

type VerseRow = {
  id?: number;
  book_id: number;
  chapter: number;
  verse: number;
  [key: string]: unknown;
};

type ImportMode = "fill-missing" | "overwrite";

const translationText = (row: VerseRow, version: BibleVersionCode) =>
  typeof row[version] === "string" ? row[version].trim() : "";

const args = process.argv.slice(2);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const flagValue = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const hasFlag = (name: string) => args.includes(name);

const booksPath = path.resolve(flagValue("--books") || "bible_books.json");
const versesPath = path.resolve(flagValue("--verses") || "bible_verses.json");
const mode = (flagValue("--mode") || "fill-missing") as ImportMode;
const apply = hasFlag("--apply");
const batchSize = Math.max(100, Math.min(2000, Number(flagValue("--batch-size")) || 500));
const sourceName = flagValue("--source") || path.basename(versesPath);
const provenance = flagValue("--provenance") || "Acquired Qworship Bible dataset";
const license = flagValue("--license") || "Authorised for Qworship church-service use";
const canonicalPath = path.resolve(
  flagValue("--canonical") || path.join(scriptDirectory, "../modules/bible/data/kjv.json"),
);

if (!fs.existsSync(booksPath) || !fs.existsSync(versesPath) || !fs.existsSync(canonicalPath)) {
  throw new Error("The books, verses, and canonical-coordinate JSON files must exist");
}
if (mode !== "fill-missing" && mode !== "overwrite") {
  throw new Error("--mode must be fill-missing or overwrite");
}

const requestedVersions = (flagValue("--versions") || BIBLE_VERSION_KEYS.join(","))
  .split(",")
  .map(value => value.trim().toLowerCase())
  .filter(Boolean);
if (!requestedVersions.length || requestedVersions.some(value => !isBibleVersionCode(value))) {
  throw new Error(`--versions must contain supported codes: ${BIBLE_VERSION_KEYS.join(", ")}`);
}
const versions = [...new Set(requestedVersions)] as BibleVersionCode[];

const books = JSON.parse(fs.readFileSync(booksPath, "utf8")) as BookRow[];
const rows = JSON.parse(fs.readFileSync(versesPath, "utf8")) as VerseRow[];
const canonicalRows = JSON.parse(fs.readFileSync(canonicalPath, "utf8")) as Array<{
  book: string; chapter: number; verse: number;
}>;
const canonicalCoordinates = new Set(
  canonicalRows.map(row => `${row.book}|${row.chapter}|${row.verse}`),
);
const bookById = new Map(books.map(book => [book.id, book]));
const seenCoordinates = new Set<string>();
const validationErrors: string[] = [];
const nonCanonicalCoordinates: string[] = [];
const coverage = Object.fromEntries(
  versions.map(version => [version, { populated: 0, empty: 0 }]),
) as Record<BibleVersionCode, { populated: number; empty: number }>;

for (const row of rows) {
  const book = bookById.get(Number(row.book_id));
  const chapter = Number(row.chapter);
  const verse = Number(row.verse);
  if (!book) {
    validationErrors.push(`Unknown book_id ${row.book_id}`);
    continue;
  }
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapter_count ||
      !Number.isInteger(verse) || verse < 1) {
    nonCanonicalCoordinates.push(`${book.name}|${row.chapter}|${row.verse}`);
    continue;
  }
  const coordinate = `${book.name}|${chapter}|${verse}`;
  if (!canonicalCoordinates.has(coordinate)) {
    nonCanonicalCoordinates.push(coordinate);
    continue;
  }
  if (seenCoordinates.has(coordinate)) {
    validationErrors.push(`Duplicate coordinate ${book.name} ${chapter}:${verse}`);
    continue;
  }
  seenCoordinates.add(coordinate);
  for (const version of versions) {
    const text = translationText(row, version);
    if (text) coverage[version].populated += 1;
    else coverage[version].empty += 1;
  }
}

console.log("[Bible Import] Validation summary");
console.table({
  books: books.length,
  rows: rows.length,
  uniqueCoordinates: seenCoordinates.size,
  ignoredNonCanonical: nonCanonicalCoordinates.length,
  validationErrors: validationErrors.length,
  mode,
  operation: apply ? "APPLY" : "DRY RUN",
});
console.table(Object.fromEntries(versions.map(version => [
  version.toUpperCase(),
  coverage[version],
])));

if (validationErrors.length) {
  console.error(validationErrors.slice(0, 25).join("\n"));
  throw new Error(`Input validation failed with ${validationErrors.length} errors`);
}
if (nonCanonicalCoordinates.length) {
  console.warn(
    `[Bible Import] Ignoring ${nonCanonicalCoordinates.length} source rows outside ` +
    `the application's ${canonicalCoordinates.size.toLocaleString()} canonical coordinates.`,
  );
  console.warn(nonCanonicalCoordinates.slice(0, 15).join(", "));
}
if (books.length !== 66 || seenCoordinates.size !== canonicalCoordinates.size) {
  throw new Error(
    `Expected 66 books and ${canonicalCoordinates.size.toLocaleString()} canonical coordinates`,
  );
}
if (!apply) {
  console.log("[Bible Import] Dry run complete. Add --apply to update MongoDB.");
  process.exit(0);
}

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) throw new Error("MONGODB_URI or MONGO_URI is required with --apply");

await mongoose.connect(mongoUri);
try {
  for (const version of versions) {
    const translation = getBibleTranslation(version)!;
    const job = await BibleImportJob.create({
      version,
      mode,
      sourceName,
      provenance,
      license,
      received: coverage[version].populated,
      written: 0,
      status: "running",
    });
    let written = 0;
    try {
      const usableRows = rows.filter(row => {
        const book = bookById.get(Number(row.book_id));
        const coordinate = book ? `${book.name}|${row.chapter}|${row.verse}` : "";
        return canonicalCoordinates.has(coordinate) && Boolean(translationText(row, version));
      });
      for (let offset = 0; offset < usableRows.length; offset += batchSize) {
        const batch = usableRows.slice(offset, offset + batchSize);
        const coordinates = batch.map(row => {
          const book = bookById.get(Number(row.book_id))!;
          return { bookName: book.name, chapter: Number(row.chapter), verse: Number(row.verse) };
        });
        const existingRows = await BibleVerse.find(
          { $or: coordinates },
          { bookName: 1, chapter: 1, verse: 1, [version]: 1 },
        ).lean();
        const existing = new Map(existingRows.map((row: any) => [
          `${row.bookName}|${row.chapter}|${row.verse}`,
          typeof row[version] === "string" ? row[version].trim() : "",
        ]));
        const effective = batch.filter(row => {
          const book = bookById.get(Number(row.book_id))!;
          const previous = existing.get(`${book.name}|${row.chapter}|${row.verse}`) || "";
          return mode === "overwrite" ? previous !== translationText(row, version) : !previous;
        });
        if (!effective.length) continue;
        const operations = effective.map(row => {
          const book = bookById.get(Number(row.book_id))!;
          return {
            updateOne: {
              filter: { bookName: book.name, chapter: Number(row.chapter), verse: Number(row.verse) },
              update: {
                $set: {
                  bookName: book.name,
                  testament: book.testament,
                  chapter: Number(row.chapter),
                  verse: Number(row.verse),
                  [version]: translationText(row, version),
                },
              },
              upsert: true,
            },
          };
        });
        const result = await BibleVerse.bulkWrite(operations as any, { ordered: false });
        written += result.modifiedCount + result.upsertedCount;
        await BibleImportChange.insertMany(effective.map(row => {
          const book = bookById.get(Number(row.book_id))!;
          const key = `${book.name}|${row.chapter}|${row.verse}`;
          return {
            jobId: job._id,
            bookName: book.name,
            chapter: Number(row.chapter),
            verse: Number(row.verse),
            previousText: existing.get(key) || null,
            newText: translationText(row, version),
          };
        }), { ordered: false });
        console.log(`[Bible Import] ${version.toUpperCase()} ${Math.min(offset + batch.length, usableRows.length)}/${usableRows.length}`);
      }
      job.written = written;
      job.status = "completed";
      await job.save();
      await BibleTranslation.findOneAndUpdate(
        { code: version },
        {
          $set: {
            displayName: translation.displayName,
            source: sourceName,
            license,
            lastImportedAt: new Date(),
          },
          $inc: { revision: 1 },
        },
        { upsert: true },
      );
      console.log(`[Bible Import] ${version.toUpperCase()} complete: ${written} values written`);
    } catch (error) {
      job.written = written;
      job.status = "failed";
      await job.save();
      throw error;
    }
  }
} finally {
  await mongoose.disconnect();
}

console.log("[Bible Import] All requested translations completed successfully");
