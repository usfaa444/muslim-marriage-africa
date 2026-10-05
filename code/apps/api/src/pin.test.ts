import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ERROR_CODES } from '@ankanu/kernel'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { FOURTEEN_DAYS_MS, SESSION_COOKIE, TWELVE_HOURS_MS } from './session-cookie.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const PIN = '1357'
const WRONG = '1358'
let now = new Date('2026-10-05T08:00:00.000Z')

function accountBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'fatim@example.bf',
    password: 'phrase avec espaces',
    pseudonym: 'Fatim_Ouaga',
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    dob: '1990-01-15',
    ...overrides,
  }
}

describe('shared-device PIN', () => {
  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    pins.rows.length = 0
    resetPinEntries()
    setPinLockStore(pins)
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
    setPinLockStore(undefined)
    resetPinEntries()
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

  async function signIn(identifier: string, rememberMe = false): Promise<string> {
    const response = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier,
        password: 'phrase avec espaces',
        remember_me: rememberMe,
      }),
    })
    expect(response.status).toBe(201)
    const cookie = response.headers.getSetCookie().join('\n')
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie)
    expect(match?.[1]).toBeTruthy()
    return `${SESSION_COOKIE}=${match?.[1] ?? ''}`
  }

  function sessionRow(cookie: string) {
    const id = cookie.split('=')[1] ?? ''
    return sessions.sessions.find((row) => row.id === id)
  }

  it('stores only the pin hash', () => {
    expect(ERROR_CODES.PIN_INVALID).toBe('PIN_INVALID')
    expect(ERROR_CODES.PIN_REQUIRED).toBe('PIN_REQUIRED')
    expect(ERROR_CODES.PIN_LOCKED).toBe('PIN_LOCKED')
    const sql = readFileSync(fileURLToPath(new URL('../drizzle/0008_pin_lock.sql', import.meta.url)), 'utf8')
    const journal = readFileSync(fileURLToPath(new URL('../drizzle/meta/_journal.json', import.meta.url)), 'utf8')
    expect(sql).toContain('CREATE TABLE "pin_lock"')
    expect(sql).toContain('"account_id" uuid NOT NULL')
    expect(sql).toContain('"pin_hash" text NOT NULL')
    expect(sql).not.toContain('fail')
    expect(journal).toContain('0008_pin_lock')
  })

  it('refuses a missing session and reports an unset PIN without moving last_seen', async () => {
    const missing = await fetch(`${base}/v1/pin`)
    const missingBody = (await missing.json()) as { error: { code: string } }
    expect(missing.status).toBe(401)
    expect(missingBody.error.code).toBe('UNAUTHENTICATED')

    await createAccount()
    const cookie = await signIn('fatim@example.bf')
    const seen = sessionRow(cookie)?.last_seen_at.toISOString()
    const status = await fetch(`${base}/v1/pin`, { headers: { cookie } })
    const body = (await status.json()) as { enabled: boolean; locked: boolean }
    expect(status.status).toBe(200)
    expect(body).toEqual({ enabled: false, locked: false })
    expect(JSON.stringify(body)).not.toContain('gender')
    expect(sessionRow(cookie)?.last_seen_at.toISOString()).toBe(seen)

    const lockedOff = await fetch(`${base}/v1/pin/lock`, { method: 'POST', headers: { cookie } })
    expect(await lockedOff.json()).toEqual({ locked: false })
    expect(pins.rows).toHaveLength(0)

    const open = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    })
    expect(await open.json()).toEqual({ locked: false })
  })

  it('sets the PIN, locks this session, and unlocks only after the server check', async () => {
    const cookie = await signIn('Fatim_Ouaga')
    const other = await signIn('fatim@example.bf')
    const beforeSeen = sessionRow(cookie)?.last_seen_at.toISOString()
    const saved = await fetch(`${base}/v1/pin`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toEqual({ enabled: true })
    expect(pins.rows).toHaveLength(1)
    expect(pins.rows[0]?.pin_hash).not.toBe(PIN)
    expect(pins.rows[0]?.pin_hash.startsWith('$argon2')).toBe(true)

    const open = await fetch(`${base}/v1/pin`, { headers: { cookie } })
    expect(await open.json()).toEqual({ enabled: true, locked: false })
    expect(sessionRow(cookie)?.last_seen_at.toISOString()).toBe(beforeSeen)

    const locked = await fetch(`${base}/v1/pin/lock`, { method: 'POST', headers: { cookie } })
    expect(await locked.json()).toEqual({ locked: true })
    const afterLock = await fetch(`${base}/v1/pin`, { headers: { cookie } })
    expect(await afterLock.json()).toEqual({ enabled: true, locked: true })
    const otherStill = await fetch(`${base}/v1/pin`, { headers: { cookie: other } })
    expect(await otherStill.json()).toEqual({ enabled: true, locked: false })

    const badShape = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: '12' }),
    })
    const badShapeBody = (await badShape.json()) as { error: { code: string; details: { field: string } } }
    expect(badShape.status).toBe(400)
    expect(badShapeBody.error.code).toBe('UNHANDLED')
    expect(badShapeBody.error.details).toEqual({ field: 'pin' })

    const wrong = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: WRONG }),
    })
    const wrongBody = (await wrong.json()) as { error: { code: string; message: string; details: { attempts_left: number } } }
    expect(wrong.status).toBe(400)
    expect(wrongBody.error.code).toBe('PIN_INVALID')
    expect(wrongBody.error.message).toBe('Code incorrect.')
    expect(wrongBody.error.details).toEqual({ attempts_left: 4 })

    const again = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: WRONG }),
    })
    const againBody = (await again.json()) as { error: { details: { attempts_left: number } } }
    expect(againBody.error.details.attempts_left).toBe(3)

    const right = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    })
    expect(right.status).toBe(200)
    expect(await right.json()).toEqual({ locked: false })
    const afterUnlock = await fetch(`${base}/v1/pin`, { headers: { cookie } })
    expect(await afterUnlock.json()).toEqual({ enabled: true, locked: false })
  })

  it('ends only this session on the fifth wrong PIN', async () => {
    const cookie = await signIn('fatim@example.bf')
    const other = await signIn('Fatim_Ouaga')
    await fetch(`${base}/v1/pin/lock`, { method: 'POST', headers: { cookie } })
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const wrong = await fetch(`${base}/v1/pin/unlock`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ pin: WRONG }),
      })
      const body = (await wrong.json()) as { error: { details: { attempts_left: number } } }
      expect(wrong.status).toBe(400)
      expect(body.error.details.attempts_left).toBe(5 - attempt)
    }
    const fifth = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: WRONG }),
    })
    const fifthBody = (await fifth.json()) as { error: { code: string; message: string; details: null } }
    const cleared = fifth.headers.getSetCookie().join('\n')
    expect(fifth.status).toBe(401)
    expect(fifthBody.error.code).toBe('PIN_LOCKED')
    expect(fifthBody.error.message).toBe('Session verrouillée.')
    expect(fifthBody.error.details).toBeNull()
    expect(cleared).toContain(`${SESSION_COOKIE}=;`)
    expect(cleared).toContain('Max-Age=0')
    expect(cleared).toContain('HttpOnly')
    expect(cleared).toContain('Secure')
    expect(cleared).toContain('SameSite=Lax')

    const later = await fetch(`${base}/v1/pin`, { headers: { cookie } })
    const laterBody = (await later.json()) as { error: { code: string } }
    expect(later.status).toBe(401)
    expect(laterBody.error.code).toBe('UNAUTHENTICATED')
    const otherStill = await fetch(`${base}/v1/pin`, { headers: { cookie: other } })
    expect(otherStill.status).toBe(200)
    expect(sessions.sessions.filter((row) => row.expires_at.getTime() > now.getTime()).length).toBeGreaterThan(0)
  })

  it('requires the PIN after a restart and after 15 minutes for a sister or a mahram', async () => {
    const sister = await signIn('fatim@example.bf')
    resetPinEntries()
    const cold = await fetch(`${base}/v1/pin`, { headers: { cookie: sister } })
    expect(await cold.json()).toEqual({ enabled: true, locked: true })
    const seen = sessionRow(sister)?.last_seen_at.toISOString()
    const blocked = await fetch(`${base}/v1/health`, { headers: { cookie: sister } })
    const blockedBody = (await blocked.json()) as { error: { code: string; message: string } }
    expect(blocked.status).toBe(401)
    expect(blockedBody.error).toMatchObject({ code: 'PIN_REQUIRED', message: 'Code PIN requis.' })
    expect(sessionRow(sister)?.last_seen_at.toISOString()).toBe(seen)

    const refused = await fetch(`${base}/v1/pin`, {
      method: 'PUT',
      headers: { cookie: sister, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: '2468' }),
    })
    const refusedBody = (await refused.json()) as { error: { code: string } }
    expect(refused.status).toBe(401)
    expect(refusedBody.error.code).toBe('PIN_REQUIRED')
    expect(pins.rows[0]?.pin_hash.startsWith('$argon2')).toBe(true)

    const fresh = await signIn('fatim@example.bf')
    const started = now
    now = new Date(started.getTime() + 15 * 60 * 1000)
    const idleSeen = sessionRow(fresh)?.last_seen_at.toISOString()
    const idleRead = await fetch(`${base}/v1/pin`, { headers: { cookie: fresh } })
    expect(await idleRead.json()).toEqual({ enabled: true, locked: false })
    expect(sessionRow(fresh)?.last_seen_at.toISOString()).toBe(idleSeen)
    const idle = await fetch(`${base}/v1/health`, { headers: { cookie: fresh } })
    const idleBody = (await idle.json()) as { error: { code: string } }
    expect(idle.status).toBe(401)
    expect(idleBody.error.code).toBe('PIN_REQUIRED')
    expect(sessionRow(fresh)?.last_seen_at.toISOString()).toBe(idleSeen)
    const unlocked = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie: fresh, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    })
    expect(unlocked.status).toBe(200)
    expect(sessionRow(fresh)?.last_seen_at.toISOString()).toBe(now.toISOString())
    expect(sessionRow(fresh)?.last_seen_at.toISOString()).not.toBe(idleSeen)
    const afterIdle = await fetch(`${base}/v1/health`, { headers: { cookie: fresh } })
    expect(afterIdle.status).toBe(200)
    now = started

    await createAccount({ email: 'moussa@example.bf', pseudonym: 'Moussa_Ouaga', gender: 'brother' })
    const brother = await signIn('moussa@example.bf')
    const brotherPin = await fetch(`${base}/v1/pin`, {
      method: 'PUT',
      headers: { cookie: brother, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    })
    expect(brotherPin.status).toBe(200)
    now = new Date(started.getTime() + 15 * 60 * 1000)
    const brotherHealth = await fetch(`${base}/v1/health`, { headers: { cookie: brother } })
    expect(brotherHealth.status).toBe(200)
    expect(sessionRow(brother)?.last_seen_at.toISOString()).toBe(now.toISOString())
    now = started

    const owner = memory.accounts.find((row) => row.email === 'moussa@example.bf')
    if (!owner) {
      throw new Error('expected the brother account')
    }
    ;(owner as { roles: string[] }).roles = ['member', 'mahram']
    const mahram = await signIn('Moussa_Ouaga')
    now = new Date(started.getTime() + 15 * 60 * 1000)
    const mahramSeen = sessionRow(mahram)?.last_seen_at.toISOString()
    const mahramHealth = await fetch(`${base}/v1/health`, { headers: { cookie: mahram } })
    const mahramBody = (await mahramHealth.json()) as { error: { code: string } }
    expect(mahramHealth.status).toBe(401)
    expect(mahramBody.error.code).toBe('PIN_REQUIRED')
    expect(sessionRow(mahram)?.last_seen_at.toISOString()).toBe(mahramSeen)
    now = started
  })

  it('slides remember-me and only the last-seen time of a 12-hour session', async () => {
    const remembered = await signIn('moussa@example.bf', true)
    const fixed = await signIn('Moussa_Ouaga', false)
    const started = now
    now = new Date(started.getTime() + 60_000)
    const rememberedHealth = await fetch(`${base}/v1/health`, { headers: { cookie: remembered } })
    expect(rememberedHealth.headers.getSetCookie().join('\n')).toContain('Max-Age=1209600')
    expect(sessionRow(remembered)?.expires_at.toISOString()).toBe(new Date(now.getTime() + FOURTEEN_DAYS_MS).toISOString())
    const fixedHealth = await fetch(`${base}/v1/health`, { headers: { cookie: fixed } })
    expect(fixedHealth.headers.getSetCookie()).toEqual([])
    expect(sessionRow(fixed)?.last_seen_at.toISOString()).toBe(now.toISOString())
    expect(sessionRow(fixed)?.expires_at.toISOString()).toBe(new Date(started.getTime() + TWELVE_HOURS_MS).toISOString())
    now = started
  })

  it('clears the cookie on logout, including a locked session, and limits PIN posts', async () => {
    const cookie = await signIn('moussa@example.bf')
    await fetch(`${base}/v1/pin/lock`, { method: 'POST', headers: { cookie } })
    const lockedOut = await fetch(`${base}/v1/sessions/current`, { method: 'DELETE', headers: { cookie } })
    const cleared = lockedOut.headers.getSetCookie().join('\n')
    expect(lockedOut.status).toBe(204)
    expect(cleared).toContain(`${SESSION_COOKIE}=;`)
    expect(cleared).toContain('Path=/')
    expect(cleared).toContain('Max-Age=0')
    const after = await fetch(`${base}/v1/pin`, { headers: { cookie } })
    const afterBody = (await after.json()) as { error: { code: string } }
    expect(after.status).toBe(401)
    expect(afterBody.error.code).toBe('UNAUTHENTICATED')
    const ended = sessionRow(cookie)
    if (!ended) {
      throw new Error('expected the ended session row')
    }
    const endedAt = ended.expires_at.toISOString()
    await sessions.saveTimes(ended.id, new Date(now.getTime() + TWELVE_HOURS_MS), now)
    expect(ended.expires_at.toISOString()).toBe(endedAt)

    const absent = await fetch(`${base}/v1/sessions/current`, { method: 'DELETE' })
    expect(absent.status).toBe(204)
    expect(absent.headers.getSetCookie().join('\n')).toContain('Max-Age=0')

    resetAuthRateWindow()
    setAuthLimitReader(async () => 1)
    const limited = await signIn('fatim@example.bf')
    resetAuthRateWindow()
    const firstRead = await fetch(`${base}/v1/pin`, { headers: { cookie: limited } })
    const secondRead = await fetch(`${base}/v1/pin`, { headers: { cookie: limited } })
    expect(firstRead.status).toBe(200)
    expect(secondRead.status).toBe(200)
    const firstPut = await fetch(`${base}/v1/pin`, {
      method: 'PUT',
      headers: { cookie: limited, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    })
    const hashBefore = pins.rows.find((row) => row.account_id === sessionRow(limited)?.account_id)?.pin_hash
    const secondPut = await fetch(`${base}/v1/pin`, {
      method: 'PUT',
      headers: { cookie: limited, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: '2468' }),
    })
    const secondPutBody = (await secondPut.json()) as { error: { code: string } }
    expect(firstPut.status).toBe(200)
    expect(secondPut.status).toBe(429)
    expect(secondPutBody.error.code).toBe('RATE_LIMITED')
    expect(pins.rows.find((row) => row.account_id === sessionRow(limited)?.account_id)?.pin_hash).toBe(hashBefore)

    resetAuthRateWindow()
    const firstUnlock = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie: limited, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: WRONG }),
    })
    const secondUnlock = await fetch(`${base}/v1/pin/unlock`, {
      method: 'POST',
      headers: { cookie: limited, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: WRONG }),
    })
    const firstUnlockBody = (await firstUnlock.json()) as { error: { details: { attempts_left: number } } }
    const secondUnlockBody = (await secondUnlock.json()) as { error: { code: string } }
    expect(firstUnlock.status).toBe(400)
    expect(firstUnlockBody.error.details.attempts_left).toBe(4)
    expect(secondUnlock.status).toBe(429)
    expect(secondUnlockBody.error.code).toBe('RATE_LIMITED')
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
  })
})
