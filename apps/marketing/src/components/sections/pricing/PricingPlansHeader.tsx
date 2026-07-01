import type { BillingPeriod, PricingPlansHeaderCopy } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'

interface PricingPlansHeaderProps {
  plansHeader: PricingPlansHeaderCopy
  billing: BillingPeriod
  onBillingChange: (period: BillingPeriod) => void
}

export function PricingPlansHeader({ plansHeader, billing, onBillingChange }: PricingPlansHeaderProps) {
  return (
    <section id="plans" className="pricing-plans-header reveal scroll-mt-28">
      <SiteContainer>
        <div className="pricing-plans-header-inner">
          <div className="pricing-plans-header-copy">
            <span className="pricing-plans-badge">{plansHeader.badge}</span>
            <h2 className="pricing-plans-heading font-headline">
              {plansHeader.heading.before}{' '}
              <span className="pricing-plans-heading-accent">{plansHeader.heading.accent}</span>
            </h2>
            <p className="pricing-plans-subtitle">{plansHeader.subtitle}</p>
          </div>
          <div className="pricing-plans-header-actions">
            <p className="pricing-plans-tagline">{plansHeader.tagline}</p>
            <div className="pricing-plans-billing-toggle">
              <button
                type="button"
                onClick={() => onBillingChange('monthly')}
                className={`pricing-plans-billing-option${billing === 'monthly' ? ' is-active' : ''}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => onBillingChange('yearly')}
                className={`pricing-plans-billing-option${billing === 'yearly' ? ' is-active' : ''}`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
