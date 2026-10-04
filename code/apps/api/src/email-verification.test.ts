import { createHash } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isUuidV7 } from '@ankanu/kernel'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { EMAIL_LINK_TTL_MS, hashEmailToken } from './email-verification.js'
import { memoryEmailVerificationStore, setEmailVerificationStore } from './email-verification-store.js'
import { setEmailPort, type EmailMessage, type EmailPort } from './email-port.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { SESSION_COOKIE } from './session-cookie.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const links = memoryEmailVerificationStore(memory)
const messages: EmailMessage[] = []
let failSend = false
const port: EmailPort = {
  async send(message) {
    if (failSend) {
      throw new Error('delivery failed')
    }
    messages.push(message)
  },
}

let now = new Date('2026-10-04T12:00:00.000Z')
const origin = 'http://ankanu.test'

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

function tokenFrom(link: string): string {
  return new URL(link).searchParams.get('token') ?? ''
}

describe('POST /v1/accounts/email-verifications', () => {
  let app: INestApplication | undefined
  let base: string
  let cookie = ''

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setEmailVerificationStore(links)
    setEmailPort(port)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody()),
    })
    expect(created.status).toBe(201)
    const signed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    expect(signed.status).toBe(201)
    cookie = signed.headers.getSetCookie().join('; ')
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setEmailVerificationStore(undefined)
    setEmailPort(undefined)
    failSend = false
    if (app) {
      await app.close()
    }
  })

  it('issues a link after send, stores only the hash, and does not put the token in JSON', async () => {
    const before = messages.length
    const response = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie, origin },
    })
    const body = (await response.json()) as Record<string, unknown>
    const link = messages.at(-1)

    expect(response.status).toBe(201)
    expect(Object.keys(body)).toEqual(['expires_at'])
    expect(body.expires_at).toBe(new Date(now.getTime() + EMAIL_LINK_TTL_MS).toISOString())
    expect(response.headers.get('x-account-email')).toBe(encodeURIComponent('fatim@example.bf'))
    expect(messages).toHaveLength(before + 1)
    expect(link?.to).toBe('fatim@example.bf')
    expect(link?.link.startsWith(`${origin}/email-verification?token=`)).toBe(true)
    expect(JSON.stringify(body)).not.toContain(tokenFrom(link?.link ?? ''))
    const row = links.rows.at(-1)
    expect(row?.token_hash).toBe(hashEmailToken(tokenFrom(link?.link ?? '')))
    expect(row?.token_hash).not.toBe(tokenFrom(link?.link ?? ''))
    expect(row?.consumed_at).toBeNull()
    expect(row?.superseded_at).toBeNull()
    expect(createHash('sha256').update('unused').digest('hex')).not.toBe(row?.token_hash)
    expect(memory.credentials[0]?.email_verified_at).toBeNull()
  })

  it('marks the password credential verified when the unexpired link is opened', async () => {
    const token = tokenFrom(messages.at(-1)?.link ?? '')
    const response = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(Object.keys(body)).toEqual(['email_verified_at'])
    expect(body.email_verified_at).toBe(now.toISOString())
    expect(response.headers.get('x-account-email')).toBe(encodeURIComponent('fatim@example.bf'))
    expect(memory.credentials[0]?.email_verified_at).toBe(now.toISOString())
    expect(links.rows.at(-1)?.consumed_at?.toISOString()).toBe(now.toISOString())
    expect(memory.accounts[0]).not.toHaveProperty('email_verified_at')
  })

  it('rejects the consumed link and does not send again once the inbox is verified', async () => {
    const token = tokenFrom(messages.at(-1)?.link ?? '')
    const again = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const againBody = (await again.json()) as { error: { code: string; retryable: boolean } }
    const sent = messages.length
    const issued = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie, origin },
    })
    const issuedBody = (await issued.json()) as Record<string, unknown>

    expect(again.status).toBe(400)
    expect(againBody.error.code).toBe('EMAIL_LINK_INVALID')
    expect(againBody.error.retryable).toBe(false)
    expect(issued.status).toBe(200)
    expect(issuedBody).toEqual({})
    expect(messages).toHaveLength(sent)
    expect(links.rows).toHaveLength(1)
    expect(memory.credentials[0]?.email_verified_at).toBe(now.toISOString())
  })

  it('does not rate-limit the verification post when auth posts are already over the limit', async () => {
    setAuthLimitReader(async () => 1)
    resetAuthRateWindow()
    const allowed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    const blocked = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    const issued = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie, origin },
    })

    expect(allowed.status).toBe(201)
    expect(blocked.status).toBe(429)
    expect(issued.status).toBe(200)
  })
})

