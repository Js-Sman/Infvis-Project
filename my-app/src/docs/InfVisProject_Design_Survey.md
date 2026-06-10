# InfVis Project — Specification Survey

> **Purpose:** Fill out this document together with your team. It will be used directly as the source of truth for generating the Masterprompt that drives development.  
> **Instructions:** Answer the questions under each section. Use the _Notes_ fields freely for anything that doesn't fit the questions. Leave a question blank if you don't know yet — we can discuss it.

---

## 0. Already Confirmed (Do Not Change Without Discussion)

| Decision | Value |
|---|---|
| Frontend | React + Vite |
| Visualization | D3.js + TopoJSON |
| Backend | Python serverless functions (Vercel `/api`) |
| Data | Bundled Gapminder CSVs (static snapshot) |
| Deployment | Vercel (free tier) |
| Target device | Desktop browser |

---

## 1. UI Look & Feel

### 1.1 Visual Theme
- [ ] Light mode
- [x] Dark mode
- [ ] System default (auto)
- [ ] Custom — describe below

**Answer / Notes:**

---

### 1.2 Overall Aesthetic
What is the intended visual style? Choose one or describe:
- [x] Clean & minimal (lots of whitespace, simple typography)
- [ ] Data-dense (professional dashboard feel)
- [x] Rich & immersive (cinematic, dark backgrounds, glowing elements)
- [ ] Educational / accessible (clear labels, gentle colors)
- [ ] Other — describe below

**Answer / Notes:**
The UI should feel easy to navigate, and exploring the data — from world view down to specific details — should be enjoyable. It should not be overwhelming; each piece of information should only appear on demand. The mantra: "Overview first — Details on demand."

---

### 1.3 Color Palette
- What colors should represent continents on the map?
  - **Answer:**
- What color scale should be used for data encoding (e.g., choropleth coloring by a metric)?
  - [ ] Sequential (e.g., light blue → dark blue for low → high values)
  - [x] Diverging (e.g., red → white → green around a midpoint)
  - [ ] Custom — describe below
  - **Answer:**
- Should the color palette be colorblind-friendly?
  - [ ] Yes (required)
  - [ ] Nice to have
  - [x] Not a priority

**Notes:**
The color scale is derived from the democracy index dataset, which has a range of -10 to 10. The gradient should go from red (low) through white (midpoint) to blue (high). The specific color stops should be defined in LAB color space for the best possible perceptual distinction.

---

### 1.4 Typography
- Any font preferences (Google Fonts, system fonts)?
  - **Answer:** Not critical.
- Should numbers/data labels use a monospace or proportional font?
  - **Answer:** Monospace for data values and legend numbers; default font for all other text.

**Notes:**

---

### 1.5 Layout & Panels
- Should the map fill the entire viewport, or is there a persistent sidebar/header?
  - **Answer:** Persistent header containing buttons and search bar, but no sidebar. Floating panels for all contextual information. The legend has a fixed position but is implemented as a panel.
- Where should the star plot appear when a country is selected?
  - [x] Overlaid directly on the country on the map
  - [ ] In a side panel that opens on the right/left
  - [ ] In a modal/popup
  - [ ] Floating tooltip-style panel near the country
  - **Answer:**
- Should there be a persistent toolbar or navigation bar?
  - **Answer:** Yes — the persistent header.

**Notes:**
On hover over countries or continents, a floating panel should appear showing: population density, total population, GDP per capita, the country/continent flag, and name. These values will be provided by the backend. For continents, the values are the population-weighted average across all constituent countries.

The legend is a persistent panel fixed in the bottom-left corner. At the continent and country view levels, it displays what the color scale represents. Colors are derived from the democracy index (range: −10 to 10). The legend should convey what the colors mean — 5 discrete levels of precision are sufficient.

At the star plot level, the legend disappears. When hovering over a spike of the star plot, a floating panel appears near the cursor describing that data dimension. For example, hovering over the happiness spike should show a description of what that metric represents.

