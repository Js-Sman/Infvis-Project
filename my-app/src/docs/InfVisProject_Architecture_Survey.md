# InfVis Project — Code Architecture Survey

> **Purpose:** Fill out this document to define how the codebase should be structured. The answers will be merged with the feature specification survey into the final Masterprompt.  
> **Instructions:** Answer the questions under each section. Use the _Notes_ fields freely. Leave a question blank if you are unsure — we can discuss it.

---

## 0. Already Confirmed (Do Not Change Without Discussion)

| Decision | Value |
|---|---|
| Frontend framework | React + Vite |
| Visualization library | D3.js + TopoJSON |
| Backend | **None** — all logic handled in React (see section 7) |
| Data | Bundled Gapminder CSVs (static files in repo) |
| Deployment | Vercel (free tier) |
| Language (frontend) | JavaScript (JSX / JS) |

---

## 1. Repository Structure

### 1.1 Monorepo vs. Separate Repos
Should the frontend (React) and backend (Python) live in the same repository?
- [x] Single repository (no backend — frontend only)
- [ ] Separate repositories

**Answer:**

**Notes:**
A Python backend is not needed. The only server-side responsibility would have been a small amount of data preparation, which React can handle on its own.

---

### 1.2 Top-Level Folder Structure
How should the top-level project folders be organized?

- [x] **By type at the top level, by feature within each type:**
  ```
  /src
    /components
      /map
      /starplot
      /timeline
      /linechart
      /header
    /hooks
    /utils
    /data
  /public
  ```
- [ ] **By feature** — group everything related to a feature together
- [ ] **Hybrid** — top-level features, with shared utilities alongside
- [ ] **No strong preference — use best practice**

**Answer:** Top-level folders organized by type (`components`, `hooks`, `utils`, `data`). Sub-folders within `components` organized by feature (`map`, `starplot`, `timeline`, `linechart`, `header`).

**Notes:**

---

### 1.3 Data Files Location
Where should the Gapminder CSV files be stored in the project?
- [ ] `/public/data/` — served as static assets, fetched by the browser at runtime
- [x] `/src/data/` — bundled into the build by Vite
- [ ] `/data/` — at the project root
- [ ] No preference

**Answer:**

**Notes:**

---

## 2. Language & Type Safety

### 2.1 TypeScript vs. JavaScript
Should the project use TypeScript or plain JavaScript?
- [ ] TypeScript (strict type checking, better IDE support, more setup)
- [x] JavaScript (faster to write, no compilation step)
- [ ] No strong preference

**Answer:** JavaScript. Component files use `.jsx`, hook and utility files use `.js`.

**Notes:**

---

### 2.2 TypeScript Strictness
Not applicable — JavaScript is used.

---

## 3. React Component Architecture

### 3.1 Component Granularity
How fine-grained should React components be?
- [ ] **Coarse** — few large components
- [x] **Fine-grained / atomic** — many small, reusable components (e.g., separate `FloatingPanel`, `Legend`, `SpikeDot` components)
- [ ] **Somewhere in between — use judgement**

**Answer:**

**Notes:**

---

### 3.2 Zoom Level Views as Components
Each zoom level (World, Continent, Country, Data View) has distinct UI. How should these be structured?
- [x] One `MapView` component that renders different content based on a zoom state variable
- [ ] Separate components per level (`WorldView`, `ContinentView`, `CountryView`, `DataView`), mounted/unmounted as needed
- [ ] No strong preference

**Answer:** A single `MapView` component is preferred to keep zoom transitions seamless. Split-screen mode requires two independent instances, so the architecture must support mounting two separate `MapView` components in parallel, each with fully isolated state.

**Notes:**
This point requires further discussion. The recommended approach is a `SplitScreenContainer` that mounts one or two `MapView` instances, each with its own isolated Zustand store slice. See section 5 for state management details.

---

### 3.3 Floating Panels
Should all floating panels (hover tooltips, info panels, dimension descriptions) share one reusable `FloatingPanel` component, or should each be its own component?
- [x] One shared `FloatingPanel` component with configurable content
- [ ] Separate components per use case
- [ ] No preference

**Answer:**

**Notes:**
The legend panel should be a separate component, as its layout and content differ significantly from the floating hover panels.

---

## 4. D3.js + React Integration

This is one of the most important architectural decisions for this project. There are three common approaches:

| Approach | Description | Trade-off |
|---|---|---|
| **A — D3 owns the DOM** | React renders a single `<svg>` or `<div>`. D3 takes over and manages all SVG elements directly via `useEffect`. | Full D3 power; bypasses React's virtual DOM — harder to debug, less React-idiomatic. |
| **B — React renders, D3 calculates** | D3 is used only for math (scales, projections, path generators). React renders all SVG elements via JSX. | Clean React patterns; may hit performance limits with many animated elements. |
| **C — Hybrid** | D3 owns complex animated SVG (the map, star plot). React renders all UI chrome (header, panels, legend, timeline). | Best of both; recommended for geo-visualization with rich UI. |

