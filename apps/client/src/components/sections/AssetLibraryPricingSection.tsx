import { AssetLibrarySection } from '@/components/sections/AssetLibrarySection'
import { PricingSection } from '@/components/sections/PricingSection'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function AssetLibraryPricingSection() {
  return (
    <section className="section-gap asset-library-pricing-section reveal">
      <AssetLibrarySection />
      <SiteContainer className="mt-16 lg:mt-24">
        <PricingSection />
      </SiteContainer>
    </section>
  )
}
