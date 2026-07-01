import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { AccordionSpotlightContent, ChecklistSpotlightContent } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { HandsFreeTranscriptionOverlay } from '@/components/sections/HandsFreeTranscriptionOverlay'

const SCROLL_OFFSET = 120

interface ChecklistCardsProps {
  content: ChecklistSpotlightContent
  visualOverlay?: ReactNode
}

function ChecklistCardsSpotlight({ content, visualOverlay }: ChecklistCardsProps) {
  return (
    <section id={content.id} className="feature-spotlight-section section-gap reveal scroll-mt-28">
      <SiteContainer>
        <div className="feature-spotlight-grid">
          <div className="feature-spotlight-visual">
            <img
              src={content.image}
              alt={content.imageAlt}
              className="feature-spotlight-image"
              loading="lazy"
            />
            {visualOverlay}
          </div>

          <div className="feature-spotlight-copy">
            <h2 className="feature-spotlight-title font-headline font-bold">
              <span className="feature-spotlight-title-line text-white">
                {content.title.line1}
              </span>
              <span className="feature-spotlight-title-line">
                {content.title.line2Before ? (
                  <span className="text-white">{content.title.line2Before} </span>
                ) : null}
                <span className="build-section-entire-gradient">{content.title.accent}</span>
              </span>
            </h2>

            <p className="feature-spotlight-body">{content.body}</p>

            <ul className="build-tabs-feature-list feature-spotlight-checklist">
              {content.checklist.map((item) => (
                <li key={item} className="build-tabs-feature-item">
                  <span className="build-tabs-feature-icon">
                    <MaterialIcon name="check" filled className="text-[12px]" />
                  </span>
                  <span className="build-tabs-feature-text">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="feature-spotlight-cards">
          {content.cards.map((card) => (
            <div key={card.title} className="feature-spotlight-card">
              <h3 className="feature-spotlight-card-title">{card.title}</h3>
              <p className="feature-spotlight-card-body">{card.description}</p>
            </div>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}

interface AccordionSpotlightProps {
  content: AccordionSpotlightContent
  autoAdvance?: boolean
  advanceDurationS?: number
  nextSectionId?: string
  imagePosition?: 'left' | 'right'
  showListeningOverlay?: boolean
}

function AccordionSpotlight({
  content,
  autoAdvance = false,
  advanceDurationS = 6,
  nextSectionId,
  imagePosition = 'right',
  showListeningOverlay = false,
}: AccordionSpotlightProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const activeItemIdRef = useRef(content.items[0].id)
  const isTransitioningRef = useRef(false)

  const [activeItemId, setActiveItemId] = useState(content.items[0].id)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [progressKey, setProgressKey] = useState(0)

  activeItemIdRef.current = activeItemId
  isTransitioningRef.current = isTransitioning

  const activeItem = content.items.find((item) => item.id === activeItemId) ?? content.items[0]

  useEffect(() => {
    if (!autoAdvance) return

    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
        if (!entry.isIntersecting) {
          setActiveItemId(content.items[0].id)
          activeItemIdRef.current = content.items[0].id
          setProgressKey((key) => key + 1)
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [autoAdvance, content.items])

  const switchItem = (itemId: string) => {
    if (itemId === activeItemIdRef.current || isTransitioningRef.current) return

    isTransitioningRef.current = true
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveItemId(itemId)
      activeItemIdRef.current = itemId
      setProgressKey((key) => key + 1)
      isTransitioningRef.current = false
      setIsTransitioning(false)
    }, 400)
  }

  const scrollToNextSection = () => {
    if (!nextSectionId) return
    const target = document.getElementById(nextSectionId)
    if (!target) return

    const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.scrollTo({ top, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!autoAdvance || !isInView || isTransitioning) return

    const timeout = window.setTimeout(() => {
      if (!isInView || isTransitioningRef.current) return

      const currentIndex = content.items.findIndex((item) => item.id === activeItemIdRef.current)
      const isLastItem = currentIndex === content.items.length - 1

      if (isLastItem) {
        scrollToNextSection()
        return
      }

      switchItem(content.items[currentIndex + 1].id)
    }, advanceDurationS * 1000)

    return () => window.clearTimeout(timeout)
  }, [activeItemId, advanceDurationS, autoAdvance, content.items, isInView, isTransitioning, nextSectionId, progressKey])

  const handleItemActivate = (itemId: string) => switchItem(itemId)

  const accordionList = (
    <div className="feature-spotlight-accordion-list" role="tablist" aria-label="On-screen Bible features">
      {content.items.map((item) => {
        const isActive = item.id === activeItemId

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`feature-spotlight-accordion-item${
              isActive ? ' feature-spotlight-accordion-item--active' : ''
            }`}
            onClick={() => handleItemActivate(item.id)}
            onMouseEnter={() => handleItemActivate(item.id)}
          >
            {isActive && autoAdvance && (
              <span className="feature-spotlight-accordion-progress-track" aria-hidden>
                {isInView && (
                  <span
                    key={progressKey}
                    className="feature-spotlight-accordion-progress-fill"
                    style={{ animationDuration: `${advanceDurationS}s` }}
                  />
                )}
              </span>
            )}
            <h3 className="feature-spotlight-accordion-item-title">{item.title}</h3>
            {isActive && (
              <p
                className="feature-spotlight-accordion-item-body transition-all duration-[400ms] ease-out"
                style={{
                  opacity: isTransitioning ? 0 : 1,
                  transform: isTransitioning ? 'translateY(6px)' : 'translateY(0)',
                }}
              >
                {activeItem.description}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )

  const visualColumn = (
    <div className="feature-spotlight-visual">
      <img
        src={content.image}
        alt={content.imageAlt}
        className="feature-spotlight-image"
        loading="lazy"
      />
      {showListeningOverlay && <HandsFreeTranscriptionOverlay variant="features" />}
    </div>
  )

  return (
    <section
      ref={sectionRef}
      id={content.id}
      className="feature-spotlight-section section-gap reveal scroll-mt-28"
    >
      <SiteContainer>
        <div className="feature-spotlight-header">
          <h2 className="feature-spotlight-accordion-heading font-headline font-bold">
            <span className="feature-spotlight-accordion-heading-line text-white">
              {content.header.line1}
            </span>
            <span className="feature-spotlight-accordion-heading-line">
              {content.header.line2Before ? (
                <span className="text-white">{content.header.line2Before} </span>
              ) : null}
              <span className="build-section-entire-gradient">{content.header.accent}</span>
            </span>
          </h2>
          <p className="feature-spotlight-accordion-subtitle">
            <span className="feature-spotlight-accordion-subtitle-line">{content.subtitle.line1}</span>{' '}
            <span className="feature-spotlight-accordion-subtitle-line">{content.subtitle.line2}</span>
          </p>
        </div>

        <div className="feature-spotlight-accordion-grid">
          {imagePosition === 'left' ? (
            <>
              {visualColumn}
              {accordionList}
            </>
          ) : (
            <>
              {accordionList}
              {visualColumn}
            </>
          )}
        </div>
      </SiteContainer>
    </section>
  )
}

export function FeatureSpotlightChecklistSection({
  content,
  showListeningOverlay = false,
}: {
  content: ChecklistSpotlightContent
  showListeningOverlay?: boolean
}) {
  return (
    <ChecklistCardsSpotlight
      content={content}
      visualOverlay={showListeningOverlay ? <HandsFreeTranscriptionOverlay variant="features" /> : undefined}
    />
  )
}

export function FeatureSpotlightAccordionSection({
  content,
  autoAdvance,
  advanceDurationS,
  nextSectionId,
  imagePosition,
  showListeningOverlay,
}: AccordionSpotlightProps) {
  return (
    <AccordionSpotlight
      content={content}
      autoAdvance={autoAdvance}
      advanceDurationS={advanceDurationS}
      nextSectionId={nextSectionId}
      imagePosition={imagePosition}
      showListeningOverlay={showListeningOverlay}
    />
  )
}
