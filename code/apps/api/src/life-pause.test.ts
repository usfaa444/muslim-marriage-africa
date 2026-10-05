import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { ACTIVE_STATUS, DEACTIVATED_STATUS, HELD_STATUS } from './create-account.js'
import { createApp } from './create-app.js'
import { acceptDeactivateBody, REASON_MESSAGE } from './life-pause.js'
import { memoryLifePauseStore, readAccountStatus, setLifePauseStore } from './life-pause-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
let now = new Date('2026-10-05T09:00:00.000Z')
let serial = 0

function accountBody(): Record<string, unknown> {
  serial += 1
  return {
    email: `pause${serial}@example.bf`,
    password: 'phrase avec espaces',
    pseudonym: `Pause_${serial}`,
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    dob: '1990-01-15',
  }
}

describe('named life-pause', () => {
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

  function accountRow(id: string) {
    return memory.accounts.find((row) => row.id === id)
  }

  function snapshot(id: string) {
    const row = accountRow(id)
    const profile = memory.profiles.find((item) => item.account_id === id)
    const credential = memory.credentials.find((item) => item.account_id === id)
    const session = sessions.sessions.filter((item) => item.account_id === id).map((item) => ({
      id: item.id,
      expires_at: item.expires_at.toISOString(),
    }))
    return {
      email: row?.email,
      pseudonym: row?.pseudonym,
      gender: row?.gender,
      roles: row?.roles,
      age_attested: row?.age_attested,
      coc_version: row?.coc_version,
      profile,
      credential: credential ? { ...credential } : null,
      session,
    }
  }

  async function post(path: string, cookie: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        cookie,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, json: (await response.json()) as Record<string, unknown> }
  }

  it('reads status through identity and discards the named reason', async () => {
    expect(acceptDeactivateBody({ reason: 'grief', note: 'kept' })).toEqual({
      field: 'reason',
      message: REASON_MESSAGE,
    })
    const created = await createAccount()
    expect(await readAccountStatus(created.id)).toBe(ACTIVE_STATUS)
    const cookie = await signIn(created.email)
    const before = snapshot(created.id)
    const session = sessions.sessions.find((row) => row.account_id === created.id)
    const expires = session?.expires_at.toISOString()

    const missing = await fetch(`${base}/v1/me/deactivate`)
    expect(missing.status).toBe(401)
    expect(await missing.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })

    const current = await fetch(`${base}/v1/me/deactivate`, { headers: { cookie } })
    expect(await current.json()).toEqual({ status: ACTIVE_STATUS })

    const paused = await post('/v1/me/deactivate', cookie, { reason: 'mourning', note: '  une note  ' })
    expect(paused.status).toBe(200)
    expect(paused.json).toEqual({ status: DEACTIVATED_STATUS })
    expect(JSON.stringify(paused.json)).not.toContain('mourning')
    expect(JSON.stringify(paused.json)).not.toContain('note')
    expect(accountRow(created.id)?.status).toBe(DEACTIVATED_STATUS)
    expect(snapshot(created.id)).toEqual(before)
    expect(session?.expires_at.toISOString()).toBe(expires)

    const again = await post('/v1/me/deactivate', cookie, { reason: 'ramadan' })
    expect(again.json).toEqual({ status: DEACTIVATED_STATUS })
    expect(await readAccountStatus(created.id)).toBe(DEACTIVATED_STATUS)

    const signedInAgain = await signIn(created.email)
    const still = await fetch(`${base}/v1/me/deactivate`, { headers: { cookie: signedInAgain } })
    expect(await still.json()).toEqual({ status: DEACTIVATED_STATUS })

    const resumed = await post('/v1/me/reactivate', signedInAgain, { ignored: true })
    expect(resumed.json).toEqual({ status: ACTIVE_STATUS })
    const resumedAgain = await post('/v1/me/reactivate', signedInAgain)
    expect(resumedAgain.status).toBe(200)
    expect(resumedAgain.json).toEqual({ status: ACTIVE_STATUS })
    const after = snapshot(created.id)
    expect(after.profile).toEqual(before.profile)
    expect(after.credential).toEqual(before.credential)
    expect(after.email).toBe(before.email)
    const live = sessions.sessions.filter((row) => row.account_id === created.id)
    expect(live.length).toBeGreaterThan(1)
    expect(live.every((row) => row.expires_at.toISOString() === expires)).toBe(true)
  })

  it('rejects a bad reason or note and leaves the account active', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const cases = [
      [{}, 'reason'],
      [{ reason: 'grief' }, 'reason'],
      [{ reason: 'exams', note: 12 }, 'note'],
      [{ reason: 'travel', note: 'a\nb' }, 'note'],
      [{ reason: 'ramadan', note: 'é'.repeat(201) }, 'note'],
    ] as const
    for (const [body, field] of cases) {
      const response = await post('/v1/me/deactivate', cookie, body)
      expect(response.status).toBe(400)
      expect(response.json).toMatchObject({ error: { code: 'UNHANDLED', details: { field } } })
      expect(JSON.stringify(response.json)).not.toContain('grief')
      expect(accountRow(created.id)?.status).toBe(ACTIVE_STATUS)
    }
    const blank = await post('/v1/me/deactivate', cookie, { reason: 'exams', note: '   ' })
    expect(blank.json).toEqual({ status: DEACTIVATED_STATUS })
  })

  it('refuses a hold and a non-member session without writing', async () => {
    const held = await createAccount()
    const heldRow = accountRow(held.id)
    if (!heldRow) {
      throw new Error('missing held account')
    }
    heldRow.status = HELD_STATUS
    const heldCookie = await signIn(held.email)
    const heldPost = await post('/v1/me/deactivate', heldCookie, { reason: 'ramadan' })
    expect(heldPost.status).toBe(403)
    expect(heldPost.json).toMatchObject({ error: { code: 'FORBIDDEN', details: { status: 'held' } } })
    const heldResume = await post('/v1/me/reactivate', heldCookie)
    expect(heldResume.status).toBe(403)
    expect(heldRow.status).toBe(HELD_STATUS)
    const heldRead = await fetch(`${base}/v1/me/deactivate`, { headers: { cookie: heldCookie } })
    expect(await heldRead.json()).toEqual({ status: HELD_STATUS })

    const other = await createAccount()
    const otherRow = accountRow(other.id)
    if (!otherRow) {
      throw new Error('missing member account')
    }
    ;(otherRow as { roles: string[] }).roles = ['mahram']
    const otherCookie = await signIn(other.email)
    const refused = await post('/v1/me/deactivate', otherCookie, { reason: 'travel' })
    expect(refused.status).toBe(403)
    expect(refused.json).toMatchObject({ error: { code: 'FORBIDDEN', details: null } })
    expect(otherRow.status).toBe(ACTIVE_STATUS)
  })

  it('stops on the PIN gate and does not change status', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const saved = await fetch(`${base}/v1/pin`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ pin: '1357' }),
    })
    expect(saved.status).toBe(200)
    const locked = await fetch(`${base}/v1/pin/lock`, { method: 'POST', headers: { cookie } })
    expect(await locked.json()).toEqual({ locked: true })
    const blocked = await post('/v1/me/deactivate', cookie, { reason: 'exams' })
    expect(blocked.status).toBe(401)
    expect(blocked.json).toMatchObject({ error: { code: 'PIN_REQUIRED' } })
    expect(accountRow(created.id)?.status).toBe(ACTIVE_STATUS)
  })
})
