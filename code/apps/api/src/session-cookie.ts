export const SESSION_COOKIE = 'ankanu_session'

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
export const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

/** Clears the browser session. Empty value, same attributes, Max-Age=0. */
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export function sessionCookieHeader(sessionId: string, maxAgeSeconds: number | null): string {
  const parts = [`${SESSION_COOKIE}=${sessionId}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax']
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
