import { HandsFreeBeamAnimation } from '@/components/sections/HandsFreeBeamAnimation'
import { HandsFreeTranscriptionOverlay } from '@/components/sections/HandsFreeTranscriptionOverlay'

interface HandsFreeShowcaseVisualProps {
  variant?: 'split' | 'full'
  className?: string
}

export function HandsFreeShowcaseVisual({
  variant = 'full',
  className = '',
}: HandsFreeShowcaseVisualProps) {
  const rootClass =
    variant === 'split'
      ? `hero-showcase-visual hero-showcase-visual--animated ${className}`.trim()
      : `hfb-showcase-visual hfb-showcase-visual--full ${className}`.trim()

  return (
    <div className={rootClass}>
      <HandsFreeBeamAnimation />
      <HandsFreeTranscriptionOverlay />
    </div>
  )
}
