import { openEvidence, sealEvidence, type EvidenceKey } from './evidence-seal.js'

/**
 * Server key for staff TOTP secrets. `STAFF_MFA_KEY` is base64 for 32 bytes; `STAFF_MFA_KID` names it in each envelope.
 * The key stays in the process environment and is never written to a response or a log.
 */

let keyOverride: EvidenceKey | null | undefined

export function setStaffMfaKey(next: EvidenceKey | null | undefined): void {
  keyOverride = next
}

function parseKey(env: NodeJS.ProcessEnv): EvidenceKey | null | 'malformed' {
  const encoded = env['STAFF_MFA_KEY']?.trim() ?? ''
  const kid = env['STAFF_MFA_KID']?.trim() ?? ''
  if (encoded === '' && kid === '') {
    return null
  }
  if (encoded === '' || kid === '') {
    return 'malformed'
  }
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32 || key.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
    return 'malformed'
  }
  return { key, kid }
}

export function readStaffMfaKey(env: NodeJS.ProcessEnv = process.env): EvidenceKey | null {
  if (keyOverride !== undefined) {
    return keyOverride
  }
  const parsed = parseKey(env)
  return parsed === 'malformed' ? null : parsed
}

/**
 * A malformed key never boots. A missing key is refused in production, in the same way as log SMS:
 * `NODE_ENV=production` without the reCAPTCHA test-key opt-in. Without a key, staff sign-in answers 503.
 */
export function assertStaffMfaBoot(env: NodeJS.ProcessEnv): void {
  const parsed = parseKey(env)
  if (parsed === 'malformed') {
    throw new Error('STAFF_MFA_KEY must be base64 for 32 bytes and STAFF_MFA_KID must be set')
  }
  if (parsed === null && env['NODE_ENV'] === 'production' && env['RECAPTCHA_ALLOW_TEST_KEYS'] !== '1') {
    throw new Error('STAFF_MFA_KEY and STAFF_MFA_KID are required in production')
  }
}

export function sealTotpSecret(secretBase32: string, key: EvidenceKey): string {
  return sealEvidence(Buffer.from(secretBase32, 'utf8'), key).toString('utf8')
}

export function openTotpSecret(sealed: string, key: EvidenceKey): string {
  return openEvidence(Buffer.from(sealed, 'utf8'), key.key).toString('utf8')
}
