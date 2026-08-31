import { Router } from "express";
import multer from "multer";
import {
  getSystemStatus,
  getTrialAnalytics,
  getUserMetrics,
  getRevenueData,
  getSystemMetrics,
  getAdminAccounts,
  createAdminAccount,
  updateAdminRole,
  suspendAdmin,
  deleteAdmin,
  resetAdminPassword,
  getMediaCategories,
  createMediaCategory,
  getMediaCollections,
  createMediaCollection,
  seedBibleTranslation,
  getBibleCoverage,
  migrateBibleBookNames,
  previewBibleImport,
  commitBibleImport,
  getManagedBibleVerses,
  updateManagedBibleVerse,
  getBibleImportHistory,
  rollbackBibleImport,
  getAdminSubscriptionUsers,
  extendUserTrial,
  updateUserSubscriptionPlan,
  bulkExtendUserTrials,
} from "./admin.controller.js";
import { listRoles, createRole, updateRole, deleteRole } from "./role.controller.js";
import { listReferralRequests, approveReferralRequest, rejectReferralRequest, listReferees, getRefereeDetail, suspendReferee, resetRefereePassword } from "../referral/referral.controller.js";
import { protect, authorizeAdmin, requireSuperAdmin, requirePermission } from "../auth/auth.middleware.js";
import { rateLimit } from "../auth/rate-limit.middleware.js";
import {
  getAdminDownloadableFiles,
  uploadDownloadableFile,
  generatePresignedUploadUrl,
  confirmUpload,
  updateDownloadableFile,
  deleteDownloadableFile,
  getDownloadAnalytics
} from "../help/help.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }
});

router.use(protect, authorizeAdmin);

router.get("/system-status", getSystemStatus);
router.get("/trial-analytics", getTrialAnalytics);
router.get("/user-metrics", getUserMetrics);
router.get("/revenue-data", getRevenueData);
router.get("/system-metrics", getSystemMetrics);
router.get("/accounts", getAdminAccounts);
router.post("/accounts", requireSuperAdmin, rateLimit("admin-create-account", 20, 60 * 60 * 1000), createAdminAccount);
router.patch("/accounts/:id/role", requireSuperAdmin, updateAdminRole);
router.post("/suspend-admin/:id", requireSuperAdmin, suspendAdmin);
router.delete("/delete-admin/:id", requireSuperAdmin, deleteAdmin);
router.post("/reset-password/:id", requireSuperAdmin, rateLimit("admin-reset-password", 20, 60 * 60 * 1000), resetAdminPassword);

// Role management (superadmin only)
router.get("/roles", requireSuperAdmin, listRoles);
router.post("/roles", requireSuperAdmin, createRole);
router.patch("/roles/:id", requireSuperAdmin, updateRole);
router.delete("/roles/:id", requireSuperAdmin, deleteRole);

// Referral Program (granted per-role via requirePermission, not superadmin-only)
router.get("/referral-requests", requirePermission("referral-requests"), listReferralRequests);
router.post("/referral-requests/:id/approve", requirePermission("referral-requests"), approveReferralRequest);
router.post("/referral-requests/:id/reject", requirePermission("referral-requests"), rejectReferralRequest);
router.get("/referrals", requirePermission("referrals"), listReferees);
router.get("/referrals/:id", requirePermission("referrals"), getRefereeDetail);
router.post("/referrals/:id/suspend", requirePermission("referrals"), suspendReferee);
router.post("/referrals/:id/reset-password", requirePermission("referrals"), rateLimit("referral-reset-password", 20, 60 * 60 * 1000), resetRefereePassword);

// Subscription & Trial Management Routes
router.get("/subscriptions/users", getAdminSubscriptionUsers);
router.post("/subscriptions/users/:userId/extend", extendUserTrial);
router.patch("/subscriptions/users/:userId/plan", updateUserSubscriptionPlan);
router.post("/subscriptions/bulk-extend", bulkExtendUserTrials);

// Media Metadata Routes for Super Admin
router.get("/media/categories", getMediaCategories);
router.post("/media/categories", createMediaCategory);
router.get("/media/collections", getMediaCollections);
router.post("/media/collections", createMediaCollection);

// Bible Translation Seeding (Admin Only)
router.get("/bible-coverage", getBibleCoverage);
router.post("/seed-bible", seedBibleTranslation);
router.post("/migrate-bible-books", migrateBibleBookNames);
router.get("/bible/verses", getManagedBibleVerses);
router.patch("/bible/verses", updateManagedBibleVerse);
router.post("/bible/import/preview", previewBibleImport);
router.post("/bible/import/commit", commitBibleImport);
router.get("/bible/import/history", getBibleImportHistory);
router.post("/bible/import/:id/rollback", rollbackBibleImport);

// Downloadable files managed by super admins
router.get("/download-files", getAdminDownloadableFiles);
router.get("/download-files/analytics", getDownloadAnalytics);
router.post("/download-files/upload", upload.single("file"), uploadDownloadableFile);
router.post("/download-files/presigned-url", generatePresignedUploadUrl);
router.post("/download-files/confirm", confirmUpload);
router.patch("/download-files/:id", updateDownloadableFile);
router.delete("/download-files/:id", deleteDownloadableFile);

export default router;
