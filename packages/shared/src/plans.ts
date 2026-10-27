/**
 * The subscription catalog — the one place plan names, prices and limits are
 * defined. Both apps import from here.
 *
 * Before this, prices lived in five places that disagreed: referralCommission.ts
 * (free/basic/premium/enterprise), subscription.routes.ts (29/49),
 * SubscriptionManagement.tsx (15/29/49) and the marketing pricing components.
 * Changing a price meant editing all of them and missing one.
 *
 * NOTE ON PERSISTENCE: an account stores the price and limits it bought at, so
 * editing this catalog changes terms for new and renewing subscriptions only.
 * Existing subscribers keep what they signed up to.
 */

export type PlanId = "free" | "standard";

/** Churches included per pack bought. */
export const SLOTS_PER_PACK = 10;

/** USD per pack, per month. */
export const PACK_PRICE_USD = 15.99;

/**
 * Pooled transcription hours per pack, per month, shared across the network.
 *
 * PROVISIONAL. Set from an estimate, not measurement: at roughly $0.46/hour for
 * Deepgram Nova-3 streaming, 20 hours costs about $9.24 against $15.99 of
 * revenue. Shadow metering exists to replace this guess with the real figure —
 * see /api/usage/report once services have run.
 */
export const HOURS_PER_PACK = 20;

/** USD per extra hour beyond the pooled allowance, about 4x cost. */
export const OVERAGE_PRICE_PER_HOUR_USD = 1.99;

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price of the first pack. Free plans are 0. */
  monthlyPrice: number;
  /** Churches included before any extra packs. */
  includedSlots: number;
  /** Pooled transcription hours included before any extra packs. */
  includedHours: number;
  /** Whether more slot packs can be bought on this plan. */
  canBuyPacks: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "One church, with enough hands-free Bible to see how it works.",
    monthlyPrice: 0,
    includedSlots: 1,
    includedHours: 2,
    canBuyPacks: false,
    features: [
      "One church",
      "Songs, presentations and service planning",
      "Bible search across six versions",
      "2 hours of hands-free Bible a month",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    description: "Ten churches to start, and more whenever you need them.",
    monthlyPrice: PACK_PRICE_USD,
    includedSlots: SLOTS_PER_PACK,
    includedHours: HOURS_PER_PACK,
    canBuyPacks: true,
    features: [
      `${SLOTS_PER_PACK} churches included`,
      `Add ${SLOTS_PER_PACK} more for $${PACK_PRICE_USD} a month`,
      "Branch churches under one account",
      `${HOURS_PER_PACK} pooled hands-free Bible hours a month`,
      "Usage visible per branch",
      "Priority support",
    ],
  },
};

export const PLAN_LIST: Plan[] = [PLANS.free, PLANS.standard];

/** What an account on this plan, with this many packs, is entitled to. */
export interface Entitlements {
  planId: PlanId;
  packs: number;
  slots: number;
  hours: number;
  monthlyPrice: number;
}

export function entitlementsFor(planId: PlanId, packs = 1): Entitlements {
  const plan = PLANS[planId] ?? PLANS.free;
  if (!plan.canBuyPacks) {
    return {
      planId: plan.id,
      packs: 0,
      slots: plan.includedSlots,
      hours: plan.includedHours,
      monthlyPrice: plan.monthlyPrice,
    };
  }
  const owned = Math.max(1, Math.floor(packs));
  return {
    planId: plan.id,
    packs: owned,
    slots: SLOTS_PER_PACK * owned,
    hours: HOURS_PER_PACK * owned,
    monthlyPrice: Number((PACK_PRICE_USD * owned).toFixed(2)),
  };
}

/** Packs needed to hold this many churches. */
export function packsForSlots(slots: number): number {
  return Math.max(1, Math.ceil(slots / SLOTS_PER_PACK));
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${Number(hours.toFixed(1))} hr`;
}
