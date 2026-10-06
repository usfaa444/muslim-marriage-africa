import { and, eq, gt, gte, ne, sql } from 'drizzle-orm'
import { newId } from '@ankanu/kernel'
import { account, smsDispatch, verificationRecord } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { OTP_HOUR_MS, OTP_TEMPLATE, gateOtpSend } from './phone-otp.js'

export type PhoneOtpRow = {
  id: string
  account_id: string
  kind: 'phone_otp'
  status: 'pending' | 'granted' | 'rejected' | 'held'
  vendor: string | null
  evidence_uri: string | null
  phone_e164: string | null
  hash: string | null
  expires_at: Date | null
}

export type SmsDispatchRow = {
  id: string
  account_id: string
  template: typeof OTP_TEMPLATE
  created_at: Date
}

export type OtpIssueResult =
  | { result: 'sent'; expires_at: Date }
  | { result: 'cooldown'; expires_at: Date }
  | { result: 'unchanged'; expires_at: Date }
  | { result: 'rate_limited' }
  | { result: 'delivery_failed' }

export type PhoneOtpStore = {
  issue(input: {
    accountId: string
    phone: string
    hash: string
    now: Date
    expiresAt: Date
    limit: number
    waitMs: number
    log: () => Promise<void>
  }): Promise<OtpIssueResult>
  grant(input: { accountId: string; hash: string; now: Date }): Promise<'granted' | 'invalid'>
}

class OtpDeliveryFailed extends Error {
  constructor() {
    super('otp delivery failed')
    this.name = 'OtpDeliveryFailed'
  }
}

let override: PhoneOtpStore | undefined

export function setPhoneOtpStore(store: PhoneOtpStore | undefined): void {
  override = store
}

export function getPhoneOtpStore(): PhoneOtpStore {
  if (override) {
    return override
  }
  return postgresPhoneOtpStore()
}

function asDate(value: Date | string | null): Date | null {
  if (value === null) {
    return null
  }
  return value instanceof Date ? value : new Date(value)
}

function currentRow(rows: PhoneOtpRow[]): PhoneOtpRow | undefined {
  return rows.find((row) => row.status === 'pending') ?? rows[0]
}

function postgresPhoneOtpStore(): PhoneOtpStore {
  return {
    async issue(input) {
      const database = getIdentityDatabase()
      try {
        return await database.transaction(async (tx) => {
          await tx.execute(sql`select ${account.id} from ${account} where ${account.id} = ${input.accountId} for update`)
          const stored = await tx
            .select()
            .from(verificationRecord)
            .where(and(eq(verificationRecord.account_id, input.accountId), eq(verificationRecord.kind, 'phone_otp')))
          const rows = stored.map(toRow)
          const row = currentRow(rows)
          if (row && row.status === 'granted') {
            return { result: 'unchanged' as const, expires_at: row.expires_at ?? input.now }
          }
          const hourStart = new Date(input.now.getTime() - OTP_HOUR_MS)
          const dispatches = await tx
            .select({ created_at: smsDispatch.created_at })
            .from(smsDispatch)
            .where(
              and(
                eq(smsDispatch.account_id, input.accountId),
                eq(smsDispatch.template, OTP_TEMPLATE),
                gte(smsDispatch.created_at, hourStart),
              ),
            )
          const gate = gateOtpSend({
            dispatches: dispatches.map((item) => ({ created_at: asDate(item.created_at) ?? new Date(0) })),
            expiresAt: row?.expires_at ?? null,
            now: input.now,
            limit: input.limit,
            waitMs: input.waitMs,
          })
          if (gate.result !== 'ready') {
            return gate
          }
          if (row) {
            const updated = await tx
              .update(verificationRecord)
              .set({
                status: 'pending',
                phone_e164: input.phone,
                hash: input.hash,
                expires_at: input.expiresAt,
                vendor: null,
                evidence_uri: null,
              })
              .where(and(eq(verificationRecord.id, row.id), ne(verificationRecord.status, 'granted')))
              .returning({ id: verificationRecord.id })
            if (updated.length === 0) {
              return { result: 'unchanged' as const, expires_at: row.expires_at ?? input.now }
            }
          } else {
            await tx.insert(verificationRecord).values({
              id: newId(input.now),
              account_id: input.accountId,
              kind: 'phone_otp',
              status: 'pending',
              vendor: null,
              evidence_uri: null,
              phone_e164: input.phone,
              hash: input.hash,
              expires_at: input.expiresAt,
            })
          }
          await tx.insert(smsDispatch).values({
            id: newId(input.now),
            account_id: input.accountId,
            template: OTP_TEMPLATE,
            created_at: input.now,
          })
          try {
            await input.log()
          } catch {
            throw new OtpDeliveryFailed()
          }
          return { result: 'sent' as const, expires_at: input.expiresAt }
        })
      } catch (error) {
        if (error instanceof OtpDeliveryFailed) {
          return { result: 'delivery_failed' }
        }
        throw error
      }
    },
    async grant(input) {
      const database = getIdentityDatabase()
      return database.transaction(async (tx) => {
        const stored = await tx
          .select()
          .from(verificationRecord)
          .where(and(eq(verificationRecord.account_id, input.accountId), eq(verificationRecord.kind, 'phone_otp')))
        const row = currentRow(stored.map(toRow))
        if (!row || row.hash !== input.hash || row.expires_at === null || row.expires_at.getTime() <= input.now.getTime()) {
          return 'invalid' as const
        }
        if (row.status !== 'pending' && row.status !== 'granted') {
          return 'invalid' as const
        }
        if (row.status === 'pending') {
          const updated = await tx
            .update(verificationRecord)
            .set({ status: 'granted' })
            .where(
              and(
                eq(verificationRecord.id, row.id),
                eq(verificationRecord.status, 'pending'),
                eq(verificationRecord.hash, input.hash),
                gt(verificationRecord.expires_at, input.now),
              ),
            )
            .returning({ id: verificationRecord.id })
          if (updated.length === 0) {
            return 'invalid' as const
          }
        }
        return 'granted' as const
      })
    },
  }
}

