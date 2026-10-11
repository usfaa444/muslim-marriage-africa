import { currentEdge, type EdgeView } from './edge-request.js'

export const SESSION_COOKIE = 'ankanu_session'

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
export const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

const COOKIE_SECURE = 'ANKANU_COOKIE_SECURE'
const PUBLIC_ORIGIN = 'ANKANU_PUBLIC_ORIGIN'

/** Unset or `true` stays Secure. Only the exact string `false` turns it off. */
export function cookieSecure(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env[COOKIE_SECURE]
  if (raw === undefined || raw === '') {
    return true
  }
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  throw new Error('ANKANU_COOKIE_SECURE must be true or false')
}

function originIsHttps(origin: string): boolean {
  const trimmed = origin.trim()
  try {
    return new URL(trimmed).protocol === 'https:'
  } catch {
    return trimmed.toLowerCase().startsWith('https:')
  }
}

/** Https stays Secure. Secure is omitted only for plain http on an allowed http origin. */
export function cookieIsSecure(env: NodeJS.ProcessEnv = process.env, view?: EdgeView): boolean {
  const edge = view ?? currentEdge()
  if (!edge) {
    return cookieSecure(env)
  }
  if (edge.trustedHttps) {
    return true
  }
  if (edge.httpOriginAllowed) {
    return false
  }
  return true
}

/** Refuse an insecure cookie when the configured public origin is https. Unset is not https. */
export function assertCookieSecureBoot(env: NodeJS.ProcessEnv = process.env): void {
  if (cookieSecure(env)) {
    return
  }
  const origin = env[PUBLIC_ORIGIN]
  if (origin === undefined || origin === '') {
    return
  }
  if (originIsHttps(origin)) {
    throw new Error('ANKANU_COOKIE_SECURE=false is refused when ANKANU_PUBLIC_ORIGIN is https')
  }
}

/** Clears the browser session. Empty value, same attributes, Max-Age=0. */
export function clearSessionCookieHeader(env: NodeJS.ProcessEnv = process.env, view?: EdgeView): string {
  const secure = cookieIsSecure(env, view) ? '; Secure' : ''
  return `${SESSION_COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`
}

export function sessionCookieHeader(
  sessionId: string,
  maxAgeSeconds: number | null,
  env: NodeJS.ProcessEnv = process.env,
  view?: EdgeView,
): string {
  const parts = [`${SESSION_COOKIE}=${sessionId}`, 'Path=/', 'HttpOnly']
  if (cookieIsSecure(env, view)) {
    parts.push('Secure')
  }
  parts.push('SameSite=Lax')
  if (maxAgeSeconds !== null) {
    parts.push(`Max-Age=${maxAgeSeconds}`)
  }
  return parts.join('; ')
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) {
    return undefined
  }
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const splitAt = trimmed.indexOf('=')
    if (splitAt <= 0) {
      continue
    }
    if (trimmed.slice(0, splitAt) === name) {
      return trimmed.slice(splitAt + 1)
    }
  }
  return undefined
}

export function rememberMeMaxAge(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
}
