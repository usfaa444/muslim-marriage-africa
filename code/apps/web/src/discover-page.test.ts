import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET as getDecouvrir } from '../app/decouvrir/route.js'
import { discoverHtml } from './discover-page.js'

function stitch(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/57-discover/${name}`, import.meta.url)),
    'utf8',
  )
}

const ACCOUNT = '01990000-0000-7000-8000-0000000000aa'
const OTHER = '01990000-0000-7000-8000-0000000000bb'
const html = discoverHtml(stitch('screen.html'), stitch('grid.html'), ACCOUNT)
const otherHtml = discoverHtml(stitch('screen.html'), stitch('grid.html'), OTHER)

describe('discover grid page', () => {
  it('opens on the card chrome and hides the grid', () => {
    expect(html).toContain('id="discover-card"')
    expect(html).toContain('id="discover-grid" hidden')
    expect(html.match(/data-discover-view="card"/g)).toHaveLength(2)
    expect(html.match(/data-discover-view="grid"/g)).toHaveLength(2)
    expect(html).toContain('Découverte respectueuse')
    expect(html).toContain('Découvrir selon vos affinités éthiques')
    expect(html).toContain('/v1/browse?view=grid')
    expect(html).not.toContain('view=card')
    expect(html).not.toContain('Al-Hassan')
    expect(html).not.toContain('Ibrahim_S')
    expect(html).not.toContain('Abdoul_N')
    expect(html).not.toContain('Ville : Ouagadougou')
    expect(html).not.toContain("Tranche d'âge")
    expect(html).not.toContain('Pratique assidue')
    expect(html).not.toContain('Passer avec égards')
    expect(html).not.toContain('Envoyer une invitation')
    expect(html).not.toContain('href="#"')
    expect(html).toContain('href="/invitations"')
    expect(html).toContain('href="/discussions"')
    expect(html).toContain('href="/profil"')
    expect(html).toContain('Aucun profil pour ces filtres.')
    expect(html).toContain('Photographie réservée')
    expect(html).toContain('Photographie non publiée')
    expect(html).toContain('Enregistrer en toute discrétion')
    expect(html).toContain('ankanu_browse_grid_text:')
    expect(html).toContain(`data-discover-account="${ACCOUNT}"`)
    expect(html).toContain('#discover-retry[hidden]')
    expect(html).toContain('[data-reserved][hidden]')
    expect(html).toContain('display: none !important')
    expect(html).toContain('requestAnimationFrame(function () {\n    requestAnimationFrame(function () {')
    const tilesAt = html.indexOf('id="discover-tiles"')
    const sectionClose = html.indexOf('</section>', tilesAt)
    expect(html.indexOf('id="discover-empty"')).toBeGreaterThan(sectionClose)
    expect(html.indexOf("error.code === 'PIN_REQUIRED'")).toBeLessThan(html.indexOf("window.location.assign('/auth')"))
    expect(html.match(/<span[^>]*inline-flex/g)).toBeNull()
    expect(html).toContain('Filtres')
    expect(html).not.toContain('en ligne')
    expect(html).not.toContain('kids')
  })

  it('keeps a staff stub on the JSON envelope and sends a signed-out member to auth', async () => {
    const staff = await getDecouvrir(
      new Request('http://localhost/decouvrir', { headers: { cookie: 'ankanu_session=staff' } }),
    )
    expect(staff.status).toBe(403)
    expect(staff.headers.get('content-type')).toContain('application/json')
    const anon = await getDecouvrir(new Request('http://localhost/decouvrir'))
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://localhost/auth')
    const web = await getDecouvrir(
      new Request('http://localhost/decouvrir', { headers: { cookie: 'ankanu_session=web' } }),
    )
    const capacitor = await getDecouvrir(
      new Request('http://localhost/decouvrir', { headers: { cookie: 'ankanu_session=capacitor' } }),
    )
    expect(web.status).toBe(401)
    expect(capacitor.status).toBe(401)
    expect(web.headers.get('content-type')).toContain('application/json')
    expect(capacitor.headers.get('content-type')).toContain('application/json')
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/v1/accounts/gate')) {
        return new Response(JSON.stringify({ step: 'account' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/v1/me/profile')) {
        return new Response(JSON.stringify({ account_id: ACCOUNT }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return original(input)
    }) as typeof fetch
    try {
      const live = await getDecouvrir(
        new Request('http://localhost/decouvrir', { headers: { cookie: 'ankanu_session=live-session-token' } }),
      )
      expect(live.status).toBe(200)
      expect(live.headers.get('content-type')).toContain('text/html')
      expect(await live.text()).toContain(`data-discover-account="${ACCOUNT}"`)
    } finally {
      globalThis.fetch = original
    }
  })
})

const WIDTHS = [360, 390, 768, 1024, 1280, 1440] as const

function chromeBinary(): string | null {
  const found = [
    process.env.ANKANU_CHROME ?? '',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    join(homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
  ]
  return found.find((path) => path.length > 0 && existsSync(path)) ?? null
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
      if (match?.[1]) resolve({ proc, ws: match[1] })
    }
    proc.stdout.on('data', take)
    proc.stderr.on('data', take)
    proc.on('exit', (code) => reject(new Error(`chrome exited ${code ?? 0}: ${buf.slice(-400)}`)))
  })
}

describe('discover grid in a browser', () => {
  const binary = chromeBinary()

  it.skipIf(!binary)('toggles to a real grid and fits every required width', async () => {
    let fetches = 0
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/v1/browse') {
        fetches += 1
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        response.end(
          JSON.stringify({
            view: 'grid',
            next_cursor: null,
            items: [
              {
                id: '01990000-0000-7000-8000-000000000001',
                pseudonym: 'Amina_Bobo_nom_tres_long_pour_la_ligne',
                age: 29,
                city: 'Ouagadougou',
                marital_status: 'Célibataire',
                polygamy_intent: 'Non',
                madhhab: 'Maliki',
                practice: 'Pratique assidue',
                verified: true,
                photo_blur: true,
                photo: { id: 'p1', url: '/media/blur-signed' },
              },
              {
                id: '01990000-0000-7000-8000-000000000002',
                pseudonym: 'Moussa',
                age: 36,
                city: null,
                marital_status: null,
                polygamy_intent: null,
                madhhab: null,
                practice: null,
                verified: false,
                photo_blur: true,
                photo: null,
              },
            ],
          }),
        )
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(html)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-discover-${Date.now()}`)
    const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/epic-3-3.8-widths/', import.meta.url))
    mkdirSync(shots, { recursive: true })
    const chrome = await launch(binary as string, profile)
    const ws = new WebSocket(chrome.ws)
    let seq = 0
    const pending = new Map<number, { resolve: (value: { result?: { value?: unknown } }) => void; reject: (error: Error) => void }>()
    const waits: Array<{ method: string; resolve: () => void }> = []
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number
        method?: string
        result?: { result?: { value?: unknown } }
        error?: { message?: string }
      }
      if (message.id && pending.has(message.id)) {
        const waiter = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) waiter?.reject(new Error(message.error.message ?? 'cdp'))
        else waiter?.resolve(message.result ?? {})
        return
      }
      if (!message.method) return
      for (let index = waits.length - 1; index >= 0; index -= 1) {
        const waiter = waits[index]
        if (waiter && waiter.method === message.method) {
          waits.splice(index, 1)
          waiter.resolve()
        }
      }
    })
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('socket')))
    })
    const send = (method: string, params?: object, sessionId?: string) => {
      const id = ++seq
      return new Promise<{ result?: { value?: unknown } }>((resolve, reject) => {
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params, sessionId }))
      })
    }
    const failures: string[] = []
    try {
      const created = await send('Target.createTarget', { url: 'about:blank' })
      const targetId = String((created as { targetId?: string }).targetId)
      const attached = await send('Target.attachToTarget', { targetId, flatten: true })
      const sessionId = String((attached as { sessionId?: string }).sessionId)
      await send('Page.enable', {}, sessionId)
      await send('Runtime.enable', {}, sessionId)
      const measure = async (width: number, state: string) => {
        await send(
          'Emulation.setDeviceMetricsOverride',
          { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 },
          sessionId,
        )
        const sample = await send(
          'Runtime.evaluate',
          {
            expression:
              '({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth })',
            returnByValue: true,
          },
          sessionId,
        )
        const value = (sample.result as { value?: { scrollWidth: number; width: number } } | undefined)?.value
        if (!value || value.scrollWidth > value.width) {
          failures.push(`${state}@${width} scroll ${value?.scrollWidth ?? '?'} > ${value?.width ?? width}`)
        }
        if (width === 360 || width === 1440) {
          const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
          const data = String((shot as { data?: string }).data ?? '')
          if (data) writeFileSync(join(shots, `${state}-${width}.png`), Buffer.from(data, 'base64'))
        }
      }
      const loaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await send('Page.navigate', { url: `${origin}/` }, sessionId)
      await loaded
      await send(
        'Runtime.evaluate',
        {
          expression:
            "new Promise((resolve) => { const start = Date.now(); const tick = () => { const color = getComputedStyle(document.body).backgroundColor; if ((color && color !== 'rgba(0, 0, 0, 0)') || Date.now() - start > 8000) resolve(true); else setTimeout(tick, 100) }; tick() })",
          awaitPromise: true,
        },
        sessionId,
      )
      expect(fetches).toBe(0)
      for (const width of WIDTHS) await measure(width, 'card')
      await send(
        'Runtime.evaluate',
        {
          expression: "document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()",
        },
        sessionId,
      )
      await send(
        'Runtime.evaluate',
        {
          expression:
            "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText || ''; if (text.includes('Amina_Bobo_nom_tres_long_pour_la_ligne') || Date.now() - start > 4000) resolve(text.includes('Amina_Bobo_nom_tres_long_pour_la_ligne')); else setTimeout(tick, 50) }; tick() })",
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId,
      )
      const shown = await send(
        'Runtime.evaluate',
        {
          expression: `(() => {
            const grid = document.getElementById('discover-grid')
            const text = grid ? grid.innerText : ''
            const raw = sessionStorage.getItem('ankanu_browse_grid_text:${ACCOUNT}') || ''
            const images = Array.from(document.querySelectorAll('#discover-tiles img')).map((img) => img.getAttribute('src'))
            const retry = document.getElementById('discover-retry')
            return {
              open: grid ? grid.hidden === false : false,
              text,
              raw,
              images,
              reserved: text.includes('Photographie réservée'),
              missing: text.includes('Photographie non publiée'),
              empty: text.includes('Aucun profil pour ces filtres.'),
              verified: text.includes('VÉRIFIÉ'),
              chips: document.querySelectorAll('#discover-card span.inline-flex, #discover-grid span.inline-flex').length,
              retry: retry ? getComputedStyle(retry).display : '',
            }
          })()`,
          returnByValue: true,
        },
        sessionId,
      )
      const view = (
        shown.result as {
          value?: {
            open: boolean
            text: string
            raw: string
            images: string[]
            reserved: boolean
            missing: boolean
            empty: boolean
            verified: boolean
            chips: number
            retry: string
          }
        }
      )?.value
      expect(view?.open).toBe(true)
      expect(view?.text).toContain('Amina_Bobo_nom_tres_long_pour_la_ligne, 29 ans')
      expect(view?.text).toContain('Moussa, 36 ans')
      expect(view?.text).toContain('Célibataire')
      expect(view?.text).not.toContain('Al-Hassan')
      expect(view?.reserved).toBe(true)
      expect(view?.missing).toBe(true)
      expect(view?.empty).toBe(false)
      expect(view?.verified).toBe(true)
      expect(view?.chips).toBe(0)
      expect(view?.retry).toBe('none')
      expect(view?.raw).toContain(`"account":"${ACCOUNT}"`)
      expect(view?.raw).not.toContain('/media/blur-signed')
      expect(view?.raw).not.toContain('"url"')
      expect(view?.images).toEqual(['/media/blur-signed'])
      expect(fetches).toBe(1)
      for (const width of WIDTHS) await measure(width, 'grid')
      await send(
        'Runtime.evaluate',
        { expression: "document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()" },
        sessionId,
      )
      await send(
        'Runtime.evaluate',
        { expression: "document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()" },
        sessionId,
      )
      expect(fetches).toBe(1)
      await send(
        'Runtime.evaluate',
        { expression: "document.querySelector('[data-bookmark]').click()" },
        sessionId,
      )
      const stayed = await send(
        'Runtime.evaluate',
        { expression: 'location.pathname', returnByValue: true },
        sessionId,
      )
      expect((stayed.result as { value?: string } | undefined)?.value).toBe('/')
      await send(
        'Runtime.evaluate',
        {
          expression:
            "document.querySelector('[data-bookmark]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))",
        },
        sessionId,
      )
      const stayedOnEnter = await send(
        'Runtime.evaluate',
        { expression: 'location.pathname', returnByValue: true },
        sessionId,
      )
      expect((stayedOnEnter.result as { value?: string } | undefined)?.value).toBe('/')
      await send(
        'Runtime.evaluate',
        { expression: "document.querySelector('[data-tile]').click()" },
        sessionId,
      )
      await send(
        'Runtime.evaluate',
        {
          expression:
            "new Promise((resolve) => { const start = Date.now(); const tick = () => { if (location.pathname.indexOf('/profil/') === 0 || Date.now() - start > 2000) resolve(location.pathname); else setTimeout(tick, 50) }; tick() })",
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId,
      )
      const path = await send('Runtime.evaluate', { expression: 'location.pathname', returnByValue: true }, sessionId)
      expect((path.result as { value?: string } | undefined)?.value).toBe('/profil/01990000-0000-7000-8000-000000000001')
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    expect(failures).toEqual([])
  }, 120_000)

  it.skipIf(!binary)('follows the live session, the cache, and the error paths', async () => {
    const queue: Array<{ status: number; body: unknown }> = []
    const held: Array<{ statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }> = []
    let fetches = 0
    const sendJson = (
      response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void },
      status: number,
      body: unknown,
    ) => {
      response.statusCode = status
      response.setHeader('content-type', 'application/json; charset=utf-8')
      response.setHeader('cache-control', 'no-store')
      response.end(JSON.stringify(body))
    }
    const release = (status: number, body: unknown) => {
      const waiting = held.shift()
      if (!waiting) {
        queue.push({ status, body })
        return
      }
      sendJson(waiting, status, body)
    }
    const clear = {
      view: 'grid',
      next_cursor: null,
      items: [
        {
          id: '01990000-0000-7000-8000-000000000001',
          pseudonym: 'Amina',
          age: 29,
          city: 'Bobo',
          marital_status: 'Célibataire',
          polygamy_intent: null,
          madhhab: null,
          practice: null,
          verified: true,
          photo_blur: false,
          photo: { id: 'p1', url: '/media/clear-signed' },
        },
      ],
    }
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/v1/pin') {
        sendJson(response, 200, { locked: false })
        return
      }
      if (url.pathname === '/v1/browse') {
        fetches += 1
        const next = queue.shift()
        if (!next) {
          held.push(response)
          return
        }
        sendJson(response, next.status, next.body)
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(url.pathname === '/other' ? otherHtml : html)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-discover-paths-${Date.now()}`)
    const chrome = await launch(binary as string, profile)
    const ws = new WebSocket(chrome.ws)
    let step = 'boot'
    let seq = 0
    const pending = new Map<number, { resolve: (value: { result?: { value?: unknown } }) => void; reject: (error: Error) => void }>()
    const waits: Array<{ method: string; resolve: () => void }> = []
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number
        method?: string
        result?: { result?: { value?: unknown } }
        error?: { message?: string }
      }
      if (message.id && pending.has(message.id)) {
        const waiter = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) waiter?.reject(new Error(`${step}: ${message.error.message ?? 'cdp'}`))
        else waiter?.resolve(message.result ?? {})
        return
      }
      if (!message.method) return
      for (let index = waits.length - 1; index >= 0; index -= 1) {
        const waiter = waits[index]
        if (waiter && waiter.method === message.method) {
          waits.splice(index, 1)
          waiter.resolve()
        }
      }
    })
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('socket')))
    })
    const send = (method: string, params?: object, sessionId?: string) => {
      const id = ++seq
      return new Promise<{ result?: { value?: unknown } }>((resolve, reject) => {
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params, sessionId }))
      })
    }
    const created = await send('Target.createTarget', { url: 'about:blank' })
    const targetId = String((created as { targetId?: string }).targetId)
    const attached = await send('Target.attachToTarget', { targetId, flatten: true })
    const sessionId = String((attached as { sessionId?: string }).sessionId)
    await send('Page.enable', {}, sessionId)
    await send('Runtime.enable', {}, sessionId)
    const value = async (expression: string) => {
      step = expression.slice(0, 70)
      const result = await send(
        'Runtime.evaluate',
        { expression, awaitPromise: true, returnByValue: true },
        sessionId,
      )
      return (result.result as { value?: unknown } | undefined)?.value
    }
    const go = async (path: string) => {
      step = `go ${path}`
      const loaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await send('Page.navigate', { url: `${origin}${path}` }, sessionId)
      await loaded
    }
    const waitHeld = async (count: number) => {
      const start = Date.now()
      while (held.length < count && Date.now() - start < 3000) {
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }
    try {
      await go('/')
      await value(`(() => {
        const orig = window.requestAnimationFrame
        let frame = 0
        window.__srcFrame = 0
        window.requestAnimationFrame = function (callback) {
          return orig(function () {
            frame += 1
            callback()
            const image = document.querySelector('#discover-tiles img')
            if (image && image.getAttribute('src') && !window.__srcFrame) window.__srcFrame = frame
          })
        }
      })()`)
      release(200, clear)
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      const srcFrame = await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { if (window.__srcFrame || Date.now() - start > 4000) resolve(window.__srcFrame || 0); else setTimeout(tick, 20) }; tick() })",
      )
      const clearState = (await value(`(() => {
        const reserved = document.querySelector('[data-reserved]')
        const missing = document.querySelector('[data-missing]')
        const image = document.querySelector('#discover-tiles img')
        return {
          text: document.body.innerText,
          reserved: reserved ? reserved.hidden : null,
          missing: missing ? missing.hidden : null,
          src: image ? image.getAttribute('src') : '',
          raw: sessionStorage.getItem('ankanu_browse_grid_text:${ACCOUNT}') || '',
        }
      })()`)) as {
        text: string
        reserved: boolean
        missing: boolean
        src: string
        raw: string
      }
      expect(srcFrame).toBeGreaterThan(1)
      expect(clearState.reserved).toBe(true)
      expect(clearState.missing).toBe(true)
      expect(clearState.src).toBe('/media/clear-signed')
      expect(clearState.text).toContain('VÉRIFIÉ')
      expect(clearState.text).not.toContain('Photographie réservée')
      expect(clearState.raw).toContain('"pseudonym":"Amina"')
      expect(clearState.raw).not.toContain('url')

      await go('/again')
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await waitHeld(1)
      const cached = await value('document.body.innerText')
      expect(String(cached)).toContain('Amina, 29 ans')
      expect(fetches).toBe(2)
      release(200, {
        view: 'grid',
        next_cursor: null,
        items: [
          {
            id: '01990000-0000-7000-8000-000000000003',
            pseudonym: 'Moussa',
            age: 36,
            city: null,
            marital_status: null,
            polygamy_intent: null,
            madhhab: null,
            practice: null,
            verified: false,
            photo_blur: true,
            photo: null,
          },
        ],
      })
      const fresh = await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText || ''; if (text.includes('Moussa, 36 ans') || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
      )
      expect(String(fresh)).toContain('Moussa, 36 ans')

      await go('/other')
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await waitHeld(1)
      const foreign = String(await value('document.body.innerText'))
      expect(foreign).not.toContain('Amina')
      expect(foreign).not.toContain('Moussa')
      release(200, { view: 'grid', next_cursor: null, items: [] })
      const empty = await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText || ''; if (text.includes('Aucun profil pour ces filtres.') || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
      )
      expect(String(empty)).toContain('Aucun profil pour ces filtres.')

      await go('/')
      release(401, { error: { code: 'PIN_REQUIRED', message: 'PIN', retryable: false } })
      const pinLoaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await pinLoaded
      expect(await value('location.pathname')).toBe('/pin')

      await go('/')
      release(401, { error: { code: 'UNAUTHENTICATED', message: 'Signed out', retryable: false } })
      const authLoaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await authLoaded
      expect(await value('location.pathname')).toBe('/auth')

      await go('/')
      release(403, {
        error: { code: 'FORBIDDEN', message: 'Not listable', details: { reason: 'viewer_not_listable' }, retryable: false },
      })
      const editLoaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await editLoaded
      expect(await value('location.pathname')).toBe('/profile-edit')

      await go('/')
      release(503, { error: { code: 'UNHANDLED', message: 'Request failed', retryable: true } })
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      const failed = (await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const node = document.getElementById('discover-error'); const retry = document.getElementById('discover-retry'); if ((node && node.textContent === 'Request failed') || Date.now() - start > 4000) resolve({ message: node ? node.textContent : '', retry: retry ? getComputedStyle(retry).display : '' }); else setTimeout(tick, 30) }; tick() })",
      )) as { message: string; retry: string }
      expect(failed.message).toBe('Request failed')
      expect(failed.retry).not.toBe('none')

      await go('/')
      release(429, { error: { code: 'RATE_LIMITED', message: 'Cadence de requêtes régulée.', retryable: true } })
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      const limited = (await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const node = document.getElementById('discover-error'); const retry = document.getElementById('discover-retry'); if ((node && node.hidden === false) || Date.now() - start > 4000) resolve({ message: node ? node.textContent : '', hidden: node ? node.hidden : true, retry: retry ? getComputedStyle(retry).display : '', tiles: document.querySelectorAll('#discover-tiles article').length }); else setTimeout(tick, 30) }; tick() })",
      )) as { message: string; hidden: boolean; retry: string; tiles: number }
      expect(limited.message).toBe('Cadence de requêtes régulée.')
      expect(limited.hidden).toBe(false)
      expect(limited.retry).not.toBe('none')
      expect(limited.tiles).toBe(0)

      await value("document.getElementById('discover-retry').click()")
      await waitHeld(1)
      await value("document.getElementById('discover-retry').click()")
      await waitHeld(2)
      release(429, { error: { code: 'RATE_LIMITED', message: 'Cadence de requêtes régulée.', retryable: true } })
      release(200, {
        view: 'grid',
        next_cursor: null,
        items: [
          {
            id: '01990000-0000-7000-8000-000000000004',
            pseudonym: 'Fatou',
            age: 31,
            city: 'Ouaga',
            marital_status: null,
            polygamy_intent: null,
            madhhab: null,
            practice: null,
            verified: false,
            photo_blur: true,
            photo: null,
          },
        ],
      })
      const settled = await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText || ''; if (text.includes('Fatou, 31 ans') || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
      )
      expect(String(settled)).toContain('Fatou, 31 ans')
      expect(String(settled)).not.toContain('Cadence de requêtes régulée.')
      const beforeExpiry = fetches
      await value("document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      expect(fetches).toBe(beforeExpiry)
      await value('(() => { const base = Date.now(); Date.now = () => base + 61000 })()')
      await value("document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await waitHeld(1)
      expect(fetches).toBe(beforeExpiry + 1)
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 120_000)
})
