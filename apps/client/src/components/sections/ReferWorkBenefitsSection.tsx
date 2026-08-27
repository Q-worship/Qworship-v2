import { Link } from 'wouter'
import { aboutWorkBenefits, referWorkBenefitsCopy, REFER_JOIN_PATH } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function ReferWorkBenefitsSection() {
  return (
    <section className="about-light-section about-work-benefits-section refer-work-benefits-section section-gap reveal">
      <SiteContainer>
        <div className="refer-work-benefits-header">
          <h2 className="about-work-benefits-heading font-headline font-bold">
            {referWorkBenefitsCopy.heading}
          </h2>
          <Link href={REFER_JOIN_PATH} className="refer-work-benefits-btn">
            {referWorkBenefitsCopy.cta}
          </Link>
        </div>

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
