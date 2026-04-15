import { Request, Response } from "express";
import { MediaCategory, MediaCollection } from "../media/media.model.js";
import { BibleVerse } from "../bible/bible.model.js";

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
    }
  ]);
};

// --- Media Taxonomy Endpoints ---
export const getMediaCategories = async (req: Request, res: Response) => {
  try {
    const categories = await MediaCategory.find().sort({ sortOrder: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching categories" });
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
    res.status(500).json({ success: false, message: "Error fetching collections" });
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
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
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
    const validVersions = ['amp', 'msg', 'kjv', 'nkjv', 'esv', 'niv'];

    if (!validVersions.includes(version)) {
      return res.status(400).json({ success: false, message: `Invalid version. Must be one of: ${validVersions.join(', ')}` });
    }
    if (!Array.isArray(verses) || verses.length === 0) {
      return res.status(400).json({ success: false, message: 'verses array is required and must not be empty' });
    }

    const nonEmpty = verses.filter((v: any) => v.text && v.text.trim().length > 0);
    console.log(`[Bible Seed] Upserting ${nonEmpty.length} ${version.toUpperCase()} verses...`);

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
              testament: OT_BOOKS.has(v.book) ? 'old' : 'new',
              chapter: v.chapter,
              verse: v.verse,
              [version]: v.text,
            },
          },
          upsert: true,
        },
      }));
      await BibleVerse.bulkWrite(operations, { ordered: false });
      written += batch.length;
    }

    console.log(`[Bible Seed] ✅ ${version.toUpperCase()}: ${written} verses written to DB`);
    res.status(200).json({ success: true, version, written });
  } catch (error: any) {
    console.error('[Bible Seed] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/bible-coverage
 * Returns verse counts per version to check what's missing in the DB.
 */
export const getBibleCoverage = async (req: Request, res: Response) => {
  try {
    const versions = ['kjv', 'nkjv', 'amp', 'msg', 'esv', 'niv'];
    const coverage: Record<string, number> = {};

    for (const v of versions) {
      coverage[v] = await BibleVerse.countDocuments({ [v]: { $exists: true, $ne: '' } });
    }

    const total = await BibleVerse.countDocuments();
    res.json({ success: true, total, coverage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
