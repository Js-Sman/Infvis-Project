# InfVis Project — Masterprompt

> **To the implementing Claude instance:** This document is the complete specification for building an Information Visualization web application from scratch. It contains every design decision, feature requirement, and architectural constraint needed to implement the project independently. Read all sections before writing any code. If something appears to conflict between sections, the later section in this document takes precedence.

---

## 0. Mission

Build an interactive **Information Visualization** web application that lets users explore social and economic Gapminder datasets geographically. Users navigate a world map through four zoom levels — from global overview down to a country-level star plot and line chart — with smooth animated transitions, a timeline slider spanning 1900–2018, and an optional side-by-side country comparison mode.

The finished app must deploy to **Vercel (free tier)** as a fully static React app with no server-side components.

---

## 1. Confirmed Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | React + Vite | Fully static — no backend |
| Language | JavaScript (JSX / JS) | No TypeScript |
| Geo-visualization | D3.js + TopoJSON | Hybrid D3+React integration (§4.3) |
| State management | Zustand | Lightweight, minimal boilerplate |
| Styling | Tailwind CSS | Utility-first |
| Design tokens | `theme.js` | Centralized JS constants file |
| Linting / formatting | ESLint + Prettier | Standard Vite/React setup |
| Deployment | Vercel free tier | No custom config needed |
| Data | Gapminder CSVs in `/src/data/` | Bundled by Vite at build time |
| Backend | **None** | All logic handled in React |
| Testing | **None** | Prototype/demo — no tests required |

---

## 2. Repository & File Structure

```
/src
  /components
    /header
      Header.jsx
      SearchBar.jsx
    /map
      MapView.jsx
      CountryPath.jsx
      ContinentZone.jsx
    /starplot
      StarPlot.jsx
      StarAxis.jsx
      SpikeDot.jsx
    /linechart
      LineChart.jsx
    /timeline
      Timeline.jsx
      PlaybackControls.jsx
    /ui
      FloatingPanel.jsx
      LegendPanel.jsx
      SplitScreenContainer.jsx
  /hooks
    useDataset.js
    useZoom.js
  /utils
    dataService.js
    continentAggregation.js
    normalize.js
  /data
    (12 Gapminder CSV files)
  /config
    continentConfig.js
    textConfig.js
  /store
    appStore.js
  theme.js
/public
  world.topojson
index.html
vite.config.js
```

**File naming conventions:**
- React component files: **PascalCase** → `.jsx` (e.g., `MapView.jsx`)
- Hook files: **camelCase** → `.js`, prefixed with `use` (e.g., `useDataset.js`)
- Utility / service files: **camelCase** → `.js` (e.g., `dataService.js`)
- Config / constants files: **camelCase** → `.js` (e.g., `theme.js`, `continentConfig.js`)

**Comments policy:** Minimal — only comment the non-obvious *why*. Well-named identifiers should be self-explanatory. Never add comments that merely restate what the code does.

---

## 3. Feature Specification

### 3.1 UI Look & Feel

**Theme:** Dark mode only. No light mode toggle, no system detection.

**Aesthetic:** Clean and immersive. Each piece of information appears only on demand — "Overview first, details on demand." The UI should feel enjoyable to explore; nothing should feel overwhelming.

**Color scale (choropleth map fill):**
- Encodes the **democracy index** (range: −10 to 10).
- **Diverging** color scale interpolated in **LAB color space** for perceptual uniformity.
- Color stops: `red` (−10) → `white` (0) → `blue` (+10).
- Countries with no data for the selected year: rendered **grey**.

**Typography:**
- Data values, legend numbers, axis percentages: **monospace** font.
- All other text (labels, UI chrome): default sans-serif.

**Legend panel:**
- Fixed position in the **bottom-left corner** of the viewport.
- Visible at Levels 1, 2, and 3. Hidden at Level 4.
- At Levels 1–2: shows 5 discrete color stops with labels describing the democracy index scale.
- At Level 3: replaced by the country detail panel (see §3.4 — Level 3).

**Floating panels:**
- Always appear to the **left of the cursor**.
- Implemented as a shared `FloatingPanel.jsx` component with a configurable content slot.
- Used for: hover data at Levels 1–2, star plot spike descriptions at Level 3.

---

