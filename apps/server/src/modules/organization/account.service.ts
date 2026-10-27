import mongoose from "mongoose";
import { entitlementsFor, PlanId } from "@qworship/shared";
import { Account, IAccount, accountSlots, accountHours } from "./account.model.js";
import { Organization } from "./organization.model.js";
import { BranchInvite } from "./branch-invite.model.js";
import { UsageCounter, usagePeriod } from "../usage/usage.model.js";

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
    packs: 0,
    slots: free.slots,
    monthlyHours: free.hours,
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
  allowance: number;
  usedHours: number;
  remainingHours: number;
  percentUsed: number;
}

/** Pooled transcription hours consumed this month across the whole network. */
export async function hourUsage(account: IAccount): Promise<HourUsage> {
  const period = usagePeriod();
  const churches = await Organization.find({ accountId: account._id }).select("_id").lean();
  const counters = await UsageCounter.find({
    organizationId: { $in: churches.map((c) => c._id) },
    period,
  }).lean();
  const usedSeconds = counters.reduce((sum, c) => sum + (c.billableSeconds || 0), 0);
  const usedHours = usedSeconds / 3600;
  const allowance = accountHours(account);
  return {
    period,
    allowance,
    usedHours: Number(usedHours.toFixed(2)),
    remainingHours: Number(Math.max(0, allowance - usedHours).toFixed(2)),
    percentUsed: allowance > 0 ? Math.min(100, Math.round((usedHours / allowance) * 100)) : 0,
  };
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
  packs: number,
): Promise<{ ok: true; account: IAccount } | { ok: false; reason: string; usage: SlotUsage }> {
  const next = entitlementsFor(planId, packs);
  const usage = await slotUsage(account);
  const nextTotal = next.slots + (account.bonusSlots || 0);
  if (nextTotal < usage.used) {
    return {
      ok: false,
      reason:
        `This plan holds ${nextTotal} churches, but ${usage.used} are in use ` +
        `(${usage.churches} churches, ${usage.pendingInvites} pending invitations). ` +
        `Release ${usage.used - nextTotal} before changing plan.`,
      usage,
    };
  }
  account.planId = next.planId;
  account.packs = next.packs;
  account.slots = next.slots;
  account.monthlyHours = next.hours;
  account.monthlyPrice = next.monthlyPrice;
  await account.save();
  return { ok: true, account };
}
