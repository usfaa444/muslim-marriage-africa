import { newId, type Gender } from '@ankanu/kernel'
import { authNow } from './auth-clock.js'

export const ACTIVE_STATUS = 'Active'
export const DEACTIVATED_STATUS = 'deactivated'
export const HELD_STATUS = 'held'

export type CreatedAccount = {
  id: string
  email: string
  pseudonym: string
  gender: Gender
  roles: ['member']
  status: typeof ACTIVE_STATUS | typeof DEACTIVATED_STATUS | typeof HELD_STATUS
  age_attested: boolean
  coc_version: string
}

/** The create insert writes `account_id` and `dob`. `visibility` is set to `held` only when the account is held. */
export type CreatedProfile = {
  account_id: string
  dob: string
  visibility: typeof HELD_STATUS | null
}

export type PasswordCredential = {
  id: string
  account_id: string
  kind: 'password'
  secret_hash: string
  provider_subject: null
  email_verified_at: string | null
}

export type AccountStore = {
  emailTaken(email: string): Promise<boolean>
  pseudonymTaken(pseudonym: string): Promise<boolean>
  minAge(): Promise<number | null>
  insert(account: CreatedAccount, credential: PasswordCredential, profile: CreatedProfile): Promise<void>
}

export type AccountFailure = {
  ok: false
  status: 400 | 409 | 503
  code: 'CAPTCHA_FAILED' | 'UNHANDLED'
  message: string
  details: { field: string } | { fields: string[] }
  retryable: boolean
}

export type AccountSuccess = {
  ok: true
  account: CreatedAccount
}

const MIN_PASSWORD = 12
const MAX_PASSWORD = 128

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(status: 400 | 409 | 503, field: string, message: string, retryable = false): AccountFailure {
  return { ok: false, status, code: 'UNHANDLED', message, details: { field }, retryable }
}

/** Completed years in UTC. Returns null when `dob` is not a real `YYYY-MM-DD` calendar date. */
export function ageOn(dob: string, today: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return null
  }
  let age = today.getUTCFullYear() - year
  const monthGap = today.getUTCMonth() - (month - 1)
  if (monthGap < 0 || (monthGap === 0 && today.getUTCDate() < day)) {
    age -= 1
  }
  return age
}

/** 12 to 128 Unicode characters. Spaces are allowed. A password of only spaces is rejected. */
export function passwordIsPublishable(password: string): boolean {
  const length = Array.from(password).length
  if (length < MIN_PASSWORD || length > MAX_PASSWORD) {
    return false
  }
  return password.trim().length > 0
}

function readString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  return typeof value === 'string' ? value : undefined
}

export async function createMemberAccount(
  body: unknown,
  deps: {
    store: AccountStore
    hashPassword: (password: string) => Promise<string>
  },
): Promise<AccountSuccess | AccountFailure> {
  if (!isRecord(body) || body.human_verified !== true) {
    return {
      ok: false,
      status: 400,
      code: 'CAPTCHA_FAILED',
      message: 'Échec de validation de la vérification humaine.',
      details: { field: 'human_verified' },
      retryable: false,
    }
  }

  if (body.pledge_accepted !== true) {
    return fail(400, 'pledge', 'pledge : le serment et la charte sont requis.')
  }

  const coc = readString(body, 'coc_version')
  if (coc === undefined || coc.trim().length === 0) {
    return fail(400, 'coc_version', 'coc_version : la version de la charte est requise.')
  }

  const emailRaw = readString(body, 'email')
  if (emailRaw === undefined || emailRaw.trim().length === 0 || !/^[^@\s]+@[^@\s]+$/.test(emailRaw.trim())) {
    return fail(400, 'email', 'email : une adresse inutilisée est requise.')
  }
  const email = emailRaw.trim().toLowerCase()

  const pseudonymRaw = readString(body, 'pseudonym')
  if (pseudonymRaw === undefined || pseudonymRaw.trim().length === 0) {
    return fail(400, 'pseudonym', 'pseudonym : un pseudonyme inutilisé est requis.')
  }
  const pseudonym = pseudonymRaw.trim()

  const gender = body.gender
  if (gender !== 'sister' && gender !== 'brother') {
    return fail(400, 'gender', 'gender : sister ou brother est requis.')
  }

  const password = readString(body, 'password')
  if (password === undefined || !passwordIsPublishable(password)) {
    return fail(400, 'password', 'password : la règle publiée n\'est pas respectée.')
  }

  const dobRaw = readString(body, 'dob')
  const dob = dobRaw?.trim()
  const age = dob === undefined ? null : ageOn(dob, authNow())
  if (dob === undefined || dob.length === 0 || age === null) {
    return fail(400, 'dob', 'dob : une date de naissance est requise.')
  }

  const taken: string[] = []
  if (await deps.store.emailTaken(email)) {
    taken.push('email')
  }
  if (await deps.store.pseudonymTaken(pseudonym)) {
    taken.push('pseudonym')
  }
  if (taken.length === 1) {
    const field = taken[0] ?? 'email'
    return fail(409, field, `${field} : ce champ est déjà utilisé.`)
  }
  if (taken.length > 1) {
      return {
        ok: false,
        status: 409,
        code: 'UNHANDLED',
        message: 'email, pseudonym : ces champs sont déjà utilisés.',
        details: { fields: taken },
        retryable: false,
      }
  }

  const minAge = await deps.store.minAge()
  if (minAge === null) {
    return fail(503, 'min_age', 'min_age : la configuration est illisible.', true)
  }
  const held = age < minAge
  const account: CreatedAccount = {
    id: newId(),
    email,
    pseudonym,
    gender,
    roles: ['member'],
    status: held ? HELD_STATUS : ACTIVE_STATUS,
    age_attested: !held,
    coc_version: coc.trim(),
  }
  const credential: PasswordCredential = {
    id: newId(),
    account_id: account.id,
    kind: 'password',
    secret_hash: await deps.hashPassword(password),
    provider_subject: null,
    email_verified_at: null,
  }
  const createdProfile: CreatedProfile = {
    account_id: account.id,
    dob,
    visibility: held ? HELD_STATUS : null,
  }

  try {
    await deps.store.insert(account, credential, createdProfile)
  } catch (error) {
    if (error instanceof AccountUniqueError) {
      if (error.fields.length === 1) {
        const field = error.fields[0] ?? 'email'
        return fail(409, field, `${field} : ce champ est déjà utilisé.`)
      }
      return {
        ok: false,
        status: 409,
        code: 'UNHANDLED',
        message: 'email, pseudonym : ces champs sont déjà utilisés.',
        details: { fields: [...error.fields] },
        retryable: false,
      }
    }
    throw error
  }

  return { ok: true, account }
}

export class AccountUniqueError extends Error {
  constructor(readonly fields: Array<'email' | 'pseudonym'>) {
    super(fields.join(','))
  }
}
