import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isUuidV7 } from '@ankanu/kernel'
import { createApp } from './create-app.js'
import { listenPort } from './listen-port.js'

const BANNED = /dating|rencontre romantique/i

describe('apps/api', () => {
  let app: INestApplication | undefined
  let base: string

  beforeAll(async () => {
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  it('GET /v1/health returns status ok, role api, and a request_id', async () => {
    const response = await fetch(`${base}/v1/health`)
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(Object.keys(body).sort()).toEqual(['request_id', 'role', 'status'])
    expect(body.status).toBe('ok')
    expect(body.role).toBe('api')
    expect(isUuidV7(String(body.request_id))).toBe(true)
    expect(JSON.stringify(body)).not.toMatch(BANNED)
  })

  it('unknown /v1 routes return the AD-7 envelope and no stack', async () => {
    const response = await fetch(`${base}/v1/not-a-route`)
    const body = (await response.json()) as { error: Record<string, unknown> }
    const serialized = JSON.stringify(body)

    expect(response.status).toBe(404)
    expect(Object.keys(body)).toEqual(['error'])
    expect(Object.keys(body.error).sort()).toEqual([
      'code',
      'details',
      'message',
      'request_id',
      'retryable',
    ])
    expect(body.error.code).toBe('UNHANDLED')
    expect(body.error.details).toBeNull()
    expect(body.error.retryable).toBe(false)
    expect(typeof body.error.message).toBe('string')
    expect(isUuidV7(String(body.error.request_id))).toBe(true)
    expect(body.error).not.toHaveProperty('stack')
    expect(serialized).not.toContain('\\n    at ')
    expect(serialized).not.toContain('    at ')
    expect(serialized).not.toMatch(BANNED)

    const posted = await fetch(`${base}/v1/not-a-route`, { method: 'POST' })
    const postedBody = (await posted.json()) as { error: { code: string } }
    expect(posted.status).toBe(404)
    expect(postedBody.error.code).toBe('UNHANDLED')
  })

  it('does not ship the banned lexicon or an HTML error page', async () => {
    const onV1 = await fetch(`${base}/v1/dating`)
    const onV1Body = (await onV1.json()) as { error: { message: string; code: string } }
    expect(onV1.status).toBe(404)
    expect(onV1.headers.get('content-type')).toContain('application/json')
    expect(onV1Body.error.code).toBe('UNHANDLED')
    expect(onV1Body.error.message).toBe('Request failed')
    expect(JSON.stringify(onV1Body)).not.toMatch(BANNED)

    const offV1 = await fetch(`${base}/dating`)
    const offV1Body = (await offV1.json()) as { error: { message: string; code: string } }
    expect(offV1.status).toBe(404)
    expect(offV1.headers.get('content-type')).toContain('application/json')
    expect(offV1Body.error.code).toBe('UNHANDLED')
    expect(offV1Body.error.message).toBe('Request failed')
    expect(JSON.stringify(offV1Body)).not.toMatch(BANNED)
  })

  it('listenPort uses 3000 when PORT is unset and rejects a blank value as unset', () => {
    expect(listenPort({})).toBe(3000)
    expect(listenPort({ PORT: '' })).toBe(3000)
    expect(listenPort({ PORT: '  ' })).toBe(3000)
    expect(() => listenPort({ PORT: '-0' })).toThrow(/PORT must be an integer/)
    expect(() => listenPort({ PORT: 'nope' })).toThrow(/PORT must be an integer/)
  })
})
