import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId, REPORT_REASON_CODES, REPORT_REASONS } from '@ankanu/kernel'
import { io as connectSocket, type Socket } from 'socket.io-client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { memoryAuditPort, setAuditPort } from './audit-port.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { memoryChatPort, setChatPort } from './chat.js'
import { setChatKey } from './chat-key.js'
import { memoryMessageStore, setMessageStore } from './chat-messages.js'
import { createApp } from './create-app.js'
import { memoryFavouriteStore, setFavouriteStore } from './favourites.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { setInvitesPort } from './invites-port.js'
import { memoryInviteStore, setInviteConfigReader, setInviteStore, type InviteConfig } from './invites.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { memoryModerationPort, setModerationPort } from './moderation.js'
import { same_quota_as_brothers } from './operator-config.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { memoryStaffStore } from './staff-store.js'
import { installTestStaff, openTestStaff, signInTestStaff } from './test-staff-session.js'
import { BLOCK_LIST_MAX } from './reports.js'
import { caseSlaState, memoryTrustStore, setReportRateReader, setReportSlaReader, setTrustStore } from './trust.js'
import { setTrustPort } from './trust-port.js'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs') as {
  PNG: {
    new (options: { width: number; height: number }): { data: Buffer; width: number; height: number }
    sync: { write(png: { data: Buffer; width: number; height: number }): Buffer }
  }
}

const srcDir = fileURLToPath(new URL('.', import.meta.url))
const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
const otp = memoryPhoneOtpStore()
const favourites = memoryFavouriteStore()
const invites = memoryInviteStore()
const chat = memoryChatPort()
const messages = memoryMessageStore()
const moderation = memoryModerationPort()
const trust = memoryTrustStore()
const captures = memoryCaptureStore({ accounts: memory.accounts, profiles: memory.profiles, phoneRows: [] })
const staffStore = memoryStaffStore({ memberEmailTaken: (email) => memory.emailTaken(email) })
const chatKey = { key: randomBytes(32), kid: 'test-chat-1' }

let now = new Date('2026-10-23T10:00:00.000Z')
let serial = 0
let billingCalls = 0
let reportRate: number | null = 10
let slaHours: number | null = 24
const config: InviteConfig = { sisterReachMode: same_quota_as_brothers, freeCap: 50, premiumCap: null }

function samplePng(): Buffer {
  const png = new PNG({ width: 8, height: 8 })
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = 40
    png.data[index + 1] = 80
    png.data[index + 2] = 120
    png.data[index + 3] = 255
  }
  return PNG.sync.write(png)
}

type Member = { id: string; email: string; cookie: string }

