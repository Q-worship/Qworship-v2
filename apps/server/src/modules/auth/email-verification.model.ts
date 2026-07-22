import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailVerification extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  lastSentAt: Date;
  consumedAt?: Date;
  purpose: 'verify_email' | 'reset_password';
}

const EmailVerificationSchema = new Schema<IEmailVerification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  lastSentAt: { type: Date, required: true },
  consumedAt: { type: Date },
  purpose: { type: String, enum: ['verify_email', 'reset_password'], default: 'verify_email', required: true },
}, { timestamps: true });

export const EmailVerification = mongoose.model<IEmailVerification>('EmailVerification', EmailVerificationSchema);
