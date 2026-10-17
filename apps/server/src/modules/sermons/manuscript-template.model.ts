import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * A church's manuscript look and section settings (logo, fonts, colours,
 * which sections print and what they're called). One per account; every
 * sermon's preview, print and export uses it.
 *
 * The shape is owned by the client (apps/client/src/features/sermons/types.ts),
 * which merges it over its defaults, so new options never need a migration.
 */
export interface IManuscriptTemplate extends Document {
  userId: Types.ObjectId;
  template: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ManuscriptTemplateSchema = new Schema<IManuscriptTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    template: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

export const ManuscriptTemplate = mongoose.model<IManuscriptTemplate>("ManuscriptTemplate", ManuscriptTemplateSchema);
