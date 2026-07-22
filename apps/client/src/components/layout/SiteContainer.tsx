import type { ReactNode } from 'react'

interface SiteContainerProps {
  children: ReactNode
  className?: string
}

export function SiteContainer({ children, className = '' }: SiteContainerProps) {
  return (
    <div
      className={`w-full px-6 sm:px-8 md:px-10 lg:px-14 xl:px-16 2xl:px-20 ${className}`}
    >
      {children}
    </div>
  )
}
