import { aboutCoreBeliefs } from '@/lib/theme'
import type { CoreBelief } from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'

function BeliefIcon({ icon }: { icon: CoreBelief['icon'] }) {
  if (icon === 'create') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 4L18.5 11.5L26 14L18.5 16.5L16 24L13.5 16.5L6 14L13.5 11.5L16 4Z"
          stroke="#00C2A8"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path d="M22 6L23 9L26 10L23 11L22 14L21 11L18 10L21 9L22 6Z" stroke="#00C2A8" strokeWidth="1.5" />
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

export function AboutCoreBeliefsSection() {
  return (
    <section className="about-core-beliefs-section section-gap reveal">
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
