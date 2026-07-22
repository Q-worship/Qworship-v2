import { AuthShowcase } from '@/components/auth/AuthShowcase'

/** @deprecated Use AuthShowcase directly */
export function LoginShowcase() {
  return <AuthShowcase variant="plain" ariaLabel="Login feature showcase" />
}
