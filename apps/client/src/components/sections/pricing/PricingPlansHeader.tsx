import type { PricingPlansHeaderCopy } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'

interface PricingPlansHeaderProps {
  plansHeader: PricingPlansHeaderCopy
}

export function PricingPlansHeader({ plansHeader }: PricingPlansHeaderProps) {
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
            {/* No monthly/yearly toggle: there is no yearly plan to sell.
                Advertising a yearly discount we do not offer is worse than
                offering no choice at all. */}
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
