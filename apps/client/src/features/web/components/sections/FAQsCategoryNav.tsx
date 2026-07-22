import { faqCategoryItems } from '@/lib/theme'
import { CategoryTabNav } from '@/components/sections/CategoryTabNav'

interface FAQsCategoryNavProps {
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function FAQsCategoryNav({ activeCategory, onCategoryChange }: FAQsCategoryNavProps) {
  return (
    <CategoryTabNav
      items={faqCategoryItems}
      activeCategory={activeCategory}
      onCategoryChange={onCategoryChange}
      ariaLabel="FAQ categories"
    />
  )
}
