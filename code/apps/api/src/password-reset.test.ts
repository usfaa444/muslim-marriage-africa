import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { setEmailPort, type EmailMessage, type EmailPort } from './email-port.js'
import { memoryEmailVerificationStore, setEmailVerificationStore } from './email-verification-store.js'
import {
  consumePasswordReset,
  hashResetToken,
  PASSWORD_RESET_NOTICE,
  PASSWORD_RESET_SESSION_MS,
  PASSWORD_RESET_TTL_MS,
} from './password-reset.js'
import { setPasswordResetLimitReader } from './password-reset-limit.js'
import { resetPasswordResetRateWindow } from './password-reset-rate.js'
import { memoryPasswordResetStore, setPasswordResetStore } from './password-reset-store.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { SESSION_COOKIE } from './session-cookie.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const resets = memoryPasswordResetStore({
  accounts: memory.accounts,
  credentials: memory.credentials,
  sessions: sessions.sessions,
})
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
let resetLimit = 100

function accountBody(email: string, pseudonym: string): Record<string, unknown> {
  return {
    email,
    password: 'phrase avec espaces',
    pseudonym,
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    dob: '1990-01-15',
  }
}

function tokenFrom(link: string): string {
  return new URL(link).searchParams.get('token') ?? ''
}

function verify(email: string): void {
  const owner = memory.accounts.find((row) => row.email === email)
  const credential = memory.credentials.find((row) => row.account_id === owner?.id && row.kind === 'password')
  if (!credential) {
    throw new Error('password credential missing')
  }
  credential.email_verified_at = now.toISOString()
}

