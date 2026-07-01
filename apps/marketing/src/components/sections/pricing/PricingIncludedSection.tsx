import type { PricingIncludedFeature } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface PricingIncludedSectionProps {
  heading: string
  subtitle: string
  features: PricingIncludedFeature[]
}

export function PricingIncludedSection({ heading, subtitle, features }: PricingIncludedSectionProps) {
  return (
    <section className="pricing-included-section section-gap reveal">
      <SiteContainer>
        <h2 className="pricing-included-heading font-headline">{heading}</h2>
        <p className="pricing-included-subtitle">{subtitle}</p>
        <div className="pricing-included-grid">
          {features.map((feature) => (
            <article key={feature.title} className="pricing-included-card">
              <div className="pricing-included-card-header">
                <div className="pricing-included-icon-wrap">
                  <MaterialIcon name={feature.icon} className="pricing-included-icon" aria-hidden />
                </div>
                <h3 className="pricing-included-card-title">{feature.title}</h3>
              </div>
              <p className="pricing-included-card-description">{feature.description}</p>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
