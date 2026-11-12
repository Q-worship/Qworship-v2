import mongoose from "mongoose";
import { entitlementsFor, BYTES_PER_GB, PLANS, PlanId } from "@qworship/shared";
import { Account, IAccount, accountSlots, hoursPerChurchOf, isTrialing } from "./account.model.js";
import { Organization } from "./organization.model.js";
import { BranchInvite } from "./branch-invite.model.js";
import { TranscriptionSession, UsageCounter, usagePeriod } from "../usage/usage.model.js";
import { HourTopUp, liveTopUpFilter, purchasedHoursFor } from "./hour-topup.model.js";
import { storageByOrganization } from "../usage/storage.service.js";
import { User } from "../auth/auth.model.js";
import { trialGrantFor } from "../billing/trial.service.js";

/**
 * Slot accounting and plan state.
 *
 * A slot is consumed by a church that exists AND by an invitation still open,
 * so an owner cannot blanket-invite past their plan and sort it out later.
 */

/**
 * Which of an owner's accounts a new church should join.
 *
 * Pure, and exported so the rule can be tested: a paid account wins over an
 * unpaid one, and otherwise the first (oldest) wins. Of two candidates the
 * one carrying the Stripe subscription is the one a renewal will touch, and
 * attaching a church to the other would leave it quietly outside the thing
 * being paid for — visible to nobody until the bill arrives.
 *
 * Expects the list already ordered oldest-first.
 */
export function pickOwnersAccount<T extends { planId?: string; status?: string }>(
  accounts: T[],
): T | undefined {
  return (
    accounts.find((a) => a.planId === "standard" && a.status !== "cancelled") ??
    accounts[0]
  );
}

/** The account a church belongs to, creating a free one if it has none yet. */
export async function ensureAccountFor(
  organizationId: mongoose.Types.ObjectId | string,
  ownerId: mongoose.Types.ObjectId | string,
): Promise<IAccount> {
  const organization = await Organization.findById(organizationId);
  if (organization?.accountId) {
    const existing = await Account.findById(organization.accountId);
    if (existing) return existing;
  }

  /*
   * ONE ACCOUNT PER OWNER, not one per church.
   *
   * This used to look only at `organization.accountId`, so an owner who
   * created a SECOND church outside the branch-invite flow got a second
   * Account — and with it a second free plan, a second slot and a second
   * thirty-day trial. The whole slot model says the opposite: an Account
   * owns the subscription and Organizations consume its slots, so a second
   * church is meant to cost a slot, not arrive with a plan of its own.
   *
   * The invite path never had this problem because it attaches a branch to
   * `ctx.account._id` explicitly. This closes the other door.
   *
   * A paid account wins over an unpaid one, and the oldest wins among
   * equals: of two candidates the one carrying the Stripe subscription is
   * the one a renewal will touch, and attaching a church to the other would
   * leave it quietly outside the thing being paid for.
   */
  const ownersAccount = pickOwnersAccount(
    await Account.find({ ownerId }).sort({ createdAt: 1 }),
  );
  if (ownersAccount) {
    if (organization) {
      organization.accountId = ownersAccount._id as any;
      await organization.save();
    }
    return ownersAccount;
  }

  // A church from before accounts existed: give it a free one in passing, so
  // this is not a migration everybody has to wait for.
  //
  // The trial is decided here too, and reading the owner's legacy flags is
  // what makes that safe. A brand-new church gets the full thirty days; a
  // church whose owner is part-way through the old user-level trial inherits
  // whatever is left of it; one whose trial already lapsed starts on free.
  // Granting unconditionally would hand a fresh trial to every existing
  // account the first time it touched billing.
  const free = entitlementsFor("free");
  const owner = await User.findById(ownerId)
    .select("trialStatus trialStartDate trialEndDate subscriptionStatus")
    .lean();
  const trial = trialGrantFor(owner || {});
  const account = await Account.create({
    ownerId,
    planId: "free",
    purchasedSlots: 0,
    slots: free.slots,
    hoursPerChurch: free.hoursPerChurch,
    monthlyPrice: 0,
    ...trial,
  });
  if (organization) {
    organization.accountId = account._id as any;
    await organization.save();
  }
  return account;
}

export interface SlotUsage {
  total: number;
  churches: number;
  pendingInvites: number;
  used: number;
  available: number;
}

