import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import useAppStore from '../../store/appStore.js'
import { colors, layout, animation, getDemocracyColorFull } from '../../theme.js'
import { typography } from '../../theme.js'
import {
  subRegions, countryRegionMap, regionCountriesMap, subRegionById,
} from '../../config/continentConfig.js'
import { ZOOM_LEVEL, CONTINENT_THRESHOLDS, getCountryThreshold } from '../../hooks/useZoom.js'
import { getCountryValue, loadDataset } from '../../utils/dataService.js'
import { computeRegionAverage } from '../../utils/continentAggregation.js'
import { datasetMeta, panelLabels, descriptionMap } from '../../config/textConfig.js'
import { formatValue } from '../../utils/normalize.js'
import FloatingPanel, { PanelTitle, PanelRow, PanelWarning } from '../ui/FloatingPanel.jsx'
import StarPlot from '../starplot/StarPlot.jsx'
import LineChart from '../linechart/LineChart.jsx'
import LegendPanel from '../ui/LegendPanel.jsx'

// Maps TopoJSON country names to Gapminder dataset names
const TOPO_TO_GAPMINDER = {
  'Bosnia and Herz.':         'Bosnia and Herzegovina',
  'Central African Rep.':     'Central African Republic',
  'Congo':                    'Congo (Rep.)',
  'Dem. Rep. Congo':          'Congo (Dem. Rep.)',
  'Czechia':                  'Czech Republic',
  'Dominican Rep.':           'Dominican Republic',
  'Eq. Guinea':               'Equatorial Guinea',
  'Macedonia':                'North Macedonia',
  'Kyrgyzstan':               'Kyrgyz Republic',
  'S. Sudan':                 'South Sudan',
  'Slovakia':                 'Slovak Republic',
  'Solomon Is.':              'Solomon Islands',
  'United Arab Emirates':     'UAE',
  'United Kingdom':           'UK',
  'United States of America': 'USA',
  'eSwatini':                 'Eswatini',
}

