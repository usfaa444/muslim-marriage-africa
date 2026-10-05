import type { AddressInfo } from 'node:net'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { previousAuditHash } from './audit-port.js'
import { chainHash, memoryRightsStore, setRightsStore, THIRTY_DAYS_MS, SEVENTY_TWO_HOURS_MS, AUDIT_ZERO_HASH } from './cil-rights.js'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { ACTIVE_STATUS, PENDING_DELETION_STATUS } from './create-account.js'
import { createApp } from './create-app.js'
import { memoryLifePauseStore, setLifePauseStore } from './life-pause-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { uuidV7Instant } from '@ankanu/kernel'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const verifications: Array<{
  account_id: string
  kind: string
  status: string
  vendor: string | null
  phone_e164: string | null
  expires_at: string | null
}> = []
const sms: Array<{ account_id: string; template: string; created_at: string }> = []
const rights = memoryRightsStore({
  accounts: memory.accounts,
  credentials: memory.credentials,
  profiles: memory.profiles,
  sessions: sessions.sessions,
  pins: pins.rows,
  verifications,
  sms,
})
let now = new Date('2026-10-05T10:00:00.000Z')
let serial = 0

function accountBody(): Record<string, unknown> {
  serial += 1
  return {
    email: `cil${serial}@example.bf`,
    password: 'phrase avec espaces',
    pseudonym: `Cil_${serial}`,
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    dob: '1990-01-15',
  }
}

