import type { Gender } from '@ankanu/kernel'

/** Profile columns a Member may save. Completeness is computed from these columns, never stored. */

export const MARITAL_STATUS = ['single', 'married', 'divorced', 'widowed'] as const
export const POLYGAMY_INTENT = ['no', 'yes'] as const
export const MADHHAB = ['maliki', 'hanafi', 'shafii', 'hanbali', 'apprentissage'] as const
export const PRACTICE = ['assidue', 'heure', 'cheminement'] as const
export const LIFE_PLAN_TIMEFRAME = ['immediate', '6months', '1year', 'serene'] as const
export const EDUCATION = ['secondaire', 'licence', 'master_eco', 'master_autre', 'doctorat', 'autre'] as const
export const PROFESSION = ['finance', 'enseignement', 'ingenierie', 'administration', 'commerce', 'sante', 'autre'] as const
export const COUNTRY = ['BF', 'CI', 'ML', 'SN', 'NE', 'TG', 'BJ', 'GN', 'FR', 'CA', 'OTHER'] as const
export const CITY = ['ouagadougou', 'bobo', 'koudougou', 'ouahigouya', 'banfora', 'dedougou', 'fada', 'autre'] as const

export type ProfileWrite = {
  dob: string
  city: string | null
  country: string | null
  origin: string | null
  marital_status: string | null
  polygamy_intent: string | null
  education: string | null
  profession: string | null
  madhhab: string | null
  practice: string | null
  life_plans: string | null
  bio_pending: string | null
}

export type Completeness = {
  percent: number
  missing: string[]
  ready: boolean
}

export type ProfileFieldError = {
  field: keyof ProfileWrite | 'min_age'
  message: string
}

const MARRIED_POLYGYNY = "polygamy_intent : l'intention de polygamie doit être oui lorsque le frère est marié."
const POLYGYNY_REQUIRED = "polygamy_intent : l'intention de polygamie est requise."
const MARITAL_REQUIRED = 'marital_status : la situation matrimoniale est requise.'

const MISSING_LABEL: Record<string, string> = {
  madhhab: 'madhhab',
  practice: 'pratique',
  life_plans: 'intentions',
  marital_status: 'situation matrimoniale',
  polygamy_intent: 'intention de polygamie',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function blank(value: string | null): boolean {
  return value === null || value.trim().length === 0
}

function oneOf(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value)
}

function isFieldError(value: string | null | undefined | ProfileFieldError): value is ProfileFieldError {
  return typeof value === 'object' && value !== null
}

/** Absent stays absent (`undefined`). Null and a blank string clear the column. */
function kept(next: string | null | undefined, previous: string | null | undefined): string | null {
  return next === undefined ? (previous ?? null) : next
}

function optionalToken(
  body: Record<string, unknown>,
  key: keyof ProfileWrite,
  allowed: readonly string[],
): string | null | undefined | ProfileFieldError {
  if (!(key in body)) {
    return undefined
  }
  if (body[key] === null) {
    return null
  }
  if (typeof body[key] !== 'string') {
    return { field: key, message: `${key} : valeur illisible.` }
  }
  const trimmed = body[key].trim()
  if (trimmed.length === 0) {
    return null
  }
  if (!oneOf(trimmed, allowed)) {
    return { field: key, message: `${key} : valeur non reconnue.` }
  }
  return trimmed
}

function optionalText(
  body: Record<string, unknown>,
  key: 'origin' | 'bio_pending' | 'life_plans',
): string | null | undefined | ProfileFieldError {
  if (!(key in body)) {
    return undefined
  }
  if (body[key] === null) {
    return null
  }
  if (typeof body[key] !== 'string') {
    return { field: key, message: `${key} : valeur illisible.` }
  }
  const trimmed = body[key].trim()
  return trimmed.length === 0 ? null : trimmed
}

/** Timeframe token from the profile screen, stored in the one `life_plans` column with the intentions text. */
export function lifePlansAreValid(value: string): boolean {
  if (!value.startsWith('tf:')) {
    return true
  }
  const lineEnd = value.indexOf('\n')
  const head = lineEnd === -1 ? value : value.slice(0, lineEnd)
  return oneOf(head.slice(3), LIFE_PLAN_TIMEFRAME)
}

