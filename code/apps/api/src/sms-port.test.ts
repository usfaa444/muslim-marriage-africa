import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AQILAS_DEFAULT_SENDER,
  AQILAS_DEFAULT_URL,
  AQILAS_TIMEOUT_MS,
  aqilasSmsPort,
  assertSmsBoot,
  getSmsPort,
  otpSmsText,
  smsProvider,
} from './sms-port.js'

// Fake values only. No real key and no real number.
const KEY = 'test-key'
const PHONE = '+22600000001'
const CODE = '482913'
const VENDOR_BODY = 'vendor-said-something-private'

type Seen = { method: string; url: string; headers: IncomingHttpHeaders; body: string }

async function stub(status: number, reply: string): Promise<{ server: Server; url: string; seen: Seen[] }> {
  const seen: Seen[] = []
  const server = createServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      body += chunk
    })
    request.on('end', () => {
      seen.push({ method: request.method ?? '', url: request.url ?? '', headers: request.headers, body })
      response.writeHead(status, { 'content-type': 'application/json' })
      response.end(reply)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${port}/api/v1/sms`, seen }
}

function close(server: Server): Promise<void> {
  server.closeAllConnections()
  return new Promise((resolve) => server.close(() => resolve()))
}

function expectClean(text: string): void {
  expect(text).not.toContain(KEY)
  expect(text).not.toContain(PHONE)
  expect(text).not.toContain(CODE)
  expect(text).not.toContain(VENDOR_BODY)
}

describe('Aqilas SMS adapter', () => {
  const servers: Server[] = []

  afterEach(async () => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    await Promise.all(servers.splice(0).map(close))
  })

  it('posts one JSON request with the token header, sender, phone list and French text', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const lines: string[] = []
    const port = aqilasSmsPort({
      apiKey: KEY,
      senderId: 'AnKanu',
      url: 'https://sms.test/api/v1/sms',
      write: (line) => lines.push(line),
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} })
        return new Response('{"bulk_id":"b-1"}', { status: 201 })
      },
    })
    await port.sendOtp({ code: CODE, phone_e164: PHONE })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://sms.test/api/v1/sms')
    expect(calls[0]?.init.method).toBe('POST')
    expect(calls[0]?.init.headers).toEqual({ 'X-AUTH-TOKEN': KEY, 'Content-Type': 'application/json' })
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      from: 'AnKanu',
      to: [PHONE],
      text: `AnKanu : votre code est ${CODE}. Il expire dans 10 minutes. Ne le partagez avec personne.`,
    })
    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal)
    expect(lines).toEqual([])
  })

  it('sends the real HTTP headers and body to a stub server and accepts 200', async () => {
    const vendor = await stub(200, '{"bulk_id":"b-2"}')
    servers.push(vendor.server)
    await aqilasSmsPort({ apiKey: KEY, senderId: 'AnKanu', url: vendor.url }).sendOtp({ code: CODE, phone_e164: PHONE })
    expect(vendor.seen).toHaveLength(1)
    expect(vendor.seen[0]?.method).toBe('POST')
    expect(vendor.seen[0]?.url).toBe('/api/v1/sms')
    expect(vendor.seen[0]?.headers['x-auth-token']).toBe(KEY)
    expect(vendor.seen[0]?.headers['content-type']).toBe('application/json')
    expect(JSON.parse(vendor.seen[0]?.body ?? '')).toMatchObject({ from: 'AnKanu', to: [PHONE] })
  })

  it.each([400, 401, 429, 500, 503])('throws on HTTP %i and logs the status only', async (status) => {
    const vendor = await stub(status, JSON.stringify({ message: VENDOR_BODY }))
    servers.push(vendor.server)
    const lines: string[] = []
    const port = aqilasSmsPort({ apiKey: KEY, senderId: 'AnKanu', url: vendor.url, write: (line) => lines.push(line) })
    const error = await port.sendOtp({ code: CODE, phone_e164: PHONE }).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(Error)
    expectClean(String((error as Error).message) + String((error as Error).stack))
    expect(lines).toEqual([`sms aqilas status ${status}\n`])
    expect(vendor.seen).toHaveLength(1)
  })

  it('throws on a network error without echoing the request', async () => {
    const vendor = await stub(201, '{}')
    await close(vendor.server)
    const lines: string[] = []
    const port = aqilasSmsPort({ apiKey: KEY, senderId: 'AnKanu', url: vendor.url, write: (line) => lines.push(line) })
    const error = await port.sendOtp({ code: CODE, phone_e164: PHONE }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(Error)
    expectClean(String((error as Error).message) + String((error as Error).stack))
    expect(lines).toEqual(['sms aqilas network error\n'])
  })

  it('aborts a hanging vendor after the timeout', async () => {
    const hanging = createServer(() => {
      // Never answers.
    })
    await new Promise<void>((resolve) => hanging.listen(0, '127.0.0.1', resolve))
    servers.push(hanging)
    const { port: tcp } = hanging.address() as AddressInfo
    const lines: string[] = []
    const port = aqilasSmsPort({
      apiKey: KEY,
      senderId: 'AnKanu',
      url: `http://127.0.0.1:${tcp}/api/v1/sms`,
      timeoutMs: 150,
      write: (line) => lines.push(line),
    })
    const started = Date.now()
    await expect(port.sendOtp({ code: CODE, phone_e164: PHONE })).rejects.toThrow('aqilas send failed')
    expect(Date.now() - started).toBeLessThan(5_000)
    expect(lines).toEqual(['sms aqilas timeout\n'])
  })

  it('times out after 10 seconds by default', async () => {
    vi.useFakeTimers()
    let aborted = false
    const port = aqilasSmsPort({
      apiKey: KEY,
      senderId: 'AnKanu',
      url: 'https://sms.test/api/v1/sms',
      write: () => undefined,
      fetch: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true
            reject(new Error('aborted'))
          })
        }),
    })
    const outcome = port.sendOtp({ code: CODE, phone_e164: PHONE }).then(
      () => 'sent',
      () => 'failed',
    )
    await vi.advanceTimersByTimeAsync(AQILAS_TIMEOUT_MS - 1)
    expect(aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(aborted).toBe(true)
    expect(await outcome).toBe('failed')
    expect(AQILAS_TIMEOUT_MS).toBe(10_000)
  })

  it('refuses a malformed code or phone without calling the vendor', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
    const port = aqilasSmsPort({ apiKey: KEY, senderId: 'AnKanu', url: 'https://sms.test', fetch: fetchSpy })
    await expect(port.sendOtp({ code: '12345', phone_e164: PHONE })).rejects.toThrow()
    await expect(port.sendOtp({ code: CODE, phone_e164: '22600000001' })).rejects.toThrow()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps the text to one GSM-7 segment', () => {
    const text = otpSmsText('999999')
    expect(text.length).toBeLessThanOrEqual(160)
    expect(text).toMatch(/^[A-Za-z0-9 .:,'!?-]+$/)
  })
})

