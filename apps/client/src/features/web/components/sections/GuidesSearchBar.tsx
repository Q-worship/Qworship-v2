import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface GuidesSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function GuidesSearchBar({ value, onChange }: GuidesSearchBarProps) {
  return (
    <div className="guides-search-bar">
      <MaterialIcon name="search" className="guides-search-bar-icon" aria-hidden />
      <input
        type="search"
        className="guides-search-bar-input"
        placeholder="Search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search guides"
      />
      {value.length > 0 && (
        <button
          type="button"
          className="guides-search-bar-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <MaterialIcon name="close" className="guides-search-bar-clear-icon" />
        </button>
      )}
    </div>
  )
}
