import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { MaterialIcon } from './MaterialIcon'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  icon?: string
  iconFilled?: boolean
}

export function GlassButton({
  children,
  icon,
  iconFilled = false,
  className = '',
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={`glass-button text-white font-bold flex items-center gap-3 hover:bg-white/10 transition-all ${className}`}
      {...props}
    >
      {icon && <MaterialIcon name={icon} filled={iconFilled} />}
      {children}
    </button>
  )
}
