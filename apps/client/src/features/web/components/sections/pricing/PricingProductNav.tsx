import { pricingPageCopy, images } from '@/lib/theme'
import type { PricingProductId } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'

interface PricingProductNavProps {
  activeId: PricingProductId
  onChange: (id: PricingProductId) => void
}

export function PricingProductNav({ activeId, onChange }: PricingProductNavProps) {
  const { productNav } = pricingPageCopy

  return (
    <nav className="pricing-product-nav" aria-label="Q-worship products">
      <SiteContainer>
        <div className="pricing-product-nav-inner">
          <div className="pricing-product-nav-brand">
            <img src={images.logo} alt="" className="pricing-product-nav-logo" />
            <span className="pricing-product-nav-brand-text">{productNav.brand}</span>
          </div>

          <div className="pricing-product-nav-links hide-scrollbar">
            {productNav.items.map((item) => {
              const isActive = activeId === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`pricing-product-nav-link${isActive ? ' pricing-product-nav-link--active' : ''}`}
                  onClick={() => onChange(item.id)}
                >
                  <span>{item.label}</span>
                  <span className="pricing-product-nav-badge">{item.badge}</span>
                </button>
              )
            })}
          </div>
        </div>
      </SiteContainer>
    </nav>
  )
}
