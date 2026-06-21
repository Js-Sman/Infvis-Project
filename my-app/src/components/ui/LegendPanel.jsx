import { colors, layout, typography } from '../../theme.js'
import { legendLabels, panelLabels, datasetMeta } from '../../config/textConfig.js'
import { getDemocracyColorFull } from '../../theme.js'
import { formatValue } from '../../utils/normalize.js'

// Shown at Levels 1–2: democracy index color legend
// At Level 3: replaced by country detail panel
// Hidden at Level 4
export default function LegendPanel({ zoomLevel, countryData }) {
  if (zoomLevel === 4) return null

  if (zoomLevel === 3 && countryData) {
    return <CountryDetailPanel data={countryData} />
  }

  return <DemocracyLegend />
}

function DemocracyLegend() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: layout.timelineHeight + 16,
        left: 16,
        zIndex: 100,
        background: colors.ui.panel,
        border: `1px solid ${colors.ui.panelBorder}`,
        borderRadius: 10,
        padding: '14px 18px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        minWidth: 220,
      }}
    >
      <div
        style={{
          fontFamily: typography.fontSans,
          fontSize: 12,
          fontWeight: 700,
          color: colors.ui.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
        }}
      >
        {legendLabels.title}
      </div>

      {/* Gradient bar */}
      <div
        style={{
          height: 12,
          borderRadius: 6,
          background: `linear-gradient(to right, ${colors.democracyScale.low}, ${colors.democracyScale.mid}, ${colors.democracyScale.high})`,
          marginBottom: 10,
        }}
      />

      {/* Discrete level labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {legendLabels.levels.map(({ value, label }) => (
          <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                flexShrink: 0,
                background: getDemocracyColorFull(value),
              }}
            />
            <span style={{ fontFamily: typography.fontSans, fontSize: 13, color: colors.ui.text }}>
              {label}
            </span>
            <span style={{ fontFamily: typography.fontMono, fontSize: 12, color: colors.ui.textDim, marginLeft: 'auto' }}>
              {value > 0 ? '+' : ''}{value}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: colors.noData }} />
          <span style={{ fontFamily: typography.fontSans, fontSize: 13, color: colors.ui.textMuted }}>
            {legendLabels.noData}
          </span>
        </div>
      </div>
    </div>
  )
}

function CountryDetailPanel({ data }) {
  const rows = [
    { label: panelLabels.democracyScore, value: data.democracyIndex != null ? data.democracyIndex.toFixed(2) : panelLabels.noDataShort, unit: '−10 to +10', highlight: true },
    { label: panelLabels.gdpPerCapita, value: formatValue(data.gdpPerCapita, 'USD'), unit: '' },
    { label: panelLabels.population, value: formatValue(data.population, 'People'), unit: '' },
    { label: panelLabels.populationDensity, value: data.populationDensity != null ? data.populationDensity.toFixed(2) + ' /km²' : panelLabels.noDataShort, unit: '' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: layout.timelineHeight + 16,
        left: 16,
        zIndex: 100,
        background: colors.ui.panel,
        border: `1px solid ${colors.ui.panelBorder}`,
        borderRadius: 10,
        padding: '14px 18px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        minWidth: 240,
      }}
    >
      <div
        style={{
          fontFamily: typography.fontSans,
          fontSize: 15,
          fontWeight: 700,
          color: colors.ui.text,
          borderBottom: `1px solid ${colors.ui.panelBorder}`,
          paddingBottom: 8,
          marginBottom: 10,
        }}
      >
        {data.countryName}
      </div>
      {rows.map(({ label, value, highlight }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 6 }}>
          <span style={{ fontFamily: typography.fontSans, fontSize: 13, color: colors.ui.textMuted }}>{label}</span>
          <span
            style={{
              fontFamily: typography.fontMono,
              fontSize: 13,
              color: highlight ? colors.ui.accent : colors.ui.text,
              fontWeight: highlight ? 700 : 400,
            }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}
