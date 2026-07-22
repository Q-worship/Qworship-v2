import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import type { GuideCard } from '@/types/content'
import { guideProductInfo } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import type { GuideProductId } from '@/components/sections/GuideProductNav'

interface GuideStepsSectionProps {
  guide: GuideCard
  activeProduct: GuideProductId
}

export function GuideStepsSection({ guide, activeProduct }: GuideStepsSectionProps) {
  const activeContent = activeProduct === 'cloud' ? guide.cloudSteps : guide.steps
  const sections = activeContent?.sections ?? []

  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(sections[0]?.id)
  const [activeStepId, setActiveStepId] = useState<string | undefined>(sections[0]?.steps[0]?.id)

  useEffect(() => {
    setActiveSectionId(sections[0]?.id)
    setActiveStepId(sections[0]?.steps[0]?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProduct, guide.id])

  if (!guide.steps || sections.length === 0) {
    return null
  }

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0]
  const activeSectionIndex = sections.findIndex((section) => section.id === activeSection.id)
  const prevSection = sections[activeSectionIndex - 1]
  const nextSection = sections[activeSectionIndex + 1]
  const isLastSection = activeSectionIndex === sections.length - 1

  const goToSection = (sectionId: string) => {
    const section = sections.find((item) => item.id === sectionId)
    if (!section) return
    setActiveSectionId(section.id)
    setActiveStepId(section.steps[0]?.id)
  }

  const toggleStep = (stepId: string) => {
    setActiveStepId((current) => (current === stepId ? undefined : stepId))
  }

  return (
    <section className="guide-steps-section reveal">
      <SiteContainer>
        <div className="guide-steps-grid">
          <aside className="guide-steps-sidebar">
            <div className="guide-steps-sidebar-card">
              <h2 className="guide-steps-sidebar-title font-headline">
                {guideProductInfo[activeProduct].title}
              </h2>
              <p className="guide-steps-sidebar-summary">{guideProductInfo[activeProduct].description}</p>
              <Link href="/downloads" className="guide-steps-download-btn">
                Download
                <MaterialIcon name="download" className="guide-steps-download-icon" aria-hidden />
              </Link>
            </div>

            <p className="guide-steps-nav-label">Sections</p>
            <nav className="guide-steps-nav" aria-label="Guide sections">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`guide-steps-nav-item${
                    section.id === activeSection.id ? ' guide-steps-nav-item--active' : ''
                  }`}
                  onClick={() => goToSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="guide-steps-content">
            <h3 className="guide-steps-content-heading font-headline">{activeSection.label}</h3>
            <p className="guide-steps-content-description">{activeSection.description}</p>

            <div className="guide-steps-accordion">
              {activeSection.steps.map((step, index) => {
                const isOpen = step.id === activeStepId

                return (
                  <div
                    key={step.id}
                    className={`guide-steps-item${isOpen ? ' guide-steps-item--open' : ''}`}
                  >
                    <button
                      type="button"
                      className="guide-steps-item-header"
                      aria-expanded={isOpen}
                      onClick={() => toggleStep(step.id)}
                    >
                      <span
                        className={`guide-steps-item-number${
                          isOpen ? ' guide-steps-item-number--active' : ''
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="guide-steps-item-title">{step.title}</span>
                      <MaterialIcon
                        name="expand_more"
                        className="guide-steps-item-chevron"
                        aria-hidden
                      />
                    </button>

                    {isOpen && (
                      <div className="guide-steps-item-body">
                        <p>{step.body}</p>
                        {step.blocks?.map((block, blockIndex) => {
                          if (block.type === 'checklist') {
                            return (
                              <ul key={blockIndex} className="guide-steps-checklist">
                                {block.items.map((item) => (
                                  <li key={item} className="guide-steps-checklist-item">
                                    <span className="guide-steps-checklist-icon">
                                      <MaterialIcon name="check" filled className="text-[12px]" />
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )
                          }

                          if (block.type === 'tip') {
                            return (
                              <div key={blockIndex} className="guide-steps-note guide-steps-note--tip">
                                <MaterialIcon name="lightbulb" className="guide-steps-note-icon" aria-hidden />
                                <p>{block.body}</p>
                              </div>
                            )
                          }

                          if (block.type === 'warning') {
                            return (
                              <div key={blockIndex} className="guide-steps-note guide-steps-note--warning">
                                <MaterialIcon name="warning" className="guide-steps-note-icon" aria-hidden />
                                <p>{block.body}</p>
                              </div>
                            )
                          }

                          return (
                            <div key={blockIndex} className="guide-steps-modes">
                              {block.items.map((mode) => (
                                <div key={mode.label} className="guide-steps-mode-card">
                                  <div className="guide-steps-mode-header">
                                    <MaterialIcon name="wifi" className="guide-steps-mode-icon" aria-hidden />
                                    <span className="guide-steps-mode-label">{mode.label}</span>
                                  </div>
                                  <p className="guide-steps-mode-body">{mode.body}</p>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {(prevSection || nextSection || isLastSection) && (
              <div className="guide-steps-nav-buttons">
                {prevSection ? (
                  <button
                    type="button"
                    className="guide-steps-prev-btn"
                    onClick={() => goToSection(prevSection.id)}
                  >
                    <MaterialIcon name="arrow_back" aria-hidden />
                    Previous
                  </button>
                ) : (
                  <span />
                )}

                {nextSection ? (
                  <button
                    type="button"
                    className="guide-steps-next-btn"
                    onClick={() => goToSection(nextSection.id)}
                  >
                    Next: {nextSection.label}
                    <MaterialIcon name="arrow_forward" aria-hidden />
                  </button>
                ) : (
                  <Link href="/pricing" className="guide-steps-next-btn">
                    Try It Free
                    <MaterialIcon name="arrow_forward" aria-hidden />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
