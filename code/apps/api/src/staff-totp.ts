import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * RFC 6238 TOTP with the authenticator-app defaults: HMAC-SHA1, 30-second steps, 6 digits.
 * `node:crypto` only. Secrets and codes never leave this module in a log line.
 */

export const TOTP_PERIOD_SECONDS = 30
export const TOTP_DIGITS = 6
export const TOTP_ISSUER = 'AnKanu'
/** Accept the current step and one step either side. */
export const TOTP_WINDOW = 1
export const TOTP_CODE_PATTERN = /^[0-9]{6}$/

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    out += BASE32[(value << (5 - bits)) & 31]
  }
  return out
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index < 0) {
      throw new Error('invalid base32 secret')
    }
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** 160-bit secret, the size RFC 4226 recommends for HMAC-SHA1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

export function totpStep(now: Date): number {
  return Math.floor(now.getTime() / 1000 / TOTP_PERIOD_SECONDS)
}

export function hotp(secret: Buffer, counter: number): string {
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', secret).update(message).digest()
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff)
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

export function totpCode(secretBase32: string, now: Date, offsetSteps = 0): string {
  return hotp(base32Decode(secretBase32), totpStep(now) + offsetSteps)
}

/**
 * The matched step, or null. A step at or below `lastUsedStep` is refused, so one code is accepted once.
 * Every candidate step is compared so the timing does not say which one matched.
 */
export function matchTotpStep(
  secretBase32: string,
  code: string,
  now: Date,
  lastUsedStep: number | null,
): number | null {
  if (!TOTP_CODE_PATTERN.test(code)) {
    return null
  }
  const secret = base32Decode(secretBase32)
  const current = totpStep(now)
  const given = Buffer.from(code, 'utf8')
  let matched: number | null = null
  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const step = current + offset
    const expected = Buffer.from(hotp(secret, step), 'utf8')
    const equal = expected.length === given.length && timingSafeEqual(expected, given)
    if (equal && (lastUsedStep === null || step > lastUsedStep) && matched === null) {
      matched = step
    }
  }
  return matched
}

/** The URI the authenticator app reads from the QR code. Never logged and never put in a URL we serve. */
export function otpauthUri(email: string, secretBase32: string): string {
  const label = `${encodeURIComponent(TOTP_ISSUER)}:${encodeURIComponent(email)}`
  const query = new URLSearchParams({
    secret: secretBase32,
    issuer: TOTP_ISSUER,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${query.toString()}`
}

/** Groups of four for manual entry. */
export function groupedSecret(secretBase32: string): string {
  return secretBase32.replace(/(.{4})(?=.)/g, '$1 ')
}