function toRow(row: {
  id: string
  account_id: string
  kind: string
  status: string
  vendor: string | null
  evidence_uri: string | null
  phone_e164: string | null
  hash: string | null
  expires_at: Date | string | null
}): PhoneOtpRow {
  return {
    id: row.id,
    account_id: row.account_id,
    kind: 'phone_otp',
    status: row.status as PhoneOtpRow['status'],
    vendor: row.vendor,
    evidence_uri: row.evidence_uri,
    phone_e164: row.phone_e164,
    hash: row.hash,
    expires_at: asDate(row.expires_at),
  }
}

/** In-memory rows for unit tests. Dispatch rows store template and ids only. */
export function memoryPhoneOtpStore(): PhoneOtpStore & { rows: PhoneOtpRow[]; dispatches: SmsDispatchRow[] } {
  const rows: PhoneOtpRow[] = []
  const dispatches: SmsDispatchRow[] = []
  return {
    rows,
    dispatches,
    async issue(input) {
      const mine = rows.filter((row) => row.account_id === input.accountId && row.kind === 'phone_otp')
      const row = currentRow(mine)
      if (row && row.status === 'granted') {
        return { result: 'unchanged' as const, expires_at: row.expires_at ?? input.now }
      }
      const recent = dispatches.filter(
        (item) =>
          item.account_id === input.accountId &&
          item.template === OTP_TEMPLATE &&
          item.created_at.getTime() >= input.now.getTime() - OTP_HOUR_MS,
      )
      const gate = gateOtpSend({
        dispatches: recent,
        expiresAt: row?.expires_at ?? null,
        now: input.now,
        limit: input.limit,
        waitMs: input.waitMs,
      })
      if (gate.result !== 'ready') {
        return gate
      }
      const prior = row
        ? {
            status: row.status,
            phone_e164: row.phone_e164,
            hash: row.hash,
            expires_at: row.expires_at,
            vendor: row.vendor,
            evidence_uri: row.evidence_uri,
          }
        : null
      let created: PhoneOtpRow | null = null
      if (row) {
        row.status = 'pending'
        row.phone_e164 = input.phone
        row.hash = input.hash
        row.expires_at = input.expiresAt
        row.vendor = null
        row.evidence_uri = null
      } else {
        created = {
          id: newId(input.now),
          account_id: input.accountId,
          kind: 'phone_otp',
          status: 'pending',
          vendor: null,
          evidence_uri: null,
          phone_e164: input.phone,
          hash: input.hash,
          expires_at: input.expiresAt,
        }
        rows.push(created)
      }
      const dispatch: SmsDispatchRow = {
        id: newId(input.now),
        account_id: input.accountId,
        template: OTP_TEMPLATE,
        created_at: input.now,
      }
      dispatches.push(dispatch)
      try {
        await input.log()
      } catch {
        if (prior && row) {
          row.status = prior.status
          row.phone_e164 = prior.phone_e164
          row.hash = prior.hash
          row.expires_at = prior.expires_at
          row.vendor = prior.vendor
          row.evidence_uri = prior.evidence_uri
        } else if (created) {
          const index = rows.lastIndexOf(created)
          if (index >= 0) {
            rows.splice(index, 1)
          }
        }
        const dispatchIndex = dispatches.lastIndexOf(dispatch)
        if (dispatchIndex >= 0) {
          dispatches.splice(dispatchIndex, 1)
        }
        return { result: 'delivery_failed' }
      }
      return { result: 'sent', expires_at: input.expiresAt }
    },
    async grant(input) {
      const mine = rows.filter((row) => row.account_id === input.accountId && row.kind === 'phone_otp')
      const row = currentRow(mine)
      if (!row || row.hash !== input.hash || row.expires_at === null || row.expires_at.getTime() <= input.now.getTime()) {
        return 'invalid'
      }
      if (row.status !== 'pending' && row.status !== 'granted') {
        return 'invalid'
      }
      row.status = 'granted'
      return 'granted'
    },
  }
}
