import { colors, layout, typography } from '../../theme.js'
import { uiLabels } from '../../config/textConfig.js'
import SearchBar from './SearchBar.jsx'
import useAppStore from '../../store/appStore.js'

// TEMPORARY (demo): hide the Compare / split-screen button. Set back to true
// to restore the compare functionality after the demo presentation.
const SHOW_COMPARE = false

// Icon components (inline SVG — avoids any icon library dependency)
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/>
    </svg>
  )
}

function OverlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>
    </svg>
  )
}

function IconButton({ onClick, disabled, tooltip, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        background: active ? colors.ui.buttonActive : 'transparent',
        border: `1px solid ${disabled ? colors.ui.disabled : active ? colors.ui.accent : colors.ui.panelBorder}`,
        borderRadius: 6,
        color: disabled ? colors.ui.textDim : active ? colors.ui.accent : colors.ui.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: typography.fontSans,
        fontSize: 12,
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, color 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = colors.ui.buttonHover }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? colors.ui.buttonActive : 'transparent' }}
    >
      {children}
    </button>
  )
}

export default function Header({
  onHome,
  onSelectCountryLeft,
  onSelectRegionLeft,
  onSelectCountryRight,
  onSelectRegionRight,
  leftZoomLevel,
  rightZoomLevel,
}) {
  const splitScreenActive = useAppStore((s) => s.splitScreenActive)
  const overlayActive = useAppStore((s) => s.overlayActive)
  const setSplitScreenActive = useAppStore((s) => s.setSplitScreenActive)
  const setOverlayActive = useAppStore((s) => s.setOverlayActive)

  const overlayEnabled =
    splitScreenActive &&
    leftZoomLevel === rightZoomLevel &&
    (leftZoomLevel === 3 || leftZoomLevel === 4)

  const closeCompareDisabled = overlayActive

  function handleToggleSplit() {
    if (splitScreenActive) {
      if (!closeCompareDisabled) setSplitScreenActive(false)
    } else {
      setSplitScreenActive(true)
    }
  }

  function handleToggleOverlay() {
    setOverlayActive(!overlayActive)
  }

  const cell = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    overflow: 'hidden',
  }

  // Search cells must NOT clip: the autocomplete dropdown is absolutely
  // positioned below the input and would be hidden by `overflow: hidden`.
  const searchCell = { ...cell, overflow: 'visible' }

  return (
    <header
      style={{
        height: layout.headerHeight,
        background: colors.ui.header,
        borderBottom: `1px solid ${colors.ui.headerBorder}`,
        display: 'grid',
        gridTemplateColumns: splitScreenActive ? '2fr 3fr 2fr 3fr 2fr' : '2fr 8fr 2fr',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        flexShrink: 0,
        zIndex: 200,
        userSelect: 'none',
      }}
    >
      {/* Col 1: Title — left aligned */}
      <div style={{ ...cell, justifyContent: 'flex-start' }}>
        <span style={{
          fontFamily: typography.fontSans,
          fontSize: 20,
          fontWeight: 700,
          color: colors.ui.text,
          whiteSpace: 'nowrap',
        }}>
          {uiLabels.appTitle}
        </span>
      </div>

      {/* Col 2: Left (or only) search bar */}
      <div style={searchCell}>
        <SearchBar
          onSelectCountry={onSelectCountryLeft}
          onSelectRegion={onSelectRegionLeft}
          side={splitScreenActive ? 'left' : undefined}
        />
      </div>

      {/* Col 3 (split only): Overlay toggle */}
      {splitScreenActive && (
        <div style={cell}>
          <IconButton
            onClick={handleToggleOverlay}
            disabled={!overlayEnabled}
            active={overlayActive}
            tooltip={overlayActive ? uiLabels.buttons.separate.tooltip : uiLabels.buttons.overlay.tooltip}
          >
            <OverlayIcon />
            {overlayActive ? uiLabels.buttons.separate.label : uiLabels.buttons.overlay.label}
          </IconButton>
        </div>
      )}

      {/* Col 4 (split only): Right search bar */}
      {splitScreenActive && (
        <div style={searchCell}>
          <SearchBar
            onSelectCountry={onSelectCountryRight}
            onSelectRegion={onSelectRegionRight}
            side="right"
          />
        </div>
      )}

      {/* Col 3 or 5: Home + Compare — right aligned */}
      <div style={{ ...cell, gap: 8, justifyContent: 'flex-end' }}>
        {SHOW_COMPARE && (
          <IconButton
            onClick={handleToggleSplit}
            disabled={splitScreenActive && closeCompareDisabled}
            tooltip={splitScreenActive ? uiLabels.buttons.closeCompare.tooltip : uiLabels.buttons.openCompare.tooltip}
          >
            <CompareIcon />
            {splitScreenActive ? uiLabels.buttons.closeCompare.label : uiLabels.buttons.openCompare.label}
          </IconButton>
        )}
        <IconButton onClick={onHome} tooltip={uiLabels.buttons.home.tooltip}>
          <HomeIcon />
          {uiLabels.buttons.home.label}
        </IconButton>
      </div>
    </header>
  )
}
