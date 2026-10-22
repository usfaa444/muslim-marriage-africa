import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GET as getAuth } from '../app/auth/route.js'
import { GET as getDecouvrir } from '../app/decouvrir/route.js'
import { GET as getFavoris } from '../app/favoris/route.js'
import { GET as getPin } from '../app/pin/route.js'
import { GET as getProfileEdit } from '../app/profile-edit/route.js'
import { GET as getProfileReview } from '../app/profile-review/route.js'
import { entryLocation, entryRedirect, fetchGateStep } from './entry-guard.js'

// A session locked by its PIN (idle, restart, or POST /v1/pin/lock) is still a session: the API
// answers the gate with 401 PIN_REQUIRED. It must reach /pin to unlock; a signed-out visitor
// still goes to /auth.

const LOCKED = { error: { code: 'PIN_REQUIRED', message: 'Code PIN requis.', details: null, retryable: false } }
const SIGNED_OUT = { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.', details: null, retryable: false } }

const original = globalThis.fetch
let gate: Response = Response.json(LOCKED, { status: 401 })
const asked: string[] = []

beforeEach(() => {
  asked.length = 0
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    asked.push(new URL(url).pathname)
    return gate.clone()
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = original
})

function member(path: string): Request {
  return new Request(`http://localhost${path}`, { headers: { cookie: 'ankanu_session=real-session' } })
}

describe('a session locked by its PIN', () => {
  it('reads the gate 401 PIN_REQUIRED as locked, and any other 401 as signed out', async () => {
    gate = Response.json(LOCKED, { status: 401 })
    expect(await fetchGateStep('ankanu_session=real-session')).toBe('locked')
    gate = Response.json(SIGNED_OUT, { status: 401 })
    expect(await fetchGateStep('ankanu_session=real-session')).toBe('anon')
    gate = new Response('not json', { status: 401 })
    expect(await fetchGateStep('ankanu_session=real-session')).toBe('anon')
    expect(asked).toEqual(['/v1/accounts/gate', '/v1/accounts/gate', '/v1/accounts/gate'])
  })

  it('opens the PIN screen and sends every member page there, coming back to it after the unlock', () => {
    expect(entryLocation('/pin', 'locked')).toBeNull()
    expect(entryLocation('/decouvrir', 'locked')).toBe('/pin?next=%2Fdecouvrir')
    expect(entryLocation('/profile-edit', 'locked')).toBe('/pin?next=%2Fprofile-edit')
    expect(entryLocation('/favoris', 'locked')).toBe('/pin?next=%2Ffavoris')
    expect(entryLocation('/settings', 'locked')).toBe('/pin?next=%2Fsettings')
    expect(entryLocation('/onboarding', 'locked')).toBe('/pin?next=%2Fonboarding')
    expect(entryLocation('/email-verification', 'locked')).toBe('/pin?next=%2Femail-verification')
    expect(entryLocation('/privacy/status/ticket-1', 'locked')).toBe('/pin?next=%2Fprivacy%2Fstatus%2Fticket-1')
    expect(entryLocation('/profil/01990000-0000-7000-8000-000000000001', 'locked')).toBe(
      '/pin?next=%2Fprofil%2F01990000-0000-7000-8000-000000000001',
    )
    // Sign-in, sign-up and password reset stay open, so "S'identifier à nouveau" works.
    expect(entryLocation('/auth', 'locked')).toBeNull()
    expect(entryLocation('/signup', 'locked')).toBeNull()
    expect(entryLocation('/password-reset', 'locked')).toBeNull()
    // Unchanged for a visitor with no session.
    expect(entryLocation('/pin', 'anon')).toBe('/auth')
    expect(entryLocation('/decouvrir', 'anon')).toBe('/auth')
  })

  it('serves /pin to a locked session and sends its member pages to /pin with a return path', async () => {
    gate = Response.json(LOCKED, { status: 401 })
    const pin = await getPin(member('/pin?next=%2Fprofile-edit'))
    expect(pin.status).toBe(200)
    expect(await pin.text()).toContain('pin-dot')

    for (const [handler, path] of [
      [getDecouvrir, '/decouvrir'],
      [getFavoris, '/favoris'],
      [getProfileEdit, '/profile-edit'],
      [getProfileReview, '/profile-review'],
    ] as const) {
      const page = await handler(member(path))
      expect(page.status, path).toBe(303)
      expect(page.headers.get('location'), path).toBe(`http://localhost/pin?next=${encodeURIComponent(path)}`)
    }

    const auth = await getAuth(member('/auth'))
    expect(auth.status).toBe(200)
    expect(await auth.text()).toContain('login-email')
  })

  it('still sends a visitor whose session is gone from /pin and member pages to sign-in', async () => {
    gate = Response.json(SIGNED_OUT, { status: 401 })
    for (const path of ['/pin', '/decouvrir', '/profile-edit']) {
      const redirect = await entryRedirect(member(path), path)
      expect(redirect?.status, path).toBe(303)
      expect(redirect?.headers.get('location'), path).toBe('http://localhost/auth')
    }
    const pin = await getPin(new Request('http://localhost/pin'))
    expect(pin.status).toBe(303)
    expect(pin.headers.get('location')).toBe('http://localhost/auth')
  })
})
