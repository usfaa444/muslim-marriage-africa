import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { EMAIL_LINK_TTL_MS } from './email-verification.js'
import { memoryEmailVerificationStore, setEmailVerificationStore } from './email-verification-store.js'
import { setEmailPort, type EmailMessage, type EmailPort } from './email-port.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
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

let now = new Date('2026-10-11T08:00:00.000Z')
const origin = 'http://ankanu.test'
process.env.ANKANU_PUBLIC_ORIGIN = origin

function accountBody(email: string, pseudonym: string): Record<string, unknown> {
  return {
    email,
    password: 'phrase avec espaces',
    pseudonym,
    gender: 'sister',
    pledge_accepted: true,
    civil_given_name: 'Awa',
    civil_family_name: 'Sawadogo',
    recaptcha_token: 'test-ok',
    coc_version: 'FR-089',
    dob: '1992-04-02',
  }
}

function tokenFrom(link: string): string {
  return new URL(link).searchParams.get('token') ?? ''
}

describe('POST /v1/accounts/email', () => {
  let app: INestApplication | undefined
  let base: string
  let cookie = ''

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    pins.rows.length = 0
    resetPinEntries()
    setPinLockStore(pins)
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
      body: JSON.stringify(accountBody('awa@example.bf', 'Awa_Ouaga')),
    })
    expect(created.status).toBe(201)
    const other = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody('mariam@example.bf', 'Mariam_Ouaga')),
    })
    expect(other.status).toBe(201)
    const signed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'awa@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
        recaptcha_token: 'test-ok',
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
    setPinLockStore(undefined)
    resetPinEntries()
    setEmailVerificationStore(undefined)
    setEmailPort(undefined)
    failSend = false
    if (app) {
      await app.close()
    }
  })

  async function postEmail(email: unknown, headers: Record<string, string> = { cookie, origin }): Promise<Response> {
    return fetch(`${base}/v1/accounts/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ email }),
    })
  }

  it('rejects a missing session, a bad address, the current address, and a taken address without writing', async () => {
    const issued = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie, origin },
    })
    expect(issued.status).toBe(201)
    const live = tokenFrom(messages.at(-1)?.link ?? '')
    const before = links.rows.length
    const anonymous = await postEmail('new@example.bf', { origin })
    const anonymousBody = (await anonymous.json()) as { error: { code: string } }
    const invalid = await postEmail('not-an-email')
    const invalidBody = (await invalid.json()) as { error: { code: string; details: { field: string } } }
    const same = await postEmail('  Awa@Example.bf ')
    const sameBody = (await same.json()) as { error: { message: string; details: { field: string } } }
    const taken = await postEmail('mariam@example.bf')
    const takenBody = (await taken.json()) as { error: { code: string; message: string; details: { field: string } } }

    expect(anonymous.status).toBe(401)
    expect(anonymousBody.error.code).toBe('UNAUTHENTICATED')
    expect(invalid.status).toBe(400)
    expect(invalidBody.error.code).toBe('UNHANDLED')
    expect(invalidBody.error.details.field).toBe('email')
    expect(same.status).toBe(400)
    expect(sameBody.error.message).toBe("email : c'est déjà l'adresse enregistrée.")
    expect(sameBody.error.details.field).toBe('email')
    expect(taken.status).toBe(409)
    expect(takenBody.error.code).toBe('UNHANDLED')
    expect(takenBody.error.message).toBe('email : ce champ est déjà utilisé.')
    expect(memory.accounts[0]?.email).toBe('awa@example.bf')
    expect(links.rows).toHaveLength(before)
    expect(links.rows[0]?.superseded_at).toBeNull()
    expect(live.length).toBeGreaterThan(10)
  })

  it('sends to the new address first, then stores that address and a new link', async () => {
    const sent = messages.length
    const response = await postEmail('  Nouvelle@Example.bf ', { cookie, origin: 'https://evil.example' })
    const body = (await response.json()) as { email: string; expires_at: string }
    const link = messages.at(-1)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      email: 'nouvelle@example.bf',
      expires_at: new Date(now.getTime() + EMAIL_LINK_TTL_MS).toISOString(),
    })
    expect(response.headers.get('x-account-email')).toBe(encodeURIComponent('nouvelle@example.bf'))
    expect(messages).toHaveLength(sent + 1)
    expect(link?.to).toBe('nouvelle@example.bf')
    expect(link?.link.startsWith(`${origin}/email-verification?token=`)).toBe(true)
    expect(memory.accounts[0]?.email).toBe('nouvelle@example.bf')
    expect(memory.credentials[0]?.email_verified_at).toBeNull()
    expect(links.rows[0]?.superseded_at).not.toBeNull()
    expect(links.rows.at(-1)?.superseded_at).toBeNull()
    expect(links.rows.at(-1)?.consumed_at).toBeNull()
  })

  it('kills the old link and verifies only the new one', async () => {
    const oldToken = tokenFrom(messages[0]?.link ?? '')
    const newToken = tokenFrom(messages.at(-1)?.link ?? '')
    const old = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: oldToken }),
    })
    const oldBody = (await old.json()) as { error: { code: string; message: string } }
    expect(old.status).toBe(400)
    expect(oldBody.error.code).toBe('EMAIL_LINK_INVALID')
    expect(oldBody.error.message).toBe('Lien expiré ou caduc.')
    expect(memory.credentials[0]?.email_verified_at).toBeNull()
    const opened = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: newToken }),
    })
    expect(opened.status).toBe(200)
    expect(memory.credentials[0]?.email_verified_at).toBe(now.toISOString())
  })

  it('refuses a change once the address is verified and leaves the row untouched', async () => {
    const sent = messages.length
    const response = await postEmail('encore@example.bf')
    const body = (await response.json()) as { error: { code: string; message: string; details: { field: string } } }
    expect(response.status).toBe(409)
    expect(body.error.code).toBe('UNHANDLED')
    expect(body.error.message).toBe("email : l'adresse est déjà vérifiée.")
    expect(body.error.details.field).toBe('email')
    expect(memory.accounts[0]?.email).toBe('nouvelle@example.bf')
    expect(messages).toHaveLength(sent)
  })

  it('leaves the address and the old link unchanged when sending fails', async () => {
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(accountBody('fatou@example.bf', 'Fatou_Ouaga')),
    })
    expect(created.status).toBe(201)
    const signed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'fatou@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
        recaptcha_token: 'test-ok',
      }),
    })
    expect(signed.status).toBe(201)
    const fatou = signed.headers.getSetCookie().join('; ')
    const issued = await fetch(`${base}/v1/accounts/email-verifications`, {
      method: 'POST',
      headers: { cookie: fatou, origin },
    })
    expect(issued.status).toBe(201)
    const live = tokenFrom(messages.at(-1)?.link ?? '')
    const rows = links.rows.length
    failSend = true
    const failed = await fetch(`${base}/v1/accounts/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: fatou, origin },
      body: JSON.stringify({ email: 'fatou.new@example.bf' }),
    })
    const failedBody = (await failed.json()) as { error: { code: string; retryable: boolean } }
    failSend = false
    expect(failed.status).toBe(503)
    expect(failedBody.error.code).toBe('EMAIL_DELIVERY_FAILED')
    expect(failedBody.error.retryable).toBe(true)
    expect(memory.accounts.find((row) => row.pseudonym === 'Fatou_Ouaga')?.email).toBe('fatou@example.bf')
    expect(links.rows).toHaveLength(rows)
    const still = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: live }),
    })
    expect(still.status).toBe(200)
  })

  it('counts the post on the auth IP limiter and changes nothing when limited', async () => {
    setAuthLimitReader(async () => 1)
    resetAuthRateWindow()
    const email = memory.accounts.find((row) => row.pseudonym === 'Fatou_Ouaga')?.email
    const first = await postEmail('autre@example.bf', { origin })
    const second = await postEmail('autre@example.bf', { origin })
    const body = (await second.json()) as { error: { code: string } }
    expect(first.status).toBe(401)
    expect(second.status).toBe(429)
    expect(body.error.code).toBe('RATE_LIMITED')
    expect(memory.accounts.find((row) => row.pseudonym === 'Fatou_Ouaga')?.email).toBe(email)
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
  })
})
