# InfVisProject — CLAUDE.md

This is a fully static React + Vite web application — **no backend, no server-side code**. All data is bundled as CSV files loaded lazily at runtime. The project implements an interactive Information Visualization tool built around a zoomable world map.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 (JSX only, no TypeScript) |
| Build | Vite |
| CSS | Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js`) |
| Geo | D3.js + TopoJSON |
| State | Zustand |
| Charting | D3.js (SVG, not canvas) |

**Important:** D3 owns SVG rendering; React owns UI chrome. They coexist via refs — never let React re-render overwrite D3 SVG output.

---

## Project Structure

```
my-app/
  public/
    world.topojson          # TopoJSON with properties.name per feature (pretty-printed)
  src/
    main.jsx
    App.jsx                 # Root layout, zoom-level state, search target state
    App.css                 # Minimal — most styling is inline via theme.js
    index.css               # @import "tailwindcss" + body/root resets
    theme.js                # ALL design tokens (colors, typography, layout, animation)
    config/
      continentConfig.js    # 15 sub-regions, countryRegionMap (167 countries), regionCountriesMap
      dimensionDescriptions.js  # Long-form descriptions for 9 metrics
      textConfig.js         # descriptionMap, datasetMeta (12 metrics), uiLabels, panelLabels, legendLabels
    store/
      appStore.js           # Zustand: currentYear, splitScreenActive, overlayActive, focusedCountry{Left,Right}, selectedDimension, datasetCache
    utils/
      normalize.js          # computeGlobalRange, getOrComputeRange (with MANUAL_RANGES), normalizeValue (→0–100), formatValue/Population/Currency
      dataService.js        # CSV lazy-load, parseCsv (wide/long format), CSV_NAME_FIX, loadDataset, getCountryValue, getCountrySeries
      continentAggregation.js   # computeRegionAverage — population-weighted, memoized
    hooks/
      useDataset.js         # React hook wrapping loadDataset
      useZoom.js            # ZOOM_LEVEL enum, CONTINENT_THRESHOLDS (15), COUNTRY_THRESHOLDS (per country), getCountryThreshold
    components/
      map/
        MapView.jsx         # Core component — D3 zoom, 4 levels, forwardRef
        ContinentZone.jsx   # Stub (logic lives in MapView D3 code)
        CountryPath.jsx     # Stub (logic lives in MapView D3 code)
      header/
        Header.jsx          # Single/split/overlay mode toggles, inline SVG icons
        SearchBar.jsx       # Autocomplete (167 countries + 15 regions), keyboard nav
      timeline/
        Timeline.jsx        # 1900–2018 slider, playback, brush range; animated thumb div
        PlaybackControls.jsx
      starplot/
        StarPlot.jsx        # 8-axis spider chart, reference rings at 25/50/75%
        StarAxis.jsx
        SpikeDot.jsx
      linechart/
        LineChart.jsx       # D3 brush, hover crosshair, overlay mode, solid/dashed null-gap segments
      ui/
        SplitScreenContainer.jsx  # 1 or 2 MapView instances, synced brush + hover year
        FloatingPanel.jsx   # Fixed-position tooltip anchored left of cursor
        LegendPanel.jsx     # Democracy gradient legend (L1–2) or CountryDetailPanel (L3)