describe('gates and cap', { timeout: 60_000 }, () => {
  let app: INestApplication
  let base: string
  const png = samplePng()
  const sockets: Socket[] = []

  beforeAll(async () => {
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: '3', hours: '24' }))
    setFreeReviewSlaReader(async () => 24)
    setAuthLimitReader(async () => 1000)
    setBrowseLimitReader(async () => 1000)
    setReportRateReader(async () => reportRate)
    setReportSlaReader(async () => slaHours)
    setMahramPort(undefined)
    setBillingPort({
      async isEntitled() {
        billingCalls += 1
        return false
      },
    })
    setInviteConfigReader(async () => config)
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setFavouriteStore(favourites)
    setInviteStore(invites)
    setChatPort(chat)
    setMessageStore(messages)
    setModerationPort(moderation)
    setTrustStore(trust)
    setTrustPort(undefined)
    setChatKey(chatKey)
    setInvitesPort(undefined)
    setMediaStore(media)
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
    installTestStaff(staffStore)
    setAuditPort(memoryAuditPort([]))
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

  beforeEach(() => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect()
    }
    memory.accounts.length = 0
    memory.credentials.length = 0
    memory.profiles.length = 0
    media.assets.length = 0
    media.derivatives.length = 0
    media.grants.length = 0
    otp.rows.length = 0
    captures.rows.length = 0
    favourites.rows.length = 0
    invites.rows.length = 0
    invites.quota.length = 0
    invites.sisterAcceptedAt.clear()
    chat.conversations.length = 0
    messages.rows.length = 0
    moderation.jobs.length = 0
    moderation.calls.length = 0
    trust.reports.length = 0
    trust.cases.length = 0
    trust.blocks.length = 0
    billingCalls = 0
    reportRate = 10
    slaHours = 24
    now = new Date('2026-10-23T10:00:00.000Z')
    resetAuthRateWindow()
  })

  afterAll(async () => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect()
    }
    setAuthClock(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setPhotoStrikeConfigReader(undefined)
    setFreeReviewSlaReader(undefined)
    setAuthLimitReader(undefined)
    setBrowseLimitReader(undefined)
    setReportRateReader(undefined)
    setReportSlaReader(undefined)
    setMahramPort(undefined)
    setBillingPort(undefined)
    setInviteConfigReader(undefined)
    setInviteStore(undefined)
    setChatPort(undefined)
    setMessageStore(undefined)
    setModerationPort(undefined)
    setTrustStore(undefined)
    setTrustPort(undefined)
    setChatKey(undefined)
    setInvitesPort(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    installTestStaff(undefined)
    setAuditPort(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setProfileStore(undefined)
    setFavouriteStore(undefined)
    setMediaStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  function call(path: string, cookie: string | undefined, method = 'GET', body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {}
    if (cookie) {
      headers.cookie = cookie
    }
    if (body !== undefined) {
      headers['content-type'] = 'application/json'
    }
    const init: RequestInit = { method, headers }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }
    return fetch(`${base}${path}`, init)
  }

  async function member(gender: 'sister' | 'brother'): Promise<Member> {
    serial += 1
    const email = `trust${serial}@example.bf`
    const created = await call('/v1/accounts', undefined, 'POST', {
      email,
      password: 'phrase avec espaces',
      pseudonym: `Trust_${serial}`,
      gender,
      pledge_accepted: true,
      civil_given_name: 'Awa',
      civil_family_name: 'Sawadogo',
      recaptcha_token: 'test-ok',
      coc_version: 'FR-089',
      dob: '1990-01-15',
    })
    expect(created.status).toBe(201)
    const id = ((await created.json()) as { id: string }).id
    const session = await call('/v1/sessions', undefined, 'POST', {
      identifier: email,
      password: 'phrase avec espaces',
      remember_me: false,
      recaptcha_token: 'test-ok',
    })
    expect(session.status).toBe(201)
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(session.headers.getSetCookie().join('\n'))
    const cookie = `${SESSION_COOKIE}=${match?.[1] ?? ''}`
    const saved = await call('/v1/me/profile', cookie, 'PUT', {
      dob: '1990-01-15',
      city: 'ouagadougou',
      country: 'BF',
      profession: 'ingenierie',
      marital_status: 'single',
      polygamy_intent: 'no',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
    })
    expect(saved.status).toBe(200)
    const profile = memory.profiles.find((item) => item.account_id === id)
    if (profile) {
      profile.visibility = 'public'
    }
    const posted = await call('/v1/media', cookie, 'POST', { kind: 'profile_photo', image: png.toString('base64') })
    expect(posted.status).toBe(201)
    const assetId = ((await posted.json()) as { id: string }).id
    const asset = media.assets.find((row) => row.id === assetId)
    if (asset) {
      asset.moderation_state = 'live'
      asset.is_main = true
    }
    return { id, email, cookie }
  }

  async function connected(): Promise<{ brother: Member; sister: Member; conversationId: string }> {
    const brother = await member('brother')
    const sister = await member('sister')
    now = new Date(now.getTime() + 1000)
    const sent = await call('/v1/invites', brother.cookie, 'POST', { to_id: sister.id })
    expect(sent.status).toBe(201)
    const inviteId = ((await sent.json()) as { invite: { id: string } }).invite.id
    const accepted = await call(`/v1/invites/${inviteId}/accept`, sister.cookie, 'POST')
    expect(accepted.status).toBe(200)
    const conversationId = ((await accepted.json()) as { conversation: { id: string } }).conversation.id
    billingCalls = 0
    return { brother, sister, conversationId }
  }

  async function sendText(who: Member, conversationId: string, text: string): Promise<Response> {
    now = new Date(now.getTime() + 1000)
    return call(`/v1/conversations/${conversationId}/messages`, who.cookie, 'POST', { kind: 'text', text })
  }

  function report(who: Member | undefined, body: unknown): Promise<Response> {
    return call('/v1/reports', who?.cookie, 'POST', body)
  }

  async function browseIds(who: Member): Promise<string[]> {
    const grid = await call('/v1/browse?view=grid', who.cookie)
    expect(grid.status).toBe(200)
    return ((await grid.json()) as { items: Array<{ id: string }> }).items.map((item) => item.id)
  }

  async function staffMetrics(cookie: string): Promise<{ reports: { sla_hours: number; open: number; sla_breach: number; oldest_open_started_at: string | null } }> {
    const response = await call('/v1/staff/metrics', cookie)
    expect(response.status).toBe(200)
    return (await response.json()) as { reports: { sla_hours: number; open: number; sla_breach: number; oldest_open_started_at: string | null } }
  }

  function connectedSocket(who: Member): Promise<Socket> {
    const socket = connectSocket(base, {
      path: '/v1/realtime',
      addTrailingSlash: false,
      transports: ['websocket'],
      extraHeaders: { cookie: who.cookie },
      reconnection: false,
      forceNew: true,
    })
    sockets.push(socket)
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket))
      socket.once('connect_error', (error) => reject(error))
    })
  }

  function noEvent(socket: Socket, name: string, waitMs = 600): Promise<void> {
    return new Promise((resolve, reject) => {
      const onEvent = () => reject(new Error(`unexpected ${name}`))
      socket.once(name, onEvent)
      setTimeout(() => {
        socket.off(name, onEvent)
        resolve()
      }, waitMs)
    })
  }
  it('staff / mahram / no session never pass the member-only gate on the four safety paths', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    const account = memory.accounts.find((item) => item.id === sister.id) as { roles: string[] }
    const calls = (who: Member | undefined) => [
      call('/v1/blocks', who?.cookie),
      call(`/v1/blocks/${brother.id}`, who?.cookie, 'DELETE'),
      call('/v1/blocks', who?.cookie, 'POST', { blocked_id: brother.id }),
      call('/v1/reports', who?.cookie, 'POST', { target_kind: 'profile', target_id: brother.id, reason: 'harassment' }),
    ]
    for (const r of await Promise.all(calls(undefined))) expect(r.status).toBe(401)
    for (const [roles, reason] of [[['moderator'], 'staff_session'], [['operator'], 'staff_session'], [['mahram'], 'mahram_session'], [[], 'mahram_session']] as const) {
      account.roles = [...roles]
      for (const r of await Promise.all(calls(sister))) {
        expect(r.status, roles.join()).toBe(403)
        expect(await r.json(), roles.join()).toMatchObject({ error: { details: { reason } } })
      }
    }
    account.roles = ['member']
    expect(trust.blocks).toHaveLength(1)
    expect(trust.reports).toHaveLength(0)
    // staff session too
    const staff = await openTestStaff(base, staffStore, 'moderator')
    for (const r of await Promise.all(calls({ ...sister, cookie: staff.cookie }))) expect(r.status).toBe(403)
  })

  it('every non-listable state still gets the safety paths, and browse / invites / chat / favourites / filters stay gated', async () => {
    const { brother, sister, conversationId } = await connected()
    const third = await member('brother')
    const profile = memory.profiles.find((item) => item.account_id === sister.id)!
    const account = memory.accounts.find((item) => item.id === sister.id)!
    const states = [
      ['unpublished', 'Active'], ['held', 'Active'], ['private', 'Active'], [null, 'Active'],
      ['public', 'deactivated'], ['public', 'held'], ['public', 'pending_deletion'],
    ] as const
    for (const [vis, status] of states) {
      profile.visibility = vis as never
      account.status = status as never
      const label = `${vis}/${status}`
      for (const path of ['/v1/browse?view=grid', `/v1/profiles/${third.id}`, '/v1/favourites', '/v1/invites', '/v1/conversations', `/v1/conversations/${conversationId}`, '/v1/filters']) {
        const r = await call(path, sister.cookie)
        expect(r.status, `${label} GET ${path}`).toBe(403)
      }
      expect((await call('/v1/invites', sister.cookie, 'POST', { to_id: third.id })).status, label).toBe(403)
      expect((await call('/v1/favourites', sister.cookie, 'POST', { target_id: third.id })).status, label).toBe(403)
      expect((await sendText(sister, conversationId, 'x')).status, label).toBe(403)
      now = new Date(now.getTime() + 1000)
      expect((await call('/v1/reports', sister.cookie, 'POST', { target_kind: 'profile', target_id: third.id, reason: 'harassment', block: true })).status, label).toBe(201)
      expect(((await (await call('/v1/blocks', sister.cookie)).json()) as { count: number }).count, label).toBe(1)
      // target rules still apply: same-gender and unknown targets are 404, self is 400
      const sis2 = await member('sister')
      expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: sis2.id })).status, label).toBe(404)
      expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: sister.id })).status, label).toBe(400)
      expect((await call(`/v1/blocks/${third.id}`, sister.cookie, 'DELETE')).status, label).toBe(200)
      // and the other member is not affected by her state
      expect((await call(`/v1/profiles/${sister.id}`, brother.cookie)).status, `${label} brother sees listable-less sister`).toBe(404)
    }
    expect(billingCalls).toBe(0)
  })

  it('cap of 100, has_more, newest first, count matches', async () => {
    const sister = await member('sister')
    const ids: string[] = []
    const brothers = [] as Member[]
    for (let i = 0; i < 3; i++) brothers.push(await member('brother'))
    const mkRow = (blocked: string, offset: number) => {
      const at = new Date(now.getTime() + offset * 1000)
      return { id: newId(at), blocker_id: sister.id, blocked_id: blocked, created_at: at.toISOString() }
    }
    // 99 extra rows pointing at the 3 real accounts is not unique; use fake ids for ghosts (left out by the list) plus 3 real
    for (let i = 0; i < 98; i++) { const gid = newId(new Date(now.getTime() + i)); ids.push(gid); trust.blocks.push(mkRow(gid, i)) }
    for (const [i, b] of brothers.entries()) trust.blocks.push(mkRow(b.id, 1000 + i))
    // 101 rows total
    const body = (await (await call('/v1/blocks', sister.cookie)).json()) as { count: number; has_more: boolean; items: Array<{ blocked_id: string }> }
    expect(trust.blocks).toHaveLength(101)
    expect(body.has_more).toBe(true)
    expect(body.items.map((i) => i.blocked_id).slice(0, 3)).toEqual([brothers[2]!.id, brothers[1]!.id, brothers[0]!.id])
    expect(body.count).toBe(body.items.length)
    // ghost accounts are left out, so count < 100 even though the cap row count was 100
    expect(body.count).toBe(3)
    // exactly 100 -> has_more false
    trust.blocks.splice(0, 1)
    const b2 = (await (await call('/v1/blocks', sister.cookie)).json()) as { has_more: boolean }
    expect(trust.blocks).toHaveLength(100)
    expect(b2.has_more).toBe(false)
    // an older real Block beyond the cap is not shown but can still be lifted
  })

  it('F-2 own id and F-4 upper-case', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    expect((await call('/v1/blocks', brother.cookie, 'POST', { blocked_id: sister.id })).status).toBe(201)
    expect((await call(`/v1/blocks/${sister.id}`, sister.cookie, 'DELETE')).status).toBe(404)
    expect(trust.blocks).toHaveLength(1)
    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    expect((await call(`/v1/blocks/${brother.id.toUpperCase()}`, sister.cookie, 'DELETE')).status).toBe(200)
    expect(trust.blocks).toHaveLength(1)
  })
})
