import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
import { setSmsPort } from './sms-port.js'

// Story mvp-f1: the real route with SMS_PROVIDER=aqilas, against a local stub vendor.
// Fake key and fake number only.
const KEY = 'test-key'
const PHONE = '+22600000002'
const VENDOR_BODY = 'vendor-private-detail'
const SMS_KEYS = ['SMS_PROVIDER', 'AQILAS_API_KEY', 'AQILAS_SENDER_ID', 'AQILAS_API_URL'] as const

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const otp = memoryPhoneOtpStore()

type Seen = { method: string; headers: IncomingHttpHeaders; body: string }
const seen: Seen[] = []
let vendorStatus = 201
let vendor: Server
let vendorUrl = ''
let now = new Date('2026-10-22T09:00:00.000Z')
const savedEnv: Partial<Record<(typeof SMS_KEYS)[number], string | undefined>> = {}
let output: string[] = []

describe('POST /v1/verifications/otp with SMS_PROVIDER=aqilas', () => {
  let app: INestApplication | undefined
  let base = ''
  let cookie = ''

  beforeAll(async () => {
    vendor = createServer((request, response) => {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk: string) => {
        body += chunk
      })
      request.on('end', () => {
        seen.push({ method: request.method ?? '', headers: request.headers, body })
        response.writeHead(vendorStatus, { 'content-type': 'application/json' })
        response.end(vendorStatus < 300 ? '{"bulk_id":"b-1"}' : JSON.stringify({ message: VENDOR_BODY }))
      })
    })
    await new Promise<void>((resolve) => vendor.listen(0, '127.0.0.1', resolve))
    vendorUrl = `http://127.0.0.1:${(vendor.address() as AddressInfo).port}/api/v1/sms`
    for (const key of SMS_KEYS) {
      savedEnv[key] = process.env[key]
    }
    process.env['SMS_PROVIDER'] = 'aqilas'
    process.env['AQILAS_API_KEY'] = KEY
    process.env['AQILAS_SENDER_ID'] = 'AnKanu'
    process.env['AQILAS_API_URL'] = vendorUrl

    setSmsPort(undefined)
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
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'salif@example.bf',
        password: 'phrase avec espaces',
        pseudonym: 'Salif_Bobo',
        gender: 'brother',
        pledge_accepted: true,
        civil_given_name: 'Salif',
        civil_family_name: 'Ouedraogo',
        recaptcha_token: 'test-ok',
        coc_version: 'FR-089',
        dob: '1990-01-15',
      }),
    })
    expect(created.status).toBe(201)
    const signed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'salif@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
        recaptcha_token: 'test-ok',
      }),
    })
    expect(signed.status).toBe(201)
    cookie = signed.headers.getSetCookie().join('; ')
  })

  beforeEach(() => {
    output = []
    const capture = (chunk: string | Uint8Array): boolean => {
      output.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    }
    vi.spyOn(process.stdout, 'write').mockImplementation(capture)
    vi.spyOn(process.stderr, 'write').mockImplementation(capture)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    for (const key of SMS_KEYS) {
      const value = savedEnv[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    setOtpLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    setPhoneOtpStore(undefined)
    if (app) {
      await app.close()
    }
    vendor.closeAllConnections()
    await new Promise<void>((resolve) => vendor.close(() => resolve()))
  })

  async function send(): Promise<{ status: number; text: string; json: Record<string, unknown> }> {
    const response = await fetch(`${base}/v1/verifications/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ action: 'send', phone_e164: PHONE }),
    })
    const text = await response.text()
    return { status: response.status, text, json: JSON.parse(text) as Record<string, unknown> }
  }

  function sentCode(index: number): string {
    const body = JSON.parse(seen[index]?.body ?? '{}') as { text?: string }
    const match = /votre code est (\d{6})\./.exec(body.text ?? '')
    if (!match?.[1]) {
      throw new Error('no code in the vendor request')
    }
    return match[1]
  }

  function expectNothingLeaked(texts: string[], code: string): void {
    const joined = [...texts, ...output, JSON.stringify(otp.dispatches)].join('\n')
    expect(joined).not.toContain(code)
    expect(joined).not.toContain(PHONE)
    expect(joined).not.toContain(KEY)
    expect(joined).not.toContain(VENDOR_BODY)
  }

  it('posts once to Aqilas with the stored code and answers the Story 2.7 201', async () => {
    const sent = await send()
    expect(sent.status).toBe(201)
    expect(sent.json).toEqual({ expires_at: new Date(now.getTime() + OTP_TTL_MS).toISOString() })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.method).toBe('POST')
    expect(seen[0]?.headers['x-auth-token']).toBe(KEY)
    expect(seen[0]?.headers['content-type']).toBe('application/json')
    const code = sentCode(0)
    expect(JSON.parse(seen[0]?.body ?? '')).toEqual({
      from: 'AnKanu',
      to: [PHONE],
      text: `AnKanu : votre code est ${code}. Il expire dans 10 minutes. Ne le partagez avec personne.`,
    })
    expect(otp.rows[0]?.hash).toBe(hashOtpCode(code))
    expect(otp.rows[0]?.phone_e164).toBe(PHONE)
    expect(otp.dispatches).toHaveLength(1)
    expect(Object.keys(otp.dispatches[0] ?? {}).sort()).toEqual(['account_id', 'created_at', 'id', 'template'])
    expectNothingLeaked([sent.text], code)
  })

  it.each([500, 401, 400])('rolls back and answers 503 when Aqilas answers %i', async (status) => {
    now = new Date(now.getTime() + 61_000)
    vendorStatus = status
    const before = { hash: otp.rows[0]?.hash, phone: otp.rows[0]?.phone_e164, dispatches: otp.dispatches.length }
    const calls = seen.length
    try {
      const failed = await send()
      expect(failed.status).toBe(503)
      expect(failed.json).toEqual({
        error: expect.objectContaining({
          code: 'UNHANDLED',
          message: "L'envoi du code a échoué.",
          retryable: true,
        }),
      })
      expect(seen).toHaveLength(calls + 1)
      expect(otp.rows[0]?.hash).toBe(before.hash)
      expect(otp.rows[0]?.phone_e164).toBe(before.phone)
      expect(otp.dispatches).toHaveLength(before.dispatches)
      expect(output.join('')).toContain(`sms aqilas status ${status}`)
      expectNothingLeaked([failed.text], sentCode(calls))
    } finally {
      vendorStatus = 201
    }
  })

  it('does not follow a 307 to another host and answers 503', async () => {
    now = new Date(now.getTime() + 61_000)
    const elsewhere: Seen[] = []
    const other = createServer((request, response) => {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk: string) => {
        body += chunk
      })
      request.on('end', () => {
        elsewhere.push({ method: request.method ?? '', headers: request.headers, body })
        response.writeHead(201, { 'content-type': 'application/json' })
        response.end('{"bulk_id":"elsewhere"}')
      })
    })
    await new Promise<void>((resolve) => other.listen(0, '127.0.0.1', resolve))
    const otherUrl = `http://127.0.0.1:${(other.address() as AddressInfo).port}/redirected-target`
    let redirected = 0
    const redirector = createServer((request, response) => {
      request.resume()
      request.on('end', () => {
        redirected += 1
        response.writeHead(307, { location: otherUrl, 'content-type': 'application/json' })
        response.end(JSON.stringify({ message: VENDOR_BODY }))
      })
    })
    await new Promise<void>((resolve) => redirector.listen(0, '127.0.0.1', resolve))
    const before = { hash: otp.rows[0]?.hash, phone: otp.rows[0]?.phone_e164, dispatches: otp.dispatches.length }
    process.env['AQILAS_API_URL'] = `http://127.0.0.1:${(redirector.address() as AddressInfo).port}/api/v1/sms`
    try {
      const failed = await send()
      expect(failed.status).toBe(503)
      expect(failed.json).toMatchObject({
        error: { code: 'UNHANDLED', message: "L'envoi du code a échoué.", retryable: true },
      })
      expect(redirected).toBe(1)
      expect(elsewhere).toEqual([])
      expect(otp.rows[0]?.hash).toBe(before.hash)
      expect(otp.rows[0]?.phone_e164).toBe(before.phone)
      expect(otp.dispatches).toHaveLength(before.dispatches)
      expect(output.join('')).toContain('sms aqilas status 307')
      const joined = [failed.text, ...output].join('\n')
      expect(joined).not.toContain(PHONE)
      expect(joined).not.toContain(KEY)
      expect(joined).not.toContain(VENDOR_BODY)
    } finally {
      process.env['AQILAS_API_URL'] = vendorUrl
      for (const server of [other, redirector]) {
        server.closeAllConnections()
        await new Promise<void>((resolve) => server.close(() => resolve()))
      }
    }
  })

  it('rolls back and answers 503 when the network fails', async () => {
    now = new Date(now.getTime() + 61_000)
    const before = { hash: otp.rows[0]?.hash, phone: otp.rows[0]?.phone_e164, dispatches: otp.dispatches.length }
    process.env['AQILAS_API_URL'] = 'http://127.0.0.1:9/api/v1/sms'
    try {
      const failed = await send()
      expect(failed.status).toBe(503)
      expect(failed.json).toMatchObject({
        error: { code: 'UNHANDLED', message: "L'envoi du code a échoué.", retryable: true },
      })
      expect(otp.rows[0]?.hash).toBe(before.hash)
      expect(otp.rows[0]?.phone_e164).toBe(before.phone)
      expect(otp.dispatches).toHaveLength(before.dispatches)
      expect(output.join('')).toContain('sms aqilas network error')
      const joined = [failed.text, ...output].join('\n')
      expect(joined).not.toContain(PHONE)
      expect(joined).not.toContain(KEY)
    } finally {
      process.env['AQILAS_API_URL'] = vendorUrl
    }
  })
})
