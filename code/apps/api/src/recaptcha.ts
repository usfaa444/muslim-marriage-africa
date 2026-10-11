/**
 * Google reCAPTCHA v2 siteverify. The documented test pair is recognized so a
 * production boot can refuse it. Staging opts in with RECAPTCHA_ALLOW_TEST_KEYS=1.
 * The secret stays in the process environment. It is never written to a response.
 */

export const RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
export const RECAPTCHA_TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'

const SITEVERIFY = 'https://www.google.com/recaptcha/api/siteverify'
const MAX_TOKEN_LENGTH = 4000

export type RecaptchaVerifier = (token: string, remoteIp: string) => Promise<boolean>

let override: RecaptchaVerifier | undefined

export function setRecaptchaVerifier(verifier: RecaptchaVerifier | undefined): void {
  override = verifier
}

export function assertRecaptchaBoot(env: NodeJS.ProcessEnv): void {
  const site = env['RECAPTCHA_SITE_KEY'] ?? ''
  const secret = env['RECAPTCHA_SECRET_KEY'] ?? ''
  if (site.length === 0 || secret.length === 0) {
    throw new Error('RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY are required')
  }
  const testSite = site === RECAPTCHA_TEST_SITE_KEY
  const testSecret = secret === RECAPTCHA_TEST_SECRET_KEY
  if ((testSite || testSecret) && env['RECAPTCHA_ALLOW_TEST_KEYS'] !== '1') {
    throw new Error('reCAPTCHA test keys are refused')
  }
  if (testSite !== testSecret) {
    throw new Error('reCAPTCHA test keys are refused')
  }
}

export async function recaptchaPasses(token: unknown, remoteIp: string): Promise<boolean> {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return false
  }
  if (override) {
    return override(token, remoteIp)
  }
  return verifyWithGoogle(token, remoteIp, process.env['RECAPTCHA_SECRET_KEY'] ?? '')
}

export async function verifyWithGoogle(token: string, remoteIp: string, secret: string): Promise<boolean> {
  if (secret.length === 0) {
    return false
  }
  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp.length > 0) {
    body.set('remoteip', remoteIp)
  }
  let response: Response
  try {
    response = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch {
    return false
  }
  if (!response.ok) {
    return false
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return false
  }
  return typeof payload === 'object' && payload !== null && (payload as { success?: unknown }).success === true
}
