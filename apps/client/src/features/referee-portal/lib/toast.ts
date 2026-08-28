// Sonner-compatible shim so pages ported from the referrer-portal wireframe
// (which call toast.success/error/info(message, { description })) work
// unchanged against this app's own toast system.
import { toast as baseToast } from '@/hooks/use-toast'

type Options = { description?: string }

function success(message: string, options?: Options) {
  baseToast({ title: message, description: options?.description })
}

function error(message: string, options?: Options) {
  baseToast({ title: message, description: options?.description, variant: 'destructive' })
}

function info(message: string, options?: Options) {
  baseToast({ title: message, description: options?.description })
}

export const toast = { success, error, info }
