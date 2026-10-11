import { AsyncLocalStorage } from 'node:async_hooks'
import { errorEnvelope } from '@ankanu/kernel'
import { clientIp, type IpRequest } from './auth-guard.js'
import { parseAllowedOrigins, strictOrigin } from './public-origin.js'

export type EdgeView = {
  trustedHttps: boolean
  httpOriginAllowed: boolean
}

const edgeStorage = new AsyncLocalStorage<EdgeView>()

export function currentEdge(): EdgeView | undefined {
  return edgeStorage.getStore()
}

/** Loopback and the docker bridge range the host proxy connects from. */
export function isTrustedEdge(address: string): boolean {
  const ip = address.toLowerCase().startsWith('::ffff:') ? address.slice('::ffff:'.length).toLowerCase() : address.toLowerCase()
  if (ip === '127.0.0.1' || ip === '::1') {
    return true
  }
  const parts = ip.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false
  }
  const numbers = parts.map(Number)
  if (numbers.some((part) => part > 255)) {
    return false
  }
  return numbers[0] === 172 && numbers[1]! >= 16 && numbers[1]! <= 31
}

export function lastHop(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  return parts.length > 0 ? parts[parts.length - 1] : undefined
}

function headerText(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[value.length - 1]
  }
  return undefined
}

export type EdgeRequest = IpRequest & {
  socket?: { remoteAddress?: string | null; encrypted?: boolean }
  headers?: Record<string, string | string[] | undefined>
  method?: string
  url?: string
  originalUrl?: string
}

type EdgeResponse = {
  status: (code: number) => { json: (body: unknown) => void }
}

const CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function edgeViewFrom(request: EdgeRequest, env: NodeJS.ProcessEnv = process.env): EdgeView {
  const remote = clientIp(request)
  const trusted = remote.length > 0 && isTrustedEdge(remote)
  const headers = request.headers ?? {}
  const proto = trusted
    ? lastHop(headerText(headers['x-ankanu-edge-proto'])) ?? lastHop(headerText(headers['x-forwarded-proto']))
    : undefined
  const host = trusted
    ? lastHop(headerText(headers['x-ankanu-edge-host'])) ??
      lastHop(headerText(headers['x-forwarded-host'])) ??
      lastHop(headerText(headers.host))
    : lastHop(headerText(headers.host))
  const scheme: 'http' | 'https' =
    proto === 'https' || proto === 'http' ? proto : request.socket?.encrypted ? 'https' : 'http'
  const origin = host ? strictOrigin(`${scheme}://${host}`) : null
  const allowed = parseAllowedOrigins(env)
  const httpOriginAllowed = scheme === 'http' && origin !== null && allowed.includes(origin) && origin.startsWith('http:')
  return {
    trustedHttps: scheme === 'https',
    httpOriginAllowed,
  }
}

/** State-changing /v1 calls that carry an Origin outside the list. No Origin header is allowed. */
export function originForbidden(request: EdgeRequest, env: NodeJS.ProcessEnv = process.env): boolean {
  const method = (request.method ?? 'GET').toUpperCase()
  if (!CHANGING.has(method)) {
    return false
  }
  const path = (request.originalUrl ?? request.url ?? '').split('?')[0] ?? ''
  if (!path.startsWith('/v1')) {
    return false
  }
  const allowed = parseAllowedOrigins(env)
  if (allowed.length === 0) {
    return false
  }
  const raw = headerText(request.headers?.origin)
  if (raw === undefined || raw.trim() === '') {
    return false
  }
  const origin = strictOrigin(raw)
  if (!origin) {
    return true
  }
  return !allowed.includes(origin)
}

export function edgeContext(request: EdgeRequest, response: EdgeResponse, next: (error?: unknown) => void): void {
  if (originForbidden(request)) {
    response.status(403).json(
      errorEnvelope({
        code: 'FORBIDDEN',
        message: 'Origine refusée.',
        details: null,
        retryable: false,
      }),
    )
    return
  }
  edgeStorage.run(edgeViewFrom(request), () => {
    next()
  })
}
