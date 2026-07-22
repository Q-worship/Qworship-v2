import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function GlassCard({ children, className = '', glow = false }: GlassCardProps) {
  return (
    <div className={`glass-card ${glow ? 'glow-border' : ''} ${className}`}>
      {children}
    </div>
  )
}
