import { randomBytes } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { openEvidence, readEvidenceKey, setEvidenceKey } from './evidence-seal.js'
import { setEvidenceWriter, type EvidenceWriter } from './evidence-writer.js'
import {
  decodeCaptureImage,
  MAX_IMAGE_BYTES,
  nextRecordId,
  resetRecordClock,
  storedObjectIsPlaintext,
  UPLOAD_HOUR_MS,
} from './id-liveness.js'
import { memoryCaptureStore, setCaptureStore, type CaptureRow } from './id-liveness-store.js'
import { setOtpLimitReader } from './otp-limit.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { setSmsPort, type OtpLog, type SmsPort } from './sms-port.js'
import { readRlVerificationUploadPerHour, setVerificationLimitReader } from './verification-limit.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const otp = memoryPhoneOtpStore()
const captures = memoryCaptureStore({
  accounts: memory.accounts,
  profiles: memory.profiles,
  phoneRows: otp.rows,
})
const objects = new Map<string, Buffer>()
const evidenceKey = randomBytes(32)
const writer: EvidenceWriter = {
  bucket: 'ankanu',
  async writeObject(key, body) {
    objects.set(key, Buffer.from(body))
  },
  async readObject(key) {
    const stored = objects.get(key)
    if (!stored) {
      throw new Error('missing object')
    }
    return stored
  },
}
const logged: OtpLog[] = []
const port: SmsPort = {
  async sendOtp(message) {
    logged.push(message)
  },
}

let now = new Date('2026-10-05T12:00:00.000Z')
let uploadLimit: number | null = 10
const phone = '+22670123484'

function jpeg(size: number): Buffer {
  const bytes = Buffer.alloc(size)
  bytes[0] = 0xff
  bytes[1] = 0xd8
  bytes[2] = 0xff
  bytes[size - 2] = 0xff
  bytes[size - 1] = 0xd9
  return bytes
}

function png(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
}

function accountBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'aminata@example.bf',
    password: 'phrase avec espaces',
    pseudonym: 'Aminata_Ouaga',
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    dob: '1990-01-15',
    ...overrides,
  }
}

