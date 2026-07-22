interface OnboardingProgressProps {
  step: 1 | 2 | 3
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  return (
    <div className="onboarding-progress">
      <div className="onboarding-progress__bars">
        {[1, 2, 3].map((segment) => (
          <div key={segment} className="onboarding-progress__segment">
            {segment === step ? (
              <span className="onboarding-progress__label">Step {step} of 3</span>
            ) : null}
            <div
              className={`onboarding-progress__bar${
                segment <= step ? ' onboarding-progress__bar--active' : ''
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
