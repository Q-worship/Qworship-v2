import { useEffect, useRef, useState } from 'react'

import { featuresSubNavItems, images } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

const SCROLL_OFFSET = 120
const TOP_SCROLL_THRESHOLD = 200

function getHrefTargetId(href: string): string {
  return href.replace('#', '')
}

function getUniqueSectionIds(): string[] {
  return [
    ...new Set(featuresSubNavItems.map((item) => getHrefTargetId(item.href))),
  ]
}

export function FeaturesSubNav() {
  const [activeId, setActiveId] = useState(featuresSubNavItems[0].id)
  const overviewVisibleRef = useRef(false)
  const linksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sectionIds = getUniqueSectionIds()
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.id === 'overview') {
            overviewVisibleRef.current = entry.isIntersecting
          }
        })

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
          return
        }

        if (window.scrollY < TOP_SCROLL_THRESHOLD && !overviewVisibleRef.current) {
          setActiveId('overview')
        }
      },
      {
        rootMargin: `-${SCROLL_OFFSET}px 0px -55% 0px`,
        threshold: [0, 0.15, 0.35, 0.55],
      },
    )

    const handleScroll = () => {
      if (window.scrollY < TOP_SCROLL_THRESHOLD && !overviewVisibleRef.current) {
        setActiveId('overview')
      }
    }

    sections.forEach((section) => observer.observe(section))
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollActiveTabIntoView = (itemId: string) => {
    const tab = linksRef.current?.querySelector<HTMLButtonElement>(
      `[data-subnav-id="${itemId}"]`,
    )
    tab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }

  const handleNavClick = (item: (typeof featuresSubNavItems)[number]) => {
    const targetId = getHrefTargetId(item.href)
    const target = document.getElementById(targetId)
    if (!target) return

    const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveId(item.id)
    scrollActiveTabIntoView(item.id)
  }

  const handleScrollTabsForward = () => {
    const links = linksRef.current
    if (!links) return

    links.scrollBy({ left: links.clientWidth * 0.65, behavior: 'smooth' })
  }

  return (
    <nav className="features-subnav" aria-label="Features sections">
      <SiteContainer>
        <div className="features-subnav-inner">
          <div className="features-subnav-brand">
            <img src={images.logo} alt="" className="features-subnav-logo" />
            <span className="features-subnav-brand-text">Q-worship Features</span>
          </div>

          <div
            ref={linksRef}
            className="features-subnav-links hide-scrollbar"
            role="tablist"
          >
            {featuresSubNavItems.map((item) => {
              const isActive = activeId === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  data-subnav-id={item.id}
                  aria-selected={isActive}
                  className={`features-subnav-link${isActive ? ' features-subnav-link--active' : ''}`}
                  onClick={() => handleNavClick(item)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="features-subnav-chevron-btn shrink-0 lg:hidden"
            aria-label="Scroll feature tabs"
            onClick={handleScrollTabsForward}
          >
            <MaterialIcon name="chevron_right" className="features-subnav-chevron" aria-hidden />
          </button>
        </div>
      </SiteContainer>
    </nav>
  )
}
