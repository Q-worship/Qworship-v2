import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'wouter'
import { useToast } from '@/hooks/use-toast'
import { ReferNavbar } from '@/components/sections/ReferNavbar'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function ReferSignInPage() {
  const [location] = useLocation()
  const { toast } = useToast()

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    toast({
      title: "Sign-in isn't wired up yet",
      description: "This form isn't connected to a backend yet — we'll follow up once it is.",
    })
  }

  return (
    <div className="refer-signin-page">
      <ReferNavbar />
      <main className="refer-signin-main">
        <SiteContainer className="refer-signin-container">
          <h1 className="refer-signin-welcome font-headline font-bold">
            Welcome <span className="refer-signin-welcome-accent">Referrer</span>
          </h1>

          <div className="refer-signin-card">
            <h2 className="refer-signin-title font-headline font-bold">Sign in</h2>
            <p className="refer-signin-subtitle">
              Please provide the information below to sign into your Divine Digital Referral account for
              Qworship and our other products
            </p>

            <form className="refer-signin-form" onSubmit={handleSubmit}>
              <div className="refer-form-field">
                <label htmlFor="username">Username</label>
                <input id="username" name="username" type="email" placeholder="johndoe@email.com" required />
              </div>

              <div className="refer-form-field">
                <div className="refer-signin-password-row">
                  <label htmlFor="password">Password</label>
                  <a href="#" className="refer-signin-forgot">
                    Forgotten password
                  </a>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Please provide your password"
                  required
                />
              </div>

              <button type="submit" className="refer-join-submit">
                Sign in
              </button>

              <p className="refer-join-legal">
                By signing in, you accept Divine Digital Technology's and Q-worship{' '}
                <a href="#">Privacy Policy</a> and <a href="#">User Agreement</a>.
              </p>
            </form>
          </div>
        </SiteContainer>
      </main>
    </div>
  )
}
