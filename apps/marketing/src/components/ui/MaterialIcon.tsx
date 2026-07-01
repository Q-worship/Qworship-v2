interface MaterialIconProps {
  name: string
  filled?: boolean
  className?: string
}

export function MaterialIcon({ name, filled = false, className = '' }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : undefined
      }
    >
      {name}
    </span>
  )
}
