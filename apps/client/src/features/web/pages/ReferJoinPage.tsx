import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'
import { Footer } from '@/components/layout/Footer'
import { ReferNavbar } from '@/components/sections/ReferNavbar'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { images } from '@/lib/theme'
import { COUNTRY_OPTIONS, COUNTRY_NAME_TO_DIAL_CODE } from '@/lib/countries'

const PRODUCTS = [
  { id: 'qworship', label: 'Q-worship' },
  { id: 'go-green', label: 'Go-Green' },
]

const DEFAULT_COUNTRY = 'Nigeria'

export function ReferJoinPage() {
  const [location] = useLocation()
  const { toast } = useToast()
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [submitting, setSubmitting] = useState(false)

  const dialCode = useMemo(() => COUNTRY_NAME_TO_DIAL_CODE[country] || '+—', [country])

  useRevealOnScroll()

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0 })
  }, [location])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 })
    })
    return () => cancelAnimationFrame(frame)
  }, [location])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const phoneNumber = String(formData.get('phoneNumber') || '').trim()
    const payload = {
      firstName: String(formData.get('firstName') || '').trim(),
      lastName: String(formData.get('lastName') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      country: String(formData.get('country') || '').trim(),
      state: String(formData.get('state') || '').trim(),
      phoneNumber: phoneNumber ? `${dialCode} ${phoneNumber}` : '',
      product: String(formData.get('product') || ''),
      about: String(formData.get('about') || '').trim(),
    }

    setSubmitting(true)
    try {
      await apiRequest('POST', '/api/referrals/apply', payload)
      toast({
        title: 'Application received',
        description: "Thanks for applying — our team will review your details and get back to you.",
      })
      event.currentTarget.reset()
      setCountry(DEFAULT_COUNTRY)
    } catch (error: any) {
      toast({
        title: "Couldn't submit your application",
        description: error?.message?.replace(/^\d+:\s*/, '') || 'Please check your details and try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="antialiased min-h-screen flex flex-col">
      <ReferNavbar />
      <main className="flex-1">
        <section className="refer-join-hero reveal active">
          <img src={images.referPastor} alt="" className="refer-join-hero-bg" loading="eager" />
          <div className="refer-join-hero-overlay" />
          <SiteContainer className="refer-join-hero-inner">
            <span className="refer-join-hero-badge">JOIN</span>
            <h1 className="refer-join-hero-heading font-headline font-bold">
              Be a <span className="refer-join-hero-heading-accent">Q-worship Referral Partner</span>
            </h1>
          </SiteContainer>
        </section>

        <section className="refer-join-intro reveal">
          <SiteContainer>
            <p>
              Join our referral program today and start earning from every successful referral you make
              for Q-worship and other Divine Digital products. As a referral partner you will enjoy
              several <a href="/refer-and-earn">perks</a> and share in the financial success of the
              company. Provide the details below to get started and our customer team will get back to
              you once we receive your application.
            </p>
          </SiteContainer>
        </section>

        <section className="refer-join-form-section reveal">
          <SiteContainer>
            <form className="refer-join-form" onSubmit={handleSubmit}>
              <h2 className="refer-join-form-heading font-headline font-bold">
                Please provide the following details
              </h2>

              <div className="refer-form-row">
                <div className="refer-form-field">
                  <label htmlFor="firstName">First name</label>
                  <input id="firstName" name="firstName" type="text" placeholder="John" required />
                </div>
                <div className="refer-form-field">
                  <label htmlFor="lastName">Last name</label>
                  <input id="lastName" name="lastName" type="text" placeholder="Doe" required />
                </div>
              </div>

              <div className="refer-form-field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" placeholder="johndoe@email.com" required />
              </div>

              <div className="refer-form-row">
                <div className="refer-form-field">
                  <label htmlFor="country">Country of Residence</label>
                  <select
                    id="country"
                    name="country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  >
                    <optgroup label="All countries in the world">
                      {COUNTRY_OPTIONS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="refer-form-field">
                  <label htmlFor="state">State</label>
                  <input id="state" name="state" type="text" placeholder="Please provide your state" />
                </div>
              </div>

              <div className="refer-form-field">
                <label htmlFor="phoneNumber">Phone Number</label>
                <div className="refer-phone-input">
                  <span className="refer-phone-code">{dialCode}</span>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="Please provide a phone number"
                    required
                  />
                </div>
              </div>

              <div className="refer-form-field">
                <label htmlFor="product">Product</label>
                <select id="product" name="product" defaultValue="" required>
                  <option value="" disabled>
                    Please select the Divine Digital Product you will like to promote or be a referrer for
                  </option>
                  {PRODUCTS.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="refer-form-field">
                <label htmlFor="about">A bit about you</label>
                <textarea
                  id="about"
                  name="about"
                  rows={4}
                  placeholder="Tell us a bit about you, why are suited for the role and how you will achieve success in your selected region."
                />
              </div>

              <button type="submit" className="refer-join-submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>

              <p className="refer-join-legal">
                By signing in, you accept Divine Digital Technology's and Q-worship{' '}
                <a href="#">Privacy Policy</a> and <a href="#">User Agreement</a>.
              </p>
            </form>
          </SiteContainer>
        </section>
      </main>
      <Footer />
    </div>
  )
}
