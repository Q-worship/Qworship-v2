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
  /**
   * This account's one trial has run out and nothing has replaced it yet.
   *
   * The authoritative answer to a question the client used to ask a legacy
   * user flag: `user.trialStatus === "expired"`, which no system owned and
   * which only one button ever cleared. Three separate defects came out of
   * that — the flag was never written, then the route guard allowed the
   * wrong paths, then the mirror could not see church owners — and each one
   * stranded real churches on the trial-ended screen with no way out.
   *
   * True only in the window between a trial lapsing and the account
   * settling: the hourly sweep (`expireLapsedTrials`) moves it onto free,
   * and a settled free account is NOT in this state. That matters — a free
   * church is a paying-nothing customer in good standing, not a lapsed
   * trial, and gating on "has ever trialed" would lock every one of them
   * out forever.
   */
  trialExpired: boolean;
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
  // Not "no trial has expired" — "we cannot tell". The client redirect reads
  // this, and bouncing somebody we failed to place is the same refusal hours
  // and storage already decline to make.
  trialExpired: false,
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

  // Still marked trialing, with the date behind us: lapsed, and not yet
  // settled by the sweep or by the person choosing. Both halves again, for
  // the reason `isTrialing` needs both — status alone goes stale the moment
  // a trial lapses, and a past date on a settled or paid account means
  // nothing at all.
  const trialExpired =
    !paid &&
    account.status === "trialing" &&
    Boolean(account.trialEndsAt) &&
    new Date(account.trialEndsAt as any) <= new Date();

  return {
    planId,
    trialing,
    trialExpired,
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
      planId: "standard", trialing: false, trialExpired: false, trialDaysLeft: 0,
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
