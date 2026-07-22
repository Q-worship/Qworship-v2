import { downloadsPageCopy } from '@/lib/theme'

export function DownloadsBannerSection() {
  const { banner } = downloadsPageCopy

  return (
    <section
      className="downloads-banner reveal active"
      style={{ backgroundImage: `url(${banner.image})` }}
    >
      <div className="downloads-banner-overlay" aria-hidden />
      <h1 className="downloads-banner-title font-headline font-bold">{banner.title}</h1>
    </section>
  )
}
