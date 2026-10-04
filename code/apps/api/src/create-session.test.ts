import type { AddressInfo } from 'node:net'
import { HttpException, type INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { assertAuthContext, isUuidV7 } from '@ankanu/kernel'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { clientIp, rejectIfAuthRateLimited } from './auth-guard.js'
import { readRlAuthPerMin, setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow, takeAuthSlot } from './auth-rate.js'
import { createApp } from './create-app.js'
import { resolveWebSession } from './create-session.js'
import { FOURTEEN_DAYS_MS, SESSION_COOKIE, TWELVE_HOURS_MS } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
let now = new Date('2026-10-04T12:00:00.000Z')

function accountBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'fatim@example.bf',
    password: 'phrase avec espaces',
    pseudonym: 'Fatim_Ouaga',
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    ...overrides,
  }
}

describe('POST /v1/sessions', () => {
  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
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
    if (app) {
      await app.close()
    }
  })

  async function createAccount(overrides: Record<string, unknown> = {}): Promise<void> {
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody(overrides)),
    })
    expect(response.status).toBe(201)
  }

  it('opens a web session for the email, with a browser session cookie when remember-me is off', async () => {
    await createAccount()
    const before = sessions.sessions.length
    const response = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Fatim@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    const body = (await response.json()) as Record<string, unknown>
    const cookie = response.headers.getSetCookie().join('\n')

    expect(response.status).toBe(201)
    expect(Object.keys(body).sort()).toEqual(['expires_at', 'id', 'kind'])
    expect(body.kind).toBe('web')
    expect(isUuidV7(String(body.id))).toBe(true)
    expect(body.expires_at).toBe(new Date(now.getTime() + TWELVE_HOURS_MS).toISOString())
    expect(cookie).toContain(`${SESSION_COOKIE}=${String(body.id)}`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).not.toMatch(/Max-Age/i)
    expect(cookie).not.toMatch(/Expires=/i)
    expect(sessions.sessions).toHaveLength(before + 1)
    expect(sessions.sessions.at(-1)?.kind).toBe('web')
    expect(sessions.sessions.at(-1)).not.toHaveProperty('gender')

    const context = await resolveWebSession(String(body.id))
    expect(context?.gender).toBe('sister')
    expect(context?.accountId).toBe(memory.accounts[0]?.id)
    expect(assertAuthContext(context).roles).toEqual(['member'])
  })

  it('slides remember-me for 14 days and leaves remember-me off fixed', async () => {
    const remembered = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Fatim_Ouaga',
        password: 'phrase avec espaces',
        remember_me: true,
      }),
    })
    const rememberedBody = (await remembered.json()) as { id: string; expires_at: string }
    expect(remembered.status).toBe(201)
    expect(rememberedBody.expires_at).toBe(new Date(now.getTime() + FOURTEEN_DAYS_MS).toISOString())
    expect(remembered.headers.getSetCookie().join('\n')).toContain('Max-Age=1209600')
    expect(remembered.headers.getSetCookie().join('\n')).not.toMatch(/Expires=/i)

    const missedCase = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim_ouaga',
        password: 'phrase avec espaces',
        remember_me: true,
      }),
    })
    expect(missedCase.status).toBe(401)

    const padded = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: '  Fatim@example.bf  ',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    expect(padded.status).toBe(201)

    const oversized = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim@example.bf',
        password: 'x'.repeat(129),
        remember_me: false,
      }),
    })
    const oversizedBody = (await oversized.json()) as { error: { code: string } }
    expect(oversized.status).toBe(401)
    expect(oversizedBody.error.code).toBe('UNAUTHENTICATED')

    const started = now
    now = new Date(started.getTime() + 24 * 60 * 60 * 1000)
    const offId = sessions.sessions.find((row) => row.expires_at.getTime() - row.last_seen_at.getTime() === TWELVE_HOURS_MS)?.id
    const onId = rememberedBody.id
    expect(offId).toBeTruthy()

    const offHealth = await fetch(`${base}/v1/health`, { headers: { cookie: `${SESSION_COOKIE}=${offId ?? ''}` } })
    expect(offHealth.status).toBe(200)
    expect(offHealth.headers.getSetCookie()).toEqual([])
    const offRow = sessions.sessions.find((row) => row.id === offId)
    expect(offRow?.expires_at.toISOString()).toBe(new Date(started.getTime() + TWELVE_HOURS_MS).toISOString())

    const onHealth = await fetch(`${base}/v1/health`, { headers: { cookie: `${SESSION_COOKIE}=${onId}` } })
    expect(onHealth.headers.getSetCookie().join('\n')).toContain('Max-Age=1209600')
    const onRow = sessions.sessions.find((row) => row.id === onId)
    expect(onRow?.last_seen_at.toISOString()).toBe(now.toISOString())
    expect(onRow?.expires_at.toISOString()).toBe(new Date(now.getTime() + FOURTEEN_DAYS_MS).toISOString())

    now = new Date(now.getTime() + FOURTEEN_DAYS_MS + 1)
    expect(await resolveWebSession(onId)).toBeNull()
    now = started
  })

  it('uses one code for an unknown identifier and a bad password, and stores nothing', async () => {
    const before = sessions.sessions.length
    const unknown = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'absent@example.bf', password: 'phrase avec espaces', remember_me: false }),
    })
    const bad = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'fatim@example.bf', password: 'pas le bon mot', remember_me: false }),
    })
    const unknownBody = (await unknown.json()) as { error: { code: string; message: string } }
    const badBody = (await bad.json()) as { error: { code: string; message: string } }
    expect(unknown.status).toBe(401)
    expect(bad.status).toBe(401)
    expect(unknownBody.error.code).toBe('UNAUTHENTICATED')
    expect(badBody.error.code).toBe('UNAUTHENTICATED')
    expect(badBody.error.message).toBe(unknownBody.error.message)
    expect(sessions.sessions).toHaveLength(before)
  })

  it('does not open a session when the identifier matches two accounts', async () => {
    await createAccount({ email: 'autre@example.bf', pseudonym: 'fatim@example.bf' })
    const before = sessions.sessions.length
    const response = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    const body = (await response.json()) as { error: { code: string } }
    expect(response.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHENTICATED')
    expect(sessions.sessions).toHaveLength(before)
  })

  it('counts accounts and sessions together and creates nothing past the limit', async () => {
    setAuthLimitReader(async () => 2)
    resetAuthRateWindow()
    const accountsBefore = memory.accounts.length
    const sessionsBefore = sessions.sessions.length
    const first = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ human_verified: false }),
    })
    const second = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const third = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Fatim_Ouaga',
        password: 'phrase avec espaces',
        remember_me: true,
      }),
    })
    const fourth = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody({ email: 'limite@example.bf', pseudonym: 'Limite' })),
    })
    const secondBody = (await second.json()) as { error: { code: string; details: { field: string } } }
    const thirdBody = (await third.json()) as { error: { code: string } }
    const fourthBody = (await fourth.json()) as { error: { code: string } }
    expect(first.status).toBe(400)
    expect(second.status).toBe(400)
    expect(secondBody.error.code).toBe('UNHANDLED')
    expect(secondBody.error.details.field).toBe('identifier')
    expect(third.status).toBe(429)
    expect(fourth.status).toBe(429)
    expect(thirdBody.error.code).toBe('RATE_LIMITED')
    expect(fourthBody.error.code).toBe('RATE_LIMITED')
    expect(memory.accounts).toHaveLength(accountsBefore)
    expect(sessions.sessions).toHaveLength(sessionsBefore)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
  })

  it('does not create a session when the auth limit is not a number', async () => {
    setAuthLimitReader(async () => null)
    resetAuthRateWindow()
    const before = sessions.sessions.length
    const response = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Fatim_Ouaga',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    const body = (await response.json()) as { error: { code: string } }
    expect(response.status).toBe(500)
    expect(body.error.code).toBe('UNHANDLED')
    expect(sessions.sessions).toHaveLength(before)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
  })
})

