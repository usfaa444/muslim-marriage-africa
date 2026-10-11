/** Server step guard. Client flags never decide the next screen. */

export type GateStep = 'email' | 'phone' | 'otp' | 'identity' | 'account' | 'anon'

export const STEP_PATH: Record<Exclude<GateStep, 'anon'>, string> = {
  email: '/email-verification',
  phone: '/phone',
  otp: '/otp',
  identity: '/id-liveness',
  account: '/onboarding',
}

const STUBS = new Set(['web', 'capacitor', 'mahram', 'staff'])

const OPEN = new Set(['/signup', '/signup/identity', '/signup/pseudonym', '/signup/account'])

const OWNED: Record<string, Exclude<GateStep, 'anon' | 'account'>> = {
  '/email-verification': 'email',
  '/phone': 'phone',
  '/otp': 'otp',
  '/id-liveness': 'identity',
}

const ACCOUNT = new Set([
  '/onboarding',
  '/photo-rules',
  '/profile-edit',
  '/settings',
  '/pin',
  '/decouvrir',
  '/discussions',
  '/invitations',
  '/profil',
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
  if (normalized === '/password-reset') {
    return null
  }
  if (normalized === '/age-gate') {
    return step === 'anon' ? '/signup/identity' : STEP_PATH[step]
  }
  if (normalized === '/auth') {
    return step === 'anon' ? null : STEP_PATH[step]
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
  if (ACCOUNT.has(normalized)) {
    if (step === 'anon') {
      return '/auth'
    }
    return step === 'account' ? null : STEP_PATH[step]
  }
  return null
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
  return value !== null && STUBS.has(value)
}

export async function fetchGateStep(cookieHeader: string): Promise<GateStep | 'error'> {
  const origin = process.env.ANKANU_API_ORIGIN ?? 'http://api:3000'
  try {
    const response = await fetch(`${origin}/v1/accounts/gate`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (response.status === 401) {
      return 'anon'
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

export async function entryRedirect(
  request: Request,
  path: string,
  load: (cookieHeader: string) => Promise<GateStep | 'error'> = fetchGateStep,
): Promise<Response | null> {
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
      return Response.redirect(new URL('/auth', request.url), 303)
    }
    step = loaded
  }
  const target = entryLocation(path, step)
  if (!target || target === pathnameOf(path)) {
    return null
  }
  return Response.redirect(new URL(target, request.url), 303)
}
