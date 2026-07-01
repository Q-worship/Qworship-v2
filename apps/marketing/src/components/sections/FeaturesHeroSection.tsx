import { featuresHeroCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

interface FeaturesHeroSectionProps {
  id?: string
}

export function FeaturesHeroSection({ id }: FeaturesHeroSectionProps) {
  return (
    <section
      {...(id ? { id } : {})}
      className="features-hero-section pt-32 md:pt-36 pb-16 md:pb-20 reveal active"
    >
      <SiteContainer>
        <div className="features-hero-grid">
          <div className="features-hero-copy">
            <div className="features-hero-badge">{featuresHeroCopy.badge}</div>

            <h1 className="features-hero-heading font-headline font-bold">
              <span className="build-section-entire-gradient">{featuresHeroCopy.heading.accent}</span>{' '}
              <span className="text-white">{featuresHeroCopy.heading.rest}</span>
            </h1>

            <p className="features-hero-body">{featuresHeroCopy.body}</p>

            <div className="features-hero-actions">
              <button type="button" className="features-hero-download-btn">
                {featuresHeroCopy.primaryCta}
              </button>
              <button type="button" className="features-hero-secondary-btn">
                {featuresHeroCopy.secondaryCta}
              </button>
            </div>
          </div>

          <div className="features-hero-media">
            <img
              src={featuresHeroCopy.image}
              alt="Team collaborating on church presentation software"
              className="features-hero-image"
              loading="eager"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
