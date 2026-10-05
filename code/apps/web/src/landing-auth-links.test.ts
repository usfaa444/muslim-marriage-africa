import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { authPageHtml } from './auth-page.js'
import { LandingPage } from './landing.js'

const LOGIN = 'Déjà inscrit·e ? Se connecter'
const SIGNUP_SECTION = 'Déposer mon dossier de ta\'aruf'

function landingHtml(): string {
  return renderToStaticMarkup(createElement(LandingPage)).replaceAll('&#x27;', "'").replaceAll('&amp;', '&')
}

function chromeBinary(): string | null {
  const found: string[] = []
  if (process.env.ANKANU_CHROME) {
    found.push(process.env.ANKANU_CHROME)
  }
  found.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser')
  const cache = join(homedir(), '.cache/ms-playwright')
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      if (dir.startsWith('chromium-')) {
        found.push(join(cache, dir, 'chrome-linux', 'chrome'))
      }
      if (dir.startsWith('chromium_headless_shell-')) {
        found.push(join(cache, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell'))
      }
    }
  }
  return found.find((path) => existsSync(path)) ?? null
}

describe('landing auth links', () => {
  const html = landingHtml()
  const stitch = readFileSync(new URL('../../../design-stitch/01-public-landing/screen.html', import.meta.url), 'utf8')

  it('keeps the hero, header, and académie calls on the inscription section', () => {
    for (const label of ["Commencer l'inscription", 'Déposer une demande de ta', "Découvrir les modules de l'Académie"]) {
      expect(html).toContain(label)
      expect(stitch).toContain(label)
    }
    expect(html).toContain('href="#auth-inscription"')
    expect(html.match(/href="#auth-inscription"/g)?.length).toBe(3)
    expect(stitch.match(/href="#auth-inscription"/g)?.length).toBe(3)
  })

  it('sends the inscription-section dossier to signup and offers login in the header and under that button', () => {
    expect(html).toContain('href="/auth?mode=signup"')
    expect(html).toContain(SIGNUP_SECTION)
    expect(html.split(LOGIN).length - 1).toBe(2)
    expect(html.split('href="/auth?mode=login"').length - 1).toBe(2)
    expect(html).not.toContain('href="#"')
    expect(stitch).toContain('href="/auth?mode=signup"')
    expect(stitch.split(LOGIN).length - 1).toBe(2)
    expect(stitch.split('href="/auth?mode=login"').length - 1).toBe(2)
    expect(stitch).not.toContain('href="#"')
  })
})

type CdpResult = { result?: { value?: unknown } }

function listen(proc: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = ''
    const take = (chunk: Buffer) => {
      buf += chunk.toString()
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      const url = match?.[1]
      if (url) {
        resolve(url)
      }
    }
    proc.stderr.on('data', take)
    proc.stdout.on('data', take)
    proc.on('exit', (code) => reject(new Error(`chrome exited ${code}: ${buf}`)))
    setTimeout(() => reject(new Error(`chrome did not open a devtools port: ${buf}`)), 15000)
  })
}

async function withBrowser(origin: string, run: (page: { evaluate: (expression: string) => Promise<unknown>; goto: (url: string) => Promise<void> }) => Promise<void>) {
  const binary = chromeBinary()
  if (!binary) {
    throw new Error('no chrome binary')
  }
  const profile = mkdtempSync(join(tmpdir(), 'ankanu-landing-'))
  const proc = spawn(binary, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    `--user-data-dir=${profile}`,
    'about:blank',
  ])
  try {
    const browserWs = await listen(proc as ChildProcessWithoutNullStreams)
    const port = new URL(browserWs).port
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()) as Array<{ type: string; webSocketDebuggerUrl: string }>
    const pageTarget = targets.find((target) => target.type === 'page')
    if (!pageTarget) {
      throw new Error('chrome opened no page')
    }
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl)
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('page socket failed')))
    })
    let id = 0
    const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
    const waiters: Array<() => void> = []
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; error?: { message?: string }; result?: unknown; method?: string }
      if (message.id && pending.has(message.id)) {
        const slot = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) {
          slot?.reject(new Error(message.error.message || 'cdp error'))
        } else {
          slot?.resolve(message.result)
        }
      }
      if (message.method === 'Page.loadEventFired') {
        const next = waiters.shift()
        next?.()
      }
    })
    function send(method: string, params: object = {}): Promise<unknown> {
      const next = ++id
      return new Promise((resolve, reject) => {
        pending.set(next, { resolve, reject })
        ws.send(JSON.stringify({ id: next, method, params }))
      })
    }
    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    async function goto(url: string) {
      const loaded = new Promise<void>((resolve) => {
        waiters.push(resolve)
      })
      await send('Page.navigate', { url })
      await Promise.race([
        loaded,
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error(`load timeout ${url}`)), 10000)),
      ])
      const target = new URL(url)
      const started = Date.now()
      while (Date.now() - started < 8000) {
        try {
          const href = await evaluate('location.href')
          if (typeof href === 'string') {
            const current = new URL(href)
            if (current.pathname === target.pathname && current.search === target.search) {
              return
            }
          }
        } catch {
          // The page is still navigating.
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error(`landed away from ${url}`)
    }
    async function evaluate(expression: string) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }) as CdpResult
      return result.result?.value
    }
    await goto(origin)
    await run({ evaluate, goto })
    ws.close()
  } finally {
    proc.kill('SIGKILL')
    rmSync(profile, { recursive: true, force: true })
  }
}

