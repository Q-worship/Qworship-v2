import type { CompatibleSystem } from '@/types/content'

interface LogoProps {
  className?: string
}

export function ObsLogo({ className = 'h-14 w-14' }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <circle cx="28" cy="28" r="26" stroke="white" strokeWidth="2" />
      <path
        d="M28 10C28 10 18 22 18 28C18 34 22.5 38 28 38C33.5 38 38 34 38 28C38 22 28 10 28 10Z"
        fill="white"
      />
      <path
        d="M28 18C28 18 22 26 22 30C22 33 24.5 35 28 35C31.5 35 34 33 34 30C34 26 28 18 28 18Z"
        fill="#09090B"
      />
      <path
        d="M10 28C10 28 22 18 28 18C34 18 38 22.5 38 28C38 33.5 34 38 28 38C22 38 10 28 10 28Z"
        fill="white"
        opacity="0.85"
      />
    </svg>
  )
}

export function ProPresenterLogo({ className = 'h-14 w-14' }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <path d="M8 40L22 8L36 40H8Z" fill="#E8752A" />
      <path d="M20 40L34 8L48 40H20Z" fill="#F5A623" opacity="0.95" />
    </svg>
  )
}

export function VmixLogo({ className = 'h-14 w-14' }: LogoProps) {
  const cells = [
    '#2B6CB0',
    '#2B6CB0',
    '#38A169',
    '#2B6CB0',
    '#2B6CB0',
    '#2B6CB0',
    '#E8752A',
    '#2B6CB0',
    '#2B6CB0',
  ]

  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      {cells.map((fill, index) => {
        const row = Math.floor(index / 3)
        const col = index % 3
        return (
          <rect
            key={index}
            x={8 + col * 14}
            y={8 + row * 14}
            width="12"
            height="12"
            rx="1"
            fill={fill}
          />
        )
      })}
    </svg>
  )
}

export function EasyWorshipLogo({ className = 'h-14 w-14' }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <path
        d="M14 10C14 10 14 46 14 46C14 46 44 28 44 28C44 28 14 10 14 10Z"
        fill="#1E6FD9"
      />
      <path
        d="M18 16C18 16 18 40 18 40C18 40 38 28 38 28C38 28 18 16 18 16Z"
        fill="#3B8EED"
      />
      <path
        d="M22 22C22 22 22 34 22 34C22 34 32 28 32 28C32 28 22 22 22 22Z"
        fill="#5AA8F5"
      />
    </svg>
  )
}

export function OpenLpLogo({ className = 'h-14 w-14' }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <circle cx="28" cy="28" r="22" fill="#1E6FD9" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="28"
          y1="28"
          x2={28 + 20 * Math.cos((angle * Math.PI) / 180)}
          y2={28 + 20 * Math.sin((angle * Math.PI) / 180)}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
      <circle cx="28" cy="28" r="6" fill="white" />
    </svg>
  )
}

const partnerLogoMap = {
  obs: ObsLogo,
  propresenter: ProPresenterLogo,
  vmix: VmixLogo,
  easyworship: EasyWorshipLogo,
  openlp: OpenLpLogo,
} as const

export function PartnerLogo({
  icon,
  className,
}: {
  icon: CompatibleSystem['icon']
  className?: string
}) {
  const Logo = partnerLogoMap[icon]
  return <Logo className={className} />
}
