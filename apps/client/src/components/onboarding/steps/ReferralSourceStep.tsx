import { OnboardingProgress } from '../OnboardingProgress'

const SOURCE_OPTIONS = [
  'Google Search',
  'Bing Search',
  'Facebook',
  'Instagram',
  'X (Previously Twitter)',
  'At an event or conference',
  'Other',
] as const

interface ReferralSourceStepProps {
  referralCode: string
  onReferralCodeChange: (value: string) => void
  hearAboutUsSource: string[]
  onToggleSource: (source: string) => void
  onNext: () => void
  onBack: () => void
  error?: string
  isSaving?: boolean
}

export function ReferralSourceStep({
  referralCode,
  onReferralCodeChange,
  hearAboutUsSource,
  onToggleSource,
  onNext,
  onBack,
  error,
  isSaving,
}: ReferralSourceStepProps) {
  const hasReferralCode = referralCode.trim().length > 0

  return (
    <div className="onboarding-step onboarding-step--features">
      <OnboardingProgress step={4} />

      <div className="onboarding-step__content">
        <h1 className="onboarding-step__heading">How did you hear about us?</h1>

        <p className="onboarding-step__description">
          Were you referred to Q-worship by one of our partners? If so please provide their
          referral code below. Please select from the list of sources if you heard about us
          from somewhere else.
        </p>

        <div className="onboarding-step__form">
          <div className="onboarding-field">
            <label className="onboarding-field__label" htmlFor="referral-code">
              Were you referred to Q-worship by one of our partners? Please enter their referral
              code below
            </label>
            <input
              id="referral-code"
              type="text"
              className="onboarding-field__input onboarding-field__input--filled"
              placeholder="Partner Referral Code"
              value={referralCode}
              onChange={(event) => onReferralCodeChange(event.target.value)}
            />
            {error ? <p className="onboarding-field__error">{error}</p> : null}
          </div>
        </div>

        <p className="onboarding-step__instruction">How did you get to know about Q-worship?</p>

        <div className="onboarding-features">
          <div className="onboarding-features__column">
            {SOURCE_OPTIONS.map((source) => (
              <label
                key={source}
                className={`onboarding-checkbox${hasReferralCode ? ' onboarding-checkbox--disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  className="onboarding-checkbox__input"
                  checked={hearAboutUsSource.includes(source)}
                  disabled={hasReferralCode}
                  onChange={() => onToggleSource(source)}
                />
                <span className="onboarding-checkbox__box" aria-hidden="true" />
                <span className="onboarding-checkbox__label">{source}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="onboarding-step__actions">
        <button
          type="button"
          className="onboarding-step__cta"
          disabled={isSaving}
          onClick={onNext}
        >
          {isSaving ? 'Saving…' : 'Continue to Plans'}
        </button>
        <button type="button" className="onboarding-step__link" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}
