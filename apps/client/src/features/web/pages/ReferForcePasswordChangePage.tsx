import { useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/auth.store'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'
import { ReferNavbar } from '@/components/sections/ReferNavbar'
import { SiteContainer } from '@/components/layout/SiteContainer'

export function ReferForcePasswordChangePage() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  const storedTempPassword = typeof window !== 'undefined' ? sessionStorage.getItem('qworship_pending_temp_password') : null
  const [currentPassword, setCurrentPassword] = useState(storedTempPassword || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/complete-first-login', { currentPassword, newPassword })
      return response.json()
    },
    onSuccess: (response) => {
      sessionStorage.removeItem('qworship_pending_temp_password')
      localStorage.setItem('token', response.token)
      useAuthStore.getState().setAuth(response.user)
      toast({ title: 'Password updated', description: 'Welcome to your Q-Worship Referrer dashboard.' })
      setLocation(response.nextStep || '/refer-and-earn/dashboard')
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't update password",
        description: error?.message?.replace(/^\d+:\s*/, '') || 'Please check your current password and try again.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!currentPassword.trim()) {
      toast({ title: 'Missing current password', description: 'Enter the temporary password you were emailed.', variant: 'destructive' })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Choose a password with at least 8 characters.', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: 'Make sure both new password fields match.', variant: 'destructive' })
      return
    }
    changePasswordMutation.mutate()
  }

  return (
    <div className="refer-signin-page">
      <ReferNavbar />
      <main className="refer-signin-main">
        <SiteContainer className="refer-signin-container">
          <h1 className="refer-signin-welcome font-headline font-bold">
            Set your <span className="refer-signin-welcome-accent">new password</span>
          </h1>

          <div className="refer-signin-card">
            <h2 className="refer-signin-title font-headline font-bold">Choose a password</h2>
            <p className="refer-signin-subtitle">
              For security, set your own password before continuing to your Referrer dashboard.
            </p>

            <form className="refer-signin-form" onSubmit={handleSubmit}>
              {!storedTempPassword && (
                <div className="refer-form-field">
                  <label htmlFor="currentPassword">Current (temporary) password</label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className="refer-form-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>

              <div className="refer-form-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              <button type="submit" className="refer-join-submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? 'Updating…' : 'Set Password & Continue'}
              </button>
            </form>
          </div>
        </SiteContainer>
      </main>
    </div>
  )
}