// MapView is the core hybrid component. D3 owns the SVG; React owns overlays.
// Exposed via forwardRef so SplitScreenContainer can read zoomLevel.
const MapView = forwardRef(function MapView(
  {
    side = 'left',
    onZoomLevelChange,
    syncBrush,
    onBrushChange,
    syncHoverYear,
    onHoverYear,
    overlayActive,
    overlayOtherCountry,
    searchTarget, // { type: 'country'|'region', value: string } | null
    onSearchConsumed,
  },
  ref
) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const gMapRef = useRef(null)
  const topoRef = useRef(null)
  const projectionRef = useRef(null)
  const pathGenRef = useRef(null)
  const countriesGeoRef = useRef(null)

  const currentYear = useAppStore((s) => s.currentYear)
  const datasetCache = useAppStore((s) => s.datasetCache)
  const cacheDataset = useAppStore((s) => s.cacheDataset)
  const setFocused = side === 'left'
    ? useAppStore((s) => s.setFocusedCountryLeft)
    : useAppStore((s) => s.setFocusedCountryRight)

  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVEL.WORLD)
  const [focusedRegion, setFocusedRegion] = useState(null)
  const [focusedCountry, setFocusedCountry] = useState(null)
  const [hoveredTarget, setHoveredTarget] = useState(null) // { type, name, mouseX, mouseY }
  const [activeDimension, setActiveDimension] = useState(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [lineBrush, setLineBrush] = useState(null)
  const [lineHoverYear, setLineHoverYear] = useState(null)

  const zoomLevelRef = useRef(zoomLevel)
  zoomLevelRef.current = zoomLevel
  const focusedRegionRef = useRef(focusedRegion)
  focusedRegionRef.current = focusedRegion
  const focusedCountryRef = useRef(focusedCountry)
  focusedCountryRef.current = focusedCountry
  const currentYearRef = useRef(currentYear)
  currentYearRef.current = currentYear
  const datasetCacheRef = useRef(datasetCache)
  datasetCacheRef.current = datasetCache

  // Expose zoomLevel to parent via ref
  useImperativeHandle(ref, () => ({ zoomLevel }), [zoomLevel])

  function updateZoomLevel(newLevel) {
    setZoomLevel(newLevel)
    zoomLevelRef.current = newLevel
    onZoomLevelChange?.(newLevel)
  }

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Preload core datasets on mount
  useEffect(() => {
    ;['democracyIndex', 'population', 'gdpPerCapita', 'populationDensity'].forEach((m) => {
      if (!datasetCache[m]) loadDataset(m, cacheDataset, datasetCache)
    })
  }, [])

  // Lazy-load star plot datasets when entering Level 3
  useEffect(() => {
    if (zoomLevel < ZOOM_LEVEL.COUNTRY) return
    ;['giniIndex', 'literacyRate', 'lifeExpectancy', 'suicideRate',
      'unemployment', 'corruption', 'inflation', 'happiness'].forEach((m) => {
      if (!datasetCache[m]) loadDataset(m, cacheDataset, datasetCache)
    })
  }, [zoomLevel])

  // Initialize D3 map
  useEffect(() => {
    if (!svgRef.current || dims.w === 0) return

    const { w, h } = dims
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const projection = d3.geoNaturalEarth1()
      .scale((w / 6.3))
      .translate([w / 2, h / 2])
    projectionRef.current = projection
    const pathGen = d3.geoPath(projection)
    pathGenRef.current = pathGen

    const controller = new AbortController()

    fetch('/world.topojson', { signal: controller.signal })
      .then((r) => r.json())
      .then((topo) => {
        topoRef.current = topo

        const countries = topojson.feature(topo, topo.objects.countries)
        countriesGeoRef.current = countries

        const gMap = svg.append('g').attr('class', 'map-root')
        gMapRef.current = gMap

        // Draw ocean background
        gMap.append('rect')
          .attr('width', w).attr('height', h)
          .attr('fill', colors.background)

        // Sphere (ocean)
        gMap.append('path')
          .datum({ type: 'Sphere' })
          .attr('d', pathGen)
          .attr('fill', '#0d1520')
          .attr('stroke', '#1a2640')
          .attr('stroke-width', 0.5)

        // Countries group (used for choropleth at L2+)
        const gCountries = gMap.append('g').attr('class', 'countries')

        // Continent zones group (used at L1)
        const gZones = gMap.append('g').attr('class', 'zones')

        buildZones(gZones, countries, w, h)
        buildCountries(gCountries, countries)

        // Zoom behavior
        const zoom = d3.zoom()
          .scaleExtent([1, 60])
          .on('zoom', handleZoom)
        zoomBehaviorRef.current = zoom
        svg.call(zoom)

        renderLevel(ZOOM_LEVEL.WORLD)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('TopoJSON load failed', err)
      })

    return () => controller.abort()
  }, [dims])

  // ─── Build sub-region zones for L1 ─────────────────────────────────────────
  function buildZones(gZones, countries, w, h) {
    const pathGen = pathGenRef.current
    if (!pathGen) return

    // Group TopoJSON features by sub-region
    const regionFeatures = {}
    subRegions.forEach(({ id }) => { regionFeatures[id] = [] })

    countries.features.forEach((feat) => {
      const name = resolveCountryName(feat)
      if (!name) return
      const regionId = countryRegionMap[name]
      if (regionId) regionFeatures[regionId].push(feat)
    })

    gZones.selectAll('.zone').remove()

    subRegions.forEach(({ id, name }) => {
      const feats = regionFeatures[id]
      if (!feats.length) return

      const merged = { type: 'GeometryCollection', geometries: feats.map((f) => f.geometry) }

      // Compute centroid for label
      const centroid = pathGen.centroid({ type: 'Feature', geometry: { type: 'GeometryCollection', geometries: feats.map((f) => f.geometry) } })

      const zoneGroup = gZones.append('g')
        .attr('class', `zone zone-${id}`)
        .attr('data-region', id)

      feats.forEach((feat) => {
        zoneGroup.append('path')
          .datum(feat)
          .attr('d', pathGen)
          .attr('fill', colors.noData)
          .attr('stroke', colors.continentStroke)
          .attr('stroke-width', 0.8)
          .attr('class', `zone-path zone-path-${id}`)
          .style('cursor', 'pointer')
          .on('mouseover', function (event) {
            if (zoomLevelRef.current !== ZOOM_LEVEL.WORLD) return
            d3.selectAll(`.zone-path-${id}`).attr('stroke', colors.hoverStroke).attr('stroke-width', 1.5)
            const cache = datasetCacheRef.current
            const year = currentYearRef.current
            const demoVal = computeRegionAverage('democracyIndex', id, year, cache)
            const gdpVal = computeRegionAverage('gdpPerCapita', id, year, cache)
            const popVal = computeRegionAverage('population', id, year, cache)
            const densVal = computeRegionAverage('populationDensity', id, year, cache)
            setHoveredTarget({
              type: 'region',
              name,
              democracyIndex: demoVal,
              gdpPerCapita: gdpVal,
              population: popVal,
              populationDensity: densVal,
              mouseX: event.clientX,
              mouseY: event.clientY,
            })
          })
          .on('mousemove', function (event) {
            if (zoomLevelRef.current !== ZOOM_LEVEL.WORLD) return
            setHoveredTarget((prev) => prev ? { ...prev, mouseX: event.clientX, mouseY: event.clientY } : null)
          })
          .on('mouseout', function () {
            if (zoomLevelRef.current !== ZOOM_LEVEL.WORLD) return
            d3.selectAll(`.zone-path-${id}`).attr('stroke', colors.continentStroke).attr('stroke-width', 0.8)
            setHoveredTarget(null)
          })
          .on('click', function (event) {
            if (zoomLevelRef.current !== ZOOM_LEVEL.WORLD) return
            zoomToRegion(id)
          })
          .on('wheel', function (event) {
            if (zoomLevelRef.current !== ZOOM_LEVEL.WORLD) return
            // Allow zoom to proceed — natural scroll-wheel zoom
          })
      })

      // Zone label
      if (centroid && centroid.every(isFinite)) {
        zoneGroup.append('text')
          .attr('class', `zone-label zone-label-${id}`)
          .attr('x', centroid[0])
          .attr('y', centroid[1])
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'rgba(255,255,255,0.7)')
          .attr('font-size', 10)
          .attr('font-family', typography.fontSans)
          .attr('pointer-events', 'none')
          .text(name)
      }
    })
  }

  // ─── Build individual country paths for L2+ ────────────────────────────────
  function buildCountries(gCountries, countries) {
    const pathGen = pathGenRef.current
    if (!pathGen) return

    gCountries.selectAll('.country').remove()
    gCountries.attr('opacity', 0)

    countries.features.forEach((feat) => {
      const name = resolveCountryName(feat)
      const inDataset = !!countryRegionMap[name]

      gCountries.append('path')
        .datum(feat)
        .attr('d', pathGen)
        .attr('fill', colors.noData)
        .attr('stroke', colors.countryStroke)
        .attr('stroke-width', 0.4)
        .attr('class', `country country-${CSS.escape(name || 'unknown')}`)
        .attr('data-name', name || '')
        .style('cursor', inDataset ? 'pointer' : 'default')
        .on('mouseover', function (event) {
          if (zoomLevelRef.current !== ZOOM_LEVEL.CONTINENT) return
          if (!inDataset) return
          d3.select(this).attr('stroke', colors.hoverStroke).attr('stroke-width', 1.2)
          const cache = datasetCacheRef.current
          const year = currentYearRef.current
          setHoveredTarget({
            type: 'country',
            name,
            democracyIndex: getCountryValue('democracyIndex', name, year, cache),
            gdpPerCapita: getCountryValue('gdpPerCapita', name, year, cache),
            population: getCountryValue('population', name, year, cache),
            populationDensity: getCountryValue('populationDensity', name, year, cache),
            mouseX: event.clientX,
            mouseY: event.clientY,
          })
        })
        .on('mousemove', function (event) {
          if (zoomLevelRef.current !== ZOOM_LEVEL.CONTINENT) return
          setHoveredTarget((prev) => prev ? { ...prev, mouseX: event.clientX, mouseY: event.clientY } : null)
        })
        .on('mouseout', function () {
          if (zoomLevelRef.current !== ZOOM_LEVEL.CONTINENT) return
          d3.select(this).attr('stroke', colors.countryStroke).attr('stroke-width', 0.4)
          setHoveredTarget(null)
        })
        .on('click', function (event) {
          if (zoomLevelRef.current !== ZOOM_LEVEL.CONTINENT) return
          if (!inDataset) return
          zoomToCountry(name, feat)
        })
    })
  }

  // ─── Zoom handler ──────────────────────────────────────────────────────────
  function handleZoom(event) {
    const { transform } = event
    const { k } = transform

    if (gMapRef.current) {
      gMapRef.current.attr('transform', transform)
    }

    const currentLevel = zoomLevelRef.current
    const currentRegion = focusedRegionRef.current
    const currentCountry = focusedCountryRef.current

    // Determine new level from zoom scale
    let targetLevel = currentLevel

    if (currentLevel === ZOOM_LEVEL.WORLD) {
      // Check if over a region with sufficient zoom
      if (currentRegion) {
        const threshold = CONTINENT_THRESHOLDS[currentRegion] || 2
        if (k >= threshold) targetLevel = ZOOM_LEVEL.CONTINENT
      }
    } else if (currentLevel === ZOOM_LEVEL.CONTINENT) {
      // Zoom out
      const threshold = currentRegion ? CONTINENT_THRESHOLDS[currentRegion] || 2 : 2
      if (k < threshold) {
        targetLevel = ZOOM_LEVEL.WORLD
      }
      // Zoom in to country
      if (currentCountry) {
        const cThreshold = getCountryThreshold(currentCountry)
        if (k >= cThreshold) targetLevel = ZOOM_LEVEL.COUNTRY
      }
    } else if (currentLevel === ZOOM_LEVEL.COUNTRY) {
      const cThreshold = currentCountry ? getCountryThreshold(currentCountry) : 4
      if (k < cThreshold) targetLevel = ZOOM_LEVEL.CONTINENT
    }

    if (targetLevel !== currentLevel) {
      updateZoomLevel(targetLevel)
      renderLevel(targetLevel)
    }

    // Update colors based on current year
    updateChoropleth()
  }

  // ─── Render each zoom level ────────────────────────────────────────────────
  function renderLevel(level) {
    const gZones = d3.select(svgRef.current).select('.zones')
    const gCountries = d3.select(svgRef.current).select('.countries')

    if (level === ZOOM_LEVEL.WORLD) {
      gZones.style('pointer-events', 'all')
      gZones.transition().duration(300).attr('opacity', 1)
      gCountries.transition().duration(300).attr('opacity', 0)
      // Reset any per-country opacity/fill overrides left from L2 fade
      d3.selectAll('.country')
        .attr('opacity', 1)
        .attr('stroke', colors.countryStroke)
        .attr('stroke-width', 0.4)
      setFocusedCountry(null)
      setHoveredTarget(null)
      updateZoneFills()
    } else if (level === ZOOM_LEVEL.CONTINENT) {
      gZones.style('pointer-events', 'none')
      gZones.transition().duration(300).attr('opacity', 0)
      gCountries.transition().duration(300).attr('opacity', 1)
      setHoveredTarget(null)
      updateChoropleth()
      applyFocusedRegionFade()
    } else if (level === ZOOM_LEVEL.COUNTRY) {
      gZones.style('pointer-events', 'none')
      gZones.transition().duration(300).attr('opacity', 0)
      gCountries.transition().duration(300).attr('opacity', 1)
      updateChoropleth()
      applyFocusedRegionFade()
    }
  }

  // ─── Update zone fills with population-weighted democracy index ────────────
  function updateZoneFills() {
    const cache = datasetCacheRef.current
    const year = currentYearRef.current

    subRegions.forEach(({ id }) => {
      const avg = computeRegionAverage('democracyIndex', id, year, cache)
      const fill = avg != null ? getDemocracyColorFull(avg) : colors.noData
      d3.selectAll(`.zone-path-${id}`)
        .transition().duration(animation.colorTransition)
        .attr('fill', fill)
    })
  }

  // ─── Update country choropleth fills ──────────────────────────────────────
  function updateChoropleth() {
    const cache = datasetCacheRef.current
    const year = currentYearRef.current

    d3.selectAll('.country').each(function () {
      const name = d3.select(this).attr('data-name')
      if (!name || !countryRegionMap[name]) {
        d3.select(this).attr('fill', colors.noData)
        return
      }
      const val = getCountryValue('democracyIndex', name, year, cache)
      d3.select(this)
        .transition().duration(animation.colorTransition)
        .attr('fill', val != null ? getDemocracyColorFull(val) : colors.noData)
    })
  }

  // ─── Fade out countries not in focused region ──────────────────────────────
  function applyFocusedRegionFade() {
    const regionId = focusedRegionRef.current
    if (!regionId) return
    const regionCountries = new Set(regionCountriesMap[regionId] || [])

    d3.selectAll('.country').each(function () {
      const name = d3.select(this).attr('data-name')
      const inRegion = regionCountries.has(name)
      const sel = d3.select(this).transition().duration(300)
      if (inRegion) {
        sel
          .attr('opacity', 1)
          .attr('stroke', colors.countryStroke)
          .attr('stroke-width', 0.4)
      } else {
        sel
          .attr('fill', colors.noData)
          .attr('opacity', 0.45)
          .attr('stroke', colors.fadedStroke)
          .attr('stroke-width', 0.3)
      }
    })
  }

  // ─── Zoom to continent (L1 → L2) ──────────────────────────────────────────
  function zoomToRegion(regionId) {
    const countries = countriesGeoRef.current
    const svg = d3.select(svgRef.current)
    const { w, h } = dims
    const projection = projectionRef.current
    const pathGen = pathGenRef.current

    setFocusedRegion(regionId)
    focusedRegionRef.current = regionId

    const regionCountries = new Set(regionCountriesMap[regionId] || [])
    const feats = countries.features.filter((f) => regionCountries.has(resolveCountryName(f)))
    if (!feats.length) return

    const collection = { type: 'FeatureCollection', features: feats }
    const [[x0, y0], [x1, y1]] = pathGen.bounds(collection)
    const scale = Math.min(8, 0.85 / Math.max((x1 - x0) / w, (y1 - y0) / h))
    const tx = (w - scale * (x0 + x1)) / 2
    const ty = (h - scale * (y0 + y1)) / 2
    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale)

    svg.transition()
      .duration(animation.zoomDuration)
      .call(zoomBehaviorRef.current.transform, transform)

    updateZoomLevel(ZOOM_LEVEL.CONTINENT)
    renderLevel(ZOOM_LEVEL.CONTINENT)
  }

  // ─── Zoom to country (L2 → L3) ────────────────────────────────────────────
  function zoomToCountry(name, feat) {
    const svg = d3.select(svgRef.current)
    const { w, h } = dims
    const pathGen = pathGenRef.current

    setFocusedCountry(name)
    focusedCountryRef.current = name
    setFocused(name)

    const [[x0, y0], [x1, y1]] = pathGen.bounds(feat)
    const scale = Math.min(60, 0.7 / Math.max((x1 - x0) / w, (y1 - y0) / h))
    const tx = (w - scale * (x0 + x1)) / 2
    const ty = (h - scale * (y0 + y1)) / 2
    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale)

    svg.transition()
      .duration(animation.zoomDuration)
      .call(zoomBehaviorRef.current.transform, transform)

    updateZoomLevel(ZOOM_LEVEL.COUNTRY)
    renderLevel(ZOOM_LEVEL.COUNTRY)
  }

  // ─── Reset to world view ──────────────────────────────────────────────────
  function resetToWorld() {
    const svg = d3.select(svgRef.current)
    svg.transition()
      .duration(animation.zoomDuration)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity)

    setFocusedRegion(null)
    setFocusedCountry(null)
    focusedRegionRef.current = null
    focusedCountryRef.current = null
    setFocused(null)
    setActiveDimension(null)
    setHoveredTarget(null)
    updateZoomLevel(ZOOM_LEVEL.WORLD)
    renderLevel(ZOOM_LEVEL.WORLD)
  }

  // ─── Handle search targets ─────────────────────────────────────────────────
  useEffect(() => {
    if (!searchTarget) return
    if (searchTarget.type === 'reset') {
      resetToWorld()
      onSearchConsumed?.()
      return
    }
    if (!topoRef.current) return
    if (searchTarget.type === 'country') {
      const name = searchTarget.value
      const feat = countriesGeoRef.current?.features.find((f) => resolveCountryName(f) === name)
      if (feat) {
        const regionId = countryRegionMap[name]
        if (regionId) {
          setFocusedRegion(regionId)
          focusedRegionRef.current = regionId
        }
        zoomToCountry(name, feat)
      }
    } else if (searchTarget.type === 'region') {
      zoomToRegion(searchTarget.value)
    }
    onSearchConsumed?.()
  }, [searchTarget])

  // ─── React to year changes ────────────────────────────────────────────────
  useEffect(() => {
    if (!gMapRef.current) return
    if (zoomLevel === ZOOM_LEVEL.WORLD) updateZoneFills()
    else updateChoropleth()
  }, [currentYear, datasetCache])

  // ─── Resolve country name from TopoJSON feature → Gapminder name ──────────
  function resolveCountryName(feat) {
    const raw = feat?.properties?.name || feat?.properties?.NAME || null
    if (!raw) return null
    return TOPO_TO_GAPMINDER[raw] || raw
  }

  // ─── Level 4: line chart view data ────────────────────────────────────────
  const countryDetailData = focusedCountry
    ? {
        countryName: focusedCountry,
        democracyIndex: getCountryValue('democracyIndex', focusedCountry, currentYear, datasetCache),
        gdpPerCapita:   getCountryValue('gdpPerCapita',   focusedCountry, currentYear, datasetCache),
        population:     getCountryValue('population',     focusedCountry, currentYear, datasetCache),
        populationDensity: getCountryValue('populationDensity', focusedCountry, currentYear, datasetCache),
      }
    : null

  // ─── Star plot SVG position: centered in the container ───────────────────
  const starCx = dims.w / 2
  const starCy = dims.h / 2

  // ─── Compute country silhouette path (Level 4 background) ────────────────
  const [silhouettePath, setSilhouettePath] = useState('')
  useEffect(() => {
    if (zoomLevel !== ZOOM_LEVEL.DATA || !focusedCountry || !pathGenRef.current || !countriesGeoRef.current) {
      setSilhouettePath('')
      return
    }
    const feat = countriesGeoRef.current.features.find((f) => resolveCountryName(f) === focusedCountry)
    if (feat) {
      // Use a projection centered on the country for the silhouette
      const projection = d3.geoNaturalEarth1()
        .fitSize([dims.w * 0.6, dims.h * 0.6], feat)
        .translate([dims.w / 2, dims.h / 2])
      const pg = d3.geoPath(projection)
      setSilhouettePath(pg(feat) || '')
    }
  }, [zoomLevel, focusedCountry, dims])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: colors.background,
        overflow: 'hidden',
      }}
    >
      {/* D3 SVG map — hidden at Level 4 */}
      <svg
        ref={svgRef}
        width={dims.w}
        height={dims.h}
        style={{
          display: 'block',
          opacity: zoomLevel === ZOOM_LEVEL.DATA ? 0 : 1,
          transition: 'opacity 0.3s',
          position: 'absolute',
          inset: 0,
        }}
      >
        {/* Star plot rendered as React SVG inside the map SVG at Level 3 */}
        {zoomLevel === ZOOM_LEVEL.COUNTRY && focusedCountry && (
          <StarPlot
            countryName={focusedCountry}
            cx={starCx}
            cy={starCy}
            onDimensionClick={(dim) => {
              setActiveDimension(dim)
              updateZoomLevel(ZOOM_LEVEL.DATA)
            }}
          />
        )}
      </svg>

      {/* Level 4: Line chart view */}
      {zoomLevel === ZOOM_LEVEL.DATA && activeDimension && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            background: colors.background,
          }}
        >
          {/* Country silhouette */}
          {silhouettePath && (
            <svg
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              width={dims.w}
              height={dims.h}
            >
              <path d={silhouettePath} fill={colors.lineChart.silhouette} />
            </svg>
          )}

          {/* Dimension title */}
          <div
            style={{
              padding: '16px 24px 8px',
              fontFamily: typography.fontSans,
              fontSize: 18,
              fontWeight: 700,
              color: colors.ui.text,
              flexShrink: 0,
            }}
          >
            {focusedCountry} — {datasetMeta[activeDimension]?.displayName}
          </div>

          {/* Line chart */}
          <div style={{ flex: 1, padding: '0 16px 16px', position: 'relative' }}>
            <LineChart
              countryName={focusedCountry}
              dimension={activeDimension}
              width={dims.w - 32}
              height={dims.h - 80}
              syncBrush={syncBrush}
              onBrushChange={(r) => { setLineBrush(r); onBrushChange?.(r) }}
              syncHoverYear={syncHoverYear}
              onHoverYear={(yr) => { setLineHoverYear(yr); onHoverYear?.(yr) }}
              overlayData={overlayActive && overlayOtherCountry
                ? { countryName: overlayOtherCountry, color: colors.starPlotAxes.giniIndex }
                : null
              }
            />
          </div>

          {/* Description panel (bottom-left, replaces legend at L4) */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              background: colors.ui.panel,
              border: `1px solid ${colors.ui.panelBorder}`,
              borderRadius: 8,
              padding: '10px 14px',
              maxWidth: 260,
              fontSize: 12,
              color: colors.ui.textMuted,
              lineHeight: 1.6,
              fontFamily: typography.fontSans,
            }}
          >
            <div style={{ fontWeight: 700, color: colors.ui.text, marginBottom: 6, fontSize: 13 }}>
              {datasetMeta[activeDimension]?.displayName}
            </div>
            {descriptionMap[activeDimension]}
          </div>
        </div>
      )}

      {/* Hover floating panel */}
      {hoveredTarget && zoomLevel <= ZOOM_LEVEL.CONTINENT && (
        <FloatingPanel x={hoveredTarget.mouseX} y={hoveredTarget.mouseY} visible>
          <PanelTitle>{hoveredTarget.name}</PanelTitle>
          <PanelRow
            label={panelLabels.democracyScore}
            value={hoveredTarget.democracyIndex != null
              ? hoveredTarget.democracyIndex.toFixed(1)
              : panelLabels.noDataShort}
            highlight
            mono
          />
          <PanelRow
            label={panelLabels.gdpPerCapita}
            value={formatValue(hoveredTarget.gdpPerCapita, 'USD')}
            mono
          />
          <PanelRow
            label={panelLabels.population}
            value={formatValue(hoveredTarget.population, 'People')}
            mono
          />
          <PanelRow
            label={panelLabels.populationDensity}
            value={hoveredTarget.populationDensity != null
              ? hoveredTarget.populationDensity.toFixed(1) + ' /km²'
              : panelLabels.noDataShort}
            mono
          />
        </FloatingPanel>
      )}

      {/* Legend / country detail panel */}
      <LegendPanel
        zoomLevel={zoomLevel}
        countryData={zoomLevel === ZOOM_LEVEL.COUNTRY ? countryDetailData : null}
      />
    </div>
  )
})

export default MapView
