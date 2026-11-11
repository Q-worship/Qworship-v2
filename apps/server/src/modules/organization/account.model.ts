import mongoose, { Schema, Document } from "mongoose";
import { PLANS, TRIAL_HOURS } from "@qworship/shared";

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
  /**
   * When the free trial began, and when it runs out.
   *
   * On the ACCOUNT, not the User, and deliberately so. Trial state used to
   * live on `user.trialStatus` / `user.trialEndDate` while billing lived
   * here, and the two were never connected — which is exactly how a paying
   * church ended up refused with `402 TRIAL_EXPIRED`. Putting the trial
   * beside the plan it converts into means one lookup answers both, and the
   * legacy pair can finally be deleted rather than extended.
   *
   * Kept after expiry rather than cleared: "when did this church trial us"
   * is the first question asked about any account that did not convert, and
   * it is also what stops a second trial being handed out.
   */
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  /**
   * Transcription hours for the WHOLE trial run, not per month.
   *
   * Stored as granted, the same way price and slots are, so changing
   * TRIAL_HOURS in the catalog cannot retroactively shorten a trial somebody
   * is in the middle of.
   */
  trialHours?: number;
  /**
   * Which trial-ending notices have already gone out, by days-left marker.
   *
   * A list rather than a flag because there are three (7 days, 1 day, and the
   * day itself) and each must be sent exactly once. The scheduler claims a
   * marker with a conditional `$addToSet` before sending, so two app
   * instances sweeping the same account cannot both notify: whichever update
   * matches first owns it, and the other modifies nothing.
   *
   * Markers that were overtaken are recorded as sent too. An account that
   * first comes into view with two hours left gets the day-of notice, and 7
   * and 1 are marked so they cannot fire afterwards — a "7 days left" notice
   * arriving after the trial ended is worse than none.
   */
  trialNoticesSent?: number[];
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
    trialStartedAt: { type: Date },
    // Indexed because the scheduler sweeps for lapsed trials on it hourly.
    trialEndsAt: { type: Date, index: true },
    trialHours: { type: Number },
    trialNoticesSent: { type: [Number], default: undefined },
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
 * current catalog instead: a free church pinned to whatever figure happened to
 * be live on the day it signed up would never pick up a change, because there
 * is no renewal to carry one. That read as a bug, and it was one.
 *
 * A TRIAL is neither. It gets the hours it was granted, held on the account,
 * and for the length of the trial rather than per month.
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
  status?: string;
  trialEndsAt?: Date | string | null;
  trialHours?: number;
}): number {
  const bonus = account.bonusHours || 0;
  // A trial carries its own budget and is asked about FIRST, because a
  // trialing account sits on planId "free" and would otherwise silently be
  // given the free monthly allowance instead of the trial's run-long one.
  // The granted figure is preferred over the catalog so that changing
  // TRIAL_HOURS cannot shorten a trial somebody is already inside.
  if (isTrialing(account)) return (account.trialHours ?? TRIAL_HOURS) + bonus;
  if (account.planId === "free") return PLANS.free.includedHours + bonus;
  if (account.hoursPerChurch) return account.hoursPerChurch + bonus;
  const slots = Math.max(1, account.slots || 1);
  return (account.monthlyHours || 0) / slots + bonus;
}

/** @deprecated pooled naming; call `hoursPerChurchOf`. */
export const hoursAllowanceOf = hoursPerChurchOf;

/**
 * Whether this account is inside its free trial right now.
 *
 * Both halves are required. `status` alone goes stale the moment a trial
 * lapses between scheduler sweeps, and a date alone would keep granting the
 * product to an account that converted or was cancelled. Asking for both
 * means the hour between expiry and the sweep noticing is still correct.
 */
export function isTrialing(account: {
  status?: string;
  trialEndsAt?: Date | string | null;
}): boolean {
  if (account.status !== "trialing") return false;
  if (!account.trialEndsAt) return false;
  return new Date(account.trialEndsAt) > new Date();
}

/**
 * Whole days left in the trial, never negative.
 *
 * Rounded UP, because a trial with four hours left is honestly "1 day", not
 * "0 days" — and a banner reading "0 days left" beside a product that still
 * works is the kind of thing that generates support mail.
 */
export function trialDaysRemaining(account: {
  trialEndsAt?: Date | string | null;
}): number {
  if (!account.trialEndsAt) return 0;
  const ms = new Date(account.trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Whether this account has ever had a trial.
 *
 * One to an account, forever. The trial is the whole product for nothing, so
 * the only thing standing between it and a free subscription is refusing to
 * hand out a second one — which is also why `trialStartedAt` is kept rather
 * than cleared when the trial ends.
 */
export function hasEverTrialed(account: { trialStartedAt?: Date | null }): boolean {
  return Boolean(account.trialStartedAt);
}
