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

const html = discoverHtml(stitch('screen.html'), stitch('grid.html'))

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
    expect(html).toContain('ankanu_browse_grid_text')
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
            const raw = sessionStorage.getItem('ankanu_browse_grid_text') || ''
            const images = Array.from(document.querySelectorAll('#discover-tiles img')).map((img) => img.getAttribute('src'))
            return {
              open: grid ? grid.hidden === false : false,
              text,
              raw,
              images,
              reserved: text.includes('Photographie réservée'),
              missing: text.includes('Photographie non publiée'),
              empty: text.includes('Aucun profil pour ces filtres.'),
            }
          })()`,
          returnByValue: true,
        },
        sessionId,
      )
      const view = (
        shown.result as {
          value?: { open: boolean; text: string; raw: string; images: string[]; reserved: boolean; missing: boolean; empty: boolean }
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
})