describe('POST /v1/password-resets', () => {
  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    setPasswordResetLimitReader(async () => resetLimit)
    resetAuthRateWindow()
    resetPasswordResetRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setEmailVerificationStore(links)
    setPasswordResetStore(resets)
    setEmailPort(port)
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
    setPasswordResetLimitReader(undefined)
    resetAuthRateWindow()
    resetPasswordResetRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setEmailVerificationStore(undefined)
    setPasswordResetStore(undefined)
    setEmailPort(undefined)
    failSend = false
    if (app) {
      await app.close()
    }
  })

  async function createAccount(email: string, pseudonym: string): Promise<void> {
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody(email, pseudonym)),
    })
    expect(created.status).toBe(201)
  }

  it('returns the same empty body for an unknown or unverified email and creates nothing', async () => {
    await createAccount('fatim@example.bf', 'Fatim_Ouaga')
    const before = resets.rows.length
    const unknown = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: 'absent@example.bf' }),
    })
    const unverified = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: 'fatim@example.bf' }),
    })
    expect(unknown.status).toBe(201)
    expect(await unknown.json()).toEqual({})
    expect(unverified.status).toBe(201)
    expect(await unverified.json()).toEqual({})
    expect(resets.rows).toHaveLength(before)
    expect(messages).toHaveLength(0)
  })

  it('rejects a missing email and creates nothing', async () => {
    const before = resets.rows.length
    const response = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const body = (await response.json()) as { error: { code: string; details: { field: string } } }
    expect(response.status).toBe(400)
    expect(body.error.code).toBe('UNHANDLED')
    expect(body.error.details.field).toBe('email')
    expect(resets.rows).toHaveLength(before)
  })

  it('stores only the hash, sends the French sentence, and keeps the token out of JSON', async () => {
    verify('fatim@example.bf')
    const before = messages.length
    const response = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: 'Fatim@Example.bf' }),
    })
    const body = (await response.json()) as Record<string, unknown>
    const message = messages.at(-1)
    const token = tokenFrom(message?.link ?? '')
    expect(response.status).toBe(201)
    expect(body).toEqual({})
    expect(messages).toHaveLength(before + 1)
    expect(message?.to).toBe('fatim@example.bf')
    expect(message?.notice).toBe(PASSWORD_RESET_NOTICE)
    expect(message?.link.startsWith(`${origin}/password-reset?token=`)).toBe(true)
    expect(JSON.stringify(body)).not.toContain(token)
    const row = resets.rows.at(-1)
    expect(row?.token_hash).toBe(hashResetToken(token))
    expect(row?.token_hash).not.toBe(token)
    expect(row?.expires_at.toISOString()).toBe(new Date(now.getTime() + PASSWORD_RESET_TTL_MS).toISOString())
    expect(row?.consumed_at).toBeNull()
  })

  it('creates nothing when send fails', async () => {
    failSend = true
    const before = resets.rows.length
    const response = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: 'fatim@example.bf' }),
    })
    const body = (await response.json()) as { error: { code: string; retryable: boolean } }
    failSend = false
    expect(response.status).toBe(503)
    expect(body.error.code).toBe('EMAIL_DELIVERY_FAILED')
    expect(body.error.retryable).toBe(true)
    expect(resets.rows).toHaveLength(before)
  })

  it('returns delivery failed when the row is not stored after the mail is accepted', async () => {
    const before = resets.rows.length
    const beforeMessages = messages.length
    const saved = resets.supersedeAndInsert.bind(resets)
    resets.supersedeAndInsert = async () => {
      throw new Error('insert failed')
    }
    try {
      const response = await fetch(`${base}/v1/password-resets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify({ email: 'fatim@example.bf' }),
      })
      const body = (await response.json()) as { error: { code: string; retryable: boolean } }
      expect(response.status).toBe(503)
      expect(body.error.code).toBe('EMAIL_DELIVERY_FAILED')
      expect(body.error.retryable).toBe(true)
      expect(resets.rows).toHaveLength(before)
      expect(resets.rows.at(-1)?.superseded_at).toBeNull()
    } finally {
      resets.supersedeAndInsert = saved
      messages.length = beforeMessages
    }
  })

  it('does not consume a token when the new password fails the signup rule', async () => {
    const row = resets.rows.at(-1)
    const token = tokenFrom(messages.at(-1)?.link ?? '')
    const response = await fetch(`${base}/v1/password-resets/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: 'court' }),
    })
    const body = (await response.json()) as { error: { code: string; message: string; details: { field: string } } }
    expect(response.status).toBe(400)
    expect(body.error.code).toBe('UNHANDLED')
    expect(body.error.details.field).toBe('password')
    expect(body.error.message).toBe("password : la règle publiée n'est pas respectée.")
    expect(row?.consumed_at).toBeNull()
  })

  it('sets the new password, opens a 30-day session, and revokes the older one', async () => {
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
    const oldCookie = signed.headers.getSetCookie().join('; ')
    const token = tokenFrom(messages.at(-1)?.link ?? '')
    const response = await fetch(`${base}/v1/password-resets/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: 'une phrase plus longue' }),
    })
    const body = (await response.json()) as { id: string; kind: string; expires_at: string }
    const cookie = response.headers.getSetCookie().join('; ')
    expect(response.status).toBe(200)
    expect(body.kind).toBe('web')
    expect(body.expires_at).toBe(new Date(now.getTime() + PASSWORD_RESET_SESSION_MS).toISOString())
    expect(cookie).toContain(`${SESSION_COOKIE}=${body.id}`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=')
    expect(JSON.stringify(body)).not.toContain(token)
    expect(resets.rows.at(-1)?.consumed_at?.toISOString()).toBe(now.toISOString())

    const again = await fetch(`${base}/v1/password-resets/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: 'une phrase plus longue' }),
    })
    const againBody = (await again.json()) as { error: { code: string; message: string } }
    expect(again.status).toBe(400)
    expect(againBody.error.code).toBe('PASSWORD_RESET_INVALID')
    expect(againBody.error.message).toBe('Lien expiré ou adresse inconnue.')

    const oldPassword = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
      }),
    })
    expect(oldPassword.status).toBe(401)
    const nextPassword = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatim@example.bf',
        password: 'une phrase plus longue',
        remember_me: false,
      }),
    })
    expect(nextPassword.status).toBe(201)

    const oldSession = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie: oldCookie },
    })
    expect(oldSession.status).toBe(401)
    const newSession = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie },
    })
    expect(newSession.status).toBe(200)
  })

  it('fails a superseded link and accepts the newer one', async () => {
    const first = messages.at(-1)?.link ?? ''
    const issued = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: 'fatim@example.bf' }),
    })
    expect(issued.status).toBe(201)
    const stale = await fetch(`${base}/v1/password-resets/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: tokenFrom(first), password: 'encore une phrase longue' }),
    })
    expect(stale.status).toBe(400)
    const fresh = await fetch(`${base}/v1/password-resets/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: tokenFrom(messages.at(-1)?.link ?? ''), password: 'encore une phrase longue' }),
    })
    expect(fresh.status).toBe(200)
  })

  it('limits reset requests by IP and does not limit consume', async () => {
    resetLimit = 2
    resetPasswordResetRateWindow()
    const first = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.bf' }),
    })
    const second = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.bf' }),
    })
    const third = await fetch(`${base}/v1/password-resets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.bf' }),
    })
    const body = (await third.json()) as { error: { code: string; message: string } }
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(third.status).toBe(429)
    expect(body.error.code).toBe('RATE_LIMITED')
    expect(body.error.message).toBe('Cadence de requêtes régulée.')
    const consume = await fetch(`${base}/v1/password-resets/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'missing-token', password: 'une phrase plus longue' }),
    })
    expect(consume.status).toBe(400)
    resetLimit = 100
    resetPasswordResetRateWindow()
  })

  it('does not hash a password when the token cannot be used', async () => {
    let hashed = 0
    const hashPassword = async () => {
      hashed += 1
      return 'hashed'
    }
    const unknown = await consumePasswordReset({
      body: { token: 'not-a-row', password: 'une phrase plus longue' },
      now: () => now,
      store: resets,
      hashPassword,
    })
    expect(unknown.ok).toBe(false)
    if (!unknown.ok) {
      expect(unknown.code).toBe('PASSWORD_RESET_INVALID')
    }
    const owner = memory.accounts.find((row) => row.email === 'fatim@example.bf')
    resets.rows.push({
      id: '018f0000-0000-7000-8000-000000000099',
      account_id: owner?.id ?? '',
      token_hash: hashResetToken('already-expired'),
      expires_at: now,
      consumed_at: null,
      superseded_at: null,
      created_at: new Date(now.getTime() - PASSWORD_RESET_TTL_MS),
    })
    const expired = await consumePasswordReset({
      body: { token: 'already-expired', password: 'une phrase plus longue' },
      now: () => now,
      store: resets,
      hashPassword,
    })
    expect(expired.ok).toBe(false)
    if (!expired.ok) {
      expect(expired.code).toBe('PASSWORD_RESET_INVALID')
    }
    expect(hashed).toBe(0)
  })
})
