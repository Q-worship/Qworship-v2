import mongoose from "mongoose";
import { entitlementsFor, BYTES_PER_GB, PLANS, PlanId } from "@qworship/shared";
import { Account, IAccount, accountSlots, hoursPerChurchOf } from "./account.model.js";
import { Organization } from "./organization.model.js";
import { BranchInvite } from "./branch-invite.model.js";
import { UsageCounter, usagePeriod } from "../usage/usage.model.js";
import { HourTopUp, purchasedHoursFor } from "./hour-topup.model.js";
import { storageByOrganization } from "../usage/storage.service.js";

/**
 * Slot accounting and plan state.
 *
 * A slot is consumed by a church that exists AND by an invitation still open,
 * so an owner cannot blanket-invite past their plan and sort it out later.
 */

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
  // A church from before accounts existed: give it a free one in passing, so
  // this is not a migration everybody has to wait for.
  const free = entitlementsFor("free");
  const account = await Account.create({
    ownerId,
    planId: "free",
    purchasedSlots: 0,
    slots: free.slots,
    hoursPerChurch: free.hoursPerChurch,
    monthlyPrice: 0,
    status: "active",
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
  const counter = await UsageCounter.findOne({ organizationId, period }).lean();
  const usedHours = (counter?.billableSeconds || 0) / 3600;

  const includedHours = hoursPerChurchOf(account);
  const purchasedHours = await purchasedHoursFor(organizationId, period);
  const allowance = includedHours + purchasedHours;

  return {
    period,
    usedSeconds: counter?.billableSeconds || 0,
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
    HourTopUp.find({ organizationId: { $in: ids }, period, status: "paid" })
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
