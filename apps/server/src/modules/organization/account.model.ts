import mongoose, { Schema, Document } from "mongoose";
import { PLANS } from "@qworship/shared";

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
  /**
   * Church slots bought, one church each. Free accounts hold none.
   *
   * Replaces the old `packs` count, which bundled ten churches into one
   * purchase. Legacy rows still carry `packs`; their capacity is read from
   * `slots` below, which was always the authoritative number, so no migration
   * is needed and nobody loses churches they paid for.
   */
  purchasedSlots: number;
  /** Slot packs bought, ten churches each. @deprecated read `purchasedSlots`. */
  packs?: number;
  /** Churches allowed, stored as bought rather than derived from the catalog. */
  slots: number;
  /**
   * Transcription hours EACH church under this account gets a month, stored as
   * bought.
   *
   * Replaces `monthlyHours`, which was one pooled figure for the whole network.
   * Hours no longer pool: a branch spends its own and cannot touch a sibling's,
   * so the stored number is a per-church rate, not a total. Legacy rows carry
   * the old pooled `monthlyHours`; `hoursPerChurchOf` below reads them safely.
   */
  hoursPerChurch: number;
  /** Pooled hours a month, as bought. @deprecated read `hoursPerChurch`. */
  monthlyHours?: number;
  /** Monthly price agreed at purchase, in USD. */
  monthlyPrice: number;
  /**
   * How this subscription is billed.
   *
   * Stored because the saving and the renewal date both depend on it, and
   * because a yearly subscriber who is shown a monthly price will reasonably
   * think they have been overcharged by twelve.
   */
  billingInterval: "month" | "year";
  status: "active" | "trialing" | "past_due" | "cancelled";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Extra slots granted by an admin, outside the plan. */
  bonusSlots: number;
  /** Extra hours an admin granted EVERY church on the account, outside the plan. */
  bonusHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: String, enum: ["free", "standard"], default: "free" },
    purchasedSlots: { type: Number, default: 0 },
    // Kept so legacy rows keep loading; never written again.
    packs: { type: Number },
    slots: { type: Number, default: 1 },
    hoursPerChurch: { type: Number, default: PLANS.free.includedHours },
    // Kept so legacy rows keep loading; never written again.
    monthlyHours: { type: Number },
    monthlyPrice: { type: Number, default: 0 },
    billingInterval: { type: String, enum: ["month", "year"], default: "month" },
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

/**
 * Hours EACH church under this account gets a month, plan plus any admin grant.
 *
 * Not a network total. Every church holds this allowance to itself and spends
 * only its own; nothing here is divided between branches, so multiplying this
 * by the slot count gives a number that means nothing to anybody.
 *
 * A paid account gets the rate it bought, because changing a subscriber's terms
 * under them is not ours to do. A FREE account bought nothing, so it tracks the
 * current catalog instead: a free church that signed up when the allowance was
 * 2 hours would otherwise sit at 2 forever, since there is no renewal to pick
 * up the new figure. That read as a bug, and it was one.
 */
export function accountHours(account: IAccount): number {
  return hoursPerChurchOf(account);
}

/**
 * The same rule for a plain object, so lean() queries (the admin account list)
 * cannot drift from what the owner is shown on their own billing page.
 *
 * LEGACY ROWS: before hours were split per church, `monthlyHours` held one
 * pooled figure for the whole network — HOURS_PER_SLOT times the slots bought.
 * Dividing it back out recovers the per-church rate those subscribers paid for,
 * so they keep exactly what they bought and simply stop having to contend for
 * it with their own branches.
 */
export function hoursPerChurchOf(account: {
  planId?: string;
  hoursPerChurch?: number;
  monthlyHours?: number;
  slots?: number;
  bonusHours?: number;
}): number {
  const bonus = account.bonusHours || 0;
  if (account.planId === "free") return PLANS.free.includedHours + bonus;
  if (account.hoursPerChurch) return account.hoursPerChurch + bonus;
  const slots = Math.max(1, account.slots || 1);
  return (account.monthlyHours || 0) / slots + bonus;
}

/** @deprecated pooled naming; call `hoursPerChurchOf`. */
export const hoursAllowanceOf = hoursPerChurchOf;
