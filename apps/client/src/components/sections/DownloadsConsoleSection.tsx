import { useEffect, useState } from 'react'
import { downloadsPageCopy } from '@/lib/theme'
import { apiRequest, buildUrl } from '@/lib/queryClient'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { PlatformLogo } from '@/components/ui/PlatformLogos'
import { buildUrl } from '@/lib/queryClient'

interface DesktopRelease {
  version?: string
  minOs?: string
  fileSize?: number
  createdAt?: string
}

interface DesktopDownloads {
  windows: DesktopRelease | null
  mac: DesktopRelease | null
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return null
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`
}

export function DownloadsConsoleSection() {
  const { product, platforms } = downloadsPageCopy
  const [releases, setReleases] = useState<DesktopDownloads>({ windows: null, mac: null })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(buildUrl('/api/help/desktop-downloads'), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load desktop releases')
        return response.json()
      })
      .then(setReleases)
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('[Downloads] Failed to load desktop releases:', error)
        }
      })
      .finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [])

  const availableReleases = [releases.windows, releases.mac].filter(Boolean) as DesktopRelease[]
  const latestRelease = availableReleases.sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )[0]

  return (
    <section className="downloads-console-section section-gap reveal">
      <SiteContainer>
        <div className="downloads-console-grid">
          <div className="downloads-console-copy">
            <h2 className="downloads-product-title font-headline font-bold">{product.title}</h2>
            <p className="downloads-product-subtitle font-headline font-bold">{product.subtitle}</p>

            <div className="downloads-product-meta">
              <p>{latestRelease?.version ? `Version ${latestRelease.version}` : product.version}</p>
              <p>{product.highlights}</p>
              <p>{latestRelease?.createdAt ? new Date(latestRelease.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
              }) : product.date}</p>
            </div>

            <div className="downloads-platform-actions">
              {platforms.map((platform) => {
                const release = releases[platform.id as keyof DesktopDownloads]
                const label = isLoading
                  ? `${platform.label} — loading`
                  : release
                    ? `${platform.label}${release.version ? ` v${release.version}` : ''}`
                    : `${platform.label} — coming soon`
                return (
                  <a
                    key={platform.id}
                    className={`downloads-platform-btn${release ? '' : ' is-disabled'}`}
                    href={release
                      ? buildUrl(`/api/help/desktop-downloads/${platform.id}/download?source=website-download-page`)
                      : undefined}
                    aria-disabled={!release}
                    onClick={event => { if (!release) event.preventDefault() }}
                    title={release
                      ? [release.minOs && `Minimum OS: ${release.minOs}`, formatBytes(release.fileSize)].filter(Boolean).join(' · ')
                      : `No published ${platform.label} release yet`}
                  >
                    <span>{label}</span>
                    {platform.icon && (
                      <PlatformLogo platform={platform.icon} className="downloads-platform-icon" />
                    )}
                  </a>
                )
              })}
            </div>
          </div>

          <div className="downloads-console-media">
            <img
              src={product.image}
              alt={product.imageAlt}
              className="downloads-console-image"
              loading="eager"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  )
}