/** How many of an account's slots are spoken for. */
export async function slotUsage(account: IAccount): Promise<SlotUsage> {
  const [churches, pendingInvites] = await Promise.all([
    Organization.countDocuments({ accountId: account._id }),
    BranchInvite.countDocuments({ accountId: account._id, state: "pending" }),
  ]);
  const total = accountSlots(account);
  const used = churches + pendingInvites;
  return { total, churches, pendingInvites, used, available: Math.max(0, total - used) };
}

export interface HourUsage {
  period: string;
  /**
   * Seconds consumed, unrounded.
   *
   * Enforcement reads this rather than `usedHours`, which is rounded to two
   * decimals for display. At 4 hours those two disagree by up to 18 seconds,
   * and a church must not be cut off — or let through — by a rounding step
   * that exists to make a number look tidy on a screen.
   */
  usedSeconds: number;
  /** The church's own monthly allowance, before anything bought on top. */
  includedHours: number;
  /** Hours head office bought for this church, for this period only. */
  purchasedHours: number;
  /** What the church may actually spend: included plus purchased. */
  allowance: number;
  usedHours: number;
  remainingHours: number;
  percentUsed: number;
}

/**
 * The start of the trial's usage window, or null if this is not a trial.
 *
 * Returns null for an account that is trialing but has no start date — a row
 * that should not exist, and which falls back to ordinary monthly counting
 * rather than to counting from the beginning of time.
 */
function trialUsageWindow(account: IAccount): Date | null {
  if (!isTrialing(account)) return null;
  return account.trialStartedAt ? new Date(account.trialStartedAt) : null;
}

/**
 * Billable seconds one church has used since a given moment.
 *
 * Sums the per-session rows rather than the monthly counters, because the
 * counters have no finer resolution than a calendar month and a trial window
 * starts on an arbitrary day. Sessions carry `startedAt` and are indexed by
 * (organizationId, startedAt), so this is the same shape of lookup the
 * counters give, not a scan.
 *
 * A session that began before the window and ran into it counts as outside —
 * it is at most one session, it was already measured against the period it
 * started in, and counting it twice is worse than missing it.
 */
async function billableSecondsSince(
  organizationId: mongoose.Types.ObjectId | string,
  since: Date,
): Promise<number> {
  const [row] = await TranscriptionSession.aggregate([
    { $match: { organizationId: new mongoose.Types.ObjectId(String(organizationId)), startedAt: { $gte: since } } },
    { $group: { _id: null, seconds: { $sum: "$billableSeconds" } } },
  ]);
  return row?.seconds || 0;
}

/**
 * Transcription hours one church has spent this month, against its own.
 *
 * Scoped to a single organization on purpose. Hours do not pool: a branch
 * spends what it was bought and nothing else, so there is no network figure to
 * subtract from and no sibling whose quiet month can rescue it. Use
 * `networkHourUsage` for the head-office view, which is a list of these rather
 * than a sum of them.
 */
export async function hourUsage(
  account: IAccount,
  organizationId: mongoose.Types.ObjectId | string,
): Promise<HourUsage> {
  const period = usagePeriod();

  // A TRIAL IS NOT A MONTH. Its hours are a single budget for the whole
  // thirty-day run, so they must be counted from the day the trial started
  // and not from the first of the month. Counting a trial per calendar month
  // would hand a trial that straddles a month boundary a second full
  // allowance — double what it was granted, decided by nothing but the date
  // somebody happened to sign up on.
  const trialWindow = trialUsageWindow(account);
  const usedSeconds = trialWindow
    ? await billableSecondsSince(organizationId, trialWindow)
    : (await UsageCounter.findOne({ organizationId, period }).lean())?.billableSeconds || 0;
  const usedHours = usedSeconds / 3600;

  const includedHours = hoursPerChurchOf(account);
  // Top-ups stay scoped to the calendar month even inside a trial: an hour
  // bought is an hour bought, and it expires on the same rule for everybody.
  const purchasedHours = await purchasedHoursFor(organizationId, period);
  const allowance = includedHours + purchasedHours;

  return {
    period: trialWindow ? "trial" : period,
    usedSeconds,
    includedHours,
    purchasedHours,
    allowance,
    usedHours: Number(usedHours.toFixed(2)),
    remainingHours: Number(Math.max(0, allowance - usedHours).toFixed(2)),
    percentUsed: allowance > 0 ? Math.min(100, Math.round((usedHours / allowance) * 100)) : 0,
  };
}

