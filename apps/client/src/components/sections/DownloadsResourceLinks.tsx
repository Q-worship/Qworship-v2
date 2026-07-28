import { useState } from 'react'
import { downloadsPageCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

type PlatformFilter = 'windows' | 'macos'

export function DownloadsResourceLinks() {
  const { resourceLinks, resourceContent } = downloadsPageCopy
  const [openId, setOpenId] = useState<string | null>(null)
  const [platform, setPlatform] = useState<PlatformFilter>('windows')

  const toggleOpen = (id: string) => {
    setOpenId((current) => (current === id ? null : id))
  }

  const releaseNotesVersions = resourceContent.releaseVersions.filter(
    (version) => version.platform === platform,
  )

  return (
    <section className="downloads-resource-links-section section-gap reveal">
      <SiteContainer>
        <hr className="downloads-divider" />

        <div className="downloads-resource-links">
          {resourceLinks.map((link) => {
            const isOpen = openId === link.id

            return (
              <div key={link.id} className="downloads-resource-item">
                <button
                  type="button"
                  className="downloads-resource-link"
                  aria-expanded={isOpen}
                  onClick={() => toggleOpen(link.id)}
                >
                  <MaterialIcon name={link.icon} className="downloads-resource-link-icon" aria-hidden />
                  <span>{link.label}</span>
                  <MaterialIcon
                    name="expand_more"
                    className={`downloads-resource-link-chevron${isOpen ? ' downloads-resource-link-chevron--open' : ''}`}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <div className="downloads-resource-panel">
                    {link.id === 'feature-updates' &&
                      resourceContent.releaseVersions.map((version) => (
                        <article key={version.id} className="downloads-release-version">
                          <div className="downloads-release-version-header">
                            <h3>{version.version}</h3>
                            <p className="downloads-release-tagline">{version.tagline}</p>
                            <p className="downloads-release-date">
                              Released: {version.releasedDate} —{' '}
                              {version.platform === 'windows' ? 'Windows' : 'macOS'}
                            </p>
                          </div>

                          <div className="downloads-release-features">
                            {version.featureUpdates.map((feature) => (
                              <div key={feature.id} className="downloads-release-feature">
                                <h4>{feature.title}</h4>
                                <p>{feature.body}</p>
                                {feature.table && (
                                  <div className="downloads-release-table-wrap">
                                    <table className="downloads-release-table">
                                      <thead>
                                        <tr>
                                          <th>{feature.table.columnLabels[0]}</th>
                                          <th>{feature.table.columnLabels[1]}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {feature.table.rows.map((row) => (
                                          <tr key={row[0]}>
                                            <td>{row[0]}</td>
                                            <td>{row[1]}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}

                    {link.id === 'release-notes' && (
                      <>
                        <div className="downloads-release-platform-toggle" role="tablist">
                          <button
                            type="button"
                            role="tab"
                            aria-selected={platform === 'windows'}
                            className={`downloads-release-platform-btn${platform === 'windows' ? ' downloads-release-platform-btn--active' : ''}`}
                            onClick={() => setPlatform('windows')}
                          >
                            Windows
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={platform === 'macos'}
                            className={`downloads-release-platform-btn${platform === 'macos' ? ' downloads-release-platform-btn--active' : ''}`}
                            onClick={() => setPlatform('macos')}
                          >
                            macOS
                          </button>
                        </div>

                        {releaseNotesVersions.length === 0 ? (
                          <p className="downloads-release-empty">
                            macOS release notes are coming soon.
                          </p>
                        ) : (
                          releaseNotesVersions.map((version) => (
                            <article key={version.id} className="downloads-release-version">
                              <div className="downloads-release-version-header">
                                <h3>{version.version}</h3>
                                <p className="downloads-release-tagline">{version.tagline}</p>
                                <p className="downloads-release-date">
                                  Released: {version.releasedDate} —{' '}
                                  {version.platform === 'windows' ? 'Windows' : 'macOS'}
                                </p>
                              </div>

                              <ul className="downloads-release-notes-list">
                                {version.releaseNotes.map((note) => (
                                  <li key={note} className="downloads-release-notes-item">
                                    <span className="downloads-release-notes-icon">
                                      <MaterialIcon name="check" filled className="text-[12px]" />
                                    </span>
                                    <span>{note}</span>
                                  </li>
                                ))}
                              </ul>
                            </article>
                          ))
                        )}

                        <p className="downloads-release-footer">{resourceContent.releaseNotesFooter}</p>
                      </>
                    )}

                    {link.id === 'system-specifications' && (
                      <p className="downloads-release-empty">{resourceContent.systemSpecificationsNote}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SiteContainer>
    </section>
  )
}