describe.skipIf(!chromeBinary())('landing auth link clicks', () => {
  it('follows each mapped call to the inscription section or to /auth in the right mode', async () => {
    const stitch = readFileSync(new URL('../../../design-stitch/11-auth/screen.html', import.meta.url), 'utf8')
    const auth = authPageHtml(stitch)
    const landing = `<!doctype html><html><head><meta charset="utf-8"></head><body>${landingHtml()}</body></html>`
    const server: Server = createServer((request, response) => {
      const path = new URL(request.url || '/', 'http://127.0.0.1').pathname
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(path === '/auth' ? auth : landing)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('test server has no port')
    }
    const origin = `http://127.0.0.1:${address.port}`
    try {
      await withBrowser(origin, async (page) => {
        async function clickNamed(label: string) {
          const clicked = await page.evaluate(`(() => {
            const link = [...document.querySelectorAll('a')].find((node) => (node.textContent || '').trim() === ${JSON.stringify(label)})
            if (!link) return 'missing'
            link.click()
            return link.getAttribute('href')
          })()`)
          expect(clicked).not.toBe('missing')
          return clicked
        }
        async function locationState() {
          return page.evaluate(`(() => ({
            href: location.href,
            hash: location.hash,
            signupHidden: document.getElementById('panel-signup') ? document.getElementById('panel-signup').classList.contains('hidden') : null,
            loginHidden: document.getElementById('panel-login') ? document.getElementById('panel-login').classList.contains('hidden') : null,
            signupSelected: document.getElementById('tab-signup') ? document.getElementById('tab-signup').getAttribute('aria-selected') : null,
            loginSelected: document.getElementById('tab-login') ? document.getElementById('tab-login').getAttribute('aria-selected') : null,
            applied: document.documentElement.getAttribute('data-auth-mode')
          }))()`) as Promise<{ href: string; hash: string; signupHidden: boolean | null; loginHidden: boolean | null; signupSelected: string | null; loginSelected: string | null; applied: string | null }>
        }
        async function waitForMode(mode: string) {
          const started = Date.now()
          let last: Awaited<ReturnType<typeof locationState>> | null = null
          while (Date.now() - started < 8000) {
            try {
              last = await locationState()
              if (new URL(last.href).pathname === '/auth' && last.applied === mode) {
                return last
              }
            } catch {
              last = null
            }
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
          throw new Error(`auth mode ${mode} did not apply: ${JSON.stringify(last)}`)
        }

        async function clickLogin(index: number) {
          const clicked = await page.evaluate(`(() => {
            const links = [...document.querySelectorAll('a')].filter((node) => node.getAttribute('href') === '/auth?mode=login')
            const link = links[${index}]
            if (!link) return 'missing:' + links.length
            link.click()
            return link.textContent.trim()
          })()`)
          expect(clicked).toBe(LOGIN)
        }

        expect(await clickNamed("Commencer l'inscription")).toBe('#auth-inscription')
        let state = await locationState()
        expect(state.hash).toBe('#auth-inscription')
        expect(new URL(state.href).pathname).toBe('/')

        await page.goto(origin)
        expect(await clickNamed('Déposer une demande de ta\'aruf')).toBe('#auth-inscription')
        state = await locationState()
        expect(state.hash).toBe('#auth-inscription')

        await page.goto(origin)
        expect(await clickNamed("Découvrir les modules de l'Académie")).toBe('#auth-inscription')
        state = await locationState()
        expect(state.hash).toBe('#auth-inscription')

        await page.goto(origin)
        expect(await clickNamed(SIGNUP_SECTION)).toBe('/auth?mode=signup')
        state = await waitForMode('signup')
        expect(new URL(state.href).searchParams.get('mode')).toBe('signup')
        expect(state.signupHidden).toBe(false)
        expect(state.loginHidden).toBe(true)
        expect(state.signupSelected).toBe('true')
        expect(state.loginSelected).toBe('false')

        for (const index of [0, 1]) {
          await page.goto(origin)
          await clickLogin(index)
          state = await waitForMode('login')
          expect(new URL(state.href).searchParams.get('mode')).toBe('login')
          expect(state.signupHidden).toBe(true)
          expect(state.loginHidden).toBe(false)
          expect(state.loginSelected).toBe('true')
          expect(state.signupSelected).toBe('false')
        }

        await page.goto(`${origin}/auth`)
        state = await waitForMode('signup')
        expect(new URL(state.href).searchParams.get('mode')).toBe(null)
        expect(state.signupSelected).toBe('true')
        expect(state.loginHidden).toBe(true)

        await page.goto(`${origin}/auth?mode=other`)
        state = await waitForMode('signup')
        expect(new URL(state.href).searchParams.get('mode')).toBe('other')
        expect(state.signupSelected).toBe('true')
        expect(state.loginHidden).toBe(true)
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 40000)
})