Which approach should be used?
- [ ] A — D3 owns the DOM
- [ ] B — React renders, D3 calculates
- [x] C — Hybrid (recommended for this project)
- [ ] No preference — use best practice

**Answer:**

**Notes:**
The header and all static UI elements (control buttons, search bar) are handled by React. The map, line chart, and star plot — all of which require complex animated SVG — are handled by D3.

---

### 4.1 SVG vs. Canvas Rendering
D3 can render to SVG or HTML Canvas. For 150+ countries with animated transitions and a year slider:
- [x] **SVG** — easier to style, animate, and attach hover events; may slow down with many elements
- [ ] **Canvas** — faster for large numbers of elements; harder to attach per-element hover events
- [ ] **Hybrid** — SVG for interactive elements (countries, star plot spikes), Canvas for background layers
- [ ] No preference — use best practice

**Answer:**

**Notes:**
Use SVG if it can support the seamless animated zoom transitions between zoom levels. If performance proves insufficient at runtime, fall back to Canvas.

---

## 5. State Management

### 5.1 Global State Approach
Several pieces of state need to be shared across the whole app (current year, zoom level, selected country, split-screen mode, overlay mode). What approach should manage this?
- [ ] **React Context + useReducer** — built-in, no extra dependencies; can get verbose for complex state
- [x] **Zustand** — lightweight external library; minimal boilerplate
- [ ] **Redux Toolkit** — powerful, mature; more setup, better for very complex state
- [ ] **Jotai / Recoil** — atomic state; good for fine-grained subscriptions
- [ ] No preference — use best practice

**Answer:**

**Notes:**

---

### 5.2 State Shape
Which of these pieces of state should be global (shared across components)?

- [x] Currently selected year (from timeline slider)
- [ ] Current zoom level (World / Continent / Country / Data View) — local to each `MapView` instance
- [ ] Currently focused continent — local to each `MapView` instance
- [x] Currently focused country — left viewport
- [x] Currently focused country — right viewport (split-screen)
- [x] Currently selected star plot dimension (for Data View)
- [x] Split-screen active (boolean)
- [x] Overlay active (boolean)
- [x] Loaded dataset cache (to avoid re-fetching)

**Answer / Notes:**
Each split-screen viewport must be fully independent — users should be able to zoom, pan, and search on each side separately. Zoom level and focused continent are therefore local state within each `MapView` instance, not global state.

The Data Overlay feature should only be enabled when both viewports are at the same zoom level. This constraint should be enforced by comparing the local zoom state of both `MapView` instances.

---

## 6. Data Loading & Processing

### 6.1 CSV Loading Strategy
When should each CSV dataset be loaded?
- [ ] **All at startup** — load all 12 CSVs when the app first opens
- [ ] **Lazy / on demand** — load a dataset only when the user first needs it
- [x] **Preload core datasets, lazy-load the rest** — always load democracy index and population upfront; load star plot datasets on demand

**Answer:**

**Notes:**
All dataset loading should follow the lazy-loading pattern — load only what is needed, when it is needed. The democracy index and population datasets are exceptions, as they are required at all zoom levels from the start.

---

### 6.2 Data Processing Location
Where should data filtering and transformation happen?
- [ ] **Python backend**
- [ ] **Frontend at startup**
- [x] **Frontend on demand** — process each dataset when it is first requested
- [ ] No preference

**Answer:**

**Notes:**
React's built-in functionality is sufficient to filter data on demand. The continental average calculation is not computationally intensive enough to justify a dedicated backend.

---

### 6.3 Continent Average Computation
Continental averages are population-weighted averages of country values. Where should this be computed?
- [ ] Python backend
- [x] React frontend (computed in a utility function, memoized)
- [ ] No preference

**Answer:**

**Notes:**

---

### 6.4 Data Access Pattern
Should data loading be abstracted behind a service or hook layer?
- [x] **Yes** — a dedicated `useDataset(metricName, year)` hook or `dataService.js` module that components call. Components never import CSV files directly.
- [ ] **No** — components fetch and process data directly as needed.
- [ ] No preference

**Answer:**

**Notes:**
A dedicated data service layer handles all data retrieval and preprocessing. Visualization components are responsible for presentation only, not data manipulation. This enforces a clear separation of concerns.

---

## 7. Python Backend

### 7.1 Backend Necessity
- [ ] **Yes, keep the backend**
- [x] **No backend** — all logic handled in React on the frontend
- [ ] Unsure

**Answer:** No backend required. The frontend handles all CSV loading, filtering, and continental average computation directly.

**Notes:**

---

### 7.2 API Endpoint Structure
Not applicable — no backend.

---

## 8. Styling & Theming

### 8.1 CSS Approach
How should the app be styled?
- [ ] **Plain CSS with CSS Modules**
- [x] **Tailwind CSS** — utility-first, fast to write
- [ ] **Styled Components / Emotion**
- [ ] **Plain global CSS**
- [ ] No preference — use best practice

