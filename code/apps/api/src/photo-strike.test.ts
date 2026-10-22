import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { memoryAuditPort, setAuditPort } from './audit-port.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import {
  getStrikeStore,
  memoryStrikeStore,
  recordPhotoFloorStrike,
  replayPhotoFloor,
  setPhotoStrikeConfigReader,
  setStrikeStore,
} from './photo-strike.js'
import { setFreeReviewSlaReader, setVerificationGateReader } from './profile-review.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { memoryStaffStore } from './staff-store.js'
import { installTestStaff, openTestStaff, signInTestStaff } from './test-staff-session.js'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs') as {
  PNG: {
    new (options: { width: number; height: number }): { data: Buffer; width: number; height: number }
    sync: { write(png: { data: Buffer; width: number; height: number }): Buffer }
  }
}

const memory = memoryAccountStore()
const staffStore = memoryStaffStore({ memberEmailTaken: (email) => memory.emailTaken(email) })
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
const strikes = memoryStrikeStore()
let now = new Date('2026-10-13T08:00:00.000Z')
let strikeCount = '3'
let strikeHours = '24'
let serial = 0

function samplePng(): Buffer {
  const png = new PNG({ width: 8, height: 8 })
  png.data.fill(255)
  return PNG.sync.write(png)
}

function hourMs(hours: number): number {
  return hours * 3_600_000
}

describe('photo floor replay', () => {
  it('blocks at the configured count and ignores strikes inside the window', () => {
    const first = newId(new Date('2026-10-13T08:00:00.000Z'))
    const second = newId(new Date('2026-10-13T09:00:00.000Z'))
    const third = newId(new Date('2026-10-13T10:00:00.000Z'))
    const during = newId(new Date('2026-10-13T11:00:00.000Z'))
    const after = newId(new Date('2026-10-14T11:00:00.000Z'))
    expect(replayPhotoFloor([{ id: first }, { id: second }], 3, 24, new Date('2026-10-13T12:00:00.000Z'))).toBeNull()
    const blocked = replayPhotoFloor([{ id: first }, { id: second }, { id: third }], 3, 24, new Date('2026-10-13T12:00:00.000Z'))
    expect(blocked !== 'invalid' && blocked !== null ? blocked.blocked_until : null).toBe('2026-10-14T10:00:00.000Z')
    const skipped = replayPhotoFloor(
      [{ id: first }, { id: second }, { id: third }, { id: during }],
      3,
      24,
      new Date('2026-10-14T10:00:00.000Z'),
    )
    expect(skipped).toBeNull()
    const restarted = replayPhotoFloor(
      [{ id: first }, { id: second }, { id: third }, { id: during }, { id: after }],
      3,
      24,
      new Date('2026-10-14T12:00:00.000Z'),
    )
    expect(restarted).toBeNull()
    const tighter = replayPhotoFloor([{ id: first }, { id: second }], 2, 24, new Date('2026-10-13T09:30:00.000Z'))
    expect(tighter !== 'invalid' && tighter !== null ? tighter.blocked_until : null).toBe('2026-10-14T09:00:00.000Z')
  })

  it('creates the catalog strike table without a ladder check or a case foreign key', () => {
    const sql = readFileSync(fileURLToPath(new URL('../drizzle/0014_strike.sql', import.meta.url)), 'utf8')
    const journal = readFileSync(fileURLToPath(new URL('../drizzle/meta/_journal.json', import.meta.url)), 'utf8')
    expect(sql).toContain('CREATE TABLE "strike"')
    expect(sql).toContain('"case_id" uuid')
    expect(sql).toContain('"ladder" text NOT NULL')
    expect(sql).toContain('"evidence" text')
    expect(sql).toContain('strike_account_id_account_id_fk')
    expect(sql).toContain('CREATE INDEX "strike_account_ladder_id"')
    expect(sql).toContain(`WHERE "strike"."ladder" = 'photo_floor'`)
    expect(sql).not.toContain('created_at')
    expect(sql).not.toContain('CHECK')
    expect(sql).not.toContain('moderation_case')
    expect(journal).toContain('0014_strike')
    const mediaSource = readFileSync(fileURLToPath(new URL('./media.ts', import.meta.url)), 'utf8')
    expect(mediaSource).not.toContain('insert(strike)')
    expect(mediaSource).not.toContain('from(strike)')
    const strikeSource = readFileSync(fileURLToPath(new URL('./photo-strike.ts', import.meta.url)), 'utf8')
    expect(strikeSource).toContain(`sql.raw("'photo_floor'")`)
  })
})

