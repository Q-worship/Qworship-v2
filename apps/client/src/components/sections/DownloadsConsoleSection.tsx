import { useQuery } from '@tanstack/react-query'
import { downloadsPageCopy } from '@/lib/theme'
import { apiRequest, buildUrl } from '@/lib/queryClient'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { PlatformLogo } from '@/components/ui/PlatformLogos'

interface DesktopBuild {
  id: string
  version?: string
  minOs?: string
  fileSize?: number
  updatedAt?: string
}

interface DesktopDownloadsResponse {
  windows: DesktopBuild | null
  mac: DesktopBuild | null
}

const formatFileSize = (bytes?: number) =>
  bytes && bytes > 0 ? `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB` : null

export function DownloadsConsoleSection() {
  const { product, platforms } = downloadsPageCopy

  const { data: desktopDownloads } = useQuery<DesktopDownloadsResponse>({
    queryKey: ['/api/help/desktop-downloads'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/help/desktop-downloads')
      return await response.json()
    },
  })

  const builds: Record<string, DesktopBuild | null> = {
    windows: desktopDownloads?.windows ?? null,
    mac: desktopDownloads?.mac ?? null,
  }

  // Prefer the live published Windows build's version/date over the
  // static fallback copy, so this doesn't go stale once an admin
  // publishes a new build from the Resource Centre.
  const primaryBuild = builds.windows ?? builds.mac
  const versionLabel = primaryBuild?.version ? `Version ${primaryBuild.version}` : product.version
  const dateLabel = primaryBuild?.updatedAt
    ? new Date(primaryBuild.updatedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : product.date

  return (
    <section className="downloads-console-section section-gap reveal">
      <SiteContainer>
        <div className="downloads-console-grid">
          <div className="downloads-console-copy">
            <h2 className="downloads-product-title font-headline font-bold">{product.title}</h2>
            <p className="downloads-product-subtitle font-headline font-bold">{product.subtitle}</p>

            <div className="downloads-product-meta">
              <p>{versionLabel}</p>
              <p>{product.highlights}</p>
              <p>{dateLabel}</p>
            </div>

            <div className="downloads-platform-actions">
              {platforms.map((platform) => {
                const build = builds[platform.id]
                const fileSize = formatFileSize(build?.fileSize)

                return (
                  <a
                    key={platform.id}
                    href={
                      build
                        ? buildUrl(`/api/help/desktop-downloads/${platform.id}/download?source=downloads-page`)
                        : undefined
                    }
                    className={`downloads-platform-btn${build ? '' : ' downloads-platform-btn--disabled'}`}
                    aria-disabled={!build}
                    onClick={(event) => {
                      if (!build) event.preventDefault()
                    }}
                  >
                    <span>
                      {platform.label}
                      {build ? (
                        <span className="downloads-platform-btn-meta">
                          {build.version ? `v${build.version}` : null}
                          {fileSize ? ` · ${fileSize}` : null}
                        </span>
                      ) : (
                        <span className="downloads-platform-btn-meta">Coming soon</span>
                      )}
                    </span>
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
