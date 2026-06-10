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
    world.topojson          # TopoJSON with properties.name per feature
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
      normalize.js          # computeGlobalRange, getOrComputeRange, normalizeValue (→0–100), formatValue/Population/Currency
      dataService.js        # CSV lazy-load, parseCsv (wide/long format), loadDataset, getCountryValue (with linear interpolation), getCountrySeries
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
        Timeline.jsx        # 1900–2018 slider, playback, brush range
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
| L2 | Continent | Scroll in past `CONTINENT_THRESHOLDS[regionId]` | Individual country paths, choropleth per country |
| L3 | Country/StarPlot | Scroll in past `getCountryThreshold(name)` | Star plot with 8 axes (StarPlot component), country silhouette faded |
| L4 | Data/LineChart | Click any spike on the star plot | Full-page line chart (LineChart component) |

The zoom level transitions happen inside `MapView.jsx`'s `handleZoom()` → `renderLevel()` functions, driven by D3 zoom transform `k`.

---

## 15 Sub-Regions

`north-america`, `central-america`, `south-america`, `north-africa`, `west-africa`, `central-africa`, `east-africa`, `south-africa`, `west-europe`, `east-europe`, `west-asia`, `south-asia`, `east-asia`, `central-asia`, `oceania`

Defined in `src/config/continentConfig.js`. The full `countryRegionMap` covers 167 countries.

---

## Country Name Reconciliation

TopoJSON world-atlas uses different names than Gapminder CSVs. The lookup map lives at the top of `MapView.jsx` as `TOPO_TO_GAPMINDER`:

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

Applied in `resolveCountryName(feat)`. If a new country doesn't match, add it here.

---

## CSV Data Loading

- All CSVs live in `src/data/` and are registered in `dataService.js` as `CSV_MODULES`
- Loaded via Vite `?raw` dynamic imports (lazy, on first request)
- Two formats supported: **wide** (country + year columns) and **long** (country/year/value columns) — auto-detected by `detectFormat()`
- `getCountryValue()` does linear interpolation between missing years
- `computeRegionAverage()` does population-weighted averaging over all countries in a region

---

## Design Tokens (theme.js)

All colors, sizes, and animation constants are exported from `src/theme.js`. Key items:

- `colors.democracyScale.low/mid/high` — red/white/blue for −10/0/+10
- `getDemocracyColorFull(value)` — D3 LAB interpolation, returns `colors.noData` for null
- `colors.starPlotAxes` — 8 named axis colors
- `layout.timelineHeight`, `layout.headerHeight`

Never hardcode colors inline — use `theme.js`.

---

## Zustand State (appStore.js)

```js
{
  currentYear,            // number (1900–2018)
  splitScreenActive,      // boolean
  overlayActive,          // boolean — only valid when both viewports at L3/L4
  focusedCountryLeft,     // string | null
  focusedCountryRight,    // string | null
  selectedDimension,      // string — active metric key
  datasetCache,           // { [metricName]: parsedData } — populated lazily
}
```

D3 handlers inside MapView must read state via refs (`datasetCacheRef`, `currentYearRef`, etc.) to avoid stale closures.

---

## MapView Architecture

`MapView.jsx` is the most complex component. Key facts:

- Uses `forwardRef` + `useImperativeHandle` to expose `{ zoomLevel }` to parent
- Fetches `/world.topojson` once via `fetch()` inside `useEffect`
- D3 zoom attached to a `<svg>` element via `d3.zoom()`
- `buildZones()` groups TopoJSON features by sub-region, creates `<g class="zone">` groups
- `buildCountries()` creates individual `<path>` elements, initially opacity 0
- L3 renders `<StarPlot>` as a React child in the SVG's coordinate space
- L4 renders full-page `<LineChart>` overlaid on the container via absolute positioning
- `searchTarget` prop: `{ type: 'reset' }` | `{ type: 'country', value: name }` | `{ type: 'region', value: id }`

---

## Known Pending Issues

1. **`App.jsx` passes `rightZoomLevel={ZOOM_LEVEL.WORLD}` hardcoded** to `Header` — the right viewport's actual zoom level isn't propagated up from `SplitScreenContainer`. The Overlay button enable/disable logic in `Header` is therefore inaccurate for the right side in split-screen mode.
2. **App not yet visually tested in browser** — `npm run build` succeeds cleanly (only expected chunk-size warnings for large CSVs). Dev server has not been run.

---

## Build

```sh
cd my-app
npm install
npm run dev    # development server
npm run build  # production build (succeeds; expect chunk-size warnings for CSV data files)
```

Vite config uses `@vitejs/plugin-react` and `@tailwindcss/vite` (no `tailwind.config.js` needed for v4).
