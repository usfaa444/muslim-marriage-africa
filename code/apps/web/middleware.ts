import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function lastHop(value: string | null): string {
  if (!value) {
    return ''
  }
  const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : ''
}

function httpListenerHosts(allowedOrigins: string | undefined): Set<string> {
  const hosts = new Set<string>()
  if (!allowedOrigins) {
    return hosts
  }
  for (const part of allowedOrigins.split(',')) {
    const trimmed = part.trim()
    if (trimmed.length === 0) {
      continue
    }
    try {
      const url = new URL(trimmed)
      if (url.protocol === 'http:' && url.username === '' && url.password === '' && url.pathname === '/' && url.search === '' && url.hash === '') {
        hosts.add(url.host.toLowerCase())
      }
    } catch {
      continue
    }
  }
  return hosts
}

export type EdgeHeaderDecision = {
  proto: string
  host: string
  rawListener: boolean
}

/** On an allowed http host, ignore client X-Forwarded-Proto and X-Forwarded-Host. */
export function edgeHeaderDecision(input: {
  host: string
  protocol: string
  forwardedProto: string | null
  forwardedHost: string | null
  allowedOrigins: string | undefined
}): EdgeHeaderDecision {
  const requestHost = input.host.trim()
  const requestProto = input.protocol.replace(':', '') || 'http'
  const rawListener = httpListenerHosts(input.allowedOrigins).has(requestHost.toLowerCase())
  if (rawListener) {
    return { proto: requestProto, host: requestHost, rawListener: true }
  }
  return {
    proto: lastHop(input.forwardedProto) || requestProto,
    host: lastHop(input.forwardedHost) || requestHost,
    rawListener: false,
  }
}

/** The /v1 rewrite forwards these. The API trusts them only from the web container. */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers)
  const decision = edgeHeaderDecision({
    host: request.headers.get('host') || request.nextUrl.host,
    protocol: request.nextUrl.protocol,
    forwardedProto: request.headers.get('x-forwarded-proto'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    allowedOrigins: process.env.ANKANU_ALLOWED_ORIGINS,
  })
  headers.set('x-ankanu-edge-proto', decision.proto)
  headers.set('x-ankanu-edge-host', decision.host)
  if (decision.rawListener) {
    headers.set('x-forwarded-proto', decision.proto)
    headers.set('x-forwarded-host', decision.host)
  }
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
