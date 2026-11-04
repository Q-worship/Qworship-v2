import mongoose, { Schema, Document } from "mongoose";

/**
 * Hours bought for one church, on top of its monthly allowance.
 *
 * A ledger rather than a running total on the Organization, for three reasons.
 * Receipts: the billing history has to show what was bought, when, by whom and
 * against which invoice, and a counter cannot answer that. Periods: hours are
 * bought FOR a month and expire with it, so a single field would need clearing
 * on a schedule nobody owns. Disputes: when a church says it paid for hours it
 * never got, the rows are the answer.
 *
 * Head office buys these. The branch consumes them, and cannot buy or spend
 * another branch's — a top-up names one organizationId and stays there.
 */
export interface IHourTopUp extends Document {
  /** The church the hours belong to. Never a network-wide grant. */
  organizationId: mongoose.Types.ObjectId;
  /** The account that paid, so billing history can list a network's purchases. */
  accountId: mongoose.Types.ObjectId;
  /** The user who bought them, for the audit trail. */
  purchasedBy: mongoose.Types.ObjectId;
  /** Calendar month the hours apply to, as YYYY-MM in UTC. They expire with it. */
  period: string;
  hours: number;
  /** What was charged, in USD, at the overage price agreed when bought. */
  amountUsd: number;
  status: "pending" | "paid" | "failed" | "refunded";
  stripePaymentIntentId?: string;
  invoiceRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HourTopUpSchema = new Schema<IHourTopUp>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    purchasedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    period: { type: String, required: true },
    hours: { type: Number, required: true, min: 0 },
    amountUsd: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },
    invoiceRef: { type: String },
  },
  { timestamps: true },
);

// The allowance lookup on every session start reads exactly this shape.
HourTopUpSchema.index({ organizationId: 1, period: 1, status: 1 });

export const HourTopUp = mongoose.model<IHourTopUp>("HourTopUp", HourTopUpSchema);

/**
 * Hours a church actually bought for a period.
 *
 * Only `paid` rows count. A pending intent is not hours, and treating it as
 * such would let a failed card buy transcription.
 */
export async function purchasedHoursFor(
  organizationId: mongoose.Types.ObjectId | string,
  period: string,
): Promise<number> {
  const rows = await HourTopUp.find({ organizationId, period, status: "paid" })
    .select("hours")
    .lean();
  return rows.reduce((sum, r) => sum + (r.hours || 0), 0);
}
