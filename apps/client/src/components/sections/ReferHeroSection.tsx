import { useEffect, useState } from 'react'
import { images, referHeroCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function ReferHeroSection() {
  const slides = images.referCarousel
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  return (
    <section className="refer-hero-section reveal active">
      <SiteContainer>
        <div className="refer-hero-grid">
          <div className="refer-hero-copy">
            <div className="refer-hero-badge">{referHeroCopy.badge}</div>

            <h1 className="refer-hero-heading font-headline font-bold">
              <span className="refer-hero-heading-line refer-hero-heading-line--dark">
                {referHeroCopy.heading.line1}
              </span>
              <span className="refer-hero-heading-line refer-hero-heading-line--accent">
                {referHeroCopy.heading.line2}
              </span>
            </h1>

            <p className="refer-hero-body">
              {referHeroCopy.bodyLines.map((line) => (
                <span key={line} className="refer-hero-body-line">
                  {line}
                </span>
              ))}
            </p>

            <button type="button" className="refer-hero-cta">
              {referHeroCopy.cta}
            </button>
          </div>

          <div className="refer-hero-media">
            <div className="refer-hero-carousel">
              {slides.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt={referHeroCopy.imageAlt}
                  className={`refer-hero-carousel-image${index === active ? ' is-active' : ''}`}
                  loading="eager"
                />
              ))}
            </div>

            <div className="refer-hero-dots" role="tablist" aria-label="Referral program preview slides">
              {slides.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  role="tab"
                  aria-selected={index === active}
                  aria-label={`Show slide ${index + 1}`}
                  className={`refer-hero-dot${index === active ? ' is-active' : ''}`}
                  onClick={() => setActive(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
