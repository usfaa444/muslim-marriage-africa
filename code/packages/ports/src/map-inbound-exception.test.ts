import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ERROR_CODES, errorEnvelope, isUuidV7, newId } from '@ankanu/kernel'
import { describe, expect, it } from 'vitest'
import { mapInboundException } from './map-inbound-exception.js'

const srcDir = dirname(fileURLToPath(import.meta.url))

function nestException(status: number, response: unknown, message = 'Error') {
  const error = new Error(message)
  error.stack = `Error: ${message}\n    at hidden (/app/secret.ts:1:1)`
  return Object.assign(error, {
    getStatus: () => status,
    getResponse: () => response,
  })
}

describe('mapInboundException', () => {
  it('hides a raw Nest exception behind the AD-7 envelope', () => {
    const mapped = mapInboundException(
      nestException(500, {
        statusCode: 500,
        message: 'boom',
        error: 'Internal Server Error',
      }),
      'req-9',
    )

    expect(mapped).toEqual({
      error: {
        code: ERROR_CODES.UNHANDLED,
        message: 'boom',
        details: null,
        request_id: 'req-9',
        retryable: false,
      },
    })
    const serialized = JSON.stringify(mapped)
    expect(serialized).not.toContain('statusCode')
    expect(serialized).not.toContain('Internal Server Error')
    expect(serialized).not.toContain('secret.ts')
    expect(Object.keys(mapped)).toEqual(['error'])
  })

  it('maps 401 and 403 onto the named codes', () => {
    expect(mapInboundException(nestException(401, { statusCode: 401, message: 'Unauthorized' })).error.code).toBe(
      ERROR_CODES.UNAUTHENTICATED,
    )
    expect(mapInboundException(nestException(403, { statusCode: 403, message: 'Forbidden' })).error.code).toBe(
      ERROR_CODES.FORBIDDEN,
    )
  })

  it('keeps a machine code carried on the thrown response and drops extra keys', () => {
    const mapped = mapInboundException(
      nestException(400, {
        statusCode: 400,
        code: ERROR_CODES.CONTACT_SHARE_REQUIRED,
        message: 'Share contact first',
        details: { field: 'phone' },
        retryable: false,
        error: 'Bad Request',
      }),
      newId(),
    )
    expect(mapped.error.code).toBe(ERROR_CODES.CONTACT_SHARE_REQUIRED)
    expect(mapped.error.details).toEqual({ field: 'phone' })
    expect(JSON.stringify(mapped)).not.toContain('statusCode')
    expect(JSON.stringify(mapped)).not.toContain('Bad Request')
    expect(isUuidV7(mapped.error.request_id)).toBe(true)
  })

  it('returns an envelope that is already the contract', () => {
    const envelope = errorEnvelope({
      code: ERROR_CODES.PAY_UNAVAILABLE,
      message: 'Payment rail down',
      details: null,
      requestId: 'req-pay',
      retryable: true,
    })
    expect(mapInboundException({ ...envelope, statusCode: 503 })).toEqual(envelope)
  })

  it('rebuilds a pass-through body through the envelope', () => {
    const blank = mapInboundException({
      code: '',
      message: '   ',
      details: undefined,
      request_id: '  ',
      retryable: false,
    })
    expect(blank.error.code).toBe(ERROR_CODES.UNHANDLED)
    expect(JSON.parse(JSON.stringify(blank)).error.details).toBeNull()
    expect(blank.error.request_id.trim().length).toBeGreaterThan(0)

    const kept = mapInboundException({
      code: ERROR_CODES.FORBIDDEN,
      message: 'No',
      details: undefined,
      request_id: 'req-keep',
      retryable: false,
    })
    const tooLong = mapInboundException({
      code: 'A'.repeat(65),
      message: 'No',
      details: null,
      request_id: 'req-long',
      retryable: false,
    })
    expect(tooLong.error.code).toBe(ERROR_CODES.UNHANDLED)

    expect(JSON.parse(JSON.stringify(kept))).toEqual({
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'No',
        details: null,
        request_id: 'req-keep',
        retryable: false,
      },
    })
  })

  it('locks Nest mapping cases from QA', () => {
    expect(
      mapInboundException(
        nestException(400, {
          message: 'later',
          retryable: true,
        }),
      ).error.retryable,
    ).toBe(true)

    const leaked = mapInboundException(nestException(500, { message: 'boom\nsecret' }))
    expect(leaked.error.message).toBe('Request failed')
    expect(JSON.stringify(leaked)).not.toContain('secret')

    expect(mapInboundException(nestException(500, { message: '   ' })).error.message).toBe('Request failed')

    expect(
      mapInboundException(nestException(400, { code: 'not-a-machine-code', message: 'x' })).error.code,
    ).toBe(ERROR_CODES.UNHANDLED)

    const envelope = errorEnvelope({
      code: ERROR_CODES.REVEAL_DENIED,
      message: 'No reveal',
      details: { reason: 'grant' },
      requestId: 'req-reveal',
      retryable: true,
    })
    expect(mapInboundException(nestException(403, envelope))).toEqual(envelope)
  })

  it('does not copy an internal error message or a throwing getter', () => {
    const leaked = mapInboundException(new Error('duplicate key value violates unique constraint account_phone_key'))
    expect(leaked.error.code).toBe(ERROR_CODES.UNHANDLED)
    expect(leaked.error.message).toBe('Request failed')
    expect(JSON.stringify(leaked)).not.toContain('account_phone_key')

    const thrown = mapInboundException({
      getStatus: () => {
        throw new Error('status getter failed')
      },
      getResponse: () => ({ statusCode: 500, message: 'nope' }),
    })
    expect(thrown.error.code).toBe(ERROR_CODES.UNHANDLED)
    expect(JSON.stringify(thrown)).not.toContain('status getter failed')
  })

  it('does not import Nest', () => {
    const files = readdirSync(srcDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    const source = files.map((name) => readFileSync(join(srcDir, name), 'utf8')).join('\n')
    expect(source).not.toContain('@nestjs')
    const lowered = source.toLowerCase()
    expect(lowered).not.toMatch(/\bdating\b/)
    expect(lowered).not.toContain('rencontre romantique')
    expect(lowered).not.toMatch(/\bpending\b/)
    expect(lowered).not.toMatch(/\bheld\b/)
    expect(lowered).not.toContain('pending-moderation')
    expect(lowered).not.toContain('scan-wait')
    expect(lowered).not.toContain('fail-closed')
  })
})
