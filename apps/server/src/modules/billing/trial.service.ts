import { TRIAL_DAYS, TRIAL_HOURS, entitlementsFor } from "@qworship/shared";
import { Account, type IAccount } from "../organization/account.model.js";
import { syncLegacyEntitlement } from "./entitlement.service.js";
import { notifyTrialEnding } from "./billing.notify.js";

/**
 * The free trial: the whole product, for thirty days, once per account.
 *
 * It replaces a trial that lived on the User as `trialStatus` /
 * `trialEndDate`, next to a `subscriptionStatus` that billing never updated.
 * Those two disagreeing is what refused a paying church with
 * `402 TRIAL_EXPIRED`. The trial now sits on the Account beside the plan it
 * is meant to convert into, so one lookup answers both questions.
 *
 * There is no extending it. The old `/auth/extend-trial` let anybody award
 * themselves another thirty days from a button, as many times as they liked,
 * which made the trial unbounded and the paywall decorative.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrialGrant {
  status: "trialing" | "active";
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  trialHours?: number;
}

/**
 * The trial a brand-new account should be created with.
 *
 * Legacy users are carried across rather than restarted. Somebody eleven
 * days into the old user-level trial keeps nineteen days here; somebody
 * whose old trial already lapsed starts on free and is not handed a second
 * one. The alternative — a fresh thirty days for everybody on the day we
 * deploy — would quietly re-trial the entire existing base, including people
 * who already decided not to pay.
 */
export function trialGrantFor(user: {
  trialStatus?: string;
  trialStartDate?: Date | null;
  trialEndDate?: Date | null;
  subscriptionStatus?: string;
}): TrialGrant {
  const now = new Date();

  // Already converted on the legacy flags: not a trial, and not eligible for
  // one. Their plan comes from the subscription, not from here.
  if (user?.trialStatus === "converted" || user?.subscriptionStatus === "active") {
    return { status: "active" };
  }

  // A legacy trial still running: honour exactly what is left of it.
  if (user?.trialEndDate && new Date(user.trialEndDate) > now) {
    return {
      status: "trialing",
      trialStartedAt: user.trialStartDate ? new Date(user.trialStartDate) : now,
      trialEndsAt: new Date(user.trialEndDate),
      trialHours: TRIAL_HOURS,
    };
  }

  // A legacy trial that has already lapsed: free, and no second trial.
  if (user?.trialStatus === "expired" || user?.trialStatus === "cancelled") {
    return { status: "active" };
  }

  // Genuinely new: the full run.
  return {
    status: "trialing",
    trialStartedAt: now,
    trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
    trialHours: TRIAL_HOURS,
  };
}

/**
 * Move every lapsed trial onto the free plan.
 *
 * Run by the scheduler, so it must be idempotent and safe to run twice —
 * two app instances will both call it. The query itself is the guard: it
 * matches only accounts still marked `trialing` with an end date in the
 * past, so a second pass finds nothing rather than doing the work again.
 *
 * Nothing here enforces anything in the moment. A trial that lapses is
 * already treated as lapsed by `isTrialing`, which checks the date as well
 * as the status; this sweep is what makes the stored row agree with reality
 * so that reporting, the billing screen and the legacy mirror stop
 * disagreeing with the product.
 */
export async function expireLapsedTrials(): Promise<number> {
  const lapsed = await Account.find({
    status: "trialing",
    trialEndsAt: { $lte: new Date() },
  });

  let moved = 0;
  for (const account of lapsed) {
    if (await settleToFree(account)) moved += 1;
  }
  return moved;
}

/**
 * Put one account onto the free plan, ending any trial on it.
 *
 * Shared by the hourly sweep and by the "continue with the free plan" button,
 * so the two cannot settle an account differently. Returns whether anything
 * actually changed, which is what makes both callers idempotent: pressing the
 * button twice, or sweeping the same row from two app instances, does the
 * work once and reports nothing the second time.
 *
 * A trial that converted to Standard is left alone. The webhook has already
 * written the real plan, and overwriting it here would cancel a subscription
 * somebody just paid for.
 */
