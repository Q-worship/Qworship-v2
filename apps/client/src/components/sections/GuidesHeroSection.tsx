import { Link } from 'wouter'
import { guidesHeroCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function GuidesHeroSection() {
  return (
    <section className="features-hero-section pt-32 md:pt-36 pb-16 md:pb-20 reveal active">
      <SiteContainer>
        <div className="features-hero-grid">
          <div className="features-hero-copy">
            <div className="features-hero-badge">{guidesHeroCopy.badge}</div>

            <h1 className="features-hero-heading font-headline font-bold">
              <span className="features-hero-heading-accent">{guidesHeroCopy.heading.accent}</span>{' '}
              <span className="text-white">{guidesHeroCopy.heading.rest}</span>
            </h1>

            <p className="features-hero-body">{guidesHeroCopy.body}</p>

            <div className="features-hero-actions cta-pair-mobile-inline">
              <Link href="/downloads" className="features-hero-download-btn">
                {guidesHeroCopy.primaryCta}
              </Link>
              <Link href="/signup" className="features-hero-secondary-btn">
                {guidesHeroCopy.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="features-hero-media">
            <img
              src={guidesHeroCopy.image}
              alt="Operator running Q-worship on multiple screens during a live service"
              className="features-hero-image"
              loading="eager"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
