import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  authHtml,
  emailHtml,
  idHtml,
  identityHtml,
  onboardingHtml,
  otpHtml,
  phoneHtml,
  photoHtml,
  pinHtml,
  profileHtml,
  pseudonymHtml,
  resetHtml,
  settingsHtml,
  splashHtml,
  statusHtml,
} from './v2-pages.js'

const WIDTHS = [360, 390, 768, 1024, 1280, 1440] as const
const SHOTS = new Set([360, 1440])

function chromeBinary(): string | null {
  const found: string[] = []
  if (process.env.ANKANU_CHROME) {
    found.push(process.env.ANKANU_CHROME)
  }
  found.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser')
  const cache = join(homedir(), '.cache/ms-playwright')
  if (existsSync(cache)) {
    for (const dir of ['chromium-1243', 'chromium-1194', 'chromium-1187']) {
      found.push(join(cache, dir, 'chrome-linux64', 'chrome'))
      found.push(join(cache, dir, 'chrome-linux', 'chrome'))
    }
  }
  return found.find((path) => existsSync(path)) ?? null
}

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

function screens(): Array<{ name: string; html: string }> {
  const auth = stitch('02-auth')
  return [
    { name: '00-splash', html: splashHtml() },
    { name: '01-identity', html: identityHtml(stitch('03-age-gate')) },
    { name: '02-pseudonym', html: pseudonymHtml(stitch('54-pseudonym-dob')) },
    { name: '03-account', html: authHtml(auth, 'signup', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI') },
    { name: '04-sign-in', html: authHtml(auth, 'login', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI') },
    { name: '05-email', html: emailHtml(stitch('04-email-verification')) },
    { name: '06-phone', html: phoneHtml(stitch('06-otp')) },
    { name: '07-otp', html: otpHtml(stitch('56-otp-alt')) },
    { name: '08-id', html: idHtml(stitch('07-id-liveness')) },
    { name: '09-reset', html: resetHtml(stitch('05-password-reset')) },
    { name: '09b-reset-renew', html: resetHtml(stitch('05-password-reset'), 'renew') },
    { name: '09c-reset-invalid', html: resetHtml(stitch('05-password-reset'), 'invalid') },
    { name: '09d-reset-done', html: resetHtml(stitch('05-password-reset'), 'done') },
    { name: '10-pin', html: pinHtml(stitch('10-pin-lock')) },
    { name: '11-onboarding', html: onboardingHtml(stitch('08-onboarding')) },
    { name: '12-photo', html: photoHtml(stitch('09-photo-rules')) },
    { name: '13-profile', html: profileHtml(stitch('11-profile-edit')) },
    { name: '14-settings', html: settingsHtml(stitch('27-settings')) },
    { name: '15-status', html: statusHtml(stitch('28-delete-export-status')) },
  ]
}

type CdpResult = Record<string, unknown>

function connect(wsUrl: string): Promise<{
  send: (method: string, params?: object, sessionId?: string) => Promise<CdpResult>
  wait: (method: string, sessionId?: string) => Promise<void>
  close: () => void
}> {
  const ws = new WebSocket(wsUrl)
  let seq = 0
  const pending = new Map<number, { resolve: (value: CdpResult) => void; reject: (error: Error) => void }>()
  const waits: Array<{ method: string; sessionId?: string; resolve: () => void }> = []
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number
      method?: string
      sessionId?: string
      result?: CdpResult
      error?: { message?: string }
    }
    if (message.id && pending.has(message.id)) {
      const waiter = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) {
        waiter?.reject(new Error(message.error.message ?? 'cdp error'))
      } else {
        waiter?.resolve(message.result ?? {})
      }
      return
    }
    if (!message.method) {
      return
    }
    for (let index = waits.length - 1; index >= 0; index -= 1) {
      const waiter = waits[index]
      if (waiter && waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
        waits.splice(index, 1)
        waiter.resolve()
      }
    }
  })
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params, sessionId) {
          const id = ++seq
          return new Promise((resolveSend, rejectSend) => {
            pending.set(id, { resolve: resolveSend, reject: rejectSend })
            ws.send(JSON.stringify({ id, method, params, sessionId }))
          })
        },
        wait(method, sessionId) {
          return new Promise((resolveWait) => {
            waits.push({ method, sessionId, resolve: resolveWait })
          })
        },
        close() {
          ws.close()
        },
      })
    })
    ws.addEventListener('error', () => reject(new Error('chrome socket failed')))
  })
}