```

---

## 4 Zoom Levels

| Level | Name | Trigger | Shows |
|---|---|---|---|
| L1 | World | Default | 15 sub-region zones, choropleth by democracy index (population-weighted average) |
| L2 | Continent | Click a zone or scroll past `CONTINENT_THRESHOLDS[regionId]` | Individual country paths, choropleth per country, region-based opacity fade |
| L3 | Country/StarPlot | Click a country or scroll past `getCountryThreshold(name)` | Star plot with 8 axes (StarPlot component), country silhouette faded |
| L4 | Data/LineChart | Click any spike on the star plot | Full-page line chart (LineChart component) |

The zoom level transitions happen inside `MapView.jsx`'s `handleZoom()` → `renderLevel()` functions, driven by D3 zoom transform `k`.

---

## 15 Sub-Regions

`north-america`, `central-america`, `south-america`, `north-africa`, `west-africa`, `central-africa`, `east-africa`, `south-africa`, `west-europe`, `east-europe`, `west-asia`, `south-asia`, `east-asia`, `central-asia`, `oceania`

Defined in `src/config/continentConfig.js`. The full `countryRegionMap` covers 167 countries. Sub-region zones do **not** render text labels on the map — hover panels provide the region info instead.

---

## Country Name Reconciliation

There are **two** name-reconciliation layers:

### 1. TopoJSON → Gapminder (`TOPO_TO_GAPMINDER` in `MapView.jsx`)

Maps TopoJSON feature names to the canonical Gapminder names used by `countryRegionMap`:

```js
const TOPO_TO_GAPMINDER = {
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Central African Rep.': 'Central African Republic',
  'Congo': 'Congo (Rep.)',
  'Dem. Rep. Congo': 'Congo (Dem. Rep.)',
  'Czechia': 'Czech Republic',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'Macedonia': 'North Macedonia',
  'Kyrgyzstan': 'Kyrgyz Republic',
  'S. Sudan': 'South Sudan',
  'Slovakia': 'Slovak Republic',
  'Solomon Is.': 'Solomon Islands',
  'United Arab Emirates': 'UAE',
  'United Kingdom': 'UK',
  'United States of America': 'USA',
  'eSwatini': 'Eswatini',
}
```

Applied in `resolveCountryName(feat)`. Add new entries here if a country path doesn't appear on the choropleth.

### 2. CSV name → Gapminder (`CSV_NAME_FIX` in `dataService.js`)

Gapminder CSVs use slightly different names for a few countries. Applied during `parseCsv()` before the `KNOWN_COUNTRIES` check:

```js
const CSV_NAME_FIX = {
  'Congo, Dem. Rep.': 'Congo (Dem. Rep.)',
  'Congo, Rep.':      'Congo (Rep.)',
  "Cote d'Ivoire":   "Côte d'Ivoire",
  'Lao':              'Laos',
}
```

Add new entries here if a country has data in a CSV but shows grey (no data) on the map.

---

## CSV Data Loading

- All CSVs live in `src/data/` and are registered in `dataService.js` as `CSV_MODULES`
- Loaded via Vite `?raw` dynamic imports (lazy, on first request)
- Two formats supported: **wide** (country + year columns) and **long** (`geo, time, name, <value>`) — auto-detected by `detectFormat()`
- `findValueColumn()` skips known geo-code columns (`geo`, `Geo`, `code`, `iso`, etc.) and returns the last remaining column
- `YEAR_RANGES` in `dataService.js` defines the valid year window per metric — rows outside are discarded at parse time

### `getCountryValue()` interpolation rules

- Exact year match → return that value (may be `null` if CSV had an empty cell)
- Year **before** the country's first data point → return `null` (shown as no-data grey)
- Year **after** the country's last data point → return last known value (forward-fill)
- Year between two data points → linear interpolation

This means countries like Vietnam correctly show grey at 1900 when their democracy data only starts in 1975.

---

## Normalization (`normalize.js`)

`getOrComputeRange(metricName, metricData)` checks `MANUAL_RANGES` first before auto-computing min/max. Two metrics have manual caps to prevent extreme outliers from crushing the 0–100 scale:

```js
const MANUAL_RANGES = {
  inflation:         { min: -20,  max: 50   },  // Venezuela 225k% hyperinflation excluded
  populationDensity: { min: 0,    max: 500  },  // Monaco/Singapore city-state outliers excluded
}
```

`normalizeValue()` clamps to [0, 100] — values above the cap render at 100%, not off-scale.

---

## Design Tokens (theme.js)

All colors, sizes, and animation constants are exported from `src/theme.js`. Key items:

- `colors.democracyScale.low/mid/high` — red/white/blue for −10/0/+10
- `getDemocracyColorFull(value)` — D3 LAB interpolation, returns `colors.noData` for null
- `colors.starPlotAxes` — 8 named axis colors
- `layout.timelineHeight`, `layout.headerHeight`
- `animation.zoomDuration` — 750ms for programmatic zoom transitions

Never hardcode colors inline — use `theme.js`.

---

## Zustand State (appStore.js)

```js
{
  currentYear,            // number (1900–2018), default 2018
  splitScreenActive,      // boolean
  overlayActive,          // boolean — only valid when both viewports at L3/L4
  focusedCountryLeft,     // string | null
  focusedCountryRight,    // string | null
  selectedDimension,      // string — active metric key
  datasetCache,           // { [metricName]: parsedData } — populated lazily
}
```

`setCurrentYear` accepts either a plain value or an updater function `(prev) => next` — both forms work. D3 handlers inside MapView must read state via refs (`datasetCacheRef`, `currentYearRef`, etc.) to avoid stale closures.

---

## Timeline

- Year range: 1900–2018, **default year: 2018**
- Speed levels: `[1, 2, 4, 8, 16]` × — **default: 4×**
- The native `<input type="range">` thumb is hidden (transparent); a separate animated `<div>` provides the visual dot with `transition: left 0.18s linear` for smooth playback animation
- Playback uses `setInterval` + updater-function form of `setCurrentYear`

---

## Zoom Thresholds (`useZoom.js`)

### Continent thresholds (`CONTINENT_THRESHOLDS`)

k value where scroll zoom transitions L1→L2. One per sub-region.

```js
'north-america':  1.5,   'central-america': 3.5,  'south-america':  1.8,
'north-africa':   2.0,   'west-africa':     2.5,   'central-africa': 2.5,
'east-africa':    2.5,   'south-africa':    3.0,   'west-europe':    2.5,
'east-europe':    1.5,   'west-asia':       2.2,   'south-asia':     2.2,
'east-asia':      1.8,   'central-asia':    2.0,   'oceania':        2.0,
```

### Country thresholds (`COUNTRY_THRESHOLDS`)

k value where scroll zoom transitions L2→L3. Default is 4.

**Invariant:** every country's L3 threshold must be **strictly greater** than its region's L2 continent threshold — otherwise L3 is unreachable via scroll. Example: `central-america` threshold is 3.5, so Mexico must be ≥ 3.6; it is set to 4.0.

```js
// Very large countries — low threshold
Russia: 2.0,  Canada: 2.5,  USA: 2.5,  China: 2.5,
Brazil: 2.8,  Australia: 2.5,  India: 3.0,
Argentina: 3.0,  Kazakhstan: 2.8,  Algeria: 3.0,
// Large-ish
'Congo (Rep.)': 3.5,  'Congo (Dem. Rep.)': 3.5,
Sudan: 3.0,  'Saudi Arabia': 3.0,  Mexico: 4.0,
Indonesia: 3.5,  Mongolia: 3.0,
// Medium
Germany: 5,  France: 5,  Turkey: 4.5,  Iran: 4,
Pakistan: 4,  Nigeria: 4,  Egypt: 4,  Ethiopia: 4,
// Small
UK: 6,  Japan: 6,  'South Korea': 7,  Vietnam: 6,
// Very small
Luxembourg: 12,  Cyprus: 12,  Singapore: 20,
Bahrain: 20,  Kuwait: 10,  Lebanon: 12,
```

**Note on key names:** threshold keys must match the **resolved Gapminder name** (after `TOPO_TO_GAPMINDER`), not the raw TopoJSON name. For example, `'Congo (Rep.)'` is correct; `'Congo'` would be a dead key and silently fall through to the default.

---

## MapView Architecture

`MapView.jsx` is the most complex component. Key facts:

- Uses `forwardRef` + `useImperativeHandle` to expose `{ zoomLevel }` to parent
- `dims` state initialises to `{ w: 0, h: 0 }` — D3 init effect only fires once `ResizeObserver` provides real dimensions, preventing double-initialisation
- D3 init `useEffect` uses an `AbortController` to cancel stale fetch callbacks if the effect re-runs
- Fetches `/world.topojson` once via `fetch()` inside `useEffect`
- D3 zoom attached to a `<svg>` element via `d3.zoom()`
- `buildZones()` groups TopoJSON features by sub-region, creates `<g class="zone zone-{id}">` groups with `data-region` attribute — **no text labels rendered**
- `buildCountries()` creates individual `<path>` elements inside `<g class="countries">`, initially `opacity: 0` via the group
- L3 renders `<StarPlot>` as a React child in the SVG's coordinate space
- L4 renders full-page `<LineChart>` overlaid on the container via absolute positioning
- `searchTarget` prop: `{ type: 'reset' }` | `{ type: 'country', value: name }` | `{ type: 'region', value: id }`

### Custom Zoom Overrides

Countries/regions whose `pathGen.bounds()` is unreliable (wraps the antimeridian, or includes distant territories) use manual overrides:

```js
const CUSTOM_REGION_ZOOM = {
  'east-europe': { center: [52, 55], scale: 2.0 },  // Russia skews bounding box
}