Clicking on a star plot spike switches to a new view (Level 4 — Data View) displaying a line chart for that data dimension. The description of that dimension appears where the legend was previously, and the background should faintly resemble the selected country.

All floating panels appear to the left of the cursor.

---

## 2. Map & Zoom Levels

### 2.1 Zoom Behavior
- Should zooming be **smooth and continuous** (free pan/zoom like Google Maps) or **discrete level transitions** (click continent → animated jump to continent view)?
  - [ ] Smooth / continuous
  - [ ] Discrete transitions with animations
  - [x] Hybrid — describe below
  - **Answer:**
Continuous zoom with thresholds. Zooming should be seamless at all levels, always centered on the cursor. When a threshold is reached, the viewport reveals the appropriate level of detail (continent borders, then country borders).

When the star plot zoom threshold is reached, the viewport automatically centers and scales so that the selected country fills the screen.

Clicking a continent jumps to the level where its country borders are visible. Clicking a country jumps to the star plot level.

Zooming is reversible — when zooming out past a threshold, the viewport reverts to rendering the previous level of detail.

Thresholds are individually calibrated per continent and country to account for size differences, ensuring a consistent zoom experience for the user.

For free scroll-wheel zooming: if the cursor is not over a valid target (continent or country), zoom stops at the next threshold and does not proceed further. The map only transitions between levels when the cursor is directly over a valid target.

---

### 2.2 Zoom Level 1 — World View
- What is visible at the world level?
  - [x] Continent outlines only (no country borders)
  - [ ] Continent fills with subtle country borders
  - [x] Continent labels
  - [x] Data-encoded color fill (choropleth) even at world level
  - **Answer:** The continent fill color is the population-weighted average of the democracy index values of its constituent countries (all on the same scale from −10 to 10).
- Is the world map zoomable by scroll wheel / pinch at this level?
  - **Answer:** Yes — zooming begins at this level.

**Notes:**
The legend shows the description of the color scale. The hover popup panel shows accumulated average values for all constituent countries.

---

### 2.3 Zoom Level 2 — Continent View
- What triggers entering continent view?
  - [ ] Clicking a continent
  - [ ] Zooming in past a threshold
  - [x] Both
  - **Answer:** The threshold is unique per continent due to size differences, calibrated so the transition feels consistent across all continents.
- What becomes visible at continent level that wasn't at world level?
  - [x] Individual country borders and fills
  - [ ] Country name labels
  - [ ] Data values / metric colors per country
  - [ ] Other — describe below
  - **Answer:**
- Should continents other than the selected one fade out or disappear?
  - **Answer:** Fade into the background.

**Notes:**
At this level, the hover popup panel shows specific values for the hovered country. The most prominent value is always the democracy index score, highlighted next to the country name.

---

### 2.4 Zoom Level 3 — Country View
- What triggers entering country view?
  - [ ] Clicking a country
  - [ ] Zooming in past a threshold
  - [x] Both
  - **Answer:** Same as level 2. The transition from world view to country view should be seamless.
- What appears at country level?
  - [x] Star plot overlay on the country
  - [ ] Detailed data panel
  - [ ] Country name and flag
  - [ ] Other — describe below
  - **Answer:** The hover panel from level 2 is now fixed at the position where the legend was previously (bottom-left corner). Information on population density, GDP per capita, etc. is shown there permanently at this level.
- Should neighboring countries remain visible in the background at this level?
  - **Answer:** Yes — faded out.

**Notes:**
No color legend at this level — it is replaced by the detail panel from level 2. When hovering over a spike of the star plot, the floating popup panel shows the description of that spike's data dimension.

---

### 2.5 Zoom Level 4 — Data View

**Notes:**
This is an additional view that only appears when the user clicks on a spike in the country-level star plot overlay. It is a separate view displaying a line chart for that data dimension. The country map should be very faintly visible in the background as a reference. The description of the data dimension — previously shown in the level 3 hover panel — is now displayed at the position where the legend was (bottom-left corner).

The timeline slider is not shown at this level, as the time axis is part of the line chart itself.

---

