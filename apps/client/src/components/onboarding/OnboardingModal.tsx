import type { ReactNode } from 'react'
import type { OnboardingSlide } from '@/lib/onboardingSlides'
import { OnboardingShowcase } from './OnboardingShowcase'

interface OnboardingModalProps {
  children: ReactNode
  slide: OnboardingSlide
  topRight?: ReactNode
}

export function OnboardingModal({ children, slide, topRight }: OnboardingModalProps) {
  return (
    <div className="onboarding-modal">
      <div className="onboarding-modal__panel onboarding-modal__panel--form">
        {topRight ? (
          <div className="onboarding-modal__top-right">{topRight}</div>
        ) : null}
        {children}
      </div>
      <OnboardingShowcase slide={slide} />
    </div>
  )
}
