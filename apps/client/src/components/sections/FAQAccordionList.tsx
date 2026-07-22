import { useState } from 'react'

import type { FaqItem } from '@/types/content'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface FAQAccordionListProps {
  categoryLabel: string
  items: FaqItem[]
  hideCategoryHeading?: boolean
  compact?: boolean
}

export function FAQAccordionList({
  categoryLabel,
  items,
  hideCategoryHeading = false,
  compact = false,
}: FAQAccordionListProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (items.length === 0) {
    return (
      <p className="faq-empty-state text-on-surface-variant text-center py-12">
        No questions in this category yet.
      </p>
    )
  }

  return (
    <div className={`faq-accordion-section reveal${compact ? ' faq-accordion-section--compact' : ''}`}>
      {!hideCategoryHeading && (
        <h2 className="faq-category-heading font-headline">{categoryLabel}</h2>
      )}

      <div className="faq-accordion">
        {items.map((item) => {
          const isOpen = openIds.has(item.id)

          return (
            <div key={item.id} className={`faq-accordion-item${isOpen ? ' faq-accordion-item--open' : ''}`}>
              <button
                type="button"
                className="faq-accordion-trigger"
                aria-expanded={isOpen}
                onClick={() => toggleItem(item.id)}
              >
                <span className="faq-accordion-question">{item.question}</span>
                <MaterialIcon
                  name="add"
                  className={`faq-accordion-icon${isOpen ? ' faq-accordion-icon--open' : ''}`}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <div className="faq-accordion-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
