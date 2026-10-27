import mongoose, { Schema, Document } from "mongoose";

/**
 * Transcription usage, recorded in two shapes for two different jobs.
 *
 * TranscriptionSession is one document per streaming session, written while the
 * session runs. It answers "what does a church actually consume", which is the
 * number the subscription allowance has to be set from and which nobody can
 * currently answer.
 *
 * UsageCounter is a running total per church per calendar month. Enforcement
 * will read this — one indexed lookup rather than an aggregation over sessions.
 * Nothing enforces anything yet; this is shadow metering.
 *
 * Both count *billable* seconds: audio actually forwarded to Deepgram, derived
 * from the byte count rather than wall clock, so silence the gate suspended is
 * correctly not counted.
 */

export interface ITranscriptionSession extends Document {
  organizationId?: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  billableSeconds: number;
  /** Seconds of sub-threshold audio the silence gate kept out of the stream. */
  suspendedSeconds: number;
  endReason?: "client_closed" | "max_duration" | "error";
  createdAt: Date;
  updatedAt: Date;
}

const TranscriptionSessionSchema = new Schema<ITranscriptionSession>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    billableSeconds: { type: Number, default: 0 },
    suspendedSeconds: { type: Number, default: 0 },
    endReason: { type: String, enum: ["client_closed", "max_duration", "error"] },
  },
  { timestamps: true },
);

TranscriptionSessionSchema.index({ organizationId: 1, startedAt: -1 });

export const TranscriptionSession = mongoose.model<ITranscriptionSession>(
  "TranscriptionSession",
  TranscriptionSessionSchema,
);

export interface IUsageCounter extends Document {
  organizationId: mongoose.Types.ObjectId;
  /** Calendar month as YYYY-MM, in UTC. */
  period: string;
  billableSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageCounterSchema = new Schema<IUsageCounter>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    period: { type: String, required: true },
    billableSeconds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UsageCounterSchema.index({ organizationId: 1, period: 1 }, { unique: true });

export const UsageCounter = mongoose.model<IUsageCounter>("UsageCounter", UsageCounterSchema);

/** The UTC calendar month a date falls in, as YYYY-MM. */
export function usagePeriod(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
