import { citiesWithin } from './city-centroid.js'

const KNOWN = new Set([
  'view',
  'cursor',
  'city',
  'radius_km',
  'marital_status',
  'polygamy_intent',
  'practice',
  'madhhab',
  'life_plans',
])

const CITY = ['ouagadougou', 'bobo', 'koudougou', 'autre'] as const
const RADIUS = ['10', '25', '50'] as const
const MARITAL = ['single', 'married', 'divorced', 'widowed'] as const
const POLYGAMY = ['yes', 'no'] as const
const PRACTICE = ['assidue', 'heure', 'cheminement'] as const
const MADHHAB = ['maliki', 'hanafi', 'shafii', 'hanbali', 'apprentissage'] as const
const LIFE = ['ready_now', 'within_year', 'exploring'] as const

const NAMED_CITY = ['ouagadougou', 'bobo', 'koudougou'] as const
const AUTRE_CITIES = ['ouahigouya', 'banfora', 'dedougou', 'fada', 'autre'] as const

const LIFE_HEAD: Record<(typeof LIFE)[number], readonly string[]> = {
  ready_now: ['tf:immediate'],
  within_year: ['tf:6months', 'tf:1year'],
  exploring: ['tf:serene'],
}

export type BrowseFilters = {
  city?: (typeof CITY)[number]
  radiusKm?: 10 | 25 | 50
  maritalStatus?: (typeof MARITAL)[number]
  polygamyIntent?: (typeof POLYGAMY)[number]
  practice?: (typeof PRACTICE)[number]
  madhhab?: (typeof MADHHAB)[number]
  lifePlans?: (typeof LIFE)[number]
}

export type FilterableProfile = {
  city: string | null
  country: string | null
  marital_status: string | null
  polygamy_intent: string | null
  practice: string | null
  madhhab: string | null
  life_plans: string | null
}

export type BrowseFiltersFailure = {
  ok: false
  status: 400
  code: 'UNHANDLED'
  message: string
  details: { field: string }
  retryable: false
}

type FilterResult = { ok: true; filters: BrowseFilters } | BrowseFiltersFailure

function fail(field: string, message: string): BrowseFiltersFailure {
  return { ok: false, status: 400, code: 'UNHANDLED', message, details: { field }, retryable: false }
}

function oneValue(value: unknown): string | undefined | null {
  if (value === undefined) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
    return value[0]
  }
  return null
}

function token<T extends string>(
  query: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): { ok: true; value: T | undefined } | BrowseFiltersFailure {
  const raw = oneValue(query[key])
  if (raw === undefined) {
    return { ok: true, value: undefined }
  }
  if (raw === null || !allowed.includes(raw as T)) {
    return fail(key, `${key} : valeur non reconnue.`)
  }
  return { ok: true, value: raw as T }
}

export function parseBrowseFilters(query: Record<string, unknown>): FilterResult {
  for (const key of Object.keys(query)) {
    if (!KNOWN.has(key)) {
      return fail(key, `${key} : filtre non disponible.`)
    }
  }
  const city = token(query, 'city', CITY)
  if (!city.ok) {
    return city
  }
  const radius = token(query, 'radius_km', RADIUS)
  if (!radius.ok) {
    return radius
  }
  const marital = token(query, 'marital_status', MARITAL)
  if (!marital.ok) {
    return marital
  }
  const polygamy = token(query, 'polygamy_intent', POLYGAMY)
  if (!polygamy.ok) {
    return polygamy
  }
  const practice = token(query, 'practice', PRACTICE)
  if (!practice.ok) {
    return practice
  }
  const madhhab = token(query, 'madhhab', MADHHAB)
  if (!madhhab.ok) {
    return madhhab
  }
  const life = token(query, 'life_plans', LIFE)
  if (!life.ok) {
    return life
  }
  if (radius.value !== undefined && (city.value === undefined || city.value === 'autre')) {
    return fail('radius_km', 'radius_km : choisissez Ouagadougou, Bobo-Dioulasso ou Koudougou.')
  }
  const filters: BrowseFilters = {}
  if (city.value) {
    filters.city = city.value
  }
  if (radius.value) {
    filters.radiusKm = Number(radius.value) as 10 | 25 | 50
  }
  if (marital.value) {
    filters.maritalStatus = marital.value
  }
  if (polygamy.value) {
    filters.polygamyIntent = polygamy.value
  }
  if (practice.value) {
    filters.practice = practice.value
  }
  if (madhhab.value) {
    filters.madhhab = madhhab.value
  }
  if (life.value) {
    filters.lifePlans = life.value
  }
  return { ok: true, filters }
}

function present(value: string | null): boolean {
  return value !== null && value.trim().length > 0
}

function lifeHead(value: string | null): string {
  if (!present(value) || value === null) {
    return ''
  }
  const lineEnd = value.indexOf('\n')
  return lineEnd === -1 ? value : value.slice(0, lineEnd)
}

/** Same predicate the Postgres browse query applies. An unset column never matches. */
export function profileMatchesFilters(row: FilterableProfile, filters: BrowseFilters): boolean {
  if (filters.city === 'autre') {
    const otherCity = row.city !== null && (AUTRE_CITIES as readonly string[]).includes(row.city)
    const diaspora = present(row.country) && row.country !== 'BF'
    if (!otherCity && !diaspora) {
      return false
    }
  } else if (filters.city && filters.radiusKm) {
    const allowed = citiesWithin(filters.city, filters.radiusKm)
    if (row.city === null || !allowed.includes(row.city)) {
      return false
    }
  } else if (filters.city && row.city !== filters.city) {
    return false
  }
  if (filters.maritalStatus && row.marital_status !== filters.maritalStatus) {
    return false
  }
  if (filters.polygamyIntent && row.polygamy_intent !== filters.polygamyIntent) {
    return false
  }
  if (filters.practice && row.practice !== filters.practice) {
    return false
  }
  if (filters.madhhab && row.madhhab !== filters.madhhab) {
    return false
  }
  if (filters.lifePlans && !LIFE_HEAD[filters.lifePlans].includes(lifeHead(row.life_plans))) {
    return false
  }
  return true
}

export function radiusCityTokens(filters: BrowseFilters): string[] | null {
  if (!filters.city || filters.city === 'autre' || !filters.radiusKm) {
    return null
  }
  if (!(NAMED_CITY as readonly string[]).includes(filters.city)) {
    return null
  }
  return citiesWithin(filters.city, filters.radiusKm)
}

export function lifePlanHeads(filters: BrowseFilters): readonly string[] | null {
  if (!filters.lifePlans) {
    return null
  }
  return LIFE_HEAD[filters.lifePlans]
}

export const AUTRE_CITY_TOKENS = AUTRE_CITIES
