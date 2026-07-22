import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function PrimaryButton({ children, className = '', ...props }: PrimaryButtonProps) {
  return (
    <button
      className={`primary-gradient text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
