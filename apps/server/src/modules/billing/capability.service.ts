import type { Request } from "express";
import { type FeatureId, type FeatureMap, featureMapFor, hasFeature } from "@qworship/shared";
import { Account, isTrialing, trialDaysRemaining } from "../organization/account.model.js";

/**
 * What the caller's account may actually do.
 *
 * The companion to `requireProductAccess`, which answers only "are you in".
 * Free accounts are now IN — that is the whole point of the free plan — so
 * "in" stopped being a useful answer on its own and this answers "in, to
 * what".
 *
 * Every verdict comes from the shared FEATURES catalog. Nothing in this file
 * decides what a plan includes; it only works out which plan is in force and
 * asks. A second opinion about plan contents living on the server is exactly
 * the drift the catalog exists to prevent.
 */

export interface Capabilities {
  planId: "free" | "standard";
  /** Inside a trial right now: Standard's capabilities, free of charge. */
  trialing: boolean;
  /** Whole days left in the trial, 0 when not trialing. */
  trialDaysLeft: number;
  features: FeatureMap;
  /**
   * Whether we actually worked out which church this request belongs to.
   *
   * The difference between "this church is on free" and "we could not tell
   * which church this is" decides whether a gate may refuse. A resolved free
   * account is a confident no. An unresolvable one is OUR problem, and gates
   * let it through — the same trade hours and storage already make, where an
   * attribution gap is a reporting problem rather than a reason to refuse
   * somebody mid-service.
   */
  resolved: boolean;
}

/** What a request whose church cannot be worked out gets. */
const UNRESOLVED: Capabilities = {
  planId: "free",
  trialing: false,
  trialDaysLeft: 0,
  features: featureMapFor("free"),
  resolved: false,
};

/**
 * An account's capabilities, with no request to resolve.
 *
 * Split out so callers that already hold the account — the billing routes,
 * which must create one anyway so a brand-new church's trial actually starts
 * — do not pay for a second lookup, and so that both paths can never reach
 * different answers about the same account.
 */
export function capabilitiesForAccount(account: {
  planId?: string;
  status?: string;
  trialEndsAt?: Date | string | null;
}): Capabilities {
  // A cancelled subscription keeps no capabilities. Note this is looser than
  // it looks for `past_due`, which is deliberately still treated as paid: a
  // card that failed on a Saturday must not strip a church's features on
  // Sunday, the same trade access makes.
  const trialing = isTrialing(account);
  const paid = account.planId === "standard" && account.status !== "cancelled";
  const planId = paid ? "standard" : "free";

  return {
    planId,
    trialing,
    trialDaysLeft: trialing ? trialDaysRemaining(account) : 0,
    features: featureMapFor(planId, trialing),
    resolved: true,
  };
}

/**
 * Resolve the caller's capabilities.
 *
 * An unresolvable request comes back as the free set flagged
 * `resolved: false`, so the two can be told apart. The DISPLAY layer may
 * treat them the same — showing a locked button to somebody we cannot place
 * costs nothing — but enforcement must not, and `requireFeature` checks the
 * flag before it refuses anybody.
 */
export async function capabilitiesFor(req: Request): Promise<Capabilities> {
  const user = (req as any).user;
  if (!user) return UNRESOLVED;

  // Staff see the whole product; they are not a revenue case.
  if (user.role === "admin" || user.role === "superadmin") {
    return {
      planId: "standard", trialing: false, trialDaysLeft: 0,
      features: featureMapFor("standard"), resolved: true,
    };
  }

  try {
    const { resolveActiveOrganization } = await import("../organization/organization.service.js");
    const resolved = await resolveActiveOrganization(req as any);
    const accountId = (resolved?.organization as any)?.accountId;
    if (!accountId) return UNRESOLVED;

    const account = await Account.findById(accountId)
      .select("planId status trialEndsAt")
      .lean();
    if (!account) return UNRESOLVED;

    return capabilitiesForAccount(account);
  } catch (error) {
    console.error("[Capabilities] Could not resolve account:", error);
    return UNRESOLVED;
  }
}

/** Whether the caller may use one feature. */
export async function callerHasFeature(req: Request, featureId: FeatureId): Promise<boolean> {
  const capabilities = await capabilitiesFor(req);
  return hasFeature(capabilities.planId, featureId, capabilities.trialing);
}