### 2.6 Map Projection
- Which map projection should be used?
  - [x] Natural Earth (recommended — balanced, familiar)
  - [ ] Mercator
  - [ ] Orthographic (globe)
  - [ ] Other — specify
  - **Answer:** The countries and continents will be custom-colored using D3.js rendering of the TopoJSON data — not a static image.

---

### 2.7 Navigation Controls
- Which navigation controls should be present?
  - [ ] Zoom in / zoom out buttons
  - [x] Reset / home button (return to world view)
  - [ ] Back button (go up one level)
  - [x] Pan by click-and-drag
  - [x] Scroll-to-zoom
  - **Answer:**

**Notes:**
There are 2 persistent control buttons in the header: **Reset to World View (Home)** and **Open Compare (Split Screen)**. The Data Overlay button is not in the header — it only appears between the two search bars when split-screen mode is active. Functions for Split Screen and Data Overlay are described in section 3.6.

---

## 3. Interactions & User Experience

### 3.1 Hover Behavior
- What happens when hovering over a continent (world view)?
  - [x] Highlight / glow effect
  - [ ] Tooltip with continent name
  - [ ] Tooltip with aggregate data
  - [ ] Nothing
  - **Answer:** The continent outline should be highlighted, and a floating panel with the data described in section 2.2 should appear to the left of the cursor.
- What happens when hovering over a country (continent view)?
  - [x] Highlight effect
  - [ ] Tooltip with country name
  - [ ] Tooltip with one or more data values
  - [ ] Nothing
  - **Answer:** Similar to continent view.
- What data should appear in a country hover tooltip?
  - **Answer:** A floating panel showing the country/continent name with a prominent display of its democracy index score. Additionally: GDP per capita, population, and population density. For continents, use the population-weighted average across constituent countries. This data will be provided by the backend.

**Notes:**

---

### 3.2 Click Behavior
- Clicking a continent → zoom to continent view?
  - **Answer:** Yes — zoom to show the continent with all constituent country borders visible, fitting the complete continent in the viewport.
- Clicking a country → zoom to country view + show star plot?
  - **Answer:** Yes — show the country filling the entire viewport with the star plot overlay.
- Clicking empty space (ocean) → go back one level?
  - **Answer:** Nothing — only zoom if the cursor is over a valid target.
- Should clicking a country while already in country view open a detail page / modal?
  - **Answer:** No — in country view, the only clickable elements are the spikes of the star plot.

**Notes:**

---

### 3.3 Search
- Should search be a visible search bar or an icon that expands?
  - **Answer:** Visible search bar, centered in the header.
- Should search support autocomplete / suggestions as you type?
  - **Answer:** Yes, with autocomplete suggestions.
- Can users search by country name only, or also by continent or region?
  - **Answer:** Country and continent. There is no sub-region resolution and none is planned.
- What happens after a search result is selected?
  - [x] Smooth animated zoom to the country
  - [ ] Jump directly (no animation)
  - [ ] Zoom + automatically open star plot
  - **Answer:** Searching for a country zooms to the star plot level of that country, so the star plot overlay appears automatically. Searching for a continent zooms to the level where individual country borders become visible.

**Notes:**

---

### 3.4 Time / Year Dimension
- Do the datasets have a time dimension (data per year)?
  - **Answer:** Yes, all datasets are timestamped.
- If yes, should there be a **year slider** that updates the map and star plot in real time?
  - **Answer:** Yes — this is a key feature. The year slider should be visible at all zoom levels (except Level 4) and update all data in real time.
- Should there be a **play button** to animate through years automatically?
  - **Answer:** Yes — a play/pause button next to the slider. Default state is paused. If the user interacts with the slider while animating, playback pauses and the user can drag to a specific year. When paused, playback stops at the current year and does not jump to the most recent year.
- What year range should be the default / starting state?
  - **Answer:** The timeline spans 1900 to 2018.

**Notes:**
The user should also be able to brush-select a segment of the timeline — the auto-animation then loops only within that selected segment.
Speed-up and speed-down buttons should appear next to the play/pause button.

---

