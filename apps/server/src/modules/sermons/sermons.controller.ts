import { Request, Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import { SermonTranscript, ISermonTranscript, Manuscript, ManuscriptProvider, ManuscriptStyle } from "./sermon.model.js";
import { ManuscriptTemplate } from "./manuscript-template.model.js";
import { generateManuscript } from "./manuscript.service.js";
import { countWords } from "./sermon.recorder.js";
import { scanReferences } from "./references.js";

const PROVIDERS: ManuscriptProvider[] = ["openai", "groq"];
const STYLES: ManuscriptStyle[] = ["readable", "verbatim"];
const MAX_UPLOAD_WORDS = 20_000;
const RECORDING_STALE_MS = 2 * 60_000;
const GENERATING_STALE_MS = 10 * 60_000;

const userIdOf = (req: Request) => (req as any).user._id;

const transcriptText = (sermon: Pick<ISermonTranscript, "segments">) =>
  sermon.segments.map((s) => s.text).join(" ");

async function findOwned(req: Request, res: Response) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: "Sermon not found" });
    return null;
  }
  const sermon = await SermonTranscript.findOne({ _id: id, userId: userIdOf(req) });
  if (!sermon) res.status(404).json({ error: "Sermon not found" });
  return sermon;
}

export const listSermons = async (req: Request, res: Response) => {
  try {
    const rows = await SermonTranscript.find({ userId: userIdOf(req) })
      .sort({ serviceDate: -1, createdAt: -1 })
      .select("title preacher serviceDate source status wordCount manuscriptStatus manuscript.title approvedAt createdAt updatedAt endedAt")
      .lean();
    res.json({
      ok: true,
      sermons: rows.map(({ manuscript, ...rest }) => ({
        ...rest,
        id: rest._id,
        manuscriptTitle: (manuscript as Manuscript | undefined)?.title,
      })),
    });
  } catch (err: any) {
    console.error("[Sermons] list error:", err.message);
    res.status(500).json({ error: "Failed to load sermons" });
  }
};

export const getSermon = async (req: Request, res: Response) => {
  try {
    const sermon = await findOwned(req, res);
    if (!sermon) return;
    const obj = sermon.toObject();
    res.json({ ok: true, sermon: { ...obj, id: obj._id, transcript: transcriptText(sermon) } });
  } catch (err: any) {
    console.error("[Sermons] get error:", err.message);
    res.status(500).json({ error: "Failed to load sermon" });
  }
};

/** Create a sermon from a pasted transcript (recordings made outside Q-worship). */
export const createSermon = async (req: Request, res: Response) => {
  try {
    const { transcript, title, preacher, serviceDate } = req.body ?? {};
    if (typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ error: "transcript is required" });
    }
    const wordCount = countWords(transcript);
    if (wordCount > MAX_UPLOAD_WORDS) {
      return res.status(400).json({ error: `Transcript is too long (max ${MAX_UPLOAD_WORDS} words)` });
    }
    const sermon = await SermonTranscript.create({
      userId: userIdOf(req),
      source: "upload",
      status: "ended",
      endedAt: new Date(),
      title,
      preacher,
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      segments: [{ text: transcript.trim(), at: new Date() }],
      references: scanReferences([{ text: transcript }]),
      wordCount,
    });
    res.status(201).json({ ok: true, id: sermon._id });
  } catch (err: any) {
    console.error("[Sermons] create error:", err.message);
    res.status(500).json({ error: "Failed to create sermon" });
  }
};

export const updateSermon = async (req: Request, res: Response) => {
  try {
    const sermon = await findOwned(req, res);
    if (!sermon) return;
    const { title, preacher, serviceDate } = req.body ?? {};
    if (typeof title === "string") sermon.title = title.trim();
    if (typeof preacher === "string") sermon.preacher = preacher.trim();
    if (serviceDate) sermon.serviceDate = new Date(serviceDate);
    await sermon.save();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[Sermons] update error:", err.message);
    res.status(500).json({ error: "Failed to update sermon" });
  }
};

export const deleteSermon = async (req: Request, res: Response) => {
  try {
    const sermon = await findOwned(req, res);
    if (!sermon) return;
    await sermon.deleteOne();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[Sermons] delete error:", err.message);
    res.status(500).json({ error: "Failed to delete sermon" });
  }
};

/**
 * Kick off manuscript generation. Runs in the background (a long sermon takes
 * 30-90s); the client polls GET /sermons/:id until manuscriptStatus changes.
 */
