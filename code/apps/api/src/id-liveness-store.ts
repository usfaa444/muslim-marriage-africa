import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { account, livenessChallenge, profile, verificationRecord } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { HELD_STATUS } from './create-account.js'
import type { LivenessPose } from './liveness-pose.js'
import type { ProfileDb } from './profile-store.js'

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
  /** The pose asked for a liveness selfie. Never set on an ID row. */
  pose?: LivenessPose | null
  decision_reason?: string | null
  decision_note?: string | null
  decided_at?: Date | null
  decided_by?: string | null
}

export type ChallengeRow = {
  id: string
  account_id: string
  pose: LivenessPose
  expires_at: Date
}

/** A latest ID or liveness row still waiting for a Moderator, with what the queue shows about its account. */
export type PendingCapture = CaptureRow & { pseudonym: string; account_status: string }

export type DecideInput = {
  recordId: string
  accountId: string
  kind: CaptureKind
  status: 'granted' | 'rejected' | 'held'
  reason: string | null
  note: string | null
  decidedBy: string
  at: Date
}

export type CaptureMemory = {
  accounts: Array<{ id: string; status: string; pseudonym?: string }>
  profiles: Array<{ account_id: string; visibility: string | null }>
  phoneRows: Array<{ account_id: string; kind: string; status: string }>
}

