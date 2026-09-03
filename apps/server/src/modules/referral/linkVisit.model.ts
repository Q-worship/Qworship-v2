import mongoose, { Schema, Document } from 'mongoose';

export interface ILinkVisit extends Document {
  refereeId: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LinkVisitSchema = new Schema<ILinkVisit>(
  {
    refereeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LinkVisit = mongoose.model<ILinkVisit>('LinkVisit', LinkVisitSchema);
