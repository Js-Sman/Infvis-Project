import { useEffect, useRef, useState, useCallback } from 'react'
import useAppStore from '../../store/appStore.js'
import { colors, layout, typography } from '../../theme.js'
import PlaybackControls from './PlaybackControls.jsx'

const MIN_YEAR = 1900
const MAX_YEAR = 2018
const SPEED_LEVELS = [1, 2, 4, 8, 16]

export default function Timeline({ hidden }) {
  const currentYear = useAppStore((s) => s.currentYear)
  const setCurrentYear = useAppStore((s) => s.setCurrentYear)

  const [playing, setPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(2) // default 4x
  const [brushRange, setBrushRange] = useState(null) // [start, end] or null
  const [draggingBrush, setDraggingBrush] = useState(null) // 'start'|'end'|'range'

  const intervalRef = useRef(null)
  const sliderRef = useRef(null)
  const speed = SPEED_LEVELS[speedIdx]

  const loopMin = brushRange ? brushRange[0] : MIN_YEAR
  const loopMax = brushRange ? brushRange[1] : MAX_YEAR

  // Playback tick
  useEffect(() => {
    if (!playing) {
      clearInterval(intervalRef.current)
      return
    }
    clearInterval(intervalRef.current)
    const msPerYear = 800 / speed
    intervalRef.current = setInterval(() => {
      setCurrentYear((prev) => {
        const next = prev + 1
        if (next > loopMax) return loopMin
        return next
      })
    }, msPerYear)
    return () => clearInterval(intervalRef.current)
  }, [playing, speed, loopMin, loopMax])

  function handleSliderChange(e) {
    if (playing) setPlaying(false)
    setCurrentYear(parseInt(e.target.value, 10))
  }

  function handleSpeedUp() {
    setSpeedIdx((i) => Math.min(i + 1, SPEED_LEVELS.length - 1))
  }

  function handleSpeedDown() {
    setSpeedIdx((i) => Math.max(i - 1, 0))
  }

  // Year position as 0–1 fraction
  function yearToFrac(y) {
    return (y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)
  }

  if (hidden) return null

  const trackBg = brushRange
    ? `linear-gradient(to right,
        ${colors.ui.panelBorder} 0%,
        ${colors.ui.panelBorder} ${yearToFrac(brushRange[0]) * 100}%,
        ${colors.ui.accent} ${yearToFrac(brushRange[0]) * 100}%,
        ${colors.ui.accent} ${yearToFrac(brushRange[1]) * 100}%,
        ${colors.ui.panelBorder} ${yearToFrac(brushRange[1]) * 100}%,
        ${colors.ui.panelBorder} 100%)`
    : colors.ui.panelBorder

  return (
    <div
      style={{
        height: layout.timelineHeight,
        background: colors.ui.header,
        borderTop: `1px solid ${colors.ui.headerBorder}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        flexShrink: 0,
        zIndex: 100,
        userSelect: 'none',
      }}
    >
      <PlaybackControls
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
        onSpeedUp={handleSpeedUp}
        onSpeedDown={handleSpeedDown}
        speed={speed}
      />

      {/* Year display */}
      <span
        style={{
          fontFamily: typography.fontMono,
          fontSize: 16,
          fontWeight: 700,
          color: colors.ui.text,
          minWidth: 44,
          textAlign: 'right',
        }}
      >
        {currentYear}
      </span>

      {/* Slider + brush overlay */}
      <div style={{ position: 'relative', flex: 1, height: 28, display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            background: trackBg,
            pointerEvents: 'none',
          }}
        />

        {/* Brush range handles */}
        {brushRange && (
          <>
            <div
              style={{
                position: 'absolute',
                left: `${yearToFrac(brushRange[0]) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 10,
                height: 18,
                background: colors.ui.accent,
                borderRadius: 3,
                cursor: 'ew-resize',
                zIndex: 3,
              }}
              onMouseDown={() => setDraggingBrush('start')}
            />
            <div
              style={{
                position: 'absolute',
                left: `${yearToFrac(brushRange[1]) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 10,
                height: 18,
                background: colors.ui.accent,
                borderRadius: 3,
                cursor: 'ew-resize',
                zIndex: 3,
              }}
              onMouseDown={() => setDraggingBrush('end')}
            />
          </>
        )}

        {/* Main slider — native thumb hidden; visual thumb below */}
        <input
          ref={sliderRef}
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          step={1}
          value={currentYear}
          onChange={handleSliderChange}
          style={{
            position: 'relative',
            width: '100%',
            zIndex: 2,
            WebkitAppearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        />

        {/* Animated visual thumb */}
        <div
          style={{
            position: 'absolute',
            left: `${yearToFrac(currentYear) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: colors.ui.accent,
            border: `2px solid ${colors.ui.header}`,
            boxShadow: `0 0 0 2px ${colors.ui.accent}44`,
            pointerEvents: 'none',
            zIndex: 3,
            transition: 'left 0.18s linear',
          }}
        />
      </div>

      {/* Year range labels */}
      <span style={{ fontFamily: typography.fontMono, fontSize: 11, color: colors.ui.textDim, whiteSpace: 'nowrap' }}>
        {MIN_YEAR} – {MAX_YEAR}
      </span>

      {/* Brush clear */}
      {brushRange && (
        <button
          onClick={() => setBrushRange(null)}
          title="Clear time selection"
          style={{
            background: 'transparent',
            border: `1px solid ${colors.ui.panelBorder}`,
            borderRadius: 5,
            color: colors.ui.textMuted,
            fontSize: 11,
            padding: '2px 8px',
            cursor: 'pointer',
            fontFamily: typography.fontSans,
          }}
        >
          Clear
        </button>
      )}

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: transparent;
          cursor: pointer;
          border: none;
          box-shadow: none;
          margin-top: -6px;
        }
        input[type=range]::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 2px;
          background: transparent;
        }
      `}</style>
    </div>
  )
}
