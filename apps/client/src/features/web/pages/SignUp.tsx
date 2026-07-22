import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { SignUpForm } from '@/components/auth/SignUpForm'

export function SignUp() {
  return (
    <AuthPageShell>
      <SignUpForm />
      <AuthShowcase variant="card" ariaLabel="Sign up feature showcase" />
    </AuthPageShell>
  )
}
