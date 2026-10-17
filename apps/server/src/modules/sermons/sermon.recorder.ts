import { Types } from "mongoose";
import { SermonTranscript, ISermonTranscript } from "./sermon.model.js";
import { scanReferences } from "./references.js";

/**
 * Persists the hands-free Bible live transcript so it can be turned into a
 * sermon manuscript afterwards.
 *
 * - Final transcript lines are buffered and flushed every few seconds, so a
 *   sermon costs a handful of writes per minute rather than one per utterance.
 * - The HFB socket can drop and reconnect mid-sermon. A recording updated in
 *   the last RESUME_WINDOW_MS (with no manuscript yet) is resumed instead of
 *   starting a new one.
 * - Sessions that never reach MIN_WORDS (a quick HFB test) are deleted on end.
 * - Scripture references are found by scanning the whole transcript on end
 *   (see references.ts for why not per segment).
 */

const FLUSH_INTERVAL_MS = 5_000;
const RESUME_WINDOW_MS = 15 * 60_000;
const MIN_WORDS = 50;

type Segment = ISermonTranscript["segments"][number];

export const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

export class SermonRecorder {
  private sermonId: Types.ObjectId | null = null;
  private sessionPromise: Promise<Types.ObjectId> | null = null;
  private pendingSegments: Segment[] = [];
  private pendingWords = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> = Promise.resolve();
  private ended = false;

  constructor(private readonly userId: string) {}

  /** Append one complete utterance (one live-console transcript line). */
  addUtterance(text: string) {
    const trimmed = text?.trim();
    if (this.ended || !trimmed) return;

    this.pendingSegments.push({ text: trimmed, at: new Date() });
    this.pendingWords += countWords(trimmed);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, FLUSH_INTERVAL_MS);
    }
  }

  async end() {
    if (this.ended) return;
    this.ended = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    if (!this.sermonId) return;

    try {
      const sermon = await SermonTranscript.findById(this.sermonId).select("wordCount manuscriptStatus segments");
      if (!sermon) return;
      if (sermon.wordCount < MIN_WORDS && sermon.manuscriptStatus === "none") {
        await sermon.deleteOne();
        console.log(`[SermonRecorder] Discarded short session ${this.sermonId} (${sermon.wordCount} words)`);
        return;
      }
      await SermonTranscript.updateOne(
        { _id: this.sermonId },
        { $set: { status: "ended", endedAt: new Date(), references: scanReferences(sermon.segments) } }
      );
    } catch (err) {
      console.error("[SermonRecorder] Failed to end session:", err);
    }
  }

  private flush(): Promise<void> {
    // Serialise flushes so segments are always appended in order.
    this.flushing = this.flushing.then(() => this.doFlush());
    return this.flushing;
  }

  private async doFlush() {
    if (this.pendingSegments.length === 0) return;
    const segments = this.pendingSegments;
    const words = this.pendingWords;
    this.pendingSegments = [];
    this.pendingWords = 0;

    try {
      const sermonId = await this.ensureSession();
      await SermonTranscript.updateOne(
        { _id: sermonId },
        {
          $push: { segments: { $each: segments } },
          $inc: { wordCount: words },
          $set: { status: "recording" },
        }
      );
    } catch (err) {
      // Put the lines back so the next flush retries them.
      this.pendingSegments = [...segments, ...this.pendingSegments];
      this.pendingWords += words;
      console.error("[SermonRecorder] Flush failed:", err);
    }
  }

  private ensureSession(): Promise<Types.ObjectId> {
    if (this.sermonId) return Promise.resolve(this.sermonId);
    if (!this.sessionPromise) {
      this.sessionPromise = (async () => {
        const recent = await SermonTranscript.findOne({
          userId: this.userId,
          source: "live",
          manuscriptStatus: "none",
          updatedAt: { $gte: new Date(Date.now() - RESUME_WINDOW_MS) },
        })
          .sort({ updatedAt: -1 })
          .select("_id");

        const id = recent
          ? (recent._id as Types.ObjectId)
          : ((await SermonTranscript.create({ userId: this.userId, source: "live" }))._id as Types.ObjectId);
        console.log(`[SermonRecorder] ${recent ? "Resumed" : "Started"} session ${id}`);
        this.sermonId = id;
        return id;
      })().catch((err) => {
        this.sessionPromise = null;
        throw err;
      });
    }
    return this.sessionPromise;
  }
}