const CUSTOM_COUNTRY_ZOOM = {
  'Russia': { center: [92, 62], scale: 2.2 },  // spans ~160° of longitude
}
```

`center` is `[longitude, latitude]`; `scale` is the D3 zoom k value. Add entries here for any country or region that centers incorrectly.

### SVG Stacking Order

Inside `<g class="map-root">`:
1. Ocean `<rect>` + sphere `<path>` (background)
2. `<g class="countries">` — individual country paths (choropleth at L2+)
3. `<g class="zones">` — merged sub-region shapes (L1 only) — rendered ON TOP of countries

At L1: zones group is visible (`pointer-events: all`), countries group is `opacity: 0`.
At L2/L3: zones group is `opacity: 0` and `pointer-events: none` so mouse events reach country paths.

### Named D3 Transitions

All D3 transitions in MapView use explicit names to prevent mutual interruption (D3 unnamed transitions interrupt each other on the same element):

- `transition('choropleth')` — fill/color changes (`updateChoropleth`, `updateZoneFills`)
- `transition('fade')` — opacity changes (`applyFocusedRegionFade`, hover handlers, zone dimming)

**Never use unnamed `.transition()` in MapView** — it will cancel whichever other transition is running on the same element.

### Programmatic vs User Zoom Events

`handleZoom` checks `event.sourceEvent`:
- `null` → programmatic transition (from `zoomToRegion`, `zoomToCountry`, `resetToWorld`) → **skip level-change logic**, only call `updateChoropleth()`
- non-null → real user scroll/drag → run full level-change detection

This prevents a race condition where the zoom animation starts at `k≈1` and triggers a false snap back to L1 even though the level was already set to L2.

### L3 Centering Animation (`isCenteringRef`)

When the user scroll-zooms past the L3 threshold, `handleZoom` calls `zoomToCountry(name, feat)` directly (the same function used by click-zoom). This triggers a 750ms programmatic transition that centers the selected country on screen.

To prevent cursor movement from interrupting the animation:

- `isCenteringRef` is set to `true` before the transition starts
- `zoom.filter()` reads `isCenteringRef.current` and rejects all user input while it is true
- `transition.on('end', ...)` clears the flag

**Never use unnamed transitions in `zoomToCountry`** — use the same named transition pattern.

### `zoomToCountry` — Minimum Scale Floor

The centering transform enforces a floor of `getCountryThreshold(name) * 1.2`. This ensures the animation always lands **above** the L3 entry threshold, even for large countries (USA, Canada, Russia) where `pathGen.bounds()` returns a wide bounding box that includes distant territories (Alaska, overseas islands). Without the floor, the computed scale can land below the threshold and the very first post-animation scroll exits L3.

```js
const minScale = getCountryThreshold(name) * 1.2
// Applied to both custom and auto-computed scales
const scale = Math.max(rawScale, minScale)
```

### Focused Region Lifecycle

- `focusedRegion` is set when entering L2 (via click `zoomToRegion` or scroll-zoom detection in `handleZoom`)
- `focusedRegion` is **cleared** in `renderLevel(WORLD)` so the next scroll-in at L1 re-detects from cursor position rather than reusing the stale value
- This matters for the scroll-zoom path: zooming into east-asia, scrolling back to L1, then zooming into west-europe — without the clear, the stale `'east-asia'` would be used for the L2 fade

### Focused Country Lifecycle

- `focusedCountry` is set when entering L3 (via click or scroll-zoom)
- `focusedCountry` is **cleared** in `renderLevel(CONTINENT)` so the next scroll-in at L2 re-detects from cursor position rather than reusing the stale value
- `renderLevel(CONTINENT)` is called both for L1→L2 (via `zoomToRegion`) and L3→L2 (via scroll-out), so the clear happens in both paths

### Always-Detect Region in `handleZoom`

At L1, the WORLD branch **always** detects the zone under the cursor via `document.elementFromPoint`. It never trusts the cached `focusedRegion` value:

```js
const { x, y } = lastMousePosRef.current
const el = document.elementFromPoint(x, y)
const groupEl = el?.closest?.('[data-region]')
const detected = groupEl ? groupEl.getAttribute('data-region') : null

