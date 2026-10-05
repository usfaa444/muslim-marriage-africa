import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export type EvidenceKey = {
  key: Buffer
  kid: string
}

export type EvidenceEnvelope = {
  v: 1
  alg: 'A256GCM'
  kid: string
  iv: string
  ct: string
}

let keyOverride: EvidenceKey | null | undefined

export function setEvidenceKey(next: EvidenceKey | null | undefined): void {
  keyOverride = next
}

/** `EVIDENCE_KEY` is base64 and must decode to 32 bytes. `EVIDENCE_KID` is the envelope kid. */
export function readEvidenceKey(env: NodeJS.ProcessEnv = process.env): EvidenceKey | null {
  if (keyOverride !== undefined) {
    return keyOverride
  }
  const encoded = env.EVIDENCE_KEY?.trim() ?? ''
  const kid = env.EVIDENCE_KID?.trim() ?? ''
  if (encoded === '' || kid === '') {
    return null
  }
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32 || key.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
    return null
  }
  return { key, kid }
}

/** AES-256-GCM. The auth tag is appended to the ciphertext. The returned bytes are the envelope JSON. */
export function sealEvidence(plain: Buffer, evidence: EvidenceKey): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', evidence.key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  const packed = Buffer.concat([ciphertext, cipher.getAuthTag()])
  const envelope: EvidenceEnvelope = {
    v: 1,
    alg: 'A256GCM',
    kid: evidence.kid,
    iv: iv.toString('base64'),
    ct: packed.toString('base64'),
  }
  return Buffer.from(JSON.stringify(envelope), 'utf8')
}

export function openEvidence(stored: Buffer, key: Buffer): Buffer {
  const parsed: unknown = JSON.parse(stored.toString('utf8'))
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('evidence envelope is not an object')
  }
  const envelope = parsed as Partial<EvidenceEnvelope>
  if (typeof envelope.iv !== 'string' || typeof envelope.ct !== 'string') {
    throw new Error('evidence envelope is incomplete')
  }
  const iv = Buffer.from(envelope.iv, 'base64')
  const packed = Buffer.from(envelope.ct, 'base64')
  if (packed.length < 17) {
    throw new Error('evidence ciphertext is too short')
  }
  const tag = packed.subarray(packed.length - 16)
  const ciphertext = packed.subarray(0, packed.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
