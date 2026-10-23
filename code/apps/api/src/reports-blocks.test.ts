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

describe('Report with a 24h SLA (8.5) and Block (8.6)', { timeout: 60_000 }, () => {
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

  it('AC 8.5-1: a Profile Report opens one moderation_case whose sla_started_at is the submit time', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    now = new Date('2026-10-23T11:22:33.000Z')
    const response = await report(sister, {
      target_kind: 'profile',
      target_id: brother.id,
      reason: 'harassment',
      details: '  Messages insistants après un refus.  ',
    })
    expect(response.status).toBe(201)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body).toEqual({
      report: { id: expect.any(String), target_kind: 'profile', reason: 'harassment', sla_started_at: '2026-10-23T11:22:33.000Z' },
      case: { id: expect.any(String), sla_started_at: '2026-10-23T11:22:33.000Z', sla_state: 'open' },
      blocked: false,
      sla_hours: 24,
    })
    expect(trust.reports).toEqual([
      {
        id: body.report.id,
        reporter_id: sister.id,
        target_kind: 'profile',
        target_id: brother.id,
        reported_account_id: brother.id,
        conversation_id: null,
        reason: 'harassment',
        details: 'Messages insistants après un refus.',
        sla_started_at: '2026-10-23T11:22:33.000Z',
        first_human_at: null,
      },
    ])
    expect(trust.cases).toEqual([
      { id: body.case.id, report_id: body.report.id, flag_queue_id: null, sla_started_at: '2026-10-23T11:22:33.000Z', first_human_at: null },
    ])
    expect(trust.blocks).toEqual([])
    // A safety path: no BillingPort, and no moderation_job (the passive scan is moderation's, not a Report's).
    expect(billingCalls).toBe(0)
    expect(moderation.jobs).toEqual([])
  })

  it('AC 4.4-3: « misrepresented marital status » is a Report reason, in the one shared list the API and web use', async () => {
    expect(REPORT_REASON_CODES).toContain('misrepresented_marital_status')
    expect(REPORT_REASONS.find((item) => item.code === 'misrepresented_marital_status')?.label).toBe(
      'Dissimulation ou fausse déclaration de situation matrimoniale',
    )
    const sister = await member('sister')
    const brother = await member('brother')
    const response = await report(sister, { target_kind: 'profile', target_id: brother.id, reason: 'misrepresented_marital_status' })
    expect(response.status).toBe(201)
    expect(trust.reports[0]?.reason).toBe('misrepresented_marital_status')
    // Every published reason is accepted.
    for (const code of REPORT_REASON_CODES) {
      now = new Date(now.getTime() + 1000)
      reportRate = 1000
      expect((await report(sister, { target_kind: 'profile', target_id: brother.id, reason: code })).status, code).toBe(201)
    }
  })

  it('AC 8.5-1 from Chat: a message Report references the message id and its conversation; only the other member\'s message', async () => {
    const { brother, sister, conversationId } = await connected()
    const his = await sendText(brother, conversationId, 'Envoyez-moi de l’argent pour le transport.')
    const hers = await sendText(sister, conversationId, 'Non, merci.')
    const hisId = ((await his.json()) as { message: { id: string } }).message.id
    const hersId = ((await hers.json()) as { message: { id: string } }).message.id

    const response = await report(sister, { target_kind: 'message', target_id: hisId, reason: 'money_scam', block: false })
    expect(response.status).toBe(201)
    expect(trust.reports[0]).toMatchObject({
      reporter_id: sister.id,
      target_kind: 'message',
      target_id: hisId,
      reported_account_id: brother.id,
      conversation_id: conversationId,
      reason: 'money_scam',
      details: null,
    })
    expect(trust.cases).toHaveLength(1)
    // The Report stores ids only, never the message text.
    expect(JSON.stringify(trust.reports)).not.toContain('argent')

    // My own message, a stranger's attempt, and an unknown id are the same 404, and write nothing.
    const stranger = await member('sister')
    const refusals: Array<[Member, string]> = [
      [sister, hersId],
      [stranger, hisId],
      [sister, newId(now)],
    ]
    for (const [who, id] of refusals) {
      const refused = await report(who, { target_kind: 'message', target_id: id, reason: 'money_scam' })
      expect(refused.status).toBe(404)
      expect(await refused.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Ce message est introuvable.' } })
    }
    expect(trust.reports).toHaveLength(1)
    expect(trust.cases).toHaveLength(1)
  })

  it('validates the body and the target, and writes nothing on a refusal', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const otherSister = await member('sister')
    const cases: Array<[unknown, number, string, unknown]> = [
      [{ target_kind: 'photo', target_id: brother.id, reason: 'hateful' }, 400, 'target_kind : valeur non reconnue.', { field: 'target_kind' }],
      [{ target_id: brother.id, reason: 'hateful' }, 400, 'target_kind : valeur non reconnue.', { field: 'target_kind' }],
      [{ target_kind: 'profile', target_id: 'abc', reason: 'hateful' }, 400, 'target_id : valeur non reconnue.', { field: 'target_id' }],
      [{ target_kind: 'profile', target_id: brother.id }, 400, 'Choisissez un motif.', { field: 'reason' }],
      [{ target_kind: 'profile', target_id: brother.id, reason: 'other' }, 400, 'Choisissez un motif.', { field: 'reason' }],
      [{ target_kind: 'profile', target_id: brother.id, reason: 'hateful', details: 42 }, 400, 'details : valeur non reconnue.', { field: 'details' }],
      [
        { target_kind: 'profile', target_id: brother.id, reason: 'hateful', details: 'é'.repeat(1001) },
        400,
        'Précisions trop longues (1000 caractères au plus).',
        { field: 'details', max: 1000 },
      ],
      [{ target_kind: 'profile', target_id: brother.id, reason: 'hateful', block: 'yes' }, 400, 'block : valeur non reconnue.', { field: 'block' }],
      [{ target_kind: 'profile', target_id: sister.id, reason: 'hateful' }, 404, "Ce profil n'est pas disponible.", null],
      [{ target_kind: 'profile', target_id: otherSister.id, reason: 'hateful' }, 404, "Ce profil n'est pas disponible.", null],
      [{ target_kind: 'profile', target_id: newId(now), reason: 'hateful' }, 404, "Ce profil n'est pas disponible.", null],
    ]
    for (const [body, status, message, details] of cases) {
      const response = await report(sister, body)
      expect(response.status, JSON.stringify(body)).toBe(status)
      expect(await response.json()).toMatchObject({ error: { message, details } })
    }
    expect(trust.reports).toEqual([])
    expect(trust.cases).toEqual([])
    // 1000 characters is the boundary, allowed.
    expect((await report(sister, { target_kind: 'profile', target_id: brother.id, reason: 'hateful', details: 'é'.repeat(1000) })).status).toBe(201)
  })

  it('refuses no session and staff sessions, and rate-limits Reports per hour from operator_config', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const body = { target_kind: 'profile', target_id: brother.id, reason: 'hateful' }
    expect((await report(undefined, body)).status).toBe(401)
    expect((await call('/v1/blocks', undefined, 'POST', { blocked_id: brother.id })).status).toBe(401)
    const staff = await openTestStaff(base, staffStore, 'moderator')
    const staffCall = await call('/v1/reports', staff.cookie, 'POST', body)
    expect(staffCall.status).toBe(403)
    expect(await staffCall.json()).toMatchObject({ error: { code: 'FORBIDDEN', details: { reason: 'staff_session' } } })
    expect((await call('/v1/blocks', staff.cookie, 'POST', { blocked_id: brother.id })).status).toBe(403)
    expect(trust.reports).toEqual([])
    expect(trust.blocks).toEqual([])

    reportRate = 3
    for (let index = 0; index < 3; index += 1) {
      now = new Date(now.getTime() + 1000)
      expect((await report(sister, body)).status).toBe(201)
    }
    const limited = await report(sister, body)
    expect(limited.status).toBe(429)
    expect(await limited.json()).toMatchObject({
      error: { code: 'RATE_LIMITED', message: 'Trop de signalements en peu de temps. Réessayez plus tard.', retryable: true },
    })
    expect(trust.reports).toHaveLength(3)
    // An hour later the window has moved on.
    now = new Date(now.getTime() + 60 * 60 * 1000 + 1000)
    expect((await report(sister, body)).status).toBe(201)
    // An unreadable rate config fails closed for Reports (503), and still writes nothing.
    reportRate = null
    expect((await report(sister, body)).status).toBe(503)
    expect(trust.reports).toHaveLength(4)
  })

  it('AC 8.5-2: a case with no first human touch after 24 h is SLA-breach in operator metrics', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const operator = await openTestStaff(base, staffStore, 'operator')
    expect((await staffMetrics(operator.cookie)).reports).toEqual({ sla_hours: 24, open: 0, sla_breach: 0, oldest_open_started_at: null })

    now = new Date('2026-10-23T08:00:00.000Z')
    expect((await report(sister, { target_kind: 'profile', target_id: brother.id, reason: 'hateful' })).status).toBe(201)
    now = new Date('2026-10-23T20:00:00.000Z')
    expect((await report(brother, { target_kind: 'profile', target_id: sister.id, reason: 'non_matrimonial' })).status).toBe(201)

    // 23 h 59 after the first submit: open, not breached.
    now = new Date('2026-10-24T07:59:00.000Z')
    let cookie = await signInTestStaff(base, staffStore, operator)
    expect((await staffMetrics(cookie)).reports).toEqual({
      sla_hours: 24,
      open: 2,
      sla_breach: 0,
      oldest_open_started_at: '2026-10-23T08:00:00.000Z',
    })

    // Past 24 h with no first human: the first case is SLA-breach, the second is still inside its window.
    now = new Date('2026-10-24T08:00:01.000Z')
    cookie = await signInTestStaff(base, staffStore, operator)
    expect((await staffMetrics(cookie)).reports).toMatchObject({ open: 2, sla_breach: 1 })

    // A first human touch (Story 8.7 writes it) takes the case out of the open count.
    const first = trust.cases.find((row) => row.sla_started_at === '2026-10-23T08:00:00.000Z')
    if (first) {
      first.first_human_at = '2026-10-24T08:30:00.000Z'
    }
    expect((await staffMetrics(cookie)).reports).toMatchObject({ open: 1, sla_breach: 0 })

    // The operator SLA is read from operator_config, not hardcoded.
    slaHours = 6
    expect((await staffMetrics(cookie)).reports).toMatchObject({ sla_hours: 6, open: 1, sla_breach: 1 })
    slaHours = null
    expect((await call('/v1/staff/metrics', cookie)).status).toBe(503)
    // Members cannot read operator metrics.
    expect((await call('/v1/staff/metrics', sister.cookie)).status).toBe(401)
  })

  it('caseSlaState names the four SLA states at the 24 h boundary', () => {
    const start = '2026-10-23T10:00:00.000Z'
    const at = (iso: string) => new Date(iso)
    expect(caseSlaState({ sla_started_at: start, first_human_at: null }, at('2026-10-24T10:00:00.000Z'), 24)).toBe('open')
    expect(caseSlaState({ sla_started_at: start, first_human_at: null }, at('2026-10-24T10:00:00.001Z'), 24)).toBe('sla_breach')
    expect(caseSlaState({ sla_started_at: start, first_human_at: '2026-10-24T09:00:00.000Z' }, at('2026-10-30T00:00:00.000Z'), 24)).toBe(
      'first_touch_in_sla',
    )
    expect(caseSlaState({ sla_started_at: start, first_human_at: '2026-10-24T11:00:00.000Z' }, at('2026-10-30T00:00:00.000Z'), 24)).toBe(
      'first_touch_late',
    )
  })

  it('a Report with block: true also writes the Block in the same submit, once', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const first = await report(sister, { target_kind: 'profile', target_id: brother.id, reason: 'indecency', block: true })
    expect(first.status).toBe(201)
    expect(await first.json()).toMatchObject({ blocked: true })
    now = new Date(now.getTime() + 1000)
    expect((await report(sister, { target_kind: 'profile', target_id: brother.id, reason: 'harassment', block: true })).status).toBe(201)
    expect(trust.reports).toHaveLength(2)
    expect(trust.cases).toHaveLength(2)
    expect(trust.blocks).toEqual([{ id: expect.any(String), blocker_id: sister.id, blocked_id: brother.id, created_at: expect.any(String) }])
  })

  it('POST /v1/blocks: 201 then 200 for the same pair; self, malformed, unknown and same-gender targets are refused', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const otherSister = await member('sister')
    const created = await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })
    expect(created.status).toBe(201)
    expect(created.headers.get('cache-control')).toBe('no-store')
    expect(await created.json()).toEqual({ block: { blocked_id: brother.id, created_at: now.toISOString() } })
    const again = await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })
    expect(again.status).toBe(200)
    expect(trust.blocks).toHaveLength(1)

    for (const body of [{ blocked_id: sister.id }, { blocked_id: 'x' }, {}, []]) {
      const refused = await call('/v1/blocks', sister.cookie, 'POST', body)
      expect(refused.status).toBe(400)
      expect(await refused.json()).toMatchObject({ error: { message: 'blocked_id : valeur non reconnue.', details: { field: 'blocked_id' } } })
    }
    for (const id of [otherSister.id, newId(now)]) {
      const refused = await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: id })
      expect(refused.status).toBe(404)
      expect(await refused.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible." } })
    }
    expect(trust.blocks).toHaveLength(1)
    expect(billingCalls).toBe(0)
  })

  it('AC 8.6-1: after a Block my Profile is absent when they browse, open it, or list favourites; and theirs for me', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const otherBrother = await member('brother')
    expect((await call('/v1/favourites', brother.cookie, 'POST', { target_id: sister.id })).status).toBe(201)
    expect(await browseIds(brother)).toContain(sister.id)
    expect((await call(`/v1/profiles/${sister.id}`, brother.cookie)).status).toBe(200)

    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)

    // The blocked member: grid, card, profile detail and favourites no longer show her.
    expect(await browseIds(brother)).not.toContain(sister.id)
    const card = (await (await call('/v1/browse', brother.cookie)).json()) as { item: { id: string } | null }
    expect(card.item?.id ?? null).not.toBe(sister.id)
    const detail = await call(`/v1/profiles/${sister.id}`, brother.cookie)
    expect(detail.status).toBe(404)
    expect(await detail.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible." } })
    const listed = (await (await call('/v1/favourites', brother.cookie)).json()) as { items: Array<{ target_id: string }> }
    expect(listed.items.map((item) => item.target_id)).not.toContain(sister.id)
    expect((await call('/v1/favourites', brother.cookie, 'POST', { target_id: sister.id })).status).toBe(404)

    // Both ways: she no longer sees him either. Another brother is unaffected.
    expect(await browseIds(sister)).not.toContain(brother.id)
    expect(await browseIds(sister)).toContain(otherBrother.id)
    expect((await call(`/v1/profiles/${brother.id}`, sister.cookie)).status).toBe(404)
    expect(await browseIds(otherBrother)).toContain(sister.id)
    expect(billingCalls).toBe(0)
  })

  it('AC 8.6-2: the API rejects an Invite either way after a Block, and a pending Invite can no longer be accepted', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const later = await member('brother')
    now = new Date(now.getTime() + 1000)
    const pending = await call('/v1/invites', later.cookie, 'POST', { to_id: sister.id })
    expect(pending.status).toBe(201)
    const pendingId = ((await pending.json()) as { invite: { id: string } }).invite.id

    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: later.id })).status).toBe(201)
    const before = invites.rows.length
    for (const [from, to] of [[brother, sister], [sister, brother]] as const) {
      now = new Date(now.getTime() + 1000)
      const refused = await call('/v1/invites', from.cookie, 'POST', { to_id: to.id })
      expect(refused.status).toBe(404)
      expect(await refused.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible." } })
    }
    expect(invites.rows.length).toBe(before)

    // His pending Invite shows him as unavailable, and her accept is refused: no conversation opens.
    const box = (await (await call('/v1/invites?box=received', sister.cookie)).json()) as { items: Array<{ id: string; other: { available: boolean } }> }
    expect(box.items.find((item) => item.id === pendingId)?.other).toEqual({ available: false })
    const accept = await call(`/v1/invites/${pendingId}/accept`, sister.cookie, 'POST')
    expect(accept.status).toBe(404)
    expect(chat.conversations).toHaveLength(0)
  })

  it('AC 8.6-2: an existing conversation closes for both; Chat sends are rejected either way and typing is not relayed', async () => {
    const { brother, sister, conversationId } = await connected()
    expect((await sendText(brother, conversationId, 'Bonjour.')).status).toBe(201)
    const herSocket = await connectedSocket(sister)
    const hisSocket = await connectedSocket(brother)

    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)

    for (const who of [brother, sister]) {
      const refused = await sendText(who, conversationId, 'Encore un message')
      expect(refused.status).toBe(409)
      expect(await refused.json()).toMatchObject({
        error: { code: 'UNHANDLED', message: 'Cette discussion est fermée.', details: { reason: 'conversation_closed' } },
      })
      const head = (await (await call(`/v1/conversations/${conversationId}`, who.cookie)).json()) as {
        conversation: { closed: boolean; other: { available: boolean }; pseudonym: string | null }
      }
      expect(head.conversation.closed).toBe(true)
      expect(head.conversation.other).toEqual({ available: false })
      const list = (await (await call('/v1/conversations', who.cookie)).json()) as { items: Array<{ id: string; other: { available: boolean } }> }
      expect(list.items.find((item) => item.id === conversationId)?.other).toEqual({ available: false })
    }
    expect(messages.rows).toHaveLength(1)
    expect(moderation.calls).toHaveLength(1)

    // Over the socket: typing from either side reaches nobody.
    const quietHim = noEvent(hisSocket, 'conversation.typing')
    const quietHer = noEvent(herSocket, 'conversation.typing')
    herSocket.emit('conversation.typing', { conversation_id: conversationId })
    hisSocket.emit('conversation.typing', { conversation_id: conversationId })
    await Promise.all([quietHim, quietHer])

    // The history stays readable for both (it is their own, and evidence for a Report).
    const page = await call(`/v1/conversations/${conversationId}/messages`, sister.cookie)
    expect(page.status).toBe(200)
    // And she can still Report his earlier message after blocking.
    const messageId = messages.rows[0]?.id ?? ''
    expect((await report(sister, { target_kind: 'message', target_id: messageId, reason: 'harassment' })).status).toBe(201)
    expect(billingCalls).toBe(0)
  })

  it('a Block by the brother hides and closes the same way (no one learns who blocked whom)', async () => {
    const { brother, sister, conversationId } = await connected()
    expect((await call('/v1/blocks', brother.cookie, 'POST', { blocked_id: sister.id })).status).toBe(201)
    const theirs = await sendText(sister, conversationId, 'Bonjour ?')
    expect(theirs.status).toBe(409)
    expect(await browseIds(sister)).not.toContain(brother.id)
    expect((await call(`/v1/profiles/${brother.id}`, sister.cookie)).status).toBe(404)
  })
})

