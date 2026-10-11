import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { edgeHeaderDecision } from './src/edge-headers.js'

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
