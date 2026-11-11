import mongoose, { Schema, Document } from "mongoose";
import { TOP_UP_VALID_DAYS } from "@qworship/shared";

/**
 * Hours bought for one church, on top of its monthly allowance.
 *
 * A ledger rather than a running total on the Organization, for three reasons.
 * Receipts: the billing history has to show what was bought, when, by whom and
 * against which invoice, and a counter cannot answer that. Expiry: each
 * purchase runs out on its own date, so a single field would need clearing on
 * a schedule nobody owns. Disputes: when a church says it paid for hours it
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
  /**
   * Calendar month the hours were bought in, as YYYY-MM in UTC.
   *
   * KEPT FOR REPORTING ONLY. It used to decide expiry too, and no longer
   * does: see `expiresAt`. Billing history still groups purchases by the
   * month they were made in, which is the question a receipt answers.
   */
  period: string;
  /**
   * When these hours run out — TOP_UP_VALID_DAYS from the moment they were paid.
   *
   * Replaces expiry-with-the-calendar-month, which gave a church buying on
   * the 28th three days to use what it had paid for while the plan card
   * promised thirty. Stamped when the payment succeeds rather than when
   * checkout opens, so an abandoned session resumed later does not start
   * already spent.
   *
   * Optional only because rows written before this existed have none; the
   * lookup below falls back to the old month rule for those.
   */
  expiresAt?: Date;
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
    expiresAt: { type: Date },
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
HourTopUpSchema.index({ organizationId: 1, status: 1, expiresAt: 1 });
// Still indexed by period for the billing history and the legacy fallback.
HourTopUpSchema.index({ organizationId: 1, period: 1, status: 1 });

export const HourTopUp = mongoose.model<IHourTopUp>("HourTopUp", HourTopUpSchema);

/** When a purchase paid for now should run out. */
export function topUpExpiryFrom(paidAt: Date = new Date()): Date {
  return new Date(paidAt.getTime() + TOP_UP_VALID_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Matches top-up rows that are paid for and have not yet run out.
 *
 * One definition, shared by the allowance lookup and the per-branch tables,
 * so the hours a church is told it has and the hours it is allowed to spend
 * can never be computed differently.
 *
 * The `$or` carries rows written before `expiresAt` existed: those still
 * expire with the calendar month they were bought in, which is the rule they
 * were sold under. Nobody loses hours they paid for, and no migration is
 * needed — the legacy arm stops matching anything once those months pass.
 */
export function liveTopUpFilter(period: string, now: Date = new Date()) {
  return {
    status: "paid" as const,
    $or: [
      { expiresAt: { $gt: now } },
      { expiresAt: { $exists: false }, period },
    ],
  };
}

/**
 * Hours a church has bought and not yet lost to expiry.
 *
 * Only `paid` rows count. A pending intent is not hours, and treating it as
 * such would let a failed card buy transcription.
 */
export async function purchasedHoursFor(
  organizationId: mongoose.Types.ObjectId | string,
  period: string,
): Promise<number> {
  const rows = await HourTopUp.find({ organizationId, ...liveTopUpFilter(period) })
    .select("hours")
    .lean();
  return rows.reduce((sum, r) => sum + (r.hours || 0), 0);
}
