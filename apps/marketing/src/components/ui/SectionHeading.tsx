import type { ReactNode } from 'react'

interface SectionHeadingProps {
  title: ReactNode
  subtitle?: ReactNode
  className?: string
  align?: 'left' | 'center'
}

export function SectionHeading({
  title,
  subtitle,
  className = '',
  align = 'center',
}: SectionHeadingProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={`${alignClass} ${className}`}>
      <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{title}</h2>
      {subtitle && (
        <p className={`text-on-surface-variant text-base sm:text-lg ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
