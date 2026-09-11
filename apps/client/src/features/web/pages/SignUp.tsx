import { useEffect } from 'react'
import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { captureAttributionFromUrl } from '@/features/referee-portal/lib/referralAttribution'

export function SignUp() {
  useEffect(() => {
    captureAttributionFromUrl()
  }, [])

  return (
    <AuthPageShell>
      <SignUpForm />
      <AuthShowcase variant="card" ariaLabel="Sign up feature showcase" />
    </AuthPageShell>
  )
}
