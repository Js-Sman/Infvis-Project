import { useRef, useState, useCallback } from 'react'
import useAppStore from '../../store/appStore.js'
import { colors } from '../../theme.js'
import MapView from '../map/MapView.jsx'
import { ZOOM_LEVEL } from '../../hooks/useZoom.js'

export default function SplitScreenContainer({
  onSearchTargetLeft,
  onSearchTargetRight,
  searchTargetLeft,
  searchTargetRight,
  onSearchConsumedLeft,
  onSearchConsumedRight,
}) {
  const splitScreenActive = useAppStore((s) => s.splitScreenActive)
  const overlayActive = useAppStore((s) => s.overlayActive)
  const focusedCountryLeft = useAppStore((s) => s.focusedCountryLeft)
  const focusedCountryRight = useAppStore((s) => s.focusedCountryRight)

  const leftRef = useRef(null)
  const rightRef = useRef(null)

  const [leftZoomLevel, setLeftZoomLevel] = useState(ZOOM_LEVEL.WORLD)
  const [rightZoomLevel, setRightZoomLevel] = useState(ZOOM_LEVEL.WORLD)

  // Sync brush and hover year between Level 4 viewports
  const [sharedBrush, setSharedBrush] = useState(null)
  const [sharedHoverYear, setSharedHoverYear] = useState(null)

  const handleLeftBrush = useCallback((r) => setSharedBrush(r), [])
  const handleRightBrush = useCallback((r) => setSharedBrush(r), [])
  const handleLeftHoverYear = useCallback((y) => setSharedHoverYear(y), [])
  const handleRightHoverYear = useCallback((y) => setSharedHoverYear(y), [])

  // Notify parent of zoom level changes (for overlay button enablement)
  const handleLeftZoomChange = useCallback((level) => setLeftZoomLevel(level), [])
  const handleRightZoomChange = useCallback((level) => setRightZoomLevel(level), [])

  if (!splitScreenActive) {
    return (
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MapView
          ref={leftRef}
          side="left"
          onZoomLevelChange={handleLeftZoomChange}
          searchTarget={searchTargetLeft}
          onSearchConsumed={onSearchConsumedLeft}
          overlayActive={false}
          overlayOtherCountry={null}
        />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Left viewport */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MapView
          ref={leftRef}
          side="left"
          onZoomLevelChange={handleLeftZoomChange}
          syncBrush={sharedBrush}
          onBrushChange={handleLeftBrush}
          syncHoverYear={sharedHoverYear}
          onHoverYear={handleLeftHoverYear}
          overlayActive={overlayActive}
          overlayOtherCountry={focusedCountryRight}
          searchTarget={searchTargetLeft}
          onSearchConsumed={onSearchConsumedLeft}
        />
      </div>

      {/* Vertical separator */}
      <div
        style={{
          width: 2,
          background: colors.ui.separator,
          flexShrink: 0,
          zIndex: 50,
        }}
      />

      {/* Right viewport */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MapView
          ref={rightRef}
          side="right"
          onZoomLevelChange={handleRightZoomChange}
          syncBrush={sharedBrush}
          onBrushChange={handleRightBrush}
          syncHoverYear={sharedHoverYear}
          onHoverYear={handleRightHoverYear}
          overlayActive={overlayActive}
          overlayOtherCountry={focusedCountryLeft}
          searchTarget={searchTargetRight}
          onSearchConsumed={onSearchConsumedRight}
        />
      </div>
    </div>
  )
}
