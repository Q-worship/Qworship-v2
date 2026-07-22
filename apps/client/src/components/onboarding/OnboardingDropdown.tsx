import { useEffect, useRef, useState } from 'react'

interface OnboardingDropdownProps {
  id: string
  label: string
  value: string
  placeholder: string
  options: readonly string[]
  onChange: (value: string) => void
  displayValue?: string
}

export function OnboardingDropdown({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
  displayValue,
}: OnboardingDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const shownValue = displayValue ?? value

  return (
    <div className="onboarding-field" ref={rootRef}>
      <label className="onboarding-field__label" htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        className={`onboarding-dropdown${open ? ' onboarding-dropdown--open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={shownValue ? '' : 'onboarding-dropdown__placeholder'}>
          {shownValue || placeholder}
        </span>
        <span className="onboarding-dropdown__chevron" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="onboarding-dropdown__menu" role="listbox">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={value === option}
                className={`onboarding-dropdown__option${
                  value === option ? ' onboarding-dropdown__option--active' : ''
                }`}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
