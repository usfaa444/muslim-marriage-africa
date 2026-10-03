import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { assertAuthContext } from './auth.js'
import { civilDayOuagadougou, toOuagadougouDisplay, toUtcStorage } from './clock.js'
import { ERROR_CODES, errorEnvelope, isErrorEnvelope } from './error.js'
import { isUuidV7, newId } from './id.js'

const srcDir = dirname(fileURLToPath(import.meta.url))

function accountId(): string {
  return newId()
}

describe('ids', () => {
  it('mints UUID v7', () => {
    const before = Date.now()
    const id = newId()
    const after = Date.now()
    expect(isUuidV7(id)).toBe(true)
    const timestamp = Number(BigInt(`0x${id.replaceAll('-', '').slice(0, 12)}`))
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('rejects timestamps outside the 48-bit UUID v7 range', () => {
    expect(() => newId(new Date('1960-01-01T00:00:00.000Z'))).toThrow(RangeError)
  })

  it('rejects a UUID v4', () => {
    expect(isUuidV7('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
  })

  it('mints distinct ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()))
    expect(ids.size).toBe(50)
  })
})

describe('clocks', () => {
  it('stores UTC and displays the Ouagadougou civil time', () => {
    const instant = new Date('2026-01-15T03:04:05.006Z')
    expect(toUtcStorage(instant)).toBe('2026-01-15T03:04:05.006Z')
    expect(toOuagadougouDisplay(instant)).toBe('2026-01-15T03:04:05+00:00')
    expect(civilDayOuagadougou(instant)).toBe('2026-01-15')
  })

  it('formats the pre-standard Ouagadougou offset', () => {
    const instant = new Date('1900-01-01T00:00:00.000Z')
    expect(toOuagadougouDisplay(instant)).toBe('1899-12-31T23:43:52-00:16:08')
    expect(civilDayOuagadougou(instant)).toBe('1899-12-31')
  })

  it('rejects an invalid date', () => {
    expect(() => toUtcStorage(new Date('nope'))).toThrow(TypeError)
    expect(() => toOuagadougouDisplay(new Date(Number.NaN))).toThrow(TypeError)
  })
})

describe('AuthContext', () => {
  it('accepts a member session with gender', () => {
    const context = assertAuthContext({
      accountId: accountId(),
      roles: ['member'],
      gender: 'sister',
    })
    expect(context.gender).toBe('sister')
    expect(context.roles).toEqual(['member'])
    expect(() => {
      ;(context.roles as string[]).push('operator')
    }).toThrow(TypeError)
  })

  it('requires gender on member sessions', () => {
    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['member'],
      }),
    ).toThrow(/gender is required/)
  })

  it('rejects staff combined with member', () => {
    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['operator', 'member'],
        gender: 'brother',
      }),
    ).toThrow(/must not include member/)
    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['moderator', 'member'],
        gender: 'sister',
      }),
    ).toThrow(/must not include member/)
  })

  it('rejects mahram combined with member', () => {
    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['mahram', 'member'],
        gender: 'sister',
      }),
    ).toThrow(/must not include member/)
  })

  it('rejects system combined with another role and mahram combined with staff', () => {
    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['member', 'system'],
        gender: 'sister',
      }),
    ).toThrow(/system must be the only role/)
    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['mahram', 'operator'],
      }),
    ).toThrow(/must not include staff/)
  })

  it('stores lowercase UUID v7 ids and rejects a non-v7 id', () => {
    const id = accountId().toUpperCase()
    const ward = accountId().toUpperCase()
    const context = assertAuthContext({
      accountId: id,
      roles: ['mahram'],
      mahramWardId: ward,
    })
    expect(context.accountId).toBe(id.toLowerCase())
    expect(context.mahramWardId).toBe(ward.toLowerCase())
    const v4 = '550e8400-e29b-41d4-a716-446655440000'
    expect(() =>
      assertAuthContext({
        accountId: v4,
        roles: ['mahram'],
      }),
    ).toThrow(/accountId must be a UUID v7/)
    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['mahram'],
        mahramWardId: v4,
      }),
    ).toThrow(/mahramWardId must be a UUID v7/)
  })

  it('accepts a mahram ward id and rejects an entitlement field', () => {
    const context = assertAuthContext({
      accountId: accountId(),
      roles: ['mahram'],
      mahramWardId: accountId(),
    })
    expect(isUuidV7(context.mahramWardId ?? '')).toBe(true)

    expect(() =>
      assertAuthContext({
        accountId: accountId(),
        roles: ['member'],
        gender: 'brother',
        entitled: true,
      }),
    ).toThrow(/rejects entitled/)
  })
})

describe('error envelope', () => {
  it('emits only the AD-7 shape', () => {
    const envelope = errorEnvelope({
      code: ERROR_CODES.QUOTA_EXCEEDED,
      message: 'Invite cap',
      details: { resets_at: '2026-01-16T00:00:00+00:00' },
      requestId: 'req-1',
      retryable: false,
    })
    expect(isErrorEnvelope(envelope)).toBe(true)
    expect(Object.keys(envelope)).toEqual(['error'])
    expect(Object.keys(envelope.error).sort()).toEqual([
      'code',
      'details',
      'message',
      'request_id',
      'retryable',
    ])
    const withMissingDetails = errorEnvelope({
      code: ERROR_CODES.FORBIDDEN,
      message: 'No',
      details: undefined,
      requestId: '   ',
      retryable: false,
    })
    expect(JSON.parse(JSON.stringify(withMissingDetails)).error.details).toBeNull()
    expect(isUuidV7(withMissingDetails.error.request_id)).toBe(true)
    expect(() =>
      errorEnvelope({
        code: '',
        message: 'No',
        details: null,
        retryable: false,
      }),
    ).toThrow(TypeError)
  })
})

describe('shipped source', () => {
  it('does not carry the banned lexicon or a second error shape name', () => {
    const files = readdirSync(srcDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    const source = files.map((name) => readFileSync(join(srcDir, name), 'utf8')).join('\n').toLowerCase()
    expect(source).not.toMatch(/\bdating\b/)
    expect(source).not.toContain('rencontre romantique')
    expect(source).not.toMatch(/\bpending\b/)
    expect(source).not.toMatch(/\bheld\b/)
    expect(source).not.toContain('pending-moderation')
    expect(source).not.toContain('scan-wait')
    expect(source).not.toContain('fail-closed')
    expect(source).not.toContain('@nestjs')
  })
})
