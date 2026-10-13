import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { acceptProfileWrite, completenessFor } from './profile-fields.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
let now = new Date('2026-10-12T09:00:00.000Z')
let serial = 0

function accountBody(gender: 'sister' | 'brother' = 'sister'): Record<string, unknown> {
  serial += 1
  return {
    email: `profil${serial}@example.bf`,
    password: 'phrase avec espaces',
    pseudonym: `Profil_${serial}`,
    gender,
    pledge_accepted: true,
    civil_given_name: 'Awa',
    civil_family_name: 'Sawadogo',
    recaptcha_token: 'test-ok',
    coc_version: 'FR-089',
    dob: '1990-01-15',
  }
}

const readyIslamic = {
  madhhab: 'maliki',
  practice: 'assidue',
  life_plans: 'tf:6months\nUnion stable',
}

describe('profile fields and completeness', () => {
  it('names missing Islamic criteria and rejects a married brother without polygamy yes', () => {
    expect(completenessFor({ madhhab: null, practice: 'assidue', life_plans: null, marital_status: null, polygamy_intent: null }, 'sister')).toEqual({
      percent: 33,
      missing: ['madhhab', 'intentions'],
      ready: false,
    })
    const married = acceptProfileWrite(
      { dob: '1990-01-15', marital_status: 'married', polygamy_intent: 'no' },
      'brother',
    )
    expect(married).toEqual({
      field: 'polygamy_intent',
      message: "polygamy_intent : l'intention de polygamie doit être oui lorsque le frère est marié.",
    })
    expect(JSON.stringify(married)).not.toContain('profil faible')
  })

  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
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
    setProfileStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  async function createAccount(gender: 'sister' | 'brother' = 'sister'): Promise<{ id: string; email: string }> {
    const body = accountBody(gender)
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
      body: JSON.stringify({
        identifier: email,
        password: 'phrase avec espaces',
        remember_me: false,
        recaptcha_token: 'test-ok',
      }),
    })
    expect(response.status).toBe(201)
    const cookie = response.headers.getSetCookie().join('\n')
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie)
    expect(match?.[1]).toBeTruthy()
    return `${SESSION_COOKIE}=${match?.[1] ?? ''}`
  }

  async function put(cookie: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, json: (await response.json()) as Record<string, unknown> }
  }

  it('requires a session and saves sister fields without a shame label', async () => {
    const missing = await fetch(`${base}/v1/me/profile`)
    expect(missing.status).toBe(401)

    const created = await createAccount('sister')
    const cookie = await signIn(created.email)
    const before = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    const open = (await before.json()) as { completeness: { missing: string[]; ready: boolean }; dob: string }
    expect(open.dob).toBe('1990-01-15')
    expect(open.completeness.missing).toEqual(['madhhab', 'pratique', 'intentions'])
    expect(open.completeness.ready).toBe(false)
    expect(JSON.stringify(open)).not.toContain('profil faible')

    const saved = await put(cookie, {
      dob: '1990-01-15',
      city: 'ouagadougou',
      country: 'BF',
      origin: 'Plateau-Central',
      education: 'licence',
      profession: 'enseignement',
      bio_pending: 'Une présentation sobre.',
      visibility: 'public',
      ...readyIslamic,
    })
    expect(saved.status).toBe(200)
    expect(saved.json).toMatchObject({
      city: 'ouagadougou',
      country: 'BF',
      origin: 'Plateau-Central',
      education: 'licence',
      profession: 'enseignement',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
      bio_pending: 'Une présentation sobre.',
      bio_live: null,
      completeness: { percent: 100, missing: [], ready: true },
    })
    expect(saved.json).not.toHaveProperty('visibility')
    expect(saved.json).not.toHaveProperty('confrerie')
    const stored = memory.profiles.find((row) => row.account_id === created.id)
    expect(stored?.visibility).toBeNull()
  })

  it('rejects a married brother unless polygamy intent is yes, and keeps bio_live untouched', async () => {
    const created = await createAccount('brother')
    const cookie = await signIn(created.email)
    const denied = await put(cookie, {
      dob: '1990-01-15',
      marital_status: 'married',
      polygamy_intent: 'no',
      ...readyIslamic,
    })
    expect(denied.status).toBe(400)
    expect(denied.json).toMatchObject({
      error: {
        details: { field: 'polygamy_intent' },
        message: "polygamy_intent : l'intention de polygamie doit être oui lorsque le frère est marié.",
      },
    })
    expect(JSON.stringify(denied.json)).not.toContain('profil faible')

    const young = await put(cookie, {
      dob: '2010-01-01',
      marital_status: 'single',
      polygamy_intent: 'no',
    })
    expect(young.status).toBe(400)
    expect(young.json).toMatchObject({ error: { details: { field: 'dob' } } })

    const saved = await put(cookie, {
      dob: '1990-01-15',
      marital_status: 'married',
      polygamy_intent: 'yes',
      ...readyIslamic,
    })
    expect(saved.status).toBe(200)
    expect(saved.json).toMatchObject({
      marital_status: 'married',
      polygamy_intent: 'yes',
      bio_live: null,
      completeness: { percent: 100, missing: [], ready: true },
    })
    const again = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    expect(await again.json()).toMatchObject({ polygamy_intent: 'yes', madhhab: 'maliki' })
  })
})
