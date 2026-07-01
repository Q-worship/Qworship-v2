// @ts-nocheck
/**
 * migrate-bible-book-names.ts
 *
 * One-time migration that normalizes bookName values in the BibleVerse
 * MongoDB collection to match the canonical names used by:
 *   - aliasNormalizer.ts (server-side query target)
 *   - The normalized flat JSON files (desktop RAM cache)
 *
 * Fixes:
 *   Psalm          → Psalms
 *   Song of Songs  → Song of Solomon
 *   I Samuel       → 1 Samuel
 *   II Samuel      → 2 Samuel
 *   I Kings        → 1 Kings
 *   II Kings       → 2 Kings
 *   I Chronicles   → 1 Chronicles
 *   II Chronicles  → 2 Chronicles
 *   I Corinthians  → 1 Corinthians
 *   II Corinthians → 2 Corinthians
 *   ... (all Roman numeral book names)
 *
 * Safe to run multiple times — uses updateMany with exact filters.
 *
 * Run:
 *   npx tsx apps/server/src/scripts/migrate-bible-book-names.ts
 */

import mongoose from 'mongoose';
import { BibleVerse } from '../modules/bible/bible.model.js';

const RENAMES: { from: string; to: string }[] = [
  { from: 'Psalm',          to: 'Psalms' },
  { from: 'Song of Songs',  to: 'Song of Solomon' },
  { from: 'I Samuel',       to: '1 Samuel' },
  { from: 'II Samuel',      to: '2 Samuel' },
  { from: 'I Kings',        to: '1 Kings' },
  { from: 'II Kings',       to: '2 Kings' },
  { from: 'I Chronicles',   to: '1 Chronicles' },
  { from: 'II Chronicles',  to: '2 Chronicles' },
  { from: 'I Corinthians',  to: '1 Corinthians' },
  { from: 'II Corinthians', to: '2 Corinthians' },
  { from: 'I Thessalonians','to': '1 Thessalonians' },
  { from: 'II Thessalonians','to': '2 Thessalonians' },
  { from: 'I Timothy',      to: '1 Timothy' },
  { from: 'II Timothy',     to: '2 Timothy' },
  { from: 'I Peter',        to: '1 Peter' },
  { from: 'II Peter',       to: '2 Peter' },
  { from: 'I John',         to: '1 John' },
  { from: 'II John',        to: '2 John' },
  { from: 'III John',       to: '3 John' },
];

async function main() {
  const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://kayyadams360_db_user:V4e9BhRfLKHL12h4@qworship.bki11v4.mongodb.net/';

  console.log('\n🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.\n');

  let totalRenamed = 0;
  let totalMerged = 0;
  let totalDeleted = 0;

  for (const { from, to } of RENAMES) {
    const count = await BibleVerse.countDocuments({ bookName: from });

    if (count === 0) {
      console.log(`  ⏭️  "${from}" — 0 documents, skipping`);
      continue;
    }

    // Check if the canonical name already has records (duplicate scenario)
    const canonicalCount = await BibleVerse.countDocuments({ bookName: to });

    if (canonicalCount === 0) {
      // Safe simple rename — no conflict possible
      const result = await BibleVerse.updateMany(
        { bookName: from },
        { $set: { bookName: to } }
      );
      totalRenamed += result.modifiedCount;
      console.log(`  ✅ "${from}" → "${to}" — renamed ${result.modifiedCount} docs`);
    } else {
      // Both old and new names exist — must merge verse by verse
      console.log(`  🔀 "${from}" and "${to}" both exist — merging ${count} stale docs into canonical...`);

      const staleVerses = await BibleVerse.find({ bookName: from }).lean();
      const VERSIONS = ['kjv', 'nkjv', 'amp', 'msg', 'esv', 'niv'] as const;

      let merged = 0;
      let deleted = 0;

      for (const stale of staleVerses) {
        // Build $set with only non-empty version fields from the stale doc
        const setFields: Record<string, string> = {};
        for (const v of VERSIONS) {
          const staleText = (stale as any)[v];
          if (staleText && staleText.trim()) {
            setFields[v] = staleText.trim();
          }
        }

        if (Object.keys(setFields).length > 0) {
          // Merge into canonical: only fill fields that are missing ($set won't overwrite existing)
          await BibleVerse.updateOne(
            {
              bookName: to,
              chapter: stale.chapter,
              verse: stale.verse,
              // Only fill if the field is currently empty/missing
            },
            [
              {
                $set: Object.fromEntries(
                  Object.entries(setFields).map(([k, v]) => [
                    k,
                    {
                      $cond: [
                        { $or: [{ $eq: [`$${k}`, ''] }, { $eq: [`$${k}`, null] }, { $not: [`$${k}`] }] },
                        v,
                        `$${k}`
                      ]
                    }
                  ])
                )
              }
            ]
          );
          merged++;
        }

        // Delete the stale document
        await BibleVerse.deleteOne({ _id: (stale as any)._id });
        deleted++;
      }

      totalMerged += merged;
      totalDeleted += deleted;
      console.log(`  ✅ "${from}" merged: ${merged} docs updated, ${deleted} stale docs deleted`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Simple renames: ${totalRenamed}`);
  console.log(`   Merge-and-delete: ${totalMerged} merged, ${totalDeleted} removed`);

  // Validation
  const CANONICAL_66 = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
    '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
    'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
    'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
    'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
    'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
    'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians',
    '1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
    '1 John','2 John','3 John','Jude','Revelation'
  ];

  console.log('\n🔍 Post-migration validation...');
  const missing: string[] = [];
  for (const book of CANONICAL_66) {
    const count = await BibleVerse.countDocuments({ bookName: book });
    if (count === 0) missing.push(book);
  }

  if (missing.length === 0) {
    console.log('✅ All 66 canonical books present in DB!');
  } else {
    console.warn(`⚠️  Missing books in DB: ${missing.join(', ')}`);
  }

  // Spot-check
  console.log('\n📖 Spot-check:');
  const psalm91 = await BibleVerse.findOne({ bookName: 'Psalms', chapter: 91, verse: 1 }).lean();
  console.log(`  Psalms 91:1 KJV: ${(psalm91 as any)?.kjv?.substring(0, 70) || '(not found)'}...`);

  const sos = await BibleVerse.findOne({ bookName: 'Song of Solomon', chapter: 1, verse: 1 }).lean();
  console.log(`  Song of Solomon 1:1 KJV: ${(sos as any)?.kjv?.substring(0, 70) || '(not found)'}...`);

  const sam = await BibleVerse.findOne({ bookName: '1 Samuel', chapter: 1, verse: 1 }).lean();
  console.log(`  1 Samuel 1:1 KJV: ${(sam as any)?.kjv?.substring(0, 70) || '(not found)'}...`);

  await mongoose.disconnect();
  console.log('\n✅ Migration complete. Connection closed.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

