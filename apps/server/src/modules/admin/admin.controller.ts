import { Request, Response } from "express";
import { MediaCategory, MediaCollection } from "../media/media.model.js";
import {
  BibleVerse,
  BibleTranslation,
  BibleImportJob,
  BibleImportChange,
} from "../bible/bible.model.js";
import { BibleService } from "../bible/bible.service.js";
import {
  BIBLE_VERSION_KEYS,
  parseBibleInput,
  type ManagedBibleVersion,
  type ParsedBibleVerse,
} from "../bible/bible-admin.service.js";

export const getSystemStatus = (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    version: "1.0.0",
    uptime: process.uptime(),
    database: "connected",
    lastBackup: new Date().toISOString(),
  });
};

export const getTrialAnalytics = (req: Request, res: Response) => {
  res.status(200).json({
    totalUsers: 2542,
    activeTrials: 342,
    expiredTrials: 156,
    trialConversionRate: 60.1,
    averageTrialDuration: 12, // days
    upcomingExpirations: {
      today: 14,
      thisWeek: 56,
      thisMonth: 124,
    },
  });
};

export const getUserMetrics = (req: Request, res: Response) => {
  res.status(200).json({
    totalRegistrations: 4521,
    dailySignups: 42,
    weeklySignups: 210,
    monthlySignups: 854,
    activeUsers: 3102,
    organizationsCreated: 154,
    emailVerificationRate: 94.2,
  });
};

export const getRevenueData = (req: Request, res: Response) => {
  res.status(200).json({
    totalRevenue: 125400,
    monthlyRecurringRevenue: 15400,
    averageRevenuePerUser: 42.5,
    trialToPayingConversion: 45.2,
    churnRate: 1.2,
    lifetimeValue: 1240,
  });
};

export const getSystemMetrics = (req: Request, res: Response) => {
  res.status(200).json({
    emailsSent: 15240,
    emailDeliveryRate: 99.4,
    notificationsSent: 45210,
    systemUptime: 99.99,
    databaseSize: "24.5 GB",
    activeConnections: 154,
  });
};

