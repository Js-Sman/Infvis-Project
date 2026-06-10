import * as d3 from 'd3'

export const colors = {
  background: '#0f1117',
  surface: '#1a1d27',
  surfaceAlt: '#22263a',

  democracyScale: {
    low: '#d63333',
    mid: '#f5f5f5',
    high: '#2a5fc4',
  },

  noData: '#4a4a52',
  faded: '#1e2030',
  fadedStroke: '#2e3050',
  continentStroke: '#6b7280',
  countryStroke: '#374151',
  hoverStroke: '#e5e7eb',

  starPlotAxes: {
    giniIndex: '#f472b6',
    unemployment: '#a78bfa',
    corruption: '#fb923c',
    lifeExpectancy: '#84cc16',
    happiness: '#facc15',
    suicideRate: '#ef4444',
    literacyRate: '#60a5fa',
    inflation: '#22d3ee',
  },

  starPlotPolygon: 'rgba(255,255,255,0.12)',
  starPlotStroke: 'rgba(255,255,255,0.5)',
  starPlotGrid: 'rgba(255,255,255,0.1)',
  starPlotAxisLine: 'rgba(255,255,255,0.2)',
  starPlotLabel: '#d1d5db',
  starPlotMissingDot: '#6b7280',

  lineChart: {
    line: '#60a5fa',
    dashLine: '#4b6fa3',
    hover: '#93c5fd',
    brush: 'rgba(96,165,250,0.15)',
    silhouette: 'rgba(255,255,255,0.06)',
  },

  ui: {
    header: '#0d0f18',
    headerBorder: '#1e2235',
    panel: '#1a1d2e',
    panelBorder: '#2a2f4a',
    separator: '#2a2f4a',
    tooltip: '#111827',
    text: '#e5e7eb',
    textMuted: '#9ca3af',
    textDim: '#6b7280',
    accent: '#60a5fa',
    buttonHover: '#1e2235',
    buttonActive: '#252a40',
    disabled: '#374151',
  },
}

export const getDemocracyColor = d3
  .scaleDiverging()
  .domain([-10, 0, 10])
  .interpolator(
    d3.interpolateLab(colors.democracyScale.low, colors.democracyScale.high)
  )

export const getDemocracyColorFull = (value) => {
  if (value == null) return colors.noData
  const clamped = Math.max(-10, Math.min(10, value))
  if (clamped <= 0) {
    return d3.interpolateLab(colors.democracyScale.low, colors.democracyScale.mid)(
      (clamped + 10) / 10
    )
  }
  return d3.interpolateLab(colors.democracyScale.mid, colors.democracyScale.high)(
    clamped / 10
  )
}

export const typography = {
  fontMono: "ui-monospace, 'Cascadia Code', Consolas, monospace",
  fontSans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
}

export const layout = {
  headerHeight: 52,
  timelineHeight: 64,
  legendWidth: 200,
  legendHeight: 160,
  floatingPanelWidth: 220,
  starPlotRadius: 120,
  starPlotDotRadius: 6,
}

export const animation = {
  zoomDuration: 750,
  colorTransition: 300,
  popSpring: { stiffness: 300, damping: 20 },
}