describe('POST /v1/verifications/id and /liveness', () => {
  let app: INestApplication | undefined
  let base: string
  let cookie = ''

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 100)
    setOtpLimitReader(async () => 100)
    setVerificationLimitReader(async () => uploadLimit)
    resetAuthRateWindow()
    resetRecordClock()
    setAccountStore(memory)
    setSessionStore(sessions)
    pins.rows.length = 0
    resetPinEntries()
    setPinLockStore(pins)
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
    setSmsPort(port)
    setEvidenceKey({ key: evidenceKey, kid: 'test-kid' })
    setEvidenceWriter(writer)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
    cookie = await signUp(accountBody())
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    setOtpLimitReader(undefined)
    setVerificationLimitReader(undefined)
    resetAuthRateWindow()
    resetRecordClock()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    setSmsPort(undefined)
    setEvidenceKey(undefined)
    setEvidenceWriter(undefined)
    if (app) {
      await app.close()
    }
  })

  async function signUp(body: Record<string, unknown>): Promise<string> {
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(created.status).toBe(201)
    const signed = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: body.email,
        password: body.password,
        remember_me: false,
      }),
    })
    expect(signed.status).toBe(201)
    return signed.headers.getSetCookie().join('; ')
  }

  async function grantPhone(sessionCookie: string): Promise<void> {
    const sent = await fetch(`${base}/v1/verifications/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ action: 'send', phone_e164: phone }),
    })
    expect(sent.status).toBe(201)
    const code = logged.at(-1)?.code
    expect(code).toMatch(/^\d{6}$/)
    const verified = await fetch(`${base}/v1/verifications/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ action: 'verify', code }),
    })
    expect(verified.status).toBe(200)
  }

  async function postCapture(
    path: 'id' | 'liveness',
    body: unknown,
    sessionCookie = cookie,
  ): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${base}/v1/verifications/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(sessionCookie === '' ? {} : { cookie: sessionCookie }),
      },
      body: JSON.stringify(body),
    })
    const json = (await response.json()) as Record<string, unknown>
    return { status: response.status, json }
  }

  async function readCapture(
    path: 'id' | 'liveness',
    sessionCookie = cookie,
  ): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${base}/v1/verifications/${path}`, {
      headers: sessionCookie === '' ? {} : { cookie: sessionCookie },
    })
    const json = (await response.json()) as Record<string, unknown>
    return { status: response.status, json }
  }

  it('refuses a missing session and a missing phone grant, and does not call billing', async () => {
    const anonymous = await postCapture('id', { image: jpeg(8).toString('base64') }, '')
    expect(anonymous.status).toBe(401)
    expect(anonymous.json).toMatchObject({ error: { code: 'UNAUTHENTICATED', retryable: false } })
    const anonymousRead = await readCapture('liveness', '')
    expect(anonymousRead.status).toBe(401)

    const early = await readCapture('liveness')
    expect(early.json).toEqual({ status: 'none' })

    const unpaid = await postCapture('liveness', {})
    expect(unpaid.status).toBe(403)
    expect(unpaid.json).toMatchObject({
      error: { code: 'FORBIDDEN', details: { required: 'phone_otp' }, retryable: false },
    })
    expect(captures.rows).toHaveLength(0)
    expect(memory.profiles[0]?.visibility ?? null).toBeNull()
  })

  it('stores an encrypted JPEG and PNG without an entitlement check and leaves visibility unset', async () => {
    await grantPhone(cookie)
    const before = objects.size
    const idImage = jpeg(32)
    const created = await postCapture('id', { image: idImage.toString('base64') })
    expect(created.status).toBe(201)
    expect(created.json).toMatchObject({ kind: 'id_document', status: 'pending' })
    expect(created.json).not.toHaveProperty('evidence_uri')
    expect(created.json).not.toHaveProperty('vendor')
    expect(created.json).not.toHaveProperty('image')
    expect(objects.size).toBe(before + 1)
    const stored = [...objects.values()].at(-1)
    expect(stored).toBeDefined()
    if (!stored) {
      return
    }
    expect(storedObjectIsPlaintext(stored, idImage)).toBe(false)
    expect(openEvidence(stored, evidenceKey).equals(idImage)).toBe(true)
    const row = captures.rows.at(-1)
    expect(row).toMatchObject({
      kind: 'id_document',
      status: 'pending',
      vendor: null,
      phone_e164: null,
      hash: null,
      expires_at: null,
    })
    expect(row?.evidence_uri).toBe(`s3://ankanu/verification/${row?.account_id}/${row?.id}.json`)
    expect(memory.profiles[0]?.visibility ?? null).toBeNull()

    const selfie = png()
    const live = await postCapture('liveness', { image: selfie.toString('base64') })
    expect(live.status).toBe(201)
    expect(live.json).toMatchObject({ kind: 'liveness', status: 'pending' })
    const sealed = [...objects.values()].at(-1)
    expect(sealed && openEvidence(sealed, evidenceKey).equals(selfie)).toBe(true)

    const idRead = await readCapture('id')
    expect(idRead.json).toMatchObject({ kind: 'id_document', status: 'pending' })
    const liveRead = await readCapture('liveness')
    expect(liveRead.json).toMatchObject({ kind: 'liveness', status: 'pending' })
  })

  it('asks for a retake when the image is missing, unreadable, or too large, and does not store it', async () => {
    const rows = captures.rows.length
    const missing = await postCapture('id', {})
    expect(missing.status).toBe(400)
    expect(missing.json).toMatchObject({
      error: { code: 'VERIFICATION_RETAKE', details: { field: 'image', reason: 'missing' }, retryable: true },
    })
    const unreadable = await postCapture('liveness', { image: Buffer.from('not-a-photo').toString('base64') })
    expect(unreadable.json).toMatchObject({
      error: { code: 'VERIFICATION_RETAKE', details: { reason: 'unreadable' }, retryable: true },
    })
    const huge = jpeg(MAX_IMAGE_BYTES + 1)
    const tooLarge = await postCapture('id', { image: huge.toString('base64') })
    expect(tooLarge.json).toMatchObject({
      error: { code: 'VERIFICATION_RETAKE', details: { reason: 'too_large' }, retryable: true },
    })
    expect(captures.rows).toHaveLength(rows)
  })

  it('accepts a body over the default JSON limit and caps uploads per hour across both posts', async () => {
    const wide = await postCapture('id', { image: jpeg(200_000).toString('base64') })
    expect(wide.status).toBe(201)
    const newest = await readCapture('id')
    expect(newest.json).toMatchObject({ id: wide.json.id, kind: 'id_document', status: 'pending' })
    const rows = captures.rows.length
    const stored = objects.size
    uploadLimit = 1
    const blocked = await postCapture('liveness', { image: jpeg(16).toString('base64') })
    expect(blocked.status).toBe(429)
    expect(blocked.json).toMatchObject({ error: { code: 'RATE_LIMITED', retryable: false } })
    expect(captures.rows).toHaveLength(rows)
    expect(objects.size).toBe(stored)
    now = new Date(now.getTime() + UPLOAD_HOUR_MS + 1)
    uploadLimit = 10
    const later = await postCapture('liveness', { image: jpeg(200_000).toString('base64') })
    expect(later.status).toBe(201)
    expect(later.json).toMatchObject({ kind: 'liveness', status: 'pending' })
    const latest = await readCapture('liveness')
    expect(latest.json).toMatchObject({ id: later.json.id, status: 'pending' })
  })

  it('returns 503 and stores nothing when the evidence key or the object write is unavailable', async () => {
    const rows = captures.rows.length
    const stored = objects.size
    setEvidenceKey(null)
    const unreadable = await postCapture('id', { image: Buffer.from('not-a-photo').toString('base64') })
    expect(unreadable.status).toBe(400)
    const failed = await postCapture('id', { image: jpeg(16).toString('base64') })
    expect(failed.status).toBe(503)
    expect(failed.json).toMatchObject({ error: { code: 'UNHANDLED', retryable: true } })
    expect(captures.rows).toHaveLength(rows)
    expect(objects.size).toBe(stored)
    setEvidenceKey({ key: evidenceKey, kid: 'test-kid' })

    setEvidenceWriter({
      bucket: 'ankanu',
      async writeObject() {
        throw new Error('object storage down')
      },
      async readObject() {
        throw new Error('object storage down')
      },
    })
    const writeFailed = await postCapture('liveness', { image: jpeg(16).toString('base64') })
    expect(writeFailed.status).toBe(503)
    expect(writeFailed.json).toMatchObject({ error: { code: 'UNHANDLED', retryable: true } })
    expect(captures.rows).toHaveLength(rows)
    expect(objects.size).toBe(stored)
    setEvidenceWriter(writer)

    const beforeSave = captures.rows.length
    const beforeObjects = objects.size
    setCaptureStore({
      hasGrantedPhone: (accountId) => captures.hasGrantedPhone(accountId),
      accountStatus: (accountId) => captures.accountStatus(accountId),
      countRecent: (accountId, sinceMs) => captures.countRecent(accountId, sinceMs),
      latest: (accountId, kind) => captures.latest(accountId, kind),
      async save() {
        throw new Error('insert failed')
      },
    })
    const saveFailed = await postCapture('id', { image: jpeg(16).toString('base64') })
    expect(saveFailed.status).toBe(503)
    expect(saveFailed.json).toMatchObject({ error: { code: 'UNHANDLED', retryable: true } })
    expect(captures.rows).toHaveLength(beforeSave)
    expect(objects.size).toBe(beforeObjects + 1)
    setCaptureStore(captures)
  })

  it('returns 500 when the upload limit is unreadable and stores nothing', async () => {
    const rows = captures.rows.length
    uploadLimit = null
    const failed = await postCapture('id', { image: jpeg(16).toString('base64') })
    expect(failed.status).toBe(500)
    expect(failed.json).toMatchObject({ error: { code: 'UNHANDLED', retryable: false } })
    expect(captures.rows).toHaveLength(rows)
    uploadLimit = 10
  })

  it('shows a rejected liveness row as the current one and does not make the profile public', async () => {
    const accountId = memory.accounts[0]?.id
    const current = captures.rows.find((row) => row.account_id === accountId && row.kind === 'liveness')
    if (!accountId || !current) {
      throw new Error('expected a liveness row to reseed')
    }
    now = new Date(now.getTime() + 1000)
    const seeded: CaptureRow = {
      ...current,
      id: nextRecordId(now),
      status: 'rejected',
    }
    captures.rows.push(seeded)
    const read = await readCapture('liveness')
    expect(read.status).toBe(200)
    expect(read.json).toMatchObject({ id: seeded.id, kind: 'liveness', status: 'rejected' })
    expect(memory.profiles.find((row) => row.account_id === accountId)?.visibility ?? null).not.toBe('public')
  })

  it('holds a suspected-minor account and does not lift an existing hold', async () => {
    const youngCookie = await signUp(
      accountBody({
        email: 'aicha@example.bf',
        pseudonym: 'Aicha_Ouaga',
        dob: '2010-01-15',
      }),
    )
    const young = memory.accounts.find((row) => row.email === 'aicha@example.bf')
    expect(young?.status).toBe('held')
    expect(memory.profiles.find((row) => row.account_id === young?.id)?.visibility).toBe('held')
    await grantPhone(youngCookie)
    const created = await postCapture('id', { image: jpeg(16).toString('base64') }, youngCookie)
    expect(created.status).toBe(201)
    expect(created.json).toMatchObject({ kind: 'id_document', status: 'held' })
    expect(memory.profiles.find((row) => row.account_id === young?.id)?.visibility).toBe('held')
    const read = await readCapture('id', youngCookie)
    expect(read.json).toMatchObject({ status: 'held' })
  })

  it('keeps the default JSON limit on routes other than the two capture posts', async () => {
    const fat = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'aminata@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
        pad: 'x'.repeat(120_000),
      }),
    })
    const body = (await fat.json()) as { error?: { code?: string }; id?: string }
    expect(fat.status).toBe(500)
    expect(body.error?.code).toBe('UNHANDLED')
    expect(body.id).toBeUndefined()
  })
})