function launch(binary: string, profile: string): Promise<{ proc: ChildProcessWithoutNullStreams; ws: string }> {
  const proc = spawn(
    binary,
    ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  return new Promise((resolve, reject) => {
    let buf = ''
    const take = (chunk: Buffer) => {
      buf += chunk.toString()
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match?.[1]) {
        resolve({ proc, ws: match[1] })
      }
    }
    proc.stdout.on('data', take)
    proc.stderr.on('data', take)
    proc.on('exit', (code) => reject(new Error(`chrome exited ${code ?? 0}: ${buf.slice(-400)}`)))
  })
}

const FIT = `(() => {
  const width = window.innerWidth
  const scrollWidth = document.documentElement.scrollWidth
  const bad = []
  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) continue
    if (rect.right > width + 1 || rect.left < -1) {
      bad.push((el.id || el.tagName) + ' ' + Math.round(rect.left) + '..' + Math.round(rect.right))
      if (bad.length === 8) break
    }
  }
  return { width, scrollWidth, bad }
})()`

describe('v2 screens fit the required widths', () => {
  const binary = chromeBinary()
  it.skipIf(!binary)('keeps scrollWidth within the viewport at every required width', async () => {
    const pages = screens()
    const server: Server = createServer((request, response) => {
      const name = new URL(request.url || '/', 'http://127.0.0.1').pathname.slice(1)
      const page = pages.find((item) => item.name === name)
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(page ? page.html : 'missing')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('test server has no port')
    }
    const origin = `http://127.0.0.1:${address.port}`
    const profile = mkdtempSync(join(tmpdir(), 'ankanu-chrome-'))
    const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/ank-83-widths/', import.meta.url))
    mkdirSync(shots, { recursive: true })
    const chrome = await launch(binary as string, profile)
    const cdp = await connect(chrome.ws)
    const failures: string[] = []
    try {
      const created = await cdp.send('Target.createTarget', { url: 'about:blank' })
      const targetId = String(created.targetId)
      const attached = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
      const sessionId = String(attached.sessionId)
      await cdp.send('Page.enable', {}, sessionId)
      await cdp.send('Runtime.enable', {}, sessionId)
      await cdp.send(
        'Page.addScriptToEvaluateOnNewDocument',
        {
          source:
            "try{sessionStorage.setItem('ankanu.signup.v2', JSON.stringify({civil_given_name:'Awa',civil_family_name:'Sawadogo',gender:'sister',pseudonym:'awa_94',dob:'1990-01-15'}))}catch(e){}",
        },
        sessionId,
      )
      for (const page of pages) {
        for (const width of WIDTHS) {
          await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 },
            sessionId,
          )
          const loaded = cdp.wait('Page.loadEventFired', sessionId)
          await cdp.send('Page.navigate', { url: `${origin}/${page.name}` }, sessionId)
          await loaded
          await cdp.send(
            'Runtime.evaluate',
            {
              expression: `new Promise((resolve) => { const start = Date.now(); const tick = () => { const body = document.body; const color = body ? getComputedStyle(body).backgroundColor : ''; const slot = document.querySelector('#login-recaptcha, #signup-recaptcha'); const widget = slot && slot.querySelector('iframe'); const styled = color && color !== 'rgba(0, 0, 0, 0)'; const captchaReady = !slot || widget || Date.now() - start > 6000; if ((styled && captchaReady) || Date.now() - start > 8000) resolve(true); else setTimeout(tick, 100) }; tick() })`,
              awaitPromise: true,
            },
            sessionId,
          )
          const measured = await cdp.send(
            'Runtime.evaluate',
            { expression: FIT, returnByValue: true },
            sessionId,
          )
          const value = (measured.result as { value?: { width: number; scrollWidth: number; bad: string[] } } | undefined)
            ?.value
          if (!value || value.scrollWidth > value.width || value.bad.length > 0) {
            failures.push(
              `${page.name}@${width} scroll ${value?.scrollWidth ?? '?'} > ${value?.width ?? width} ${value?.bad.join(' | ') ?? ''}`,
            )
          }
          if (SHOTS.has(width)) {
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
            const data = String(shot.data ?? '')
            if (data) {
              writeFileSync(join(shots, `${page.name}-${width}.png`), Buffer.from(data, 'base64'))
            }
          }
        }
      }
    } finally {
      cdp.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    expect(failures).toEqual([])
  }, 180_000)
})
