import mongoose, { Schema, Document } from 'mongoose';

export interface ISongSection {
  type: 'verse' | 'chorus' | 'bridge' | 'pre_chorus' | 'tag' | 'intro' | 'outro';
  title: string;
  content: string;
  order: number;
}

export interface ISong extends Document {
  title: string;
  artist?: string;
  album?: string;
  lyrics: string;
  structure?: string[];
  key?: string;
  tempo?: number;
  ccliNumber?: string;
  tags?: string[];
  sections: ISongSection[];
  /** Base formatting per section (font, size, bold, colour ...), keyed by the section label
   *  (labels are stored with "." and a leading "$" encoded, see songs.controller) */
  sectionStyles?: Record<string, Record<string, unknown>>;
  /** Inline formatting per section (HTML for selected words / lines), keyed like sectionStyles */
  sectionHtml?: Record<string, string>;
  alternativeTitles?: string[];
  authors?: string[];
  topics?: string[];
  copyright?: string;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SongSectionSchema = new Schema<ISongSection>({
  type: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, required: true },
}, { _id: false });

const SongSchema = new Schema<ISong>(
  {
    title: { type: String, required: true, index: true },
    artist: String,
    album: String,
    lyrics: { type: String, required: true },
    structure: [String],
    key: String,
    tempo: Number,
    ccliNumber: String,
    tags: [String],
    sections: [SongSectionSchema], // Embedded subdocument arrays
    sectionStyles: { type: Schema.Types.Mixed, default: {} },
    sectionHtml: { type: Schema.Types.Mixed, default: {} },
    alternativeTitles: [String],
    authors: [String],
    topics: [String],
    copyright: String,
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Song = mongoose.model<ISong>('Song', SongSchema);
