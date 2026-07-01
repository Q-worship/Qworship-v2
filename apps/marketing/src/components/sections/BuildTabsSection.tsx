import { useEffect, useRef, useState } from 'react'

import { buildSectionCopy, buildTabItems } from '@/lib/theme'

import { SiteContainer } from '@/components/layout/SiteContainer'

import { MaterialIcon } from '@/components/ui/MaterialIcon'

const TAB_DURATION_S = 6

interface BuildTabsSectionProps {
  className?: string
}

export function BuildTabsSection({ className = '' }: BuildTabsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const activeTabIdRef = useRef(buildTabItems[0].id)
  const isTransitioningRef = useRef(false)

  const [activeTabId, setActiveTabId] = useState(buildTabItems[0].id)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [progressKey, setProgressKey] = useState(0)

  activeTabIdRef.current = activeTabId
  isTransitioningRef.current = isTransitioning

  const activeTab = buildTabItems.find((tab) => tab.id === activeTabId) ?? buildTabItems[0]

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.3 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const switchTab = (tabId: string) => {
    if (tabId === activeTabIdRef.current || isTransitioningRef.current) return

    isTransitioningRef.current = true
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTabId(tabId)
      setProgressKey((key) => key + 1)
      isTransitioningRef.current = false
      setIsTransitioning(false)
    }, 400)
  }

  const handleTabClick = (tabId: string) => switchTab(tabId)

  useEffect(() => {
    if (!isInView || isTransitioning) return

    const timeout = window.setTimeout(() => {
      if (!isInView || isTransitioningRef.current) return

      const currentIndex = buildTabItems.findIndex((tab) => tab.id === activeTabIdRef.current)
      const nextIndex = (currentIndex + 1) % buildTabItems.length
      switchTab(buildTabItems[nextIndex].id)
    }, TAB_DURATION_S * 1000)

    return () => window.clearTimeout(timeout)
  }, [activeTabId, isInView, progressKey, isTransitioning])

  return (
    <section
      ref={sectionRef}
      className={`build-tabs-section section-gap reveal ${className}`}
    >
      <SiteContainer>
        <div className="build-tabs-header mb-16 text-left">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold">
            Build your <span className="build-section-entire-gradient">Entire</span> church
            presentation
          </h2>
          <p className="text-on-surface-variant text-lg max-w-4xl">{buildSectionCopy.subtitle}</p>
        </div>

        <div className="build-tabs-panel">
          <div className="build-tabs-nav hide-scrollbar" role="tablist" aria-label="Feature tabs">
            {buildTabItems.map((tab) => {
              const isActive = activeTabId === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabClick(tab.id)}
                  className={`build-tabs-tab ${isActive ? 'build-tabs-tab--active' : ''}`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="build-tabs-progress-track" aria-hidden="true">
                      {isInView && (
                        <span
                          key={progressKey}
                          className="build-tabs-progress-fill"
                          style={{ animationDuration: `${TAB_DURATION_S}s` }}
                        />
                      )}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div
            className="build-tabs-content transition-all duration-[400ms] ease-out"
            role="tabpanel"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? 'translateY(10px)' : 'translateY(0)',
            }}
          >
            <div className="build-tabs-preview">
              <img
                src={activeTab.image}
                alt=""
                className={`build-tabs-preview-image build-tabs-preview-image--${activeTab.id}`}
                loading="eager"
                decoding="async"
              />
            </div>

            <div className="build-tabs-copy">
              <h3>
                <span className="block">{activeTab.title.line1}</span>
                <span className="block">{activeTab.title.line2}</span>
              </h3>
              <p>{activeTab.description}</p>

              <ul className="build-tabs-feature-list">
                {activeTab.features.map((feature) => (
                  <li key={feature} className="build-tabs-feature-item">
                    <span className="build-tabs-feature-icon">
                      <MaterialIcon name="check" filled className="text-[12px]" />
                    </span>
                    <span className="build-tabs-feature-text">{feature}</span>
                  </li>
                ))}
              </ul>

              <button type="button" className="build-tabs-demo-btn">
                <MaterialIcon name="play_circle" filled />
                Book Demo
              </button>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