**Answer:**

**Notes:**

---

### 8.2 Design Tokens / Theming
The app has a fixed dark theme with a specific color palette (LAB-space diverging scale, spike colors per axis, etc.). How should these values be managed?
- [ ] CSS custom properties (variables) in a global `:root` block
- [x] A JavaScript constants file (e.g., `theme.js`) imported by components and D3
- [ ] Both — CSS variables for styling, JS constants for D3
- [ ] No preference

**Answer:**

**Notes:**
All theme values and colors should be centralized in `theme.js` so they can be reconfigured manually later without hunting through component files.

---

### 8.3 Text & Copy Configuration

All user-facing text (dimension descriptions, panel labels, button tooltips, legend labels, warning messages) is centralized in `/src/config/textConfig.js`. Components and D3 code import strings from this file — nothing is hardcoded inline. This allows copy and descriptions to be updated without touching component files.

**Contents of `textConfig.js`:**
- `datasetText` — one entry per dataset/metric containing `displayName`, `shortName`, `unit`, and `description` (2–4 sentence explanation of what the metric measures). The `description` field is shown in the star plot spike hover panel (Level 3) and the description panel (Level 4).
- `uiLabels` — app title, all button labels, button tooltips, search bar placeholder text.
- `panelLabels` — field labels for hover panels and the country detail panel (e.g., "Democracy Score", "GDP per Capita"), plus the "No data available" warning string.
- `legendLabels` — democracy index legend title and the 5 discrete level labels.

**Notes:**
The `description` fields are the primary editorial content of the app. They should be filled with meaningful, human-readable explanations before the app is shown to end users. The implementing Claude should populate them with reasonable placeholder text derived from the Gapminder dataset definitions; they can be refined later without touching any component code.

---

## 9. Code Conventions

### 9.1 File & Component Naming
- Component files: **PascalCase** (e.g., `MapView.jsx`)
- Hook files: **camelCase** (e.g., `useDataset.js`)
- Utility files: **camelCase** (e.g., `dataService.js`)
- Data/constants files: **camelCase** (e.g., `theme.js`, `continentConfig.js`, `textConfig.js`)

**Notes:**

---

### 9.2 Code Comments Policy
- [x] **Minimal** — only comment non-obvious logic (why, not what)
- [ ] **Moderate** — comment all public functions and complex blocks
- [ ] **Verbose** — comment everything for educational purposes
- [ ] No preference

**Answer:**

**Notes:**
Well-chosen names should be self-explanatory. Comments should only be added when naming alone cannot convey the intent.

---

### 9.3 Linting & Formatting
- [x] ESLint + Prettier (standard React/Vite setup)
- [ ] ESLint only
- [ ] No linting setup required
- [ ] No preference

**Answer:**

**Notes:**

---

## 10. Testing

### 10.1 Is Testing Required?
- [ ] Yes — tests must be written alongside the implementation
- [ ] Nice to have — write tests if straightforward, skip if complex
- [x] No — this is a prototype/demo project, no tests needed

**Answer:**

**Notes:**

---

## 11. Performance

### 11.1 Year Slider Animation
The year slider can animate through 118 years (1900–2018), updating the map colors, star plot, and hover panel in real time.
- [x] Re-render on every slider tick (start simple; optimize if performance is insufficient)
- [ ] Debounce updates
- [ ] RequestAnimationFrame throttle
- [ ] No preference — use best practice

**Answer:**

**Notes:**
Start with re-render on every tick. If performance proves insufficient during development, introduce debouncing or throttling as a follow-up optimization.

---

### 11.2 Map Rendering Performance
With 150+ country paths animated on color changes:
- [x] No optimization needed — SVG is fine at this scale
- [ ] Memoize country path components
- [ ] Use Canvas for the map fill layer
- [ ] No preference — use best practice

**Answer:**

**Notes:**

---

## 12. Build & Deployment

### 12.1 Environment Variables
- [x] No — the app is fully static with no secrets
- [ ] Yes — describe below

**Answer:**

**Notes:**

---

### 12.2 Vercel Configuration
- [x] No — standard Vite defaults are fine
- [ ] Yes — describe below

**Answer:**

**Notes:**
This is a demo application intended to be shared with one other party.

---

## 13. Open Questions & Notes

- **MapView split-screen architecture:** ✅ Confirmed. A `SplitScreenContainer` component mounts one or two `MapView` instances, each with fully isolated local state (zoom level, focused continent, focused country). Shared global state (current year, split-screen active, overlay active, dataset cache) is managed via Zustand.

- **Overlay activation constraint:** The Data Overlay button should only become active when both `MapView` instances are at the same zoom level (Level 3 — Country View or Level 4 — Data View). Implementation must compare the local zoom state of both instances to enforce this.

---

_Last updated: 2026-06-05_
