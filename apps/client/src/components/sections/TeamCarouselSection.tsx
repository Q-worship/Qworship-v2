import { useCallback, useEffect, useState } from 'react'

import { teamCards } from '@/lib/theme'

import { SiteContainer } from '@/components/layout/SiteContainer'

import { useHorizontalCarousel } from '@/hooks/useHorizontalCarousel'

import { MaterialIcon } from '@/components/ui/MaterialIcon'

function needsJsExpansion() {
  return window.matchMedia('(hover: none)').matches
}

export function TeamCarouselSection() {
  const { carouselRef, scrollNext } = useHorizontalCarousel(520)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const updateExpandedFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!needsJsExpansion()) return

    const card = document.elementFromPoint(clientX, clientY)?.closest('[data-team-card]')
    const title = card?.getAttribute('data-team-card') ?? null
    setExpandedCard(title)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: none)')

    const handleMove = (event: MouseEvent) => {
      updateExpandedFromPoint(event.clientX, event.clientY)
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateExpandedFromPoint(event.clientX, event.clientY)
    }

    const bindListeners = () => {
      if (!mediaQuery.matches) return

      window.addEventListener('mousemove', handleMove, { passive: true })
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
    }

    const unbindListeners = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('pointermove', handlePointerMove)
    }

    const handleMediaChange = () => {
      unbindListeners()
      setExpandedCard(null)
      bindListeners()
    }

    bindListeners()
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      unbindListeners()
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [updateExpandedFromPoint])

  return (
    <section className="team-carousel-section section-gap reveal">
      <SiteContainer>
        <div className="team-carousel-header">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold">
            Built for all parts of the team
          </h2>

          <div className="team-carousel-nav">
            <button
              type="button"
              onClick={scrollNext}
              className="team-carousel-nav-btn"
              aria-label="Next cards"
            >
              <MaterialIcon name="arrow_forward" className="team-carousel-arrow" />
            </button>
          </div>
        </div>

        <div className="team-carousel-track-wrap">
          <div
            ref={carouselRef}
            className="team-carousel-track flex overflow-x-auto gap-8 pb-8 snap-x hide-scrollbar"
          >
            {teamCards.map((card) => (
              <div
                key={card.title}
                data-team-card={card.title}
                tabIndex={0}
                className={`team-carousel-card w-[70vw] sm:w-[70vw] lg:w-[44vw] xl:w-[32vw] max-w-[560px] flex-shrink-0 group cursor-default focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none${expandedCard === card.title ? ' team-carousel-card--expanded' : ''}`}
                onPointerEnter={() => {
                  if (needsJsExpansion()) {
                    setExpandedCard(card.title)
                  }
                }}
                onPointerLeave={() => {
                  if (needsJsExpansion()) {
                    setExpandedCard(null)
                  }
                }}
                onClick={() => {
                  if (!needsJsExpansion()) return

                  setExpandedCard((current) => (current === card.title ? null : card.title))
                }}
              >
                <div className="aspect-[4/5] relative overflow-hidden">
                  <img
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={card.image}
                  />
                  <div className="team-carousel-overlay">
                    <div className="team-carousel-overlay-content">
                      {card.icon && (
                        <MaterialIcon
                          name={card.icon}
                          className="team-carousel-overlay-icon text-primary"
                        />
                      )}
                      <h3 className="team-carousel-overlay-title font-headline text-xl sm:text-2xl font-bold">
                        {card.title}
                      </h3>
                      {card.description && (
                        <p className="team-carousel-overlay-desc">{card.description}</p>
                      )}
                      {card.showButton && (
                        <button type="button" className="team-carousel-card-btn">
                          {card.buttonText ?? 'Start for free today'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