describe('auth rate window', () => {
  it('holds a denied post until 60 seconds after the last post', () => {
    resetAuthRateWindow()
    const start = new Date('2026-01-01T00:00:00.000Z')
    expect(takeAuthSlot('9.9.9.9', 1, start)).toBe(true)
    expect(takeAuthSlot('9.9.9.9', 1, new Date(start.getTime() + 59_999))).toBe(false)
    resetAuthRateWindow()
    expect(takeAuthSlot('9.9.9.9', 1, start)).toBe(true)
    for (let extra = 0; extra < 50; extra += 1) {
      expect(takeAuthSlot('9.9.9.9', 1, new Date(start.getTime() + 1))).toBe(false)
    }
    expect(takeAuthSlot('9.9.9.9', 1, new Date(start.getTime() + 60_000))).toBe(false)
    resetAuthRateWindow()
    expect(takeAuthSlot('9.9.9.9', 1, start)).toBe(true)
    expect(takeAuthSlot('9.9.9.9', 1, new Date(start.getTime() + 1))).toBe(false)
    expect(takeAuthSlot('9.9.9.9', 1, new Date(start.getTime() + 1 + 60_000))).toBe(true)
    let cursor = start.getTime()
    resetAuthRateWindow()
    expect(takeAuthSlot('9.9.9.9', 1, new Date(cursor))).toBe(true)
    for (let step = 0; step < 5; step += 1) {
      cursor += 59_000
      expect(takeAuthSlot('9.9.9.9', 1, new Date(cursor))).toBe(false)
    }
    expect(takeAuthSlot('9.9.9.9', 1, new Date(cursor + 60_000))).toBe(true)
    resetAuthRateWindow()
    expect(takeAuthSlot('9.9.9.9', 1, start)).toBe(true)
    expect(takeAuthSlot('9.9.9.9', 1, new Date(start.getTime() + 60_000))).toBe(true)
    expect(takeAuthSlot('8.8.8.8', 1, start)).toBe(true)
    resetAuthRateWindow()
  })

  it('shares one bucket for an IPv4-mapped address and leaves the next address alone', async () => {
    const previous = process.env['DATABASE_URL']
    delete process.env['DATABASE_URL']
    setAuthLimitReader(async () => 1)
    resetAuthRateWindow()
    try {
      expect(await readRlAuthPerMin()).toBe(1)
      setAuthLimitReader(undefined)
      expect(await readRlAuthPerMin()).toBe(10)
      setAuthLimitReader(async () => 1)
      const mapped = clientIp({ socket: { remoteAddress: '::ffff:203.0.113.5' } })
      const plain = clientIp({ socket: { remoteAddress: '203.0.113.5' } })
      const other = clientIp({ socket: { remoteAddress: '203.0.113.6' } })
      expect(mapped).toBe(plain)
      await rejectIfAuthRateLimited(mapped)
      await expect(rejectIfAuthRateLimited(plain)).rejects.toBeInstanceOf(HttpException)
      await expect(rejectIfAuthRateLimited(plain)).rejects.toSatisfy((error: HttpException) => error.getStatus() === 429)
      await rejectIfAuthRateLimited(other)
    } finally {
      setAuthLimitReader(async () => 100)
      resetAuthRateWindow()
      if (previous === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previous
      }
    }
  })
})