describe('self-serve delete and export', () => {
  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setLifePauseStore(memoryLifePauseStore(memory.accounts))
    pins.rows.length = 0
    resetPinEntries()
    setPinLockStore(pins)
    setRightsStore(rights)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setLifePauseStore(undefined)
    setPinLockStore(undefined)
    setRightsStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  async function createAccount(): Promise<{ id: string; email: string }> {
    const body = accountBody()
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(response.status).toBe(201)
    const created = (await response.json()) as { id: string }
    return { id: created.id, email: String(body.email) }
  }

  async function signIn(email: string): Promise<string> {
    const response = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'phrase avec espaces', remember_me: false }),
    })
    expect(response.status).toBe(201)
    const cookie = response.headers.getSetCookie().join('\n')
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie)
    expect(match?.[1]).toBeTruthy()
    return `${SESSION_COOKIE}=${match?.[1] ?? ''}`
  }

  function post(path: string, cookie: string, body?: unknown) {
    const init: RequestInit = {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
    }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }
    return fetch(`${base}${path}`, init)
  }

  it('chains the audit hash and keeps the migration append-only', () => {
    const payload = { ticket_id: 'abc', kind: 'erase' }
    const hash = chainHash(AUDIT_ZERO_HASH, 'id-1', 'actor', 'cil_ticket.opened', payload)
    expect(hash).toHaveLength(64)
    expect(chainHash(AUDIT_ZERO_HASH, 'id-1', null, 'cil_ticket.opened', payload)).not.toBe(hash)
    const sql = readFileSync(fileURLToPath(new URL('../drizzle/0009_cil_ticket.sql', import.meta.url)), 'utf8')
    expect(sql).toContain("CHECK (\"cil_ticket\".\"kind\" in ('export', 'erase', 'access'))")
    expect(sql).toContain('pending_deletion')
    expect(sql).toContain('audit_event_append_only')
    expect(sql).toContain("BEFORE UPDATE OR DELETE")
    const earlier = { hash: 'a'.repeat(64), prev_hash: AUDIT_ZERO_HASH }
    const later = { hash: 'b'.repeat(64), prev_hash: earlier.hash }
    expect(previousAuditHash([later, earlier])).toBe(later.hash)
    const identity = readFileSync(fileURLToPath(new URL('./cil-rights.ts', import.meta.url)), 'utf8')
    expect(identity).not.toContain('insert(cilTicket)')
    expect(identity).not.toContain('update(cilTicket)')
    expect(identity).not.toContain('insert(auditEvent)')
    expect(identity).toContain('openCilTicket')
    expect(identity).toContain('listCilTickets')
    expect(identity).toContain('markCilTicketStalled')
    expect(identity).toContain('.append(')
  })

  it('schedules erasure, returns the same ticket again, and still allows sign-in', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const profile = memory.profiles.find((row) => row.account_id === created.id)
    expect(profile?.visibility).toBeNull()
    const denied = await post('/v1/me/delete', cookie, { confirm: false })
    expect(denied.status).toBe(400)
    const deleted = await post('/v1/me/delete', cookie, { confirm: true })
    expect(deleted.status).toBe(200)
    const body = (await deleted.json()) as {
      account_status: string
      ticket: { id: string; kind: string; status: string; due_at: string; status_url: string; download_url: null }
    }
    expect(body.account_status).toBe(PENDING_DELETION_STATUS)
    expect(body.ticket.kind).toBe('erase')
    expect(body.ticket.status).toBe('scheduled')
    expect(body.ticket.status_url).toBe(`/privacy/status/${body.ticket.id}`)
    expect(body.ticket.download_url).toBeNull()
    const requested = uuidV7Instant(body.ticket.id).getTime()
    expect(new Date(body.ticket.due_at).getTime() - requested).toBe(THIRTY_DAYS_MS)
    const again = await post('/v1/me/delete', cookie, { confirm: true })
    const second = (await again.json()) as { ticket: { id: string } }
    expect(second.ticket.id).toBe(body.ticket.id)
    expect(rights.audits.filter((row) => row.action === 'cil_ticket.opened' && row.payload.ticket_id === body.ticket.id)).toHaveLength(1)
    expect(profile?.visibility).toBeNull()
    expect(memory.accounts.find((row) => row.id === created.id)?.status).toBe(PENDING_DELETION_STATUS)
    const pause = await post('/v1/me/deactivate', cookie, { reason: 'ramadan' })
    expect(pause.status).toBe(403)
    const pauseBody = (await pause.json()) as { error: { code: string; details: { status: string } } }
    expect(pauseBody.error.code).toBe('FORBIDDEN')
    expect(pauseBody.error.details).toEqual({ status: 'pending_deletion' })
    const reactivate = await post('/v1/me/reactivate', cookie, undefined)
    expect(reactivate.status).toBe(403)
    const still = await signIn(created.email)
    const status = await fetch(`${base}/v1/me/export-status`, { headers: { cookie: still } })
    expect(status.status).toBe(200)
    const listed = (await status.json()) as { account_status: string; tickets: Array<{ id: string }> }
    expect(listed.account_status).toBe(PENDING_DELETION_STATUS)
    expect(listed.tickets[0]?.id).toBe(body.ticket.id)
    const open = await fetch(`${base}/v1/me/export-status`, { headers: { cookie } })
    expect(open.status).toBe(200)
  })

  it('opens one ready export, downloads it once into the audit chain, and stalls a failed build', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    verifications.push({
      account_id: created.id,
      kind: 'phone_otp',
      status: 'granted',
      vendor: null,
      phone_e164: '+22670000000',
      expires_at: null,
    })
    sms.push({ account_id: created.id, template: 'otp', created_at: '2026-10-05T10:00:00.000Z' })
    const missing = await fetch(`${base}/v1/me/export`, { headers: { cookie } })
    expect(missing.status).toBe(409)
    const opened = await post('/v1/me/export', cookie, {})
    expect(opened.status).toBe(200)
    const first = (await opened.json()) as { ticket: { id: string; kind: string; status: string; due_at: string; download_url: string } }
    expect(first.ticket.kind).toBe('export')
    expect(first.ticket.status).toBe('ready')
    expect(first.ticket.download_url).toBe('/v1/me/export')
    const requested = uuidV7Instant(first.ticket.id).getTime()
    expect(new Date(first.ticket.due_at).getTime() - requested).toBe(SEVENTY_TWO_HOURS_MS)
    const repeat = await post('/v1/me/export', cookie, {})
    const second = (await repeat.json()) as { ticket: { id: string } }
    expect(second.ticket.id).toBe(first.ticket.id)
    const file = await fetch(`${base}/v1/me/export`, { headers: { cookie } })
    expect(file.status).toBe(200)
    expect(file.headers.get('content-type')).toContain('application/json')
    expect(file.headers.get('content-disposition')).toBe(`attachment; filename="ankanu-export-${first.ticket.id}.json"`)
    expect(file.headers.get('cache-control')).toBe('no-store')
    const body = (await file.json()) as {
      format: string
      ticket_id: string
      credential: Array<{ kind: string; secret_hash?: string }>
      pin_lock: { pin_set: boolean }
      verification_record: Array<{ phone_e164: string; hash?: string }>
      sms_dispatch: Array<{ template: string }>
      profile: { dob: string; visibility: string | null }
      session: Array<{ id?: string; kind: string }>
    }
    expect(body.format).toBe('ankanu-export-v1')
    expect(body.ticket_id).toBe(first.ticket.id)
    expect(body.credential[0]?.kind).toBe('password')
    expect(body.credential[0]?.secret_hash).toBeUndefined()
    expect(body.pin_lock).toEqual({ pin_set: false })
    expect(body.verification_record[0]?.phone_e164).toBe('+22670000000')
    expect(body.verification_record[0]?.hash).toBeUndefined()
    expect(body.sms_dispatch).toEqual([{ template: 'otp', created_at: '2026-10-05T10:00:00.000Z' }])
    expect(body.profile.dob).toBe('1990-01-15')
    expect(body.profile.visibility).toBeNull()
    expect(body.session[0]?.id).toBeUndefined()
    expect(body.session[0]?.kind).toBe('web')
    expect(rights.audits.filter((row) => row.action === 'subject_access_export' && row.payload.ticket_id === first.ticket.id)).toHaveLength(1)
    expect(memory.accounts.find((row) => row.id === created.id)?.status).toBe(ACTIVE_STATUS)
    rights.flags.failExport = true
    const failed = await fetch(`${base}/v1/me/export`, { headers: { cookie } })
    rights.flags.failExport = false
    expect(failed.status).toBe(503)
    const failedBody = (await failed.json()) as { error: { code: string; retryable: boolean } }
    expect(failedBody.error.code).toBe('EXPORT_FAILED')
    expect(failedBody.error.retryable).toBe(false)
    const stalled = rights.tickets.find((row) => row.id === first.ticket.id)
    expect(stalled?.status).toBe('stalled')
  })

  it('does not stall a ready export when the audit append fails after the file is built', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const opened = await post('/v1/me/export', cookie, {})
    const body = (await opened.json()) as { ticket: { id: string } }
    rights.flags.failAudit = true
    const failed = await fetch(`${base}/v1/me/export`, { headers: { cookie } })
    rights.flags.failAudit = false
    expect(failed.status).not.toBe(409)
    expect(failed.status).not.toBe(503)
    expect(rights.tickets.find((row) => row.id === body.ticket.id)?.status).toBe('ready')
    rights.flags.failExport = true
    rights.flags.failStall = true
    const stalled = await fetch(`${base}/v1/me/export`, { headers: { cookie } })
    rights.flags.failExport = false
    rights.flags.failStall = false
    expect(stalled.status).toBe(503)
    expect(rights.tickets.find((row) => row.id === body.ticket.id)?.status).toBe('ready')
  })
})
