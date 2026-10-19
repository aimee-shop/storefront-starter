import type { UpdateShippingAddressDto } from '@aimee.shop/sdk';

export const DEFAULT_COUNTRY = 'US';

type CountryEntry = { code: string; alpha3: string; name: string };
type Subdivision = { code: string; name: string };

/** ISO-3166-1 alpha-2 first; United States listed first for this store. */
const COUNTRY_ROWS: readonly [code: string, alpha3: string, name: string][] = [
  ['US', 'USA', 'United States'],
  ['AF', 'AFG', 'Afghanistan'],
  ['AX', 'ALA', 'Aland Islands'],
  ['AL', 'ALB', 'Albania'],
  ['DZ', 'DZA', 'Algeria'],
  ['AS', 'ASM', 'American Samoa'],
  ['AD', 'AND', 'Andorra'],
  ['AO', 'AGO', 'Angola'],
  ['AI', 'AIA', 'Anguilla'],
  ['AQ', 'ATA', 'Antarctica'],
  ['AG', 'ATG', 'Antigua and Barbuda'],
  ['AR', 'ARG', 'Argentina'],
  ['AM', 'ARM', 'Armenia'],
  ['AW', 'ABW', 'Aruba'],
  ['AU', 'AUS', 'Australia'],
  ['AT', 'AUT', 'Austria'],
  ['AZ', 'AZE', 'Azerbaijan'],
  ['BS', 'BHS', 'Bahamas'],
  ['BH', 'BHR', 'Bahrain'],
  ['BD', 'BGD', 'Bangladesh'],
  ['BB', 'BRB', 'Barbados'],
  ['BY', 'BLR', 'Belarus'],
  ['BE', 'BEL', 'Belgium'],
  ['BZ', 'BLZ', 'Belize'],
  ['BJ', 'BEN', 'Benin'],
  ['BM', 'BMU', 'Bermuda'],
  ['BT', 'BTN', 'Bhutan'],
  ['BO', 'BOL', 'Bolivia'],
  ['BQ', 'BES', 'Bonaire, Sint Eustatius and Saba'],
  ['BA', 'BIH', 'Bosnia and Herzegovina'],
  ['BW', 'BWA', 'Botswana'],
  ['BV', 'BVT', 'Bouvet Island'],
  ['BR', 'BRA', 'Brazil'],
  ['IO', 'IOT', 'British Indian Ocean Territory'],
  ['VG', 'VGB', 'British Virgin Islands'],
  ['BN', 'BRN', 'Brunei'],
  ['BG', 'BGR', 'Bulgaria'],
  ['BF', 'BFA', 'Burkina Faso'],
  ['BI', 'BDI', 'Burundi'],
  ['CV', 'CPV', 'Cabo Verde'],
  ['KH', 'KHM', 'Cambodia'],
  ['CM', 'CMR', 'Cameroon'],
  ['CA', 'CAN', 'Canada'],
  ['KY', 'CYM', 'Cayman Islands'],
  ['CF', 'CAF', 'Central African Republic'],
  ['TD', 'TCD', 'Chad'],
  ['CL', 'CHL', 'Chile'],
  ['CN', 'CHN', 'China'],
  ['CX', 'CXR', 'Christmas Island'],
  ['CC', 'CCK', 'Cocos (Keeling) Islands'],
  ['CO', 'COL', 'Colombia'],
  ['KM', 'COM', 'Comoros'],
  ['CG', 'COG', 'Congo'],
  ['CD', 'COD', 'Congo (DRC)'],
  ['CK', 'COK', 'Cook Islands'],
  ['CR', 'CRI', 'Costa Rica'],
  ['CI', 'CIV', "Cote d'Ivoire"],
  ['HR', 'HRV', 'Croatia'],
  ['CU', 'CUB', 'Cuba'],
  ['CW', 'CUW', 'Curacao'],
  ['CY', 'CYP', 'Cyprus'],
  ['CZ', 'CZE', 'Czechia'],
  ['DK', 'DNK', 'Denmark'],
  ['DJ', 'DJI', 'Djibouti'],
  ['DM', 'DMA', 'Dominica'],
  ['DO', 'DOM', 'Dominican Republic'],
  ['EC', 'ECU', 'Ecuador'],
  ['EG', 'EGY', 'Egypt'],
  ['SV', 'SLV', 'El Salvador'],
  ['GQ', 'GNQ', 'Equatorial Guinea'],
  ['ER', 'ERI', 'Eritrea'],
  ['EE', 'EST', 'Estonia'],
  ['SZ', 'SWZ', 'Eswatini'],
  ['ET', 'ETH', 'Ethiopia'],
  ['FK', 'FLK', 'Falkland Islands'],
  ['FO', 'FRO', 'Faroe Islands'],
  ['FJ', 'FJI', 'Fiji'],
  ['FI', 'FIN', 'Finland'],
  ['FR', 'FRA', 'France'],
  ['GF', 'GUF', 'French Guiana'],
  ['PF', 'PYF', 'French Polynesia'],
  ['TF', 'ATF', 'French Southern Territories'],
  ['GA', 'GAB', 'Gabon'],
  ['GM', 'GMB', 'Gambia'],
  ['GE', 'GEO', 'Georgia'],
  ['DE', 'DEU', 'Germany'],
  ['GH', 'GHA', 'Ghana'],
  ['GI', 'GIB', 'Gibraltar'],
  ['GR', 'GRC', 'Greece'],
  ['GL', 'GRL', 'Greenland'],
  ['GD', 'GRD', 'Grenada'],
  ['GP', 'GLP', 'Guadeloupe'],
  ['GU', 'GUM', 'Guam'],
  ['GT', 'GTM', 'Guatemala'],
  ['GG', 'GGY', 'Guernsey'],
  ['GN', 'GIN', 'Guinea'],
  ['GW', 'GNB', 'Guinea-Bissau'],
  ['GY', 'GUY', 'Guyana'],
  ['HT', 'HTI', 'Haiti'],
  ['HM', 'HMD', 'Heard Island and McDonald Islands'],
  ['HN', 'HND', 'Honduras'],
  ['HK', 'HKG', 'Hong Kong'],
  ['HU', 'HUN', 'Hungary'],
  ['IS', 'ISL', 'Iceland'],
  ['IN', 'IND', 'India'],
  ['ID', 'IDN', 'Indonesia'],
  ['IR', 'IRN', 'Iran'],
  ['IQ', 'IRQ', 'Iraq'],
  ['IE', 'IRL', 'Ireland'],
  ['IM', 'IMN', 'Isle of Man'],
  ['IL', 'ISR', 'Israel'],
  ['IT', 'ITA', 'Italy'],
  ['JM', 'JAM', 'Jamaica'],
  ['JP', 'JPN', 'Japan'],
  ['JE', 'JEY', 'Jersey'],
  ['JO', 'JOR', 'Jordan'],
  ['KZ', 'KAZ', 'Kazakhstan'],
  ['KE', 'KEN', 'Kenya'],
  ['KI', 'KIR', 'Kiribati'],
  ['XK', 'XKX', 'Kosovo'],
  ['KW', 'KWT', 'Kuwait'],
  ['KG', 'KGZ', 'Kyrgyzstan'],
  ['LA', 'LAO', 'Laos'],
  ['LV', 'LVA', 'Latvia'],
  ['LB', 'LBN', 'Lebanon'],
  ['LS', 'LSO', 'Lesotho'],
  ['LR', 'LBR', 'Liberia'],
  ['LY', 'LBY', 'Libya'],
  ['LI', 'LIE', 'Liechtenstein'],
  ['LT', 'LTU', 'Lithuania'],
  ['LU', 'LUX', 'Luxembourg'],
  ['MO', 'MAC', 'Macao'],
  ['MG', 'MDG', 'Madagascar'],
  ['MW', 'MWI', 'Malawi'],
  ['MY', 'MYS', 'Malaysia'],
  ['MV', 'MDV', 'Maldives'],
  ['ML', 'MLI', 'Mali'],
  ['MT', 'MLT', 'Malta'],
  ['MH', 'MHL', 'Marshall Islands'],
  ['MQ', 'MTQ', 'Martinique'],
  ['MR', 'MRT', 'Mauritania'],
  ['MU', 'MUS', 'Mauritius'],
  ['YT', 'MYT', 'Mayotte'],
  ['MX', 'MEX', 'Mexico'],
  ['FM', 'FSM', 'Micronesia'],
  ['MD', 'MDA', 'Moldova'],
  ['MC', 'MCO', 'Monaco'],
  ['MN', 'MNG', 'Mongolia'],
  ['ME', 'MNE', 'Montenegro'],
  ['MS', 'MSR', 'Montserrat'],
  ['MA', 'MAR', 'Morocco'],
  ['MZ', 'MOZ', 'Mozambique'],
  ['MM', 'MMR', 'Myanmar'],
  ['NA', 'NAM', 'Namibia'],
  ['NR', 'NRU', 'Nauru'],
  ['NP', 'NPL', 'Nepal'],
  ['NL', 'NLD', 'Netherlands'],
  ['NC', 'NCL', 'New Caledonia'],
  ['NZ', 'NZL', 'New Zealand'],
  ['NI', 'NIC', 'Nicaragua'],
  ['NE', 'NER', 'Niger'],
  ['NG', 'NGA', 'Nigeria'],
  ['NU', 'NIU', 'Niue'],
  ['NF', 'NFK', 'Norfolk Island'],
  ['KP', 'PRK', 'North Korea'],
  ['MK', 'MKD', 'North Macedonia'],
  ['MP', 'MNP', 'Northern Mariana Islands'],
  ['NO', 'NOR', 'Norway'],
  ['OM', 'OMN', 'Oman'],
  ['PK', 'PAK', 'Pakistan'],
  ['PW', 'PLW', 'Palau'],
  ['PS', 'PSE', 'Palestine'],
  ['PA', 'PAN', 'Panama'],
  ['PG', 'PNG', 'Papua New Guinea'],
  ['PY', 'PRY', 'Paraguay'],
  ['PE', 'PER', 'Peru'],
  ['PH', 'PHL', 'Philippines'],
  ['PN', 'PCN', 'Pitcairn'],
  ['PL', 'POL', 'Poland'],
  ['PT', 'PRT', 'Portugal'],
  ['PR', 'PRI', 'Puerto Rico'],
  ['QA', 'QAT', 'Qatar'],
  ['RE', 'REU', 'Reunion'],
  ['RO', 'ROU', 'Romania'],
  ['RU', 'RUS', 'Russia'],
  ['RW', 'RWA', 'Rwanda'],
  ['BL', 'BLM', 'Saint Barthelemy'],
  ['SH', 'SHN', 'Saint Helena'],
  ['KN', 'KNA', 'Saint Kitts and Nevis'],
  ['LC', 'LCA', 'Saint Lucia'],
  ['MF', 'MAF', 'Saint Martin'],
  ['PM', 'SPM', 'Saint Pierre and Miquelon'],
  ['VC', 'VCT', 'Saint Vincent and the Grenadines'],
  ['WS', 'WSM', 'Samoa'],
  ['SM', 'SMR', 'San Marino'],
  ['ST', 'STP', 'Sao Tome and Principe'],
  ['SA', 'SAU', 'Saudi Arabia'],
  ['SN', 'SEN', 'Senegal'],
  ['RS', 'SRB', 'Serbia'],
  ['SC', 'SYC', 'Seychelles'],
  ['SL', 'SLE', 'Sierra Leone'],
  ['SG', 'SGP', 'Singapore'],
  ['SX', 'SXM', 'Sint Maarten'],
  ['SK', 'SVK', 'Slovakia'],
  ['SI', 'SVN', 'Slovenia'],
  ['SB', 'SLB', 'Solomon Islands'],
  ['SO', 'SOM', 'Somalia'],
  ['ZA', 'ZAF', 'South Africa'],
  ['GS', 'SGS', 'South Georgia and the South Sandwich Islands'],
  ['KR', 'KOR', 'South Korea'],
  ['SS', 'SSD', 'South Sudan'],
  ['ES', 'ESP', 'Spain'],
  ['LK', 'LKA', 'Sri Lanka'],
  ['SD', 'SDN', 'Sudan'],
  ['SR', 'SUR', 'Suriname'],
  ['SJ', 'SJM', 'Svalbard and Jan Mayen'],
  ['SE', 'SWE', 'Sweden'],
  ['CH', 'CHE', 'Switzerland'],
  ['SY', 'SYR', 'Syria'],
  ['TW', 'TWN', 'Taiwan'],
  ['TJ', 'TJK', 'Tajikistan'],
  ['TZ', 'TZA', 'Tanzania'],
  ['TH', 'THA', 'Thailand'],
  ['TL', 'TLS', 'Timor-Leste'],
  ['TG', 'TGO', 'Togo'],
  ['TK', 'TKL', 'Tokelau'],
  ['TO', 'TON', 'Tonga'],
  ['TT', 'TTO', 'Trinidad and Tobago'],
  ['TN', 'TUN', 'Tunisia'],
  ['TR', 'TUR', 'Turkey'],
  ['TM', 'TKM', 'Turkmenistan'],
  ['TC', 'TCA', 'Turks and Caicos Islands'],
  ['TV', 'TUV', 'Tuvalu'],
  ['UG', 'UGA', 'Uganda'],
  ['UA', 'UKR', 'Ukraine'],
  ['AE', 'ARE', 'United Arab Emirates'],
  ['GB', 'GBR', 'United Kingdom'],
  ['UM', 'UMI', 'United States Minor Outlying Islands'],
  ['VI', 'VIR', 'U.S. Virgin Islands'],
  ['UY', 'URY', 'Uruguay'],
  ['UZ', 'UZB', 'Uzbekistan'],
  ['VU', 'VUT', 'Vanuatu'],
  ['VA', 'VAT', 'Vatican City'],
  ['VE', 'VEN', 'Venezuela'],
  ['VN', 'VNM', 'Vietnam'],
  ['WF', 'WLF', 'Wallis and Futuna'],
  ['EH', 'ESH', 'Western Sahara'],
  ['YE', 'YEM', 'Yemen'],
  ['ZM', 'ZMB', 'Zambia'],
  ['ZW', 'ZWE', 'Zimbabwe'],
];

