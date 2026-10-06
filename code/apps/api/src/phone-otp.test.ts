import { createHash } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { setOtpLimitReader } from './otp-limit.js'
import { hashOtpCode, OTP_TTL_MS } from './phone-otp.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { setSmsPort, type OtpLog, type SmsPort } from './sms-port.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const otp = memoryPhoneOtpStore()
const logged: OtpLog[] = []
let failSend = false
const port: SmsPort = {
  async sendOtp(message) {
    if (failSend) {
      throw new Error('log failed')
    }
    logged.push(message)
  },
}

let now = new Date('2026-10-05T12:00:00.000Z')
const phone = '+22670123484'

function accountBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'aminata@example.bf',
    password: 'phrase avec espaces',
    pseudonym: 'Aminata_Ouaga',
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    dob: '1990-01-15',
    ...overrides,
  }
}

describe('POST /v1/verifications/otp', () => {
  let app: INestApplication | undefined
  let base: string
  let cookie = ''

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    setOtpLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    pins.rows.length = 0
    resetPinEntries()
    setPinLockStore(pins)
    setPhoneOtpStore(otp)
    setSmsPort(port)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody()),
    })
    expect(created.status).toBe(201)
    const signed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'aminata@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    expect(signed.status).toBe(201)
    cookie = signed.headers.getSetCookie().join('; ')
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    setOtpLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    setPhoneOtpStore(undefined)
    setSmsPort(undefined)
    failSend = false
    if (app) {
      await app.close()
    }
  })

  async function post(body: unknown, withCookie = true): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${base}/v1/verifications/otp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(withCookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    })
    const json = (await response.json()) as Record<string, unknown>
    return { status: response.status, json }
  }

  it('requires a session and refuses an unknown action or a phone that is not E.164', async () => {
    const anonymous = await post({ action: 'send', phone_e164: phone }, false)
    expect(anonymous.status).toBe(401)
    expect(anonymous.json).toMatchObject({ error: { code: 'UNAUTHENTICATED', retryable: false } })

    const unknown = await post({ action: 'mint' })
    expect(unknown.status).toBe(400)
    expect(unknown.json).toMatchObject({ error: { code: 'UNHANDLED' } })

    const spaced = await post({ action: 'send', phone_e164: '+226 70 12 34 84' })
    expect(spaced.status).toBe(400)
    expect(spaced.json).toMatchObject({ error: { code: 'UNHANDLED', details: { field: 'phone_e164' } } })
    expect(otp.rows).toHaveLength(0)
    expect(otp.dispatches).toHaveLength(0)
    expect(logged).toHaveLength(0)
  })

  it('sends a hashed code, stores template and ids, and leaves visibility unset', async () => {
    const sent = await post({ action: 'send', phone_e164: phone })
    expect(sent.status).toBe(201)
    const expires = new Date(now.getTime() + OTP_TTL_MS).toISOString()
    expect(sent.json).toEqual({ expires_at: expires })
    expect(JSON.stringify(sent.json)).not.toContain(logged[0]?.code ?? 'missing')
    expect(logged).toHaveLength(1)
    expect(logged[0]?.code).toMatch(/^\d{6}$/)
    expect(otp.rows).toHaveLength(1)
    expect(otp.rows[0]).toMatchObject({
      kind: 'phone_otp',
      status: 'pending',
      phone_e164: phone,
      vendor: null,
      evidence_uri: null,
      hash: hashOtpCode(logged[0]?.code ?? ''),
    })
    expect(otp.dispatches).toEqual([
      expect.objectContaining({ account_id: memory.accounts[0]?.id, template: 'OTP', created_at: now }),
    ])
    expect(Object.keys(otp.dispatches[0] ?? {}).sort()).toEqual(['account_id', 'created_at', 'id', 'template'])
    expect(memory.profiles[0]?.visibility).toBeNull()
  })

  it('sends nothing inside 60 seconds and keeps the same expiry', async () => {
    now = new Date(now.getTime() + 30_000)
    const again = await post({ action: 'send', phone_e164: '+22670999999' })
    expect(again.status).toBe(200)
    expect(again.json).toEqual({ expires_at: new Date(new Date('2026-10-05T12:00:00.000Z').getTime() + OTP_TTL_MS).toISOString() })
    expect(logged).toHaveLength(1)
    expect(otp.dispatches).toHaveLength(1)
    expect(otp.rows[0]?.phone_e164).toBe(phone)
    expect(otp.rows[0]?.status).toBe('pending')
  })

  it('replaces the pending hash on resend so the older code fails', async () => {
    now = new Date('2026-10-05T12:02:00.000Z')
    const sent = await post({ action: 'send', phone_e164: phone })
    expect(sent.status).toBe(201)
    expect(logged).toHaveLength(2)
    expect(otp.rows[0]?.status).toBe('pending')
    expect(otp.rows[0]?.hash).toBe(hashOtpCode(logged[1]?.code ?? ''))
    const old = await post({ action: 'verify', code: logged[0]?.code })
    expect(old.status).toBe(400)
    expect(old.json).toMatchObject({ error: { code: 'OTP_INVALID' } })
    expect(otp.rows[0]?.status).toBe('pending')
  })

  it('refuses a wrong code and grants a correct unexpired code without listing the profile', async () => {
    const wrong = await post({ action: 'verify', code: '000000' })
    expect(wrong.status).toBe(400)
    expect(wrong.json).toMatchObject({ error: { code: 'OTP_INVALID', retryable: false } })
    expect(otp.rows[0]?.status).toBe('pending')

    const granted = await post({ action: 'verify', code: logged[1]?.code })
    expect(granted.status).toBe(200)
    expect(granted.json).toEqual({ status: 'granted' })
    expect(otp.rows[0]?.status).toBe('granted')
    expect(memory.profiles[0]?.visibility).toBeNull()

    const replay = await post({ action: 'verify', code: logged[1]?.code })
    expect(replay.status).toBe(200)
    expect(replay.json).toEqual({ status: 'granted' })
  })

  it('does not clear a granted phone when send is posted again', async () => {
    const beforeHash = otp.rows[0]?.hash
    const beforeLogs = logged.length
    const beforeDispatches = otp.dispatches.length
    now = new Date('2026-10-05T12:04:00.000Z')
    const again = await post({ action: 'send', phone_e164: '+22670999999' })
    expect(again.status).toBe(200)
    expect(again.json).toEqual({ expires_at: '2026-10-05T12:12:00.000Z' })
    expect(otp.rows[0]?.status).toBe('granted')
    expect(otp.rows[0]?.hash).toBe(beforeHash)
    expect(otp.rows[0]?.phone_e164).toBe(phone)
    expect(logged).toHaveLength(beforeLogs)
    expect(otp.dispatches).toHaveLength(beforeDispatches)
  })

  it('does not grant an expired code', async () => {
    now = new Date('2026-10-05T12:12:00.001Z')
    const expired = await post({ action: 'verify', code: logged[1]?.code })
    expect(expired.status).toBe(400)
    expect(expired.json).toMatchObject({ error: { code: 'OTP_INVALID' } })
    expect(otp.rows[0]?.status).toBe('granted')
    expect(memory.profiles[0]?.visibility).toBeNull()
  })

  it('returns the existing expiry when a granted phone is at the hourly cap', async () => {
    const beforeLogs = logged.length
    const beforeRows = otp.dispatches.length
    const beforeHash = otp.rows[0]?.hash
    const beforePhone = otp.rows[0]?.phone_e164
    const beforeExpires = otp.rows[0]?.expires_at
    setOtpLimitReader(async () => beforeRows)
    try {
      now = new Date(now.getTime() + 61_000)
      const capped = await post({ action: 'send', phone_e164: phone })
      expect(capped.status).toBe(200)
      expect(capped.json).toEqual({ expires_at: '2026-10-05T12:12:00.000Z' })
      expect(otp.rows[0]?.status).toBe('granted')
      expect(otp.rows[0]?.hash).toBe(beforeHash)
      expect(otp.rows[0]?.phone_e164).toBe(phone)
      expect(logged).toHaveLength(beforeLogs)
      expect(otp.dispatches).toHaveLength(beforeRows)
      if (otp.rows[0]) {
        otp.rows[0].status = 'pending'
      }
      const limited = await post({ action: 'send', phone_e164: phone })
      expect(limited.status).toBe(429)
      expect(limited.json).toMatchObject({ error: { code: 'RATE_LIMITED', retryable: false } })
      expect(logged).toHaveLength(beforeLogs)
      expect(otp.dispatches).toHaveLength(beforeRows)
      expect(otp.rows[0]?.status).toBe('pending')
      expect(otp.rows[0]?.hash).toBe(beforeHash)
      expect(otp.rows[0]?.phone_e164).toBe(beforePhone)
      expect(otp.rows[0]?.expires_at).toBe(beforeExpires)
    } finally {
      setOtpLimitReader(async () => 100)
    }
  })

  it('leaves no live code when the log write fails', async () => {
    failSend = true
    if (otp.rows[0]) {
      otp.rows[0].status = 'pending'
    }
    const hashBefore = otp.rows[0]?.hash
    const failed = await post({ action: 'send', phone_e164: '+33612345678' })
    expect(failed.status).toBe(503)
    expect(failed.json).toMatchObject({ error: { code: 'UNHANDLED', retryable: true } })
    expect(otp.rows[0]?.hash).toBe(hashBefore)
    expect(otp.rows[0]?.phone_e164).toBe(phone)
    expect(otp.dispatches).toHaveLength(2)
    failSend = false
    expect(createHash('sha256').update('000000', 'utf8').digest('hex')).not.toBe(hashBefore)
  })

  it('does not describe a store failure as a failed SMS send', async () => {
    setPhoneOtpStore({
      async issue() {
        throw new Error('insert failed')
      },
      async grant() {
        return 'invalid'
      },
    })
    try {
      const failed = await post({ action: 'send', phone_e164: '+22670111222' })
      expect(failed.status).toBe(500)
      expect(failed.json).toMatchObject({ error: { code: 'UNHANDLED', message: 'Request failed' } })
      expect(JSON.stringify(failed.json)).not.toContain("L'envoi du code a échoué.")
    } finally {
      setPhoneOtpStore(otp)
    }
  })
})
