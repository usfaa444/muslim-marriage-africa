import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import argon2 from 'argon2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isUuidV7 } from '@ankanu/kernel'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { passwordIsPublishable } from './create-account.js'

const memory = memoryAccountStore()

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'fatim@example.bf',
    password: 'phrase avec espaces',
    pseudonym: 'Fatim_Ouaga',
    gender: 'sister',
    pledge_accepted: true,
    human_verified: true,
    coc_version: 'FR-089',
    ...overrides,
  }
}

describe('POST /v1/accounts', () => {
  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    setAuthLimitReader(async () => 1000)
    resetAuthRateWindow()
    setAccountStore(memory)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    if (app) {
      await app.close()
    }
  })

  it('stores a member with the pledge version, age not attested, and an argon2id password', async () => {
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body()),
    })
    const created = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(201)
    expect(created.gender).toBe('sister')
    expect(created.status).toBe('Active')
    expect(created.age_attested).toBe(false)
    expect(created.coc_version).toBe('FR-089')
    expect(created.roles).toEqual(['member'])
    expect(created.email).toBe('fatim@example.bf')
    expect(isUuidV7(String(created.id))).toBe(true)
    expect(created).not.toHaveProperty('secret_hash')
    expect(created).not.toHaveProperty('password')
    expect(JSON.stringify(created)).not.toContain('profile')

    expect(memory.accounts).toHaveLength(1)
    expect(memory.credentials).toHaveLength(1)
    const hash = memory.credentials[0]?.secret_hash ?? ''
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(hash).not.toContain('phrase avec espaces')
    expect(await argon2.verify(hash, 'phrase avec espaces')).toBe(true)
    expect(memory.credentials[0]?.kind).toBe('password')
    expect(memory.credentials[0]?.email_verified_at).toBeNull()
  })

  it('creates nothing when the pledge or the conduct version is missing', async () => {
    const before = memory.accounts.length
    const skipped = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body({ pledge_accepted: false, email: 'autre@example.bf', pseudonym: 'Autre' })),
    })
    const skippedBody = (await skipped.json()) as { error: { details: { field: string } } }
    expect(skipped.status).toBe(400)
    expect(skippedBody.error.details.field).toBe('pledge')
    expect(memory.accounts).toHaveLength(before)

    const missing = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body({ coc_version: '   ', email: 'encore@example.bf', pseudonym: 'Encore' })),
    })
    const missingBody = (await missing.json()) as { error: { details: { field: string } } }
    expect(missing.status).toBe(400)
    expect(missingBody.error.details.field).toBe('coc_version')
    expect(memory.accounts).toHaveLength(before)
  })

  it('names the conflicting email or pseudonym and stores neither', async () => {
    const before = memory.accounts.length
    const email = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body({ email: 'Fatim@example.bf', pseudonym: 'Autre_Nom' })),
    })
    const emailBody = (await email.json()) as { error: { message: string; details: { field: string } } }
    expect(email.status).toBe(409)
    expect(emailBody.error.details.field).toBe('email')
    expect(emailBody.error.message).toContain('email')

    const pseudonym = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body({ email: 'neuf@example.bf', pseudonym: 'Fatim_Ouaga' })),
    })
    const pseudonymBody = (await pseudonym.json()) as { error: { message: string; details: { field: string } } }
    expect(pseudonym.status).toBe(409)
    expect(pseudonymBody.error.details.field).toBe('pseudonym')
    expect(pseudonymBody.error.message).toContain('pseudonym')
    expect(memory.accounts).toHaveLength(before)
  })

  it('rejects passwords outside the published rules', () => {
    expect(passwordIsPublishable('phrase avec espaces')).toBe(true)
    expect(passwordIsPublishable('éééééééééééé')).toBe(true)
    expect(passwordIsPublishable(`${'a'.repeat(11)} `)).toBe(true)
    expect(passwordIsPublishable('a'.repeat(11))).toBe(false)
    expect(passwordIsPublishable('a'.repeat(129))).toBe(false)
    expect(passwordIsPublishable(' '.repeat(12))).toBe(false)
  })

  it('rejects an 11-character password, a 129-character password, and 12 spaces with no row', async () => {
    const before = memory.accounts.length
    const passwords = ['a'.repeat(11), 'a'.repeat(129), ' '.repeat(12)]
    for (const [index, password] of passwords.entries()) {
      const response = await fetch(`${base}/v1/accounts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          body({
            password,
            email: `court-${index}@example.bf`,
            pseudonym: `Court_${index}`,
          }),
        ),
      })
      const payload = (await response.json()) as { error: { details: { field: string } } }
      expect(response.status).toBe(400)
      expect(payload.error.details.field).toBe('password')
    }
    expect(memory.accounts).toHaveLength(before)
    expect(memory.credentials).toHaveLength(before)
  })

  it('stores brother and rejects any other gender without a row', async () => {
    const before = memory.accounts.length
    const created = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body({ email: 'amadou@example.bf', pseudonym: 'Amadou_Bobo', gender: 'brother' })),
    })
    const createdBody = (await created.json()) as { gender: string }
    expect(created.status).toBe(201)
    expect(createdBody.gender).toBe('brother')
    expect(memory.accounts.at(-1)?.gender).toBe('brother')

    const rejected = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body({ email: 'autre-genre@example.bf', pseudonym: 'Autre_Genre', gender: 'member' })),
    })
    const rejectedBody = (await rejected.json()) as { error: { details: { field: string } } }
    expect(rejected.status).toBe(400)
    expect(rejectedBody.error.details.field).toBe('gender')
    expect(memory.accounts).toHaveLength(before + 1)
    expect(memory.credentials).toHaveLength(before + 1)
  })

  it('rejects a missing or untrue human_verified and stores nothing', async () => {
    const before = memory.accounts.length
    const cases = [
      body({ human_verified: false, email: 'bot@example.bf', pseudonym: 'Bot_Un' }),
      body({ human_verified: 'true', email: 'bot2@example.bf', pseudonym: 'Bot_Deux' }),
      (() => {
        const fields = body({ email: 'bot3@example.bf', pseudonym: 'Bot_Trois' })
        delete fields.human_verified
        return fields
      })(),
    ]
    for (const payload of cases) {
      const response = await fetch(`${base}/v1/accounts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as { error: { code: string; details: { field: string } } }
      expect(response.status).toBe(400)
      expect(result.error.code).toBe('CAPTCHA_FAILED')
      expect(result.error.details.field).toBe('human_verified')
    }
    expect(memory.accounts).toHaveLength(before)
    expect(memory.credentials).toHaveLength(before)
  })
})
