import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'
import { useAuthStore } from '@/features/auth/auth.store'
import { ReferNavbar } from '@/components/sections/ReferNavbar'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function ReferSignInPage() {
  const [location, setLocation] = useLocation()
  const { toast } = useToast()
  const [formData, setFormData] = useState({ username: '', password: '' })

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

  const signInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/signin', formData)
      return response.json()
    },
    onSuccess: (response) => {
      if (response.user.role !== 'referee') {
        toast({
          title: 'Access denied',
          description: 'This portal is restricted to referral partners only.',
          variant: 'destructive',
        })
        return
      }

      localStorage.setItem('token', response.token)
      useAuthStore.getState().setAuth(response.user)

      if (response.user.mustChangePassword) {
        sessionStorage.setItem('qworship_pending_temp_password', formData.password)
        setLocation(response.nextStep || '/refer-and-earn/force-password-change')
        return
      }

      toast({ title: 'Welcome back', description: "You're signed in to the Q-Worship Referrer portal." })
      setLocation(response.nextStep || '/refer-and-earn/dashboard')
    },
    onError: () => {
      toast({
        title: 'Sign-in failed',
        description: 'Invalid credentials. Please check your username and password.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.username.trim() || !formData.password.trim()) {
      toast({ title: 'Missing information', description: 'Please enter both username and password.', variant: 'destructive' })
      return
    }
    signInMutation.mutate()
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
                <input
                  id="username"
                  name="username"
                  type="email"
                  placeholder="johndoe@email.com"
                  value={formData.username}
                  onChange={(event) => setFormData((prev) => ({ ...prev, username: event.target.value }))}
                  required
                />
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
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="refer-join-submit" disabled={signInMutation.isPending}>
                {signInMutation.isPending ? 'Signing in…' : 'Sign in'}
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
