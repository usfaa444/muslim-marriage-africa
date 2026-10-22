import { expect, test } from '@playwright/test'
import { knownIssue } from './known-issues'

// Checks the allow-list itself, with no page: every entry stays as narrow as its reason.
const TEST_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
const ANCHOR = `https://www.google.com/recaptcha/api2/anchor?ar=1&k=${TEST_KEY}&co=aHR0cDovL2xvY2FsaG9zdDo0MDEy&hl=fr&v=v1&size=normal&cb=c1`
const BFRAME = `https://www.google.com/recaptcha/api2/bframe?hl=fr&v=v1&k=${TEST_KEY}`
const DENIED = 'requestStorageAccess: Permission denied.'
const GATE_401 = 'Failed to load resource: the server responded with a status of 401 (Unauthorized) http://localhost:4012/v1/accounts/gate'

function withBaseUrl<T>(value: string | undefined, run: () => T): T {
  const previous = process.env.E2E_BASE_URL
  if (value === undefined) delete process.env.E2E_BASE_URL
  else process.env.E2E_BASE_URL = value
  try {
    return run()
  } finally {
    if (previous === undefined) delete process.env.E2E_BASE_URL
    else process.env.E2E_BASE_URL = previous
  }
}

test.describe('known issues', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'the allow-list check runs once')
  })

  test("tolerates the storage-access message only from Google's reCAPTCHA iframes for the test key", () => {
    for (const baseUrl of [undefined, 'http://localhost:4012']) {
      withBaseUrl(baseUrl, () => {
        expect(knownIssue(`${DENIED} ${ANCHOR}`)?.reason).toContain('reCAPTCHA')
        expect(knownIssue(`${DENIED} ${BFRAME}`)?.reason).toContain('reCAPTCHA')
        expect(knownIssue(`${DENIED} http://localhost:4012/auth`)).toBeUndefined()
        expect(knownIssue(`${DENIED} ${ANCHOR.replace(TEST_KEY, '6LcProductionSiteKey')}`)).toBeUndefined()
        expect(knownIssue(`${DENIED} ${ANCHOR.replace('www.google.com', 'www.google.com.example.net')}`)).toBeUndefined()
        expect(knownIssue(`${DENIED} ${ANCHOR.replace('/api2/anchor', '/api2/userverify')}`)).toBeUndefined()
        expect(knownIssue(`Uncaught TypeError: boom ${ANCHOR}`)).toBeUndefined()
      })
    }
  })

  test('never tolerates the sign-in gate 401 against a running stack', () => {
    withBaseUrl('http://localhost:4012', () => {
      expect(knownIssue(GATE_401)).toBeUndefined()
    })
  })
})
