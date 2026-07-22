import { HeroSection } from '@/components/sections/HeroSection'
import { HandsFreeBibleSection } from '@/components/sections/HandsFreeBibleSection'
import { BuildTabsSection } from '@/components/sections/BuildTabsSection'
import { FeatureGridSection } from '@/components/sections/FeatureGridSection'
import { AlternatingBlocksSection } from '@/components/sections/AlternatingBlocksSection'
import { BuiltByPastorsSection } from '@/components/sections/BuiltByPastorsSection'
import { TeamCarouselSection } from '@/components/sections/TeamCarouselSection'
import { MoreFeaturesSection } from '@/components/sections/MoreFeaturesSection'
import { CompatibleSystemsSection } from '@/components/sections/CompatibleSystemsSection'
import { AssetLibraryPricingSection } from '@/components/sections/AssetLibraryPricingSection'
import { FinalCTASection } from '@/components/sections/FinalCTASection'
import { FAQSection } from '@/components/sections/FAQSection'

export function Home() {
  return (
    <>
      <HeroSection />
      <HandsFreeBibleSection />
      <BuildTabsSection />
      <BuiltByPastorsSection />
      <FeatureGridSection />
      <TeamCarouselSection />
      <AlternatingBlocksSection />
      <MoreFeaturesSection />
      <CompatibleSystemsSection />
      <AssetLibraryPricingSection />
      <FinalCTASection />
      <FAQSection />
    </>
  )
}
