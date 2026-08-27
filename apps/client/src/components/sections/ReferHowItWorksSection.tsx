import { referHowItWorksCopy } from '@/lib/theme'
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
          {referHowItWorksCopy.steps.map((step, index) => (
            <article key={step.title} className="refer-how-it-works-card">
              <span className="refer-how-it-works-number">{String(index + 1).padStart(2, '0')}</span>
              <MaterialIcon name={step.icon} className="refer-how-it-works-icon" />
              <h3 className="refer-how-it-works-card-title font-headline font-bold">{step.title}</h3>
              <p className="refer-how-it-works-card-body">{step.description}</p>
            </article>
          ))}
        </div>

        <div className="refer-how-it-works-cta-wrap">
          <button type="button" className="refer-how-it-works-cta">
            {referHowItWorksCopy.cta}
          </button>
        </div>
      </SiteContainer>
    </section>
  )
}