### 3.5 Metric Selection
- Should users be able to choose which metric colors the map (choropleth)?
  - **Answer:** No — the map coloring is always derived from the democracy index.
- If yes, where is this selector located?
  - **Answer:** N/A
- Should the currently active metric also be reflected in the star plot?
  - **Answer:** The democracy index is shown prominently in the hover info panel at all levels. It is not a star plot axis — it is only used for map coloring.

**Notes:**

---

### 3.6 Country Comparison
- Should users be able to select and compare multiple countries at the same time?
  - **Answer:** Yes — via the split-screen feature, triggered by the "Open Compare" button in the header. Clicking it splits the viewport in half. The right half resets to the world view and can be navigated independently to reach a second country.
- If yes, how many countries max?
  - **Answer:** Only 2 — no more.
- How should comparison be displayed?
  - [ ] Multiple star plots side by side
  - [ ] Overlapping star plots (semi-transparent)
  - [ ] A separate comparison panel
  - **Answer:** A clear visual separator divides the two halves of the screen. Both halves can be independently navigated to the star plot or line chart level. When split-screen is active, the Data Overlay button ("Overlay") appears between the two search bars. Clicking it animates both star plots toward the center and overlays them. The button label then changes to "Separate" to reverse the action.

**Notes:**
In single-screen mode, one search bar is centered in the header. When split-screen is activated, it morphs into two separate search bars, each centered over its respective viewport half. Each search bar only affects its own side.

The "Open Compare" button changes to "Close Compare" when split-screen is active. See `Header Mockup.jpeg` for the visual reference.

---

## 4. Star Plot Design

### 4.1 Axes
- Which metrics should appear as axes on the star plot? List them (clockwise from top):
  1. Gini Index (pink)
  2. Unemployment (purple)
  3. Corruption (orange)
  4. Life Expectancy (lime green)
  5. Happiness (yellow)
  6. Suicide Rate (red)
  7. Literacy Rate (blue)
  8. Inflation (cyan)

- Are the axes **fixed** (always the same metrics) or **user-selectable**?
  - **Answer:** Fixed — always in this clockwise orientation, with axis 1 at the top.

**Notes:**
The colors in parentheses indicate the intended color for each spike.

---

### 4.2 Scale & Normalization
- Should values be normalized to a 0–100% scale relative to the global min/max of each metric?
  - **Answer:** Yes — all axes use a normalized 0–100% scale.
- Or should raw values be shown (with per-axis scales)?
  - **Answer:** No.
- How should **missing data** for a country/year be shown?
  - [ ] Leave the axis at zero
  - [x] Grayed-out axis
  - [ ] Show a warning label
  - **Answer:** A grey dot at the 50% mark for that spike. The info panel for that spike should show a clear warning that the data is not available for that country, but still show the dimension description.

**Notes:**
Missing data is dynamic — some data points are only absent for specific years. The grey dot at 50% should update in real time as the year slider changes.

---

### 4.3 Visual Style
- Should the star plot polygon be **filled** (area visible) or just **outlined**?
  - **Answer:** Clear outline with a transparent fill.
- Should axis labels always be visible, or only on hover?
  - **Answer:** Axis labels are always visible on the outer ring of the star plot. The floating info panel appears on hover over the spike tip dot.
- Should the actual data values be shown as numbers on each axis?
  - **Answer:** Yes — the normalized value (0–100%) is shown on each axis.
- Should there be concentric reference rings (like a radar chart grid)?
  - **Answer:** Yes — at 25%, 50%, and 75%.

**Notes:**
The tip of each spike has a clickable dot. Hovering over the dot shows the info panel near the cursor, displaying the most recent available timestamp for that data point and the description of that dimension.

If a data value is not available for the selected year, the data point is shown as grey and positioned at the 50% ring.

---

### 4.4 Star Plot Positioning
- When a country is selected, the star plot appears — describe the ideal placement:
  - **Answer:** Centered in the viewport (or in its viewport half in split-screen mode). This works naturally because the country fills the viewport when entering Level 3.