describe('SMS provider selection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the Story 2.7 log line when SMS_PROVIDER is unset or log', async () => {
    const written: string[] = []
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      written.push(String(chunk))
      return true
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await getSmsPort({}).sendOtp({ code: CODE, phone_e164: PHONE })
    await getSmsPort({ SMS_PROVIDER: 'log' }).sendOtp({ code: '000111', phone_e164: PHONE })
    await getSmsPort({ SMS_PROVIDER: '  ' }).sendOtp({ code: '000222', phone_e164: PHONE })
    expect(written).toEqual([`otp ${CODE}\n`, 'otp 000111\n', 'otp 000222\n'])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('picks Aqilas from env with the default sender and the overridable URL', async () => {
    const vendor = await stub(201, '{"bulk_id":"b-3"}')
    try {
      await getSmsPort({ SMS_PROVIDER: 'aqilas', AQILAS_API_KEY: KEY, AQILAS_API_URL: vendor.url }).sendOtp({
        code: CODE,
        phone_e164: PHONE,
      })
      await getSmsPort({
        SMS_PROVIDER: 'aqilas',
        AQILAS_API_KEY: KEY,
        AQILAS_API_URL: vendor.url,
        AQILAS_SENDER_ID: 'Sender2',
      }).sendOtp({ code: CODE, phone_e164: PHONE })
    } finally {
      await close(vendor.server)
    }
    expect(vendor.seen.map((row) => (JSON.parse(row.body) as { from: string }).from)).toEqual([
      AQILAS_DEFAULT_SENDER,
      'Sender2',
    ])
    expect(AQILAS_DEFAULT_SENDER).toBe('AnKanu')
    expect(AQILAS_DEFAULT_URL).toBe('https://www.aqilas.com/api/v1/sms')
  })

  it('reads the provider name', () => {
    expect(smsProvider({})).toBe('log')
    expect(smsProvider({ SMS_PROVIDER: 'log' })).toBe('log')
    expect(smsProvider({ SMS_PROVIDER: 'aqilas' })).toBe('aqilas')
    expect(smsProvider({ SMS_PROVIDER: 'twilio' })).toBeNull()
  })
})

describe('assertSmsBoot', () => {
  it('refuses aqilas without a key and names the variable, never the value', () => {
    expect(() => assertSmsBoot({ SMS_PROVIDER: 'aqilas' })).toThrow('AQILAS_API_KEY is required when SMS_PROVIDER=aqilas')
    expect(() => assertSmsBoot({ SMS_PROVIDER: 'aqilas', AQILAS_API_KEY: '   ' })).toThrow(/AQILAS_API_KEY/)
    expect(() =>
      assertSmsBoot({ SMS_PROVIDER: 'aqilas', AQILAS_API_KEY: KEY, AQILAS_API_URL: 'ftp://sms.test' }),
    ).toThrow(/AQILAS_API_URL/)
    expect(() => assertSmsBoot({ SMS_PROVIDER: 'aqilas', AQILAS_API_KEY: KEY, NODE_ENV: 'production' })).not.toThrow()
    expect(() =>
      assertSmsBoot({ SMS_PROVIDER: 'aqilas', AQILAS_API_KEY: KEY, AQILAS_API_URL: 'http://127.0.0.1:9/sms' }),
    ).not.toThrow()
  })

  it('refuses log SMS in a production boot without the test-keys opt-in', () => {
    expect(() => assertSmsBoot({ NODE_ENV: 'production' })).toThrow('log SMS is refused in production')
    expect(() => assertSmsBoot({ NODE_ENV: 'production', SMS_PROVIDER: 'log' })).toThrow(/refused in production/)
    expect(() => assertSmsBoot({ NODE_ENV: 'production', SMS_PROVIDER: 'log', RECAPTCHA_ALLOW_TEST_KEYS: '1' })).not.toThrow()
    expect(() => assertSmsBoot({ NODE_ENV: 'production', RECAPTCHA_ALLOW_TEST_KEYS: '1' })).not.toThrow()
    expect(() => assertSmsBoot({})).not.toThrow()
  })

  it('refuses an unknown provider without echoing it', () => {
    const secretish = 'sk-looks-like-a-key'
    let message = ''
    try {
      assertSmsBoot({ SMS_PROVIDER: secretish, RECAPTCHA_ALLOW_TEST_KEYS: '1' })
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toBe('SMS_PROVIDER must be log or aqilas')
    expect(message).not.toContain(secretish)
  })
})
