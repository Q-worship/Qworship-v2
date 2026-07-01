import type { CSSProperties } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

const DEFAULT_TEXT =
  "Let's read our Bible from the book of Romans chapter 5 verse 2 where God reminds us of the importance of faith"

const FEATURES_TEXT = {
  prefix: 'Lets open our Bibles to the book of ',
  highlight: 'Philippians chapter 4 verse 13',
  suffix: ' where....',
}

const WAVEFORM_BARS = [3, 6, 9, 5, 11, 7, 10, 4, 8, 6, 9, 5]

interface HandsFreeTranscriptionOverlayProps {
  variant?: 'default' | 'features'
}

export function HandsFreeTranscriptionOverlay({
  variant = 'default',
}: HandsFreeTranscriptionOverlayProps) {
  const isFeatures = variant === 'features'

  return (
    <div className={`hfb-transcription${isFeatures ? ' hfb-transcription--features' : ''}`}>
      <div className="hfb-transcription__header">
        <div className="hfb-transcription__status">
          <MaterialIcon name="graphic_eq" className="hfb-transcription__icon" />
          <span className="hfb-transcription__label">
            {isFeatures ? 'Listening' : 'Q-worship is Listening ( Stage mic )'}
          </span>
        </div>

        <div className="hfb-transcription__live-row">
          <div className="hfb-transcription__waveform" aria-hidden>
            {WAVEFORM_BARS.map((height, index) => (
              <span
                key={index}
                className="hfb-transcription__waveform-bar"
                style={{ '--bar-height': `${height}px` } as CSSProperties}
              />
            ))}
          </div>
          {!isFeatures && (
            <span className="hfb-transcription__live">
              <span className="hfb-transcription__live-dot" aria-hidden />
              LIVE
            </span>
          )}
        </div>
      </div>

      {isFeatures ? (
        <p className="hfb-transcription__text">
          {FEATURES_TEXT.prefix}
          <span className="hfb-transcription__highlight">{FEATURES_TEXT.highlight}</span>
          {FEATURES_TEXT.suffix}
        </p>
      ) : (
        <p className="hfb-transcription__text">{DEFAULT_TEXT}</p>
      )}

      {isFeatures && (
        <div className="hfb-transcription__verse-pill" aria-hidden>
          <span className="hfb-transcription__verse-dot" />
          <span className="hfb-transcription__verse-ref">PHIL 4:13</span>
          <span className="hfb-transcription__verse-confidence">98%</span>
        </div>
      )}
    </div>
  )
}
