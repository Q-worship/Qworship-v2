const trialFeatures = [
  'Online Voice Bible Search (6+ Bibles)',
  'On-screen Bible - 5+ Bibles',
  'Rich Slide Canvas - text, elements, images, QR codes, layers',
  'Lower Third Builder & Pre-built templates',
  'Advanced media tagging & collections',
  'Multi - Branch Discount - Up to 5 branches',
  'Power Point Export & Back-up',
  'Priority Email Support',
] as const

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function TrialIconLayers() {
  return (
    <svg {...iconProps}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  )
}

function TrialIconCalendar() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function TrialIconCalendarClock() {
  return (
    <svg {...iconProps}>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M16 2v4M8 2v4M3 10h5" />
      <circle cx="16" cy="16" r="6" />
      <path d="M16 14v2l1 1" />
    </svg>
  )
}

function TrialIconWarning() {
  return (
    <svg {...iconProps}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

interface TrialWelcomeModalProps {
  onStartTrial: () => void
}

export function TrialWelcomeModal({ onStartTrial }: TrialWelcomeModalProps) {
  return (
    <div className="trial-welcome">
      <header className="trial-welcome__header">
        <h1 className="trial-welcome__title">
          Welcome to Your{' '}
          <span className="trial-welcome__title-accent">
            Q-worship Cloud Pro 30 days Free Trial
          </span>
        </h1>
        <p className="trial-welcome__subtitle">
          Your free trial begins now and runs for a period of 30 days. Enjoy all
          the perks of Pro on us
        </p>
        <p className="trial-welcome__section-label">
          What&apos;s included in your free trial
        </p>
      </header>

      <div className="trial-welcome__grid">
        <section className="trial-welcome__card trial-welcome__card--features">
          <div className="trial-welcome__card-head">
            <span className="trial-welcome__icon trial-welcome__icon--purple" aria-hidden="true">
              <TrialIconLayers />
            </span>
            <h2 className="trial-welcome__card-title">
              Features
            </h2>
          </div>
          <ul className="trial-welcome__list">
            {trialFeatures.map((feature) => (
              <li key={feature} className="trial-welcome__list-item">
                <span className="trial-welcome__check" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          <p className="trial-welcome__footnote">
            ... And Everything in Pro, plus more
          </p>
        </section>

        <div className="trial-welcome__stack">
          <section className="trial-welcome__card">
            <div className="trial-welcome__card-head">
              <span className="trial-welcome__icon trial-welcome__icon--teal" aria-hidden="true">
                <TrialIconCalendar />
              </span>
              <h2 className="trial-welcome__card-title">
                Trial Duration
              </h2>
            </div>
            <p className="trial-welcome__card-body">
              Your trial starts today and runs for{' '}
              <strong className="trial-welcome__emphasis">30 full days</strong>.
              You&apos;ll receive email reminders as your trial approaches its end.
            </p>
          </section>

          <section className="trial-welcome__card">
            <div className="trial-welcome__card-head">
              <span className="trial-welcome__icon trial-welcome__icon--teal" aria-hidden="true">
                <TrialIconCalendarClock />
              </span>
              <h2 className="trial-welcome__card-title">
                What happens after my free trial
              </h2>
            </div>
            <p className="trial-welcome__card-body">
              Near the end of your trial, you&apos;ll be prompted to choose a paid
              plan to continue using Q-worship. If no plan is selected, your
              account will be safely locked with all data preserved for 90 days.
            </p>
          </section>
        </div>

        <section className="trial-welcome__card">
          <div className="trial-welcome__card-head">
            <span className="trial-welcome__icon trial-welcome__icon--yellow" aria-hidden="true">
              <TrialIconWarning />
            </span>
            <h2 className="trial-welcome__card-title">
              Important
            </h2>
          </div>
          <p className="trial-welcome__card-body">
            No payment information is required during your trial. You can explore
            all features risk-free and decide if Q-worship is right for your
            ministry.
          </p>
        </section>
      </div>

      <footer className="trial-welcome__footer">
        <button type="button" className="trial-welcome__cta" onClick={onStartTrial}>
          Start free Trial
        </button>
        <p className="trial-welcome__demo">
          Need a demo?{' '}
          <a href="/about" className="trial-welcome__demo-link">
            Book here
          </a>
        </p>
      </footer>
    </div>
  )
}
