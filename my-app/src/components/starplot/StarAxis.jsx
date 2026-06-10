import { colors, typography } from '../../theme.js'

// Renders one axis line + outer label + normalized value label
export default function StarAxis({ angle, radius, label, normalizedValue, color, missing }) {
  const rad = (angle - 90) * (Math.PI / 180)
  const outerX = Math.cos(rad) * radius
  const outerY = Math.sin(rad) * radius

  // Label position slightly beyond the outer ring
  const labelDist = radius + 18
  const labelX = Math.cos(rad) * labelDist
  const labelY = Math.sin(rad) * labelDist

  // Value label (percentage) on the axis line at 60% mark
  const valueDist = radius * 0.65
  const valueX = Math.cos(rad) * valueDist
  const valueY = Math.sin(rad) * valueDist

  const textAnchor = Math.abs(Math.cos(rad)) < 0.1 ? 'middle' : Math.cos(rad) > 0 ? 'start' : 'end'

  return (
    <g>
      <line
        x1={0}
        y1={0}
        x2={outerX}
        y2={outerY}
        stroke={colors.starPlotAxisLine}
        strokeWidth={1}
      />
      {/* Outer label */}
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill={missing ? colors.starPlotMissingDot : colors.starPlotLabel}
        fontSize={11}
        fontFamily={typography.fontSans}
        style={{ userSelect: 'none' }}
      >
        {label}
      </text>
      {/* Normalized % value */}
      {normalizedValue != null && (
        <text
          x={valueX}
          y={valueY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={missing ? colors.starPlotMissingDot : color}
          fontSize={10}
          fontFamily={typography.fontMono}
          style={{ userSelect: 'none' }}
        >
          {Math.round(normalizedValue)}%
        </text>
      )}
    </g>
  )
}
