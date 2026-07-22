import { aboutWorkBenefits } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function AboutWorkBenefitsSection() {
  return (
    <section className="about-light-section about-work-benefits-section section-gap reveal">
      <SiteContainer>
        <h2 className="about-work-benefits-heading font-headline font-bold">Come work with us !</h2>

        <div className="about-work-benefits-grid">
          {aboutWorkBenefits.map((benefit, index) => (
            <article key={index} className="about-work-benefits-card">
              <h3 className="about-work-benefits-card-title font-headline font-bold">{benefit.title}</h3>
              <p className="about-work-benefits-card-body">{benefit.description}</p>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
