// Per-continent and per-country zoom thresholds.
// These calibrate at what D3 zoom scale (k) each target becomes "active."
// Larger countries (Russia, Canada) need lower k values; tiny ones need higher.

export const ZOOM_LEVEL = { WORLD: 1, CONTINENT: 2, COUNTRY: 3, DATA: 4 }

// Continent thresholds: k value where scroll zoom transitions L1→L2
export const CONTINENT_THRESHOLDS = {
  'north-america':  1.5,
  'central-america': 3.5,
  'south-america':  1.8,
  'north-africa':   2.0,
  'west-africa':    2.5,
  'central-africa': 2.5,
  'east-africa':    2.5,
  'south-africa':   3.0,
  'west-europe':    2.5,
  'east-europe':    1.5,
  'west-asia':      2.2,
  'south-asia':     2.2,
  'east-asia':      1.8,
  'central-asia':   2.0,
  'oceania':        2.0,
}

// Country thresholds: k value where scroll zoom transitions L2→L3
// Roughly inversely proportional to country area.
export const COUNTRY_THRESHOLDS = {
  default: 4,
  // Very large countries — low threshold
  Russia: 2.0, Canada: 2.5, USA: 2.5, China: 2.5,
  Brazil: 2.8, Australia: 2.5, India: 3.0,
  Argentina: 3.0, Kazakhstan: 2.8, Algeria: 3.0,
  // Large-ish
  'Congo (Rep.)': 3.5, 'Congo (Dem. Rep.)': 3.5,
  Sudan: 3.0, 'Saudi Arabia': 3.0, Mexico: 4.0,
  Indonesia: 3.5, Mongolia: 3.0,
  // Medium
  Germany: 5, France: 5, Turkey: 4.5, Iran: 4,
  Pakistan: 4, Nigeria: 4, Egypt: 4, Ethiopia: 4,
  // Small
  UK: 6, Japan: 6, 'South Korea': 7, Vietnam: 6,
  // Very small
  Luxembourg: 12, Cyprus: 12, Singapore: 20,
  Bahrain: 20, Kuwait: 10, Lebanon: 12,
}

export function getCountryThreshold(countryName) {
  return COUNTRY_THRESHOLDS[countryName] ?? COUNTRY_THRESHOLDS.default
}