/** One church's usage row, as head office sees it in the branch tables. */
export interface BranchHourUsage extends HourUsage {
  organizationId: string;
  name: string;
  /** Cloud storage this church is using, against its plan's allowance. */
  storageUsedGb: number;
  storageLimitGb: number;
  storagePercentUsed: number;
}

/**
 * Every church on the account with its own usage, for the head-office view.
 *
 * Returns rows, never a total. A network-wide "hours used" number is precisely
 * the thing that would read as a shared bucket, and no branch is ever blocked
 * or unblocked by what this list adds up to.
 */
export async function networkHourUsage(account: IAccount): Promise<BranchHourUsage[]> {
  const period = usagePeriod();
  const churches = await Organization.find({ accountId: account._id })
    .select("_id name")
    .lean();
  const ids = churches.map((c) => c._id);

  const [counters, topUps, storage] = await Promise.all([
    UsageCounter.find({ organizationId: { $in: ids }, period }).lean(),
    HourTopUp.find({ organizationId: { $in: ids }, ...liveTopUpFilter(period) })
      .select("organizationId hours")
      .lean(),
    storageByOrganization(ids),
  ]);

  const storageLimitGb = PLANS[account.planId as PlanId]?.includedStorageGb ?? PLANS.free.includedStorageGb;

  const usedByOrg = new Map(counters.map((c) => [String(c.organizationId), c.billableSeconds || 0]));
  const boughtByOrg = new Map<string, number>();
  for (const t of topUps) {
    const key = String(t.organizationId);
    boughtByOrg.set(key, (boughtByOrg.get(key) || 0) + (t.hours || 0));
  }

  const includedHours = hoursPerChurchOf(account);

  return churches.map((church) => {
    const key = String(church._id);
    const usedHours = (usedByOrg.get(key) || 0) / 3600;
    const purchasedHours = boughtByOrg.get(key) || 0;
    const allowance = includedHours + purchasedHours;
    return {
      organizationId: key,
      name: church.name,
      period,
      usedSeconds: usedByOrg.get(key) || 0,
      includedHours,
      purchasedHours,
      allowance,
      usedHours: Number(usedHours.toFixed(2)),
      remainingHours: Number(Math.max(0, allowance - usedHours).toFixed(2)),
      percentUsed: allowance > 0 ? Math.min(100, Math.round((usedHours / allowance) * 100)) : 0,
      storageUsedGb: Number(((storage.get(key) ?? 0) / BYTES_PER_GB).toFixed(2)),
      storageLimitGb,
      storagePercentUsed:
        storageLimitGb > 0
          ? Math.min(100, Math.round(((storage.get(key) ?? 0) / BYTES_PER_GB / storageLimitGb) * 100))
          : 0,
    };
  });
}

/**
 * Moves an account onto a plan, storing the price and limits as bought.
 *
 * Reducing slots below what is already in use is refused rather than reconciled:
 * the owner has to release branches first. Picking churches to cut on their
 * behalf, or letting the count and the plan disagree, are both worse.
 */
export async function setPlan(
  account: IAccount,
  planId: PlanId,
  slots: number,
): Promise<{ ok: true; account: IAccount } | { ok: false; reason: string; usage: SlotUsage }> {
  const next = entitlementsFor(planId, slots);
  const usage = await slotUsage(account);
  const nextTotal = next.slots + (account.bonusSlots || 0);
  if (nextTotal < usage.used) {
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    const inUse = [
      plural(usage.churches, "church", "churches"),
      usage.pendingInvites > 0
        ? plural(usage.pendingInvites, "pending invitation", "pending invitations")
        : null,
    ].filter(Boolean).join(" and ");
    return {
      ok: false,
      reason:
        `That would leave you ${plural(nextTotal, "church slot", "church slots")}, but you are using ` +
        `${plural(usage.used, "slot", "slots")} (${inUse}). ` +
        `Release ${usage.used - nextTotal} before changing plan.`,
      usage,
    };
  }
  account.planId = next.planId;
  account.purchasedSlots = planId === "free" ? 0 : next.slots;
  account.slots = next.slots;
  account.hoursPerChurch = next.hoursPerChurch;
  account.monthlyPrice = next.monthlyPrice;
  await account.save();
  return { ok: true, account };
}
