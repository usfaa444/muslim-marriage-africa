import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { entryRedirect } from './entry-guard'
import { memberRouteResponse, type MemberPath } from './member-route'
import {
  authHtml,
  emailHtml,
  idHtml,
  identityHtml,
  onboardingHtml,
  otpHtml,
  phoneHtml,
  photoHtml,
  pinHtml,
  profileHtml,
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

export async function authResponse(request: Request): Promise<Response> {
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode === 'signup') {
    return Response.redirect(new URL('/signup', request.url), 303)
  }
  return send(request, '/auth', authHtml(stitchFile('02-auth'), 'login', siteKey()))
}

export async function ageGateResponse(request: Request): Promise<Response> {
  const redirect = await entryRedirect(request, '/age-gate')
  if (redirect) {
    return redirect
  }
  return Response.redirect(new URL('/signup/identity', request.url), 303)
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
  return send(request, '/password-reset', resetHtml(stitchFile('05-password-reset')))
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
