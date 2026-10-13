import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { entryRedirect, redirectTo } from './entry-guard'
import { memberRouteResponse, type MemberPath } from './member-route'
import {
  authHtml,
  emailHtml,
  idHtml,
  identityHtml,
  onboardingHtml,
  otpHtml,
  phoneHtml,
  pendingProfilePhoto,
  photoHtml,
  pinHtml,
  profileHtml,
  reviewHtml,
  pseudonymHtml,
  resetHtml,
  settingsHtml,
  splashHtml,
  statusHtml,
} from './v2-pages'

function stitchFile(folder: string): string {
  const candidates = [
    resolve(process.cwd(), `../design-stitch/ankanu-v2/${folder}/screen.html`),
    resolve(process.cwd(), `../../design-stitch/ankanu-v2/${folder}/screen.html`),
    resolve(process.cwd(), `design-stitch/ankanu-v2/${folder}/screen.html`),
    `/app/design-stitch/ankanu-v2/${folder}/screen.html`,
  ]
  const found = candidates.find((path) => existsSync(path))
  if (!found) {
    throw new Error(`code/design-stitch/ankanu-v2/${folder}/screen.html is not on disk`)
  }
  return readFileSync(found, 'utf8')
}

function siteKey(): string {
  return process.env.RECAPTCHA_SITE_KEY ?? ''
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function send(request: Request, path: string, html: string): Promise<Response> {
  const redirect = await entryRedirect(request, path)
  if (redirect) {
    return redirect
  }
  return htmlResponse(html)
}

export function signupResponse(request: Request): Promise<Response> {
  return send(request, '/signup', splashHtml())
}

export function identityResponse(request: Request): Promise<Response> {
  return send(request, '/signup/identity', identityHtml(stitchFile('03-age-gate')))
}

export function pseudonymResponse(request: Request): Promise<Response> {
  return send(request, '/signup/pseudonym', pseudonymHtml(stitchFile('54-pseudonym-dob')))
}

export function signupAccountResponse(request: Request): Promise<Response> {
  return send(request, '/signup/account', authHtml(stitchFile('02-auth'), 'signup', siteKey()))
}

function sessionClearCookie(): string {
  const secure = process.env.ANKANU_COOKIE_SECURE === 'false' ? '' : '; Secure'
  return `ankanu_session=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`
}

function clearedSessionCookie(response: Response): string | null {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  const listed = headers.getSetCookie?.() ?? []
  const found = listed.find((value) => value.toLowerCase().includes('ankanu_session='))
  if (found) {
    return found
  }
  const single = response.headers.get('set-cookie')
  if (single && single.toLowerCase().includes('ankanu_session=')) {
    return single
  }
  return null
}

async function destroySession(cookie: string): Promise<string | null> {
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  try {
    const response = await fetch(`${origin}/v1/sessions/current`, {
      method: 'DELETE',
      headers: cookie ? { cookie } : {},
      cache: 'no-store',
    })
    return clearedSessionCookie(response)
  } catch {
    return null
  }
}

/** Ends the session, then sends the browser to the sign-in panel with the cookie cleared. */
export async function leaveAccount(request: Request, destroy: (cookie: string) => Promise<string | null> = destroySession): Promise<Response> {
  const cleared = (await destroy(request.headers.get('cookie') ?? '')) ?? sessionClearCookie()
  const redirect = redirectTo(request, '/auth')
  const headers = new Headers(redirect.headers)
  headers.append('set-cookie', cleared)
  return new Response(null, { status: redirect.status, headers })
}

export async function authResponse(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.searchParams.get('leave') === '1') {
    return leaveAccount(request)
  }
  if (url.searchParams.get('mode') === 'signup') {
    return redirectTo(request, '/signup')
  }
  return send(request, '/auth', authHtml(stitchFile('02-auth'), 'login', siteKey()))
}

export async function ageGateResponse(request: Request): Promise<Response> {
  const redirect = await entryRedirect(request, '/age-gate')
  if (redirect) {
    return redirect
  }
  return redirectTo(request, '/signup/identity')
}

export function emailResponse(request: Request): Promise<Response> {
  return send(request, '/email-verification', emailHtml(stitchFile('04-email-verification')))
}

export function phoneResponse(request: Request): Promise<Response> {
  return send(request, '/phone', phoneHtml(stitchFile('06-otp')))
}

export function otpResponse(request: Request): Promise<Response> {
  return send(request, '/otp', otpHtml(stitchFile('56-otp-alt')))
}

export function idResponse(request: Request): Promise<Response> {
  return send(request, '/id-liveness', idHtml(stitchFile('07-id-liveness')))
}

export function resetResponse(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token')
  const view = token && token.length > 0 ? 'renew' : 'request'
  return send(request, '/password-reset', resetHtml(stitchFile('05-password-reset'), view))
}

export function pinResponse(request: Request): Promise<Response> {
  return send(request, '/pin', pinHtml(stitchFile('10-pin-lock')))
}

export function onboardingResponse(request: Request): Promise<Response> {
  return send(request, '/onboarding', onboardingHtml(stitchFile('08-onboarding')))
}

export function photoResponse(request: Request): Promise<Response> {
  return send(request, '/photo-rules', photoHtml(stitchFile('09-photo-rules')))
}

export function profileResponse(request: Request): Promise<Response> {
  return send(request, '/profile-edit', profileHtml(stitchFile('11-profile-edit')))
}

export async function profileReviewResponse(request: Request): Promise<Response> {
  const redirect = await entryRedirect(request, '/profile-review')
  if (redirect) {
    return redirect
  }
  const profile = await memberProfile(request)
  if (!profile || !pendingProfilePhoto(profile)) {
    return redirectTo(request, '/profile-edit')
  }
  const hours = profile.review_sla_hours
  if (typeof hours !== 'number' || !Number.isInteger(hours) || hours < 1) {
    return redirectTo(request, '/profile-edit')
  }
  const bioPending = typeof profile.bio_pending === 'string' && profile.bio_pending.trim() !== ''
  return htmlResponse(reviewHtml(stitchFile('12-profile-not-yet-public'), { slaHours: hours, bioPending }))
}

async function memberProfile(request: Request): Promise<{ review_sla_hours?: unknown; bio_pending?: unknown; photo?: unknown } | null> {
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  try {
    const response = await fetch(`${origin}/v1/me/profile`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    })
    if (!response.ok) {
      return null
    }
    return (await response.json()) as { review_sla_hours?: unknown; bio_pending?: unknown; photo?: unknown }
  } catch {
    return null
  }
}

export function settingsResponse(request: Request): Promise<Response> {
  return send(request, '/settings', settingsHtml(stitchFile('27-settings')))
}

export function statusResponse(request: Request, path: string): Promise<Response> {
  return send(request, path, statusHtml(stitchFile('28-delete-export-status')))
}

export async function memberGuarded(request: Request, path: MemberPath): Promise<Response> {
  const redirect = await entryRedirect(request, path)
  if (redirect) {
    return redirect
  }
  return memberRouteResponse(request.headers.get('cookie'), path)
}