export const COUNTRIES: readonly CountryEntry[] = COUNTRY_ROWS.map(
  ([code, alpha3, name]) => ({ code, alpha3, name })
);

export const US_STATES: readonly Subdivision[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export const CA_PROVINCES: readonly Subdivision[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

const COUNTRY_ALIASES: Record<string, string> = {
  'united states of america': 'US',
  britain: 'GB',
  'great britain': 'GB',
  uk: 'GB',
  'united kingdom of great britain and northern ireland': 'GB',
  holland: 'NL',
  'czech republic': 'CZ',
  'ivory coast': 'CI',
  'cote divoire': 'CI',
  'south korea': 'KR',
  'republic of korea': 'KR',
  'north korea': 'KP',
  'democratic republic of the congo': 'CD',
  'congo kinshasa': 'CD',
  drc: 'CD',
  'republic of the congo': 'CG',
  'congo brazzaville': 'CG',
  macedonia: 'MK',
  swaziland: 'SZ',
  russia: 'RU',
  'russian federation': 'RU',
  vatican: 'VA',
  'holy see': 'VA',
  'united states of america usa': 'US',
};

const SUBDIVISION_ALIASES: Record<string, Record<string, string>> = {
  US: {
    'washington dc': 'DC',
    'washington d c': 'DC',
    'district of columbia': 'DC',
  },
  CA: {
    pei: 'PE',
    'newfoundland': 'NL',
    quebec: 'QC',
  },
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const byAlpha2 = new Map<string, CountryEntry>();
const byAlpha3 = new Map<string, CountryEntry>();
const byCountryName = new Map<string, CountryEntry>();

for (const country of COUNTRIES) {
  byAlpha2.set(country.code, country);
  byAlpha3.set(country.alpha3, country);
  byCountryName.set(normalizeKey(country.name), country);
}

function toResolvedCountry(entry: CountryEntry): {
  country: string;
  countryName: string;
} {
  return { country: entry.code, countryName: entry.name };
}

export function resolveCountry(
  input: string
): { country: string; countryName: string } | null {
  const raw = input.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (upper.length === 2) {
    const match = byAlpha2.get(upper);
    if (match) return toResolvedCountry(match);
  }
  if (upper.length === 3) {
    const match = byAlpha3.get(upper);
    if (match) return toResolvedCountry(match);
  }

  const key = normalizeKey(raw);
  const named = byCountryName.get(key);
  if (named) return toResolvedCountry(named);

  const aliasCode = COUNTRY_ALIASES[key];
  if (aliasCode) {
    const match = byAlpha2.get(aliasCode);
    if (match) return toResolvedCountry(match);
  }

  return null;
}

export function subdivisionsFor(
  countryCode: string
): readonly Subdivision[] | null {
  if (countryCode === 'US') return US_STATES;
  if (countryCode === 'CA') return CA_PROVINCES;
  return null;
}

export function resolveSubdivision(
  country: string,
  input: string | undefined
): { state: string; stateName: string } | null {
  const list = subdivisionsFor(country);
  const raw = input?.trim();
  if (!list || !raw) return null;

  const upper = raw.toUpperCase();
  const byCode = list.find((item) => item.code === upper);
  if (byCode) return { state: byCode.code, stateName: byCode.name };

  const key = normalizeKey(raw);
  const byName = list.find((item) => normalizeKey(item.name) === key);
  if (byName) return { state: byName.code, stateName: byName.name };

  const aliasCode = SUBDIVISION_ALIASES[country]?.[key];
  if (aliasCode) {
    const alias = list.find((item) => item.code === aliasCode);
    if (alias) return { state: alias.code, stateName: alias.name };
  }

  return null;
}

export type ShippingAddressInput = {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  phone?: string;
};

export function toShippingAddressPayload(
  values: ShippingAddressInput
): UpdateShippingAddressDto {
  const resolved = resolveCountry(values.country);
  if (!resolved) {
    throw new Error('Enter a valid country');
  }

  const trimmedState = values.state?.trim();
  const subdivision = trimmedState
    ? resolveSubdivision(resolved.country, trimmedState)
    : null;

  return {
    email: values.email,
    firstName: values.firstName,
    lastName: values.lastName,
    address1: values.address1,
    address2: values.address2 || undefined,
    city: values.city,
    zip: values.zip || undefined,
    phone: values.phone || undefined,
    country: resolved.country,
    countryName: resolved.countryName,
    state: subdivision?.state ?? (trimmedState || undefined),
    stateName: subdivision?.stateName ?? (trimmedState || undefined),
    useForBilling: true,
  };
}
