import { pricingFeatures, pricingPlans } from '@/lib/theme'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface PricingSectionProps {
  showHeading?: boolean
}

export function PricingSection({ showHeading = true }: PricingSectionProps) {

  return (
    <div className="pricing-section-grid">
      <div className="pricing-section-copy">
        {showHeading && (
          <>
            <h2 className="pricing-section-title">
              A Plan for Everyone
            </h2>
            <p className="pricing-section-description">
              Whether you&apos;re a solo pastor running Sunday service or a full tech crew managing
              multiple campuses Q-worship has a plan that fits your church and your budget.
            </p>
          </>
        )}

        <div className="pricing-section-feature-list">
          {pricingFeatures.map((feature, index) => (
            <div key={`${feature}-${index}`} className="pricing-section-feature-item">
              <div className="pricing-section-feature-icon">
                <MaterialIcon name="check" filled className="text-[12px]" />
              </div>
              <span className="pricing-section-feature-text">{feature}</span>
            </div>
          ))}
        </div>

        {/* No billing toggle: there is no yearly plan, and the "25% Discount"
            it advertised was never a product. */}
      </div>

      <div className="pricing-section-cards">
        {pricingPlans.map((plan) => (
          <article
            key={plan.name}
            className={`pricing-section-card ${plan.highlighted ? 'is-highlighted' : ''}`}
          >
            <div className="pricing-section-card-copy">
              <span className="pricing-section-card-name">
                {plan.name}
              </span>
              <div className="pricing-section-card-price-row">
                <span className="pricing-section-card-price">
                  {plan.monthlyPrice}
                </span>
                <span
                  className={`pricing-section-card-badge ${
                    plan.badgeVariant === 'muted' ? 'is-muted' : ''
                  }`}
                >
                  {plan.badge}
                </span>
              </div>
            </div>
            <button type="button" className="pricing-section-subscribe-btn">
              Subscribe
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
