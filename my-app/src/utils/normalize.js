// Normalization utilities. Global min/max are computed once per metric and cached.
const globalRangeCache = {}

// Manual range overrides for metrics with extreme outliers that would crush the scale.
// Values outside this range get clamped to 0 or 100 by normalizeValue.
const MANUAL_RANGES = {
  inflation:         { min: -20,  max: 50   },  // Venezuela 225k% hyperinflation excluded
  populationDensity: { min: 0,    max: 500  },  // Monaco/Singapore city-state outliers excluded
}

export function computeGlobalRange(metricData) {
  let min = Infinity
  let max = -Infinity
  for (const rows of Object.values(metricData)) {
    for (const row of rows) {
      const v = row.value
      if (v != null && isFinite(v)) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
  }
  return { min, max }
}

export function getOrComputeRange(metricName, metricData) {
  if (MANUAL_RANGES[metricName]) return MANUAL_RANGES[metricName]
  if (!globalRangeCache[metricName]) {
    globalRangeCache[metricName] = computeGlobalRange(metricData)
  }
  return globalRangeCache[metricName]
}

export function normalizeValue(rawValue, min, max) {
  if (rawValue == null || min === max) return null
  return Math.max(0, Math.min(100, ((rawValue - min) / (max - min)) * 100))
}

export function formatValue(value, unit) {
  if (value == null) return '—'
  if (unit === 'People') return formatPopulation(value)
  if (unit === 'USD') return formatCurrency(value)
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return String(value)
}

function formatPopulation(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(n)
}

function formatCurrency(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}