describe('trust boundaries (AD-3, AD-10, AD-21)', () => {
  const sources = readdirSync(srcDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))

  it('only trust.ts writes report, moderation_case and block; trust never writes moderation_job', () => {
    for (const table of ['report', 'moderationCase', 'block']) {
      const writers = sources.filter((name) =>
        new RegExp(`\\.(insert|update|delete)\\(\\s*${table}\\b`).test(readFileSync(join(srcDir, name), 'utf8')),
      )
      expect(writers, table).toEqual(['trust.ts'])
    }
    expect(readFileSync(join(srcDir, 'trust.ts'), 'utf8')).not.toMatch(/\bmoderationJob\b|\bflagQueue\b/)
    expect(readFileSync(join(srcDir, 'moderation.ts'), 'utf8')).not.toMatch(/moderationCase|\breport\b|\bblock\b/)
  })

  it('no module but trust reads the block table; the others ask TrustPort', () => {
    const readers = sources.filter((name) => /from\(\s*block\b/.test(readFileSync(join(srcDir, name), 'utf8')))
    expect(readers).toEqual(['trust.ts'])
  })

  it('Report and Block never reach BillingPort', () => {
    for (const name of ['trust.ts', 'trust-port.ts', 'reports.ts', 'trust.controller.ts']) {
      expect(readFileSync(join(srcDir, name), 'utf8'), name).not.toMatch(/billing-port|isEntitled|getBillingPort/)
    }
  })

  it('the migration reason check lists exactly the shared Report reasons', () => {
    const sql = readFileSync(join(srcDir, '..', 'drizzle', '0024_report_block.sql'), 'utf8')
    const match = /"report_reason_check" CHECK \("report"\."reason" in \(([^)]*)\)\)/.exec(sql)
    const listed = (match?.[1] ?? '').split(',').map((part) => part.trim().replace(/^'|'$/g, ''))
    expect(listed).toEqual([...REPORT_REASON_CODES])
  })
})
