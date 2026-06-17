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

// Custom zoom overrides for countries/regions whose auto-computed bounds are unreliable.
// Russia wraps near the antimeridian — pathGen.bounds() returns a map-wide bounding box.
// center: [longitude, latitude]; scale: D3 zoom k value applied to the transform.
const CUSTOM_REGION_ZOOM = {
  // east-europe includes Russia; skip its full extent and focus on the European core + western Russia
  'east-europe': { center: [52, 55], scale: 2.0 },
}

const CUSTOM_COUNTRY_ZOOM = {
  // Russia spans ~160° of longitude; center on the Ural/western Siberia area
  'Russia': { center: [92, 62], scale: 2.2 },
}

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
  const [starHover, setStarHover] = useState(null) // { id, x, y } — star plot axis hover
  const [titleHover, setTitleHover] = useState(null) // { x, y } — L4 title hover for description panel
  const [activeDimension, setActiveDimension] = useState(null)
  const [l4Country, setL4Country] = useState(null) // country captured at L4 entry, so title is reliable
  const l4CountryRef = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [lineBrush, setLineBrush] = useState(null)
  const [lineHoverYear, setLineHoverYear] = useState(null)

  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const isCenteringRef = useRef(false)
  const pendingBackNavRef = useRef(null) // country name to navigate to after D3 re-init

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

        // Zoom behavior — filter blocks all user input while a centering animation runs
        const zoom = d3.zoom()
          .scaleExtent([1, 60])
          .filter((event) => !isCenteringRef.current && (!event.ctrlKey || event.type === 'wheel') && !event.button)
          .on('zoom', handleZoom)
        zoomBehaviorRef.current = zoom
        svg.call(zoom)

        // Track cursor position so we can re-apply hover state after programmatic zooms
        svg.on('mousemove.track', (event) => {
          lastMousePosRef.current = { x: event.clientX, y: event.clientY }
        })

        // If the user clicked ← Back in L4, navigate to the stored country
        // instead of resetting to world view. The D3 re-init was triggered by
        // the Timeline resize; by the time this callback runs, all paths exist.
        if (pendingBackNavRef.current) {
          const backCountry = pendingBackNavRef.current
          pendingBackNavRef.current = null
          const backFeat = countries.features.find((f) => resolveCountryName(f) === backCountry)
          if (backFeat) {
            const regionId = countryRegionMap[backCountry]
            if (regionId) {
              setFocusedRegion(regionId)
              focusedRegionRef.current = regionId
            }
            zoomToCountry(backCountry, backFeat)
            return
          }
        }

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
            // Dim all other zones, keep this one full opacity
            d3.selectAll('.zone').transition('fade').duration(150).attr('opacity', 0.25)
            d3.select(this.parentNode).transition('fade').duration(150).attr('opacity', 1)
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
            // Restore all zones to full opacity
            d3.selectAll('.zone').transition('fade').duration(150).attr('opacity', 1)
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
          // Highlight this country's stroke — opacity stays at 1
          d3.select(this)
            .attr('stroke', colors.hoverStroke)
            .attr('stroke-width', 1.2)
          // Temporarily dim all other in-region countries (out-of-region already permanently dim)
          const regionId = focusedRegionRef.current
          const inRegionSet = new Set(regionId ? (regionCountriesMap[regionId] || []) : [])
          d3.selectAll('.country').each(function () {
            const n = d3.select(this).attr('data-name')
            if (n !== name && inRegionSet.has(n)) {
              d3.select(this).transition('fade').duration(150).attr('opacity', 0.3)
            }
          })
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
          // Remove stroke highlight
          d3.select(this)
            .attr('stroke', colors.countryStroke)
            .attr('stroke-width', 0.4)
          // Restore all in-region countries to full opacity
          const regionId = focusedRegionRef.current
          const inRegionSet = new Set(regionId ? (regionCountriesMap[regionId] || []) : [])
          d3.selectAll('.country').each(function () {
            const n = d3.select(this).attr('data-name')
            if (inRegionSet.has(n)) {
              d3.select(this).transition('fade').duration(150).attr('opacity', 1)
            }
          })
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

    // event.sourceEvent is null for programmatic transitions (zoomToRegion, zoomToCountry,
    // resetToWorld). During those animations k starts low and would trigger wrong level
    // changes, undoing the fade that was already applied. Only run level logic for real
    // user-initiated scroll/drag events.
    if (!event.sourceEvent) {
      updateChoropleth()
      return
    }

    const currentLevel = zoomLevelRef.current
    const currentRegion = focusedRegionRef.current
    const currentCountry = focusedCountryRef.current

    // Determine new level from zoom scale
    let targetLevel = currentLevel

    if (currentLevel === ZOOM_LEVEL.WORLD) {
      // Always detect the zone under the cursor — never trust the cached focusedRegion.
      // Relying on the cached value caused stale-region bugs when returning to L1 from
      // a different region: the old value survived async React re-renders and the
      // `if (!effectiveRegion)` guard skipped detection entirely.
      const { x, y } = lastMousePosRef.current
      const el = document.elementFromPoint(x, y)
      const groupEl = el?.closest?.('[data-region]')
      const detected = groupEl ? groupEl.getAttribute('data-region') : null

      // Fall back to cached region only when cursor is over the ocean (no zone hit).
      const effectiveRegion = detected || currentRegion

      if (detected && detected !== currentRegion) {
        setFocusedRegion(detected)
        focusedRegionRef.current = detected
      }

      if (effectiveRegion) {
        const threshold = CONTINENT_THRESHOLDS[effectiveRegion] || 2
        if (k >= threshold) targetLevel = ZOOM_LEVEL.CONTINENT
      }
    } else if (currentLevel === ZOOM_LEVEL.CONTINENT) {
      // Zoom out
      const threshold = currentRegion ? CONTINENT_THRESHOLDS[currentRegion] || 2 : 2
      if (k < threshold) {
        targetLevel = ZOOM_LEVEL.WORLD
      }
      // Zoom in to country.
      // When scrolling (not clicking), focusedCountry is null — detect the country
      // currently under the cursor so scroll-zoom into L3 works without a prior click.
      let effectiveCountry = currentCountry
      if (!effectiveCountry) {
        const { x, y } = lastMousePosRef.current
        const el = document.elementFromPoint(x, y)
        const pathEl = el?.closest?.('path.country') ?? (el?.classList?.contains('country') ? el : null)
        if (pathEl) {
          const name = pathEl.getAttribute('data-name')
          if (name && countryRegionMap[name]) effectiveCountry = name
        }
      }
      if (effectiveCountry) {
        const cThreshold = getCountryThreshold(effectiveCountry)
        if (k >= cThreshold) {
          // Trigger the same centering animation as a click — find the feature and
          // call zoomToCountry so the country arrives at screen center before the
          // StarPlot renders. zoomToCountry handles updateZoomLevel + renderLevel.
          const feat = countriesGeoRef.current?.features.find(
            (f) => resolveCountryName(f) === effectiveCountry
          )
          if (feat) {
            zoomToCountry(effectiveCountry, feat)
            return
          }
          // Fallback: feature not found, at least switch the level
          if (effectiveCountry !== currentCountry) {
            setFocusedCountry(effectiveCountry)
            focusedCountryRef.current = effectiveCountry
            setFocused(effectiveCountry)
          }
          targetLevel = ZOOM_LEVEL.COUNTRY
        }
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
      // Clear focused region so the next scroll-in re-detects from cursor position
      // rather than reusing the stale value from the previous L2 session.
      setFocusedRegion(null)
      focusedRegionRef.current = null
      gZones.style('pointer-events', 'all')
      gZones.transition().duration(300).attr('opacity', 1)
      // Reset individual zone opacities that may have been dimmed during hover
      d3.selectAll('.zone').transition().duration(300).attr('opacity', 1)
      gCountries.transition().duration(300).attr('opacity', 0)
      // Reset any per-country opacity overrides left from L2 fade
      d3.selectAll('.country')
        .attr('opacity', 1)
        .attr('stroke', colors.countryStroke)
        .attr('stroke-width', 0.4)
      setFocusedCountry(null)
      setHoveredTarget(null)
      updateZoneFills()
    } else if (level === ZOOM_LEVEL.CONTINENT) {
      // Clear focused country so the next scroll-in re-detects from cursor position
      setFocusedCountry(null)
      focusedCountryRef.current = null
      setFocused(null)
      gZones.style('pointer-events', 'none')
      gCountries.style('pointer-events', null)  // restore hover interactivity from L3
      // Zones: non-selected are already dimmed by zoomToRegion's pre-fade.
      // Fade the group out mid-way through the zoom so the selected zone
      // stays visible as context while countries fade in beneath it.
      gZones.transition().delay(250).duration(400).attr('opacity', 0)
      // Countries: start appearing slightly after the pre-fade completes,
      // so both layers are never fully opaque at the same time.
      gCountries.transition().delay(150).duration(500).attr('opacity', 1)
      setHoveredTarget(null)
      updateChoropleth()
      applyFocusedRegionFade()
    } else if (level === ZOOM_LEVEL.COUNTRY) {
      gZones.style('pointer-events', 'none')
      gCountries.style('pointer-events', 'none')  // no hover/cursor on countries at L3
      gZones.transition().duration(300).attr('opacity', 0)
      gCountries.transition().duration(300).attr('opacity', 1)
      setHoveredTarget(null)
      updateChoropleth()
      applyFocusedCountryFade()
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
        .transition('choropleth').duration(animation.colorTransition)
        .attr('fill', fill)
    })
  }

  // ─── Update country choropleth fills ──────────────────────────────────────
  // Uses named transition 'choropleth' so it never interrupts the 'fade' opacity transitions.
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
        .transition('choropleth').duration(animation.colorTransition)
        .attr('fill', val != null ? getDemocracyColorFull(val) : colors.noData)
    })
  }

  // ─── Fade out countries not in focused region ──────────────────────────────
  // Uses named transition 'fade' so it runs concurrently with 'choropleth' fill transitions.
  function applyFocusedRegionFade() {
    const regionId = focusedRegionRef.current
    if (!regionId) return
    const regionCountries = new Set(regionCountriesMap[regionId] || [])

    d3.selectAll('.country').each(function () {
      const name = d3.select(this).attr('data-name')
      const inRegion = regionCountries.has(name)
      // In-region: full opacity — hover handler dims siblings temporarily
      // Out-of-region: near-invisible permanently at L2
      d3.select(this)
        .transition('fade').duration(300)
        .attr('opacity', inRegion ? 1 : 0.12)
    })
  }

  // ─── Fade out all countries except the focused one (L3) ──────────────────
  function applyFocusedCountryFade() {
    const country = focusedCountryRef.current
    d3.selectAll('.country').each(function () {
      const name = d3.select(this).attr('data-name')
      // Reset any hover stroke that was left over from the L2 mouseover handler
      d3.select(this)
        .attr('stroke', colors.countryStroke)
        .attr('stroke-width', 0.4)
      d3.select(this)
        .transition('fade').duration(300)
        .attr('opacity', name === country ? 1 : 0.12)
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

    // Immediately dim non-selected zones so the user sees the selection before
    // the zoom animation even starts. Selected zone stays at full opacity.
    subRegions.forEach(({ id: rid }) => {
      d3.select(svgRef.current)
        .select(`.zone-${rid}`)
        .transition().duration(150)
        .attr('opacity', rid === regionId ? 1 : 0.1)
    })

    const regionCountries = new Set(regionCountriesMap[regionId] || [])
    const feats = countries.features.filter((f) => regionCountries.has(resolveCountryName(f)))
    if (!feats.length) return

    const collection = { type: 'FeatureCollection', features: feats }
    let transform
    const customRegion = CUSTOM_REGION_ZOOM[regionId]
    if (customRegion) {
      const [px, py] = projection(customRegion.center)
      const s = customRegion.scale
      transform = d3.zoomIdentity.translate(w / 2 - s * px, h / 2 - s * py).scale(s)
    } else {
      const [[x0, y0], [x1, y1]] = pathGen.bounds(collection)
      const scale = Math.min(8, 0.85 / Math.max((x1 - x0) / w, (y1 - y0) / h))
      const tx = (w - scale * (x0 + x1)) / 2
      const ty = (h - scale * (y0 + y1)) / 2
      transform = d3.zoomIdentity.translate(tx, ty).scale(scale)
    }

    const zoomT = svg.transition().duration(animation.zoomDuration)
    zoomT.call(zoomBehaviorRef.current.transform, transform)
    zoomT.on('end', () => {
      if (zoomLevelRef.current !== ZOOM_LEVEL.CONTINENT) return
      const { x, y } = lastMousePosRef.current
      const el = document.elementFromPoint(x, y)
      if (!el) return
      const pathEl = el.closest?.('path.country') ?? (el.classList?.contains('country') ? el : null)
      if (!pathEl) return
      const name = pathEl.getAttribute('data-name')
      if (!name || !countryRegionMap[name]) return
      const rId = focusedRegionRef.current
      const inRegionSet = new Set(rId ? (regionCountriesMap[rId] || []) : [])
      if (!inRegionSet.has(name)) return
      d3.select(pathEl)
        .attr('stroke', colors.hoverStroke)
        .attr('stroke-width', 1.2)
      d3.selectAll('.country').each(function () {
        const n = d3.select(this).attr('data-name')
        if (n !== name && inRegionSet.has(n)) {
          d3.select(this).transition('fade').duration(150).attr('opacity', 0.3)
        }
      })
      const cache = datasetCacheRef.current
      const year = currentYearRef.current
      setHoveredTarget({
        type: 'country',
        name,
        democracyIndex: getCountryValue('democracyIndex', name, year, cache),
        gdpPerCapita:   getCountryValue('gdpPerCapita',   name, year, cache),
        population:     getCountryValue('population',     name, year, cache),
        populationDensity: getCountryValue('populationDensity', name, year, cache),
        mouseX: x,
        mouseY: y,
      })
    })

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

    // Centering k must land above the L3 entry threshold, otherwise large countries
    // (USA, Canada) whose auto-computed bounds include remote territories produce a
    // scale below the threshold and exit L3 on the very first post-animation scroll.
    const minScale = getCountryThreshold(name) * 1.2

    let transform
    const customCountry = CUSTOM_COUNTRY_ZOOM[name]
    if (customCountry) {
      const projection = projectionRef.current
      const [px, py] = projection(customCountry.center)
      const s = Math.max(customCountry.scale, minScale)
      transform = d3.zoomIdentity.translate(w / 2 - s * px, h / 2 - s * py).scale(s)
    } else {
      const [[x0, y0], [x1, y1]] = pathGen.bounds(feat)
      const rawScale = Math.min(60, 0.7 / Math.max((x1 - x0) / w, (y1 - y0) / h))
      const scale = Math.max(rawScale, minScale)
      const tx = (w - scale * (x0 + x1)) / 2
      const ty = (h - scale * (y0 + y1)) / 2
      transform = d3.zoomIdentity.translate(tx, ty).scale(scale)
    }

    isCenteringRef.current = true
    svg.transition()
      .duration(animation.zoomDuration)
      .call(zoomBehaviorRef.current.transform, transform)
      .on('end', () => { isCenteringRef.current = false })

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
  // Radius = quarter of container height so diameter fills half the screen,
  // but never smaller than the original 120px default.
  const starRadius = Math.max(120, Math.floor(dims.h / 4))


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
            radius={starRadius}
            onDimensionClick={(dim) => {
              // Capture the focused country synchronously into a ref+state before
              // any async state batching can clear it
              l4CountryRef.current = focusedCountry
              setL4Country(focusedCountry)
              setActiveDimension(dim)
              setStarHover(null)
              updateZoomLevel(ZOOM_LEVEL.DATA)
            }}
            onHover={(id, x, y) => setStarHover({ id, x, y })}
            onHoverEnd={() => setStarHover(null)}
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
          {/* Title row — back button left, centered title with inline hover zone */}
          <div
            style={{
              padding: '16px 24px 8px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'flex-start',
              position: 'relative',
            }}
          >
            {/* Back to L3 */}
            <button
              onClick={() => {
                const country = l4CountryRef.current
                setActiveDimension(null)
                setL4Country(null)
                setTitleHover(null)
                setStarHover(null)

                if (!country) {
                  resetToWorld()
                  return
                }

                // Go to world first (same as Home button). The Timeline reappearing
                // will resize the container → D3 re-init fires. The pendingBackNavRef
                // is read at the end of that re-init to navigate to the country once
                // all paths are rebuilt.
                pendingBackNavRef.current = country
                resetToWorld()

                // Fallback: if no resize/re-init fires (rare edge case), navigate
                // directly after the reset animation completes.
                setTimeout(() => {
                  if (!pendingBackNavRef.current) return // already handled by re-init
                  pendingBackNavRef.current = null
                  const feat = countriesGeoRef.current?.features.find(
                    (f) => resolveCountryName(f) === country
                  )
                  if (!feat) return
                  const regionId = countryRegionMap[country]
                  if (regionId) {
                    setFocusedRegion(regionId)
                    focusedRegionRef.current = regionId
                  }
                  zoomToCountry(country, feat)
                }, animation.zoomDuration + 100)
              }}
              style={{
                background: 'none',
                border: `1px solid ${colors.ui.panelBorder}`,
                borderRadius: 6,
                color: colors.ui.textMuted,
                fontFamily: typography.fontSans,
                fontSize: 12,
                padding: '4px 10px',
                cursor: 'pointer',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              ← Back
            </button>

            {/* Centered title — hover area is only the text span */}
            <div style={{ flex: 1, textAlign: 'center', pointerEvents: 'none' }}>
              <span
                style={{
                  fontFamily: typography.fontSans,
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.ui.text,
                  cursor: 'default',
                  userSelect: 'none',
                  pointerEvents: 'auto',
                }}
                onMouseEnter={(e) => setTitleHover({ x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setTitleHover({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTitleHover(null)}
              >
                {l4Country} - {datasetMeta[activeDimension]?.displayName}
              </span>
            </div>

            {/* Spacer to balance the back button */}
            <div style={{ width: 74, flexShrink: 0 }} />
          </div>

          {/* Line chart */}
          <div style={{ flex: 1, padding: '0 16px 16px', position: 'relative' }}>
            <LineChart
              countryName={l4Country}
              dimension={activeDimension}
              lineColor={colors.starPlotAxes[activeDimension] ?? colors.lineChart.line}
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
        </div>
      )}

      {/* L4 title hover — description panel */}
      {titleHover && zoomLevel === ZOOM_LEVEL.DATA && activeDimension && (
        <FloatingPanel x={titleHover.x} y={titleHover.y} visible maxWidth={300}>
          <PanelTitle>{datasetMeta[activeDimension]?.displayName}</PanelTitle>
          <div style={{
            marginTop: 8,
            fontSize: 12,
            color: colors.ui.textMuted,
            lineHeight: 1.6,
            fontFamily: typography.fontSans,
          }}>
            {descriptionMap[activeDimension]}
          </div>
        </FloatingPanel>
      )}

      {/* Star plot axis hover panel — shown at L3, outside the SVG so HTML renders correctly */}
      {starHover && zoomLevel === ZOOM_LEVEL.COUNTRY && (
        <FloatingPanel x={starHover.x} y={starHover.y} visible maxWidth={300}>
          <PanelTitle>{datasetMeta[starHover.id]?.displayName}</PanelTitle>
          <div style={{
            marginTop: 8,
            fontSize: 12,
            color: colors.ui.textMuted,
            lineHeight: 1.6,
            fontFamily: typography.fontSans,
          }}>
            {descriptionMap[starHover.id]}
          </div>
        </FloatingPanel>
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
