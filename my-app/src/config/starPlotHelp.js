// Long-form help text for the L3 star plot.
//
// Shown in a large info panel when the user hovers the "?" help icon in the
// upper-right corner of the star plot's background circle. Describes how each
// spike dot's radial position is derived from the underlying data.
//
// `paragraphs` renders as stacked blocks; `bullets` renders as a list.

export const starPlotHelp = {
  title: 'How the spike positions are calculated',

  paragraphs: [
    'Each axis represents one metric for the selected country in the current year. A dot sits further from the center the “higher” its value scores on that axis — the center is 0 % of the axis, the outer edge is 100 %.',
    'The raw value shown next to each label is the country’s actual measurement. The dot’s distance from the center, however, uses a normalized 0–100 % position so that metrics with very different units can share one chart.',
  ],

  // Optional headed sections rendered after the intro paragraphs.
  sections: [
    {
      heading: 'Relative metrics (compared across countries)',
      body: 'For most dimensions the position is relative: the value is rescaled against the global minimum and maximum observed across all countries and across all years. The all-time lowest value sits near the center, the all-time highest near the edge.',
    },
    {
      heading: 'Absolute index metrics (0–100, not compared)',
      body: 'Gini Index, Corruption, and Happiness are already published on a fixed 0–100 index scale. Their dots are placed directly from that value and are not compared against other countries — a value of 50 always sits at the halfway ring, regardless of how other countries score.',
    },
    {
      heading: 'Missing data',
      body: 'When a country has no value for a metric in the selected year, its dot is drawn at the 50 % ring and greyed out, and the label reads “(no data)”.',
    },
  ],
}
