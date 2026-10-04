import { createServer, type Server } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { sendSmtpEmail } from './email-port.js'

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