- Should it scale with the size of the country on the map, or have a fixed size?
  - **Answer:** Fixed size, so the plots are visually comparable and can be overlaid using the Data Overlay button.
- Should it be dismissible (close button / click away)?
  - **Answer:** No — the star plot disappears only when the user zooms back out.

**Notes:**

---

## 5. Datasets

### 5.1 Dataset List
All datasets are sourced from Gapminder and bundled as CSV files. Only the specified year ranges will be used, even if the source files contain more data.

| # | Metric Name | Unit | Year Range | Used for |
|---|---|---|---|---|
| 1 | Gini Index | Index number | 1963–2018 | Star plot axis 1 |
| 2 | Literacy Rate | % | 1970–2018 | Star plot axis 7 |
| 3 | Life Expectancy | Years | 1900–2018 | Star plot axis 4 |
| 4 | Suicide Rate | Per 100,000 people | 2000–2018 | Star plot axis 6 |
| 5 | Unemployment Rate | % | 1975–2018 | Star plot axis 2 |
| 6 | Corruption Index | Index number | 2012–2018 | Star plot axis 3 |
| 7 | Inflation | % | 1961–2018 | Star plot axis 8 |
| 8 | Democracy Index | −10 to 10 | 1900–2018 | Map color / hover panel |
| 9 | Happiness Index | Index number (0–100) | 2005–2018 | Star plot axis 5 |
| 10 | GDP per Capita | USD | 1900–2018 | Hover panel |
| 11 | Population | Absolute number | 1900–2018 | Hover panel / aggregation weight |
| 12 | Population Density | People per km² | 1950–2018 | Hover panel |

**Notes:**
All datasets are time-series and update in real time with the year slider. Datasets #10–12 are used in the hover info panel and reflect the values for the currently selected year.

---

### 5.2 Geographic Coverage
- Do all datasets cover all countries, or are some limited to specific regions?
  - **Answer:** Not all datasets cover all countries. The democracy index dataset covers 167 countries (listed in section 7.4). Coverage varies by dataset.
- Should countries with no data for a metric be shown differently on the map?
  - [x] Grayed out
  - [ ] Hatched / pattern fill
  - [ ] Default neutral color with a "no data" label in tooltip
  - **Answer:** Countries with no democracy index data at all are greyed out on the map. The hover info box shows a warning that no data is available.

**Notes:**
This applies dynamically: a country may have data for some years and not others. The grey-out state should update as the year slider changes.

---

### 5.3 Aggregation
- Should the app compute **continental averages** from country data?
  - **Answer:** Yes. Datasets contain individual country values; the app computes continent-level aggregates at runtime.
- Are there any other aggregate metrics that need to be computed dynamically (e.g., rankings, percentiles)?
  - **Answer:** No.

**Notes:**
Continent aggregates are population-weighted averages of the constituent country values.

---

## 6. Backend & Data Processing

### 6.1 Python API Endpoints
- What should the Python backend compute that can't be done on the frontend?
  - **Answer:** To be decided — the only significant calculation (population-weighted averages) may be feasible in React on the frontend.
- Should the backend handle CSV parsing and filtering, or should the frontend load CSVs directly?
  - **Answer:** To be decided.

**Notes:**
The raw CSV files contain more countries and timestamps than the project requires. A preprocessing step should run on startup to extract and prepare only the relevant data. Whether this runs in Python (serverless function) or React (client-side) is an open architectural question for the architecture survey.

---

### 6.2 Performance
- Approximately how many countries are expected in the dataset? (~195 is the global total)
  - **Answer:** 167 countries covered by the democracy index dataset. The maximum for any single dataset is 193.
- Should data be pre-processed/cached at build time, or computed fresh per request?
  - **Answer:** Computed at runtime — each dataset is loaded only when needed.

**Notes:**
There should be a startup preprocessing step to filter raw CSV data down to only the countries and year ranges used in the project.

---

## 7. Additional Features & Ideas

### 7.1 Features to Definitely Include

**Line Chart — Data View (Zoom Level 4)**

