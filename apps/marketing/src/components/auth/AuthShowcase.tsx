import { useEffect, useState } from 'react'
import { authShowcaseSlides } from '@/lib/theme'

const AUTO_ADVANCE_MS = 5000

export type AuthShowcaseVariant = 'plain' | 'card'

interface AuthShowcaseProps {
  variant?: AuthShowcaseVariant
  initialSlide?: number
  ariaLabel?: string
}

export function AuthShowcase({
  variant = 'plain',
  initialSlide = 0,
  ariaLabel = 'Feature showcase',
}: AuthShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(initialSlide)
  const [reduceMotion, setReduceMotion] = useState(false)

  const slides = authShowcaseSlides
  const activeSlide = slides[activeIndex]
  const isCard = variant === 'card'

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (reduceMotion) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length)
    }, AUTO_ADVANCE_MS)

    return () => window.clearInterval(intervalId)
  }, [activeIndex, reduceMotion, slides.length])

  const rootClass = isCard
    ? 'login-showcase auth-showcase auth-showcase--card'
    : 'login-showcase'

  return (
    <div className={rootClass}>
      <div className={isCard ? 'auth-showcase__visual' : 'login-showcase__visual'}>
        {'badge' in activeSlide && activeSlide.badge ? (
          <span className="auth-showcase__badge">{activeSlide.badge}</span>
        ) : null}
        <div
          className={
            isCard ? 'auth-showcase__frame login-showcase__stage' : 'login-showcase__stage'
          }
        >
          {slides.map((slide, index) => (
            <img
              key={slide.id}
              src={slide.image}
              alt={slide.alt}
              className={`login-showcase__slide${
                index === activeIndex
                  ? ' login-showcase__slide--active'
                  : ' login-showcase__slide--inactive'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="login-showcase__caption" aria-live="polite">
        <p className="login-showcase__caption-title">{activeSlide.title}</p>
        <p className="login-showcase__caption-body">{activeSlide.body}</p>
      </div>

      <div className="login-showcase__dots" role="tablist" aria-label={ariaLabel}>
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={slide.title}
            className={`login-showcase__dot${
              index === activeIndex ? ' login-showcase__dot--active' : ''
            }`}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}
