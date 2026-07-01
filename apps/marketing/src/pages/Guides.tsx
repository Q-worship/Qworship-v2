import { useEffect, useMemo, useState } from 'react'

import { SiteContainer } from '@/components/layout/SiteContainer'
import { GuideCardGrid } from '@/components/sections/GuideCardGrid'
import { GuidesCategoryNav } from '@/components/sections/GuidesCategoryNav'
import { GuidesHeroSection } from '@/components/sections/GuidesHeroSection'
import { GuidesSearchBar } from '@/components/sections/GuidesSearchBar'
import { guideCards, guidesCategoryItems } from '@/lib/theme'

export function Guides() {
  const [activeCategory, setActiveCategory] = useState(guidesCategoryItems[0].id)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCards = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return guideCards.filter((card) => {
      if (card.categoryId !== activeCategory) return false
      if (!normalizedQuery) return true

      return (
        card.title.toLowerCase().includes(normalizedQuery) ||
        card.description.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [activeCategory, searchQuery])

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId)
    setSearchQuery('')
  }

  useEffect(() => {
    const urls = [...new Set(guideCards.map((card) => card.image))]
    urls.forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [])

  return (
    <>
      <GuidesHeroSection />
      <GuidesCategoryNav activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

      <section className="guides-content section-gap pb-24">
        <SiteContainer>
          <div className="guides-search-wrap reveal">
            <GuidesSearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          <GuideCardGrid cards={filteredCards} />
        </SiteContainer>
      </section>
    </>
  )
}
