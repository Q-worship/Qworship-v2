import { prePastorsHandsFreeSpotlight } from '@/lib/theme'
import { FeatureSpotlightChecklistSection } from '@/components/sections/FeatureSpotlightSection'

interface PrePastorsHandsFreeSectionProps {
  sectionId?: string
}

export function PrePastorsHandsFreeSection({ sectionId }: PrePastorsHandsFreeSectionProps = {}) {
  const content = sectionId
    ? { ...prePastorsHandsFreeSpotlight, id: sectionId }
    : prePastorsHandsFreeSpotlight

  return (
    <FeatureSpotlightChecklistSection
      content={content}
      showListeningOverlay
    />
  )
}