// Fall back to cached only when cursor is over ocean (no zone hit).
const effectiveRegion = detected || currentRegion

if (detected && detected !== currentRegion) {
  setFocusedRegion(detected)
  focusedRegionRef.current = detected
}
```

This is necessary because React's async state updates can overwrite `focusedRegionRef.current` (via the `focusedRegionRef.current = focusedRegion` assignment that runs on every render) after a manual ref write, causing the `if (!effectiveRegion)` guard to skip detection on subsequent scroll events.

### Opacity System

**L1 — World view:**
- All zones at `opacity: 1`
- Hover: hovered zone at `1`, all others dim to `0.25` (restored on mouseout)

**L2 — Continent view (three tiers, opacity only — fills managed by `updateChoropleth`):**
- Out-of-region countries: permanently `opacity: 0.12`
- In-region countries (not hovered): `opacity: 1`
- Hovered country: `opacity: 1` + stroke highlight (`colors.hoverStroke`, width 1.2)
- Other in-region countries while hovering: temporarily `opacity: 0.3` (restored on mouseout)

**L1→L2 transition sequence** (total zoom: 750ms):
1. t=0ms: Click — non-selected zones immediately transition to `opacity: 0.1` (150ms)
2. t=150ms: Countries group begins fading in (500ms, delay 150ms); `applyFocusedRegionFade` sets per-country opacities
3. t=250ms: Zones group fades to `opacity: 0` (400ms, delay 250ms)
4. t=650ms: Zones fully gone; countries at correct opacity tier
5. t=750ms: Zoom animation complete

---

## Known Pending Issues

1. **`App.jsx` passes `rightZoomLevel={ZOOM_LEVEL.WORLD}` hardcoded** to `Header` — the right viewport's actual zoom level isn't propagated up from `SplitScreenContainer`. The Overlay button enable/disable logic in `Header` is therefore inaccurate for the right side in split-screen mode.
2. **L3 (StarPlot) and L4 (LineChart) not yet fully visually tested end-to-end in split-screen / overlay modes** — single-viewport L1→L4 transitions have been confirmed working in browser.

---

## Build

```sh
cd my-app
npm install
npm run dev    # development server
npm run build  # production build (succeeds; expect chunk-size warnings for CSV data files)
```

Vite config uses `@vitejs/plugin-react` and `@tailwindcss/vite` (no `tailwind.config.js` needed for v4).
