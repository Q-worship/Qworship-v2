import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { getStoredAuthUser } from '@/lib/authApi'
import { apiRequest } from '@/lib/queryClient'
import { images } from '@/lib/theme'

interface ProjectSummary {
  id: string
  name: string
  description?: string
  presentationDate?: string
  updatedAt?: string
  slideCount?: number
  serviceData?: unknown
}

export function ProjectSelectionView() {
  const [, navigate] = useLocation()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const user = getStoredAuthUser()
  const firstName = user?.firstName ?? 'there'

  useEffect(() => {
    let active = true
    apiRequest('GET', '/api/presentations')
      .then(response => response.json())
      .then(data => { if (active) setProjects(data.presentations || []) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load projects') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const filteredPresentations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return query ? projects.filter(project => project.name.toLowerCase().includes(query)) : projects
  }, [projects, searchQuery])

  const enterProject = (project: ProjectSummary) => {
    sessionStorage.setItem('qworship_current_presentation_id', project.id)
    sessionStorage.setItem('qworship_current_presentation_name', project.name)
    sessionStorage.setItem('qworship_presentation_to_load', JSON.stringify({ id: project.id, name: project.name }))
    navigate('/dashboard')
  }

  const createProject = async (event: FormEvent) => {
    event.preventDefault()
    const name = newProjectName.trim()
    if (!name) return
    setIsCreating(true)
    setError('')
    try {
      const response = await apiRequest('POST', '/api/presentations', { name, presentationDate: new Date().toISOString() })
      const data = await response.json()
      enterProject(data.presentation)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create project')
      setIsCreating(false)
    }
  }

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'

  return (
    <div className="project-selection">
      <header className="project-selection__header">
        <div className="project-selection__header-left">
          <img src={images.logo} alt="Q-Worship" className="project-selection__logo" />
          <div><h1 className="project-selection__greeting">Welcome, {firstName}</h1><p className="project-selection__subtext">Choose a project to continue or create a new one</p></div>
        </div>
        <time className="project-selection__date" dateTime={new Date().toISOString()}>{todayLabel}</time>
      </header>

      <main className="project-selection__main">
        <div className="project-selection__grid">
          <section className="project-selection__card">
            <div className="project-selection__card-head"><span className="project-selection__card-icon project-selection__card-icon--purple" aria-hidden="true">+</span><div><h2 className="project-selection__card-title">Create New Project</h2><p className="project-selection__card-subtitle">Start a fresh presentation for your service</p></div></div>
            {showCreateForm ? (
              <form onSubmit={createProject} className="project-selection__create-form">
                <label htmlFor="new-project-name" className="project-selection__card-subtitle">Project name</label>
                <input id="new-project-name" autoFocus required maxLength={120} className="project-selection__search" placeholder="e.g. Sunday Morning Service" value={newProjectName} onChange={event => setNewProjectName(event.target.value)} />
                <div className="project-selection__create-actions"><button type="button" className="project-selection__create-btn project-selection__create-btn--secondary" onClick={() => setShowCreateForm(false)}>Cancel</button><button type="submit" className="project-selection__create-btn" disabled={isCreating}>{isCreating ? 'Creating…' : 'Create and open'}</button></div>
              </form>
            ) : <button type="button" className="project-selection__create-btn" onClick={() => setShowCreateForm(true)}>+ Create New Presentation</button>}
          </section>

          <section className="project-selection__card">
            <div className="project-selection__card-head"><span className="project-selection__card-icon project-selection__card-icon--teal" aria-hidden="true">▤</span><div><h2 className="project-selection__card-title">Open Existing Project</h2><p className="project-selection__card-subtitle">Continue working on a previous presentation</p></div></div>
            <div className="project-selection__search-wrap"><span className="project-selection__search-icon" aria-hidden="true">⌕</span><input type="search" className="project-selection__search" placeholder="Search your presentations..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></div>
            {error ? <p className="login-form__error" role="alert">{error}</p> : null}
            {isLoading ? <p className="project-selection__card-subtitle" role="status">Loading your projects…</p> : null}
            {!isLoading && filteredPresentations.length === 0 ? <p className="project-selection__card-subtitle">{searchQuery ? 'No projects match your search.' : 'You have no projects yet. Create your first presentation.'}</p> : null}
            <ul className="project-selection__list">
              {filteredPresentations.map(project => <li key={project.id}><button type="button" className="project-selection__list-item" onClick={() => enterProject(project)}><div className="project-selection__list-top"><strong>{project.name}</strong><span>{project.description || 'Presentation project'}</span></div><div className="project-selection__list-meta"><span>{formatDate(project.presentationDate)}</span><span>Updated {formatDate(project.updatedAt)}</span><span>{project.slideCount || 0} slides</span></div></button></li>)}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
