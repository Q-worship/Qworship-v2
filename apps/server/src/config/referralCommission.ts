import { PLANS, SLOT_PRICE_USD, PlanId } from "@qworship/shared";

export const REFERRAL_COMMISSION_RATE = 0.30;

/**
 * What a referred church is worth per month, and the referrer's cut of it.
 *
 * This used to carry its own price list — free/basic/premium/enterprise at
 * 0/8.99/12.99/15.99 — none of which the product sells. Commission was being
 * paid against invented numbers. Prices now come from the shared catalog.
 *
 * Commission is counted per church, which is exactly right under per-slot
 * pricing: one church is one slot at SLOT_PRICE_USD, so a referred church is
 * worth its own slot and nothing is double-counted when a network adds
 * branches. A branch earns its referrer a commission of its own only if that
 * branch was itself referred.
 */

/**
 * Tier names still stored on Organization.subscriptionType.
 *
 * The three paid legacy names all resolve to one paid church. Mapping them to 0
 * would quietly stop paying referrers who earned on them, which is worse than
 * treating a historical paid church as the paid church it was.
 */
export type SubscriptionType = "free" | "basic" | "premium" | "enterprise" | PlanId;

export const PLAN_MONTHLY_PRICE: Record<SubscriptionType, number> = {
  free: PLANS.free.monthlyPrice,
  standard: SLOT_PRICE_USD,
  // Legacy tiers: every paid one was a single paid church.
  basic: SLOT_PRICE_USD,
  premium: SLOT_PRICE_USD,
  enterprise: SLOT_PRICE_USD,
};

/** The referrer's monthly cut for one referred church on this plan. */
export function computeMonthlyCommission(subscriptionType: SubscriptionType): number {
  const price = PLAN_MONTHLY_PRICE[subscriptionType] ?? 0;
  return Math.round(price * REFERRAL_COMMISSION_RATE * 100) / 100;
}
