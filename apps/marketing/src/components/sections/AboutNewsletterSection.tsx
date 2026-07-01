import { FormEvent, useState } from 'react'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function AboutNewsletterSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return
    }

    setSubmitted(true)
  }

  return (
    <section className="about-newsletter-section pb-24 md:pb-32 reveal">
      <SiteContainer>
        <div className="about-newsletter-grid">
          <div className="about-newsletter-copy">
            <h2 className="about-newsletter-heading font-headline font-bold">Join our mailing list</h2>
            <p className="about-newsletter-body">Stay up to date with our latest news and updates</p>
          </div>

          <form className="about-newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="about-newsletter-input"
              aria-label="Email address"
              required
            />
            <button type="submit" className="about-newsletter-submit">
              {submitted ? 'Subscribed' : 'Subscribe'}
            </button>
          </form>
        </div>
      </SiteContainer>
    </section>
  )
}
