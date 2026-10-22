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
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { setFreeReviewSlaReader } from './profile-review.js'
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
    const stored = {
      dob: '1990-01-15',
      city: 'ouagadougou',
      country: 'BF',
      origin: 'Plateau-Central',
      marital_status: 'married' as const,
      polygamy_intent: 'yes' as const,
      education: 'licence',
      profession: 'enseignement',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
      bio_pending: 'Une présentation sobre.',
    }
    expect(acceptProfileWrite({ dob: '1991-02-02' }, 'brother', stored)).toMatchObject({
      dob: '1991-02-02',
      city: 'ouagadougou',
      madhhab: 'maliki',
      marital_status: 'married',
      polygamy_intent: 'yes',
      life_plans: 'tf:6months\nUnion stable',
    })
    expect(acceptProfileWrite({ dob: '1990-01-15', city: '', madhhab: null }, 'sister', stored)).toMatchObject({
      city: null,
      madhhab: null,
      practice: 'assidue',
      country: 'BF',
    })
    expect(
      acceptProfileWrite({ dob: '1990-01-15', marital_status: 'married' }, 'brother', {
        ...stored,
        polygamy_intent: 'no',
      }),
    ).toEqual({
      field: 'polygamy_intent',
      message: "polygamy_intent : l'intention de polygamie doit être oui lorsque le frère est marié.",
    })
  })

  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setFreeReviewSlaReader(async () => 24)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setMediaStore(memoryMediaStore())
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
    setFreeReviewSlaReader(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setProfileStore(undefined)
    setMediaStore(undefined)
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

  async function read(cookie: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    expect(response.status).toBe(200)
    return (await response.json()) as Record<string, unknown>
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
    expect(stored?.visibility).toBe('unpublished')
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
    expect(await read(cookie)).toMatchObject({ dob: '1990-01-15', marital_status: null, madhhab: null })

    const young = await put(cookie, {
      dob: '2010-01-01',
      marital_status: 'single',
      polygamy_intent: 'no',
    })
    expect(young.status).toBe(400)
    expect(young.json).toMatchObject({ error: { details: { field: 'dob' } } })
    expect((await read(cookie)).dob).toBe('1990-01-15')

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

    const onlyDob = await put(cookie, { dob: '1992-03-04' })
    expect(onlyDob.status).toBe(200)
    expect(onlyDob.json).toMatchObject({
      dob: '1992-03-04',
      marital_status: 'married',
      polygamy_intent: 'yes',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
    })
  })

  it('keeps stored sister columns when the body omits them and clears only blank values', async () => {
    const created = await createAccount('sister')
    const cookie = await signIn(created.email)
    const saved = await put(cookie, {
      dob: '1990-01-15',
      city: 'ouagadougou',
      country: 'BF',
      origin: 'Plateau-Central',
      education: 'licence',
      profession: 'enseignement',
      bio_pending: 'Une présentation sobre.',
      ...readyIslamic,
    })
    expect(saved.status).toBe(200)

    const partial = await put(cookie, { dob: '1991-02-02' })
    expect(partial.status).toBe(200)
    expect(partial.json).toMatchObject({
      dob: '1991-02-02',
      city: 'ouagadougou',
      country: 'BF',
      origin: 'Plateau-Central',
      education: 'licence',
      profession: 'enseignement',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
      bio_pending: 'Une présentation sobre.',
      completeness: { percent: 100, missing: [], ready: true },
    })

    const cleared = await put(cookie, { dob: '1991-02-02', city: '', madhhab: null })
    expect(cleared.status).toBe(200)
    expect(cleared.json).toMatchObject({
      city: null,
      madhhab: null,
      country: 'BF',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
      bio_pending: 'Une présentation sobre.',
      completeness: { percent: 67, missing: ['madhhab'], ready: false },
    })

    const clearedText = await put(cookie, {
      dob: '1991-02-02',
      origin: '',
      bio_pending: null,
      life_plans: '',
    })
    expect(clearedText.status).toBe(200)
    expect(clearedText.json).toMatchObject({
      origin: null,
      bio_pending: null,
      life_plans: null,
      country: 'BF',
      practice: 'assidue',
      city: null,
    })
    expect(await read(cookie)).toMatchObject({ origin: null, life_plans: null, practice: 'assidue' })
  })

  it('rejects a screen token, a bad delay, and an unreadable min age without writing', async () => {
    const created = await createAccount('sister')
    const cookie = await signIn(created.email)
    const saved = await put(cookie, {
      dob: '1990-01-15',
      city: 'ouagadougou',
      ...readyIslamic,
    })
    expect(saved.status).toBe(200)

    const screenToken = await put(cookie, { dob: '1990-01-15', marital_status: 'celibataire' })
    expect(screenToken.status).toBe(400)
    expect(screenToken.json).toMatchObject({ error: { details: { field: 'marital_status' } } })
    expect(await read(cookie)).toMatchObject({ city: 'ouagadougou', madhhab: 'maliki', marital_status: null })

    const badDelay = await put(cookie, { dob: '1990-01-15', life_plans: 'tf:nope' })
    expect(badDelay.status).toBe(400)
    expect(badDelay.json).toMatchObject({ error: { details: { field: 'life_plans' } } })
    expect(await read(cookie)).toMatchObject({ life_plans: 'tf:6months\nUnion stable', city: 'ouagadougou' })

    memory.minAgeValue = null
    try {
      const unread = await put(cookie, { dob: '1990-01-15' })
      expect(unread.status).toBe(503)
      expect(unread.json).toMatchObject({
        error: {
          message: 'min_age : la configuration est illisible.',
          retryable: true,
          details: { field: 'min_age' },
        },
      })
      expect(await read(cookie)).toMatchObject({ dob: '1990-01-15', madhhab: 'maliki', city: 'ouagadougou' })
    } finally {
      memory.minAgeValue = 19
    }
  })

  it('lists every brother gap and rejects a save that still has no marital status', async () => {
    const created = await createAccount('brother')
    const cookie = await signIn(created.email)
    const open = await read(cookie)
    expect(open.completeness).toEqual({
      percent: 0,
      missing: ['madhhab', 'pratique', 'intentions', 'situation matrimoniale', 'intention de polygamie'],
      ready: false,
    })

    const denied = await put(cookie, {
      dob: '1990-01-15',
      polygamy_intent: 'yes',
      ...readyIslamic,
    })
    expect(denied.status).toBe(400)
    expect(denied.json).toMatchObject({
      error: {
        details: { field: 'marital_status' },
        message: 'marital_status : la situation matrimoniale est requise.',
      },
    })
    expect(await read(cookie)).toMatchObject({
      dob: '1990-01-15',
      marital_status: null,
      polygamy_intent: null,
      madhhab: null,
    })
  })

  it('rejects a married status when the stored polygamy intent is no and the key is omitted', async () => {
    const created = await createAccount('brother')
    const cookie = await signIn(created.email)
    const saved = await put(cookie, {
      dob: '1990-01-15',
      marital_status: 'single',
      polygamy_intent: 'no',
      ...readyIslamic,
    })
    expect(saved.status).toBe(200)
    const denied = await put(cookie, { dob: '1990-01-15', marital_status: 'married' })
    expect(denied.status).toBe(400)
    expect(denied.json).toMatchObject({
      error: {
        details: { field: 'polygamy_intent' },
        message: "polygamy_intent : l'intention de polygamie doit être oui lorsque le frère est marié.",
      },
    })
    expect(await read(cookie)).toMatchObject({
      marital_status: 'single',
      polygamy_intent: 'no',
      madhhab: 'maliki',
      life_plans: 'tf:6months\nUnion stable',
    })
  })

  it('answers the profile read and both writes with no-store, so a back navigation never reuses expired photo grants', async () => {
    const missing = await fetch(`${base}/v1/me/profile`)
    expect(missing.status).toBe(401)
    expect(missing.headers.get('cache-control')).toBe('no-store')

    const created = await createAccount('sister')
    const cookie = await signIn(created.email)
    const read = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    expect(read.status).toBe(200)
    expect(read.headers.get('cache-control')).toBe('no-store')

    const saved = await fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ dob: '1990-01-15', ...readyIslamic }),
    })
    expect(saved.status).toBe(200)
    expect(saved.headers.get('cache-control')).toBe('no-store')

    const refused = await fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ dob: '' }),
    })
    expect(refused.status).toBe(400)
    expect(refused.headers.get('cache-control')).toBe('no-store')

    const blurred = await fetch(`${base}/v1/me/profile`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ photo_blur: false }),
    })
    expect(blurred.status).toBe(200)
    expect(blurred.headers.get('cache-control')).toBe('no-store')
  })
})
