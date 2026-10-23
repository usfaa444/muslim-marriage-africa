import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ERROR_CODES, errorEnvelope } from '@ankanu/kernel'
import { discoverHtml } from './discover-page'
import { chatThreadHtml, discussionsHtml, isConversationId } from './discussions-page'
import { notListablePage } from './not-listable'
import { favouritesHtml } from './favourites-page'
import { inviteComposeHtml, isInviteTargetId } from './invite-compose-page'
import { inviteInboxHtml } from './invite-inbox-page'
import { visitSignalsHtml } from './visit-signals-page'
import { staffReviewHtml } from './staff-review-page'
import { fillStaffHeader, staffHomeHtml, staffSignInHtml, type StaffIdentity, type StaffMfaState } from './staff-pages'
import { entryRedirect, readSessionCookie, redirectTo, type GateStep } from './entry-guard'
import { memberRouteResponse, sessionKind, type MemberPath } from './member-route'
import { profileDetailHtml, type ProfileDetailView } from './profile-detail'
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

function stitchFile(folder: string, name = 'screen.html'): string {
  const candidates = [
    resolve(process.cwd(), `../design-stitch/ankanu-v2/${folder}/${name}`),
    resolve(process.cwd(), `../../design-stitch/ankanu-v2/${folder}/${name}`),
    resolve(process.cwd(), `design-stitch/ankanu-v2/${folder}/${name}`),
    `/app/design-stitch/ankanu-v2/${folder}/${name}`,
  ]
  const found = candidates.find((path) => existsSync(path))
  if (!found) {
    throw new Error(`code/design-stitch/ankanu-v2/${folder}/${name} is not on disk`)
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

type StaffProbe = { status: number; state: StaffMfaState | null; identity: StaffIdentity | null; reason: string | null }

function staffState(value: unknown): StaffMfaState | null {
  return value === 'password_change' || value === 'enroll' || value === 'verify' || value === 'done' ? value : null
}

/** `GET /v1/staff/sessions/current`. Null when the API cannot be reached. */
async function probeStaffSession(cookie: string): Promise<StaffProbe | null> {
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  try {
    const response = await fetch(`${origin}/v1/staff/sessions/current`, { headers: { cookie }, cache: 'no-store' })
    const body = (await response.json().catch(() => null)) as {
      mfa_state?: unknown
      email?: unknown
      roles?: unknown
      error?: { details?: { reason?: unknown } | null }
    } | null
    const identity =
      body && typeof body.email === 'string' && Array.isArray(body.roles)
        ? { email: body.email, roles: body.roles.filter((role): role is string => typeof role === 'string') }
        : null
    const reason = body?.error?.details?.reason
    return {
      status: response.status,
      state: staffState(body?.mfa_state),
      identity,
      reason: typeof reason === 'string' ? reason : null,
    }
  } catch {
    return null
  }
}

/** Where a staff page sends a cookie that is not a full staff session, or null when it may render. */
async function staffPageGate(request: Request): Promise<{ redirect: Response } | { identity: StaffIdentity | null }> {
  const cookie = request.headers.get('cookie')
  const kind = sessionKind(cookie)
  if (kind === 'staff') {
    return { identity: null }
  }
  if (kind === 'web' || kind === 'capacitor' || kind === 'mahram') {
    return { redirect: redirectTo(request, '/decouvrir') }
  }
  if (!cookie || !readSessionCookie(cookie)) {
    return { redirect: redirectTo(request, '/staff/connexion') }
  }
  const probe = await probeStaffSession(cookie)
  if (probe?.status === 200 && probe.state === 'done') {
    return { identity: probe.identity }
  }
  if (probe?.status === 403 && probe.reason !== 'staff_mfa_pending') {
    return { redirect: redirectTo(request, '/decouvrir') }
  }
  return { redirect: redirectTo(request, '/staff/connexion') }
}

/** Screen 52. Staff sessions only. Members leave for their space; anyone else goes to the staff sign-in. */
export async function visitSignalsResponse(request: Request): Promise<Response> {
  const cookie = request.headers.get('cookie')
  const kind = sessionKind(cookie)
  const render = () => htmlResponse(fillStaffHeader(visitSignalsHtml(stitchFile('52-ts-visit-signals'), null), true))
  if (kind === 'staff') {
    return render()
  }
  if (kind === 'web' || kind === 'capacitor' || kind === 'mahram') {
    return redirectTo(request, '/decouvrir')
  }
  if (!cookie || !readSessionCookie(cookie)) {
    return redirectTo(request, '/staff/connexion')
  }
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  try {
    const probe = await fetch(`${origin}/v1/staff/signals/visits`, {
      headers: { cookie },
      cache: 'no-store',
    })
    if (probe.status === 403) {
      const body = (await probe.json().catch(() => null)) as { error?: { details?: { reason?: unknown } | null } } | null
      return redirectTo(request, body?.error?.details?.reason === 'staff_mfa_pending' ? '/staff/connexion' : '/decouvrir')
    }
    if (!probe.ok) {
      return redirectTo(request, '/staff/connexion')
    }
  } catch {
    return redirectTo(request, '/staff/connexion')
  }
  return render()
}

/** `/staff`: the staff home after sign-in. */
export async function staffHomeResponse(request: Request): Promise<Response> {
  const gate = await staffPageGate(request)
  if ('redirect' in gate) {
    return gate.redirect
  }
  return htmlResponse(staffHomeHtml(stitchFile('52-ts-visit-signals'), gate.identity))
}

/** `/staff/revue`: the staff review console. The API decides what each role sees (Operators: counts only). */
export async function staffReviewResponse(request: Request): Promise<Response> {
  const gate = await staffPageGate(request)
  if ('redirect' in gate) {
    return gate.redirect
  }
  return htmlResponse(staffReviewHtml(stitchFile('52-ts-visit-signals'), gate.identity))
}

/** `/staff/connexion`: staff sign-in. A full staff session goes home; `?leave=1` ends the session first. */
export async function staffSignInResponse(request: Request): Promise<Response> {
  if (new URL(request.url).searchParams.get('leave') === '1') {
    return leaveAccount(request, destroySession, '/staff/connexion')
  }
  const cookie = request.headers.get('cookie')
  const kind = sessionKind(cookie)
  if (kind === 'staff') {
    return redirectTo(request, '/staff')
  }
  let initial: StaffMfaState | null = null
  if (cookie && readSessionCookie(cookie) && kind === null) {
    const probe = await probeStaffSession(cookie)
    if (probe?.status === 200 && probe.state === 'done') {
      return redirectTo(request, '/staff')
    }
    if (probe?.status === 200) {
      initial = probe.state
    }
  }
  return htmlResponse(staffSignInHtml(stitchFile('52-ts-visit-signals'), siteKey(), initial))
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
export async function leaveAccount(
  request: Request,
  destroy: (cookie: string) => Promise<string | null> = destroySession,
  target = '/auth',
): Promise<Response> {
  const cleared = (await destroy(request.headers.get('cookie') ?? '')) ?? sessionClearCookie()
  const redirect = redirectTo(request, target)
  const headers = new Headers(redirect.headers)
  headers.append('set-cookie', cleared)
  return new Response(null, { status: redirect.status, headers })
}

export async function authResponse(
  request: Request,
  load?: (cookieHeader: string) => Promise<GateStep | 'error'>,
): Promise<Response> {
  const url = new URL(request.url)
  if (url.searchParams.get('leave') === '1') {
    return leaveAccount(request)
  }
  if (url.searchParams.get('mode') === 'signup') {
    return redirectTo(request, '/signup')
  }
  const redirect = await entryRedirect(request, '/auth', load)
  if (redirect) {
    return redirect
  }
  return htmlResponse(authHtml(stitchFile('02-auth'), 'login', siteKey()))
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

async function memberProfile(
  request: Request,
): Promise<{
  account_id?: unknown
  gender?: unknown
  review_sla_hours?: unknown
  bio_pending?: unknown
  photo?: unknown
} | null> {
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  try {
    const response = await fetch(`${origin}/v1/me/profile`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    })
    if (!response.ok) {
      return null
    }
    return (await response.json()) as {
      account_id?: unknown
      gender?: unknown
      review_sla_hours?: unknown
      bio_pending?: unknown
      photo?: unknown
    }
  } catch {
    return null
  }
}

export function settingsResponse(request: Request): Promise<Response> {
  return send(request, '/settings', settingsHtml(stitchFile('27-settings')))
}

/** Screen 17. Stub cookies stay on the JSON envelope. A live session gets the private list. */
export async function favouritesResponse(request: Request): Promise<Response> {
  const redirect = await entryRedirect(request, '/favoris')
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  if (sessionKind(cookie) !== null || readSessionCookie(cookie) === null) {
    return memberRouteResponse(cookie, '/favoris')
  }
  return htmlResponse(favouritesHtml(stitchFile('17-favourites')))
}

export function statusResponse(request: Request, path: string): Promise<Response> {
  return send(request, path, statusHtml(stitchFile('28-delete-export-status')))
}

/**
 * `/profil`. Stub cookies keep the JSON envelope. A live member session goes to the member's own profile
 * (`/profile-edit`). `/discussions` has its own screens since Stories 5.1 and 5.2 (`discussionsResponse`).
 */
export async function memberGuarded(request: Request, path: MemberPath): Promise<Response> {
  const redirect = await entryRedirect(request, path)
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  if (sessionKind(cookie) === null && readSessionCookie(cookie) !== null) {
    if (path === '/profil') {
      return redirectTo(request, '/profile-edit')
    }
  }
  return memberRouteResponse(cookie, path)
}

/**
 * Screen 19, Invite inbox (Stories 4.4, 4.5). Like the Invite compose page: staff and mahram stubs get the member-route
 * refusal; a member page (live session, or the `web` / `capacitor` dev stub) loads its three boxes in the browser, so
 * the API decides every refusal.
 */
export async function invitationsResponse(request: Request): Promise<Response> {
  const redirect = await entryRedirect(request, '/invitations')
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  const kind = sessionKind(cookie)
  if (kind === 'staff' || kind === 'mahram' || (kind === null && readSessionCookie(cookie) === null)) {
    return memberRouteResponse(cookie, '/invitations')
  }
  return htmlResponse(inviteInboxHtml(stitchFile('19-invite-inbox')))
}

/**
 * Screen 20, Discussions (Stories 5.1, 5.2). Like the Invite inbox: staff and mahram stubs get the member-route
 * refusal; a member page (live session, or the `web` / `capacitor` dev stub) loads its conversations in the browser,
 * so the API decides every refusal.
 */
export async function discussionsResponse(request: Request): Promise<Response> {
  const redirect = await entryRedirect(request, '/discussions')
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  const kind = sessionKind(cookie)
  if (kind === 'staff' || kind === 'mahram' || (kind === null && readSessionCookie(cookie) === null)) {
    return memberRouteResponse(cookie, '/discussions')
  }
  return htmlResponse(discussionsHtml(stitchFile('20-discussions-list')))
}

/** Screen 21, Chat thread (Stories 5.1, 5.2). Same gates as the list; a malformed id goes back to the list. */
export async function chatThreadResponse(request: Request, id: string): Promise<Response> {
  const redirect = await entryRedirect(request, `/discussions/${id}`)
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  const kind = sessionKind(cookie)
  if (kind === 'staff' || kind === 'mahram' || (kind === null && readSessionCookie(cookie) === null)) {
    return memberRouteResponse(cookie, '/discussions')
  }
  if (!isConversationId(id)) {
    return redirectTo(request, '/discussions')
  }
  return htmlResponse(chatThreadHtml(stitchFile('21-chat-thread'), id))
}

/**
 * Screen 18, Invite compose (Stories 4.1, 4.2). Staff and mahram stubs get the member-route refusal; a member page
 * loads the recipient and quota in the browser, so the API decides every refusal.
 */
export async function inviteComposeResponse(request: Request, id: string): Promise<Response> {
  const redirect = await entryRedirect(request, `/invitations/envoyer/${id}`)
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  const kind = sessionKind(cookie)
  if (kind === 'staff' || kind === 'mahram') {
    return memberRouteResponse(cookie, '/invitations')
  }
  if (!isInviteTargetId(id)) {
    return redirectTo(request, '/decouvrir')
  }
  return htmlResponse(inviteComposeHtml(stitchFile('18-invite-compose-flash'), id))
}

/** Screen 57. Stub cookies stay on the JSON envelope. A live session gets the card chrome. */
export async function discoverResponse(request: Request): Promise<Response> {
  const redirect = await entryRedirect(request, '/decouvrir')
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  if (sessionKind(cookie) !== null || readSessionCookie(cookie) === null) {
    return memberRouteResponse(cookie, '/decouvrir')
  }
  const profile = await memberProfile(request)
  const accountId = typeof profile?.account_id === 'string' ? profile.account_id : null
  const gender = profile?.gender === 'sister' || profile?.gender === 'brother' ? profile.gender : ''
  return htmlResponse(
    discoverHtml(
      stitchFile('57-discover'),
      stitchFile('57-discover', 'grid.html'),
      accountId,
      gender,
      new URL(request.url).search,
    ),
  )
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isProfileDetailView(value: unknown): value is ProfileDetailView {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const body = value as ProfileDetailView
  const profile = body.profile
  const verification = body.verification
  if (typeof profile !== 'object' || profile === null || typeof verification !== 'object' || verification === null) {
    return false
  }
  if (typeof profile.id !== 'string' || typeof profile.pseudonym !== 'string' || !Array.isArray(body.photos)) {
    return false
  }
  if (typeof profile.age !== 'number' && profile.age !== null) {
    return false
  }
  if (
    !isNullableString(profile.city) ||
    !isNullableString(profile.country) ||
    !isNullableString(profile.profession) ||
    !isNullableString(profile.marital_status) ||
    !isNullableString(profile.polygamy_intent) ||
    !isNullableString(profile.madhhab) ||
    !isNullableString(profile.practice) ||
    !isNullableString(profile.life_plans)
  ) {
    return false
  }
  if (
    typeof verification.phone !== 'boolean' ||
    typeof verification.id !== 'boolean' ||
    typeof verification.mahram !== 'boolean' ||
    typeof body.photo_blur !== 'boolean'
  ) {
    return false
  }
  return body.photos.every(
    (photo) =>
      typeof photo === 'object' &&
      photo !== null &&
      typeof photo.id === 'string' &&
      typeof photo.is_main === 'boolean' &&
      typeof photo.url === 'string' &&
      photo.url.length > 0,
  )
}

function stubProfileResponse(cookie: string | null): Response | null {
  const kind = sessionKind(cookie)
  if (kind === 'staff' || kind === 'mahram') {
    return memberRouteResponse(cookie, '/decouvrir')
  }
  if (kind === 'web' || kind === 'capacitor') {
    return memberRouteResponse(cookie, '/profil')
  }
  return null
}

/** Screen 15. `/profil` without an id stays the member stub. */
export async function profileDetailResponse(request: Request, id: string): Promise<Response> {
  const redirect = await entryRedirect(request, `/profil/${id}`)
  if (redirect) {
    return redirect
  }
  const cookie = request.headers.get('cookie')
  const stub = stubProfileResponse(cookie)
  if (stub) {
    return stub
  }
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  let response: Response
  try {
    response = await fetch(`${origin}/v1/profiles/${encodeURIComponent(id)}`, {
      headers: { cookie: cookie ?? '' },
      cache: 'no-store',
    })
  } catch {
    return jsonResponse(
      500,
      errorEnvelope({
        code: ERROR_CODES.UNHANDLED,
        message: 'Request failed',
        details: null,
        retryable: false,
      }),
    )
  }
  const payload = await response.json().catch(() => null)
  if (response.status === 200 && isProfileDetailView(payload)) {
    return htmlResponse(profileDetailHtml(stitchFile('15-profile-detail'), payload))
  }
  const code =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? (payload as { error?: { code?: string } }).error?.code
      : undefined
  if (code === 'PIN_REQUIRED') {
    return redirectTo(request, `/pin?next=${encodeURIComponent(`/profil/${id}`)}`)
  }
  if (response.status === 404) {
    return redirectTo(request, '/decouvrir')
  }
  const reason =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? (payload as { error?: { details?: { reason?: string } | null } }).error?.details?.reason
      : undefined
  if (response.status === 403 && reason === 'viewer_not_listable') {
    const details =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? (payload as { error?: { details?: unknown } }).error?.details ?? null
        : null
    return htmlResponse(
      notListablePage(stitchFile('12-profile-not-yet-public'), details),
    )
  }
  if (payload !== null) {
    return jsonResponse(response.status, payload)
  }
  return jsonResponse(
    500,
    errorEnvelope({
      code: ERROR_CODES.UNHANDLED,
      message: 'Request failed',
      details: null,
      retryable: false,
    }),
  )
}