### 3.2 Map & Zoom Levels

**Projection:** Natural Earth — use D3's `geoNaturalEarth1` projection. Countries and continents are rendered via D3.js from the TopoJSON data file — not a static image.

**Map file:** A single `world.topojson` in `/public` representing present-day borders. One file, never swapped. See §3.11 (Static Map Policy).

The TopoJSON file must be committed to the repository as a static asset — do not fetch it from a CDN or reference it via an npm package at runtime. Source it once from the `world-atlas` npm package (`countries-110m.json`) or the corresponding GitHub raw file, rename it `world.topojson`, place it in `/public/`, and commit it. This ensures the project is fully self-contained across machines.

**Zoom behavior:** Continuous scroll-wheel zoom, always centered on the cursor. Four distinct detail levels are revealed at calibrated zoom thresholds.

**Free scroll-wheel rule:** If the cursor is **not over a valid clickable target** (a continent zone or country path), zoom stops at the current level threshold and does not advance. The map only transitions to the next level when the cursor is directly over a valid target.

**Per-target threshold calibration:** Each continent and each country has an individually calibrated zoom threshold to account for geographic size differences, ensuring a consistent zoom experience regardless of whether the user is zooming into Russia or Luxembourg.

---

#### Level 1 — World View (starting state)

- Continent outlines visible; no individual country borders shown.
- Each of the 15 sub-continental zones is filled with a color derived from the **population-weighted democracy index average** of its constituent countries.
- Continent name labels visible on each zone.
- **Hover:** Highlight continent outline + floating panel (left of cursor) showing: zone name, population-weighted averages for democracy score, GDP per capita, population, population density.
- **Click:** Animated zoom to Level 2, fitting the entire clicked continent zone in the viewport.
- Timeline slider and Legend panel are both visible.

---

#### Level 2 — Continent View

- Individual **country borders and fills** revealed.
- Countries outside the focused continent fade into the background (do not disappear entirely).
- Each country filled with its democracy index color for the currently selected year.
- Countries with no data for that year rendered grey.
- **Hover:** Highlight country outline + floating panel (left of cursor) showing: country name (prominent), democracy score, GDP per capita, population, population density.
- **Click:** Animated zoom to Level 3 for that country.
- Timeline slider and Legend panel visible.

**Triggers for entering Level 2:**
- Click a continent zone from Level 1.
- Scroll-wheel zoom past the per-continent threshold while the cursor is over that continent.
- Search for a sub-continent by name (search result → auto-zoom to Level 2).

---

#### Level 3 — Country View (Star Plot)

- The selected country fills the viewport (or its viewport half in split-screen mode).
- Neighboring countries remain visible but faded in the background.
- The **star plot** appears centered in the viewport over the country.
- The bottom-left corner panel switches: the Legend panel is replaced by the **country detail panel** (the same data previously shown in the Level 2 hover panel — democracy score, GDP per capita, population, population density — now displayed permanently).
- **Hover over a spike dot:** Floating panel (left of cursor) shows the data dimension description and the most recent available timestamp for that point. If data is unavailable, shows "No data available" and the dimension description.
- **Click a spike dot:** Transition to Level 4 for that dimension.
- Timeline slider visible. Legend panel hidden (replaced by country detail panel).

**Triggers for entering Level 3:**
- Click a country from Level 2.
- Scroll-wheel zoom past the per-country threshold while cursor is over that country.
- Search for a country by name (search result → auto-zoom to Level 3).

---

#### Level 4 — Data View (Line Chart)

- Triggered by clicking a spike dot on the star plot at Level 3.
- Entry animation: a "pop" spring animation plays as the line chart view expands in.
- The line chart **fills the entire area below the header**, replacing the map and star plot.
- A **faint silhouette of the selected country** (TopoJSON path, ~5–10% opacity) is visible in the background as a reference.
- **Header:** Displays the full name of the selected dataset as the view title.
- **Description panel:** The same dimension description previously shown in the Level 3 spike hover panel now appears in the **bottom-left corner** (where the legend was). Also accessible via hovering a `?` icon next to the dataset name in the header.
- **Timeline slider:** Hidden at Level 4 — the time axis is built into the line chart itself.