export async function settleToFree(account: IAccount): Promise<boolean> {
  if (account.planId === "standard") return false;
  if (account.status === "active" && account.planId === "free") return false;

  const free = entitlementsFor("free");
  account.status = "active";
  account.planId = "free";
  account.hoursPerChurch = free.hoursPerChurch;
  account.monthlyPrice = 0;
  // `trialStartedAt` and `trialEndsAt` are deliberately NOT cleared: they are
  // the record that this account has had its one trial.
  await account.save();
  await syncLegacyEntitlement(account);
  return true;
}

/**
 * When a trial-ending notice goes out, and what it says it is.
 *
 * Measured in HOURS because "one day left" and "it ends today" are only a few
 * hours apart and `trialDaysRemaining` rounds up — it cannot tell them apart.
 * Ordered least urgent first; the sweep below picks the LAST one whose
 * threshold is met, so an account always gets the most urgent notice it has
 * earned rather than a stale one.
 */
const TRIAL_NOTICES = [
  { daysLeft: 7, withinHours: 7 * 24 },
  { daysLeft: 1, withinHours: 24 },
  { daysLeft: 0, withinHours: 3 },
] as const;

/**
 * The most urgent notice an account with this many hours left has earned.
 *
 * Pure, and exported so the thresholds can be tested without a database —
 * off-by-one here means a church is told its trial ends "tomorrow" on the
 * wrong day, which is worse than not telling them.
 */
export function trialNoticeDue(hoursLeft: number): number | null {
  if (hoursLeft <= 0) return null;
  const due = [...TRIAL_NOTICES].reverse().find((n) => hoursLeft <= n.withinHours);
  return due ? due.daysLeft : null;
}

/** Markers settled when `daysLeft` is sent: itself, plus any it overtook. */
export function noticesSettledBy(daysLeft: number): number[] {
  return TRIAL_NOTICES.filter((n) => n.daysLeft >= daysLeft).map((n) => n.daysLeft);
}

/**
 * Tells owners their trial is running out, once per milestone.
 *
 * The trial expires exactly thirty times twenty-four hours after sign-up, to
 * the minute, which can land in the middle of a Sunday service. Nothing is
 * deleted when it does — the free plan carries on — but a church discovering
 * it mid-sermon is the worst possible moment to ask for money. These exist so
 * that nobody is surprised: a church that knows buys on Friday.
 *
 * IDEMPOTENT BY CLAIM, not by checking first. The marker is added with a
 * conditional update that only matches an account which has not got it, so of
 * two app instances sweeping the same row exactly one update modifies
 * anything and exactly one notice is sent. Checking-then-sending would let
 * both pass the check before either wrote.
 */
export async function sendTrialEndingNotices(): Promise<number> {
  const now = Date.now();
  const horizon = new Date(now + TRIAL_NOTICES[0].withinHours * 60 * 60 * 1000);

  const ending = await Account.find({
    status: "trialing",
    trialEndsAt: { $gt: new Date(now), $lte: horizon },
  });

  let sent = 0;
  for (const account of ending) {
    const hoursLeft = (new Date(account.trialEndsAt!).getTime() - now) / (60 * 60 * 1000);

    // The most urgent milestone this account has reached.
    const due = trialNoticeDue(hoursLeft);
    if (due === null) continue;

    // Everything at or above this urgency is settled in one write: the one
    // being sent, and any gentler ones it overtook. A "7 days left" notice
    // arriving after a "1 day left" one would be worse than silence.
    const claim = await Account.updateOne(
      { _id: account._id, trialNoticesSent: { $ne: due } },
      { $addToSet: { trialNoticesSent: { $each: noticesSettledBy(due) } } },
    );
    if (claim.modifiedCount !== 1) continue;

    await notifyTrialEnding(account, due);
    sent += 1;
  }
  return sent;
}

/**
 * Whether this account may still be sold a trial.
 *
 * One per account, forever, which is why `trialStartedAt` is never cleared.
 */
export function isTrialEligible(account: Pick<IAccount, "trialStartedAt">): boolean {
  return !account.trialStartedAt;
}
