import { OnboardingProgress } from '../OnboardingProgress'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="onboarding-step onboarding-step--welcome">
      <OnboardingProgress step={1} />

      <div className="onboarding-step__content">
        <h1 className="onboarding-step__heading onboarding-step__heading--welcome">
          Welcome to
          <br />
          <span className="onboarding-step__heading-accent">
            Q-worship Cloud Presentation Platform
          </span>
        </h1>

        <p className="onboarding-step__description">
          Before you dive in, help us personalize your experience. We&apos;ll ask 2
          quick and easy questions.
        </p>
      </div>

      <button type="button" className="onboarding-step__cta" onClick={onNext}>
        Let&apos;s Go!
      </button>
    </div>
  )
}
