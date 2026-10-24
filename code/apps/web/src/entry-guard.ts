import { stubSessionsEnabled } from './member-route'

/** Server step guard. Client flags never decide the next screen. */

/**
 * `locked`: a live session that must enter its PIN first (the gate answers 401 PIN_REQUIRED).
 * `staff`: a staff session, MFA done or not (the gate answers 403). Member pages send it to the staff home.
 */
export type GateStep = 'email' | 'phone' | 'otp' | 'identity' | 'account' | 'anon' | 'locked' | 'staff'

export const STEP_PATH: Record<Exclude<GateStep, 'anon' | 'locked' | 'staff'>, string> = {
  email: '/email-verification',
  phone: '/phone',
  otp: '/otp',
  identity: '/id-liveness',
  account: '/onboarding',
}

const STUBS = new Set(['web', 'capacitor', 'mahram', 'staff'])

const OPEN = new Set(['/signup', '/signup/identity', '/signup/pseudonym', '/signup/account'])

const OWNED: Record<string, Exclude<GateStep, 'anon' | 'account' | 'staff' | 'locked'>> = {
  '/email-verification': 'email',
  '/phone': 'phone',
  '/otp': 'otp',
  '/id-liveness': 'identity',
}

const ACCOUNT = new Set([
  '/onboarding',
  '/photo-rules',
  '/profile-edit',
  '/profile-review',
  '/settings',
  '/settings/bloques',
  '/pin',
  '/decouvrir',
  '/discussions',
  '/invitations',
  '/profil',
  '/favoris',
])

export function pathnameOf(path: string): string {
  const bare = path.split('?')[0] ?? '/'
  if (bare.length > 1 && bare.endsWith('/')) {
    return bare.slice(0, -1)
  }
  return bare || '/'
}

/** Where this path must send the account, or null when the path is allowed. */
export function entryLocation(path: string, step: GateStep): string | null {
  const normalized = pathnameOf(path)
  if (step === 'staff') {
    // A staff session never opens member, signup or member sign-in chrome (AD-8, UX-DR27).
    return '/staff'
  }
  if (step === 'locked') {
    if (normalized === '/pin') {
      return null
    }
    // What a signed-out visitor may open stays open, so the member can still sign in again.
    // Every page that needs the account waits behind the PIN, then comes back here.
    const signedOut = entryLocation(path, 'anon')
    return signedOut === '/auth' ? `/pin?next=${encodeURIComponent(normalized)}` : signedOut
  }
  if (normalized === '/password-reset') {
    return null
  }
  if (normalized === '/age-gate') {
    return step === 'anon' ? '/signup/identity' : STEP_PATH[step]
  }
  if (normalized === '/auth') {
    if (step === 'anon') {
      return null
    }
    if (step === 'account') {
      return '/decouvrir'
    }
    return STEP_PATH[step]
  }
  if (OPEN.has(normalized)) {
    return step === 'anon' ? null : STEP_PATH[step]
  }
  if (normalized.startsWith('/privacy/status')) {
    if (step === 'anon') {
      return '/auth'
    }
    return step === 'account' ? null : STEP_PATH[step]
  }
  const owned = OWNED[normalized]
  if (owned) {
    if (step === 'anon') {
      return '/auth'
    }
    return step === owned ? null : STEP_PATH[step]
  }
  if (ACCOUNT.has(normalized) || isPublicProfilePath(normalized) || isInviteComposePath(normalized) || isChatThreadPath(normalized) || isReportPath(normalized)) {
    if (step === 'anon') {
      return '/auth'
    }
    return step === 'account' ? null : STEP_PATH[step]
  }
  return null
}

/** Screen 23. Report or Block one member (Stories 8.5, 8.6). */
export function isReportPath(path: string): boolean {
  return /^\/signaler\/[^/]+$/.test(path)
}

/** Screen 21. One Chat thread (Stories 5.1, 5.2). */
export function isChatThreadPath(path: string): boolean {
  return /^\/discussions\/[^/]+$/.test(path)
}

/** Screen 18. Invite compose for one recipient (Stories 4.1, 4.2). */
export function isInviteComposePath(path: string): boolean {
  return /^\/invitations\/envoyer\/[^/]+$/.test(path)
}

/** Screen 15. `/profil` with no id stays the member stub. */
export function isPublicProfilePath(path: string): boolean {
  return /^\/profil\/[^/]+$/.test(path)
}

