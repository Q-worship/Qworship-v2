import { mediaAccordionSpotlight } from '@/lib/theme'
import { FeatureSpotlightAccordionSection } from '@/components/sections/FeatureSpotlightSection'
import { MediaBackgroundSwitcher } from '@/components/sections/MediaBackgroundSwitcher'

export function MediaFeatureSection() {
  return (
    <FeatureSpotlightAccordionSection
      content={mediaAccordionSpotlight}
      visualSlot={<MediaBackgroundSwitcher />}
      autoAdvance
      advanceDurationS={6}
      imagePosition="right"
    />
  )
}
