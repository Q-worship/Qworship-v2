import { handsFreeFeatureSpotlight } from '@/lib/theme'
import { FeatureSpotlightChecklistSection } from '@/components/sections/FeatureSpotlightSection'

export function HandsFreeFeatureSection() {
  return (
    <FeatureSpotlightChecklistSection
      content={handsFreeFeatureSpotlight}
      showListeningOverlay
    />
  )
}