describe('decodeCaptureImage', () => {
  it('names a one-byte shortfall as too large', () => {
    const decoded = decodeCaptureImage({ image: jpeg(MAX_IMAGE_BYTES + 1).toString('base64') })
    expect(decoded).toEqual({ ok: false, reason: 'too_large' })
  })
})

describe('evidence key and upload limit', () => {
  it('reads a 32-byte key and a kid, and refuses a short key or a blank kid', () => {
    setEvidenceKey(undefined)
    const key = randomBytes(32)
    const encoded = key.toString('base64')
    expect(readEvidenceKey({ EVIDENCE_KEY: encoded, EVIDENCE_KID: 'kid-1' })).toEqual({
      key,
      kid: 'kid-1',
    })
    expect(readEvidenceKey({ EVIDENCE_KEY: randomBytes(16).toString('base64'), EVIDENCE_KID: 'kid-1' })).toBeNull()
    expect(readEvidenceKey({ EVIDENCE_KEY: encoded, EVIDENCE_KID: ' ' })).toBeNull()
    setEvidenceKey(undefined)
  })

  it('uses 10 uploads per hour when no database is configured', async () => {
    setVerificationLimitReader(undefined)
    const previous = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    try {
      expect(await readRlVerificationUploadPerHour()).toBe(10)
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = previous
      }
      setVerificationLimitReader(undefined)
    }
  })
})
