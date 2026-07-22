import { SiteContainer } from '@/components/layout/SiteContainer'

export type GuideProductId = 'live-console' | 'cloud'

const PRODUCT_ITEMS: { id: GuideProductId; label: string; badge: string }[] = [
  { id: 'live-console', label: 'Q-worship Live Console', badge: 'Desktop Application' },
  { id: 'cloud', label: 'Q-worship Cloud Presentation System', badge: 'Cloud' },
]

interface GuideProductNavProps {
  activeProduct: GuideProductId
  onChange: (id: GuideProductId) => void
}

export function GuideProductNav({ activeProduct, onChange }: GuideProductNavProps) {
  return (
    <nav className="guide-product-nav" aria-label="Q-worship products">
      <SiteContainer>
        <div className="guide-product-nav-inner">
          {PRODUCT_ITEMS.map((item) => {
            const isActive = item.id === activeProduct
            return (
              <button
                key={item.id}
                type="button"
                className={`guide-product-nav-link${isActive ? ' guide-product-nav-link--active' : ''}`}
                onClick={() => onChange(item.id)}
              >
                <span>{item.label}</span>
                <span className="guide-product-nav-badge">{item.badge}</span>
              </button>
            )
          })}
        </div>
      </SiteContainer>
    </nav>
  )
}
