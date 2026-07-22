import { useRef, type ReactNode } from 'react'

import { compatibleSystems } from '@/lib/theme'

import { SiteContainer } from '@/components/layout/SiteContainer'
import { PartnerLogo } from '@/components/ui/PartnerLogos'
import { useMarqueeLoop } from '@/hooks/useMarqueeLoop'

interface CompatibleSystemsSectionProps {
  afterMarquee?: ReactNode
}

export function CompatibleSystemsSection({
  afterMarquee,
}: CompatibleSystemsSectionProps = {}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const copies = useMarqueeLoop(trackRef, compatibleSystems.length)
  const marqueeSystems = Array.from({ length: copies }, () => compatibleSystems).flat()

  return (
    <section className="compatible-systems-section section-gap bg-black">
      <SiteContainer className="reveal">
        <h2 className="font-headline text-center text-2xl md:text-3xl font-medium text-white">
          Compatible with{' '}
          <span className="relative inline-block">
            all
            <span
              className="absolute -bottom-1 left-1/2 h-px w-40 -translate-x-1/2 bg-[#6B6B6B] hidden md:block"
              aria-hidden="true"
            />
          </span>{' '}
          your
          <br className="md:hidden" />{' '}
          <span className="relative inline-block">
            favourite systems
            <span
              className="absolute -bottom-1 left-1/2 h-px w-40 -translate-x-1/2 bg-[#6B6B6B] md:hidden"
              aria-hidden="true"
            />
          </span>
        </h2>
      </SiteContainer>

      <div className="compatible-systems-marquee mt-12 md:mt-28 overflow-hidden">
        <div ref={trackRef} className="compatible-systems-track">
          {marqueeSystems.map((system, index) => (
            <div
              key={`${system.icon}-${index}`}
              className="compatible-systems-item"
            >
              <PartnerLogo
                icon={system.icon}
                className="h-16 w-16 md:h-20 md:w-20"
              />
              <span className="font-bold text-white">{system.name}</span>
            </div>
          ))}
        </div>
      </div>

      {afterMarquee && <div className="mt-16 md:mt-24">{afterMarquee}</div>}
    </section>
  )
}
