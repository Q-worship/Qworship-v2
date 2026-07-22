import { aboutHeroCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function AboutHeroSection() {
  return (
    <section className="about-hero-section pt-32 md:pt-36 pb-16 md:pb-20 reveal active">
      <SiteContainer>
        <div className="about-hero-grid">
          <div className="about-hero-media">
            <img
              src={aboutHeroCopy.image}
              alt={aboutHeroCopy.imageAlt}
              className="about-hero-image"
              loading="eager"
            />
          </div>

          <div className="about-hero-copy">
            <div className="about-hero-badge">{aboutHeroCopy.badge}</div>

            <h1 className="about-hero-heading font-headline font-bold">
              <span className="text-white">{aboutHeroCopy.heading.before} </span>
              <span className="about-hero-heading-accent">{aboutHeroCopy.heading.accent}</span>
            </h1>

            <p className="about-hero-body">{aboutHeroCopy.body}</p>
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
