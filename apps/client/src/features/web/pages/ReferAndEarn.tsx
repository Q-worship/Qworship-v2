import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'wouter'
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll'
import { Footer } from '@/components/layout/Footer'
import { ReferNavbar } from '@/components/sections/ReferNavbar'
import { ReferHeroSection } from '@/components/sections/ReferHeroSection'
import { ReferWhoWeAreSection } from '@/components/sections/ReferWhoWeAreSection'
import { AboutCoreBeliefsSection } from '@/components/sections/AboutCoreBeliefsSection'
import { ReferWorkBenefitsSection } from '@/components/sections/ReferWorkBenefitsSection'
import { ReferHowItWorksSection } from '@/components/sections/ReferHowItWorksSection'

export function ReferAndEarn() {
  const [location] = useLocation()

  useRevealOnScroll()

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0 })
  }, [location])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 })
    })
    return () => cancelAnimationFrame(frame)
  }, [location])

  return (
    <div className="antialiased min-h-screen flex flex-col">
      <ReferNavbar />
      <main className="flex-1">
        <ReferHeroSection />
        <ReferWhoWeAreSection />
        <AboutCoreBeliefsSection variant="light" />
        <ReferWorkBenefitsSection />
        <ReferHowItWorksSection />
      </main>
      <Footer />
    </div>
  )
}
