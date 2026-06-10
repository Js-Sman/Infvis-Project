export const subRegions = [
  { id: 'north-america',  name: 'North America',  group: 'Americas' },
  { id: 'central-america', name: 'Central America', group: 'Americas' },
  { id: 'south-america',  name: 'South America',  group: 'Americas' },
  { id: 'north-africa',   name: 'North Africa',   group: 'Africa' },
  { id: 'west-africa',    name: 'West Africa',    group: 'Africa' },
  { id: 'central-africa', name: 'Central Africa', group: 'Africa' },
  { id: 'east-africa',    name: 'East Africa',    group: 'Africa' },
  { id: 'south-africa',   name: 'Southern Africa', group: 'Africa' },
  { id: 'west-europe',    name: 'West Europe',    group: 'Europe' },
  { id: 'east-europe',    name: 'East Europe',    group: 'Europe' },
  { id: 'west-asia',      name: 'West Asia',      group: 'Asia' },
  { id: 'south-asia',     name: 'South Asia',     group: 'Asia' },
  { id: 'east-asia',      name: 'East Asia',      group: 'Asia' },
  { id: 'central-asia',   name: 'Central Asia',   group: 'Asia' },
  { id: 'oceania',        name: 'Oceania',        group: 'Oceania' },
]

export const countryRegionMap = {
  // North America
  'Canada':               'north-america',
  'USA':                  'north-america',

  // Central America & Caribbean
  'Mexico':               'central-america',
  'Guatemala':            'central-america',
  'Honduras':             'central-america',
  'El Salvador':          'central-america',
  'Nicaragua':            'central-america',
  'Costa Rica':           'central-america',
  'Panama':               'central-america',
  'Cuba':                 'central-america',
  'Dominican Republic':   'central-america',
  'Haiti':                'central-america',
  'Jamaica':              'central-america',
  'Trinidad and Tobago':  'central-america',

  // South America
  'Brazil':               'south-america',
  'Argentina':            'south-america',
  'Chile':                'south-america',
  'Colombia':             'south-america',
  'Peru':                 'south-america',
  'Venezuela':            'south-america',
  'Bolivia':              'south-america',
  'Ecuador':              'south-america',
  'Paraguay':             'south-america',
  'Uruguay':              'south-america',
  'Guyana':               'south-america',
  'Suriname':             'south-america',

  // North Africa
  'Algeria':              'north-africa',
  'Egypt':                'north-africa',
  'Libya':                'north-africa',
  'Morocco':              'north-africa',
  'Tunisia':              'north-africa',
  'Sudan':                'north-africa',
  'Mauritania':           'north-africa',

  // West Africa
  'Nigeria':              'west-africa',
  'Ghana':                'west-africa',
  'Senegal':              'west-africa',
  "Côte d'Ivoire":        'west-africa',
  'Guinea':               'west-africa',
  'Mali':                 'west-africa',
  'Burkina Faso':         'west-africa',
  'Niger':                'west-africa',
  'Benin':                'west-africa',
  'Togo':                 'west-africa',
  'Sierra Leone':         'west-africa',
  'Liberia':              'west-africa',
  'Gambia':               'west-africa',
  'Guinea-Bissau':        'west-africa',
  'Cape Verde':           'west-africa',

  // Central Africa
  'Congo (Dem. Rep.)':    'central-africa',
  'Congo (Rep.)':         'central-africa',
  'Cameroon':             'central-africa',
  'Central African Republic': 'central-africa',
  'Chad':                 'central-africa',
  'Gabon':                'central-africa',
  'Equatorial Guinea':    'central-africa',
  'Angola':               'central-africa',

  // East Africa
  'Kenya':                'east-africa',
  'Tanzania':             'east-africa',
  'Uganda':               'east-africa',
  'Ethiopia':             'east-africa',
  'Rwanda':               'east-africa',
  'Burundi':              'east-africa',
  'Madagascar':           'east-africa',
  'Somalia':              'east-africa',
  'Comoros':              'east-africa',
  'South Sudan':          'east-africa',
  'Eritrea':              'east-africa',
  'Djibouti':             'east-africa',
  'Mozambique':           'east-africa',
  'Mauritius':            'east-africa',

  // Southern Africa
  'South Africa':         'south-africa',
  'Namibia':              'south-africa',
  'Botswana':             'south-africa',
  'Lesotho':              'south-africa',
  'Eswatini':             'south-africa',
  'Zambia':               'south-africa',
  'Zimbabwe':             'south-africa',
  'Malawi':               'south-africa',

  // West Europe
  'Greenland':            'west-europe',
  'Iceland':              'west-europe',
  'UK':                   'west-europe',
  'France':               'west-europe',
  'Germany':              'west-europe',
  'Italy':                'west-europe',
  'Spain':                'west-europe',
  'Netherlands':          'west-europe',
  'Belgium':              'west-europe',
  'Luxembourg':           'west-europe',
  'Switzerland':          'west-europe',
  'Austria':              'west-europe',
  'Sweden':               'west-europe',
  'Norway':               'west-europe',
  'Denmark':              'west-europe',
  'Finland':              'west-europe',
  'Ireland':              'west-europe',
  'Portugal':             'west-europe',
  'Greece':               'west-europe',
  'Cyprus':               'west-europe',
  'Poland':               'west-europe',
  'Czech Republic':       'west-europe',
  'Slovenia':             'west-europe',
  'Croatia':              'west-europe',

  // East Europe (Russia included per spec)
  'Russia':               'east-europe',
  'Slovak Republic':      'east-europe',
  'Hungary':              'east-europe',
  'Romania':              'east-europe',
  'Bulgaria':             'east-europe',
  'Ukraine':              'east-europe',
  'Belarus':              'east-europe',
  'Moldova':              'east-europe',
  'Serbia':               'east-europe',
  'Bosnia and Herzegovina': 'east-europe',
  'North Macedonia':      'east-europe',
  'Montenegro':           'east-europe',
  'Albania':              'east-europe',
  'Estonia':              'east-europe',
  'Latvia':               'east-europe',
  'Lithuania':            'east-europe',

  // West Asia (Middle East)
  'Turkey':               'west-asia',
  'Israel':               'west-asia',
  'Jordan':               'west-asia',
  'Lebanon':              'west-asia',
  'Syria':                'west-asia',
  'Iraq':                 'west-asia',
  'Iran':                 'west-asia',
  'Saudi Arabia':         'west-asia',
  'Kuwait':               'west-asia',
  'UAE':                  'west-asia',
  'Qatar':                'west-asia',
  'Oman':                 'west-asia',
  'Bahrain':              'west-asia',
  'Yemen':                'west-asia',

  // South Asia
  'India':                'south-asia',
  'Pakistan':             'south-asia',
  'Bangladesh':           'south-asia',
  'Sri Lanka':            'south-asia',
  'Nepal':                'south-asia',
  'Bhutan':               'south-asia',
  'Afghanistan':          'south-asia',

  // East & Southeast Asia
  'China':                'east-asia',
  'Japan':                'east-asia',
  'South Korea':          'east-asia',
  'North Korea':          'east-asia',
  'Mongolia':             'east-asia',
  'Vietnam':              'east-asia',
  'Thailand':             'east-asia',
  'Myanmar':              'east-asia',
  'Cambodia':             'east-asia',
  'Laos':                 'east-asia',
  'Philippines':          'east-asia',
  'Indonesia':            'east-asia',
  'Malaysia':             'east-asia',
  'Singapore':            'east-asia',
  'Timor-Leste':          'east-asia',

  // Central Asia (incl. South Caucasus)
  'Kazakhstan':           'central-asia',
  'Uzbekistan':           'central-asia',
  'Turkmenistan':         'central-asia',
  'Tajikistan':           'central-asia',
  'Kyrgyz Republic':      'central-asia',
  'Azerbaijan':           'central-asia',
  'Armenia':              'central-asia',
  'Georgia':              'central-asia',

  // Oceania
  'Australia':            'oceania',
  'New Zealand':          'oceania',
  'Fiji':                 'oceania',
  'Solomon Islands':      'oceania',
  'Papua New Guinea':     'oceania',
}

// Build reverse map: subRegionId → array of country names
export const regionCountriesMap = Object.entries(countryRegionMap).reduce(
  (acc, [country, region]) => {
    if (!acc[region]) acc[region] = []
    acc[region].push(country)
    return acc
  },
  {}
)

export const subRegionById = Object.fromEntries(
  subRegions.map((r) => [r.id, r])
)
