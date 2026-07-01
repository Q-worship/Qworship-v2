import type { PlatformId } from '@/types/content'

interface LogoProps {
  className?: string
}

export function WindowsLogo({ className = 'h-[1.125rem] w-[1.125rem]' }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M3 12.5V4.2l7.2 1.05v7.25H3Zm8.2 0V5.05L21 3v9.5h-9.8ZM3 20.8v-7.3h7.2v8.35L3 20.8Zm8.2.7V13.5H21V21l-9.8-1.5Z" />
    </svg>
  )
}

export function AppleLogo({ className = 'h-[1.125rem] w-[1.125rem]' }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.88 12.73c.02 2.54 2.22 3.39 2.25 3.4-.02.07-.35 1.2-1.16 2.38-.7 1.02-1.43 2.03-2.58 2.05-1.13.02-1.49-.67-2.78-.67-1.3 0-1.7.65-2.77.69-1.11.04-1.96-1.12-2.67-2.13-1.45-2.1-2.56-5.93-1.07-8.52.74-1.28 2.06-2.09 3.5-2.11 1.09-.02 2.12.73 2.78.73.66 0 1.9-.9 3.21-.77.55.02 2.1.22 3.09 1.67-2.55 1.39-2.14 5.01.3 6.11ZM14.3 4.25c.58-.71 1.02-1.7.9-2.7-.88.04-1.94.59-2.57 1.3-.54.62-1.01 1.62-.88 2.58.93.07 1.89-.47 2.55-1.18Z"
      />
    </svg>
  )
}

const platformLogoMap = {
  windows: WindowsLogo,
  mac: AppleLogo,
} as const

export function PlatformLogo({
  platform,
  className,
}: {
  platform: PlatformId
  className?: string
}) {
  const Logo = platformLogoMap[platform]
  return <Logo className={className} />
}
