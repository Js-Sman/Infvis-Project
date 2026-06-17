import useAppStore from '../../store/appStore.js'
import { colors, layout } from '../../theme.js'
import { getCountryValue, normalizeMetricValue } from '../../utils/dataService.js'
import StarAxis from './StarAxis.jsx'
import SpikeDot from './SpikeDot.jsx'

// Axes definition: clockwise from top
const AXES = [
  { id: 'giniIndex',      label: 'Gini Index',       angle:   0, colorKey: 'giniIndex' },
  { id: 'unemployment',   label: 'Unemployment',      angle:  45, colorKey: 'unemployment' },
  { id: 'corruption',     label: 'Corruption',        angle:  90, colorKey: 'corruption' },
  { id: 'lifeExpectancy', label: 'Life Exp.',         angle: 135, colorKey: 'lifeExpectancy' },
  { id: 'happiness',      label: 'Happiness',         angle: 180, colorKey: 'happiness' },
  { id: 'suicideRate',    label: 'Suicide Rate',      angle: 225, colorKey: 'suicideRate' },
  { id: 'literacyRate',   label: 'Literacy',          angle: 270, colorKey: 'literacyRate' },
  { id: 'inflation',      label: 'Inflation',         angle: 315, colorKey: 'inflation' },
]

const REFERENCE_RINGS = [0.25, 0.5, 0.75]

function angleToPoint(angle, r) {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r }
}

// onHover(dimensionId, clientX, clientY) — called on enter + move
// onHoverEnd() — called on leave
export default function StarPlot({ countryName, cx, cy, radius, onDimensionClick, onHover, onHoverEnd }) {
  const currentYear = useAppStore((s) => s.currentYear)
  const datasetCache = useAppStore((s) => s.datasetCache)

  const R = radius ?? layout.starPlotRadius
  const dotR = Math.round(6 * Math.sqrt(R / 120))
  const polyStrokeWidth = Math.max(1.5, 1.5 * R / 120)

  const axisValues = AXES.map((axis) => {
    const rawValue = getCountryValue(axis.id, countryName, currentYear, datasetCache)
    const normalized = normalizeMetricValue(axis.id, rawValue, datasetCache)
    const missing = rawValue == null || normalized == null
    const displayNorm = missing ? 50 : normalized
    return { ...axis, rawValue, normalized: displayNorm, missing }
  })

  const polygonPoints = axisValues
    .map(({ angle, normalized }) => {
      const pt = angleToPoint(angle, (normalized / 100) * R)
      return `${pt.x},${pt.y}`
    })
    .join(' ')

  const dotPositions = axisValues.map(({ angle, normalized }) =>
    angleToPoint(angle, (normalized / 100) * R)
  )

  return (
    <g transform={`translate(${cx},${cy})`}>
      {/* Background disc — covers axes + label ring */}
      <circle
        r={R + 180}
        fill={colors.starPlotBackground}
        stroke="none"
      />

      {/* Reference rings */}
      {REFERENCE_RINGS.map((frac) => (
        <circle
          key={frac}
          r={frac * R}
          fill="none"
          stroke={colors.starPlotGrid}
          strokeWidth={1}
          strokeDasharray="3,4"
        />
      ))}

      {/* Axes + labels */}
      {axisValues.map((axis, i) => (
        <StarAxis
          key={axis.id}
          angle={axis.angle}
          radius={R}
          label={axis.label}
          normalizedValue={axis.missing ? null : axis.normalized}
          color={colors.starPlotAxes[axis.colorKey]}
          missing={axis.missing}
          onClick={() => onDimensionClick?.(axis.id)}
          onMouseEnter={(e) => onHover?.(axis.id, e.clientX, e.clientY)}
          onMouseLeave={() => onHoverEnd?.()}
          onMouseMove={(e) => onHover?.(axis.id, e.clientX, e.clientY)}
        />
      ))}

      {/* Polygon fill */}
      <polygon
        points={polygonPoints}
        fill={colors.starPlotPolygon}
        stroke={colors.starPlotStroke}
        strokeWidth={polyStrokeWidth}
        strokeLinejoin="round"
      />

      {/* Spike dots */}
      {axisValues.map((axis, i) => (
        <SpikeDot
          key={axis.id}
          cx={dotPositions[i].x}
          cy={dotPositions[i].y}
          r={dotR}
          color={colors.starPlotAxes[axis.colorKey]}
          missing={axis.missing}
          onClick={() => onDimensionClick?.(axis.id)}
          onMouseEnter={(e) => onHover?.(axis.id, e.clientX, e.clientY)}
          onMouseLeave={() => onHoverEnd?.()}
          onMouseMove={(e) => onHover?.(axis.id, e.clientX, e.clientY)}
        />
      ))}
    </g>
  )
}