export const generateSermonManuscript = async (req: Request, res: Response) => {
  try {
    const sermon = await findOwned(req, res);
    if (!sermon) return;

    const provider: ManuscriptProvider = PROVIDERS.includes(req.body?.provider) ? req.body.provider : "openai";
    const style: ManuscriptStyle = STYLES.includes(req.body?.style) ? req.body.style : "readable";
    const model = typeof req.body?.model === "string" && req.body.model.trim() ? req.body.model.trim() : undefined;

    // A server restart can strand either state, so both expire.
    const sinceUpdate = Date.now() - sermon.updatedAt.getTime();
    if (sermon.manuscriptStatus === "generating" && sinceUpdate < GENERATING_STALE_MS) {
      return res.status(409).json({ error: "A manuscript is already being generated" });
    }
    if (sermon.status === "recording" && sinceUpdate < RECORDING_STALE_MS) {
      return res.status(409).json({ error: "This sermon is still being recorded" });
    }
    if (sermon.wordCount < 50) {
      return res.status(400).json({ error: "Transcript is too short to make a manuscript" });
    }

    const transcript = transcriptText(sermon);
    const detectedReferences = sermon.references.map((r) => r.label);
    const sermonId = sermon._id;

    sermon.status = "ended";
    sermon.manuscriptStatus = "generating";
    sermon.manuscriptError = undefined;
    await sermon.save();
    res.status(202).json({ ok: true, status: "generating" });

    void (async () => {
      try {
        const draft = await generateManuscript(transcript, { provider, model, style, detectedReferences });
        const draftDoc = { ...draft, _id: new Types.ObjectId(), createdAt: new Date() };
        // One atomic pipeline update so a poll can never see "ready" without
        // a manuscript. The first draft becomes the working copy (and fills an
        // empty title); later drafts are kept for comparison. $literal stops
        // any "$" in the AI text being read as a field path.
        await SermonTranscript.updateOne({ _id: sermonId }, [
          {
            $set: {
              drafts: { $concatArrays: [{ $ifNull: ["$drafts", []] }, [{ $literal: draftDoc }]] },
              manuscriptStatus: "ready",
              manuscript: { $ifNull: ["$manuscript", { $literal: draft.manuscript }] },
              activeDraftId: { $ifNull: ["$activeDraftId", draftDoc._id] },
              title: {
                $cond: [
                  { $gt: [{ $strLenCP: { $ifNull: ["$title", ""] } }, 0] },
                  "$title",
                  { $literal: draft.manuscript.title },
                ],
              },
            },
          },
        ]);
        console.log(
          `[Sermons] Manuscript ready for ${sermonId} via ${draft.provider}/${draft.model} in ${draft.stats.latencyMs}ms (retention ${draft.stats.retention})`
        );
      } catch (err: any) {
        console.error(`[Sermons] Manuscript generation failed for ${sermonId}:`, err);
        await SermonTranscript.updateOne(
          { _id: sermonId },
          { $set: { manuscriptStatus: "failed", manuscriptError: err?.message?.slice(0, 500) || "Generation failed" } }
        );
      }
    })();
  } catch (err: any) {
    console.error("[Sermons] generate error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Failed to start manuscript generation" });
  }
};

/** Save the pastor's edits to the working manuscript. */
export const saveManuscript = async (req: Request, res: Response) => {
  try {
    const sermon = await findOwned(req, res);
    if (!sermon) return;
    const manuscript = req.body?.manuscript as Manuscript | undefined;
    if (!manuscript || typeof manuscript.title !== "string" || !Array.isArray(manuscript.blocks)) {
      return res.status(400).json({ error: "A valid manuscript is required" });
    }
    sermon.manuscript = manuscript;
    sermon.markModified("manuscript");
    if (req.body?.approve === true) sermon.approvedAt = new Date();
    else if (req.body?.approve === false) sermon.approvedAt = undefined;
    await sermon.save();
    res.json({ ok: true, approvedAt: sermon.approvedAt ?? null });
  } catch (err: any) {
    console.error("[Sermons] save manuscript error:", err.message);
    res.status(500).json({ error: "Failed to save manuscript" });
  }
};

// ── Manuscript template ─────────────────────────────────────────────────────

/** The logo is stored inline as a downscaled data URL, so cap the whole doc. */
const MAX_TEMPLATE_BYTES = 1_000_000;
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

export const getManuscriptTemplate = async (req: Request, res: Response) => {
  try {
    const doc = await ManuscriptTemplate.findOne({ userId: userIdOf(req) }).lean();
    res.json({ ok: true, template: doc?.template ?? null });
  } catch (err: any) {
    console.error("[Sermons] get template error:", err.message);
    res.status(500).json({ error: "Failed to load manuscript style" });
  }
};

export const saveManuscriptTemplate = async (req: Request, res: Response) => {
  try {
    const template = req.body?.template;
    if (!template || typeof template !== "object" || Array.isArray(template)) {
      return res.status(400).json({ error: "A valid template is required" });
    }
    if (JSON.stringify(template).length > MAX_TEMPLATE_BYTES) {
      return res.status(413).json({ error: "Manuscript style is too large. Try a smaller logo." });
    }
    if (template.logo != null && template.logo !== "" && (typeof template.logo !== "string" || !LOGO_DATA_URL.test(template.logo))) {
      return res.status(400).json({ error: "Logo must be a PNG, JPEG, WebP, GIF or SVG image" });
    }
    await ManuscriptTemplate.updateOne({ userId: userIdOf(req) }, { $set: { template } }, { upsert: true });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[Sermons] save template error:", err.message);
    res.status(500).json({ error: "Failed to save manuscript style" });
  }
};

/** Replace the working copy with one of the generated drafts. */
export const useDraft = async (req: Request, res: Response) => {
  try {
    const sermon = await findOwned(req, res);
    if (!sermon) return;
    const draft = sermon.drafts.find((d) => String(d._id) === req.params.draftId);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    sermon.manuscript = draft.manuscript;
    sermon.activeDraftId = draft._id;
    sermon.approvedAt = undefined;
    sermon.markModified("manuscript");
    await sermon.save();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[Sermons] use draft error:", err.message);
    res.status(500).json({ error: "Failed to switch draft" });
  }
};
