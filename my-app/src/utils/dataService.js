import * as d3 from 'd3'
import { getOrComputeRange, normalizeValue } from './normalize.js'
import { countryRegionMap } from '../config/continentConfig.js'

// CSV file map: metricName → import path (Vite resolves these at build time)
const CSV_MODULES = {
  giniIndex:        () => import('../data/giniIndex.csv?raw'),
  literacyRate:     () => import('../data/literacyRate.csv?raw'),
  lifeExpectancy:   () => import('../data/lifeExpectancy.csv?raw'),
  suicideRate:      () => import('../data/suicideRate.csv?raw'),
  unemployment:     () => import('../data/unemployment.csv?raw'),
  corruption:       () => import('../data/corruption.csv?raw'),
  inflation:        () => import('../data/inflation.csv?raw'),
  democracyIndex:   () => import('../data/democracyIndex.csv?raw'),
  happiness:        () => import('../data/happiness.csv?raw'),
  gdpPerCapita:     () => import('../data/gdp.csv?raw'),
  population:       () => import('../data/population.csv?raw'),
  populationDensity:() => import('../data/population_density.csv?raw'),
}

const YEAR_RANGES = {
  giniIndex:        [1963, 2018],
  literacyRate:     [1970, 2018],
  lifeExpectancy:   [1900, 2018],
  suicideRate:      [2000, 2018],
  unemployment:     [1975, 2018],
  corruption:       [2012, 2018],
  inflation:        [1961, 2018],
  democracyIndex:   [1900, 2018],
  happiness:        [2005, 2018],
  gdpPerCapita:     [1900, 2018],
  population:       [1900, 2018],
  populationDensity:[1950, 2018],
}

const KNOWN_COUNTRIES = new Set(Object.keys(countryRegionMap))

// Detect format: wide (year columns) vs long (country/year/value)
function detectFormat(headers) {
  return headers.some((h) => /^\d{4}$/.test(h)) ? 'wide' : 'long'
}

// Find the country column name among common variants
function findCountryColumn(headers) {
  const candidates = ['country', 'Country', 'name', 'Name', 'geo', 'Geo', 'entity', 'Entity']
  for (const c of candidates) {
    if (headers.includes(c)) return c
  }
  return headers[0]
}

// Find the year column name
function findYearColumn(headers) {
  const candidates = ['year', 'Year', 'time', 'Time']
  for (const c of candidates) {
    if (headers.includes(c)) return c
  }
  return null
}

// Find the value column name (everything that's not country/year/geo-code)
function findValueColumn(headers, countryCol, yearCol) {
  const skip = new Set([countryCol, yearCol, 'geo', 'Geo', 'code', 'Code', 'iso', 'ISO'].filter(Boolean))
  const candidates = headers.filter((h) => !skip.has(h))
  // Value column is last in Gapminder long-format files (geo,time,name,<value>)
  return candidates[candidates.length - 1] || headers[headers.length - 1]
}

// Parse raw CSV text → { [countryName]: [{year, value}] }
function parseCsv(rawText, metricName) {
  const [minYear, maxYear] = YEAR_RANGES[metricName]
  const rows = d3.csvParse(rawText)
  const headers = rows.columns

  const format = detectFormat(headers)
  const countryCol = findCountryColumn(headers)
  const result = {}

  if (format === 'wide') {
    const yearCols = headers.filter((h) => /^\d{4}$/.test(h))
    for (const row of rows) {
      const country = row[countryCol]?.trim()
      if (!country || !KNOWN_COUNTRIES.has(country)) continue
      const entries = []
      for (const yc of yearCols) {
        const yr = parseInt(yc, 10)
        if (yr < minYear || yr > maxYear) continue
        const raw = row[yc]
        const value = raw != null && raw !== '' ? parseFloat(raw) : null
        entries.push({ year: yr, value: isNaN(value) ? null : value })
      }
      if (entries.length) result[country] = entries
    }
  } else {
    const yearCol = findYearColumn(headers)
    const valueCol = findValueColumn(headers, countryCol, yearCol)
    for (const row of rows) {
      const country = row[countryCol]?.trim()
      if (!country || !KNOWN_COUNTRIES.has(country)) continue
      const yr = parseInt(row[yearCol], 10)
      if (isNaN(yr) || yr < minYear || yr > maxYear) continue
      const raw = row[valueCol]
      const value = raw != null && raw !== '' ? parseFloat(raw) : null
      if (!result[country]) result[country] = []
      result[country].push({ year: yr, value: isNaN(value) ? null : value })
    }
    for (const arr of Object.values(result)) {
      arr.sort((a, b) => a.year - b.year)
    }
  }

  return result
}

// Load a dataset — returns processed {country: [{year,value}]} map
const loadPromises = {}

export async function loadDataset(metricName, cacheDataset, datasetCache) {
  if (datasetCache[metricName]) return datasetCache[metricName]
  if (loadPromises[metricName]) return loadPromises[metricName]

  loadPromises[metricName] = (async () => {
    const mod = await CSV_MODULES[metricName]()
    const raw = mod.default
    const data = parseCsv(raw, metricName)
    cacheDataset(metricName, data)
    return data
  })()

  return loadPromises[metricName]
}

// Get value for a country + year (interpolates if exact year missing)
export function getCountryValue(metricName, countryName, year, datasetCache) {
  const data = datasetCache[metricName]
  if (!data) return null
  const entries = data[countryName]
  if (!entries || entries.length === 0) return null

  const exact = entries.find((e) => e.year === year)
  if (exact) return exact.value

  // Linear interpolation between nearest surrounding points
  const before = entries.filter((e) => e.year < year && e.value != null)
  const after  = entries.filter((e) => e.year > year && e.value != null)
  if (!before.length || !after.length) {
    // Use nearest available
    const nearest = entries.reduce((a, b) =>
      Math.abs(b.year - year) < Math.abs(a.year - year) ? b : a
    )
    return nearest.value
  }

  const prev = before[before.length - 1]
  const next = after[0]
  const t = (year - prev.year) / (next.year - prev.year)
  const interpolated = prev.value + t * (next.value - prev.value)
  return interpolated
}

// Normalize a raw value to 0–100 using global range
export function normalizeMetricValue(metricName, rawValue, datasetCache) {
  const data = datasetCache[metricName]
  if (!data || rawValue == null) return null
  const { min, max } = getOrComputeRange(metricName, data)
  return normalizeValue(rawValue, min, max)
}

// Get all time-series entries for a country (used by LineChart)
export function getCountrySeries(metricName, countryName, datasetCache) {
  const data = datasetCache[metricName]
  if (!data) return []
  return data[countryName] || []
}
