import { Router } from "express";
import multer from "multer";
import {
  getSystemStatus,
  getTrialAnalytics,
  getUserMetrics,
  getRevenueData,
  getSystemMetrics,
  getAdminAccounts,
  getMediaCategories,
  createMediaCategory,
  getMediaCollections,
  createMediaCollection,
  seedBibleTranslation,
  getBibleCoverage,
  migrateBibleBookNames,
} from "./admin.controller.js";
import { authorizeAdmin } from "../auth/auth.middleware.js";
import {
  getAdminDownloadableFiles,
  uploadDownloadableFile,
  updateDownloadableFile,
  deleteDownloadableFile,
  getDownloadAnalytics
} from "../help/help.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }
});

// To be safe, the frontend sends adminKey as a query parameter.
router.use(authorizeAdmin);

router.get("/system-status", getSystemStatus);
router.get("/trial-analytics", getTrialAnalytics);
router.get("/user-metrics", getUserMetrics);
router.get("/revenue-data", getRevenueData);
router.get("/system-metrics", getSystemMetrics);
router.get("/accounts", getAdminAccounts);

// Media Metadata Routes for Super Admin
router.get("/media/categories", getMediaCategories);
router.post("/media/categories", createMediaCategory);
router.get("/media/collections", getMediaCollections);
router.post("/media/collections", createMediaCollection);

// Bible Translation Seeding (Admin Only)
router.get("/bible-coverage", getBibleCoverage);
router.post("/seed-bible", seedBibleTranslation);
router.post("/migrate-bible-books", migrateBibleBookNames);

// Downloadable files managed by super admins
router.get("/download-files", getAdminDownloadableFiles);
router.get("/download-files/analytics", getDownloadAnalytics);
router.post("/download-files/upload", upload.single("file"), uploadDownloadableFile);
router.patch("/download-files/:id", updateDownloadableFile);
router.delete("/download-files/:id", deleteDownloadableFile);

export default router;
