import { Link } from 'wouter'
import { useMemo, useState } from 'react'
import { aboutJobOpenings, aboutJobOpeningsCopy } from '@/lib/theme'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function AboutJobOpeningsSection() {
  const [query, setQuery] = useState('')

  const filteredOpenings = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return aboutJobOpenings

    return aboutJobOpenings.filter(
      (opening) =>
        opening.title.toLowerCase().includes(normalized) ||
        opening.location.toLowerCase().includes(normalized) ||
        opening.category.toLowerCase().includes(normalized),
    )
  }, [query])

  const sequentialGroups = useMemo(() => {
    const groups: { category: string; openings: typeof filteredOpenings }[] = []

    filteredOpenings.forEach((opening) => {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup?.category === opening.category) {
        lastGroup.openings.push(opening)
        return
      }

      groups.push({ category: opening.category, openings: [opening] })
    })

    return groups
  }, [filteredOpenings])

  return (
    <section className="about-light-section about-openings-section section-gap reveal">
      <SiteContainer>
        <div className="about-openings-intro">
          <h2 className="about-openings-heading font-headline font-bold">{aboutJobOpeningsCopy.title}</h2>
          <p className="about-openings-body">{aboutJobOpeningsCopy.intro}</p>
        </div>

        <div className="about-openings-search-wrap">
          <MaterialIcon name="search" className="about-openings-search-icon" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="about-openings-search"
            aria-label="Search job openings"
          />
        </div>

        <p className="about-openings-count">3 Openings</p>

        <div className="about-openings-list">
          {sequentialGroups.length === 0 ? (
            <p className="about-openings-empty">No openings match your search.</p>
          ) : (
            sequentialGroups.map((group) => (
              <div key={`${group.category}-${group.openings[0]?.id}`} className="about-openings-group">
                <h3 className="about-openings-group-title font-headline font-bold">{group.category}</h3>

                {group.openings.map((opening) => (
                  <div key={opening.id} className="about-openings-row">
                    <Link href={`/about/careers/${opening.id}`} className="about-openings-row-link">
                      <p className="about-openings-row-title font-headline font-bold">{opening.title}</p>
                      <p className="about-openings-row-location">{opening.location}</p>
                    </Link>
                    <Link href={`/about/careers/${opening.id}#apply`} className="about-openings-apply-btn">
                      Apply
                    </Link>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </SiteContainer>
    </section>
  )
}
