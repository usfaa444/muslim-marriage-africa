import { and, eq, inArray, sql } from 'drizzle-orm'
import { account, profile, verificationRecord } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { HELD_STATUS } from './create-account.js'

export type CaptureKind = 'liveness' | 'id_document'
export type CaptureStatus = 'pending' | 'granted' | 'rejected' | 'held'

export type CaptureRow = {
  id: string
  account_id: string
  kind: CaptureKind
  status: CaptureStatus
  vendor: null
  evidence_uri: string
  phone_e164: null
  hash: null
  expires_at: null
}

export type CaptureMemory = {
  accounts: Array<{ id: string; status: string }>
  profiles: Array<{ account_id: string; visibility: string | null }>
  phoneRows: Array<{ account_id: string; kind: string; status: string }>
}

export type CaptureStore = {
  hasGrantedPhone(accountId: string): Promise<boolean>
  accountStatus(accountId: string): Promise<string | null>
  countRecent(accountId: string, sinceMs: number): Promise<number>
  save(row: CaptureRow): Promise<void>
  latest(accountId: string, kind: CaptureKind): Promise<CaptureRow | null>
}

let override: CaptureStore | undefined

export function setCaptureStore(store: CaptureStore | undefined): void {
  override = store
}

export function getCaptureStore(): CaptureStore {
  if (override) {
    return override
  }
  return postgresCaptureStore()
}

export function recordTimeMs(id: string): number | null {
  const hex = id.replaceAll('-', '')
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    return null
  }
  const ms = Number(BigInt(`0x${hex.slice(0, 12)}`))
  if (!Number.isSafeInteger(ms)) {
    return null
  }
  return ms
}

export function memoryCaptureStore(memory: CaptureMemory): CaptureStore & { rows: CaptureRow[] } {
  const rows: CaptureRow[] = []
  return {
    rows,
    async hasGrantedPhone(accountId) {
      return memory.phoneRows.some(
        (row) => row.account_id === accountId && row.kind === 'phone_otp' && row.status === 'granted',
      )
    },
    async accountStatus(accountId) {
      return memory.accounts.find((row) => row.id === accountId)?.status ?? null
    },
    async countRecent(accountId, sinceMs) {
      return rows.filter((row) => row.account_id === accountId && (recordTimeMs(row.id) ?? -1) >= sinceMs).length
    },
    async save(row) {
      rows.push(row)
      if (row.status !== HELD_STATUS) {
        return
      }
      const stored = memory.profiles.find((item) => item.account_id === row.account_id)
      if (!stored || stored.visibility === HELD_STATUS) {
        return
      }
      stored.visibility = HELD_STATUS
    },
    async latest(accountId, kind) {
      return newest(rows.filter((row) => row.account_id === accountId && row.kind === kind))
    },
  }
}

function newest(rows: CaptureRow[]): CaptureRow | null {
  let chosen: CaptureRow | null = null
  let chosenMs = -1
  for (const row of rows) {
    const ms = recordTimeMs(row.id) ?? -1
    if (chosen === null || ms > chosenMs || (ms === chosenMs && row.id > chosen.id)) {
      chosen = row
      chosenMs = ms
    }
  }
  return chosen
}

function postgresCaptureStore(): CaptureStore {
  return {
    async hasGrantedPhone(accountId) {
      const rows = await getIdentityDatabase()
        .select({ id: verificationRecord.id })
        .from(verificationRecord)
        .where(
          and(
            eq(verificationRecord.account_id, accountId),
            eq(verificationRecord.kind, 'phone_otp'),
            eq(verificationRecord.status, 'granted'),
          ),
        )
        .limit(1)
      return rows.length > 0
    },
    async accountStatus(accountId) {
      const rows = await getIdentityDatabase()
        .select({ status: account.status })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1)
      return rows[0]?.status ?? null
    },
    async countRecent(accountId, sinceMs) {
      const rows = await getIdentityDatabase()
        .select({ id: verificationRecord.id })
        .from(verificationRecord)
        .where(
          and(
            eq(verificationRecord.account_id, accountId),
            inArray(verificationRecord.kind, ['liveness', 'id_document']),
          ),
        )
      return rows.filter((row) => (recordTimeMs(row.id) ?? -1) >= sinceMs).length
    },
    async save(row) {
      const database = getIdentityDatabase()
      await database.transaction(async (tx) => {
        await tx.insert(verificationRecord).values({
          id: row.id,
          account_id: row.account_id,
          kind: row.kind,
          status: row.status,
          vendor: null,
          evidence_uri: row.evidence_uri,
          phone_e164: null,
          hash: null,
          expires_at: null,
        })
        if (row.status !== HELD_STATUS) {
          return
        }
        await tx
          .update(profile)
          .set({ visibility: HELD_STATUS })
          .where(
            and(eq(profile.account_id, row.account_id), sql`${profile.visibility} is distinct from ${HELD_STATUS}`),
          )
      })
    },
    async latest(accountId, kind) {
      const rows = await getIdentityDatabase()
        .select()
        .from(verificationRecord)
        .where(and(eq(verificationRecord.account_id, accountId), eq(verificationRecord.kind, kind)))
      return newest(
        rows.map((row) => ({
          id: row.id,
          account_id: row.account_id,
          kind,
          status: row.status as CaptureStatus,
          vendor: null,
          evidence_uri: row.evidence_uri ?? '',
          phone_e164: null,
          hash: null,
          expires_at: null,
        })),
      )
    },
  }
}
