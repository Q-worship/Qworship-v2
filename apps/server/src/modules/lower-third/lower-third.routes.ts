import { Router } from "express";
import express from "express";
import { protect, requireProductAccess } from "../auth/auth.middleware.js";
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
lowerThirdRouter.post("/push", protect, requireProductAccess, pushState);
lowerThirdRouter.patch("/push-preview", protect, requireProductAccess, pushPreview);
lowerThirdRouter.post("/snapshot", protect, requireProductAccess, snapshotTemplate);
lowerThirdRouter.post("/upload-asset", protect, requireProductAccess, uploadAsset);

// ── R2 asset serving ─────────────────────────────────────────────────────────
lowerThirdRouter.get("/asset/*", serveAsset);
lowerThirdRouter.get("/thumbnail/:userId/:templateId", protect, requireProductAccess, serveThumbnail);

// ── Config (safe, no secrets) ────────────────────────────────────────────────
lowerThirdRouter.get("/config", getConfig);
lowerThirdRouter.get("/static-url", getStaticUrl);

// ── Custom template CRUD (user-scoped) ───────────────────────────────────────
lowerThirdRouter.get("/templates", protect, requireProductAccess, listTemplates);
lowerThirdRouter.post("/templates", protect, requireProductAccess, createTemplate);
lowerThirdRouter.put("/templates/:templateId", protect, requireProductAccess, updateTemplate);
lowerThirdRouter.delete("/templates/:templateId", protect, requireProductAccess, deleteTemplate);
