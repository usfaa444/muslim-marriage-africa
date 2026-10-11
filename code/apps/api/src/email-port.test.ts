import { createServer, type Server } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { assertEmailBoot, logEmailPort, sendSmtpEmail } from './email-port.js'

describe('SMTP email adapter', () => {
  let server: Server | undefined

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => resolve())
      })
      server = undefined
    }
  })

  it('sends one message to the account address and includes the link', async () => {
    const seen: string[] = []
    server = createServer((socket) => {
      socket.write('220 ready\r\n')
      socket.on('data', (chunk) => {
        const text = chunk.toString('utf8')
        seen.push(text)
        if (text.startsWith('EHLO')) {
          socket.write('250-ankanu\r\n250 OK\r\n')
          return
        }
        if (text.startsWith('MAIL FROM') || text.startsWith('RCPT TO') || text.startsWith('QUIT')) {
          socket.write(text.startsWith('QUIT') ? '221 bye\r\n' : '250 OK\r\n')
          return
        }
        if (text.startsWith('DATA')) {
          socket.write('354 go\r\n')
          return
        }
        if (text.includes('\r\n.\r\n')) {
          socket.write('250 queued\r\n')
        }
      })
    })
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('expected the smtp test server to bind a TCP port')
    }
    const link = 'http://ankanu.test/email-verification?token=abc'
    await sendSmtpEmail(`smtp://127.0.0.1:${address.port}`, {
      to: 'fatim@example.bf',
      link,
    })
    const transcript = seen.join('')
    expect(transcript).toContain('MAIL FROM:<fatim@example.bf>')
    expect(transcript).toContain('RCPT TO:<fatim@example.bf>')
    expect(transcript).toContain('Subject: AnKanu')
    expect(transcript).toContain(link)
    expect(transcript).not.toContain('sms')
  })

  it('fails the send when the server refuses the recipient', async () => {
    server = createServer((socket) => {
      socket.write('220 ready\r\n')
      socket.on('data', (chunk) => {
        const text = chunk.toString('utf8')
        if (text.startsWith('EHLO')) {
          socket.write('250 OK\r\n')
          return
        }
        if (text.startsWith('MAIL FROM')) {
          socket.write('250 OK\r\n')
          return
        }
        if (text.startsWith('RCPT TO')) {
          socket.write('550 no\r\n')
        }
      })
    })
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('expected the smtp test server to bind a TCP port')
    }
    await expect(
      sendSmtpEmail(`smtp://127.0.0.1:${address.port}`, {
        to: 'fatim@example.bf',
        link: 'http://ankanu.test/email-verification?token=abc',
      }),
    ).rejects.toThrow(/SMTP 550/)
  })

  it('accepts a bare 250 reply and still succeeds when QUIT never arrives', async () => {
    server = createServer((socket) => {
      socket.write('220\r\n')
      socket.on('data', (chunk) => {
        const text = chunk.toString('utf8')
        if (text.startsWith('EHLO') || text.startsWith('MAIL FROM') || text.startsWith('RCPT TO')) {
          socket.write('250\r\n')
          return
        }
        if (text.startsWith('DATA')) {
          socket.write('354\r\n')
          return
        }
        if (text.includes('\r\n.\r\n')) {
          socket.write('250\r\n')
          socket.end()
        }
      })
    })
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('expected the smtp test server to bind a TCP port')
    }
    await sendSmtpEmail(`smtp://127.0.0.1:${address.port}`, {
      to: 'fatim@example.bf',
      link: 'http://ankanu.test/email-verification?token=abc',
    })
  })

  it('writes one log line with the recipient, subject, and full link', async () => {
    const lines: string[] = []
    const link = 'http://ankanu.test/email-verification?token=abc'
    await logEmailPort((line) => {
      lines.push(line)
    }).send({
      to: 'fatim@example.bf',
      link,
      notice: 'Une réinitialisation du mot de passe a été demandée et ce lien dure 15 minutes.',
    })
    expect(lines).toEqual([`email fatim@example.bf AnKanu ${link}\n`])
    expect(lines[0]).toContain(link)
    expect(lines[0]).not.toContain('réinitialisation')
  })

  it('log scheme writes that line to stdout and does not open a socket', async () => {
    const lines: string[] = []
    const original = process.stdout.write
    process.stdout.write = ((chunk: string | Uint8Array) => {
      lines.push(String(chunk))
      return true
    }) as typeof process.stdout.write
    try {
      const link = 'http://ankanu.test/password-reset?token=abc'
      await sendSmtpEmail('log://', { to: 'fatim@example.bf', link })
      expect(lines).toEqual([`email fatim@example.bf AnKanu ${link}\n`])
    } finally {
      process.stdout.write = original
    }
  })

  it('refuses bad log input and writes nothing', async () => {
    const lines: string[] = []
    const port = logEmailPort((line) => {
      lines.push(line)
    })
    await expect(port.send({ to: '', link: 'http://ankanu.test/email-verification?token=abc' })).rejects.toThrow(
      /refused/,
    )
    await expect(
      port.send({ to: 'fatim@example.bf', link: 'http://ankanu.test/email-verification?token=abc\nextra' }),
    ).rejects.toThrow(/refused/)
    await expect(port.send({ to: '<fatim@example.bf>', link: 'http://ankanu.test/x' })).rejects.toThrow(/refused/)
    await expect(
      sendSmtpEmail('log://', {
        to: 'fatim@example.bf',
        link: 'http://ankanu.test/x',
        notice: 'bad\nnotice',
      }),
    ).rejects.toThrow(/refused/)
    expect(lines).toEqual([])
  })

  it('refuses log mail at startup unless the test-key opt-in is set', () => {
    expect(() => assertEmailBoot({ NODE_ENV: 'production', SMTP_URL: 'log://' })).toThrow(
      /log mail is refused in production/,
    )
    expect(() => assertEmailBoot({ SMTP_URL: 'log://' })).toThrow(/log mail is refused in production/)
    expect(() =>
      assertEmailBoot({ NODE_ENV: 'production', RECAPTCHA_ALLOW_TEST_KEYS: '1', SMTP_URL: 'log://' }),
    ).not.toThrow()
    expect(() => assertEmailBoot({ NODE_ENV: 'production', SMTP_URL: 'smtp://127.0.0.1:25' })).not.toThrow()
    expect(() => assertEmailBoot({})).not.toThrow()
  })

  it('refuses cleartext AUTH and control characters before opening a socket', async () => {
    await expect(
      sendSmtpEmail('smtp://user:secret@127.0.0.1:2525', {
        to: 'fatim@example.bf',
        link: 'http://ankanu.test/email-verification?token=abc',
      }),
    ).rejects.toThrow(/AUTH/)
    await expect(
      sendSmtpEmail('smtp://127.0.0.1:2525', {
        to: 'fatim\u0000@example.bf',
        link: 'http://ankanu.test/email-verification?token=abc',
      }),
    ).rejects.toThrow(/refused/)
  })
})
