import { useState, useEffect } from 'react'
import useAppStore from '../../store/appStore.js'
import { colors, layout } from '../../theme.js'
import { datasetMeta, descriptionMap } from '../../config/textConfig.js'
import { getCountryValue, normalizeMetricValue } from '../../utils/dataService.js'
import StarAxis from './StarAxis.jsx'
import SpikeDot from './SpikeDot.jsx'
import FloatingPanel, { PanelTitle, PanelRow, PanelWarning } from '../ui/FloatingPanel.jsx'

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

export default function StarPlot({ countryName, cx, cy, onDimensionClick }) {
  const currentYear = useAppStore((s) => s.currentYear)
  const datasetCache = useAppStore((s) => s.datasetCache)

  const [hoveredAxis, setHoveredAxis] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })

  const R = layout.starPlotRadius

  // Compute normalized values for all axes
  const axisValues = AXES.map((axis) => {
    const rawValue = getCountryValue(axis.id, countryName, currentYear, datasetCache)
    const normalized = normalizeMetricValue(axis.id, rawValue, datasetCache)
    const missing = rawValue == null || normalized == null
    // If missing, render at 50% ring
    const displayNorm = missing ? 50 : normalized
    return { ...axis, rawValue, normalized: displayNorm, missing }
  })

  // Polygon points for the star shape
  const polygonPoints = axisValues
    .map(({ angle, normalized }) => {
      const pt = angleToPoint(angle, (normalized / 100) * R)
      return `${pt.x},${pt.y}`
    })
    .join(' ')

  // Spike dot positions
  const dotPositions = axisValues.map(({ angle, normalized }) =>
    angleToPoint(angle, (normalized / 100) * R)
  )

  const hoveredMeta = hoveredAxis != null ? axisValues[hoveredAxis] : null

  return (
    <>
      <g transform={`translate(${cx},${cy})`}>
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
          />
        ))}

        {/* Polygon fill */}
        <polygon
          points={polygonPoints}
          fill={colors.starPlotPolygon}
          stroke={colors.starPlotStroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Spike dots */}
        {axisValues.map((axis, i) => (
          <SpikeDot
            key={axis.id}
            cx={dotPositions[i].x}
            cy={dotPositions[i].y}
            color={colors.starPlotAxes[axis.colorKey]}
            missing={axis.missing}
            onClick={() => onDimensionClick?.(axis.id)}
            onMouseEnter={(e) => {
              setHoveredAxis(i)
              setHoverPos({ x: e.clientX, y: e.clientY })
            }}
            onMouseLeave={() => setHoveredAxis(null)}
          />
        ))}
      </g>

      {/* Floating panel for hovered spike */}
      {hoveredMeta && (
        <FloatingPanel x={hoverPos.x} y={hoverPos.y} visible>
          <PanelTitle>{datasetMeta[hoveredMeta.id]?.displayName}</PanelTitle>
          {hoveredMeta.missing ? (
            <PanelWarning>No data available for {currentYear}</PanelWarning>
          ) : (
            <PanelRow
              label={`${currentYear}`}
              value={`${Math.round(hoveredMeta.normalized)}%`}
              mono
              highlight
            />
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
            {descriptionMap[hoveredMeta.id]?.slice(0, 120)}…
          </div>
        </FloatingPanel>
      )}
    </>
  )
}
