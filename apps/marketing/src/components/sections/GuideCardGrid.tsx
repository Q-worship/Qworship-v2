import type { GuideCard } from '@/types/content'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface GuideCardGridProps {
  cards: GuideCard[]
}

export function GuideCardGrid({ cards }: GuideCardGridProps) {
  if (cards.length === 0) {
    return (
      <p className="guides-empty-state text-on-surface-variant text-center py-12">
        No guides match your search.
      </p>
    )
  }

  return (
    <div className="guides-card-grid">
      {cards.map((card) => (
        <article key={card.id} className="guide-card reveal">
          <div className="guide-card-media">
            <img
              src={card.image}
              alt={card.imageAlt}
              className="guide-card-image"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="guide-card-body">
            <h3 className="guide-card-title font-headline">{card.title}</h3>
            <p className="guide-card-description">{card.description}</p>

            <div className="guide-card-footer">
              <button type="button" className="guide-card-btn">
                Learn more
              </button>
              <MaterialIcon name="article" className="guide-card-doc-icon" aria-hidden />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
