import { Link } from 'wouter'
import type { PricingProductBanner } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface PricingProductBannerProps {
  banner: PricingProductBanner
}

export function PricingProductBanner({ banner }: PricingProductBannerProps) {
  return (
    <section className="pricing-product-banner reveal">
      <SiteContainer>
        <div className="pricing-product-banner-inner">
          <div className="pricing-product-banner-icon-wrap">
            <MaterialIcon name={banner.icon} className="pricing-product-banner-icon" aria-hidden />
          </div>
          <div className="pricing-product-banner-copy">
            <h2 className="pricing-product-banner-title font-headline">{banner.title}</h2>
            <p className="pricing-product-banner-description">{banner.description}</p>
          </div>
          <div className="pricing-product-banner-actions">
            <Link href={banner.primaryHref} className="pricing-product-banner-btn pricing-product-banner-btn--primary">
              {banner.primaryCta}
            </Link>
            {banner.secondaryCta && banner.secondaryHref && (
              <Link href={banner.secondaryHref} className="pricing-product-banner-btn pricing-product-banner-btn--outline">
                {banner.secondaryCta}
              </Link>
            )}
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
