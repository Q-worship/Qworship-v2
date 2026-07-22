import { onScreenBibleSpotlight } from '@/lib/theme'
import { FeatureSpotlightAccordionSection } from '@/components/sections/FeatureSpotlightSection'

export function OnScreenBibleFeatureSection() {
  return (
    <FeatureSpotlightAccordionSection
      content={onScreenBibleSpotlight}
      autoAdvance
      advanceDurationS={6}
      nextSectionId="pricing"
    />
  )
}