**Line chart behavior:**
- Data sourced from the corresponding Gapminder CSV, using all timestamps available in that file for the selected metric.
- **Missing years:** Rendered as a **dashed line segment** interpolating between available data points.
- **Hover:** Hovering on the line shows the exact value for that point in time as a tooltip.
- **Brush selection:** User can drag on the time axis to highlight a range; content outside the selection is greyed out.

**Level 4 in split-screen mode:**
- Both viewports can independently show line charts for different countries but for the same metrics.
- Brush selection in one viewport simultaneously brushes the same time range in the other viewport.
- Hovering the line in one viewport shows a dotted vertical time marker; the same marker appears at the matching time position in the other viewport.

**Data Overlay at Level 4:**
- When the Overlay button is activated (available when both viewports are at Level 4), both line charts animate toward the center and combine into a single chart with both lines visible.
- The background country silhouettes remain in place.

---

### 3.3 Star Plot Design

**Axes — fixed, clockwise from top:**

| Position | Metric | Spike color |
|---|---|---|
| 1 (top) | Gini Index | Pink |
| 2 | Unemployment | Purple |
| 3 | Corruption | Orange |
| 4 | Life Expectancy | Lime green |
| 5 | Happiness | Yellow |
| 6 | Suicide Rate | Red |
| 7 | Literacy Rate | Blue |
| 8 | Inflation | Cyan |

**Scale:** All axes normalized to 0–100% relative to the global min/max of each metric across all countries and all years.

**Visual style:**
- Polygon: clear outline with **transparent fill**.
- Concentric reference rings at **25%, 50%, and 75%**.
- Axis labels always visible on the outer ring.
- Normalized value (0–100%) displayed on each axis.
- Each spike tip has a **clickable dot**.

**Missing data:**
- Spike dot rendered **grey at the 50% ring position** if data is unavailable for the selected year + country.
- Updates dynamically as the year slider changes.

**Size:** Fixed size (not scaled to country size on the map). This ensures visual comparability in split-screen overlay mode.

**Dismissal:** Not dismissible via a button. The star plot disappears only when the user zooms back out past the Level 3 threshold.

---

### 3.4 Header & Layout

The app has a persistent full-width header bar. Below it, the main viewport fills the remaining screen height.

#### Single-screen state

```
| "Democracy Index"  |        [ Search bar (centered) ]        |  [Open Compare]  [Home]  |
```

#### Split-screen state

```
| "Democracy Index"  |  [Search Left]  [Overlay]  [Search Right]  |  [Close Compare]  [Home]  |
```

**State transitions:**
- "Open Compare" → "Close Compare" when split-screen is active.
- "Overlay" → "Separate" when overlay is active.
- **"Close Compare" is disabled while overlay is active** — user must click "Separate" first.
- When split-screen activates, the single centered search bar morphs into two separate search bars, each centered over its respective viewport half.
- Each search bar only affects its own viewport.

**All header buttons:** Use icons with tooltip labels on hover.

> **Visual reference:** See `Header Mockup.jpeg` in the project folder for the layout of all three header states (normal, split-screen, overlay). Use it as a layout reference only — do not replicate the exact styling verbatim.

---

### 3.5 Timeline Component

- Persistent at Levels 1, 2, and 3. **Hidden at Level 4.**
- Full year range: **1900–2018**.
- Default state: **paused**.
- Controls: year slider + play/pause button + speed-up button + speed-down button.
- If the user drags the slider while animation is playing, playback **pauses automatically**.
- **Brush selection on slider:** User can drag to select a sub-range; animation then loops only within that selected range.
- When paused, playback stops at the current year and does not reset.

---

### 3.6 Search

- Visible search bar in the header center (never hidden behind an icon).
- Supports **autocomplete suggestions** as the user types.
- Searches by **country name** and **continent/sub-region name**.
- Selecting a country result: animated zoom to **Level 3** (star plot view) for that country.
- Selecting a continent/region result: animated zoom to **Level 2** for that region.

---

### 3.7 Navigation Interaction Summary

