export type OtpLog = {
  code: string
  /** E.164 destination, held in memory for this call only. Never stored or logged. */
  phone_e164: string
}

/** One live SMS adapter, Aqilas, chosen by `SMS_PROVIDER`. The log adapter stays for local runs and tests. */
export type SmsPort = {
  sendOtp(message: OtpLog): Promise<void>
}

export const AQILAS_DEFAULT_URL = 'https://www.aqilas.com/api/v1/sms'
export const AQILAS_DEFAULT_SENDER = 'AnKanu'
export const AQILAS_TIMEOUT_MS = 10_000

const SIX_DIGITS = /^\d{6}$/
const E164 = /^\+[1-9]\d{1,14}$/

let override: SmsPort | undefined

export function setSmsPort(port: SmsPort | undefined): void {
  override = port
}

export function getSmsPort(env: NodeJS.ProcessEnv = process.env): SmsPort {
  if (override) {
    return override
  }
  if (smsProvider(env) === 'aqilas') {
    return aqilasSmsPort({
      apiKey: (env['AQILAS_API_KEY'] ?? '').trim(),
      senderId: (env['AQILAS_SENDER_ID'] ?? '').trim() || AQILAS_DEFAULT_SENDER,
      url: (env['AQILAS_API_URL'] ?? '').trim() || AQILAS_DEFAULT_URL,
    })
  }
  return logSmsPort()
}

/** `log` when unset or blank, `aqilas`, or null for any other value. */
export function smsProvider(env: NodeJS.ProcessEnv): 'log' | 'aqilas' | null {
  const raw = (env['SMS_PROVIDER'] ?? '').trim()
  if (raw === '' || raw === 'log') {
    return 'log'
  }
  return raw === 'aqilas' ? 'aqilas' : null
}

/**
 * Same opt-in as log mail: the image always runs with NODE_ENV=production, so a log
 * boot there needs RECAPTCHA_ALLOW_TEST_KEYS=1. Messages never echo a value.
 */
export function assertSmsBoot(env: NodeJS.ProcessEnv): void {
  const provider = smsProvider(env)
  if (provider === null) {
    throw new Error('SMS_PROVIDER must be log or aqilas')
  }
  if (provider === 'aqilas') {
    if ((env['AQILAS_API_KEY'] ?? '').trim() === '') {
      throw new Error('AQILAS_API_KEY is required when SMS_PROVIDER=aqilas')
    }
    if (hasControl(env['AQILAS_API_KEY'] ?? '')) {
      throw new Error('AQILAS_API_KEY must not contain control characters')
    }
    if (hasControl(env['AQILAS_SENDER_ID'] ?? '')) {
      throw new Error('AQILAS_SENDER_ID must not contain control characters')
    }
    const url = (env['AQILAS_API_URL'] ?? '').trim()
    if (url !== '' && !httpUrl(url)) {
      throw new Error('AQILAS_API_URL must be an http or https URL')
    }
    return
  }
  if (env['NODE_ENV'] === 'production' && env['RECAPTCHA_ALLOW_TEST_KEYS'] !== '1') {
    throw new Error('log SMS is refused in production')
  }
}

/** A key or sender with a control character would break the request header or the SMS. */
function hasControl(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code < 32 || code === 127) {
      return true
    }
  }
  return false
}

function httpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** One GSM-7 segment, no accents. */
export function otpSmsText(code: string): string {
  return `AnKanu : votre code est ${code}. Il expire dans 10 minutes. Ne le partagez avec personne.`
}

export function aqilasSmsPort(options: {
  apiKey: string
  senderId: string
  url: string
  fetch?: typeof fetch
  timeoutMs?: number
  write?: (line: string) => void
}): SmsPort {
  const send = options.fetch ?? fetch
  const timeoutMs = options.timeoutMs ?? AQILAS_TIMEOUT_MS
  const write = options.write ?? defaultErrorWrite
  return {
    async sendOtp(message) {
      if (!SIX_DIGITS.test(message.code) || !E164.test(message.phone_e164)) {
        throw new Error('otp sms refused')
      }
      if (options.apiKey === '') {
        throw new Error('aqilas key missing')
      }
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let response: Response
      try {
        response = await send(options.url, {
          method: 'POST',
          headers: { 'X-AUTH-TOKEN': options.apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: options.senderId, to: [message.phone_e164], text: otpSmsText(message.code) }),
          signal: controller.signal,
          // Never follow a redirect: it would re-send the key, phone and code to another host.
          // A 3xx comes back as is and fails below like any other non-2xx.
          redirect: 'manual',
        })
      } catch {
        // Only the kind of failure. The error may carry the URL or request details.
        write(controller.signal.aborted ? 'sms aqilas timeout\n' : 'sms aqilas network error\n')
        throw new Error('aqilas send failed')
      } finally {
        clearTimeout(timer)
      }
      // The vendor body is never read into a log or an error.
      await response.body?.cancel().catch(() => undefined)
      if (response.status < 200 || response.status > 299) {
        write(`sms aqilas status ${response.status}\n`)
        throw new Error('aqilas send failed')
      }
    },
  }
}

export function logSmsPort(write: (line: string) => void = defaultWrite): SmsPort {
  return {
    async sendOtp(message) {
      if (!SIX_DIGITS.test(message.code)) {
        throw new Error('otp log refused')
      }
      write(`otp ${message.code}\n`)
    },
  }
}

function defaultWrite(line: string): void {
  process.stdout.write(line)
}

function defaultErrorWrite(line: string): void {
  process.stderr.write(line)
}
