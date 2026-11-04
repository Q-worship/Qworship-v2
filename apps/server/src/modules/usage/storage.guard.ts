import mongoose from "mongoose";
import { BYTES_PER_GB, PLANS, type PlanId } from "@qworship/shared";
import { Account } from "../organization/account.model.js";
import { Organization } from "../organization/organization.model.js";
import { storageBytesFor } from "./storage.service.js";

/**
 * Whether a church may store more media, and how close it is to its limit.
 *
 * The counterpart to `allowance.service.ts`, and deliberately the same shape:
 * the policy lives here so it can be read and tested without an HTTP request,
 * and the controller owns only the transport.
 *
 * THE GOVERNING RULE, as with hours: refuse at the START, never halfway.
 * Storage has an easier job than transcription — an upload that has not begun
 * can be turned away without interrupting anything, and there is no running
 * service to protect — so there is no grace window here. What it does share is
 * the warning: a church is told it is nearly full while it can still act,
 * rather than discovering the limit at the moment something is refused.
 */

/** Fraction of the allowance at which the church is told it is nearly full. */
const WARN_AT = Number(process.env.STORAGE_WARN_AT ?? 0.8);

export interface StorageAllowance {
  organizationId: string;
  churchName: string;
  accountId: string;
  limitGb: number;
  limitBytes: number;
  usedBytes: number;
  remainingBytes: number;
}

/**
 * What one church has left, or null when it cannot be determined.
 *
 * Null means "do not enforce", exactly as it does for hours. An upload whose
 * church cannot be resolved is an attribution gap — a reporting problem — and
 * refusing somebody's media over one would be the worse failure. The same
 * trade `uploadingOrganizationId` already makes for accounting.
 */
export async function storageAllowanceFor(
  organizationId: mongoose.Types.ObjectId | string | null | undefined,
): Promise<StorageAllowance | null> {
  if (!organizationId) return null;

  const church = await Organization.findById(organizationId)
    .select("_id name accountId")
    .lean();
  if (!church?.accountId) return null;

  const account = await Account.findById(church.accountId).select("planId").lean();
  if (!account) return null;

  // The same figure the Plans tile shows, read from the same place, so the bar
  // a church looks at and the limit that refuses it cannot disagree.
  const limitGb =
    PLANS[account.planId as PlanId]?.includedStorageGb ?? PLANS.free.includedStorageGb;
  const limitBytes = limitGb * BYTES_PER_GB;
  const usedBytes = await storageBytesFor(church._id as any);

  return {
    organizationId: String(church._id),
    churchName: church.name,
    accountId: String(church.accountId),
    limitGb,
    limitBytes,
    usedBytes,
    remainingBytes: Math.max(0, limitBytes - usedBytes),
  };
}

/** What the guard decided about an upload it was shown. */
export type StorageVerdict =
  /** Room to spare. */
  | { state: "ok" }
  /** It fits, but the church is now nearly full. Worth telling them once. */
  | { state: "warn"; usedGb: number; limitGb: number; remainingGb: number }
  /** It does not fit. Nothing has been stored. */
  | {
      state: "deny";
      usedGb: number;
      limitGb: number;
      remainingGb: number;
      incomingGb: number;
    };

const gb = (bytes: number): number => Number((bytes / BYTES_PER_GB).toFixed(2));

/**
 * Judges a whole upload against what a church has left.
 *
 * The BATCH is judged together, not file by file. A five-file upload that
 * straddles the limit would otherwise half-land, leaving the church over its
 * allowance and the request a failure — the worst of both.
 *
 * `incomingBytes` must be the bytes that will actually be STORED, after any
 * compression. Judging the originals would turn away an upload that fits.
 */
export function verdictFor(
  allowance: StorageAllowance,
  incomingBytes: number,
): StorageVerdict {
  const after = allowance.usedBytes + incomingBytes;

  if (after > allowance.limitBytes) {
    return {
      state: "deny",
      usedGb: gb(allowance.usedBytes),
      limitGb: allowance.limitGb,
      remainingGb: gb(allowance.remainingBytes),
      incomingGb: gb(incomingBytes),
    };
  }

  // Only on CROSSING the threshold, so a church sitting at 90% is not warned
  // on every upload. The equivalent of the hours guard announcing once.
  const wasBelow = allowance.usedBytes < allowance.limitBytes * WARN_AT;
  const nowAtOrAbove = after >= allowance.limitBytes * WARN_AT;
  if (wasBelow && nowAtOrAbove) {
    return {
      state: "warn",
      usedGb: gb(after),
      limitGb: allowance.limitGb,
      remainingGb: gb(allowance.limitBytes - after),
    };
  }

  return { state: "ok" };
}

/** The refusal a church sees. Names the church, so a network knows which one. */
export function denialMessage(
  allowance: StorageAllowance,
  verdict: Extract<StorageVerdict, { state: "deny" }>,
): string {
  return (
    `${allowance.churchName} has used ${verdict.usedGb} GB of its ${verdict.limitGb} GB of cloud storage, ` +
    `and this upload needs ${verdict.incomingGb} GB. ` +
    `Delete some media or upgrade the plan to store more.`
  );
}