| Action | Behavior |
|---|---|
| Hover continent (Level 1) | Highlight outline + floating panel |
| Click continent (Level 1) | Animated zoom to Level 2 |
| Hover country (Level 2) | Highlight + floating panel |
| Click country (Level 2) | Animated zoom to Level 3 + star plot |
| Scroll wheel over valid target | Continuous zoom toward next level |
| Scroll wheel not over valid target | Stop at current level threshold |
| Search → country | Animated zoom to Level 3 |
| Search → continent / region | Animated zoom to Level 2 |
| Click spike dot (Level 3) | Transition to Level 4 |
| Hover spike dot (Level 3) | Floating panel with dimension description |
| Click empty space / ocean | Nothing — no back-navigation |
| Home button | Reset to Level 1 world view |
| Open Compare button | Activate split-screen mode |
| Overlay button (split-screen) | Overlay star plots (L3) or line charts (L4) |

---

### 3.8 Country Comparison (Split-Screen)

- Triggered by "Open Compare" button.
- Viewport splits in half with a vertical separator.
- **Right viewport resets to Level 1** world view.
- Both viewports navigate **fully independently** — each has its own zoom level, focused continent, focused country.
- **Data Overlay:** The Overlay button (in the header between the two search bars) is **only enabled when both viewports are at the same zoom level** (Level 3 or Level 4). When clicked, star plots (L3) or line charts (L4) animate toward the center and overlay.
  - At Level 3: two star plots merge and overlay each other with distinct colors.
  - At Level 4: two line charts combine into a single chart with both lines visible.
- "Close Compare" collapses split-screen and returns to single-screen mode.

---

### 3.9 Datasets

All 12 datasets are Gapminder CSVs bundled in `/src/data/`. Only the year ranges listed below are used. All datasets are time-series and update in real time with the year slider.

| # | Metric name | Unit | Year range | Used for |
|---|---|---|---|---|
| 1 | Gini Index | Index number | 1963–2018 | Star plot axis 1 |
| 2 | Literacy Rate | % | 1970–2018 | Star plot axis 7 |
| 3 | Life Expectancy | Years | 1900–2018 | Star plot axis 4 |
| 4 | Suicide Rate | Per 100,000 people | 2000–2018 | Star plot axis 6 |
| 5 | Unemployment Rate | % | 1975–2018 | Star plot axis 2 |
| 6 | Corruption Index | Index number | 2012–2018 | Star plot axis 3 |
| 7 | Inflation | % | 1961–2018 | Star plot axis 8 |
| 8 | Democracy Index | −10 to 10 | 1900–2018 | Map choropleth color + hover panel |
| 9 | Happiness Index | 0–100 | 2005–2018 | Star plot axis 5 |
| 10 | GDP per Capita | USD | 1900–2018 | Hover panel |
| 11 | Population | Absolute number | 1900–2018 | Hover panel + aggregation weight |
| 12 | Population Density | People per km² | 1950–2018 | Hover panel |

