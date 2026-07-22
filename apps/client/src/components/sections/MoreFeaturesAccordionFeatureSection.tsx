import { moreFeaturesAccordionSpotlight } from '@/lib/theme'
import { FeatureSpotlightAccordionSection } from '@/components/sections/FeatureSpotlightSection'

export function MoreFeaturesAccordionFeatureSection() {
  return (
    <FeatureSpotlightAccordionSection
      content={moreFeaturesAccordionSpotlight}
      autoAdvance
      advanceDurationS={6}
      imagePosition="right"
      showListeningOverlay
    />
  )
}
