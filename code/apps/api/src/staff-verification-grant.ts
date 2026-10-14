import { isUuidV7, newId } from '@ankanu/kernel'
import { and, eq } from 'drizzle-orm'
import { account, verificationRecord } from './account-schema.js'
import { getAccountStore, getIdentityDatabase } from './account-store.js'
import { getAuditPort } from './audit-port.js'
import { authNow } from './auth-clock.js'
import type { CaptureKind, CaptureRow } from './id-liveness-store.js'
import { getCaptureStore } from './id-liveness-store.js'
import { getProfileStore, profileStoreIsMemory, type ProfileDb } from './profile-store.js'
import { publishIfEligible } from './profile-review.js'

const STAGING_ORIGIN = 'https://staging.ankanu.com'
const AUDIT_ACTION = 'staff_verification_grant'
const ACCOUNT_FIELD = 'account_id : un identifiant est requis.'
const MISSING_ACCOUNT = 'Ce compte est introuvable.'
const HIDDEN = 'Introuvable.'

export type GrantResult = {
  account_id: string
  id_document: 'granted'
  liveness: 'granted'
  visibility: string | null
}

export type GrantFailure = {
  ok: false
  status: 400 | 404
  code: 'UNHANDLED' | 'NOT_FOUND'
  message: string
  details: { field: string } | null
  retryable: false
}

const MEMORY_TX = Symbol('memory-grant-tx')

/** On only when the flag is `1` and the origin string is exactly the staging origin. `NODE_ENV` is not the switch. */
export function stagingStaffGrantEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.STAGING_STAFF_VERIFICATION_GRANT !== '1') {
    return false
  }
  return env.ANKANU_PUBLIC_ORIGIN === STAGING_ORIGIN
}

export async function grantStagingVerification(
  staffId: string,
  body: unknown,
): Promise<{ ok: true; result: GrantResult } | GrantFailure> {
  if (!stagingStaffGrantEnabled()) {
    return hidden()
  }
  const accountId = readAccountId(body)
  if (accountId === null) {
    return {
      ok: false,
      status: 400,
      code: 'UNHANDLED',
      message: ACCOUNT_FIELD,
      details: { field: 'account_id' },
      retryable: false,
    }
  }
  if (profileStoreIsMemory()) {
    return grantInMemory(staffId, accountId)
  }
  return getIdentityDatabase().transaction(async (tx) => grantOn(staffId, accountId, tx))
}

function readAccountId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null
  }
  const accountId = (body as { account_id?: unknown }).account_id
  if (typeof accountId !== 'string' || !isUuidV7(accountId)) {
    return null
  }
  return accountId
}

async function grantInMemory(staffId: string, accountId: string): Promise<{ ok: true; result: GrantResult } | GrantFailure> {
  const store = getAccountStore() as { accounts?: Array<{ id: string }> }
  if (!store.accounts?.some((row) => row.id === accountId)) {
    return missingAccount()
  }
  const profiles = restorable(getProfileStore())
  const profileSnap = profiles?.snapshot() ?? null
  const rows = memoryRows()
  const rowSnap = structuredClone(rows)
  try {
    return await grantOn(staffId, accountId, undefined, callerTransaction())
  } catch (error) {
    rows.splice(0, rows.length, ...rowSnap)
    if (profileSnap !== null) {
      profiles?.restore(profileSnap)
    }
    throw error
  }
}

async function grantOn(
  staffId: string,
  accountId: string,
  db: ProfileDb | undefined,
  auditTx?: unknown,
): Promise<{ ok: true; result: GrantResult } | GrantFailure> {
  if (db) {
    const found = await db.select({ id: account.id }).from(account).where(eq(account.id, accountId)).limit(1)
    if (found.length === 0) {
      return missingAccount()
    }
  }
  const idDocumentId = await grantKind(accountId, 'id_document', db)
  const livenessId = await grantKind(accountId, 'liveness', db)
  await publishIfEligible(accountId, db)
  const after = db ? await getProfileStore().read(accountId, db) : await getProfileStore().read(accountId)
  await getAuditPort().append(auditTx ?? db, {
    actorId: staffId,
    action: AUDIT_ACTION,
    payload: {
      account_id: accountId,
      action: AUDIT_ACTION,
      id_document: 'granted',
      id_document_id: idDocumentId,
      liveness: 'granted',
      liveness_id: livenessId,
      reason: 'staging_staff_grant',
    },
  })
  return {
    ok: true,
    result: {
      account_id: accountId,
      id_document: 'granted',
      liveness: 'granted',
      visibility: after?.visibility ?? null,
    },
  }
}

async function grantKind(accountId: string, kind: CaptureKind, db: ProfileDb | undefined): Promise<string> {
  if (!db) {
    const rows = memoryRows()
    const latest = await getCaptureStore().latest(accountId, kind)
    if (latest) {
      latest.status = 'granted'
      return latest.id
    }
    const created = grantedRow(accountId, kind)
    rows.push(created)
    return created.id
  }
  const matched = await selectKind(db, accountId, kind)
  if (matched) {
    await db.update(verificationRecord).set({ status: 'granted' }).where(eq(verificationRecord.id, matched.id))
    return matched.id
  }
  const createdId = newId(authNow())
  await db.insert(verificationRecord).values({
    id: createdId,
    account_id: accountId,
    kind,
    status: 'granted',
    vendor: null,
    evidence_uri: null,
    phone_e164: null,
    hash: null,
    expires_at: null,
  })
  return createdId
}

async function selectKind(
  db: ProfileDb,
  accountId: string,
  kind: CaptureKind,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: verificationRecord.id })
    .from(verificationRecord)
    .where(and(eq(verificationRecord.account_id, accountId), eq(verificationRecord.kind, kind)))
  let chosen: { id: string } | null = null
  for (const row of rows) {
    if (!chosen || row.id > chosen.id) {
      chosen = row
    }
  }
  return chosen
}

function grantedRow(accountId: string, kind: CaptureKind): CaptureRow {
  return {
    id: newId(authNow()),
    account_id: accountId,
    kind,
    status: 'granted',
    vendor: null,
    evidence_uri: '',
    phone_e164: null,
    hash: null,
    expires_at: null,
  }
}

function memoryRows(): CaptureRow[] {
  const store = getCaptureStore() as { rows?: CaptureRow[] }
  if (!store.rows) {
    throw new Error('memory verification grant requires the capture rows')
  }
  return store.rows
}

function hidden(): GrantFailure {
  return {
    ok: false,
    status: 404,
    code: 'NOT_FOUND',
    message: HIDDEN,
    details: null,
    retryable: false,
  }
}

function missingAccount(): GrantFailure {
  return {
    ok: false,
    status: 404,
    code: 'NOT_FOUND',
    message: MISSING_ACCOUNT,
    details: null,
    retryable: false,
  }
}

function callerTransaction(): object {
  const unused = (): never => {
    throw new Error('memory verification grant transaction is not a SQL handle')
  }
  return Object.assign({ insert: unused, select: unused, execute: unused, update: unused }, { [MEMORY_TX]: true })
}

type Restorable = { snapshot(): unknown; restore(value: unknown): void }

function restorable(value: object): Restorable | null {
  if (!('snapshot' in value) || !('restore' in value)) {
    return null
  }
  const store = value as { snapshot?: unknown; restore?: unknown }
  if (typeof store.snapshot !== 'function' || typeof store.restore !== 'function') {
    return null
  }
  return value as Restorable
}