describe('photo strike floor on profile upload', () => {
  let app: INestApplication
  let base: string
  const png = samplePng()

  beforeAll(async () => {
    installTestStaff(staffStore)
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: strikeCount, hours: strikeHours }))
    setFreeReviewSlaReader(async () => 24)
    setVerificationGateReader(async () => false)
    setAuditPort(memoryAuditPort([]))
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setMediaStore(media)
    setStrikeStore(strikes)
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
    installTestStaff(undefined)
    setAuthClock(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setPhotoStrikeConfigReader(undefined)
    setFreeReviewSlaReader(undefined)
    setVerificationGateReader(undefined)
    setAuditPort(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setProfileStore(undefined)
    setMediaStore(undefined)
    setStrikeStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  async function createAccount(): Promise<{ id: string; email: string }> {
    serial += 1
    const email = `strike${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Strike_${serial}`,
        gender: 'sister',
        pledge_accepted: true,
        civil_given_name: 'Awa',
        civil_family_name: 'Sawadogo',
        recaptcha_token: 'test-ok',
        coc_version: 'FR-089',
        dob: '1990-01-15',
      }),
    })
    expect(response.status).toBe(201)
    const json = (await response.json()) as { id: string }
    return { id: json.id, email }
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

  /** A real staff session: server-command account, password change, enrollment and a TOTP code (Story 12.1). */
  async function openStaff(role: 'moderator' | 'operator') {
    const staff = await openTestStaff(base, staffStore, role)
    return { ...staff, id: staff.accountId }
  }

  async function upload(cookie: string, body: unknown): Promise<Response> {
    return fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function decide(
    cookie: string,
    accountId: string,
    photos: Array<{ asset_id: string; decision: 'allow' | 'block' }>,
    extra: Record<string, unknown> = {},
  ): Promise<Response> {
    return fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: accountId,
        photos,
        ...extra,
      }),
    })
  }

  it('blocks the fourth profile upload, then resets after the window', async () => {
    strikeCount = '3'
    strikeHours = '24'
    now = new Date('2026-10-20T08:00:00.000Z')
    const member = await createAccount()
    const cookie = await signIn(member.email)
    const moderator = await openStaff('moderator')
    const staff = moderator.cookie

    const chat = await upload(cookie, { kind: 'chat_photo', image: png.toString('base64') })
    expect(chat.status).toBe(400)
    expect(media.assets.filter((row) => row.owner_id === member.id)).toHaveLength(0)

    const first = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    expect(first.status).toBe(201)
    const live = (await first.json()) as { id: string }
    const allowed = await decide(staff, member.id, [{ asset_id: live.id, decision: 'allow' }], { profile: 'allow' })
    expect(allowed.status).toBe(200)
    expect(await getStrikeStore().listPhotoFloor(member.id)).toEqual([])
    expect(media.assets.find((row) => row.id === live.id)?.moderation_state).toBe('live')

    const blockedIds: string[] = []
    for (let index = 0; index < 2; index += 1) {
      now = new Date(now.getTime() + 60_000)
      const pending = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
      expect(pending.status).toBe(201)
      const photo = (await pending.json()) as { id: string }
      const decision = await decide(staff, member.id, [{ asset_id: photo.id, decision: 'block' }], {
        reason: 'La photo ne respecte pas les règles publiées.',
      })
      expect(decision.status).toBe(200)
      blockedIds.push(photo.id)
      expect(media.assets.find((row) => row.id === live.id)?.moderation_state).toBe('live')
    }
    expect(await getStrikeStore().listPhotoFloor(member.id)).toHaveLength(2)
    now = new Date(now.getTime() + 60_000)
    const stillOpen = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    expect(stillOpen.status).toBe(201)
    const third = (await stillOpen.json()) as { id: string }
    now = new Date(now.getTime() + 60_000)
    const thirdAt = new Date(now.getTime())
    const thirdDecision = await decide(staff, member.id, [{ asset_id: third.id, decision: 'block' }], {
      reason: 'La photo ne respecte pas les règles publiées.',
    })
    expect(thirdDecision.status).toBe(200)
    blockedIds.push(third.id)
    const floor = await getStrikeStore().listPhotoFloor(member.id)
    expect(floor).toHaveLength(3)
    expect(floor.every((row) => row.case_id === null && row.ladder === 'photo_floor')).toBe(true)
    expect(floor.map((row) => row.evidence)).toEqual(blockedIds.map((id) => `photo_asset:${id}`))
    expect(floor.some((row) => row.evidence.includes('original'))).toBe(false)

    const before = media.assets.map((row) => row.id)
    const beforeBlobs = media.blobs.size
    const refused = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    const refusedBody = (await refused.json()) as {
      error: { code: string; message: string; details: { reason?: string; blocked_until?: string }; retryable: boolean }
    }
    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe(String(24 * 60 * 60))
    expect(refusedBody.error).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Envoi de photos suspendu : 3 photos ont été refusées.',
      retryable: true,
      details: { reason: 'photo_strike', blocked_until: new Date(thirdAt.getTime() + hourMs(24)).toISOString() },
    })
    expect(refusedBody.error).not.toHaveProperty('retryAfter')
    expect(media.assets.map((row) => row.id)).toEqual(before)
    expect(media.blobs.size).toBe(beforeBlobs)

    const garbage = await upload(cookie, { kind: 'profile_photo', image: '@@@' })
    expect(garbage.status).toBe(429)
    const chatBlocked = await upload(cookie, { kind: 'chat_photo', image: png.toString('base64') })
    expect(chatBlocked.status).toBe(429)
    expect(media.assets.map((row) => row.id)).toEqual(before)
    expect(media.assets.find((row) => row.id === live.id)?.moderation_state).toBe('live')
    const profile = (await (await fetch(`${base}/v1/me/profile`, { headers: { cookie } })).json()) as {
      photo: { id: string; moderation_state: string; blur_url: string }
    }
    expect(profile.photo).toMatchObject({ id: live.id, moderation_state: 'live' })
    const token = profile.photo.blur_url.split('token=')[1] ?? ''
    const bytes = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie } })
    expect(bytes.status).toBe(200)

    await recordPhotoFloorStrike({
      accountId: member.id,
      assetId: blockedIds[2] ?? third.id,
      at: new Date(thirdAt.getTime() + 60_000),
    })
    expect(await getStrikeStore().listPhotoFloor(member.id)).toHaveLength(3)
    await recordPhotoFloorStrike({
      accountId: member.id,
      assetId: newId(now),
      at: new Date(thirdAt.getTime() + hourMs(1)),
    })
    expect(await getStrikeStore().listPhotoFloor(member.id)).toHaveLength(4)

    now = new Date(thirdAt.getTime() + hourMs(24))
    const fresh = await signIn(member.email)
    const staffFresh = await signInTestStaff(base, staffStore, moderator)
    const reopened = await upload(fresh, { kind: 'profile_photo', image: png.toString('base64') })
    expect(reopened.status).toBe(201)
    const again = (await reopened.json()) as { id: string }
    now = new Date(now.getTime() + 60_000)
    const oneMore = await decide(staffFresh, member.id, [{ asset_id: again.id, decision: 'block' }], {
      reason: 'La photo ne respecte pas les règles publiées.',
    })
    expect(oneMore.status).toBe(200)
    now = new Date(now.getTime() + 60_000)
    const afterReset = await upload(fresh, { kind: 'profile_photo', image: png.toString('base64') })
    expect(afterReset.status).toBe(201)
    expect(media.assets.find((row) => row.id === live.id)?.moderation_state).toBe('live')
  })

  it('reads photo_strike_count and writes no strike for a bio block', async () => {
    strikeCount = '2'
    strikeHours = '24'
    now = new Date('2026-10-22T08:00:00.000Z')
    const member = await createAccount()
    const cookie = await signIn(member.email)
    const moderator = await openStaff('moderator')
    const staff = moderator.cookie

    const first = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    expect(first.status).toBe(201)
    const photo = (await first.json()) as { id: string }
    expect(
      (
        await decide(staff, member.id, [{ asset_id: photo.id, decision: 'block' }], {
          profile: 'allow',
          reason: 'La photo ne respecte pas les règles publiées.',
        })
      ).status,
    ).toBe(200)
    const second = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    expect(second.status).toBe(201)
    const next = (await second.json()) as { id: string }
    now = new Date(now.getTime() + 60_000)
    expect(
      (
        await decide(staff, member.id, [{ asset_id: next.id, decision: 'block' }], {
          reason: 'La photo ne respecte pas les règles publiées.',
        })
      ).status,
    ).toBe(200)
    const limited = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    const body = (await limited.json()) as { error: { message: string } }
    expect(limited.status).toBe(429)
    expect(body.error.message).toBe('Envoi de photos suspendu : 2 photos ont été refusées.')

    strikeCount = 'no'
    const broken = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    expect(broken.status).toBe(503)
    expect(await broken.json()).toMatchObject({
      error: { code: 'UNHANDLED', details: { field: 'photo_strike_count' }, retryable: true },
    })
    strikeCount = '3'
    strikeHours = '0'
    const badHours = await upload(cookie, { kind: 'profile_photo', image: '@@@' })
    expect(badHours.status).toBe(503)
    expect(await badHours.json()).toMatchObject({
      error: { details: { field: 'photo_strike_block_hours' } },
    })
    strikeHours = '24'

    const bioMember = await createAccount()
    const bioCookie = await signIn(bioMember.email)
    const saved = await fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie: bioCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ dob: '1990-01-15', bio_pending: 'Une présentation.' }),
    })
    expect(saved.status).toBe(200)
    const bio = await decide(staff, bioMember.id, [], {
      profile: 'allow',
      bio: 'block',
      reason: 'La présentation ne peut pas être publiée.',
    })
    expect(bio.status).toBe(200)
    expect(await getStrikeStore().listPhotoFloor(bioMember.id)).toEqual([])
  })
})
