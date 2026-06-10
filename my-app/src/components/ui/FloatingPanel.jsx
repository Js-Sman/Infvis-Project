import { useEffect, useRef } from 'react'
import { colors, layout, typography } from '../../theme.js'

// Renders a floating panel positioned to the LEFT of the cursor.
// `x` and `y` are viewport coordinates (from mousemove events).
// `children` is the panel content.
export default function FloatingPanel({ x, y, children, visible }) {
  const ref = useRef(null)

  if (!visible) return null

  const offsetX = -12  // gap between cursor and panel right edge
  const offsetY = -16  // vertical alignment

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y + offsetY,
        transform: 'translateX(calc(-100% - ' + Math.abs(offsetX) + 'px))',
        zIndex: 1000,
        pointerEvents: 'none',
        fontFamily: typography.fontSans,
        maxWidth: layout.floatingPanelWidth,
        minWidth: 160,
      }}
    >
      <div
        style={{
          background: colors.ui.panel,
          border: `1px solid ${colors.ui.panelBorder}`,
          borderRadius: 8,
          padding: '10px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          color: colors.ui.text,
          fontSize: 13,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Row helper used inside floating panels
export function PanelRow({ label, value, highlight, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
      <span style={{ color: colors.ui.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? typography.fontMono : typography.fontSans,
          fontSize: highlight ? 14 : 13,
          fontWeight: highlight ? 700 : 400,
          color: highlight ? colors.ui.accent : colors.ui.text,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// Panel title
export function PanelTitle({ children }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 14, color: colors.ui.text, marginBottom: 6, borderBottom: `1px solid ${colors.ui.panelBorder}`, paddingBottom: 6 }}>
      {children}
    </div>
  )
}

// Warning line for missing data
export function PanelWarning({ children }) {
  return (
    <div style={{ color: colors.starPlotMissingDot || '#9ca3af', fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
      {children}
    </div>
  )
}
