import { Router } from "express";
import express from "express";
import { protect, requireProductAccess } from "../auth/auth.middleware.js";
import { requireFeature } from "../billing/capability.middleware.js";

/**
 * Lower thirds are Standard only — the builder AND the pre-built templates.
 *
 * Every route here, including the read-only ones: a template list a free
 * church cannot use anything from is not a feature, it is a tease, and the
 * client shows the locked state from the capability map instead.
 */
const paidFeature = requireFeature("lowerThird.builder");
import {
  pushState,
  pushPreview,
  snapshotTemplate,
  uploadAsset,
  serveAsset,
  serveThumbnail,
  getConfig,
  getStaticUrl,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "./lower-third.controller.js";

export const lowerThirdRouter = Router();

// Increase JSON body size limit for template data and base64 assets
lowerThirdRouter.use(express.json({ limit: "20mb" }));

// ── Proxy to microservice ────────────────────────────────────────────────────
lowerThirdRouter.post("/push", protect, requireProductAccess, paidFeature, pushState);
lowerThirdRouter.patch("/push-preview", protect, requireProductAccess, paidFeature, pushPreview);
lowerThirdRouter.post("/snapshot", protect, requireProductAccess, paidFeature, snapshotTemplate);
lowerThirdRouter.post("/upload-asset", protect, requireProductAccess, paidFeature, uploadAsset);

// ── R2 asset serving ─────────────────────────────────────────────────────────
lowerThirdRouter.get("/asset/*", serveAsset);
lowerThirdRouter.get("/thumbnail/:userId/:templateId", protect, requireProductAccess, paidFeature, serveThumbnail);

// ── Config (safe, no secrets) ────────────────────────────────────────────────
lowerThirdRouter.get("/config", getConfig);
lowerThirdRouter.get("/static-url", getStaticUrl);

// ── Custom template CRUD (user-scoped) ───────────────────────────────────────
lowerThirdRouter.get("/templates", protect, requireProductAccess, paidFeature, listTemplates);
lowerThirdRouter.post("/templates", protect, requireProductAccess, paidFeature, createTemplate);
lowerThirdRouter.put("/templates/:templateId", protect, requireProductAccess, paidFeature, updateTemplate);
lowerThirdRouter.delete("/templates/:templateId", protect, requireProductAccess, paidFeature, deleteTemplate);
