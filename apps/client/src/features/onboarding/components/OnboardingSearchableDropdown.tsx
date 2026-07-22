import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { PRIORITY_COUNTRY_COUNT } from '@/lib/countries'

interface OnboardingSearchableDropdownProps {
  id: string
  label: string
  value: string
  placeholder: string
  options: readonly string[]
  onChange: (value: string) => void
  priorityCount?: number
}

export function OnboardingSearchableDropdown({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
  priorityCount = PRIORITY_COUNTRY_COUNT,
}: OnboardingSearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return [...options]
    return options.filter((option) => option.toLowerCase().includes(query))
  }, [options, search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      setHighlightedIndex(0)
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [search])

  useEffect(() => {
    if (!open || !listRef.current) return
    const highlighted = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`,
    )
    highlighted?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, open, filteredOptions.length])

  const selectOption = (option: string) => {
    onChange(option)
    setOpen(false)
    setSearch('')
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) =>
        filteredOptions.length === 0 ? 0 : Math.min(current + 1, filteredOptions.length - 1),
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter' && filteredOptions.length > 0) {
      event.preventDefault()
      selectOption(filteredOptions[highlightedIndex])
    }
  }

  const showPrioritySeparator =
  search.trim() === '' && priorityCount > 0 && filteredOptions.length > priorityCount

  return (
    <div className="onboarding-field" ref={rootRef}>
      <label className="onboarding-field__label" htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        className={`onboarding-dropdown${open ? ' onboarding-dropdown--open' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={value ? '' : 'onboarding-dropdown__placeholder'}>
          {value || placeholder}
        </span>
        <span className="onboarding-dropdown__chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="onboarding-dropdown__panel">
          <input
            ref={searchRef}
            type="text"
            className="onboarding-dropdown__search"
            placeholder="Search countries..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search countries"
          />
          <ul
            ref={listRef}
            id={listboxId}
            className="onboarding-dropdown__menu onboarding-dropdown__menu--scrollable"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="onboarding-dropdown__empty">No countries found</li>
            ) : (
              filteredOptions.map((option, index) => (
                <li key={option}>
                  {showPrioritySeparator && index === priorityCount ? (
                    <div className="onboarding-dropdown__separator" role="separator" />
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    data-option-index={index}
                    aria-selected={value === option}
                    className={`onboarding-dropdown__option${
                      value === option ? ' onboarding-dropdown__option--active' : ''
                    }${highlightedIndex === index ? ' onboarding-dropdown__option--highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(option)}
                  >
                    {option}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