This view is triggered by clicking a spike tip dot on the star plot at Level 3. Detailed behavior:

- **Transition:** Clicking a spike should trigger a "pop" entry animation. The line chart view fills the entire area below the header, replacing the map.
- **Header:** The full name of the dataset is shown as the view title.
- **Description panel:** A floating info panel appears when hovering over a question mark icon next to the dataset name. This shows the same dimension description as the Level 3 star plot hover panel, and it appears at the position where the legend was (bottom-left corner).
- **Data source:** The chart data is read directly from the corresponding Gapminder CSV file, using the timestamps available in that file.
- **Missing data:** If data points are missing for specific years, the line chart should visually interpolate between available points (e.g., dashed line segment).
- **Hover interaction:** Hovering over the line displays the exact data value for that point in time.
- **Brush selection:** Users can brush-select a segment of the time axis to highlight it. The rest of the chart outside the selection is greyed out.
- **Split-screen:** Split-screen mode is also available at Level 4. Both sides can independently display line charts for different countries and metrics.
  - Brush selection on one side simultaneously brushes the same time range on the other side.
  - Hovering over the line in one viewport shows a dotted vertical time marker, which also appears at the same time position in the other viewport. The two sides are fully synchronized in their hover and brush interactions.
- **Data Overlay:** The Data Overlay button also works at Level 4. Clicking it animates the two line charts toward the center. Both lines appear combined in a single chart. The background country reference images remain in place.

---

### 7.2 Design Layout of Viewport and Components

This section summarizes the full viewport layout for clarity:

**Header**
- One persistent header bar across the full width of the screen.
- Left: App name ("Democracy Index").
- Center: Search bar (single, centered in single-screen mode).
- Right: "Open Compare" button and "Home" (Reset to World View) button.
- All buttons use icons to represent their state and display a tooltip on hover.

**Header — Split-Screen State**
- Center: Two search bars, each centered over its respective viewport half, with the "Overlay" button between them.
- Right: "Close Compare" button and "Home" button.
- The "Overlay" button changes label to "Separate" when the overlay is active. "Close Compare" is disabled while the overlay is active (you must separate first).

> See `Header Mockup.jpeg` in this project folder for the visual reference. Use it as a layout reference only, not a direct implementation.

**Main Viewport**
- Fills the entire screen below the header.
- In split-screen mode, divided in half by a vertical separator.

**Legend Panel**
- Fixed position in the bottom-left corner.
- Visible at Levels 1, 2, and 3. Hidden at Level 4.
- At Levels 1–2: shows the democracy index color scale (5 discrete levels).
- At Level 3: replaced by the country detail panel (population density, GDP per capita, etc.).

**Floating Panels**
- Always appear to the left of the cursor.
- Used for: continent/country hover data, star plot spike descriptions.

**Timeline**
- Persistent component, visible at Levels 1, 2, and 3. Hidden at Level 4.
- Includes: year slider, play/pause button, speed-up and speed-down buttons.
- Animation is off by default.
- If the user interacts with the slider while animating, playback pauses automatically. The user can then drag the slider to a specific year.
- Users can brush-select a time segment on the slider; the auto-animation then loops within that segment only.

---

### 7.3 Missing Data Handling

There is one unified approach for handling missing data throughout the app:

- **Map (Level 2):** If the democracy index value is not available for a specific country and year, that country is greyed out on the map.
- **Star plot (Level 3):** If a metric value is not available for a specific country and year, the corresponding spike tip dot is shown in grey at the 50% ring position.
- **Line chart (Level 4):** If data points are missing for specific years, the chart visually interpolates between available points (e.g., dashed line).
- **All levels:** All missing-data states are dynamic and update in real time as the year slider changes.

---

### 7.4 Continent Groupings

The world view uses custom sub-continental groupings instead of the standard 7 continents. Each subregion is a distinct, separately colored and clickable zone on the world map:

