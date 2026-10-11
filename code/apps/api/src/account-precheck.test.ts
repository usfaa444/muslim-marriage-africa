import { describe, expect, it } from 'vitest'
import { precheckAccount } from './account-precheck.js'
import { assertRecaptchaBoot, RECAPTCHA_TEST_SECRET_KEY, RECAPTCHA_TEST_SITE_KEY } from './recaptcha.js'
import { signupStep } from './signup-gate.js'

describe('POST /v1/accounts/precheck', () => {
  const today = new Date('2026-10-11T00:00:00.000Z')

  it('reports a free adult pseudonym and stores nothing', async () => {
    const calls = { taken: 0 }
    const result = await precheckAccount(
      { pseudonym: 'Awa_94', dob: '1990-04-02' },
      {
        today,
        store: {
          async pseudonymTaken() {
            calls.taken += 1
            return false
          },
          async minAge() {
            return 19
          },
        },
      },
    )
    expect(result).toEqual({ ok: true, body: { pseudonym_available: true, age_eligible: true } })
    expect(calls.taken).toBe(1)
  })

  it('names a taken pseudonym and an under-19 date without writing', async () => {
    const taken = await precheckAccount(
      { pseudonym: 'Awa_94', dob: '1990-04-02' },
      {
        today,
        store: {
          async pseudonymTaken() {
            return true
          },
          async minAge() {
            return 19
          },
        },
      },
    )
    const young = await precheckAccount(
      { pseudonym: 'Jeune', dob: '2010-10-12' },
      {
        today,
        store: {
          async pseudonymTaken() {
            return false
          },
          async minAge() {
            return 19
          },
        },
      },
    )
    expect(taken).toMatchObject({ ok: true, body: { pseudonym_available: false, age_eligible: true } })
    expect(young).toMatchObject({ ok: true, body: { pseudonym_available: true, age_eligible: false } })
  })

  it('rejects a blank pseudonym or an impossible date', async () => {
    const store = {
      async pseudonymTaken() {
        return false
      },
      async minAge() {
        return 19
      },
    }
    const blank = await precheckAccount({ pseudonym: '  ', dob: '1990-01-01' }, { today, store })
    const badDate = await precheckAccount({ pseudonym: 'Awa', dob: '2010-02-31' }, { today, store })
    expect(blank).toMatchObject({ ok: false, status: 400, details: { field: 'pseudonym' } })
    expect(badDate).toMatchObject({ ok: false, status: 400, details: { field: 'dob' } })
  })
})

describe('signup step', () => {
  it('walks email, phone, otp, identity, then account', () => {
    expect(signupStep({ emailVerified: false, phone: 'none', idPassed: false, livenessPassed: false })).toBe('email')
    expect(signupStep({ emailVerified: true, phone: 'none', idPassed: false, livenessPassed: false })).toBe('phone')
    expect(signupStep({ emailVerified: true, phone: 'pending', idPassed: false, livenessPassed: false })).toBe('otp')
    expect(signupStep({ emailVerified: true, phone: 'granted', idPassed: true, livenessPassed: false })).toBe('identity')
    expect(signupStep({ emailVerified: true, phone: 'granted', idPassed: true, livenessPassed: true })).toBe('account')
  })
})

describe('reCAPTCHA boot', () => {
  it('refuses empty keys and the documented test pair unless the opt-in is set', () => {
    expect(() => assertRecaptchaBoot({})).toThrow(/required/)
    expect(() =>
      assertRecaptchaBoot({
        RECAPTCHA_SITE_KEY: RECAPTCHA_TEST_SITE_KEY,
        RECAPTCHA_SECRET_KEY: RECAPTCHA_TEST_SECRET_KEY,
      }),
    ).toThrow(/refused/)
    expect(() =>
      assertRecaptchaBoot({
        RECAPTCHA_SITE_KEY: RECAPTCHA_TEST_SITE_KEY,
        RECAPTCHA_SECRET_KEY: RECAPTCHA_TEST_SECRET_KEY,
        RECAPTCHA_ALLOW_TEST_KEYS: '1',
      }),
    ).not.toThrow()
    expect(() =>
      assertRecaptchaBoot({
        RECAPTCHA_SITE_KEY: 'site-live',
        RECAPTCHA_SECRET_KEY: 'secret-live',
      }),
    ).not.toThrow()
  })
})
