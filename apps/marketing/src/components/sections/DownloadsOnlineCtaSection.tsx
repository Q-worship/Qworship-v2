import { downloadsPageCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function DownloadsOnlineCtaSection() {
  const { onlineCta } = downloadsPageCopy

  return (
    <section className="downloads-online-cta-section section-gap pb-24 reveal">
      <SiteContainer>
        <div className="downloads-online-cta">
          <img
            src={onlineCta.image}
            alt={onlineCta.imageAlt}
            className="downloads-online-cta-image"
            loading="lazy"
          />

          <div className="downloads-online-cta-content">
            <h2 className="downloads-online-cta-heading font-headline font-bold">
              <span className="text-white">{onlineCta.heading.before}</span>{' '}
              <span className="downloads-online-cta-accent">{onlineCta.heading.accent}</span>
            </h2>

            <p className="downloads-online-cta-body">{onlineCta.body}</p>

            <div className="downloads-online-cta-actions cta-pair-mobile-inline">
              <button type="button" className="features-hero-download-btn">
                {onlineCta.primaryCta}
              </button>
              <button type="button" className="features-hero-secondary-btn">
                {onlineCta.secondaryCta}
              </button>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
