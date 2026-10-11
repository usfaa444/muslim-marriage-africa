import { describe, expect, it } from 'vitest'
import { edgeHeaderDecision } from '../middleware.js'

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

  it('stays http when Next already rewrote the protocol from the forged header', () => {
    const decision = edgeHeaderDecision({
      host: '72.61.0.79:4012',
      protocol: 'https:',
      forwardedProto: 'https',
      forwardedHost: 'staging.ankanu.com',
      allowedOrigins: allowed,
    })
    expect(decision).toEqual({ proto: 'http', host: '72.61.0.79:4012', rawListener: true })
  })

  it('ignores a client X-Forwarded-Proto on an IPv4 host when the allow list was not inlined', () => {
    const decision = edgeHeaderDecision({
      host: '72.61.0.79:4012',
      protocol: 'http:',
      forwardedProto: 'https',
      forwardedHost: 'staging.ankanu.com',
      allowedOrigins: undefined,
    })
    expect(decision).toEqual({ proto: 'http', host: '72.61.0.79:4012', rawListener: true })
  })

  it('forces http when Next already copied X-Forwarded-Proto into the request URL', () => {
    const decision = edgeHeaderDecision({
      host: '72.61.0.79:4012',
      protocol: 'https:',
      forwardedProto: 'https',
      forwardedHost: 'staging.ankanu.com',
      allowedOrigins: undefined,
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
