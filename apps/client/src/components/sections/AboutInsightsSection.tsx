import { aboutInsights } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function AboutInsightsSection() {
  return (
    <section className="about-light-section about-insights-section section-gap reveal">
      <SiteContainer>
        <h2 className="about-insights-heading font-headline font-bold">{aboutInsights.heading}</h2>

        <div className="about-insights-grid">
          {aboutInsights.items.map((item) => (
            <article key={item.imageAlt + item.highlighted} className="about-insights-card">
              <div
                className={`about-insights-image-wrap${item.highlighted ? ' about-insights-image-wrap--highlighted' : ''}`}
              >
                <img src={item.image} alt={item.imageAlt} className="about-insights-image" loading="lazy" />
              </div>
              <h3 className="about-insights-card-title font-headline font-bold">{item.title}</h3>
              <p className="about-insights-card-body">{item.description}</p>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
