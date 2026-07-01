import { useMemo, useState } from 'react'

import { SiteContainer } from '@/components/layout/SiteContainer'
import { FAQAccordionList } from '@/components/sections/FAQAccordionList'
import { PricingSection } from '@/components/sections/PricingSection'
import { FAQsCategoryNav } from '@/components/sections/FAQsCategoryNav'
import { FAQsHeroSection } from '@/components/sections/FAQsHeroSection'
import { faqCategoryItems, faqItems } from '@/lib/theme'

export function FAQs() {
  const [activeCategory, setActiveCategory] = useState(faqCategoryItems[0].id)

  const filteredItems = useMemo(
    () => faqItems.filter((item) => item.categoryId === activeCategory),
    [activeCategory],
  )

  const activeCategoryLabel =
    faqCategoryItems.find((item) => item.id === activeCategory)?.label ?? 'General'

  return (
    <>
      <FAQsHeroSection />
      <FAQsCategoryNav activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      <section className="faqs-content section-gap pb-24">
        <SiteContainer>
          <FAQAccordionList categoryLabel={activeCategoryLabel} items={filteredItems} />
          <div className="mt-16 lg:mt-24 reveal">
            <PricingSection />
          </div>
        </SiteContainer>
      </section>
    </>
  )
}
