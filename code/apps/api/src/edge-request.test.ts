import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { edgeViewFrom, isTrustedEdge, originForbidden } from './edge-request.js'
import { assertPublicOriginBoot } from './public-origin.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

describe('edge trust and origin guard', () => {
  it('trusts loopback and 172.16.0.0/12 only', () => {
    expect(isTrustedEdge('127.0.0.1')).toBe(true)
    expect(isTrustedEdge('::1')).toBe(true)
    expect(isTrustedEdge('::ffff:172.27.0.1')).toBe(true)
    expect(isTrustedEdge('172.16.0.1')).toBe(true)
    expect(isTrustedEdge('172.31.255.255')).toBe(true)
    expect(isTrustedEdge('172.15.0.1')).toBe(false)
    expect(isTrustedEdge('172.32.0.1')).toBe(false)
    expect(isTrustedEdge('8.8.8.8')).toBe(false)
    expect(isTrustedEdge('10.0.0.1')).toBe(false)
  })

  it('ignores a forwarded https scheme from an untrusted peer', () => {
    const view = edgeViewFrom({
      socket: { remoteAddress: '8.8.8.8', encrypted: false },
      headers: {
        'x-forwarded-proto': 'https',
        'x-ankanu-edge-proto': 'https',
        'x-forwarded-host': 'staging.ankanu.com',
        host: '72.61.0.79:4012',
      },
    })
    expect(view.trustedHttps).toBe(false)
    expect(view.httpOriginAllowed).toBe(false)
  })

  it('marks https from a trusted edge and plain http only for an allowed http origin', () => {
    const env = { ANKANU_ALLOWED_ORIGINS: 'https://staging.ankanu.com,http://72.61.0.79:4012' }
    const https = edgeViewFrom(
      {
        socket: { remoteAddress: '172.27.0.6' },
        headers: {
          'x-ankanu-edge-proto': 'https',
          'x-ankanu-edge-host': 'staging.ankanu.com',
        },
      },
      env,
    )
    expect(https.trustedHttps).toBe(true)
    expect(https.httpOriginAllowed).toBe(false)
    const ip = edgeViewFrom(
      {
        socket: { remoteAddress: '127.0.0.1' },
        headers: { host: '72.61.0.79:4012' },
      },
      env,
    )
    expect(ip.trustedHttps).toBe(false)
    expect(ip.httpOriginAllowed).toBe(true)
  })

  it('refuses a foreign Origin and allows a listed one or none', () => {
    const env = { ANKANU_ALLOWED_ORIGINS: 'https://staging.ankanu.com,http://72.61.0.79:4012' }
    const foreign = { method: 'POST', url: '/v1/sessions', headers: { origin: 'https://evil.example' } }
    const listed = { method: 'POST', url: '/v1/sessions', headers: { origin: 'https://staging.ankanu.com' } }
    const absent = { method: 'POST', url: '/v1/sessions', headers: {} }
    const read = { method: 'GET', url: '/v1/health', headers: { origin: 'https://evil.example' } }
    expect(originForbidden(foreign, env)).toBe(true)
    expect(originForbidden(listed, env)).toBe(false)
    expect(originForbidden(absent, env)).toBe(false)
    expect(originForbidden(read, env)).toBe(false)
    expect(originForbidden(foreign, {})).toBe(false)
  })

  it('refuses a production boot without a valid public origin', () => {
    expect(() => assertPublicOriginBoot({ NODE_ENV: 'production' })).toThrow(/ANKANU_PUBLIC_ORIGIN/)
    expect(() =>
      assertPublicOriginBoot({ NODE_ENV: 'production', ANKANU_PUBLIC_ORIGIN: 'https://staging.ankanu.com/auth' }),
    ).toThrow(/ANKANU_PUBLIC_ORIGIN/)
    expect(() =>
      assertPublicOriginBoot({ NODE_ENV: 'production', ANKANU_PUBLIC_ORIGIN: 'https://staging.ankanu.com' }),
    ).toThrow(/ANKANU_ALLOWED_ORIGINS/)
    expect(() =>
      assertPublicOriginBoot({
        NODE_ENV: 'production',
        ANKANU_PUBLIC_ORIGIN: 'https://staging.ankanu.com',
        ANKANU_ALLOWED_ORIGINS: 'https://staging.ankanu.com,http://72.61.0.79:4012',
      }),
    ).not.toThrow()
    expect(() => assertPublicOriginBoot({})).not.toThrow()
  })
})

describe('POST /v1 origin guard', () => {
  let app: INestApplication | undefined
  let base: string
  const previous = process.env.ANKANU_ALLOWED_ORIGINS

  beforeAll(async () => {
    setAuthClock(() => new Date('2026-10-11T12:00:00.000Z'))
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    const memory = memoryAccountStore()
    setAccountStore(memory)
    setSessionStore(memorySessionStore(memory))
    const pins = memoryPinLockStore()
    pins.rows.length = 0
    resetPinEntries()
    setPinLockStore(pins)
    process.env.ANKANU_ALLOWED_ORIGINS = 'https://staging.ankanu.com,http://72.61.0.79:4012'
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    if (previous === undefined) {
      delete process.env.ANKANU_ALLOWED_ORIGINS
    } else {
      process.env.ANKANU_ALLOWED_ORIGINS = previous
    }
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  it('returns 403 for a foreign Origin and still accepts a listed Origin', async () => {
    const foreign = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      body: '{}',
    })
    const foreignBody = (await foreign.json()) as { error: { code: string } }
    expect(foreign.status).toBe(403)
    expect(foreignBody.error.code).toBe('FORBIDDEN')
    expect(foreign.headers.get('access-control-allow-origin')).toBeNull()
    const listed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { origin: 'http://72.61.0.79:4012', 'content-type': 'application/json' },
      body: '{}',
    })
    expect(listed.status).not.toBe(403)
    const absent = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    expect(absent.status).not.toBe(403)
  })

  it('sets a non-Secure cookie on the allowed http IP and a Secure cookie on https', async () => {
    const body = JSON.stringify({
      email: 'edge@example.bf',
      password: 'phrase avec espaces',
      pseudonym: 'Edge_Ouaga',
      gender: 'sister',
      pledge_accepted: true,
      civil_given_name: 'Edge',
      civil_family_name: 'Sawadogo',
      recaptcha_token: 'test-ok',
      coc_version: 'FR-089',
      dob: '1990-01-15',
    })
    const httpAccount = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ankanu-edge-proto': 'http',
        'x-ankanu-edge-host': '72.61.0.79:4012',
      },
      body,
    })
    expect(httpAccount.status).toBe(201)
    const httpCookie = httpAccount.headers.get('set-cookie') ?? ''
    expect(httpCookie).toContain('ankanu_session=')
    expect(httpCookie.includes('Secure')).toBe(false)
    const httpsAccount = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ankanu-edge-proto': 'https',
        'x-ankanu-edge-host': 'staging.ankanu.com',
      },
      body: body.replace('edge@example.bf', 'edge2@example.bf').replace('Edge_Ouaga', 'Edge_Bobo'),
    })
    expect(httpsAccount.status).toBe(201)
    expect(httpsAccount.headers.get('set-cookie') ?? '').toContain('Secure')
  })
})
