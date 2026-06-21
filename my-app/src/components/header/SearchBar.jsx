import { useState, useRef, useEffect } from 'react'
import { colors, typography } from '../../theme.js'
import { uiLabels } from '../../config/textConfig.js'
import { subRegions } from '../../config/continentConfig.js'
import { countryRegionMap } from '../../config/continentConfig.js'
import useAppStore from '../../store/appStore.js'

// Timeline bounds — must match MIN_YEAR / MAX_YEAR in Timeline.jsx.
const MIN_YEAR = 1900
const MAX_YEAR = 2018

const ALL_COUNTRIES = Object.keys(countryRegionMap).sort()
const ALL_REGIONS = subRegions.map((r) => ({ name: r.name, id: r.id, type: 'region' }))
const ALL_SEARCHABLE = [
  ...ALL_COUNTRIES.map((c) => ({ name: c, type: 'country' })),
  ...ALL_REGIONS,
]

export default function SearchBar({ onSelectCountry, onSelectRegion, side }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const setCurrentYear = useAppStore((s) => s.setCurrentYear)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }
    // Numeric query → offer a year jump (when it falls inside the timeline range).
    if (/^\d{1,4}$/.test(trimmed)) {
      const year = parseInt(trimmed, 10)
      const results = year >= MIN_YEAR && year <= MAX_YEAR
        ? [{ name: String(year), type: 'year', value: year }]
        : []
      setSuggestions(results)
      setOpen(results.length > 0)
      setFocusedIdx(-1)
      return
    }
    const q = trimmed.toLowerCase()
    const results = ALL_SEARCHABLE.filter((item) =>
      item.name.toLowerCase().includes(q)
    ).slice(0, 10)
    setSuggestions(results)
    setOpen(results.length > 0)
    setFocusedIdx(-1)
  }, [query])

  function handleSelect(item) {
    setQuery('')
    setOpen(false)
    if (item.type === 'country') {
      onSelectCountry?.(item.name)
    } else if (item.type === 'year') {
      setCurrentYear(Math.max(MIN_YEAR, Math.min(MAX_YEAR, item.value)))
    } else {
      onSelectRegion?.(item.id)
    }
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Use the focused suggestion, or fall back to the top one (handy for years).
      const pick = focusedIdx >= 0 ? suggestions[focusedIdx] : suggestions[0]
      if (pick) {
        e.preventDefault()
        handleSelect(pick)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => query && suggestions.length && setOpen(true)}
        placeholder={uiLabels.search.placeholder}
        style={{
          width: '100%',
          background: colors.ui.buttonHover,
          border: `1px solid ${colors.ui.panelBorder}`,
          borderRadius: 6,
          padding: '5px 12px',
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: colors.ui.text,
          outline: 'none',
        }}
      />
      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: colors.ui.panel,
            border: `1px solid ${colors.ui.panelBorder}`,
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 9999,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((item, idx) => (
            <div
              key={item.name}
              onMouseDown={() => handleSelect(item)}
              style={{
                padding: '7px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                background: idx === focusedIdx ? colors.ui.buttonActive : 'transparent',
                color: colors.ui.text,
                fontSize: 13,
                fontFamily: typography.fontSans,
              }}
            >
              <span>{item.name}</span>
              <span
                style={{
                  fontSize: 11,
                  color: colors.ui.textDim,
                  background: colors.surfaceAlt,
                  borderRadius: 3,
                  padding: '1px 5px',
                }}
              >
                {item.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
