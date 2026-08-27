import { aboutCoreBeliefs } from '@/lib/theme'
import type { CoreBelief } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'

function BeliefIcon({ icon }: { icon: CoreBelief['icon'] }) {
  if (icon === 'create') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 6C11.5817 6 8 9.47918 8 13.7778C8 16.6135 9.5 18.5 11 20C11.6667 20.6667 12 21.6 12 22.5V23.5H20V22.5C20 21.6 20.3333 20.6667 21 20C22.5 18.5 24 16.6135 24 13.7778C24 9.47918 20.4183 6 16 6Z"
          stroke="#00C2A8"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path d="M12.5 26.5H19.5" stroke="#00C2A8" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M13.5 23.5V22" stroke="#00C2A8" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M18.5 23.5V22" stroke="#00C2A8" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'develop') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="5" y="5" width="22" height="22" rx="3" stroke="#00C2A8" strokeWidth="1.75" />
        <path
          d="M12 16L10 14M12 16L10 18M12 16H20M20 16L22 14M20 16L22 18"
          stroke="#00C2A8"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="10" stroke="#00C2A8" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="4" stroke="#00C2A8" strokeWidth="1.75" />
      <path d="M16 6V10M16 22V26M6 16H10M22 16H26" stroke="#00C2A8" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

interface AboutCoreBeliefsSectionProps {
  variant?: 'dark' | 'light'
}

export function AboutCoreBeliefsSection({ variant = 'dark' }: AboutCoreBeliefsSectionProps) {
  return (
    <section
      className={`about-core-beliefs-section section-gap reveal ${
        variant === 'light' ? 'about-core-beliefs-section--light' : ''
      }`}
    >
      <SiteContainer>
        <h2 className="about-core-beliefs-heading font-headline font-bold">
          We thrive on <span className="about-core-beliefs-accent">three core believes :</span>
        </h2>

        <div className="about-core-beliefs-grid">
          {aboutCoreBeliefs.map((belief) => (
            <article key={belief.id} className="about-core-beliefs-card">
              <BeliefIcon icon={belief.icon} />
              <h3 className="about-core-beliefs-card-title font-headline font-bold">{belief.title}</h3>
              <p className="about-core-beliefs-card-body">{belief.description}</p>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