describe('email link expiry and resend', () => {
  let app: INestApplication | undefined
  let base: string
  let cookie = ''

  beforeAll(async () => {
    memory.accounts.length = 0
    memory.credentials.length = 0
    sessions.sessions.length = 0
    links.rows.length = 0
    messages.length = 0
    failSend = false
    now = new Date('2026-10-04T15:00:00.000Z')
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setEmailVerificationStore(links)
    setEmailPort(port)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody({ email: 'amina@example.bf', pseudonym: 'Amina_Bobo' })),
    })
    expect(created.status).toBe(201)
    const signed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Amina_Bobo',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    expect(signed.status).toBe(201)
    cookie = `${SESSION_COOKIE}=${((await signed.json()) as { id: string }).id}`
    expect(isUuidV7(cookie.split('=')[1] ?? '')).toBe(true)
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setEmailVerificationStore(undefined)
    setEmailPort(undefined)
    failSend = false
    if (app) {
      await app.close()
    }
  })

  async function issue(): Promise<Response> {
    return fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie, origin },
    })
  }

  it('leaves an expired link unused, then a resend kills that link and opens the new one', async () => {
    const first = await issue()
    expect(first.status).toBe(201)
    const firstToken = tokenFrom(messages[0]?.link ?? '')
    const firstRow = links.rows[0]
    now = new Date(now.getTime() + EMAIL_LINK_TTL_MS)
    const expired = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: firstToken }),
    })
    const expiredBody = (await expired.json()) as { error: { code: string } }

    expect(expired.status).toBe(400)
    expect(expiredBody.error.code).toBe('EMAIL_LINK_INVALID')
    expect(firstRow?.consumed_at).toBeNull()
    expect(await links.markConsumed(firstRow!.id, firstRow!.account_id, now)).toBe(false)
    expect(memory.credentials[0]?.email_verified_at).toBeNull()

    const resent = await issue()
    const resentBody = (await resent.json()) as { expires_at: string }
    const secondToken = tokenFrom(messages[1]?.link ?? '')
    expect(resent.status).toBe(201)
    expect(resentBody.expires_at).toBe(new Date(now.getTime() + EMAIL_LINK_TTL_MS).toISOString())
    expect(firstRow?.superseded_at?.toISOString()).toBe(now.toISOString())
    expect(links.rows[1]?.superseded_at).toBeNull()
    const supersededExpiry = firstRow!.expires_at
    firstRow!.expires_at = new Date(now.getTime() + 60_000)
    expect(await links.markConsumed(firstRow!.id, firstRow!.account_id, now)).toBe(false)
    firstRow!.expires_at = supersededExpiry
    expect(memory.credentials[0]?.email_verified_at).toBeNull()

    const old = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: firstToken }),
    })
    expect(old.status).toBe(400)
    expect(memory.credentials[0]?.email_verified_at).toBeNull()

    const opened = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: secondToken }),
    })
    const openedBody = (await opened.json()) as { email_verified_at: string }
    expect(opened.status).toBe(200)
    expect(openedBody.email_verified_at).toBe(now.toISOString())
    expect(links.rows[1]?.consumed_at?.toISOString()).toBe(now.toISOString())
    expect(memory.credentials[0]?.email_verified_at).toBe(now.toISOString())
  })

  it('keeps the live row when send fails, and refuses a missing session', async () => {
    memory.credentials[0]!.email_verified_at = null
    links.rows.length = 0
    messages.length = 0
    const live = await issue()
    expect(live.status).toBe(201)
    const liveToken = tokenFrom(messages[0]?.link ?? '')
    failSend = true
    const failed = await issue()
    const failedBody = (await failed.json()) as { error: { code: string; retryable: boolean } }
    failSend = false

    expect(failed.status).toBe(503)
    expect(failedBody.error.code).toBe('EMAIL_DELIVERY_FAILED')
    expect(failedBody.error.retryable).toBe(true)
    expect(links.rows).toHaveLength(1)
    expect(links.rows[0]?.superseded_at).toBeNull()
    expect(messages).toHaveLength(1)

    const still = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'not-the-live-token' }),
    })
    expect(still.status).toBe(400)
    expect(links.rows[0]?.consumed_at).toBeNull()

    const anonymous = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { origin },
    })
    const anonymousBody = (await anonymous.json()) as { error: { code: string; retryable: boolean } }
    expect(anonymous.status).toBe(401)
    expect(anonymousBody.error.code).toBe('UNAUTHENTICATED')
    expect(anonymousBody.error.retryable).toBe(false)
    expect(links.rows).toHaveLength(1)

    const missingOrigin = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie },
    })
    expect(missingOrigin.status).toBe(503)
    expect(links.rows).toHaveLength(1)
    expect(links.rows[0]?.superseded_at).toBeNull()

    const opened = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: liveToken }),
    })
    expect(opened.status).toBe(200)
  })
})