export function acceptProfileWrite(
  body: unknown,
  gender: Gender,
  current?: ProfileWrite,
): ProfileWrite | ProfileFieldError {
  if (!isRecord(body) || typeof body.dob !== 'string' || body.dob.trim().length === 0) {
    return { field: 'dob', message: 'dob : une date de naissance est requise.' }
  }

  const city = optionalToken(body, 'city', CITY)
  if (isFieldError(city)) {
    return city
  }
  const country = optionalToken(body, 'country', COUNTRY)
  if (isFieldError(country)) {
    return country
  }
  const origin = optionalText(body, 'origin')
  if (isFieldError(origin)) {
    return origin
  }
  const marital = optionalToken(body, 'marital_status', MARITAL_STATUS)
  if (isFieldError(marital)) {
    return marital
  }
  const polygamy = optionalToken(body, 'polygamy_intent', POLYGAMY_INTENT)
  if (isFieldError(polygamy)) {
    return polygamy
  }
  const education = optionalToken(body, 'education', EDUCATION)
  if (isFieldError(education)) {
    return education
  }
  const profession = optionalToken(body, 'profession', PROFESSION)
  if (isFieldError(profession)) {
    return profession
  }
  const madhhab = optionalToken(body, 'madhhab', MADHHAB)
  if (isFieldError(madhhab)) {
    return madhhab
  }
  const practice = optionalToken(body, 'practice', PRACTICE)
  if (isFieldError(practice)) {
    return practice
  }
  const lifePlans = optionalText(body, 'life_plans')
  if (isFieldError(lifePlans)) {
    return lifePlans
  }
  if (typeof lifePlans === 'string' && !lifePlansAreValid(lifePlans)) {
    return { field: 'life_plans', message: 'life_plans : valeur non reconnue.' }
  }
  const bio = optionalText(body, 'bio_pending')
  if (isFieldError(bio)) {
    return bio
  }

  const maritalStatus = kept(marital, current?.marital_status)
  const polygamyIntent = kept(polygamy, current?.polygamy_intent)
  if (gender === 'brother') {
    if (maritalStatus === null) {
      return { field: 'marital_status', message: MARITAL_REQUIRED }
    }
    if (polygamyIntent === null) {
      return { field: 'polygamy_intent', message: POLYGYNY_REQUIRED }
    }
    if (maritalStatus === 'married' && polygamyIntent !== 'yes') {
      return { field: 'polygamy_intent', message: MARRIED_POLYGYNY }
    }
  }

  return {
    dob: body.dob.trim(),
    city: kept(city, current?.city),
    country: kept(country, current?.country),
    origin: kept(origin, current?.origin),
    marital_status: maritalStatus,
    polygamy_intent: polygamyIntent,
    education: kept(education, current?.education),
    profession: kept(profession, current?.profession),
    madhhab: kept(madhhab, current?.madhhab),
    practice: kept(practice, current?.practice),
    life_plans: kept(lifePlans, current?.life_plans),
    bio_pending: kept(bio, current?.bio_pending),
  }
}

/**
 * Missing Invite criteria by name.
 * Every Member: madhhab, practice, intentions.
 * A Brother also: marital status and polygamy intent (AD-26).
 */
export function completenessFor(
  row: Pick<ProfileWrite, 'madhhab' | 'practice' | 'life_plans' | 'marital_status' | 'polygamy_intent'>,
  gender: Gender,
): Completeness {
  const missingKeys: string[] = []
  if (blank(row.madhhab)) {
    missingKeys.push('madhhab')
  }
  if (blank(row.practice)) {
    missingKeys.push('practice')
  }
  if (blank(row.life_plans)) {
    missingKeys.push('life_plans')
  }
  if (gender === 'brother') {
    if (blank(row.marital_status)) {
      missingKeys.push('marital_status')
    }
    if (blank(row.polygamy_intent) || (row.marital_status === 'married' && row.polygamy_intent !== 'yes')) {
      missingKeys.push('polygamy_intent')
    }
  }
  const total = gender === 'brother' ? 5 : 3
  return {
    percent: Math.round(((total - missingKeys.length) / total) * 100),
    missing: missingKeys.map((key) => MISSING_LABEL[key] ?? key),
    ready: missingKeys.length === 0,
  }
}

export function isProfileFieldError(value: ProfileWrite | ProfileFieldError): value is ProfileFieldError {
  return 'message' in value && !('city' in value)
}
