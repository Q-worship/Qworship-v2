import { useState, type KeyboardEvent } from 'react'
import type { TabItem } from '@/types/content'
import { HeroShowcasePanel } from '@/components/sections/HeroShowcasePanel'

interface ShowcaseCardProps {
  tabs: TabItem[]
  idPrefix: string
  className?: string
}

function getInitialTabId(tabs: TabItem[], idPrefix: string): string {
  if (idPrefix === 'hero') {
    return tabs.find((tab) => tab.id === 'handsfree')?.id ?? tabs[0].id
  }
  return tabs[0].id
}

export function ShowcaseCard({ tabs, idPrefix, className = '' }: ShowcaseCardProps) {
  const [activeTabId, setActiveTabId] = useState(() => getInitialTabId(tabs, idPrefix))

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  const panelId = `${idPrefix}-showcase-panel`

  const handleTabSelect = (tabId: string) => {
    if (tabId === activeTabId) return
    setActiveTabId(tabId)
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleTabSelect(tabId)
    }
  }

  const renderTab = (tab: TabItem, idSuffix: string) => {
    const isActive = activeTabId === tab.id

    return (
      <button
        key={`${tab.id}${idSuffix}`}
        type="button"
        role="tab"
        id={`${idPrefix}-tab-${tab.id}${idSuffix}`}
        aria-selected={isActive}
        aria-controls={panelId}
        tabIndex={isActive ? 0 : -1}
        onClick={() => handleTabSelect(tab.id)}
        onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
        className={`hero-showcase-tab shrink-0 ${
          isActive ? 'hero-showcase-tab--active' : ''
        }`}
      >
        {tab.label}
      </button>
    )
  }

  return (
    <div className={`hero-showcase-card ${className}`.trim()}>
      <div className="hero-showcase-card-inner">
        <div
          className="hero-showcase-tab-rail hidden lg:flex"
          role="tablist"
          aria-label="Feature showcase"
        >
          {tabs.map((tab) => renderTab(tab, ''))}
        </div>

        <div
          className="hero-showcase-tab-rail-mobile flex lg:hidden hide-scrollbar"
          role="tablist"
          aria-label="Feature showcase"
        >
          {tabs.map((tab) => renderTab(tab, '-mobile'))}
        </div>

        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-tab-${activeTabId}`}
          className="hero-showcase-screen"
        >
          <span className="sr-only">{activeTab.title}</span>
          <HeroShowcasePanel activeTab={activeTab} idPrefix={idPrefix} />
        </div>
      </div>
    </div>
  )
}
