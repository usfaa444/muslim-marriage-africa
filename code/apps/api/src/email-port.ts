import { connect as netConnect, type Socket } from 'node:net'
import { connect as tlsConnect } from 'node:tls'

export type EmailMessage = {
  to: string
  link: string
  /** When set, the body is this sentence and then the link. Story 2.3 omits it, so the body stays the link alone. */
  notice?: string
}

/** Sends one message. The live adapter reads `SMTP_URL`. Tests pass a fake. */
export type EmailPort = {
  send(message: EmailMessage): Promise<void>
}

let override: EmailPort | undefined

export function setEmailPort(port: EmailPort | undefined): void {
  override = port
}

export function getEmailPort(): EmailPort {
  if (override) {
    return override
  }
  return smtpEmailPort()
}

export function smtpEmailPort(): EmailPort {
  return {
    async send(message) {
      const url = process.env['SMTP_URL']
      if (!url) {
        throw new Error('SMTP_URL is required')
      }
      await sendSmtpEmail(url, message)
    },
  }
}

type Reader = {
  expect(codes: number[]): Promise<void>
  write(line: string): void
  finish(): void
}

function refusedSmtpText(value: string): boolean {
  if (value.length === 0 || value.length > 320) {
    return true
  }
  if (value.includes('<') || value.includes('>')) {
    return true
  }
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code < 32 || code === 127) {
      return true
    }
  }
  return false
}

export async function sendSmtpEmail(smtpUrl: string, message: EmailMessage): Promise<void> {
  if (refusedSmtpText(message.to) || refusedSmtpText(message.link)) {
    throw new Error('SMTP message refused')
  }
  if (message.notice !== undefined && refusedSmtpText(message.notice)) {
    throw new Error('SMTP message refused')
  }
  const url = new URL(smtpUrl)
  if (url.protocol !== 'smtp:' && url.protocol !== 'smtps:') {
    throw new Error('SMTP_URL must be smtp or smtps')
  }
  const secure = url.protocol === 'smtps:'
  const user = decodeURIComponent(url.username)
  const password = decodeURIComponent(url.password)
  if (user !== '' && !secure) {
    throw new Error('SMTP AUTH requires smtps')
  }
  const port = url.port === '' ? (secure ? 465 : 25) : Number(url.port)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_URL port is invalid')
  }
  const socket = openSmtpSocket(secure, url.hostname, port)
  const reader = createReader(socket)
  try {
    await reader.expect([220])
    reader.write('EHLO ankanu\r\n')
    await reader.expect([250])
    if (user !== '') {
      const token = Buffer.from(`\u0000${user}\u0000${password}`, 'utf8').toString('base64')
      reader.write(`AUTH PLAIN ${token}\r\n`)
      await reader.expect([235])
    }
    reader.write(`MAIL FROM:<${message.to}>\r\n`)
    await reader.expect([250])
    reader.write(`RCPT TO:<${message.to}>\r\n`)
    await reader.expect([250, 251])
    reader.write('DATA\r\n')
    await reader.expect([354])
    reader.write(`${smtpData(message)}\r\n.\r\n`)
    await reader.expect([250])
    try {
      reader.write('QUIT\r\n')
      await reader.expect([221])
    } catch {
      // DATA already returned 250. A failed QUIT must not report the send as failed.
    }
  } finally {
    reader.finish()
  }
}

function smtpData(message: EmailMessage): string {
  const lines = [
    `From: ${message.to}`,
    `To: ${message.to}`,
    'Subject: AnKanu',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    ...(message.notice === undefined ? [] : [message.notice]),
    message.link,
  ]
  return lines.map((line) => (line.startsWith('.') ? `.${line}` : line)).join('\r\n')
}

function openSmtpSocket(secure: boolean, host: string, port: number): Socket {
  return secure ? tlsConnect({ host, port, servername: host }) : netConnect({ host, port })
}

function replyCode(line: string): number | null {
  const spaced = /^(\d{3})([ -])/.exec(line)
  if (spaced) {
    return spaced[2] === ' ' ? Number(spaced[1]) : null
  }
  const bare = /^(\d{3})$/.exec(line)
  return bare ? Number(bare[1]) : null
}

function createReader(socket: Socket): Reader {
  let buffer = ''
  let waiter: ((code: number) => void) | null = null
  let rejecter: ((error: Error) => void) | null = null
  let pendingError: Error | null = null
  const deadline = setTimeout(() => {
    fail(new Error('SMTP timed out'))
    socket.destroy()
  }, 10_000)
  const fail = (error: Error) => {
    if (!rejecter) {
      pendingError ??= error
      return
    }
    const reject = rejecter
    rejecter = null
    waiter = null
    reject(error)
  }

  const flush = () => {
    if (!waiter) {
      return
    }
    while (buffer.includes('\n')) {
      const newlineAt = buffer.indexOf('\n')
      let line = buffer.slice(0, newlineAt)
      buffer = buffer.slice(newlineAt + 1)
      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }
      const code = replyCode(line)
      if (code === null) {
        continue
      }
      const done = waiter
      waiter = null
      rejecter = null
      done(code)
      return
    }
  }

  socket.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8')
    flush()
  })
  socket.on('error', (error: Error) => {
    fail(error)
  })
  socket.on('close', () => {
    fail(new Error('SMTP closed'))
  })

  return {
    expect(codes: number[]) {
      return new Promise((resolve, reject) => {
        if (pendingError) {
          reject(pendingError)
          return
        }
        waiter = (code) => {
          if (!codes.includes(code)) {
            reject(new Error(`SMTP ${code}`))
            return
          }
          resolve()
        }
        rejecter = reject
        flush()
      })
    },
    write(line: string) {
      socket.write(line)
    },
    finish() {
      clearTimeout(deadline)
      rejecter = null
      waiter = null
      socket.destroy()
    },
  }
}
