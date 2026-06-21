import { colors, typography } from '../../theme.js'

// Formats the absolute metric value for display next to an axis label.
// No unit is shown here — only the number, rounded to 2 decimal places
// (with thousands separators for large values).
function formatAxisValue(v) {
  if (v == null) return '(no data)'
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Renders one axis line + outer label + absolute value label + unit label
export default function StarAxis({ angle, radius, label, rawValue, unit, color, missing, onMouseEnter, onMouseLeave, onMouseMove, onClick }) {
  const rad = (angle - 90) * (Math.PI / 180)
  const outerX = Math.cos(rad) * radius
  const outerY = Math.sin(rad) * radius

  // Scale label distance, font sizes, and stroke proportionally with radius.
  // sqrt keeps fonts from growing too aggressively on large screens.
  const scale = Math.sqrt(radius / 120)
  const labelFontSize = Math.round(13 * scale)
  const valueFontSize = Math.round(12 * scale)
  const unitFontSize = Math.round(10 * scale)
  const valueDy = Math.round(15 * scale)
  const unitDy = Math.round(28 * scale)
  const showUnit = !missing && unit
  const axisStrokeWidth = Math.max(1, radius / 120)

  // The label/value/unit rows stack DOWNWARD from the label position. On the
  // top axis (Gini, pointing straight up) that stack dips back toward the axis
  // line, so push its box further out by the extra height the unit row adds.
  const isTopAxis = Math.abs(Math.cos(rad)) < 0.1 && Math.sin(rad) < 0
  const labelDist = radius * 1.15 + (isTopAxis ? unitDy : 0)
  const labelX = Math.cos(rad) * labelDist
  const labelY = Math.sin(rad) * labelDist

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
          height={(showUnit ? unitDy : valueDy) + labelFontSize + 4}
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
        {/* Absolute metric value (no unit) — or "(no data)" when missing */}
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
          {formatAxisValue(rawValue)}
        </text>
        {/* Unit — third row, white italic, smaller than value and label */}
        {showUnit && (
          <text
            x={labelX}
            y={labelY}
            dy={unitDy}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fill={colors.ui.text}
            fontSize={unitFontSize}
            fontFamily={typography.fontSans}
            style={{ userSelect: 'none', fontStyle: 'italic' }}
          >
            {unit}
          </text>
        )}
      </g>
    </g>
  )
}
