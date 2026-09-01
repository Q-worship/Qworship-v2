import mongoose, { Schema, Document } from 'mongoose';

export interface ICommissionLedgerEntry extends Document {
  refereeId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  period: string;
  grossAmount: number;
  commissionAmount: number;
  status: 'available' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const CommissionLedgerEntrySchema = new Schema<ICommissionLedgerEntry>(
  {
    refereeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    period: { type: String, required: true },
    grossAmount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    status: { type: String, enum: ['available', 'paid'], default: 'available' },
  },
  { timestamps: true }
);

CommissionLedgerEntrySchema.index({ refereeId: 1, organizationId: 1, period: 1 }, { unique: true });

export const CommissionLedgerEntry = mongoose.model<ICommissionLedgerEntry>(
  'CommissionLedgerEntry',
  CommissionLedgerEntrySchema
);
