/** Headers the web process may tell the API to trust. */

function lastHop(value: string | null): string {
  if (!value) {
    return ''
  }
  const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : ''
}

/** Hosts of allowed origins whose scheme is plain http. The published IP listener is one of these. */
export function httpListenerHosts(allowedOrigins: string | undefined): Set<string> {
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
  /** True when this request arrived on the plain-http listener, so client forwarded headers are ignored. */
  rawListener: boolean
}

/**
 * On an allowed http host, keep the request's own scheme and host.
 * A client `X-Forwarded-Proto: https` on that listener must not become a trusted https edge.
 * Other hosts still use the last forwarded hop, which is how the https edge reaches this process.
 */
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
