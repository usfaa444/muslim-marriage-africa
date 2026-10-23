import { createRequire } from 'node:module'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import type { BillingAnswer } from '@ankanu/ports'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { createApp } from './create-app.js'
import { memoryFavouriteStore, setFavouriteStore } from './favourites.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { memoryChatPort, setChatPort } from './chat.js'
import { getInvitesPort, setInvitesPort } from './invites-port.js'
import { memoryInviteStore, setInviteConfigReader, setInviteStore, type InviteConfig } from './invites.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { same_quota_as_brothers } from './operator-config.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

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
const captures = memoryCaptureStore({ accounts: memory.accounts, profiles: memory.profiles, phoneRows: [] })

// 10:00 in Ouagadougou (UTC+0) on 2026-10-23.
let now = new Date('2026-10-23T10:00:00.000Z')
let serial = 0
let billingCalls = 0
let billingAnswer: BillingAnswer | 'throw' = false
let config: InviteConfig = { sisterReachMode: same_quota_as_brothers, freeCap: 3, premiumCap: null }

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

describe('Invite inbox, accept and quiet decline (Stories 4.4, 4.5)', { timeout: 60_000 }, () => {
  let app: INestApplication
  let base: string
  const png = samplePng()

  beforeAll(async () => {
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: '3', hours: '24' }))
    setFreeReviewSlaReader(async () => 24)
    setAuthLimitReader(async () => 1000)
    setBrowseLimitReader(async () => 1000)
    setMahramPort(undefined)
    setBillingPort({
      async isEntitled() {
        billingCalls += 1
        if (billingAnswer === 'throw') {
          throw new Error('billing adapter down')
        }
        return billingAnswer
      },
    })
    setInviteConfigReader(async () => config)
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setFavouriteStore(favourites)
    setInviteStore(invites)
    setChatPort(chat)
    setInvitesPort(undefined)
    setMediaStore(media)
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
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
    billingCalls = 0
    billingAnswer = false
    config = { sisterReachMode: same_quota_as_brothers, freeCap: 3, premiumCap: null }
    now = new Date('2026-10-23T10:00:00.000Z')
    resetAuthRateWindow()
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setPhotoStrikeConfigReader(undefined)
    setFreeReviewSlaReader(undefined)
    setAuthLimitReader(undefined)
    setBrowseLimitReader(undefined)
    setMahramPort(undefined)
    setBillingPort(undefined)
    setInviteConfigReader(undefined)
    setInviteStore(undefined)
    setChatPort(undefined)
    setInvitesPort(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
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

  async function createAccount(gender: 'sister' | 'brother'): Promise<{ id: string; email: string }> {
    serial += 1
    const email = `inv${serial}@example.bf`
    const response = await call('/v1/accounts', undefined, 'POST', {
      email,
      password: 'phrase avec espaces',
      pseudonym: `Inv_${serial}`,
      gender,
      pledge_accepted: true,
      civil_given_name: 'Awa',
      civil_family_name: 'Sawadogo',
      recaptcha_token: 'test-ok',
      coc_version: 'FR-089',
      dob: '1990-01-15',
    })
    expect(response.status).toBe(201)
    const json = (await response.json()) as { id: string }
    return { id: json.id, email }
  }

  async function signIn(email: string): Promise<string> {
    const response = await call('/v1/sessions', undefined, 'POST', {
      identifier: email,
      password: 'phrase avec espaces',
      remember_me: false,
      recaptcha_token: 'test-ok',
    })
    expect(response.status).toBe(201)
    const cookie = response.headers.getSetCookie().join('\n')
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie)
    return `${SESSION_COOKIE}=${match?.[1] ?? ''}`
  }

  async function publish(id: string, cookie: string): Promise<void> {
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
    const row = memory.profiles.find((item) => item.account_id === id)
    if (row) {
      row.visibility = 'public'
    }
  }

  async function liveMain(ownerCookie: string): Promise<void> {
    const posted = await call('/v1/media', ownerCookie, 'POST', { kind: 'profile_photo', image: png.toString('base64') })
    expect(posted.status).toBe(201)
    const json = (await posted.json()) as { id: string }
    const asset = media.assets.find((row) => row.id === json.id)
    if (asset) {
      asset.moderation_state = 'live'
      asset.is_main = true
    }
  }

  /** A listable member. `photo: false` leaves her without a live MAIN Profile Photo. */
  async function member(gender: 'sister' | 'brother', photo = true): Promise<Member> {
    const created = await createAccount(gender)
    const cookie = await signIn(created.email)
    await publish(created.id, cookie)
    if (photo) {
      await liveMain(cookie)
    }
    return { ...created, cookie }
  }

  async function members(gender: 'sister' | 'brother', total: number): Promise<Member[]> {
    const list: Member[] = []
    for (let index = 0; index < total; index += 1) {
      list.push(await member(gender))
    }
    return list
  }

  function send(from: Member, to: { id: string }): Promise<Response> {
    return call('/v1/invites', from.cookie, 'POST', { to_id: to.id })
  }


  function setStatus(id: string, status: string): void {
    const row = memory.accounts.find((item) => item.id === id)
    if (row) {
      ;(row as { status: string }).status = status
    }
  }

  function setVisibility(id: string, visibility: string): void {
    const row = memory.profiles.find((item) => item.account_id === id)
    if (row) {
      row.visibility = visibility
    }
  }

  async function declare(who: Member, marital: string, polygamy: string): Promise<void> {
    const saved = await call('/v1/me/profile', who.cookie, 'PUT', {
      dob: '1990-01-15',
      city: 'ouagadougou',
      country: 'BF',
      profession: 'ingenierie',
      marital_status: marital,
      polygamy_intent: polygamy,
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
    })
    expect(saved.status).toBe(200)
    setVisibility(who.id, 'public')
  }

  function grantId(accountId: string): void {
    for (const kind of ['id_document', 'liveness'] as const) {
      now = new Date(now.getTime() + 1)
      captures.rows.push({
        id: newId(now),
        account_id: accountId,
        kind,
        status: 'granted',
        vendor: null,
        evidence_uri: 'memory',
        phone_e164: null,
        hash: null,
        expires_at: null,
      })
    }
  }

  async function invited(from: Member, to: Member): Promise<string> {
    now = new Date(now.getTime() + 1000)
    const sent = await send(from, to)
    expect(sent.status).toBe(201)
    return ((await sent.json()) as { invite: { id: string } }).invite.id
  }

  function accept(by: Member | undefined, id: string): Promise<Response> {
    return call(`/v1/invites/${id}/accept`, by?.cookie, 'POST')
  }

  function decline(by: Member | undefined, id: string): Promise<Response> {
    return call(`/v1/invites/${id}/decline`, by?.cookie, 'POST')
  }

  type Item = {
    id: string
    state: string
    direction: string
    other_id: string
    pseudonym: string | null
    conversation_id: string | null
    other: Record<string, unknown>
  }

  async function box(who: Member, name: 'received' | 'sent' | 'accepted'): Promise<Item[]> {
    const listed = await call(`/v1/invites?box=${name}`, who.cookie)
    expect(listed.status).toBe(200)
    expect(listed.headers.get('cache-control')).toBe('no-store')
    const body = (await listed.json()) as { box: string; count: number; items: Item[] }
    expect(body.box).toBe(name)
    expect(body.count).toBe(body.items.length)
    return body.items
  }

  async function threads(who: Member): Promise<Array<{ id: string; invite_id: string; stage: string; other_id: string }>> {
    const listed = await call('/v1/conversations', who.cookie)
    expect(listed.status).toBe(200)
    expect(listed.headers.get('cache-control')).toBe('no-store')
    const body = (await listed.json()) as { count: number; items: Array<{ id: string; invite_id: string; stage: string; other_id: string }> }
    expect(body.count).toBe(body.items.length)
    return body.items
  }

  /** Keys that would tell the sender when or whether she read or decided (FR-042). */
  const RECEIPT_KEYS = /"(read_at|seen_at|seen|opened_at|viewed_at|decided_at|declined_at|accepted_at|sister_accepted_at|expires_at|reason)"/

  it('AC 4.4-1: a pending Brother-sent Invite shows his marital status and polygamy intent on Received before accept', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    await declare(brother, 'married', 'yes')
    grantId(brother.id)
    const id = await invited(brother, sister)
    billingCalls = 0

    const received = await box(sister, 'received')
    expect(received).toEqual([
      {
        id,
        state: 'pending',
        created_at: expect.any(String),
        direction: 'received',
        from_id: brother.id,
        other_id: brother.id,
        pseudonym: expect.stringMatching(/^Inv_/),
        conversation_id: null,
        other: {
          available: true,
          age: expect.any(Number),
          city: 'ouagadougou',
          marital_status: 'married',
          polygamy_intent: 'yes',
          verified: true,
          photo: { id: expect.any(String), url: expect.stringMatching(/^\/v1\/media\/get\?token=/) },
        },
      },
    ])
    expect(billingCalls).toBe(0)
    expect(chat.conversations).toHaveLength(0)
    const photo = received[0]?.other['photo'] as { url: string } | undefined
    const token = new URL(photo?.url ?? '', 'http://x').searchParams.get('token')
    expect(media.grants.find((row) => row.id === token)).toMatchObject({ viewer_id: sister.id, derivative: 'blur' })

    // The Brother sees her side the same way on Sent; the photo is never a clear derivative.
    const sent = await box(brother, 'sent')
    expect(sent).toEqual([expect.objectContaining({ id, direction: 'sent', to_id: sister.id, other_id: sister.id, state: 'pending' })])
    const sentPhoto = sent[0]?.other['photo'] as { url: string } | undefined
    const sentToken = new URL(sentPhoto?.url ?? '', 'http://x').searchParams.get('token')
    expect(media.grants.find((row) => row.id === sentToken)?.derivative).toBe('blur')
    expect(await box(brother, 'received')).toEqual([])
    expect(await box(sister, 'accepted')).toEqual([])
  })

  it('AC 4.4-2: Sent shows pending, accepted and declined, with no guilt copy, read receipt or timer', async () => {
    const brother = await member('brother')
    const [first, second, third] = await members('sister', 3)
    const pendingId = await invited(brother, first as Member)
    const acceptedId = await invited(brother, second as Member)
    const declinedId = await invited(brother, third as Member)
    expect((await accept(second, acceptedId)).status).toBe(200)
    expect((await decline(third, declinedId)).status).toBe(200)

    const sent = await box(brother, 'sent')
    const byId = new Map(sent.map((item) => [item.id, item]))
    expect(byId.get(pendingId)).toMatchObject({ state: 'pending', conversation_id: null })
    expect(byId.get(acceptedId)).toMatchObject({ state: 'accepted', conversation_id: chat.conversations[0]?.id })
    expect(byId.get(declinedId)).toMatchObject({ state: 'declined', conversation_id: null })
    const raw = JSON.stringify(sent)
    expect(raw).not.toMatch(RECEIPT_KEYS)
    // The declined row carries exactly what the pending row carries: no message, no lecture, no countdown.
    expect(Object.keys(byId.get(declinedId) ?? {}).sort()).toEqual(Object.keys(byId.get(pendingId) ?? {}).sort())
    expect(sent.map((item) => item.id)).toEqual([declinedId, acceptedId, pendingId])
  })

  it('AC 4.5-1: her accept of his Invite opens one conversation at stage chat through ChatPort.openFromInvite', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const id = await invited(brother, sister)
    const quotaBefore = structuredClone(invites.quota)
    billingCalls = 0
    now = new Date('2026-10-23T11:00:00.000Z')

    const accepted = await accept(sister, id)
    expect(accepted.status).toBe(200)
    expect(accepted.headers.get('cache-control')).toBe('no-store')
    const body = (await accepted.json()) as { invite: { id: string; state: string }; conversation: { id: string; stage: string } }
    expect(body).toEqual({
      invite: { id, state: 'accepted', created_at: expect.any(String) },
      conversation: { id: expect.any(String), stage: 'chat' },
    })
    expect(chat.conversations).toEqual([{ id: body.conversation.id, invite_id: id, stage: 'chat' }])
    expect(invites.rows.find((row) => row.id === id)?.state).toBe('accepted')
    expect(invites.sisterAcceptedAt.get(id)).toBe('2026-10-23T11:00:00.000Z')
    expect(billingCalls).toBe(0)
    expect(invites.quota).toEqual(quotaBefore)

    // A double tap returns the same conversation and never opens a second one.
    const again = await accept(sister, id)
    expect(again.status).toBe(200)
    expect(((await again.json()) as { conversation: { id: string } }).conversation.id).toBe(body.conversation.id)
    expect(chat.conversations).toHaveLength(1)

    // Either member now finds the thread (FR-041) and the Accepted box links it.
    // Stories 5.1/5.2 added the other member and the last message to each item.
    expect(await threads(sister)).toEqual([expect.objectContaining({ id: body.conversation.id, invite_id: id, stage: 'chat', other_id: brother.id })])
    expect(await threads(brother)).toEqual([expect.objectContaining({ id: body.conversation.id, invite_id: id, stage: 'chat', other_id: sister.id })])
    expect(await box(sister, 'accepted')).toEqual([
      expect.objectContaining({ id, direction: 'received', state: 'accepted', conversation_id: body.conversation.id }),
    ])
    expect(await box(brother, 'accepted')).toEqual([
      expect.objectContaining({ id, direction: 'sent', state: 'accepted', conversation_id: body.conversation.id }),
    ])
    expect(billingCalls).toBe(0)
  })

  it('AC 4.5-2: her quiet decline opens no Chat, shows him declined with no receipt, and he cannot resend', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const id = await invited(brother, sister)
    billingCalls = 0

    const declined = await decline(sister, id)
    expect(declined.status).toBe(200)
    expect(await declined.json()).toEqual({ invite: { id, state: 'declined', created_at: expect.any(String) } })
    expect(chat.conversations).toHaveLength(0)
    expect(await threads(sister)).toEqual([])
    expect(await threads(brother)).toEqual([])
    expect(invites.quota).toEqual([{ account_id: brother.id, civil_day_ouaga: '2026-10-23', sent_count: 1 }])
    expect(billingCalls).toBe(0)

    const sent = await box(brother, 'sent')
    expect(sent).toEqual([expect.objectContaining({ id, state: 'declined', conversation_id: null })])
    expect(JSON.stringify(sent)).not.toMatch(RECEIPT_KEYS)

    // FR-043: the same sender cannot invite her again; nothing is written and nothing is counted.
    const resend = await send(brother, sister)
    expect(resend.status).toBe(403)
    expect(await resend.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: "Vous ne pouvez plus envoyer d'invitation à ce profil.",
        details: { reason: 'invite_declined' },
        retryable: false,
      },
    })
    expect(invites.rows).toHaveLength(1)
    expect(invites.quota[0]?.sent_count).toBe(1)

    // Decline is idempotent; accept after decline is refused and opens nothing.
    expect((await decline(sister, id)).status).toBe(200)
    const late = await accept(sister, id)
    expect(late.status).toBe(409)
    expect(await late.json()).toMatchObject({
      error: { message: "Cette invitation n'est plus en attente.", details: { reason: 'invite_not_pending', state: 'declined' } },
    })
    expect(chat.conversations).toHaveLength(0)

    // She is not prompted to explain: her Received list keeps the row without a question, and her inbox never asks why.
    expect(await box(sister, 'received')).toEqual([expect.objectContaining({ id, state: 'declined' })])
  })

  it('AC 4.5-3: when she sent the Invite, his accept opens Chat; her send counted as consent', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const id = await invited(sister, brother)
    const sentAt = invites.rows.find((row) => row.id === id)?.created_at
    now = new Date('2026-10-23T12:00:00.000Z')
    billingCalls = 0

    const accepted = await accept(brother, id)
    expect(accepted.status).toBe(200)
    const body = (await accepted.json()) as { conversation: { id: string; stage: string } }
    expect(body.conversation.stage).toBe('chat')
    expect(chat.conversations).toEqual([{ id: body.conversation.id, invite_id: id, stage: 'chat' }])
    expect(invites.sisterAcceptedAt.get(id)).toBe(sentAt)
    expect(await threads(sister)).toEqual([expect.objectContaining({ invite_id: id, other_id: brother.id })])
    expect(billingCalls).toBe(0)
  })

  it('AC 4.5-4: on a pending Invite he sent there is no thread, and he cannot accept it himself', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const id = await invited(brother, sister)
    expect(await threads(brother)).toEqual([])
    expect(await threads(sister)).toEqual([])

    for (const act of [accept, decline]) {
      const own = await act(brother, id)
      expect(own.status).toBe(403)
      expect(await own.json()).toMatchObject({
        error: {
          code: 'FORBIDDEN',
          message: 'Seule la personne invitée peut répondre à cette invitation.',
          details: { reason: 'not_recipient' },
        },
      })
    }
    expect(invites.rows[0]?.state).toBe('pending')
    expect(chat.conversations).toHaveLength(0)
    expect(await threads(brother)).toEqual([])
  })

  it('only the recipient may act: no session, staff, mahram, another member, and a bad or unknown id are refused', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const stranger = await member('sister')
    const id = await invited(brother, sister)

    for (const act of [accept, decline]) {
      expect((await act(undefined, id)).status).toBe(401)
      const other = await act(stranger, id)
      expect(other.status).toBe(404)
      expect(await other.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Cette invitation n'existe pas.", details: null } })
      for (const bad of ['abc', newId(now), '00000000-0000-4000-8000-000000000000']) {
        expect((await act(sister, bad)).status).toBe(404)
      }
    }
    expect((await call('/v1/conversations', undefined)).status).toBe(401)

    const account = memory.accounts.find((item) => item.id === sister.id) as { roles: string[] }
    account.roles = ['moderator']
    const staff = await accept(sister, id)
    expect(staff.status).toBe(403)
    expect(await staff.json()).toMatchObject({ error: { details: { reason: 'staff_session' } } })
    expect((await call('/v1/conversations', sister.cookie)).status).toBe(403)
    account.roles = ['mahram']
    expect((await decline(sister, id)).status).toBe(403)
    expect((await call('/v1/invites?box=received', sister.cookie)).status).toBe(403)
    account.roles = ['member']

    expect(invites.rows[0]?.state).toBe('pending')
    expect(chat.conversations).toHaveLength(0)
    const badBox = await call('/v1/invites?box=declined', sister.cookie)
    expect(badBox.status).toBe(400)
  })

  it('an unavailable sender: his fields are hidden, accept is refused and stays pending, decline still works', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const id = await invited(brother, sister)
    setStatus(brother.id, 'deactivated')

    expect(await box(sister, 'received')).toEqual([expect.objectContaining({ id, other: { available: false } })])
    const refused = await accept(sister, id)
    expect(refused.status).toBe(404)
    expect(await refused.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible." } })
    expect(invites.rows[0]?.state).toBe('pending')
    expect(chat.conversations).toHaveLength(0)

    setStatus(brother.id, 'Active')
    setVisibility(brother.id, 'held')
    expect((await accept(sister, id)).status).toBe(404)
    expect((await decline(sister, id)).status).toBe(200)
    expect(invites.rows[0]?.state).toBe('declined')
  })

  it('an accepted Invite cannot be declined, and a pair already connected or invited the other way gets no second Invite', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const id = await invited(sister, brother)

    // He was invited by her: his own send asks him to answer hers instead, and writes nothing.
    const crossing = await send(brother, sister)
    expect(crossing.status).toBe(409)
    expect(await crossing.json()).toMatchObject({
      error: { message: 'Cette personne vous a déjà invité. Répondez à son invitation.', details: { reason: 'invite_received' } },
    })
    expect(invites.rows).toHaveLength(1)

    expect((await accept(brother, id)).status).toBe(200)
    const late = await decline(brother, id)
    expect(late.status).toBe(409)
    expect(await late.json()).toMatchObject({ error: { details: { reason: 'invite_not_pending', state: 'accepted' } } })

    for (const [from, to] of [[brother, sister], [sister, brother]] as const) {
      const again = await send(from, to)
      expect(again.status).toBe(200)
      expect(((await again.json()) as { invite: { id: string; state: string } }).invite).toMatchObject({ id, state: 'accepted' })
    }
    expect(invites.rows).toHaveLength(1)
    expect(invites.quota).toEqual([{ account_id: sister.id, civil_day_ouaga: '2026-10-23', sent_count: 1 }])
    expect(chat.conversations).toHaveLength(1)
  })

  it('parallel accepts open one conversation; a parallel accept and decline leave one consistent outcome', async () => {
    const brother = await member('brother')
    const [first, second] = await members('sister', 2)
    const one = await invited(brother, first as Member)
    const both = await Promise.all([accept(first, one), accept(first, one)])
    expect(both.map((item) => item.status)).toEqual([200, 200])
    expect(chat.conversations.filter((row) => row.invite_id === one)).toHaveLength(1)

    const two = await invited(brother, second as Member)
    const raced = await Promise.all([accept(second, two), decline(second, two)])
    const state = invites.rows.find((row) => row.id === two)?.state
    const conversations = chat.conversations.filter((row) => row.invite_id === two)
    if (state === 'accepted') {
      expect(raced.map((item) => item.status)).toEqual([200, 409])
      expect(conversations).toHaveLength(1)
    } else {
      expect(state).toBe('declined')
      expect(raced.map((item) => item.status)).toEqual([409, 200])
      expect(conversations).toHaveLength(0)
    }
  })

  it('InvitesPort.acceptedFor reports accepted invites from both sides for chat', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const id = await invited(brother, sister)
    expect(await getInvitesPort().acceptedFor(brother.id)).toEqual([])
    expect((await accept(sister, id)).status).toBe(200)
    expect(await getInvitesPort().acceptedFor(brother.id)).toEqual([{ inviteId: id, otherId: sister.id }])
    expect(await getInvitesPort().acceptedFor(sister.id)).toEqual([{ inviteId: id, otherId: brother.id }])
  })
})

