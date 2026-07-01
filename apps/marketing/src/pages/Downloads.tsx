import { DownloadsBannerSection } from '@/components/sections/DownloadsBannerSection'
import { DownloadsConsoleSection } from '@/components/sections/DownloadsConsoleSection'
import { DownloadsOnlineCtaSection } from '@/components/sections/DownloadsOnlineCtaSection'
import { DownloadsResourceLinks } from '@/components/sections/DownloadsResourceLinks'

export function Downloads() {
  return (
    <>
      <DownloadsBannerSection />
      <DownloadsConsoleSection />
      <DownloadsResourceLinks />
      <DownloadsOnlineCtaSection />
    </>
  )
}
