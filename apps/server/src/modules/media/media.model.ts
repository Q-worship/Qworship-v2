import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true }, // 'image' | 'video'
  fileType: { type: String }, // 'video/mp4', 'image/jpeg', etc.
  fileName: { type: String },
  filePath: { type: String }, // local path on server
  thumbnail: { type: String, default: null },
  uploadedBy: { type: String, default: 'System' },
  // The church this asset belongs to, so storage can be reported and limited
  // per church the way hours are. Absent on rows uploaded before this existed;
  // `storageUsage` falls back to the uploader's membership for those.
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  tags: [{ type: String }],
  collection: { type: String, default: 'General' },
  season: { type: String, default: null },
  usageCount: { type: Number, default: 0 },
  fileSize: { type: Number },
  description: { type: String },
  category: { type: String },
  categories: [{ type: String }],
  categoryId: { type: String }, // Maps to MediaCategory
  collectionIds: [{ type: String }], // Maps to MediaCollection
  isCloud: { type: Boolean, default: false }, // Flag for cloud/admin distributed assets
  fileUrl: { type: String }, // Direct link to R2 Cloud CDN
  thumbnailUrl: { type: String },
  cloudKey: { type: String }, // The object key to interact directly mapping to Cloudflare R2
  isPublished: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  lastUsed: { type: Date },
  // Pictures that belong to something else (the slides of an imported PowerPoint). They are
  // stored and served like any asset, so the slides keep working, but they are not part of the
  // user's own library and are left out of "My Assets".
  hiddenFromLibrary: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/** The tag the PowerPoint import puts on its pictures (rows from before the flag existed have it). */
export const IMPORTED_PRESENTATION_TAG = 'Imported Presentation';

/**
 * What belongs in a user's own library: not the pictures of an imported presentation, whether
 * they carry the flag or only the tag.
 */
export const visibleInLibraryFilter = {
  hiddenFromLibrary: { $ne: true },
  tags: { $ne: IMPORTED_PRESENTATION_TAG },
};

// Virtual ID to match frontend id
mediaSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const Media = mongoose.model('Media', mediaSchema);

// ---- Admin Media Categories mapping ----
const mediaCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  slug: { type: String, required: true, unique: true },
  parentId: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

mediaCategorySchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const MediaCategory = mongoose.model('MediaCategory', mediaCategorySchema);

// ---- Admin Media Collections mapping ----
const mediaCollectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  slug: { type: String, required: true, unique: true },
  coverImagePath: { type: String },
  isPublished: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

mediaCollectionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const MediaCollection = mongoose.model('MediaCollection', mediaCollectionSchema);
