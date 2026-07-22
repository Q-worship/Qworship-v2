import { FeaturesHeroSection } from '@/components/sections/FeaturesHeroSection'

import { FeaturesSubNav } from '@/components/sections/FeaturesSubNav'

import { HandsFreeFeatureSection } from '@/components/sections/HandsFreeFeatureSection'

import { OnScreenBibleFeatureSection } from '@/components/sections/OnScreenBibleFeatureSection'

import { SongbookFeatureSection } from '@/components/sections/SongbookFeatureSection'

import { BuiltByPastorsSection } from '@/components/sections/BuiltByPastorsSection'

import { ServiceSlidesFeatureSection } from '@/components/sections/ServiceSlidesFeatureSection'

import { MoreFeaturesSection } from '@/components/sections/MoreFeaturesSection'

import { MediaFeatureSection } from '@/components/sections/MediaFeatureSection'

import { AssetLibrarySection } from '@/components/sections/AssetLibrarySection'

import { LowerThirdBuilderFeatureSection } from '@/components/sections/LowerThirdBuilderFeatureSection'

import { CompatibleSystemsSection } from '@/components/sections/CompatibleSystemsSection'

import { PricingSection } from '@/components/sections/PricingSection'

import { FinalCTASection } from '@/components/sections/FinalCTASection'

import { FAQSection } from '@/components/sections/FAQSection'

import { SiteContainer } from '@/components/layout/SiteContainer'



export function Features() {

  return (

    <main className="features-page">

      <FeaturesHeroSection />

      <FeaturesSubNav />

      <HandsFreeFeatureSection />

      <OnScreenBibleFeatureSection />

      <section id="pricing" className="section-gap reveal scroll-mt-28">

        <SiteContainer>

          <PricingSection />

        </SiteContainer>

      </section>

      <SongbookFeatureSection />

      <BuiltByPastorsSection />

      <ServiceSlidesFeatureSection />

      <MoreFeaturesSection showViewAllLink />

      <MediaFeatureSection />

      <section className="section-gap asset-library-pricing-section reveal">

        <AssetLibrarySection />

      </section>

      <CompatibleSystemsSection afterMarquee={<LowerThirdBuilderFeatureSection />} />

      <FinalCTASection />

      <FAQSection />

    </main>

  )

}

