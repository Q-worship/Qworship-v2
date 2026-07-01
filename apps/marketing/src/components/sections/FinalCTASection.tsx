import { finalCtaCopy, images } from '@/lib/theme'

import { SiteContainer } from '@/components/layout/SiteContainer'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function FinalCTASection() {
  return (
    <section className="section-gap relative reveal">
      <SiteContainer>
        <GlassCard className="final-cta-card">
          <div className="final-cta-copy">
            <h2 className="final-cta-heading font-headline font-bold">
              <span className="text-white">{finalCtaCopy.heading.line1} </span>
              <span className="final-cta-heading-accent">{finalCtaCopy.heading.line2}</span>
            </h2>
            <p className="final-cta-body">{finalCtaCopy.body}</p>
          </div>
          <div className="final-cta-media">
            <picture>
              <source media="(max-width: 767px)" srcSet={images.ctaMobile} />
              <img
                src={images.cta}
                alt=""
                className="final-cta-image"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <span className="final-cta-download-patch" aria-hidden />
          </div>
          <div className="final-cta-actions cta-pair-mobile-inline">
            <PrimaryButton className="final-cta-primary-btn px-10 py-4 rounded-xl text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all">
              {finalCtaCopy.primaryCta}
            </PrimaryButton>
            <a
              href="#"
              className="final-cta-download-link flex items-center gap-3 font-bold text-lg hover:text-primary transition-colors"
            >
              {finalCtaCopy.downloadCta} <MaterialIcon name="download" className="text-lg" />
            </a>
          </div>
        </GlassCard>
      </SiteContainer>
    </section>
  )
}
