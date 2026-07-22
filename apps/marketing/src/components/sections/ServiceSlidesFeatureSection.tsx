import { serviceSlidesAccordionSpotlight } from '@/lib/theme'
import { FeatureSpotlightAccordionSection } from '@/components/sections/FeatureSpotlightSection'

export function ServiceSlidesFeatureSection() {
  return (
    <FeatureSpotlightAccordionSection
      content={serviceSlidesAccordionSpotlight}
      autoAdvance
      advanceDurationS={6}
      nextSectionId="media"
      imagePosition="left"
    />
  )
}
