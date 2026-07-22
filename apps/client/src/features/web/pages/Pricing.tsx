import { useState } from 'react'
import { getPricingProduct } from '@/lib/theme'
import { PricingCompareSection } from '@/components/sections/pricing/PricingCompareSection'
import { PricingFAQSection } from '@/components/sections/pricing/PricingFAQSection'
import { PricingHeroSection } from '@/components/sections/pricing/PricingHeroSection'
import { PricingIncludedSection } from '@/components/sections/pricing/PricingIncludedSection'
import { PricingPlanCardsSection } from '@/components/sections/pricing/PricingPlanCardsSection'
import { PricingPlansHeader } from '@/components/sections/pricing/PricingPlansHeader'
import { PricingProductBanner } from '@/components/sections/pricing/PricingProductBanner'
import { PricingProductNav } from '@/components/sections/pricing/PricingProductNav'
import { FinalCTASection } from '@/components/sections/FinalCTASection'
import type { BillingPeriod, PricingProductId } from '@/types/content'

export function Pricing() {
  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const [activeProduct, setActiveProduct] = useState<PricingProductId>('live-console')
  const product = getPricingProduct(activeProduct)

  return (
    <>
      <div className="pricing-top-gradient">
        <PricingHeroSection />
      </div>
      <div className="pricing-product-block">
        <PricingProductNav activeId={activeProduct} onChange={setActiveProduct} />
        <PricingProductBanner banner={product.productBanner} />
      </div>
      <div key={activeProduct}>
        <PricingPlansHeader
          plansHeader={product.plansHeader}
          billing={billing}
          onBillingChange={setBilling}
        />
        <PricingPlanCardsSection plans={product.plans} billing={billing} />
        <PricingIncludedSection
          heading={product.includedHeading}
          subtitle={product.includedSubtitle}
          features={product.includedFeatures}
        />
        <PricingCompareSection
          heading={product.compareHeading}
          subtitle={product.compareSubtitle}
          rows={product.compareRows}
          categories={product.compareCategories}
          columnLabels={product.compareColumnLabels}
        />
      </div>
      <PricingFAQSection />
      <FinalCTASection />
    </>
  )
}