describe('chat boundaries (AD-21, AD-23)', () => {
  const sources = readdirSync(srcDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))

  it('only chat.ts inserts a conversation, and only inside openFromInvite', () => {
    const writers = sources.filter((name) => /\.insert\(\s*conversation\b/.test(readFileSync(join(srcDir, name), 'utf8')))
    expect(writers).toEqual(['chat.ts'])
    const chatSource = readFileSync(join(srcDir, 'chat.ts'), 'utf8')
    expect(chatSource.match(/\.insert\(\s*conversation\b/g)).toHaveLength(1)
    const insertAt = chatSource.indexOf('.insert(conversation')
    const openAt = chatSource.indexOf('async openFromInvite(tx, input)')
    const nextMethod = chatSource.indexOf('async conversationsForInvites', openAt)
    expect(openAt).toBeGreaterThan(0)
    expect(insertAt).toBeGreaterThan(openAt)
    expect(insertAt).toBeLessThan(nextMethod)
  })

  it('accept, decline, the inbox list and the conversations read never reach BillingPort', () => {
    expect(readFileSync(join(srcDir, 'chat.ts'), 'utf8')).not.toMatch(/billing-port|isEntitled/)
    expect(readFileSync(join(srcDir, 'conversations.controller.ts'), 'utf8')).not.toMatch(/billing-port|isEntitled/)
    const invitesSource = readFileSync(join(srcDir, 'invites.ts'), 'utf8')
    for (const name of ['acceptInvite', 'declineInvite', 'listInvites', 'presentOther', 'recipientInvite']) {
      const at = invitesSource.indexOf(`function ${name}(`)
      expect(at, name).toBeGreaterThan(0)
      const body = invitesSource.slice(at, invitesSource.indexOf('\n}\n', at))
      expect(body, name).not.toMatch(/isEntitled|getBillingPort|quotaState|entitlement\(/)
    }
  })
})
