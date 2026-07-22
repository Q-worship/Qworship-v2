import { AboutCoreBeliefsSection } from '@/components/sections/AboutCoreBeliefsSection'
import { AboutFAQSection } from '@/components/sections/AboutFAQSection'
import { AboutHeroSection } from '@/components/sections/AboutHeroSection'
import { AboutInsightsSection } from '@/components/sections/AboutInsightsSection'
import { AboutJobOpeningsSection } from '@/components/sections/AboutJobOpeningsSection'
import { AboutNewsletterSection } from '@/components/sections/AboutNewsletterSection'
import { AboutWorkBenefitsSection } from '@/components/sections/AboutWorkBenefitsSection'
import { BuiltByPastorsSection } from '@/components/sections/BuiltByPastorsSection'

export function About() {
  return (
    <>
      <AboutHeroSection />
      <BuiltByPastorsSection />
      <AboutCoreBeliefsSection />
      <AboutInsightsSection />
      <AboutWorkBenefitsSection />
      <AboutJobOpeningsSection />
      <AboutFAQSection />
      <AboutNewsletterSection />
    </>
  )
}
