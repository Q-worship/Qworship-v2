import type { GuideCard } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { GuideCardGrid } from '@/components/sections/GuideCardGrid'

interface GuideRelatedSectionProps {
  cards: GuideCard[]
}

export function GuideRelatedSection({ cards }: GuideRelatedSectionProps) {
  if (cards.length === 0) {
    return null
  }

  return (
    <section className="guide-related-section reveal">
      <SiteContainer>
        <h2 className="guide-related-heading font-headline">More Guides and Articles</h2>
        <GuideCardGrid cards={cards} />
      </SiteContainer>
    </section>
  )
}
