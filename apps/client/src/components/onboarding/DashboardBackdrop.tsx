import { images } from '@/lib/theme'

const sidebarItems = [
  'Dashboard',
  'Presentations',
  'Songs',
  'Bible',
  'Media',
  'Announcements',
  'Settings',
]

export function DashboardBackdrop() {
  return (
    <div className="dashboard-backdrop" aria-hidden="true">
      <header className="dashboard-backdrop__header">
        <div className="dashboard-backdrop__logo">
          <img src={images.logo} alt="" className="dashboard-backdrop__logo-image" />
          <span className="dashboard-backdrop__logo-text">Q-Worship</span>
        </div>
        <div className="dashboard-backdrop__header-actions">
          <span className="dashboard-backdrop__pill" />
          <span className="dashboard-backdrop__avatar" />
        </div>
      </header>

      <div className="dashboard-backdrop__body">
        <aside className="dashboard-backdrop__sidebar">
          <nav className="dashboard-backdrop__nav">
            {sidebarItems.map((item, index) => (
              <div
                key={item}
                className={`dashboard-backdrop__nav-item${
                  index === 0 ? ' dashboard-backdrop__nav-item--active' : ''
                }`}
              >
                <span className="dashboard-backdrop__nav-icon" />
                <span>{item}</span>
              </div>
            ))}
          </nav>
        </aside>

        <main className="dashboard-backdrop__main">
          <div className="dashboard-backdrop__greeting">
            <span className="dashboard-backdrop__line dashboard-backdrop__line--lg" />
            <span className="dashboard-backdrop__line dashboard-backdrop__line--md" />
          </div>

          <div className="dashboard-backdrop__grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="dashboard-backdrop__card">
                <span className="dashboard-backdrop__card-thumb" />
                <span className="dashboard-backdrop__line dashboard-backdrop__line--sm" />
                <span className="dashboard-backdrop__line dashboard-backdrop__line--xs" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