export function readSessionCookie(header: string | null): string | null {
  if (!header) {
    return null
  }
  const found: string[] = []
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0 || trimmed.slice(0, eq).trim() !== 'ankanu_session') {
      continue
    }
    try {
      found.push(decodeURIComponent(trimmed.slice(eq + 1).trim()).trim())
    } catch {
      continue
    }
  }
  if (found.includes('staff')) {
    return 'staff'
  }
  return found[0] ?? null
}

export function isStubSession(value: string | null): boolean {
  return value !== null && STUBS.has(value) && stubSessionsEnabled()
}

export async function fetchGateStep(cookieHeader: string): Promise<GateStep | 'error'> {
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  try {
    const response = await fetch(`${origin}/v1/accounts/gate`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (response.status === 401) {
      const body = (await response.json().catch(() => null)) as { error?: { code?: unknown } } | null
      return body?.error?.code === 'PIN_REQUIRED' ? 'locked' : 'anon'
    }
    if (response.status === 403) {
      const body = (await response.json().catch(() => null)) as { error?: { details?: { reason?: unknown } | null } } | null
      const reason = body?.error?.details?.reason
      return reason === 'staff_session' || reason === 'staff_mfa_pending' ? 'staff' : 'error'
    }
    if (!response.ok) {
      return 'error'
    }
    const body = (await response.json()) as { step?: unknown }
    if (
      body.step === 'email' ||
      body.step === 'phone' ||
      body.step === 'otp' ||
      body.step === 'identity' ||
      body.step === 'account'
    ) {
      return body.step
    }
    return 'error'
  } catch {
    return 'error'
  }
}

function lastHop(value: string | null): string {
  if (!value) {
    return ''
  }
  const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : ''
}

function strictOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    if (url.username !== '' || url.password !== '') {
      return null
    }
    if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

function allowedOrigins(env: NodeJS.ProcessEnv): string[] {
  const raw = env.ANKANU_ALLOWED_ORIGINS
  if (raw === undefined || raw.trim() === '') {
    return []
  }
  const items: string[] = []
  for (const part of raw.split(',')) {
    const origin = strictOrigin(part)
    if (origin) {
      items.push(origin)
    }
  }
  return items
}

/** Keep the browser on an allowed origin. `request.url` is the bind address when Next listens on 0.0.0.0. */
export function redirectTo(request: Request, path: string, env: NodeJS.ProcessEnv = process.env): Response {
  const forwardedHost = lastHop(request.headers.get('x-ankanu-edge-host')) || lastHop(request.headers.get('x-forwarded-host'))
  const host = forwardedHost || lastHop(request.headers.get('host'))
  const forwardedProto =
    lastHop(request.headers.get('x-ankanu-edge-proto')) || lastHop(request.headers.get('x-forwarded-proto'))
  const proto = forwardedProto || new URL(request.url).protocol.replace(':', '') || 'http'
  const candidate =
    /^[A-Za-z0-9.-]+(?::\d+)?$/.test(host) && (proto === 'http' || proto === 'https')
      ? strictOrigin(`${proto}://${host}`)
      : null
  const allowed = allowedOrigins(env)
  const configured = strictOrigin((env.ANKANU_PUBLIC_ORIGIN ?? '').trim())
  const base =
    candidate && (allowed.length === 0 || allowed.includes(candidate))
      ? candidate
      : configured ?? new URL(request.url).origin
  return Response.redirect(new URL(path, `${base}/`), 303)
}

function emailLinkToken(request: Request, path: string): string {
  if (pathnameOf(path) !== '/email-verification') {
    return ''
  }
  try {
    return (new URL(request.url).searchParams.get('token') ?? '').trim()
  } catch {
    return ''
  }
}

export async function entryRedirect(
  request: Request,
  path: string,
  load: (cookieHeader: string) => Promise<GateStep | 'error'> = fetchGateStep,
): Promise<Response | null> {
  if (emailLinkToken(request, path).length > 0) {
    return null
  }
  const header = request.headers.get('cookie')
  const value = readSessionCookie(header)
  if (isStubSession(value)) {
    return null
  }
  let step: GateStep = 'anon'
  if (value) {
    const loaded = await load(header ?? '')
    if (loaded === 'error') {
      const normalized = pathnameOf(path)
      if (normalized === '/auth' || normalized === '/password-reset') {
        return null
      }
      return redirectTo(request, '/auth')
    }
    step = loaded
  }
  const target = entryLocation(path, step)
  if (!target || target === pathnameOf(path)) {
    return null
  }
  return redirectTo(request, target)
}
