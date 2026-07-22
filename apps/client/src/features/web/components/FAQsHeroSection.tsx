import { Link } from 'wouter'
import { faqsHeroCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function FAQsHeroSection() {
  return (
    <section className="features-hero-section pt-32 md:pt-36 pb-16 md:pb-20 reveal active">
      <SiteContainer>
        <div className="features-hero-grid">
          <div className="features-hero-copy">
            <div className="features-hero-badge">{faqsHeroCopy.badge}</div>

            <h1 className="features-hero-heading font-headline font-bold">
              <span className="text-white">{faqsHeroCopy.heading.line1}</span>
              <br />
              <span className="features-hero-heading-accent">{faqsHeroCopy.heading.accent}</span>
            </h1>

            <p className="features-hero-body">{faqsHeroCopy.body}</p>

            <div className="features-hero-actions cta-pair-mobile-inline">
              <Link href="/downloads" className="features-hero-download-btn">
                {faqsHeroCopy.primaryCta}
              </Link>
              <Link href="/signup" className="features-hero-secondary-btn">
                {faqsHeroCopy.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="features-hero-media">
            <img
              src={faqsHeroCopy.image}
              alt="Worship team operating Q-worship laptops during a live service"
              className="features-hero-image"
              loading="eager"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
