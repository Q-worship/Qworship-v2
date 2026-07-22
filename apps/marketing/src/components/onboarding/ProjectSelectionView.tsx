import { useMemo, useState } from 'react'
import { getStoredAuthUser } from '@/lib/authApi'
import { images } from '@/lib/theme'
import { mockPresentations } from '@/lib/onboardingMockPresentations'

export function ProjectSelectionView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showToast, setShowToast] = useState(true)

  const user = getStoredAuthUser()
  const firstName = user?.firstName ?? 'John'

  const filteredPresentations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return mockPresentations
    return mockPresentations.filter((presentation) =>
      presentation.name.toLowerCase().includes(query),
    )
  }, [searchQuery])

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="project-selection">
      <header className="project-selection__header">
        <div className="project-selection__header-left">
          <img
            src={images.logo}
            alt=""
            className="project-selection__logo"
          />
          <div>
            <h1 className="project-selection__greeting">
              Welcome back, {firstName}
            </h1>
            <p className="project-selection__subtext">
              Choose a project to continue or create a new one
            </p>
          </div>
        </div>
        <time className="project-selection__date" dateTime={new Date().toISOString()}>
          {todayLabel}
        </time>
      </header>

      <main className="project-selection__main">
        <div className="project-selection__grid">
          <section className="project-selection__card">
            <div className="project-selection__card-head">
              <span className="project-selection__card-icon project-selection__card-icon--purple" aria-hidden="true">
                +
              </span>
              <div>
                <h2 className="project-selection__card-title">Create New Project</h2>
                <p className="project-selection__card-subtitle">
                  Start a fresh presentation for your service
                </p>
              </div>
            </div>
            <button type="button" className="project-selection__create-btn">
              + Create New Presentation
            </button>
          </section>

          <section className="project-selection__card">
            <div className="project-selection__card-head">
              <span className="project-selection__card-icon project-selection__card-icon--teal" aria-hidden="true">
                ▤
              </span>
              <div>
                <h2 className="project-selection__card-title">Open Existing Project</h2>
                <p className="project-selection__card-subtitle">
                  Continue working on a previous presentation
                </p>
              </div>
            </div>

            <div className="project-selection__search-wrap">
              <span className="project-selection__search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                className="project-selection__search"
                placeholder="Search your presentations..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <ul className="project-selection__list">
              {filteredPresentations.map((presentation) => (
                <li key={presentation.id}>
                  <button type="button" className="project-selection__list-item">
                    <div className="project-selection__list-top">
                      <strong>{presentation.name}</strong>
                      <span>Scheduled for {presentation.scheduledFor}</span>
                    </div>
                    <div className="project-selection__list-meta">
                      <span>{presentation.scheduledFor}</span>
                      <span>{presentation.modified}</span>
                      <span>{presentation.slideCount} slides</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      {showToast ? (
        <aside className="project-selection__toast" role="status">
          <button
            type="button"
            className="project-selection__toast-close"
            aria-label="Dismiss"
            onClick={() => setShowToast(false)}
          >
            ×
          </button>
          <p className="project-selection__toast-title">Welcome back!</p>
          <p className="project-selection__toast-body">
            You have successfully signed in to Q-worship.
          </p>
        </aside>
      ) : null}
    </div>
  )
}
