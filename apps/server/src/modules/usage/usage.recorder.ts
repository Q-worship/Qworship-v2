import mongoose from "mongoose";
import { TranscriptionSession, UsageCounter, usagePeriod } from "./usage.model.js";

/**
 * Records what one streaming session consumes, while it runs.
 *
 * Writing at the end would be simpler and wrong: these sessions last hours, and
 * a crash, a dropped socket or a deploy would lose the whole record. Usage is
 * flushed every FLUSH_INTERVAL_MS instead, so the most that can be lost is that
 * interval.
 *
 * Billable seconds are derived from bytes forwarded rather than elapsed time:
 * at 16kHz mono 16-bit PCM that is an exact conversion, and it automatically
 * excludes the silence the gate kept out of the stream, which is the whole
 * point of the gate.
 */

/** 16000 samples/sec x 2 bytes. Must match the encoding sent to Deepgram. */
export const BYTES_PER_SECOND = 32000;
const FLUSH_INTERVAL_MS = 30000;

export class UsageRecorder {
  private sessionId: mongoose.Types.ObjectId | null = null;
  private readonly userId: string;
  private readonly organizationId: mongoose.Types.ObjectId | null;
  private readonly startedAt = new Date();
  private forwardedBytes = 0;
  private suspendedMs = 0;
  /** Bytes already written, so each flush persists only the delta. */
  private flushedBytes = 0;
  private flushedSuspendedMs = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private writing: Promise<void> = Promise.resolve();

  constructor(userId: string, organizationId: mongoose.Types.ObjectId | null) {
    this.userId = userId;
    this.organizationId = organizationId;
  }

  /** Opens the session document and starts the flush timer. */
  async start(): Promise<void> {
    try {
      const session = await TranscriptionSession.create({
        organizationId: this.organizationId,
        userId: this.userId,
        startedAt: this.startedAt,
        billableSeconds: 0,
        suspendedSeconds: 0,
      });
      this.sessionId = session._id as mongoose.Types.ObjectId;
      this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    } catch (error) {
      // Metering must never take a service off the air. A failure here means no
      // usage data for this session, which is a reporting gap, not an outage.
      console.error("[Usage] Could not open the usage session:", error);
    }
  }

  /** Audio actually forwarded upstream. */
  recordForwarded(byteLength: number): void {
    this.forwardedBytes += byteLength;
  }

  /** Audio the silence gate kept back, for visibility into what the gate saves. */
  recordSuspended(ms: number): void {
    this.suspendedMs += ms;
  }

  private async flush(): Promise<void> {
    if (!this.sessionId) return;
    const bytesDelta = this.forwardedBytes - this.flushedBytes;
    const suspendedDelta = this.suspendedMs - this.flushedSuspendedMs;
    if (bytesDelta <= 0 && suspendedDelta <= 0) return;

    this.flushedBytes = this.forwardedBytes;
    this.flushedSuspendedMs = this.suspendedMs;
    const secondsDelta = bytesDelta / BYTES_PER_SECOND;

    // Serialise writes so two flushes cannot interleave their increments.
    this.writing = this.writing.then(async () => {
      try {
        await TranscriptionSession.updateOne(
          { _id: this.sessionId },
          {
            $inc: {
              billableSeconds: secondsDelta,
              suspendedSeconds: suspendedDelta / 1000,
            },
          },
        );
        if (this.organizationId && secondsDelta > 0) {
          await UsageCounter.updateOne(
            { organizationId: this.organizationId, period: usagePeriod() },
            { $inc: { billableSeconds: secondsDelta } },
            { upsert: true },
          );
        }
      } catch (error) {
        console.error("[Usage] Flush failed:", error);
      }
    });
    await this.writing;
  }

  /** Flushes the remainder and closes the session document. */
  async end(reason: "client_closed" | "max_duration" | "error"): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
    if (!this.sessionId) return;
    try {
      await TranscriptionSession.updateOne(
        { _id: this.sessionId },
        { $set: { endedAt: new Date(), endReason: reason } },
      );
      const minutes = (this.forwardedBytes / BYTES_PER_SECOND / 60).toFixed(1);
      const savedMinutes = (this.suspendedMs / 1000 / 60).toFixed(1);
      console.log(
        `[Usage] Session ended (${reason}): ${minutes} billable minutes, ${savedMinutes} minutes withheld by the silence gate`,
      );
    } catch (error) {
      console.error("[Usage] Could not close the usage session:", error);
    }
  }
}