export type CaptureStore = {
  hasGrantedPhone(accountId: string): Promise<boolean>
  accountStatus(accountId: string): Promise<string | null>
  /** Pseudonym and status for the staff case header. */
  accountCard(accountId: string): Promise<{ pseudonym: string; status: string } | null>
  countRecent(accountId: string, sinceMs: number): Promise<number>
  /**
   * Inserts the row. With `consume`, the account's live challenge with that id is deleted in the same unit of work;
   * when it is gone, expired or another one, nothing is written and the answer is `challenge_gone`.
   */
  save(row: CaptureRow, consume?: { challengeId: string; now: Date }): Promise<'saved' | 'challenge_gone' | void>
  latest(accountId: string, kind: CaptureKind): Promise<CaptureRow | null>
  /** Replaces the account's challenge. */
  issueChallenge(row: ChallengeRow): Promise<void>
  challenge(accountId: string): Promise<ChallengeRow | null>
  record(id: string): Promise<CaptureRow | null>
  /** Latest ID and liveness rows that are `pending`, one per account and kind. */
  pendingLatest(): Promise<PendingCapture[]>
  /** Every ID and liveness row of the account, newest first. */
  history(accountId: string): Promise<CaptureRow[]>
  /**
   * The Moderator decision. Writes only while the row is still `pending` and still the newest of its kind for the
   * account (a retake after the case opened makes it stale). Serialized per account with the capture insert.
   */
  decide(input: DecideInput, db?: ProfileDb): Promise<boolean>
  /** Suspected minor: the existing age hold (Story 2.6): account `held`, profile `visibility=held`. */
  holdAccount(accountId: string, db?: ProfileDb): Promise<void>
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

export function captureStoreIsMemory(): boolean {
  return override !== undefined
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

type MemorySnap = { rows: CaptureRow[]; challenges: ChallengeRow[]; accounts: string[]; profiles: Array<string | null> }

export function memoryCaptureStore(
  memory: CaptureMemory,
): CaptureStore & { rows: CaptureRow[]; challenges: ChallengeRow[]; snapshot(): MemorySnap; restore(snap: MemorySnap): void } {
  const rows: CaptureRow[] = []
  const challenges: ChallengeRow[] = []
  const newerExists = (row: CaptureRow) =>
    rows.some((item) => item.account_id === row.account_id && item.kind === row.kind && item.id > row.id)
  return {
    rows,
    challenges,
    snapshot() {
      return {
        rows: structuredClone(rows),
        challenges: structuredClone(challenges),
        accounts: memory.accounts.map((item) => item.status),
        profiles: memory.profiles.map((item) => item.visibility),
      }
    },
    restore(snap) {
      rows.splice(0, rows.length, ...snap.rows)
      challenges.splice(0, challenges.length, ...snap.challenges)
      snap.accounts.forEach((status, index) => {
        const item = memory.accounts[index]
        if (item) {
          item.status = status
        }
      })
      snap.profiles.forEach((visibility, index) => {
        const item = memory.profiles[index]
        if (item) {
          item.visibility = visibility
        }
      })
    },
    async hasGrantedPhone(accountId) {
      return memory.phoneRows.some(
        (row) => row.account_id === accountId && row.kind === 'phone_otp' && row.status === 'granted',
      )
    },
    async accountStatus(accountId) {
      return memory.accounts.find((row) => row.id === accountId)?.status ?? null
    },
    async accountCard(accountId) {
      const owner = memory.accounts.find((row) => row.id === accountId)
      return owner ? { pseudonym: owner.pseudonym ?? '', status: owner.status } : null
    },
    async countRecent(accountId, sinceMs) {
      return rows.filter((row) => row.account_id === accountId && (recordTimeMs(row.id) ?? -1) >= sinceMs).length
    },
    async save(row, consume) {
      if (consume) {
        const index = challenges.findIndex(
          (item) =>
            item.account_id === row.account_id &&
            item.id === consume.challengeId &&
            item.expires_at.getTime() > consume.now.getTime(),
        )
        if (index < 0) {
          return 'challenge_gone'
        }
        challenges.splice(index, 1)
      }
      rows.push(row)
      if (row.status !== HELD_STATUS) {
        return 'saved'
      }
      const stored = memory.profiles.find((item) => item.account_id === row.account_id)
      if (stored && stored.visibility !== HELD_STATUS) {
        stored.visibility = HELD_STATUS
      }
      return 'saved'
    },
    async latest(accountId, kind) {
      return newest(rows.filter((row) => row.account_id === accountId && row.kind === kind))
    },
    async issueChallenge(row) {
      const index = challenges.findIndex((item) => item.account_id === row.account_id)
      if (index >= 0) {
        challenges.splice(index, 1)
      }
      challenges.push({ ...row })
    },
    async challenge(accountId) {
      const found = challenges.find((item) => item.account_id === accountId)
      return found ? { ...found } : null
    },
    async record(id) {
      return rows.find((row) => row.id === id) ?? null
    },
    async pendingLatest() {
      const out: PendingCapture[] = []
      const seen = new Set<string>()
      for (const row of rows) {
        const key = `${row.account_id}:${row.kind}`
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        const latest = newest(rows.filter((item) => item.account_id === row.account_id && item.kind === row.kind))
        if (!latest || latest.status !== 'pending') {
          continue
        }
        const owner = memory.accounts.find((item) => item.id === row.account_id)
        out.push({ ...latest, pseudonym: owner?.pseudonym ?? '', account_status: owner?.status ?? '' })
      }
      return out
    },
    async history(accountId) {
      return rows
        .filter((row) => row.account_id === accountId)
        .sort((left, right) => (left.id < right.id ? 1 : left.id > right.id ? -1 : 0))
    },
    async decide(input) {
      const row = rows.find((item) => item.id === input.recordId)
      if (!row || row.account_id !== input.accountId || row.kind !== input.kind || row.status !== 'pending') {
        return false
      }
      if (newerExists(row)) {
        return false
      }
      row.status = input.status
      row.decision_reason = input.reason
      row.decision_note = input.note
      row.decided_at = input.at
      row.decided_by = input.decidedBy
      return true
    },
    async holdAccount(accountId) {
      const owner = memory.accounts.find((item) => item.id === accountId)
      if (owner) {
        owner.status = HELD_STATUS
      }
      const stored = memory.profiles.find((item) => item.account_id === accountId)
      if (stored) {
        stored.visibility = HELD_STATUS
      }
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

class ChallengeGone extends Error {
  constructor() {
    super('challenge gone')
    this.name = 'ChallengeGone'
  }
}

type DbRow = typeof verificationRecord.$inferSelect

function fromDb(row: DbRow): CaptureRow {
  return {
    id: row.id,
    account_id: row.account_id,
    kind: row.kind as CaptureKind,
    status: row.status as CaptureStatus,
    vendor: null,
    evidence_uri: row.evidence_uri ?? '',
    phone_e164: null,
    hash: null,
    expires_at: null,
    pose: (row.pose as LivenessPose | null) ?? null,
    decision_reason: row.decision_reason ?? null,
    decision_note: row.decision_note ?? null,
    decided_at: row.decided_at ?? null,
    decided_by: row.decided_by ?? null,
  }
}

/** Row lock on the account: a capture insert and a Moderator decision on one account never interleave. */
async function lockAccount(db: ProfileDb, accountId: string): Promise<void> {
  await db.execute(sql`select ${account.id} from ${account} where ${account.id} = ${accountId} for update`)
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
    async accountCard(accountId) {
      const rows = await getIdentityDatabase()
        .select({ pseudonym: account.pseudonym, status: account.status })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1)
      return rows[0] ?? null
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
    async save(row, consume) {
      const database = getIdentityDatabase()
      try {
        await database.transaction(async (tx) => {
          await lockAccount(tx, row.account_id)
          if (consume) {
            const used = await tx
              .delete(livenessChallenge)
              .where(
                and(
                  eq(livenessChallenge.account_id, row.account_id),
                  eq(livenessChallenge.id, consume.challengeId),
                  gt(livenessChallenge.expires_at, consume.now),
                ),
              )
              .returning({ id: livenessChallenge.id })
            if (used.length !== 1) {
              throw new ChallengeGone()
            }
          }
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
            pose: row.kind === 'liveness' ? (row.pose ?? null) : null,
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
      } catch (error) {
        if (error instanceof ChallengeGone) {
          return 'challenge_gone'
        }
        throw error
      }
      return 'saved'
    },
    async latest(accountId, kind) {
      const rows = await getIdentityDatabase()
        .select()
        .from(verificationRecord)
        .where(and(eq(verificationRecord.account_id, accountId), eq(verificationRecord.kind, kind)))
      return newest(rows.map(fromDb))
    },
    async issueChallenge(row) {
      await getIdentityDatabase()
        .insert(livenessChallenge)
        .values({ account_id: row.account_id, id: row.id, pose: row.pose, expires_at: row.expires_at })
        .onConflictDoUpdate({
          target: livenessChallenge.account_id,
          set: { id: row.id, pose: row.pose, expires_at: row.expires_at },
        })
    },
    async challenge(accountId) {
      const rows = await getIdentityDatabase()
        .select()
        .from(livenessChallenge)
        .where(eq(livenessChallenge.account_id, accountId))
        .limit(1)
      const found = rows[0]
      if (!found) {
        return null
      }
      return { id: found.id, account_id: found.account_id, pose: found.pose as LivenessPose, expires_at: found.expires_at }
    },
    async record(id) {
      const rows = await getIdentityDatabase()
        .select()
        .from(verificationRecord)
        .where(and(eq(verificationRecord.id, id), inArray(verificationRecord.kind, ['liveness', 'id_document'])))
        .limit(1)
      return rows[0] ? fromDb(rows[0]) : null
    },
    async pendingLatest() {
      const result = await getIdentityDatabase().execute(sql`
        select latest.*, ${account.pseudonym} as pseudonym, ${account.status} as account_status
        from (
          select distinct on (${verificationRecord.account_id}, ${verificationRecord.kind}) ${verificationRecord}.*
          from ${verificationRecord}
          where ${verificationRecord.kind} in ('liveness', 'id_document')
          order by ${verificationRecord.account_id}, ${verificationRecord.kind}, ${verificationRecord.id} desc
        ) as latest
        join ${account} on ${account.id} = latest.account_id
        where latest.status = 'pending'`)
      return (result.rows as Array<Record<string, unknown>>).map((row) => ({
        ...fromDb({
          id: String(row['id']),
          account_id: String(row['account_id']),
          kind: String(row['kind']),
          status: String(row['status']),
          vendor: null,
          evidence_uri: (row['evidence_uri'] as string | null) ?? null,
          phone_e164: null,
          hash: null,
          expires_at: null,
          pose: (row['pose'] as string | null) ?? null,
          decision_reason: null,
          decision_note: null,
          decided_at: null,
          decided_by: null,
        }),
        pseudonym: String(row['pseudonym'] ?? ''),
        account_status: String(row['account_status'] ?? ''),
      }))
    },
    async history(accountId) {
      const rows = await getIdentityDatabase()
        .select()
        .from(verificationRecord)
        .where(
          and(eq(verificationRecord.account_id, accountId), inArray(verificationRecord.kind, ['liveness', 'id_document'])),
        )
        .orderBy(desc(verificationRecord.id))
      return rows.map(fromDb)
    },
    async decide(input, db) {
      const run = async (handle: ProfileDb): Promise<boolean> => {
        await lockAccount(handle, input.accountId)
        const newer = await handle
          .select({ id: verificationRecord.id })
          .from(verificationRecord)
          .where(
            and(
              eq(verificationRecord.account_id, input.accountId),
              eq(verificationRecord.kind, input.kind),
              gt(verificationRecord.id, input.recordId),
            ),
          )
          .limit(1)
        if (newer.length > 0) {
          return false
        }
        const updated = await handle
          .update(verificationRecord)
          .set({
            status: input.status,
            decision_reason: input.reason,
            decision_note: input.note,
            decided_at: input.at,
            decided_by: input.decidedBy,
          })
          .where(
            and(
              eq(verificationRecord.id, input.recordId),
              eq(verificationRecord.account_id, input.accountId),
              eq(verificationRecord.kind, input.kind),
              eq(verificationRecord.status, 'pending'),
            ),
          )
          .returning({ id: verificationRecord.id })
        return updated.length === 1
      }
      if (db) {
        return run(db)
      }
      return getIdentityDatabase().transaction(async (tx) => run(tx))
    },
    async holdAccount(accountId, db) {
      const handle = db ?? getIdentityDatabase()
      await handle.update(account).set({ status: HELD_STATUS }).where(eq(account.id, accountId))
      await handle.update(profile).set({ visibility: HELD_STATUS }).where(eq(profile.account_id, accountId))
    },
  }
}
