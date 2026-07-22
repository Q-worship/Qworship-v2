import { useState } from 'react'
import {
  formatPlanPrice,
  getMonthlyComparePrice,
  onboardingPlans,
  shouldShowYearlyCompare,
  type BillingPeriod,
  type PlanId,
} from '@/lib/onboardingPlans'

interface PlanSelectionOverlayProps {
  onProceedToCheckout: () => void
  onStartFreeTrial: () => void
}

export function PlanSelectionOverlay({
  onProceedToCheckout,
  onStartFreeTrial,
}: PlanSelectionOverlayProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro')
  const [billing, setBilling] = useState<BillingPeriod>('yearly')

  return (
    <div className="plan-selection">
      <header className="plan-selection__header">
        <h1 className="plan-selection__title">
          Select a plan for
          <br />
          <span className="plan-selection__title-accent">
            Q-worship Cloud Presentation Platform
          </span>
        </h1>
        <p className="plan-selection__subtitle">
          Try Q-worship Cloud Presentation Pro for 30-days free on us — no credit
          card required, no watermarks, no limits.
        </p>
        <p className="plan-selection__instruction">
          Choose the plan that&apos;s right for your church.
        </p>
      </header>

      <div className="plan-selection__billing">
        <div className="plan-selection__toggle" role="group" aria-label="Billing period">
          <button
            type="button"
            className={`plan-selection__toggle-btn${
              billing === 'monthly' ? ' plan-selection__toggle-btn--active' : ''
            }`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`plan-selection__toggle-btn${
              billing === 'yearly' ? ' plan-selection__toggle-btn--active' : ''
            }`}
            onClick={() => setBilling('yearly')}
          >
            Yearly
          </button>
        </div>
        {billing === 'yearly' ? (
          <span className="plan-selection__discount">25% Discount</span>
        ) : null}
      </div>

      <div className="plan-selection__grid">
        {onboardingPlans.map((plan) => {
          const isSelected = selectedPlan === plan.id
          const isPopular = plan.popular

          return (
            <article
              key={plan.id}
              className={`plan-selection__card${
                isSelected ? ' plan-selection__card--selected' : ''
              }${isPopular ? ' plan-selection__card--popular' : ''}`}
            >
              {plan.popularLabel ? (
                <span className="plan-selection__badge">{plan.popularLabel}</span>
              ) : null}

              <h2 className="plan-selection__card-name">{plan.name}</h2>
              {shouldShowYearlyCompare(plan, billing) ? (
                <p className="plan-selection__card-price-compare">
                  {getMonthlyComparePrice(plan)}
                </p>
              ) : null}
              <p className="plan-selection__card-price">{formatPlanPrice(plan, billing)}</p>
              {plan.description ? (
                <p className="plan-selection__card-desc">{plan.description}</p>
              ) : null}

              <ul className="plan-selection__features">
                {plan.features.map((feature) => (
                  <li key={feature} className="plan-selection__feature">
                    <span className="plan-selection__check" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`plan-selection__card-btn${
                  isSelected && isPopular
                    ? ' plan-selection__card-btn--primary'
                    : ' plan-selection__card-btn--ghost'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.ctaLabel}
              </button>
            </article>
          )
        })}
      </div>

      <footer className="plan-selection__footer">
        <button
          type="button"
          className="plan-selection__footer-btn plan-selection__footer-btn--outline"
          onClick={onProceedToCheckout}
        >
          Proceed to checkout
        </button>
        <button
          type="button"
          className="plan-selection__footer-btn plan-selection__footer-btn--primary"
          onClick={onStartFreeTrial}
        >
          Start free Trial
        </button>
      </footer>
    </div>
  )
}
