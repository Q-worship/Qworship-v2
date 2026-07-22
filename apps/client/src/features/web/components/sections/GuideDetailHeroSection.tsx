import { Link } from 'wouter'
import type { GuideCard } from '@/types/content'
import { featuresHeroCopy, guidesHeroCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

interface GuideDetailHeroSectionProps {
  guide: GuideCard
  compact?: boolean
}

export function GuideDetailHeroSection({ guide, compact = false }: GuideDetailHeroSectionProps) {
  return (
    <section
      className={`guide-detail-hero-section pt-32 md:pt-36 reveal active ${
        compact ? 'pb-16' : 'pb-16 md:pb-20'
      }`}
    >
      <SiteContainer>
        <div className="features-hero-grid">
          <div className="features-hero-copy">
            <div className="features-hero-badge">{guidesHeroCopy.badge}</div>

            <h1 className="guide-detail-hero-heading font-headline font-bold">{guide.title}</h1>

            <p className="features-hero-body">{guide.heroBody ?? featuresHeroCopy.body}</p>

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
              src={guide.image}
              alt={guide.imageAlt}
              className="guide-detail-hero-image"
              loading="eager"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
