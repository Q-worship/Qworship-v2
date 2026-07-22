import type { ReactNode } from 'react'

interface OnboardingOverlayProps {
  children: ReactNode
  visible?: boolean
}

export function OnboardingOverlay({ children, visible = true }: OnboardingOverlayProps) {
  if (!visible) return null

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-overlay__scrim" />
      <div className="onboarding-overlay__content">{children}</div>
    </div>
  )
}