| Group | Sub-regions |
|---|---|
| Americas | North America, Central America, South America |
| Africa | North Africa, West Africa, South Africa, East Africa, Central Africa |
| Europe | West Europe, East Europe _(Russia → East Europe)_ |
| Asia | West Asia, South Asia, East Asia, Central Asia |
| Oceania | Oceania |

---

### 7.5 Countries Covered by the Democracy Index Dataset

The following 167 countries are included in the democracy index dataset and form the base country set for the application:

Afghanistan, Angola, Albania, UAE, Argentina, Armenia, Australia, Austria, Azerbaijan, Burundi, Belgium, Benin, Burkina Faso, Bangladesh, Bulgaria, Bahrain, Bosnia and Herzegovina, Belarus, Bolivia, Brazil, Bhutan, Botswana, Central African Republic, Canada, Switzerland, Chile, China, Côte d'Ivoire, Cameroon, Congo (Dem. Rep.), Congo (Rep.), Colombia, Comoros, Cape Verde, Costa Rica, Cuba, Cyprus, Czech Republic, Germany, Djibouti, Denmark, Dominican Republic, Algeria, Ecuador, Egypt, Eritrea, Spain, Estonia, Ethiopia, Finland, Fiji, France, Gabon, UK, Georgia, Ghana, Guinea, Gambia, Guinea-Bissau, Equatorial Guinea, Greece, Guatemala, Guyana, Honduras, Croatia, Haiti, Hungary, Indonesia, India, Ireland, Iran, Iraq, Israel, Italy, Jamaica, Jordan, Japan, Kazakhstan, Kenya, Kyrgyz Republic, Cambodia, South Korea, Kuwait, Laos, Lebanon, Liberia, Libya, Sri Lanka, Lesotho, Lithuania, Luxembourg, Latvia, Morocco, Moldova, Madagascar, Mexico, North Macedonia, Mali, Myanmar, Montenegro, Mongolia, Mozambique, Mauritania, Mauritius, Malawi, Malaysia, Namibia, Niger, Nigeria, Nicaragua, Netherlands, Norway, Nepal, New Zealand, Oman, Pakistan, Panama, Peru, Philippines, Papua New Guinea, Poland, North Korea, Portugal, Paraguay, Qatar, Romania, Russia, Rwanda, Saudi Arabia, Sudan, Senegal, Singapore, Solomon Islands, Sierra Leone, El Salvador, Somalia, Serbia, South Sudan, Suriname, Slovak Republic, Slovenia, Sweden, Eswatini, Syria, Chad, Togo, Thailand, Tajikistan, Turkmenistan, Timor-Leste, Trinidad and Tobago, Tunisia, Turkey, Tanzania, Uganda, Ukraine, Uruguay, USA, Uzbekistan, Venezuela, Vietnam, Yemen, South Africa, Zambia, Zimbabwe

---

---

## 8. Map & Data Policy

### 8.1 Static World Map — No Historical Borders

The application uses a **single, fixed world map** representing the current borders of all countries. Historical changes to country borders, country formations, or dissolutions are explicitly ignored.

All Gapminder datasets are treated as if today's countries have always existed in their current form. Data for years before certain countries existed (e.g., countries formed after the dissolution of the Soviet Union) is provided by the Gapminder source files as if the country existed — and the app displays it as-is without any special handling.

**Implementation implication:** Only one TopoJSON map file is needed. There is no need to load or switch between historical map versions based on the selected year.

---

## 9. Open Questions & Blockers

- **App architecture:** The overall code structure and conventions should be discussed in a separate session. A second Masterprompt focused specifically on code architecture is planned. A similar survey worksheet for that topic would be a useful starting point.

- **Data provisioning:** How should the CSV data be provided at runtime?
  - Should the CSV files be stored in a subdirectory within the project?
  - The raw files contain more countries and timestamps than required. Should the data be pre-processed before deployment (build-time), or can filtering be handled on the fly in React (runtime)?

- **GDP per Capita / Population / Population Density (datasets #10–12):** Confirmed as time-series (1900–2018, 1900–2018, 1950–2018 respectively) — hover panel values update with the year slider. ✅ Resolved.

---

_Last updated: 2026-06-05_
