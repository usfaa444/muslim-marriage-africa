import { ageOn } from './create-account.js'

export type PrecheckStore = {
  pseudonymTaken(pseudonym: string): Promise<boolean>
  minAge(): Promise<number | null>
}

export type PrecheckFailure = {
  ok: false
  status: 400 | 503
  code: 'UNHANDLED'
  message: string
  details: { field: string }
  retryable: boolean
}

export type PrecheckSuccess = {
  ok: true
  body: { pseudonym_available: boolean; age_eligible: boolean }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(status: 400 | 503, field: string, message: string, retryable = false): PrecheckFailure {
  return { ok: false, status, code: 'UNHANDLED', message, details: { field }, retryable }
}

/** Reads availability and age. Writes nothing. */
export async function precheckAccount(
  body: unknown,
  deps: { store: PrecheckStore; today: Date },
): Promise<PrecheckSuccess | PrecheckFailure> {
  if (!isRecord(body)) {
    return fail(400, 'pseudonym', 'pseudonym : un pseudonyme est requis.')
  }
  const pseudonymRaw = body.pseudonym
  if (typeof pseudonymRaw !== 'string' || pseudonymRaw.trim().length === 0) {
    return fail(400, 'pseudonym', 'pseudonym : un pseudonyme est requis.')
  }
  const dobRaw = body.dob
  if (typeof dobRaw !== 'string' || dobRaw.trim().length === 0) {
    return fail(400, 'dob', 'dob : une date de naissance est requise.')
  }
  const dob = dobRaw.trim()
  const age = ageOn(dob, deps.today)
  if (age === null) {
    return fail(400, 'dob', 'dob : une date de naissance est requise.')
  }
  const minAge = await deps.store.minAge()
  if (minAge === null) {
    return fail(503, 'min_age', 'min_age : la configuration est illisible.', true)
  }
  const pseudonym = pseudonymRaw.trim()
  const taken = await deps.store.pseudonymTaken(pseudonym)
  return {
    ok: true,
    body: {
      pseudonym_available: !taken,
      age_eligible: age >= minAge,
    },
  }
}