**Loading strategy:**
- Democracy Index (#8), GDP per Capita (#10), Population Density (#12) and Population (#11): **preloaded at app startup** — required at all levels from the beginning.
- All other datasets: **lazy-loaded** on first use.

**Data preprocessing on load:** When a CSV is loaded, filter it immediately to only the 167 countries in the democracy index country set and the metric's specified year range. Cache the processed result in the Zustand dataset cache.

---

### 3.10 Missing Data Handling

A unified approach applies at all levels. All states update dynamically as the year slider changes.

| Level | Component | Missing data behavior |
|---|---|---|
| 1–2 | Map | Country rendered grey if democracy index unavailable for selected year |
| 3 | Star plot spike | Spike dot rendered grey at 50% ring; floating panel shows warning + dimension description |
| 4 | Line chart | Dashed line segment interpolating between available data points |

---

### 3.11 Continent Groupings

The app uses **15 custom sub-continental zones** instead of the standard 7 continents. Each zone is a distinct, independently clickable entity with its own population-weighted aggregate.

| Group | Sub-regions |
|---|---|
| Americas | North America, Central America, South America |
| Africa | North Africa, West Africa, South Africa, East Africa, Central Africa |
| Europe | West Europe, East Europe _(Russia belongs to East Europe)_ |
| Asia | West Asia, South Asia, East Asia, Central Asia |
| Oceania | Oceania |

Each of the 167 countries belongs to exactly one sub-region. The mapping is defined in `/src/config/continentConfig.js`.

---

### 3.12 Countries Covered

The following 167 countries form the base country set (defined by the democracy index dataset). Countries not in this list are rendered grey on the map and have no interactive data.

Afghanistan, Angola, Albania, UAE, Argentina, Armenia, Australia, Austria, Azerbaijan, Burundi, Belgium, Benin, Burkina Faso, Bangladesh, Bulgaria, Bahrain, Bosnia and Herzegovina, Belarus, Bolivia, Brazil, Bhutan, Botswana, Central African Republic, Canada, Switzerland, Chile, China, Côte d'Ivoire, Cameroon, Congo (Dem. Rep.), Congo (Rep.), Colombia, Comoros, Cape Verde, Costa Rica, Cuba, Cyprus, Czech Republic, Germany, Djibouti, Denmark, Dominican Republic, Algeria, Ecuador, Egypt, Eritrea, Spain, Estonia, Ethiopia, Finland, Fiji, France, Gabon, UK, Georgia, Ghana, Guinea, Gambia, Guinea-Bissau, Equatorial Guinea, Greece, Guatemala, Guyana, Honduras, Croatia, Haiti, Hungary, Indonesia, India, Ireland, Iran, Iraq, Israel, Italy, Jamaica, Jordan, Japan, Kazakhstan, Kenya, Kyrgyz Republic, Cambodia, South Korea, Kuwait, Laos, Lebanon, Liberia, Libya, Sri Lanka, Lesotho, Lithuania, Luxembourg, Latvia, Morocco, Moldova, Madagascar, Mexico, North Macedonia, Mali, Myanmar, Montenegro, Mongolia, Mozambique, Mauritania, Mauritius, Malawi, Malaysia, Namibia, Niger, Nigeria, Nicaragua, Netherlands, Norway, Nepal, New Zealand, Oman, Pakistan, Panama, Peru, Philippines, Papua New Guinea, Poland, North Korea, Portugal, Paraguay, Qatar, Romania, Russia, Rwanda, Saudi Arabia, Sudan, Senegal, Singapore, Solomon Islands, Sierra Leone, El Salvador, Somalia, Serbia, South Sudan, Suriname, Slovak Republic, Slovenia, Sweden, Eswatini, Syria, Chad, Togo, Thailand, Tajikistan, Turkmenistan, Timor-Leste, Trinidad and Tobago, Tunisia, Turkey, Tanzania, Uganda, Ukraine, Uruguay, USA, Uzbekistan, Venezuela, Vietnam, Yemen, South Africa, Zambia, Zimbabwe

---

### 3.13 Static Map Policy

The app uses a **single, fixed TopoJSON file** (`/public/world.topojson`) representing present-day country borders. Historical border changes are explicitly ignored. All Gapminder data is treated as if today's countries have always existed in their current form. No special handling is needed for countries formed after border changes — display the Gapminder data as-is.

**Implementation consequence:** Only one TopoJSON file is needed. Never load or swap historical map versions based on the selected year.

---

## 4. Code Architecture

### 4.1 Component Tree

```
App
├── Header.jsx                          ← React — full width, persistent
│   ├── SearchBar.jsx                   ← React — one or two instances depending on mode
│   └── (overlay / compare buttons)
├── SplitScreenContainer.jsx            ← React — mounts 1 or 2 MapView instances
│   ├── MapView.jsx                     ← Hybrid: D3 owns SVG, React owns UI chrome
│   │   ├── (D3 SVG: map, star plot, line chart)
│   │   └── FloatingPanel.jsx           ← React — hover info panels
│   └── MapView.jsx                     ← Second instance (split-screen only)
├── LegendPanel.jsx                     ← React — fixed bottom-left
└── Timeline.jsx                        ← React — year slider + playback
    └── PlaybackControls.jsx
```

---

### 4.2 State Management (Zustand)

**Global state** (`/src/store/appStore.js`) — shared across the whole app:

```js
{
  currentYear: number,                  // driven by the Timeline slider
  splitScreenActive: boolean,
  overlayActive: boolean,
  focusedCountryLeft: string | null,    // ISO country code or name
  focusedCountryRight: string | null,
  selectedDimension: string | null, // active spike/line chart dimension — synced to both viewports
  datasetCache: Map,                    // keyed by metric name; stores processed CSV data
}
```

**Local state** (inside each `MapView` instance — `useState` / `useRef`, never Zustand):

```js
{
  zoomLevel: 1 | 2 | 3 | 4,
  focusedContinent: string | null,
  focusedCountry: string | null,
  d3Transform: { x, y, k },            // current D3 zoom transform state
}
```

**Overlay constraint enforcement:** `SplitScreenContainer` reads the `zoomLevel` from both `MapView` instances (via callback ref or a small shared ref). The Overlay button is only enabled when `leftZoomLevel === rightZoomLevel && (leftZoomLevel === 3 || leftZoomLevel === 4)`.

---

### 4.3 D3 + React Integration (Hybrid)

**React owns** (standard JSX rendering):
- `Header` bar, buttons, search bars
- `FloatingPanel` components
- `LegendPanel`
- `Timeline` / `PlaybackControls`
- `SplitScreenContainer` layout wrapper

**D3 owns** (via `useEffect` in `MapView`, mutates the SVG DOM directly):
- The `<svg>` element and all child SVG nodes (country paths, continent zones)
- Zoom and pan behavior (`d3.zoom`)
- Color fill transitions (choropleth animation on year change)
- Star plot rendering and spike animations
- Line chart rendering

**How they communicate:**
- D3 reads global Zustand state (current year, overlay active) inside `useEffect` hooks — it subscribes to changes.
- Interaction events (hover, click) are handled by D3 event listeners that call Zustand `set()` to update shared state (e.g., `focusedCountryLeft`).
- D3 does not render React elements; React does not render SVG paths for the map.

**SVG vs Canvas:** Start with SVG. If runtime performance proves insufficient for 150+ animated country paths, introduce Canvas rendering for the fill layer only as a targeted optimization.

---

### 4.4 Data Layer

All data access goes through the service layer. **Components and D3 code never import CSV files directly.**

**`dataService.js` — core functions:**
- `loadDataset(metricName)` — fetches and parses the CSV, writes processed result to Zustand `datasetCache`.
- `getCountryValue(metricName, countryId, year)` — returns the value for a given country + year, or `null` if not available.
- `getRegionAverage(metricName, regionId, year)` — returns the population-weighted average across all countries in the sub-region.
- `normalizeValue(metricName, rawValue)` — normalizes to 0–100% using the global min/max for that metric across all years and all countries.

**`useDataset(metricName, year)` hook:**
- Triggers lazy-loading on first call if not already cached.
- Returns `{ data, loading, error }`.
- Preloads Democracy Index and Population in `App.jsx` on mount.

**`continentAggregation.js`:**
- `computeRegionAverage(metricName, regionId, year, populationData)` — filters to countries in the region, weights by population, returns the weighted average.
- Memoize results to avoid recomputing on every render.

**CSV format handling (`dataService.js`):** Gapminder files may use wide format (country column + one column per year) or tidy/long format (country, year, value columns). Auto-detect the format by checking whether the header contains a `year` column or numeric year column names.

---

### 4.5 Theme & Design Tokens

All colors, sizes, and visual constants are centralized in `/src/theme.js`. Both React components and D3 code import from this file — never hardcode color values elsewhere.

```js
// theme.js — structure (implement with actual values)
export const colors = {
  background: '...',
  democracyScale: {
    low: '...',   // red  (−10)
    mid: '...',   // white (0)
    high: '...',  // blue (+10)
  },
  noData: '...',          // grey for missing data
  faded: '...',           // color for background countries / continents
  starPlotAxes: {
    giniIndex: '...',     // pink
    unemployment: '...',  // purple
    corruption: '...',    // orange
    lifeExpectancy: '...', // lime green
    happiness: '...',     // yellow
    suicideRate: '...',   // red
    literacyRate: '...',  // blue
    inflation: '...',     // cyan
  },
  ui: {
    header: '...',
    panel: '...',
    separator: '...',
  },
}

export const typography = {
  fontMono: '...',
  fontSans: '...',
}

export const layout = {
  headerHeight: ...,
  timelineHeight: ...,
  legendWidth: ...,
}
```

---

### 4.6 `continentConfig.js`

This file defines:
1. The 15 sub-continental zones and their display names.
2. The mapping of every country in the 167-country set to its sub-region.

```js
// /src/config/continentConfig.js — structure
export const subRegions = [
  { id: 'north-america', name: 'North America', group: 'Americas' },
  { id: 'central-america', name: 'Central America', group: 'Americas' },
  { id: 'south-america', name: 'South America', group: 'Americas' },
  { id: 'north-africa', name: 'North Africa', group: 'Africa' },
  { id: 'west-africa', name: 'West Africa', group: 'Africa' },
  { id: 'south-africa', name: 'South Africa', group: 'Africa' },
  { id: 'east-africa', name: 'East Africa', group: 'Africa' },
  { id: 'central-africa', name: 'Central Africa', group: 'Africa' },
  { id: 'west-europe', name: 'West Europe', group: 'Europe' },
  { id: 'east-europe', name: 'East Europe', group: 'Europe' },  // includes Russia
  { id: 'west-asia', name: 'West Asia', group: 'Asia' },
  { id: 'south-asia', name: 'South Asia', group: 'Asia' },
  { id: 'east-asia', name: 'East Asia', group: 'Asia' },
  { id: 'central-asia', name: 'Central Asia', group: 'Asia' },
  { id: 'oceania', name: 'Oceania', group: 'Oceania' },
]

export const countryRegionMap = {
  'Afghanistan': 'south-asia',
  'Albania': 'east-europe',
  // ... all 167 countries
}
```

---

### 4.7 `textConfig.js`

All user-facing text — descriptions, labels, tooltips, warnings — is centralized in `/src/config/textConfig.js`. Components import from this file; strings are never hardcoded in JSX or D3 code. This allows copy and descriptions to be updated without touching component files.

```js
// /src/config/textConfig.js — structure (fill in actual copy)

// One entry per dataset. Keys match the metricName identifiers used in dataService.js.
export const datasetText = {
  giniIndex: {
    displayName: 'Gini Index',
    shortName: 'Gini',
    unit: 'Index (0–100)',
    description: '...',   // 2–4 sentences explaining what this metric measures
  },
  unemployment: {
    displayName: 'Unemployment Rate',
    shortName: 'Unemployment',
    unit: '% of labor force',
    description: '...',
  },
  corruption: {
    displayName: 'Corruption Index',
    shortName: 'Corruption',
    unit: 'Index number',
    description: '...',
  },
  lifeExpectancy: {
    displayName: 'Life Expectancy',
    shortName: 'Life Expectancy',
    unit: 'Years',
    description: '...',
  },
  happiness: {
    displayName: 'Happiness Index',
    shortName: 'Happiness',
    unit: 'Index (0–100)',
    description: '...',
  },
  suicideRate: {
    displayName: 'Suicide Rate',
    shortName: 'Suicide Rate',
    unit: 'Per 100,000 people',
    description: '...',
  },
  literacyRate: {
    displayName: 'Literacy Rate',
    shortName: 'Literacy',
    unit: '% of population',
    description: '...',
  },
  inflation: {
    displayName: 'Inflation',
    shortName: 'Inflation',
    unit: '% per year',
    description: '...',
  },
  democracyIndex: {
    displayName: 'Democracy Index',
    shortName: 'Democracy',
    unit: '−10 to +10',
    description: '...',
  },
  gdpPerCapita: {
    displayName: 'GDP per Capita',
    shortName: 'GDP/capita',
    unit: 'USD',
    description: '...',
  },
  population: {
    displayName: 'Population',
    shortName: 'Population',
    unit: 'People',
    description: '...',
  },
  populationDensity: {
    displayName: 'Population Density',
    shortName: 'Density',
    unit: 'People per km²',
    description: '...',
  },
}

// All button labels and their hover tooltips
export const uiLabels = {
  appTitle: 'Democracy Index',
  buttons: {
    home: { label: 'Home', tooltip: 'Reset to world view' },
    openCompare: { label: 'Open Compare', tooltip: 'Open split-screen comparison' },
    closeCompare: { label: 'Close Compare', tooltip: 'Close split-screen comparison' },
    overlay: { label: 'Overlay', tooltip: 'Overlay both views' },
    separate: { label: 'Separate', tooltip: 'Separate overlaid views' },
  },
  search: {
    placeholder: 'Search country or region…',
  },
}

// Labels for the hover info panel fields (Levels 1–2) and the permanent country panel (Level 3)
export const panelLabels = {
  democracyScore: 'Democracy Score',
  gdpPerCapita: 'GDP per Capita',
  population: 'Population',
  populationDensity: 'Pop. Density',
  noDataWarning: 'No data available for this country and year.',
  noDataShort: 'No data',
}

// Labels for the 5-level democracy index legend (Levels 1–2)
export const legendLabels = {
  title: 'Democracy Index',
  levels: [
    { value: -10, label: 'Authoritarian' },
    { value: -5,  label: 'Hybrid' },
    { value: 0,   label: 'Neutral' },
    { value: 5,   label: 'Flawed Democracy' },
    { value: 10,  label: 'Full Democracy' },
  ],
  noData: 'No data',
}
```

**Usage rule:** Every string visible to the user must come from `textConfig.js`. The `description` fields in `datasetText` are the texts shown in the floating panel when hovering a star plot spike (Level 3) and in the description panel at Level 4. Fill in meaningful copy for each before shipping.

---

## 5. Implementation Order

Build in this sequence to minimize blocked dependencies:

1. **Project scaffold** — Vite + React + Tailwind + Zustand + ESLint + Prettier.
2. **`theme.js`** — define all color constants, axis colors, layout values.
3. **`continentConfig.js`** — full country → sub-region mapping for all 167 countries.
4. **`textConfig.js`** — all display names, descriptions, labels, and tooltips.
5. **`dataService.js` + `useDataset.js`** — CSV loading, caching, normalization utilities.
6. **`Header.jsx` + `SearchBar.jsx`** — layout for all three header states (single, split, overlay).
7. **`Timeline.jsx` + `PlaybackControls.jsx`** — year slider, play/pause, brush selection, speed controls.
8. **`LegendPanel.jsx` + `FloatingPanel.jsx`** — reusable panel components.
9. **`MapView.jsx` — Level 1** — Natural Earth D3 projection, continent zone fills, choropleth color, hover and click interactions.
10. **`MapView.jsx` — Level 2** — Country borders, per-country choropleth, zoom transition from Level 1.
11. **`MapView.jsx` — Level 3** — Star plot overlay, spike hover, spike click interaction.
12. **`MapView.jsx` — Level 4** — Line chart view, country silhouette background, brush + hover sync.
13. **`SplitScreenContainer.jsx`** — mount 1 or 2 `MapView` instances with isolated local state; enforce overlay constraint.
14. **Split-screen wiring** — dual search bars, overlay button activation, synchronized brush/hover in Level 4.
15. **Full Zustand integration** — wire year slider to all D3 effects, wire split/overlay mode, wire dataset selection.
16. **Vercel deployment check** — verify `vite.config.js` produces a clean static build.

---

## 6. Constraints & Edge Cases

| Constraint | Handling |
|---|---|
| Country not in the 167-country list | Render grey on map; no hover panel; no star plot |
| Year outside a dataset's range (e.g., 1900 for Gini Index which starts 1963) | Treat as missing — grey spike at 50% on star plot |
| Overlay button when zoom levels differ | Button disabled; `SplitScreenContainer` enforces at UI level |
| "Close Compare" while overlay is active | Button disabled; user must click "Separate" first |
| Scroll wheel with cursor not over a valid target | Zoom stops at current level threshold; does not advance |
| Level 4 back-navigation | Achieved only by zooming out (same threshold-based mechanism); no explicit back button |
| Country background at Level 4 | Render the TopoJSON path at ~5–10% opacity behind the line chart |
| Continental average when some constituent countries have no data | Compute average from only the countries that have data for that year; do not treat missing as zero |

---

## 7. Reference Files

The following files are in the same project folder as this Masterprompt and should be consulted during implementation:

- **`Header Mockup.jpeg`** — Visual reference for the three header states (normal, split-screen, active overlay). Use for layout reference; do not replicate the exact styling 1:1.
- **`InfVisProject_Design_Survey.md`** — Full feature specification source document.
- **`InfVisProject_Architecture_Survey.md`** — Full architecture specification source document.

If any detail conflicts between those documents and this Masterprompt, **this Masterprompt takes precedence**.

---

_Generated: 2026-06-10_
