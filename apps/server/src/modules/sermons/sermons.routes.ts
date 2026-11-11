import { Router } from "express";
import { protect, requireProductAccess } from "../auth/auth.middleware.js";
import { requireFeature } from "../billing/capability.middleware.js";
import {
  listSermons,
  getSermon,
  createSermon,
  updateSermon,
  deleteSermon,
  generateSermonManuscript,
  saveManuscript,
  useDraft,
  getManuscriptTemplate,
  saveManuscriptTemplate,
} from "./sermons.controller.js";

export const sermonsRouter = Router();

// Q-worship sermons are a Standard feature; the whole module is gated.
sermonsRouter.use(protect, requireProductAccess, requireFeature("sermons"));

sermonsRouter.get("/", listSermons);
// Before "/:id" so "template" isn't read as a sermon id.
sermonsRouter.get("/template", getManuscriptTemplate);
sermonsRouter.put("/template", saveManuscriptTemplate);
sermonsRouter.post("/", createSermon);
sermonsRouter.get("/:id", getSermon);
sermonsRouter.patch("/:id", updateSermon);
sermonsRouter.delete("/:id", deleteSermon);
sermonsRouter.post("/:id/generate", generateSermonManuscript);
sermonsRouter.put("/:id/manuscript", saveManuscript);
sermonsRouter.post("/:id/drafts/:draftId/use", useDraft);
