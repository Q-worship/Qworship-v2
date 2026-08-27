import { ReferHeroSection } from '@/components/sections/ReferHeroSection'
import { ReferWhoWeAreSection } from '@/components/sections/ReferWhoWeAreSection'
import { AboutCoreBeliefsSection } from '@/components/sections/AboutCoreBeliefsSection'
import { ReferWorkBenefitsSection } from '@/components/sections/ReferWorkBenefitsSection'
import { ReferHowItWorksSection } from '@/components/sections/ReferHowItWorksSection'

export function ReferAndEarn() {
  return (
    <>
      <ReferHeroSection />
      <ReferWhoWeAreSection />
      <AboutCoreBeliefsSection variant="light" />
      <ReferWorkBenefitsSection />
      <ReferHowItWorksSection />
    </>
  )
}
