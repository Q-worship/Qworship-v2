import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  refereeId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  source: string;
  destination: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    refereeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    source: { type: String, required: true },
    destination: { type: String, required: true },
  },
  { timestamps: true }
);

CampaignSchema.index({ refereeId: 1, slug: 1 }, { unique: true });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
