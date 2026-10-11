import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function lastHop(value: string | null): string {
  if (!value) {
    return ''
  }
  const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : ''
}

/** The /v1 rewrite forwards these. The API trusts them only from the web container. */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers)
  const proto = lastHop(request.headers.get('x-forwarded-proto')) || request.nextUrl.protocol.replace(':', '')
  const host =
    lastHop(request.headers.get('x-forwarded-host')) || request.headers.get('host') || request.nextUrl.host
  headers.set('x-ankanu-edge-proto', proto)
  headers.set('x-ankanu-edge-host', host)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
