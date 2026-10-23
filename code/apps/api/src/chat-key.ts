import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { EvidenceKey } from './evidence-seal.js'

/**
 * Chat body encryption (AD-17). `CHAT_KEY` is base64 for 32 bytes and `CHAT_KID` names it in each envelope. The key
 * stays in the process environment, never in an image, git, a response or a log. Each envelope is AES-256-GCM with
 * additional data `<conversation id>:<message id>`, so a ciphertext cannot be moved to another row.
 */

export type ChatEnvelope = {
  v: 1
  alg: 'A256GCM'
  kid: string
  iv: string
  ct: string
}

let keyOverride: EvidenceKey | null | undefined

export function setChatKey(next: EvidenceKey | null | undefined): void {
  keyOverride = next
}

function parseKey(env: NodeJS.ProcessEnv): EvidenceKey | null | 'malformed' {
  const encoded = env['CHAT_KEY']?.trim() ?? ''
  const kid = env['CHAT_KID']?.trim() ?? ''
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

export function readChatKey(env: NodeJS.ProcessEnv = process.env): EvidenceKey | null {
  if (keyOverride !== undefined) {
    return keyOverride
  }
  const parsed = parseKey(env)
  return parsed === 'malformed' ? null : parsed
}

/**
 * A malformed key never boots. A missing key refuses a production boot unless the reCAPTCHA test-key opt-in is set
 * (local and staging compose); then Chat sends answer 503 and nothing is stored.
 */
export function assertChatKeyBoot(env: NodeJS.ProcessEnv): void {
  const parsed = parseKey(env)
  if (parsed === 'malformed') {
    throw new Error('CHAT_KEY must be base64 for 32 bytes and CHAT_KID must be set')
  }
  if (parsed === null && env['NODE_ENV'] === 'production' && env['RECAPTCHA_ALLOW_TEST_KEYS'] !== '1') {
    throw new Error('CHAT_KEY and CHAT_KID are required in production')
  }
}

function aad(conversationId: string, messageId: string): Buffer {
  return Buffer.from(`${conversationId}:${messageId}`, 'utf8')
}

export function sealChatText(text: string, key: EvidenceKey, conversationId: string, messageId: string): ChatEnvelope {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key.key, iv)
  cipher.setAAD(aad(conversationId, messageId))
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()])
  const packed = Buffer.concat([ciphertext, cipher.getAuthTag()])
  return { v: 1, alg: 'A256GCM', kid: key.kid, iv: iv.toString('base64'), ct: packed.toString('base64') }
}

/** The text, or null when the envelope is not readable with this key (other kid, tampered, moved row). */
export function openChatText(
  envelope: unknown,
  key: EvidenceKey | null,
  conversationId: string,
  messageId: string,
): string | null {
  if (!key || typeof envelope !== 'object' || envelope === null) {
    return null
  }
  const value = envelope as Partial<ChatEnvelope>
  if (value.v !== 1 || value.alg !== 'A256GCM' || value.kid !== key.kid || typeof value.iv !== 'string' || typeof value.ct !== 'string') {
    return null
  }
  try {
    const packed = Buffer.from(value.ct, 'base64')
    if (packed.length < 17) {
      return null
    }
    const decipher = createDecipheriv('aes-256-gcm', key.key, Buffer.from(value.iv, 'base64'))
    decipher.setAAD(aad(conversationId, messageId))
    decipher.setAuthTag(packed.subarray(packed.length - 16))
    return Buffer.concat([decipher.update(packed.subarray(0, packed.length - 16)), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
