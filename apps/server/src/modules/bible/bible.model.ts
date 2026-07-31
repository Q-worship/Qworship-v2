import mongoose, { Schema, Document } from 'mongoose';

export interface IBibleVerse extends Document {
  bookName: string; // "Genesis"
  testament: 'old' | 'new';
  chapter: number;
  verse: number;
  // Versions
  kjv?: string;
  nkjv?: string;
  amp?: string;
  msg?: string;
  esv?: string;
  niv?: string;
  gn?: string;
  nlt?: string;
  nrsv?: string;
  asv?: string;
  ylt?: string;
  web?: string;
  webster?: string;
}

const BibleVerseSchema = new Schema<IBibleVerse>({
  bookName: { type: String, required: true, index: true },
  testament: { type: String, enum: ['old', 'new'], required: true },
  chapter: { type: Number, required: true, index: true },
  verse: { type: Number, required: true },
  kjv: String,
  nkjv: String,
  amp: String,
  msg: String,
  esv: String,
  niv: String,
  gn: String,
  nlt: String,
  nrsv: String,
  asv: String,
  ylt: String,
  web: String,
  webster: String,
});

// Compound index for ultra-fast verse lookup: Book -> Chapter -> Verse
BibleVerseSchema.index({ bookName: 1, chapter: 1, verse: 1 }, { unique: true });

export const BibleVerse = mongoose.model<IBibleVerse>('BibleVerse', BibleVerseSchema);

const BibleTranslationSchema = new Schema({
  code: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  revision: { type: Number, default: 1 },
  source: String,
  license: String,
  lastImportedAt: Date,
}, { timestamps: true });

export const BibleTranslation = mongoose.model('BibleTranslation', BibleTranslationSchema);

const BibleImportJobSchema = new Schema({
  version: { type: String, required: true },
  mode: { type: String, enum: ['fill-missing', 'overwrite'], required: true },
  sourceName: String,
  provenance: String,
  license: String,
  received: Number,
  written: Number,
  status: { type: String, enum: ['running', 'completed', 'rolled-back', 'failed'], default: 'completed' },
}, { timestamps: true });

export const BibleImportJob = mongoose.model('BibleImportJob', BibleImportJobSchema);

const BibleImportChangeSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'BibleImportJob', required: true, index: true },
  bookName: { type: String, required: true },
  chapter: { type: Number, required: true },
  verse: { type: Number, required: true },
  previousText: { type: String, default: null },
  newText: { type: String, required: true },
});

export const BibleImportChange = mongoose.model('BibleImportChange', BibleImportChangeSchema);

export interface ISpeechSession extends Document {
  userId?: number;
  sessionId: string;
  currentBook?: string;
  currentChapter?: number;
  currentVerse?: number;
  currentVersion: string;
  lastCommand?: string;
  contextData?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SpeechSessionSchema = new Schema<ISpeechSession>({
  userId: Number,
  sessionId: { type: String, required: true, unique: true },
  currentBook: String,
  currentChapter: Number,
  currentVerse: Number,
  currentVersion: { type: String, default: 'kjv' },
  lastCommand: String,
  contextData: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const SpeechSession = mongoose.model<ISpeechSession>('SpeechSession', SpeechSessionSchema);

export interface IBibleSearchCache extends Document {
  queryHash: string;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  version: string;
  result: string;
  createdAt: Date;
}

const BibleSearchCacheSchema = new Schema<IBibleSearchCache>({
  queryHash: { type: String, required: true, unique: true },
  bookName: String,
  chapter: Number,
  verseStart: Number,
  verseEnd: Number,
  version: String,
  result: String,
}, { timestamps: true });

export const BibleSearchCache = mongoose.model<IBibleSearchCache>('BibleSearchCache', BibleSearchCacheSchema);
