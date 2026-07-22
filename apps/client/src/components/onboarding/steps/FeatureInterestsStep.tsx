import { OnboardingProgress } from '../OnboardingProgress'
import {
  onboardingFeatureOptions,
  type OnboardingFeatureId,
} from '@/lib/onboardingFeatures'

interface FeatureInterestsStepProps {
  selectedFeatures: OnboardingFeatureId[]
  onToggleFeature: (feature: OnboardingFeatureId) => void
  onNext: () => void
  onBack: () => void
}

export function FeatureInterestsStep({
  selectedFeatures,
  onToggleFeature,
  onNext,
  onBack,
}: FeatureInterestsStepProps) {
  const midpoint = Math.ceil(onboardingFeatureOptions.length / 2)
  const leftColumn = onboardingFeatureOptions.slice(0, midpoint)
  const rightColumn = onboardingFeatureOptions.slice(midpoint)

  return (
    <div className="onboarding-step onboarding-step--features">
      <OnboardingProgress step={3} />

      <div className="onboarding-step__content">
        <h1 className="onboarding-step__heading">
          Which Q-worship features are you interested in?
        </h1>

        <p className="onboarding-step__description">
          Help us understand what matters most to your church. Your selections
          won&apos;t limit what you can use — we&apos;ll tailor tips and onboarding to
          your interests.
        </p>

        <p className="onboarding-step__instruction">Please select all that apply</p>

        <div className="onboarding-features">
          <div className="onboarding-features__column">
            {leftColumn.map((feature) => (
              <label key={feature} className="onboarding-checkbox">
                <input
                  type="checkbox"
                  className="onboarding-checkbox__input"
                  checked={selectedFeatures.includes(feature)}
                  onChange={() => onToggleFeature(feature)}
                />
                <span className="onboarding-checkbox__box" aria-hidden="true" />
                <span className="onboarding-checkbox__label">{feature}</span>
              </label>
            ))}
          </div>

          <div className="onboarding-features__column">
            {rightColumn.map((feature) => (
              <label key={feature} className="onboarding-checkbox">
                <input
                  type="checkbox"
                  className="onboarding-checkbox__input"
                  checked={selectedFeatures.includes(feature)}
                  onChange={() => onToggleFeature(feature)}
                />
                <span className="onboarding-checkbox__box" aria-hidden="true" />
                <span className="onboarding-checkbox__label">{feature}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="onboarding-step__actions">
        <button type="button" className="onboarding-step__cta" onClick={onNext}>
          Continue to Plans
        </button>
        <button type="button" className="onboarding-step__link" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}
