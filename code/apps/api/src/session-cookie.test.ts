import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  assertCookieSecureBoot,
  clearSessionCookieHeader,
  cookieSecure,
  sessionCookieHeader,
} from './session-cookie.js'

describe('session cookie secure flag', () => {
  it('keeps Secure when the flag is unset or true', () => {
    expect(cookieSecure({})).toBe(true)
    expect(cookieSecure({ ANKANU_COOKIE_SECURE: '' })).toBe(true)
    expect(cookieSecure({ ANKANU_COOKIE_SECURE: 'true' })).toBe(true)
    expect(sessionCookieHeader('abc', null, {})).toBe(
      'ankanu_session=abc; Path=/; HttpOnly; Secure; SameSite=Lax',
    )
    expect(clearSessionCookieHeader({ ANKANU_COOKIE_SECURE: 'true' })).toBe(
      'ankanu_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    )
    expect(() =>
      assertCookieSecureBoot({ ANKANU_COOKIE_SECURE: 'true', ANKANU_PUBLIC_ORIGIN: 'https://ankanu.example' }),
    ).not.toThrow()
  })

  it('omits Secure on http when the flag is false', () => {
    const off = { ANKANU_COOKIE_SECURE: 'false' }
    expect(sessionCookieHeader('abc', 12, off)).toBe(
      'ankanu_session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=12',
    )
    const cleared = clearSessionCookieHeader(off)
    expect(cleared).toBe('ankanu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
    expect(cleared.split('; ').includes('Secure')).toBe(false)
    expect(() => assertCookieSecureBoot(off)).not.toThrow()
    expect(() => assertCookieSecureBoot({ ...off, ANKANU_PUBLIC_ORIGIN: '' })).not.toThrow()
    expect(() =>
      assertCookieSecureBoot({ ...off, ANKANU_PUBLIC_ORIGIN: 'http://72.61.0.79:4012' }),
    ).not.toThrow()
  })

  it('refuses to start when Secure is off and the public origin is https', () => {
    expect(() =>
      assertCookieSecureBoot({
        ANKANU_COOKIE_SECURE: 'false',
        ANKANU_PUBLIC_ORIGIN: 'https://ankanu.example/auth',
      }),
    ).toThrow(/ANKANU_COOKIE_SECURE=false is refused when ANKANU_PUBLIC_ORIGIN is https/)
    expect(() =>
      assertCookieSecureBoot({ ANKANU_COOKIE_SECURE: 'false', ANKANU_PUBLIC_ORIGIN: 'https:not a url' }),
    ).toThrow(/https/)
    expect(() =>
      assertCookieSecureBoot({ ANKANU_COOKIE_SECURE: 'false', ANKANU_PUBLIC_ORIGIN: '  HTTPS://ankanu.example' }),
    ).toThrow(/https/)
    expect(() => assertCookieSecureBoot({ ANKANU_COOKIE_SECURE: 'yes' })).toThrow(
      /ANKANU_COOKIE_SECURE must be true or false/,
    )
    expect(() => assertCookieSecureBoot({ ANKANU_COOKIE_SECURE: 'FALSE' })).toThrow(
      /ANKANU_COOKIE_SECURE must be true or false/,
    )
  })

  it('sets the staging compose api flag to false', () => {
    const compose = readFileSync(fileURLToPath(new URL('../../../compose.yaml', import.meta.url)), 'utf8')
    expect(compose).toContain('ANKANU_COOKIE_SECURE: "false"')
  })
})
