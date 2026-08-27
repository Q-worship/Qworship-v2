import { Link } from 'wouter'
import { referHowItWorksCopy, REFER_JOIN_PATH } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function ReferHowItWorksSection() {
  return (
    <section className="refer-how-it-works-section section-gap reveal">
      <SiteContainer>
        <div className="refer-how-it-works-header">
          <h2 className="refer-how-it-works-heading font-headline font-bold">
            {referHowItWorksCopy.heading}
          </h2>
          <p className="refer-how-it-works-body">{referHowItWorksCopy.body}</p>
        </div>

        <div className="refer-how-it-works-grid">
          {referHowItWorksCopy.steps.map((step) => (
            <article key={step.title} className="refer-how-it-works-card">
              <span className="refer-how-it-works-icon-badge">
                <MaterialIcon name={step.icon} className="refer-how-it-works-icon" />
              </span>
              <h3 className="refer-how-it-works-card-title font-headline font-bold">{step.title}</h3>
              <p className="refer-how-it-works-card-body">{step.description}</p>
            </article>
          ))}
        </div>

        <div className="refer-how-it-works-cta-wrap">
          <Link href={REFER_JOIN_PATH} className="refer-how-it-works-cta">
            {referHowItWorksCopy.cta}
          </Link>
        </div>
      </SiteContainer>
    </section>
  )
}
