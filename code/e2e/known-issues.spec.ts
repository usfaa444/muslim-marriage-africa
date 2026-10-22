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

  test("tolerates Google's reCAPTCHA stylesheet and report-only framing messages, and nothing near them", () => {
    const css = 'https://www.gstatic.com/recaptcha/releases/NhfdZHzre16wrc2m6BxEdu7J/styles__ltr.css'
    const cors = `Access to XMLHttpRequest at '${css}' from origin 'https://www.google.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
    const framing = `Framing 'https://www.google.com/' violates the following report-only Content Security Policy directive: "frame-ancestors 'self'". The violation has been logged, but no further action has been taken.`
    withBaseUrl('http://localhost:4012', () => {
      expect(knownIssue(`${cors} ${ANCHOR}`)?.reason).toContain('reCAPTCHA')
      expect(knownIssue(`Failed to load resource: net::ERR_FAILED ${css}`)?.reason).toContain('reCAPTCHA')
      expect(knownIssue(framing)?.reason).toContain('reCAPTCHA')
      expect(knownIssue(`${framing} http://localhost:4012/auth`)?.reason).toContain('reCAPTCHA')
      expect(knownIssue(`${cors} ${ANCHOR.replace(TEST_KEY, '6LcProductionSiteKey')}`)).toBeUndefined()
      expect(knownIssue(`${cors.replace("'https://www.google.com'", "'http://localhost:4012'")} ${ANCHOR}`)).toBeUndefined()
      expect(knownIssue(`${cors.replace('styles__ltr.css', 'recaptcha__fr.js')} ${ANCHOR}`)).toBeUndefined()
      expect(knownIssue(`Failed to load resource: net::ERR_FAILED ${css.replace('www.gstatic.com', 'www.gstatic.com.example.net')}`)).toBeUndefined()
      expect(knownIssue(`Failed to load resource: net::ERR_FAILED http://localhost:4012/_next/static/css/app.css`)).toBeUndefined()
      expect(knownIssue(framing.replace('report-only ', ''))).toBeUndefined()
      expect(knownIssue(framing.replace('https://www.google.com/', 'http://localhost:4012/'))).toBeUndefined()
    })
  })

  test("tolerates failed network requests only to Google's reCAPTCHA hosts", () => {
    const bframe = `${BFRAME}&bft=0dAFcWeA7-6mP4lth1gWo86T92I29pfVFEwKhHFr`
    withBaseUrl('http://localhost:4012', () => {
      for (const line of [
        'GET https://www.gstatic.com/recaptcha/releases/NhfdZHzre16wrc2m6BxEdu7J/styles__ltr.css net::ERR_FAILED',
        'POST https://csp.withgoogle.com/csp/script-inclusions/38fac9d5b82543fc4729580d18ff2d3d net::ERR_BLOCKED_BY_ORB',
        'POST https://csp.withgoogle.com/csp/frame-ancestors/38fac9d5b82543fc4729580d18ff2d3d net::ERR_BLOCKED_BY_ORB',
        `GET ${bframe} net::ERR_ABORTED`,
      ]) {
        expect(knownIssue(line)?.reason, line).toContain('reCAPTCHA')
      }
      for (const line of [
        'POST http://localhost:4012/v1/sessions net::ERR_BLOCKED_BY_ORB',
        'GET http://localhost:4012/_next/static/chunks/app.js net::ERR_ABORTED',
        'GET https://www.google.com/search?q=x net::ERR_ABORTED',
        'GET https://www.google.com.example.net/recaptcha/api2/bframe net::ERR_ABORTED',
        'POST https://csp.withgoogle.com.example.net/csp/frame-ancestors/1 net::ERR_BLOCKED_BY_ORB',
        `PUT ${bframe} net::ERR_ABORTED`,
        `500 ${bframe}`,
      ]) {
        expect(knownIssue(line), line).toBeUndefined()
      }
    })
  })

  test('never tolerates the sign-in gate 401 against a running stack', () => {
    withBaseUrl('http://localhost:4012', () => {
      expect(knownIssue(GATE_401)).toBeUndefined()
    })
  })
})
