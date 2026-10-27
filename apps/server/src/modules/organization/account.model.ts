import mongoose, { Schema, Document } from "mongoose";

/**
 * An Account owns the subscription; Organizations consume its slots.
 *
 * The plan deliberately does not live on a parent Organization. If it did,
 * every entitlement check would first have to ask "am I a branch?" and walk up
 * the hierarchy. With an Account, a check is one lookup by accountId, and a
 * free single-church user is just an Account with one slot — one code path
 * rather than two.
 *
 * Price and limits are stored here at purchase time rather than read from the
 * shared catalog, so editing the catalog changes terms for new and renewing
 * subscriptions only. Existing subscribers keep what they bought.
 */
export interface IAccount extends Document {
  ownerId: mongoose.Types.ObjectId;
  planId: "free" | "standard";
  /** Slot packs bought. Free accounts hold none. */
  packs: number;
  /** Churches allowed, stored as bought rather than derived from the catalog. */
  slots: number;
  /** Pooled transcription hours a month, stored as bought. */
  monthlyHours: number;
  /** Monthly price agreed at purchase, in USD. */
  monthlyPrice: number;
  status: "active" | "trialing" | "past_due" | "cancelled";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Extra slots or hours granted by an admin, outside the plan. */
  bonusSlots: number;
  bonusHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: String, enum: ["free", "standard"], default: "free" },
    packs: { type: Number, default: 0 },
    slots: { type: Number, default: 1 },
    monthlyHours: { type: Number, default: 2 },
    monthlyPrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "cancelled"],
      default: "active",
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    bonusSlots: { type: Number, default: 0 },
    bonusHours: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Account = mongoose.model<IAccount>("Account", AccountSchema);

/** Total churches this account may hold, plan plus any admin grant. */
export function accountSlots(account: IAccount): number {
  return (account.slots || 0) + (account.bonusSlots || 0);
}

/** Total pooled hours a month, plan plus any admin grant. */
export function accountHours(account: IAccount): number {
  return (account.monthlyHours || 0) + (account.bonusHours || 0);
}
