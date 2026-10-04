import { refreshRememberMeCookie } from './create-session.js'

type TouchRequest = {
  headers?: { cookie?: string | string[] }
}

type TouchResponse = {
  appendHeader?: (name: string, value: string) => void
  setHeader: (name: string, value: string) => void
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

/** Slides a remember-me web session when its cookie is presented. Remember-me off is left unchanged. */
export function sessionTouch(
  request: TouchRequest,
  response: TouchResponse,
  next: (error?: unknown) => void,
): void {
  void refreshRememberMeCookie(cookieHeader(request)).then((header) => {
    if (header) {
      appendSetCookie(response, header)
    }
    next()
  }, next)
}
