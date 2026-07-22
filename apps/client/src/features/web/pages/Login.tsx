import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { LoginForm } from '@/components/auth/LoginForm'

export function Login() {
  return (
    <AuthPageShell>
      <LoginForm />
      <AuthShowcase variant="plain" ariaLabel="Login feature showcase" />
    </AuthPageShell>
  )
}
