import { guidesCategoryItems } from '@/lib/theme'
import { CategoryTabNav } from '@/components/sections/CategoryTabNav'

interface GuidesCategoryNavProps {
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function GuidesCategoryNav({ activeCategory, onCategoryChange }: GuidesCategoryNavProps) {
  return (
    <CategoryTabNav
      items={guidesCategoryItems}
      activeCategory={activeCategory}
      onCategoryChange={onCategoryChange}
      ariaLabel="Guide categories"
    />
  )
}
