import { postPastorsAccordionSpotlight } from '@/lib/theme'
import { FeatureSpotlightAccordionSection } from '@/components/sections/FeatureSpotlightSection'

export function PostPastorsAccordionFeatureSection() {
  return (
    <FeatureSpotlightAccordionSection
      content={postPastorsAccordionSpotlight}
      autoAdvance
      advanceDurationS={6}
      nextSectionId="on-screen-bible-showcase"
      imagePosition="left"
      showListeningOverlay
    />
  )
}
