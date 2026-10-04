import { newId, type Gender } from '@ankanu/kernel'

export const ACTIVE_STATUS = 'Active'

export type CreatedAccount = {
  id: string
  email: string
  pseudonym: string
  gender: Gender
  roles: ['member']
  status: typeof ACTIVE_STATUS
  age_attested: false
  coc_version: string
}

export type PasswordCredential = {
  id: string
  account_id: string
  kind: 'password'
  secret_hash: string
  provider_subject: null
  email_verified_at: null
}

export type AccountStore = {
  emailTaken(email: string): Promise<boolean>
  pseudonymTaken(pseudonym: string): Promise<boolean>
  insert(account: CreatedAccount, credential: PasswordCredential): Promise<void>
}

export type AccountFailure = {
  ok: false
  status: 400 | 409
  message: string
  details: { field: string } | { fields: string[] }
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

function fail(status: 400 | 409, field: string, message: string): AccountFailure {
  return { ok: false, status, message, details: { field } }
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
  if (!isRecord(body)) {
    return fail(400, 'body', 'body : un objet est requis.')
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
      message: 'email, pseudonym : ces champs sont déjà utilisés.',
      details: { fields: taken },
    }
  }

  const account: CreatedAccount = {
    id: newId(),
    email,
    pseudonym,
    gender,
    roles: ['member'],
    status: ACTIVE_STATUS,
    age_attested: false,
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

  try {
    await deps.store.insert(account, credential)
  } catch (error) {
    if (error instanceof AccountUniqueError) {
      if (error.fields.length === 1) {
        const field = error.fields[0] ?? 'email'
        return fail(409, field, `${field} : ce champ est déjà utilisé.`)
      }
      return {
        ok: false,
        status: 409,
        message: 'email, pseudonym : ces champs sont déjà utilisés.',
        details: { fields: [...error.fields] },
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
