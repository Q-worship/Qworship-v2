import { downloadsPageCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function DownloadsResourceLinks() {
  const { resourceLinks } = downloadsPageCopy

  return (
    <section className="downloads-resource-links-section section-gap reveal">
      <SiteContainer>
        <hr className="downloads-divider" />

        <div className="downloads-resource-links">
          {resourceLinks.map((link) => (
            <button key={link.id} type="button" className="downloads-resource-link">
              <MaterialIcon name={link.icon} className="downloads-resource-link-icon" aria-hidden />
              <span>{link.label}</span>
            </button>
          ))}
        </div>
      </SiteContainer>
    </section>
  )
}
