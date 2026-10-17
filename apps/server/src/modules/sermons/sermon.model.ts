import mongoose, { Document, Schema, Types } from "mongoose";

// ── Manuscript shape ─────────────────────────────────────────────────────────
// The manuscript is stored as structured data, not formatted text, so any
// church template can lay it out however it likes (Phase 2 template editor).

export type ManuscriptBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string; reference?: string };

export interface Manuscript {
  title: string;
  summary: string;
  mainScripture?: string;
  scriptureReferences: string[];
  blocks: ManuscriptBlock[];
  keyPoints: string[];
  discussionQuestions: string[];
}

export type ManuscriptProvider = "openai" | "groq";
export type ManuscriptStyle = "readable" | "verbatim";

export interface IManuscriptDraft {
  _id: Types.ObjectId;
  provider: ManuscriptProvider;
  model: string;
  style: ManuscriptStyle;
  manuscript: Manuscript;
  stats: {
    inputWords: number;
    outputWords: number;
    /** outputWords / inputWords — a low value means the AI summarised instead of editing. */
    retention: number;
    latencyMs: number;
    chunks: number;
  };
  createdAt: Date;
}

export interface ISermonTranscript extends Document {
  userId: Types.ObjectId;
  title?: string;
  preacher?: string;
  serviceDate: Date;
  source: "live" | "upload";
  status: "recording" | "ended";
  segments: { text: string; at: Date }[];
  references: {
    label: string;
    book: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
    at: Date;
  }[];
  wordCount: number;
  endedAt?: Date;
  manuscriptStatus: "none" | "generating" | "ready" | "failed";
  manuscriptError?: string;
  drafts: IManuscriptDraft[];
  /** The working copy the pastor reviews and edits (copied from a draft). */
  manuscript?: Manuscript;
  activeDraftId?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ManuscriptDraftSchema = new Schema<IManuscriptDraft>(
  {
    provider: { type: String, enum: ["openai", "groq"], required: true },
    model: { type: String, required: true },
    style: { type: String, enum: ["readable", "verbatim"], default: "readable" },
    manuscript: { type: Schema.Types.Mixed, required: true },
    stats: {
      inputWords: Number,
      outputWords: Number,
      retention: Number,
      latencyMs: Number,
      chunks: Number,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SermonTranscriptSchema = new Schema<ISermonTranscript>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: String,
    preacher: String,
    serviceDate: { type: Date, default: () => new Date() },
    source: { type: String, enum: ["live", "upload"], default: "live" },
    status: { type: String, enum: ["recording", "ended"], default: "recording" },
    segments: [{ _id: false, text: String, at: Date }],
    references: [
      {
        _id: false,
        label: String,
        book: String,
        chapter: Number,
        verseStart: Number,
        verseEnd: Number,
        at: Date,
      },
    ],
    wordCount: { type: Number, default: 0 },
    endedAt: Date,
    manuscriptStatus: {
      type: String,
      enum: ["none", "generating", "ready", "failed"],
      default: "none",
    },
    manuscriptError: String,
    drafts: [ManuscriptDraftSchema],
    manuscript: Schema.Types.Mixed,
    activeDraftId: Schema.Types.ObjectId,
    approvedAt: Date,
  },
  { timestamps: true }
);

SermonTranscriptSchema.index({ userId: 1, updatedAt: -1 });

export const SermonTranscript = mongoose.model<ISermonTranscript>(
  "SermonTranscript",
  SermonTranscriptSchema
);
