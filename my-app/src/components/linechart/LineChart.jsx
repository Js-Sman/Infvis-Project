import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import useAppStore from '../../store/appStore.js'
import { colors, typography, layout } from '../../theme.js'
import { datasetMeta, descriptionMap } from '../../config/textConfig.js'
import { getCountrySeries } from '../../utils/dataService.js'

const MARGIN = { top: 32, right: 40, bottom: 52, left: 64 }

export default function LineChart({
  countryName,
  dimension,
  width,
  height,
  syncBrush,        // [start,end] | null — incoming brush from sibling
  onBrushChange,    // (range | null) → void
  syncHoverYear,    // number | null — from sibling
  onHoverYear,      // (year | null) → void
  overlayData,      // { countryName, color } | null — for overlay mode
}) {
  const datasetCache = useAppStore((s) => s.datasetCache)
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const meta = datasetMeta[dimension] || {}
  const series = getCountrySeries(dimension, countryName, datasetCache)
  const overlaySeries = overlayData
    ? getCountrySeries(dimension, overlayData.countryName, datasetCache)
    : []

  const innerW = width - MARGIN.left - MARGIN.right
  const innerH = height - MARGIN.top - MARGIN.bottom

  useEffect(() => {
    if (!svgRef.current || !series.length || innerW <= 0 || innerH <= 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Scales
    const allYears = series.map((d) => d.year)
    const allValues = series.filter((d) => d.value != null).map((d) => d.value)

    if (!allValues.length) return

    const xScale = d3.scaleLinear()
      .domain([d3.min(allYears), d3.max(allYears)])
      .range([0, innerW])

    const allDisplayValues = [...allValues]
    if (overlaySeries.length) {
      overlaySeries.filter((d) => d.value != null).forEach((d) => allDisplayValues.push(d.value))
    }
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allDisplayValues) * 1.08])
      .nice()
      .range([innerH, 0])

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(8)
          .tickFormat(d3.format('d'))
      )
      .call((a) => {
        a.select('.domain').attr('stroke', colors.ui.panelBorder)
        a.selectAll('line').attr('stroke', colors.ui.panelBorder)
        a.selectAll('text')
          .attr('fill', colors.ui.textMuted)
          .style('font-family', typography.fontMono)
          .style('font-size', '11px')
      })

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .call((a) => {
        a.select('.domain').attr('stroke', colors.ui.panelBorder)
        a.selectAll('line').attr('stroke', colors.ui.panelBorder)
        a.selectAll('text')
          .attr('fill', colors.ui.textMuted)
          .style('font-family', typography.fontMono)
          .style('font-size', '11px')
      })

    // Grid lines
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-innerW).tickFormat(''))
      .call((a) => {
        a.select('.domain').remove()
        a.selectAll('line').attr('stroke', colors.starPlotGrid).attr('stroke-dasharray', '3,4')
      })

    // Helper: draw a line series, splitting on null gaps (renders gap as dashed)
    function drawLine(data, lineColor, dashColor) {
      if (!data.length) return

      // Split into segments separated by null values
      const segments = []
      let cur = []
      for (let i = 0; i < data.length; i++) {
        if (data[i].value != null) {
          cur.push(data[i])
        } else {
          if (cur.length) { segments.push({ points: cur, gap: false }); cur = [] }
          // Find surrounding non-null points for gap interpolation
          const prev = data.slice(0, i).reverse().find((d) => d.value != null)
          const next = data.slice(i + 1).find((d) => d.value != null)
          if (prev && next) segments.push({ points: [prev, next], gap: true })
        }
      }
      if (cur.length) segments.push({ points: cur, gap: false })

      const lineGen = d3.line()
        .x((d) => xScale(d.year))
        .y((d) => yScale(d.value))
        .defined((d) => d.value != null)

      segments.forEach(({ points, gap }) => {
        g.append('path')
          .datum(points)
          .attr('fill', 'none')
          .attr('stroke', gap ? (dashColor || lineColor) : lineColor)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', gap ? '5,4' : 'none')
          .attr('stroke-opacity', gap ? 0.5 : 1)
          .attr('d', lineGen)
      })
    }

    drawLine(series, colors.lineChart.line, colors.lineChart.dashLine)
    if (overlaySeries.length) {
      drawLine(overlaySeries, overlayData.color || '#f472b6', '#c97abf')
    }

    // Brush
    const brush = d3.brushX()
      .extent([[0, 0], [innerW, innerH]])
      .on('end', (event) => {
        if (!event.selection) { onBrushChange?.(null); return }
        const [x0, x1] = event.selection
        const y0 = Math.round(xScale.invert(x0))
        const y1 = Math.round(xScale.invert(x1))
        onBrushChange?.([y0, y1])
      })

    const brushG = g.append('g').attr('class', 'brush').call(brush)
    brushG.select('.selection')
      .attr('fill', colors.lineChart.brush)
      .attr('stroke', colors.ui.accent)
      .attr('stroke-width', 1)

    // Apply incoming sync brush
    if (syncBrush) {
      const [b0, b1] = syncBrush
      brush.move(brushG, [xScale(b0), xScale(b1)])
    }

    // Hover overlay
    const hoverLine = g.append('line')
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', colors.ui.accent)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0)

    // Sync hover marker from sibling
    if (syncHoverYear != null) {
      const hx = xScale(syncHoverYear)
      hoverLine.attr('x1', hx).attr('x2', hx).attr('opacity', 0.6)
    }

    const hoverRect = g.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    hoverRect.on('mousemove', (event) => {
      const [mx] = d3.pointer(event)
      const year = Math.round(xScale.invert(mx))
      const nearestPoint = series.reduce((best, d) =>
        Math.abs(d.year - year) < Math.abs(best.year - year) ? d : best
      )
      hoverLine.attr('x1', xScale(year)).attr('x2', xScale(year)).attr('opacity', 0.7)
      onHoverYear?.(year)
      if (nearestPoint.value != null) {
        const rect = svgRef.current.getBoundingClientRect()
        setTooltip({
          x: rect.left + MARGIN.left + xScale(nearestPoint.year),
          y: rect.top + MARGIN.top + yScale(nearestPoint.value),
          year: nearestPoint.year,
          value: nearestPoint.value,
        })
      }
    })

    hoverRect.on('mouseleave', () => {
      hoverLine.attr('opacity', 0)
      onHoverYear?.(null)
      setTooltip(null)
    })

    // Y-axis label
    svg.append('text')
      .attr('transform', `rotate(-90)`)
      .attr('x', -(height / 2))
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.ui.textMuted)
      .style('font-family', typography.fontSans)
      .style('font-size', '11px')
      .text(meta.unit || '')
  }, [series, overlaySeries, innerW, innerH, syncBrush, syncHoverYear])

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg ref={svgRef} width={width} height={height} />
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 24,
            background: colors.ui.panel,
            border: `1px solid ${colors.ui.panelBorder}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontFamily: typography.fontMono,
            color: colors.ui.text,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {tooltip.year}: {tooltip.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  )
}
