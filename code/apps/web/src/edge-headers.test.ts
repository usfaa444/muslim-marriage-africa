import { describe, expect, it } from 'vitest'
import { edgeHeaderDecision } from './edge-headers.js'

const allowed = 'https://staging.ankanu.com,http://72.61.0.79:4012'

describe('edge headers on the published listener', () => {
  it('ignores a client X-Forwarded-Proto on the raw http IP', () => {
    const decision = edgeHeaderDecision({
      host: '72.61.0.79:4012',
      protocol: 'http:',
      forwardedProto: 'https',
      forwardedHost: 'staging.ankanu.com',
      allowedOrigins: allowed,
    })
    expect(decision).toEqual({ proto: 'http', host: '72.61.0.79:4012', rawListener: true })
  })

  it('keeps the https edge hop when the host is not the raw IP', () => {
    const decision = edgeHeaderDecision({
      host: 'staging.ankanu.com',
      protocol: 'http:',
      forwardedProto: 'http, https',
      forwardedHost: 'evil.example, staging.ankanu.com',
      allowedOrigins: allowed,
    })
    expect(decision).toEqual({ proto: 'https', host: 'staging.ankanu.com', rawListener: false })
  })
})
