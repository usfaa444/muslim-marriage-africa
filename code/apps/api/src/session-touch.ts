import { errorEnvelope } from '@ankanu/kernel'
import { clientIp, type IpRequest } from './auth-guard.js'
import { applySessionGate, PIN_REQUIRED_MESSAGE } from './pin-session.js'

type TouchRequest = IpRequest & {
  method?: string
  url?: string
  originalUrl?: string
  headers?: { cookie?: string | string[] }
}

type TouchResponse = {
  appendHeader?: (name: string, value: string) => void
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

function cookieHeader(request: TouchRequest): string | undefined {
  const header = request.headers?.cookie
  if (typeof header === 'string') {
    return header
  }
  if (Array.isArray(header)) {
    return header.join('; ')
  }
  return undefined
}

function appendSetCookie(response: TouchResponse, value: string): void {
  if (typeof response.appendHeader === 'function') {
    response.appendHeader('Set-Cookie', value)
    return
  }
  response.setHeader('Set-Cookie', value)
}

/** Slides a live session, or stops it when the shared-device PIN is required. */
export function sessionTouch(
  request: TouchRequest,
  response: TouchResponse,
  next: (error?: unknown) => void,
): void {
  const path = request.originalUrl ?? request.url ?? ''
  void applySessionGate(request.method ?? 'GET', path, cookieHeader(request), clientIp(request)).then((result) => {
    if (result.stop) {
      response.status(401).json(
        errorEnvelope({
          code: 'PIN_REQUIRED',
          message: PIN_REQUIRED_MESSAGE,
          details: null,
          retryable: false,
        }),
      )
      return
    }
    if (result.cookie) {
      appendSetCookie(response, result.cookie)
    }
    next()
  }, next)
}
