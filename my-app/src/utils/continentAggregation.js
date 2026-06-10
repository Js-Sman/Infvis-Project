import { regionCountriesMap } from '../config/continentConfig.js'
import { getCountryValue } from './dataService.js'

// Memoized results keyed by `metricName:regionId:year`
const memo = {}

export function computeRegionAverage(metricName, regionId, year, datasetCache) {
  const key = `${metricName}:${regionId}:${year}`
  if (memo[key] !== undefined) return memo[key]

  const countries = regionCountriesMap[regionId]
  if (!countries || !countries.length) {
    memo[key] = null
    return null
  }

  const popData = datasetCache['population']

  let weightedSum = 0
  let totalWeight = 0

  for (const country of countries) {
    const value = getCountryValue(metricName, country, year, datasetCache)
    if (value == null) continue

    let weight = 1
    if (popData) {
      const pop = getCountryValue('population', country, year, datasetCache)
      if (pop != null && pop > 0) weight = pop
    }

    weightedSum += value * weight
    totalWeight += weight
  }

  const result = totalWeight > 0 ? weightedSum / totalWeight : null
  memo[key] = result
  return result
}

// Clear memoized results when data reloads (called by dataService)
export function clearRegionMemo() {
  for (const key of Object.keys(memo)) delete memo[key]
}
