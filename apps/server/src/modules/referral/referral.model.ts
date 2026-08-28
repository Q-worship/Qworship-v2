import mongoose, { Schema, Document } from 'mongoose';

export interface IReferralRequest extends Document {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state?: string;
  phoneNumber: string;
  product: 'qworship' | 'go-green';
  about?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  refereeUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralRequestSchema = new Schema<IReferralRequest>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    country: { type: String, required: true },
    state: { type: String },
    phoneNumber: { type: String, required: true },
    product: { type: String, enum: ['qworship', 'go-green'], required: true },
    about: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    refereeUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const ReferralRequest = mongoose.model<IReferralRequest>('ReferralRequest', ReferralRequestSchema);
