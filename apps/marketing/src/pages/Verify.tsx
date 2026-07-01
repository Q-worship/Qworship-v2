import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { VerifyForm } from '@/components/auth/VerifyForm'

export function Verify() {
  return (
    <AuthPageShell>
      <VerifyForm />
      <AuthShowcase
        variant="card"
        initialSlide={3}
        ariaLabel="Verification feature showcase"
      />
    </AuthPageShell>
  )
}
