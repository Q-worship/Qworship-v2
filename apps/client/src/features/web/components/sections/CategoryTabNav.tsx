import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface CategoryTabItem {
  id: string
  label: string
}

interface CategoryTabNavProps {
  items: CategoryTabItem[]
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
  ariaLabel: string
}

export function CategoryTabNav({
  items,
  activeCategory,
  onCategoryChange,
  ariaLabel,
}: CategoryTabNavProps) {
  return (
    <nav className="category-tab-nav" aria-label={ariaLabel}>
      <SiteContainer>
        <div className="category-tab-nav-inner">
          <div className="category-tab-nav-links hide-scrollbar" role="tablist">
            {items.map((item) => {
              const isActive = activeCategory === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`category-tab-nav-link${isActive ? ' category-tab-nav-link--active' : ''}`}
                  onClick={() => onCategoryChange(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <MaterialIcon
            name="chevron_right"
            className="category-tab-nav-chevron shrink-0 lg:hidden"
            aria-hidden
          />
        </div>
      </SiteContainer>
    </nav>
  )
}
