import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawalRequest extends Document {
  refereeId: mongoose.Types.ObjectId;
  amount: number;
  destination: string;
  status: 'pending' | 'processing' | 'paid' | 'rejected';
  adminNote?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    refereeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    destination: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'rejected'], default: 'pending' },
    adminNote: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

export const WithdrawalRequest = mongoose.model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema);
