import { ERROR_CODES, errorEnvelope, type ErrorEnvelope } from '@ankanu/kernel'

export const SESSION_COOKIE = 'ankanu_session'

export const MEMBER_PATHS = ['/decouvrir', '/invitations', '/discussions', '/profil'] as const

export type MemberPath = (typeof MEMBER_PATHS)[number]

const MAHRAM_REFUSED = new Set<MemberPath>(['/decouvrir', '/invitations', '/discussions'])

const KINDS = new Set(['web', 'capacitor', 'mahram', 'staff'])

export const STAFF_MEMBER_MESSAGE = "Cette session d'équipe ne peut pas ouvrir un espace membre."
export const MAHRAM_MEMBER_MESSAGE = 'Une session mahram ne peut pas ouvrir cet espace.'
export const UNAUTHENTICATED_MESSAGE = 'Session non authentifiée.'

export function sessionKind(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null
  }
  const found: string[] = []
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0) {
      continue
    }
    const name = trimmed.slice(0, eq).trim()
    if (name !== SESSION_COOKIE) {
      continue
    }
    let value: string
    try {
      value = decodeURIComponent(trimmed.slice(eq + 1).trim()).trim()
    } catch {
      continue
    }
    if (KINDS.has(value)) {
      found.push(value)
    }
  }
  if (found.includes('staff')) {
    return 'staff'
  }
  if (found.includes('mahram')) {
    return 'mahram'
  }
  return found[0] ?? null
}

export function memberRouteResult(
  cookieHeader: string | null,
  path: MemberPath,
): { status: 401 | 403; body: ErrorEnvelope } {
  const kind = sessionKind(cookieHeader)
  if (kind === 'staff') {
    return {
      status: 403,
      body: errorEnvelope({
        code: ERROR_CODES.FORBIDDEN,
        message: STAFF_MEMBER_MESSAGE,
        details: null,
        retryable: false,
      }),
    }
  }
  if (kind === 'mahram' && MAHRAM_REFUSED.has(path)) {
    return {
      status: 403,
      body: errorEnvelope({
        code: ERROR_CODES.FORBIDDEN,
        message: MAHRAM_MEMBER_MESSAGE,
        details: null,
        retryable: false,
      }),
    }
  }
  return {
    status: 401,
    body: errorEnvelope({
      code: ERROR_CODES.UNAUTHENTICATED,
      message: UNAUTHENTICATED_MESSAGE,
      details: null,
      retryable: false,
    }),
  }
}

export function memberRouteResponse(cookieHeader: string | null, path: MemberPath): Response {
  const result = memberRouteResult(cookieHeader, path)
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
