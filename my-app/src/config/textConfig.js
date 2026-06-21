import { dimensionDescriptions } from './dimensionDescriptions.js'

export const descriptionMap = Object.fromEntries(
  dimensionDescriptions.map((d) => [d.id, d.description])
)

export const datasetMeta = {
  giniIndex:        { displayName: 'Gini Index',           shortName: 'Gini',          unit: 'Index (0–100)' },
  unemployment:     { displayName: 'Unemployment Rate',    shortName: 'Unemployment',  unit: '% of labor force' },
  corruption:       { displayName: 'Corruption Index',     shortName: 'Corruption',    unit: 'Index (0–100)' },
  lifeExpectancy:   { displayName: 'Life Expectancy',      shortName: 'Life Exp.',     unit: 'Years' },
  happiness:        { displayName: 'Happiness Index',      shortName: 'Happiness',     unit: 'Index (0–100)' },
  suicideRate:      { displayName: 'Suicide Rate',         shortName: 'Suicide Rate',  unit: 'Per 100,000' },
  literacyRate:     { displayName: 'Literacy Rate',        shortName: 'Literacy',      unit: '% of population' },
  inflation:        { displayName: 'Inflation',            shortName: 'Inflation',     unit: '% per year' },
  democracyIndex:   { displayName: 'Democracy Index',      shortName: 'Democracy',     unit: '−10 to +10' },
  gdpPerCapita:     { displayName: 'GDP per Capita',       shortName: 'GDP/capita',    unit: 'USD' },
  population:       { displayName: 'Population',           shortName: 'Population',    unit: 'People' },
  populationDensity:{ displayName: 'Population Density',   shortName: 'Density',       unit: 'People per km²' },
}

export const uiLabels = {
  appTitle: 'Democracy Index',
  buttons: {
    home:         { label: 'Home',          tooltip: 'Reset to world view' },
    openCompare:  { label: 'Open Compare',  tooltip: 'Open split-screen comparison' },
    closeCompare: { label: 'Close Compare', tooltip: 'Close split-screen comparison' },
    overlay:      { label: 'Overlay',       tooltip: 'Overlay both views' },
    separate:     { label: 'Separate',      tooltip: 'Separate overlaid views' },
  },
  search: {
    placeholder: 'Search country, region, or year…',
  },
}

export const panelLabels = {
  democracyScore:    'Democracy Score',
  gdpPerCapita:      'GDP per Capita',
  population:        'Population',
  populationDensity: 'Pop. Density',
  noDataWarning:     'No data available for this country and year.',
  noDataShort:       'No data',
  regionAverageNote: 'Population-weighted average across the region.',
}

export const legendLabels = {
  title: 'Democracy Index',
  levels: [
    { value: -10, label: 'Authoritarian' },
    { value: -5,  label: 'Hybrid' },
    { value:  0,  label: 'Neutral' },
    { value:  5,  label: 'Flawed Democracy' },
    { value: 10,  label: 'Full Democracy' },
  ],
  noData: 'No data',
}
