export const REFERRAL_COMMISSION_RATE = 0.30;

export type SubscriptionType = 'free' | 'basic' | 'premium' | 'enterprise';

export const PLAN_MONTHLY_PRICE: Record<SubscriptionType, number> = {
  free: 0,
  basic: 8.99,
  premium: 12.99,
  enterprise: 15.99,
};

export function computeMonthlyCommission(subscriptionType: SubscriptionType): number {
  const price = PLAN_MONTHLY_PRICE[subscriptionType] ?? 0;
  return Math.round(price * REFERRAL_COMMISSION_RATE * 100) / 100;
}
