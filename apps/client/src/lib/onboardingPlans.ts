import { getPricingProduct } from './theme'
import type { PricingPlan } from '@/types/content'

/**
 * The plans offered during signup.
 *
 * These come from the cloud product's cards, which now come from the shared
 * catalog — so signup, the pricing page and the in-app billing screen cannot
 * disagree. Before this, signup offered Free/Essentials/Pro/Enterprise with a
 * yearly "25% Discount", none of which the product sells, and defaulted the
 * selection to a plan that did not exist.
 */

export type PlanId = 'free' | 'standard'

export interface PlanDefinition {
  id: PlanId
  name: string
  monthlyPrice: string
  description: string
  includesLabel?: string
  features: string[]
  popular?: boolean
  popularLabel?: string
  ctaLabel: string
}

const PLAN_ID_BY_NAME: Record<string, PlanId> = {
  Free: 'free',
  Standard: 'standard',
}

function displayPlanName(name: string): string {
  if (name === 'Free') return 'Free'
  return name.toUpperCase()
}

function mapCloudPlan(plan: PricingPlan): PlanDefinition {
  const id = PLAN_ID_BY_NAME[plan.name] ?? 'free'

  return {
    id,
    name: displayPlanName(plan.name),
    monthlyPrice: plan.monthlyPrice,
    description: plan.description ?? '',
    includesLabel: plan.includesLabel,
    features: plan.features ?? [],
    popular: plan.highlighted,
    popularLabel: plan.popularLabel,
    ctaLabel: plan.ctaLabel ?? 'Select Plan',
  }
}

export const onboardingPlans: PlanDefinition[] = getPricingProduct('cloud').plans.map(
  mapCloudPlan,
)

export function parsePlanAmount(price: string): number {
  const parsed = Number.parseFloat(price.replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

/** Monthly is the only billing period, so there is nothing to choose between. */
export function formatPlanPrice(plan: PlanDefinition): string {
  return `${plan.monthlyPrice}/mo`
}
