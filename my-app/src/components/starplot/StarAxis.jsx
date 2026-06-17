import { colors, typography } from '../../theme.js'

// Renders one axis line + outer label + normalized value label
export default function StarAxis({ angle, radius, label, normalizedValue, color, missing, onMouseEnter, onMouseLeave, onMouseMove, onClick }) {
  const rad = (angle - 90) * (Math.PI / 180)
  const outerX = Math.cos(rad) * radius
  const outerY = Math.sin(rad) * radius

  // Scale label distance, font sizes, and stroke proportionally with radius.
  // sqrt keeps fonts from growing too aggressively on large screens.
  const scale = Math.sqrt(radius / 120)
  const labelDist = radius * 1.15
  const labelX = Math.cos(rad) * labelDist
  const labelY = Math.sin(rad) * labelDist
  const labelFontSize = Math.round(13 * scale)
  const valueFontSize = Math.round(12 * scale)
  const valueDy = Math.round(15 * scale)
  const axisStrokeWidth = Math.max(1, radius / 120)

  const textAnchor = Math.abs(Math.cos(rad)) < 0.1 ? 'middle' : Math.cos(rad) > 0 ? 'start' : 'end'

  return (
    <g>
      <line
        x1={0}
        y1={0}
        x2={outerX}
        y2={outerY}
        stroke={colors.starPlotAxisLine}
        strokeWidth={axisStrokeWidth}
      />
      {/* Label group — hoverable to trigger the dimension description panel */}
      <g
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
      >
        {/* Transparent hit-area rect behind the labels for easier hover detection */}
        <rect
          x={textAnchor === 'end' ? labelX - 80 : textAnchor === 'middle' ? labelX - 40 : labelX}
          y={labelY - labelFontSize}
          width={80}
          height={valueDy + labelFontSize + 4}
          fill="transparent"
        />
        {/* Outer label */}
        <text
          x={labelX}
          y={labelY}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fill={missing ? colors.starPlotMissingDot : colors.starPlotLabel}
          fontSize={labelFontSize}
          fontFamily={typography.fontSans}
          style={{ fontWeight: 'bold' }}
        >
          {label}
        </text>
        {/* Normalized % value — or "(no data)" when value is missing */}
        <text
          x={labelX}
          y={labelY}
          dy={valueDy}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fill={missing ? colors.starPlotMissingDot : color}
          fontSize={valueFontSize}
          fontFamily={typography.fontMono}
          style={{ userSelect: 'none' }}
        >
          {normalizedValue != null ? `${Math.round(normalizedValue)}%` : '(no data)'}
        </text>
      </g>
    </g>
  )
}
