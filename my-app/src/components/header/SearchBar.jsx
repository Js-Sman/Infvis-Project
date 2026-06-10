import { useState, useRef, useEffect } from 'react'
import { colors, typography } from '../../theme.js'
import { uiLabels } from '../../config/textConfig.js'
import { subRegions } from '../../config/continentConfig.js'
import { countryRegionMap } from '../../config/continentConfig.js'

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

  useEffect(() => {
    if (query.trim().length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const q = query.toLowerCase()
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
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault()
      handleSelect(suggestions[focusedIdx])
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
                {item.type === 'country' ? 'country' : 'region'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
