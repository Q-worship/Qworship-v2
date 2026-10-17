// Mirrors apps/server/src/modules/sermons/sermon.model.ts

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
export type ManuscriptStatus = "none" | "generating" | "ready" | "failed";

export interface ManuscriptDraft {
  _id: string;
  provider: ManuscriptProvider;
  model: string;
  style: ManuscriptStyle;
  manuscript: Manuscript;
  stats: {
    inputWords: number;
    outputWords: number;
    retention: number;
    latencyMs: number;
    chunks: number;
  };
  createdAt: string;
}

export interface SermonSummary {
  id: string;
  title?: string;
  manuscriptTitle?: string;
  preacher?: string;
  serviceDate: string;
  source: "live" | "upload";
  status: "recording" | "ended";
  wordCount: number;
  manuscriptStatus: ManuscriptStatus;
  approvedAt?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface SermonDetail extends SermonSummary {
  transcript: string;
  /** One entry per live-console line (utterance); an upload is a single entry. */
  segments: { text: string; at: string }[];
  references: { label: string; at: string }[];
  manuscriptError?: string;
  drafts: ManuscriptDraft[];
  manuscript?: Manuscript;
  activeDraftId?: string;
}

// ── Manuscript template (church-wide look + sections) ───────────────────────
// Stored opaquely by the server; always read through withTemplateDefaults().

export type TemplateFont = "georgia" | "garamond" | "merriweather" | "lora" | "playfair" | "inter" | "system";
export type ManuscriptSection = "byline" | "mainScripture" | "summary" | "keyPoints" | "discussionQuestions" | "scriptureReferences";
export type LabelledSection = "summary" | "keyPoints" | "discussionQuestions" | "scriptureReferences";

export interface ManuscriptTemplate {
  churchName: string;
  /** Downscaled image as a data URL, so exports stay self-contained. */
  logo?: string;
  logoSize: "small" | "medium" | "large";
  headerAlign: "center" | "left";
  headingFont: TemplateFont;
  bodyFont: TemplateFont;
  textSize: "small" | "medium" | "large";
  accentColor: string;
  footerText: string;
  show: Record<ManuscriptSection, boolean>;
  /** Section headings; an empty summary label means no heading above it. */
  labels: Record<LabelledSection, string>;
}