export const getAdminAccounts = (req: Request, res: Response) => {
  res.status(200).json([
    {
      id: "admin-1",
      email: "superadmin@qworship.com",
      role: "superadmin",
      status: "active",
      lastLogin: new Date().toISOString(),
    },
    {
      id: "admin-2",
      email: "moderator@qworship.com",
      role: "moderator",
      status: "active",
      lastLogin: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
};

// --- Media Taxonomy Endpoints ---
export const getMediaCategories = async (req: Request, res: Response) => {
  try {
    const categories = await MediaCategory.find().sort({ sortOrder: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching categories" });
  }
};

export const createMediaCategory = async (req: Request, res: Response) => {
  try {
    const category = new MediaCategory(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMediaCollections = async (req: Request, res: Response) => {
  try {
    const collections = await MediaCollection.find().sort({ sortOrder: 1 });
    res.status(200).json(collections);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching collections" });
  }
};

export const createMediaCollection = async (req: Request, res: Response) => {
  try {
    const collection = new MediaCollection(req.body);
    await collection.save();
    res.status(201).json(collection);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Bible Translation Seed (Admin Only) ───────────────────────────────────────

const OT_BOOKS = new Set([
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
]);

/**
 * POST /api/admin/seed-bible
 * Body: { version: 'amp'|'msg', verses: [{ book, chapter, verse, text }] }
 *
 * Accepts pre-converted flat verse data and upserts it into MongoDB.
 * Use this to push AMP/MSG text to the deployed production server.
 */
export const seedBibleTranslation = async (req: Request, res: Response) => {
  try {
    const { version, verses } = req.body;
    const validVersions = ["amp", "msg", "kjv", "nkjv", "esv", "niv"];

    if (!validVersions.includes(version)) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Invalid version. Must be one of: ${validVersions.join(", ")}`,
        });
    }
    if (!Array.isArray(verses) || verses.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "verses array is required and must not be empty",
        });
    }

    const nonEmpty = verses.filter(
      (v: any) => v.text && v.text.trim().length > 0,
    );
    console.log(
      `[Bible Seed] Upserting ${nonEmpty.length} ${version.toUpperCase()} verses...`,
    );

    const BATCH_SIZE = 1000;
    let written = 0;

    for (let i = 0; i < nonEmpty.length; i += BATCH_SIZE) {
      const batch = nonEmpty.slice(i, i + BATCH_SIZE);
      const operations = batch.map((v: any) => ({
        updateOne: {
          filter: { bookName: v.book, chapter: v.chapter, verse: v.verse },
          update: {
            $set: {
              bookName: v.book,
              testament: OT_BOOKS.has(v.book) ? "old" : "new",
              chapter: v.chapter,
              verse: v.verse,
              [version]: v.text,
            } as any,
          },
          upsert: true,
        },
      }));
      await BibleVerse.bulkWrite(operations, { ordered: false });
      written += batch.length;
    }

    console.log(
      `[Bible Seed] ✅ ${version.toUpperCase()}: ${written} verses written to DB`,
    );
    nonEmpty.forEach((item: any) => BibleService.upsertMemoryVerse(
      version, item.book, Number(item.chapter), Number(item.verse), item.text.trim(),
    ));
    res.status(200).json({ success: true, version, written });
  } catch (error: any) {
    console.error("[Bible Seed] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const isManagedVersion = (value: unknown): value is ManagedBibleVersion =>
  BIBLE_VERSION_KEYS.includes(String(value).toLowerCase() as ManagedBibleVersion);

export const previewBibleImport = async (req: Request, res: Response) => {
  const { version, text } = req.body;
  if (!isManagedVersion(version)) {
    return res.status(400).json({ success: false, message: "Unsupported Bible version" });
  }
  if (typeof text !== "string") {
    return res.status(400).json({ success: false, message: "text is required" });
  }

  const parsed = parseBibleInput(text);
  const references = parsed.verses.map(item => ({
    bookName: item.book, chapter: item.chapter, verse: item.verse,
  }));
  const existing = references.length
    ? await BibleVerse.find({}, { bookName: 1, chapter: 1, verse: 1, [version]: 1 }).lean()
    : [];
  const existingMap = new Map(existing.map((item: any) => [
    `${item.bookName}|${item.chapter}|${item.verse}`, Boolean(item[version]?.trim()),
  ]));
  const alreadyPopulated = parsed.verses.filter(item =>
    existingMap.get(`${item.book}|${item.chapter}|${item.verse}`),
  ).length;

  return res.json({
    success: true,
    version,
    summary: {
      parsed: parsed.verses.length,
      issues: parsed.issues.length,
      duplicates: parsed.duplicates.length,
      alreadyPopulated,
      fillable: parsed.verses.length - alreadyPopulated,
    },
    verses: parsed.verses,
    issues: parsed.issues,
    duplicates: parsed.duplicates,
  });
};

const writeBibleVerses = async (
  version: ManagedBibleVersion,
  verses: ParsedBibleVerse[],
) => {
  const operations = verses.map(item => ({
    updateOne: {
      filter: { bookName: item.book, chapter: item.chapter, verse: item.verse },
      update: {
        $set: {
          bookName: item.book,
          testament: OT_BOOKS.has(item.book) ? "old" : "new",
          chapter: item.chapter,
          verse: item.verse,
          [version]: item.text,
        },
      },
      upsert: true,
    },
  }));
  if (!operations.length) return 0;
  const result = await BibleVerse.bulkWrite(operations as any, { ordered: false });
  BibleService.invalidateCache();
  verses.forEach(item => BibleService.upsertMemoryVerse(
    version, item.book, item.chapter, item.verse, item.text,
  ));
  return result.modifiedCount + result.upsertedCount;
};

export const commitBibleImport = async (req: Request, res: Response) => {
  try {
    const {
      version, verses, mode = "fill-missing",
      sourceName = "", provenance = "", license = "",
    } = req.body;
    if (!isManagedVersion(version) || !Array.isArray(verses)) {
      return res.status(400).json({ success: false, message: "version and verses are required" });
    }
    if (mode !== "fill-missing" && mode !== "overwrite") {
      return res.status(400).json({ success: false, message: "mode must be fill-missing or overwrite" });
    }
    const parsedCommit = parseBibleInput(JSON.stringify(verses));
    if (parsedCommit.issues.length || parsedCommit.duplicates.length) {
      return res.status(400).json({
        success: false,
        message: "Import contains invalid or duplicate verse references",
        issues: parsedCommit.issues,
        duplicates: parsedCommit.duplicates,
      });
    }
    const validated = parsedCommit.verses;
    const references = validated.map(item => ({
      bookName: item.book, chapter: item.chapter, verse: item.verse,
    }));
    const existing = references.length
      ? await BibleVerse.find({}, { bookName: 1, chapter: 1, verse: 1, [version]: 1 }).lean()
      : [];
    const existingMap = new Map(existing.map((item: any) => [
      `${item.bookName}|${item.chapter}|${item.verse}`,
      typeof item[version] === "string" && item[version].trim() ? item[version] : null,
    ]));
    const effective = validated.filter(item =>
      mode === "overwrite" || !existingMap.get(`${item.book}|${item.chapter}|${item.verse}`),
    );
    const written = await writeBibleVerses(version, effective);
    const job = await BibleImportJob.create({
      version, mode, sourceName, provenance, license,
      received: verses.length, written, status: "completed",
    });
    if (effective.length) {
      await BibleImportChange.insertMany(effective.map(item => ({
        jobId: job._id,
        bookName: item.book,
        chapter: item.chapter,
        verse: item.verse,
        previousText: existingMap.get(`${item.book}|${item.chapter}|${item.verse}`) || null,
        newText: item.text,
      })));
    }
    await BibleTranslation.findOneAndUpdate(
      { code: version },
      {
        $set: {
          displayName: version.toUpperCase(), source: sourceName,
          license, lastImportedAt: new Date(),
        },
        $inc: { revision: 1 },
      },
      { upsert: true },
    );
    return res.json({ success: true, version, mode, received: verses.length, written, jobId: job._id });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBibleImportHistory = async (req: Request, res: Response) => {
  const query = isManagedVersion(req.query.version) ? { version: req.query.version } : {};
  const jobs = await BibleImportJob.find(query).sort({ createdAt: -1 }).limit(20).lean();
  return res.json({ success: true, jobs });
};

export const rollbackBibleImport = async (req: Request, res: Response) => {
  try {
    const job = await BibleImportJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Import not found" });
    if (job.status === "rolled-back") {
      return res.status(409).json({ success: false, message: "Import has already been rolled back" });
    }
    const version = job.version as ManagedBibleVersion;
    const changes = await BibleImportChange.find({ jobId: job._id }).lean();
    const operations = changes.map((change: any) => ({
      updateOne: {
        filter: { bookName: change.bookName, chapter: change.chapter, verse: change.verse },
        update: change.previousText
          ? { $set: { [version]: change.previousText } }
          : { $unset: { [version]: 1 } },
      },
    }));
    if (operations.length) await BibleVerse.bulkWrite(operations as any, { ordered: false });
    job.status = "rolled-back";
    await job.save();
    await BibleTranslation.findOneAndUpdate({ code: version }, { $inc: { revision: 1 } });
    BibleService.invalidateCache();
    // Update restored values in memory; removed values become DB fallbacks.
    changes.filter((change: any) => change.previousText).forEach((change: any) =>
      BibleService.upsertMemoryVerse(version, change.bookName, change.chapter, change.verse, change.previousText),
    );
    changes.filter((change: any) => !change.previousText).forEach((change: any) =>
      BibleService.removeMemoryVerse(version, change.bookName, change.chapter, change.verse),
    );
    return res.json({ success: true, restored: changes.length });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getManagedBibleVerses = async (req: Request, res: Response) => {
  try {
    const version = String(req.query.version || "kjv").toLowerCase();
    if (!isManagedVersion(version)) {
      return res.status(400).json({ success: false, message: "Unsupported Bible version" });
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const query: any = {};
    if (req.query.book) query.bookName = String(req.query.book);
    if (req.query.chapter) query.chapter = Number(req.query.chapter);
    if (req.query.missingOnly === "true") {
      query.$or = [{ [version]: { $exists: false } }, { [version]: "" }, { [version]: null }];
    }
    const [rows, total] = await Promise.all([
      BibleVerse.find(query, { bookName: 1, chapter: 1, verse: 1, [version]: 1 })
        .sort({ bookName: 1, chapter: 1, verse: 1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      BibleVerse.countDocuments(query),
    ]);
    return res.json({
      success: true, version, page, limit, total,
      verses: rows.map((row: any) => ({
        id: row._id, book: row.bookName, chapter: row.chapter,
        verse: row.verse, text: row[version] || "",
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateManagedBibleVerse = async (req: Request, res: Response) => {
  try {
    const { version, book, chapter, verse, text } = req.body;
    if (!isManagedVersion(version) || !book || !Number.isInteger(Number(chapter)) ||
        !Number.isInteger(Number(verse)) || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, message: "Valid version, reference, and text are required" });
    }
    const updated = await BibleVerse.findOneAndUpdate(
      { bookName: String(book), chapter: Number(chapter), verse: Number(verse) },
      { $set: { [version]: text.trim() } },
      { new: true },
    );
    if (!updated) return res.status(404).json({ success: false, message: "Verse reference not found" });
    BibleService.upsertMemoryVerse(version, String(book), Number(chapter), Number(verse), text.trim());
    await BibleTranslation.findOneAndUpdate(
      { code: version },
      { $setOnInsert: { displayName: version.toUpperCase() }, $inc: { revision: 1 } },
      { upsert: true },
    );
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/bible-coverage
 * Returns verse counts per version to check what's missing in the DB.
 */
export const getBibleCoverage = async (req: Request, res: Response) => {
  try {
    const versions = ["kjv", "nkjv", "amp", "msg", "esv", "niv"];
    const coverage: Record<string, number> = {};

    for (const v of versions) {
      coverage[v] = await BibleVerse.countDocuments({
        [v]: { $exists: true, $nin: ["", null] },
      });
    }

    const total = await BibleVerse.countDocuments();
    res.json({ success: true, total, coverage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/migrate-bible-books
 * Renames mismatched bookName values in the BibleVerse collection to canonical names.
 * Fixes: Psalm→Psalms, Song of Songs→Song of Solomon, I Samuel→1 Samuel, etc.
 * Safe to run multiple times.
 */
export const migrateBibleBookNames = async (req: Request, res: Response) => {
  const RENAMES: { from: string; to: string }[] = [
    { from: "Psalm", to: "Psalms" },
    { from: "Song of Songs", to: "Song of Solomon" },
    { from: "I Samuel", to: "1 Samuel" },
    { from: "II Samuel", to: "2 Samuel" },
    { from: "I Kings", to: "1 Kings" },
    { from: "II Kings", to: "2 Kings" },
    { from: "I Chronicles", to: "1 Chronicles" },
    { from: "II Chronicles", to: "2 Chronicles" },
    { from: "I Corinthians", to: "1 Corinthians" },
    { from: "II Corinthians", to: "2 Corinthians" },
    { from: "I Thessalonians", to: "1 Thessalonians" },
    { from: "II Thessalonians", to: "2 Thessalonians" },
    { from: "I Timothy", to: "1 Timothy" },
    { from: "II Timothy", to: "2 Timothy" },
    { from: "I Peter", to: "1 Peter" },
    { from: "II Peter", to: "2 Peter" },
    { from: "I John", to: "1 John" },
    { from: "II John", to: "2 John" },
    { from: "III John", to: "3 John" },
  ];

  try {
    const results: { from: string; to: string; count: number }[] = [];
    let totalRenamed = 0;

    for (const { from, to } of RENAMES) {
      const result = await BibleVerse.updateMany(
        { bookName: from },
        { $set: { bookName: to } },
      );
      if (result.modifiedCount > 0) {
        results.push({ from, to, count: result.modifiedCount });
        totalRenamed += result.modifiedCount;
      }
    }

    console.log(
      `[Bible Migration] ✅ Renamed ${totalRenamed} documents across ${results.length} book name fixes`,
    );
    res.json({ success: true, totalRenamed, results });
  } catch (error: any) {
    console.error("[Bible Migration] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
