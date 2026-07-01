import { Link } from 'wouter'
import type { BillingPeriod, PricingPlan } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface PricingPlanCardsSectionProps {
  plans: PricingPlan[]
  billing: BillingPeriod
}

export function PricingPlanCardsSection({ plans, billing }: PricingPlanCardsSectionProps) {
  return (
    <section className="pricing-plan-cards-section reveal">
      <SiteContainer>
        <div className="pricing-plan-cards-grid">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`pricing-plan-card${plan.highlighted ? ' pricing-plan-card--featured' : ''}`}
            >
              {plan.popularLabel && (
                <div className="pricing-plan-card-popular-banner">{plan.popularLabel}</div>
              )}

              <div className="pricing-plan-card-body">
                <div className="pricing-plan-card-header">
                  <span className="pricing-plan-card-name">{plan.name}</span>
                  {plan.badge && (
                    <span className="pricing-plan-card-badge">{plan.badge}</span>
                  )}
                </div>

                <div className="pricing-plan-card-price-row">
                  <span className="pricing-plan-card-price">
                    {billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="pricing-plan-card-period">/mo</span>
                </div>

                {plan.description && (
                  <p className="pricing-plan-card-description">{plan.description}</p>
                )}

                {plan.includesLabel && (
                  <p className="pricing-plan-card-includes">{plan.includesLabel}</p>
                )}

                <ul className="pricing-plan-card-features">
                  {plan.features?.map((feature) => (
                    <li key={feature} className="pricing-plan-card-feature">
                      <span className="pricing-plan-card-check">
                        <MaterialIcon name="check" filled className="text-[10px]" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pricing-plan-card-footer">
                  <Link
                    href="/login"
                    className={`pricing-plan-card-cta pricing-plan-card-cta--${plan.ctaVariant ?? 'outline'}`}
                  >
                    {plan.ctaLabel}
                  </Link>
                  <p className="pricing-plan-card-footnote">No credit card required</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
