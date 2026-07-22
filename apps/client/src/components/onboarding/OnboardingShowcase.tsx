import type { OnboardingSlide } from '@/lib/onboardingSlides'

interface OnboardingShowcaseProps {
  slide: OnboardingSlide
}

export function OnboardingShowcase({ slide }: OnboardingShowcaseProps) {
  return (
    <aside className="onboarding-showcase" aria-label="Feature highlight">
      <div className="onboarding-showcase__visual">
        <div className="onboarding-showcase__frame">
          <img
            src={slide.image}
            alt={slide.alt}
            className="onboarding-showcase__image"
          />
        </div>
      </div>

      <div className="onboarding-showcase__caption">
        <p className="onboarding-showcase__title">{slide.title}</p>
        <p className="onboarding-showcase__body">{slide.body}</p>
      </div>
    </aside>
  )
}
