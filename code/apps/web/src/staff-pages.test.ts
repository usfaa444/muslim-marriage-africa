import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { entryLocation, entryRedirect, fetchGateStep } from './entry-guard.js'
import { fillStaffHeader, staffHomeHtml, staffSignInHtml, STAFF_BADGE_TEXT } from './staff-pages.js'
import { staffHomeResponse, staffSignInResponse, visitSignalsResponse } from './v2-serve.js'
import { visitSignalsHtml } from './visit-signals-page.js'

const stitch52 = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/ankanu-v2/52-ts-visit-signals/screen.html', import.meta.url)),
  'utf8',
)

const MEMBER_NAV = ['Découvrir', 'Discussions', 'href="/profil"', 'href="/decouvrir"', 'href="/invitations"', 'data-shell="member"']

const originalFetch = globalThis.fetch

function apiAnswers(status: number, body: unknown): string[] {
  const calls: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  return calls
}

function request(path: string, cookie?: string): Request {
  return new Request(`http://127.0.0.1${path}`, cookie ? { headers: { cookie } } : {})
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('staff shell (Story 12.1)', () => {
  it('puts the staff-only badge on the sign-in page, with no member nav and every field labelled', () => {
    const html = staffSignInHtml(stitch52, 'site-key-for-test', null)
    expect(html).toContain('lang="fr"')
    expect(html).toContain('data-testid="staff-only-badge"')
    expect(html).toContain(STAFF_BADGE_TEXT)
    expect(html).toContain('data-shell="staff"')
    for (const item of MEMBER_NAV) {
      expect(html).not.toContain(item)
    }
    expect(html).not.toContain('Se déconnecter')
    expect(html).toContain('<h1 class="font-display text-3xl text-deep-navy font-normal">Connexion staff</h1>')
    for (const id of ['staff-email', 'staff-password', 'staff-new-password', 'staff-enroll-code', 'staff-verify-code']) {
      expect(html).toContain(`for="${id}"`)
      expect(html).toContain(`id="${id}"`)
    }
    expect(html).toContain('autocomplete="one-time-code"')
    expect(html).toContain('inputmode="numeric"')
    expect(html).toContain('id="staff-recaptcha"')
    expect(html).toContain('render=explicit')
    expect(html).toContain('role="alert"')
    expect(html).toMatch(/class="mt-6 space-y-5" id="staff-step-login"/)
    expect(html).toMatch(/class="mt-6 space-y-5 hidden" id="staff-step-password"/)
    expect(html).toMatch(/class="mt-6 space-y-5 hidden" id="staff-step-enroll"/)
    expect(html).toMatch(/class="mt-6 space-y-5 hidden" id="staff-step-verify"/)
    expect(html).toContain("'/v1/staff/sessions'")
    expect(html).toContain("'/v1/staff/sessions/password'")
    expect(html).toContain("'/v1/staff/sessions/enrollment'")
    expect(html).toContain("'/v1/staff/sessions/mfa'")
    // The demo Tailwind config stays; Stitch demo scripts never ship.
    expect(html).toContain('id="tailwind-config"')
    expect(html).not.toContain('Retour à la console de modération')
    expect(html).not.toContain('Instruction du dossier')
  })

  it('opens on the step the server reports for an MFA-pending session', () => {
    const enroll = staffSignInHtml(stitch52, '', 'enroll')
    expect(enroll).toMatch(/class="mt-6 space-y-5 hidden" id="staff-step-login"/)
    expect(enroll).toMatch(/class="mt-6 space-y-5" id="staff-step-enroll"/)
    expect(enroll).toContain('var initial = "enroll"')
    expect(enroll).toContain("Configurer l'application d'authentification")
    expect(enroll).toContain('Clé de configuration manuelle')
    expect(enroll).not.toContain('render=explicit')
    const verify = staffSignInHtml(stitch52, '', 'verify')
    expect(verify).toMatch(/class="mt-6 space-y-5" id="staff-step-verify"/)
    const password = staffSignInHtml(stitch52, '', 'password_change')
    expect(password).toMatch(/class="mt-6 space-y-5" id="staff-step-password"/)
    expect(password).toContain('Choisissez un nouveau mot de passe')
  })

  it('renders the staff home as two panes from 768 px with the queue first, and escapes the identity', () => {
    const html = staffHomeHtml(stitch52, { email: 'mod<x>@example.bf', roles: ['moderator', 'operator'] })
    expect(html).toContain('data-testid="staff-only-badge"')
    expect(html).toContain('Se déconnecter')
    expect(html).toContain('href="/staff/connexion?leave=1"')
    for (const item of MEMBER_NAV) {
      expect(html).not.toContain(item)
    }
    expect(html).toContain('class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start" data-testid="staff-panes"')
    const queue = html.indexOf('data-pane="queue"')
    const caseAt = html.indexOf('data-pane="case"')
    expect(queue).toBeGreaterThan(0)
    expect(caseAt).toBeGreaterThan(queue)
    expect(html).toContain('md:col-span-5')
    expect(html).toContain('md:col-span-7')
    expect(html).toContain('href="/staff/visit-signals"')
    expect(html).toContain('Console de modération')
    expect(html).toContain('Modérateur, Opérateur • mod&lt;x&gt;@example.bf')
    expect(html).not.toContain('mod<x>')
  })

  it('fills the empty Stitch 52 header on the visit-signals page with the staff header', () => {
    const html = fillStaffHeader(visitSignalsHtml(stitch52, null), true)
    expect(html).toContain('data-testid="staff-only-badge"')
    expect(html).toContain('data-shell="staff"')
    expect(html.indexOf('data-testid="staff-only-badge"')).toBeLessThan(html.indexOf('<main'))
  })
})

describe('staff page routing (Story 12.1)', () => {
  it('sends the staff home to sign-in, member space, or renders it, from the API answer', async () => {
    expect((await staffHomeResponse(request('/staff'))).headers.get('location')).toContain('/staff/connexion')
    expect((await staffHomeResponse(request('/staff', 'ankanu_session=web'))).headers.get('location')).toContain('/decouvrir')
    expect((await staffHomeResponse(request('/staff', 'ankanu_session=mahram'))).headers.get('location')).toContain('/decouvrir')
    const stub = await staffHomeResponse(request('/staff', 'ankanu_session=staff'))
    expect(stub.status).toBe(200)
    expect(await stub.text()).toContain('data-testid="staff-only-badge"')

    const cookie = 'ankanu_session=01990000-0000-7000-8000-000000000001'
    const calls = apiAnswers(200, { kind: 'staff', mfa_state: 'done', roles: ['operator'], email: 'op@example.bf' })
    const done = await staffHomeResponse(request('/staff', cookie))
    expect(done.status).toBe(200)
    expect(done.headers.get('cache-control')).toBe('no-store')
    expect(await done.text()).toContain('Opérateur • op@example.bf')
    expect(calls[0]).toContain('/v1/staff/sessions/current')

    apiAnswers(200, { kind: 'staff', mfa_state: 'verify', roles: ['operator'], email: 'op@example.bf' })
    expect((await staffHomeResponse(request('/staff', cookie))).headers.get('location')).toContain('/staff/connexion')
    apiAnswers(401, { error: { code: 'UNAUTHENTICATED' } })
    expect((await staffHomeResponse(request('/staff', cookie))).headers.get('location')).toContain('/staff/connexion')
    apiAnswers(403, { error: { code: 'FORBIDDEN', details: null } })
    expect((await staffHomeResponse(request('/staff', cookie))).headers.get('location')).toContain('/decouvrir')
    apiAnswers(500, null)
    expect((await staffHomeResponse(request('/staff', cookie))).headers.get('location')).toContain('/staff/connexion')
  })

  it('serves the staff sign-in, resumes a pending step, sends a full session home, and signs out', async () => {
    const anon = await staffSignInResponse(request('/staff/connexion'))
    expect(anon.status).toBe(200)
    expect(await anon.text()).toMatch(/class="mt-6 space-y-5" id="staff-step-login"/)
    expect((await staffSignInResponse(request('/staff/connexion', 'ankanu_session=staff'))).headers.get('location')).toContain('/staff')

    const cookie = 'ankanu_session=01990000-0000-7000-8000-000000000002'
    apiAnswers(200, { kind: 'staff', mfa_state: 'enroll', roles: ['moderator'], email: 'm@example.bf' })
    const pending = await staffSignInResponse(request('/staff/connexion', cookie))
    expect(pending.status).toBe(200)
    expect(await pending.text()).toMatch(/class="mt-6 space-y-5" id="staff-step-enroll"/)
    apiAnswers(200, { kind: 'staff', mfa_state: 'done', roles: ['moderator'], email: 'm@example.bf' })
    const done = await staffSignInResponse(request('/staff/connexion', cookie))
    expect(done.status).toBe(303)
    expect(done.headers.get('location')).toMatch(/\/staff$/)

    const calls = apiAnswers(204, null)
    const leave = await staffSignInResponse(request('/staff/connexion?leave=1', cookie))
    expect(leave.status).toBe(303)
    expect(leave.headers.get('location')).toContain('/staff/connexion')
    expect(leave.headers.get('set-cookie')).toContain('ankanu_session=;')
    expect(calls[0]).toContain('/v1/sessions/current')
  })

  it('sends an MFA-pending staff session from the visit-signals page to the staff sign-in', async () => {
    apiAnswers(403, { error: { code: 'FORBIDDEN', details: { reason: 'staff_mfa_pending' } } })
    const response = await visitSignalsResponse(request('/staff/visit-signals', 'ankanu_session=01990000-0000-7000-8000-000000000003'))
    expect(response.headers.get('location')).toContain('/staff/connexion')
  })

  it('sends a staff session from every member page to the staff home', async () => {
    for (const path of ['/auth', '/decouvrir', '/profile-edit', '/settings', '/signup', '/onboarding', '/phone', '/profil/abc', '/password-reset', '/privacy/status/x']) {
      expect(entryLocation(path, 'staff'), path).toBe('/staff')
    }
    apiAnswers(403, { error: { code: 'FORBIDDEN', details: { reason: 'staff_session' } } })
    expect(await fetchGateStep('ankanu_session=x')).toBe('staff')
    apiAnswers(403, { error: { code: 'FORBIDDEN', details: { reason: 'staff_mfa_pending' } } })
    expect(await fetchGateStep('ankanu_session=x')).toBe('staff')
    apiAnswers(403, { error: { code: 'FORBIDDEN', details: null } })
    expect(await fetchGateStep('ankanu_session=x')).toBe('error')
    const redirect = await entryRedirect(
      request('/decouvrir', 'ankanu_session=01990000-0000-7000-8000-000000000004'),
      '/decouvrir',
      async () => 'staff',
    )
    expect(redirect?.status).toBe(303)
    expect(redirect?.headers.get('location')).toMatch(/\/staff$/)
  })
})
