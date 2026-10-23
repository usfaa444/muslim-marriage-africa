import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET as getDecouvrir } from '../app/decouvrir/route.js'
import { discoverHtml } from './discover-page.js'
import { settingsHtml } from './v2-pages.js'

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
const sisterFiltered = discoverHtml(
  stitch('screen.html'),
  stitch('grid.html'),
  ACCOUNT,
  'sister',
  '?marital_status=married&polygamy_intent=yes',
)

function beforeModal(source: string): string {
  const at = source.indexOf('id="filters-modal"')
  return at < 0 ? source : source.slice(0, at)
}

describe('discover grid page', () => {
  it('opens on the card chrome and hides the grid', () => {
    expect(html).toContain('id="discover-card"')
    expect(html).toContain('id="discover-hold" hidden')
    expect(html).toContain('function showNotListable')
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
    expect(html).not.toContain('Projet monogame')
    expect(html).not.toContain("Projet d'édification")
    expect(beforeModal(html)).not.toContain('Ville : Ouagadougou')
    expect(beforeModal(html)).not.toContain("Tranche d'âge")
    expect(beforeModal(html)).not.toContain('Pratique assidue')
    expect(beforeModal(html)).not.toContain('Même ville')
    expect(html).toContain('id="discover-focus"')
    expect(html).toContain('data-card-pass')
    expect(html).toContain('Passer avec égards')
    expect(html).toContain('data-later="flash"')
    expect(html).toContain('data-card-invite')
    expect(html).not.toContain('data-later="invite"')
    expect(html).toContain("window.location.assign('/invitations/envoyer/' + encodeURIComponent(cardItem.id))")
    expect(html).toContain("Message d'introduction")
    expect(html).toContain('Envoyer une invitation')
    expect(html).toContain("fetch('/v1/browse/pass'")
    expect(html).not.toContain('/v1/invites')
    expect(html).toContain('ankanu_browse_card_text:')
    expect(html).not.toContain('href="#"')
    expect(html).toContain('href="/invitations"')
    expect(html).toContain('href="/discussions"')
    expect(html).toContain('href="/profil"')
    expect(html).toContain('Aucun profil pour ces filtres.')
    expect(html).toContain('Photographie réservée')
    expect(html).toContain('Photographie non publiée')
    expect(html).toContain('Enregistrer en toute discrétion')
    expect(html).toContain("fetch('/v1/favourites'")
    expect(html).toContain('ankanu_browse_grid_text:')
    expect(html).toContain(`data-discover-account="${ACCOUNT}"`)
    expect(html).toContain('#discover-retry[hidden]')
    expect(html).toContain('[data-reserved][hidden]')
    expect(html).toContain('display: none !important')
    expect(html).toContain('requestAnimationFrame(function () {\n    requestAnimationFrame(function () {')
    expect(html).toContain('function liteEnabled()')
    expect(html).toContain('function mountLiteThumb(photo, url)')
    expect(html).toContain("image.loading = 'lazy'")
    expect(html).toContain("image.decoding = 'async'")
    expect(html).toContain('IntersectionObserver')
    expect(html).toContain('var observer = null')
    expect(html).toContain('if (observer) observer.disconnect()')
    expect(html).toContain('function releaseLiteThumbs()')
    const paintAt = html.indexOf('function paint(items)')
    const paintBody = html.slice(paintAt, html.indexOf('function showError'))
    expect(paintBody.indexOf('releaseLiteThumbs()')).toBeGreaterThan(-1)
    expect(paintBody.indexOf('releaseLiteThumbs()')).toBeLessThan(paintBody.indexOf("tiles.textContent = ''"))
    const errorBody = html.slice(html.indexOf('function showError'), html.indexOf('function loadGrid'))
    expect(errorBody.indexOf('releaseLiteThumbs()')).toBeLessThan(errorBody.indexOf("tiles.textContent = ''"))
    expect(html).toContain('item.photo_blur !== true')
    expect(html).not.toContain('/v1/me/prefs')
    const tilesAt = html.indexOf('id="discover-tiles"')
    const sectionClose = html.indexOf('</section>', tilesAt)
    expect(html.indexOf('id="discover-empty"')).toBeGreaterThan(sectionClose)
    expect(html.indexOf("error.code === 'PIN_REQUIRED'")).toBeLessThan(html.indexOf("window.location.assign('/auth')"))
    expect(beforeModal(html).match(/<span[^>]*inline-flex/g)).toHaveLength(1)
    expect(beforeModal(html)).toContain('data-card-verified')
    expect(html).toContain('id="filters-modal" hidden')
    expect(html).toContain('id="filters-apply" disabled')
    expect(html).toContain('Indifférent')
    expect(html).toContain('data-open-filters="true"')
    expect(html).toContain('name="distance" disabled=""')
    expect(html.slice(html.indexOf('id="filters-modal"'))).not.toContain('checked=""')
    expect(html).not.toContain('onsubmit=')
    expect(html).toContain('Filtres')
    expect(html).not.toContain('en ligne')
    expect(html).not.toContain('kids')
    expect(html).toContain('data-chip-shell="discover"')
    expect(html).toContain("if (field === 'city') return 'location_on'")
    expect(html).toContain("if (field === 'madhhab') return 'menu_book'")
    expect(html).toContain("if (field === 'practice') return 'schedule'")
    expect(html).toContain("if (!search && field === 'polygamy_intent') return 'handshake'")
    expect(html).toContain('cardBookmarkRest')
    expect(html).toContain("bookmark.removeAttribute('aria-pressed')")
    expect(html).toContain('if (gridPane && gridPane.hidden === false) loadGrid()')
    const enterAt = html.indexOf("if (event.key !== 'Enter') return")
    expect(html.slice(enterAt, enterAt + 420)).toContain('event.preventDefault()')
  })

  it('opens a filtered URL on the grid and keeps sample checks off the form', () => {
    expect(sisterFiltered).toContain('data-viewer-gender="sister"')
    expect(sisterFiltered).toContain('id="discover-card" hidden')
    expect(sisterFiltered).not.toContain('id="discover-grid" hidden')
    expect(sisterFiltered).toContain('polygamy_intent')
    expect(sisterFiltered).not.toContain('view=card')
    expect(sisterFiltered).not.toContain('Al-Hassan')
    expect(sisterFiltered).not.toContain('Secteur 15')
    expect(sisterFiltered).not.toContain('1 profil correspondant')
    expect(sisterFiltered).toContain('Recherche')
    expect(sisterFiltered).toContain('Passer avec égards')
    expect(sisterFiltered).toContain('data-discover-view="card"')
    expect(sisterFiltered).toContain('data-card-pass')
    const modal = sisterFiltered.slice(sisterFiltered.indexOf('id="filters-modal"'))
    expect(modal).not.toContain('checked=""')
    expect(modal).toContain('<option value="" selected="">Indifférent</option>')
    expect(modal).not.toContain('selected="">Maliki')
    expect(sisterFiltered).toContain('data-chip-shell="search"')
    expect(sisterFiltered).toContain('text-[20px]" data-icon="bookmark">bookmark</span>')
    expect(sisterFiltered).not.toContain('text-[20px]">bookmark</span>')
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
        return new Response(JSON.stringify({ account_id: ACCOUNT, gender: 'sister' }), {
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
      const liveHtml = await live.text()
      expect(liveHtml).toContain(`data-discover-account="${ACCOUNT}"`)
      expect(liveHtml).toContain('data-viewer-gender="sister"')
      expect(liveHtml).toContain('id="discover-grid" hidden')
      const filtered = await getDecouvrir(
        new Request('http://localhost/decouvrir?city=ouagadougou&radius_km=25', {
          headers: { cookie: 'ankanu_session=live-session-token' },
        }),
      )
      expect(filtered.status).toBe(200)
      const filteredHtml = await filtered.text()
      expect(filteredHtml).toContain('id="discover-card" hidden')
      expect(filteredHtml).not.toContain('id="discover-grid" hidden')
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

function launch(binary: string, profile: string): Promise<{ proc: ChildProcessByStdio<null, Readable, Readable>; ws: string }> {
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
    let favouritePosts = 0
    let passPosts = 0
    const cardItem = {
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
      sharedTraits: [
        { field: 'city', label: 'Même ville (Ouagadougou)' },
        { field: 'madhhab', label: 'Madhhab : Maliki' },
      ],
    }
    const gridBody = {
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
    }
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (request.method === 'POST' && url.pathname === '/v1/favourites') {
        favouritePosts += 1
        response.statusCode = 201
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ account_id: 'a', target_id: 't', created_at: '2026-10-13T12:00:00.000Z' }))
        return
      }
      if (request.method === 'POST' && url.pathname === '/v1/browse/pass') {
        passPosts += 1
        response.statusCode = 201
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ viewer_id: 'a', target_id: cardItem.id, created_at: '2026-10-13T12:00:00.000Z' }))
        return
      }
      if (url.pathname === '/v1/browse') {
        fetches += 1
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        const grid = url.searchParams.get('view') === 'grid'
        response.end(JSON.stringify(grid ? gridBody : { view: 'card', item: cardItem }))
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
    const storyShots = fileURLToPath(new URL('../../../docs/qa-handoffs/epic-3-3.13-widths/', import.meta.url))
    mkdirSync(shots, { recursive: true })
    mkdirSync(storyShots, { recursive: true })
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
        const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
        const data = String((shot as { data?: string }).data ?? '')
        if (data) {
          writeFileSync(join(storyShots, `${state}-${width}.png`), Buffer.from(data, 'base64'))
          if (width === 360 || width === 1440) writeFileSync(join(shots, `${state}-${width}.png`), Buffer.from(data, 'base64'))
        }
      }
      const loaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await send('Page.navigate', { url: `${origin}/` }, sessionId)
      await loaded
      await send(
        'Runtime.evaluate',
        {
          expression:
            "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText || ''; if (text.includes('Amina_Bobo_nom_tres_long_pour_la_ligne') || Date.now() - start > 8000) resolve(text.includes('Amina_Bobo_nom_tres_long_pour_la_ligne')); else setTimeout(tick, 50) }; tick() })",
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId,
      )
      expect(fetches).toBe(1)
      const traitIcons = await send(
        'Runtime.evaluate',
        {
          expression: `(() => {
            const host = document.querySelector('#discover-focus [data-card-traits]')
            return {
              shell: host ? host.getAttribute('data-chip-shell') : '',
              icons: Array.from(document.querySelectorAll('#discover-focus [data-card-traits] [data-icon]')).map((node) => node.getAttribute('data-icon')),
              text: host ? host.textContent : '',
            }
          })()`,
          returnByValue: true,
        },
        sessionId,
      )
      const traits = (
        traitIcons.result as { value?: { shell: string; icons: string[]; text: string } } | undefined
      )?.value
      expect(traits?.shell).toBe('discover')
      expect(traits?.icons).toEqual(['location_on', 'menu_book'])
      expect(traits?.text).toContain('Même ville (Ouagadougou)')
      expect(traits?.text).toContain('Madhhab : Maliki')
      expect(traits?.text).not.toContain('Projet monogame')
      for (const width of WIDTHS) await measure(width, 'card')
      await send('Runtime.evaluate', { expression: "localStorage.setItem('ankanu_lite','0')" }, sessionId)
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
              chips: document.querySelectorAll('#discover-grid span.inline-flex').length,
              traits: (document.querySelector('#discover-focus [data-card-traits]') || {}).textContent || '',
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
            traits: string
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
      expect(view?.traits).toContain('Même ville (Ouagadougou)')
      expect(view?.traits).toContain('Madhhab : Maliki')
      expect(view?.retry).toBe('none')
      expect(view?.raw).toContain(`"account":"${ACCOUNT}"`)
      expect(view?.raw).not.toContain('/media/blur-signed')
      expect(view?.raw).not.toContain('"url"')
      expect(view?.images).toEqual(['/media/blur-signed'])
      expect(fetches).toBe(2)
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
      expect(fetches).toBe(2)
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
      const saved = await send(
        'Runtime.evaluate',
        {
          expression:
            "new Promise((resolve) => { const start = Date.now(); const tick = () => { const pressed = document.querySelector('[data-bookmark]')?.getAttribute('aria-pressed'); if (pressed === 'true' || Date.now() - start > 2000) resolve(pressed); else setTimeout(tick, 30) }; tick() })",
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId,
      )
      expect((saved.result as { value?: string } | undefined)?.value).toBe('true')
      const deadline = Date.now() + 2000
      while (favouritePosts < 2 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
      expect(favouritePosts).toBe(2)
      await send(
        'Runtime.evaluate',
        { expression: "document.querySelector('[data-card-pass]').click()" },
        sessionId,
      )
      const passDeadline = Date.now() + 2000
      while (passPosts < 1 && Date.now() < passDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
      expect(passPosts).toBe(1)
      const stayedOnPass = await send(
        'Runtime.evaluate',
        { expression: 'location.pathname', returnByValue: true },
        sessionId,
      )
      expect((stayedOnPass.result as { value?: string } | undefined)?.value).toBe('/')
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

  it.skipIf(!binary)('keeps trait icons, one Enter save, and drops a pass from the visible grid', async () => {
    const first = {
      id: '01990000-0000-7000-8000-000000000001',
      pseudonym: 'Aminata',
      age: 29,
      city: 'Ouagadougou',
      verified: true,
      photo_blur: true,
      photo: { id: 'p1', url: '/media/blur-signed' },
      sharedTraits: [
        { field: 'city', label: 'Même ville (Ouagadougou)' },
        { field: 'madhhab', label: 'Madhhab : Maliki' },
        { field: 'practice', label: 'Pratique assidue' },
        { field: 'polygamy_intent', label: 'Intention de polygamie : Oui' },
        { field: 'marital_status', label: 'Célibataire' },
      ],
    }
    const second = {
      id: '01990000-0000-7000-8000-000000000002',
      pseudonym: 'Bocar',
      age: 31,
      city: 'Ouagadougou',
      verified: false,
      photo_blur: true,
      photo: null,
      sharedTraits: [{ field: 'city', label: 'Même ville (Ouagadougou)' }],
    }
    let passed = false
    let favouritePosts = 0
    let releasePass = null as (() => void) | null
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (request.method === 'POST' && url.pathname === '/v1/favourites') {
        favouritePosts += 1
        response.statusCode = 201
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ account_id: 'a', target_id: 't', created_at: '2026-10-14T12:00:00.000Z' }))
        return
      }
      if (request.method === 'POST' && url.pathname === '/v1/browse/pass') {
        releasePass = () => {
          passed = true
          response.statusCode = 201
          response.setHeader('content-type', 'application/json; charset=utf-8')
          response.end(JSON.stringify({ viewer_id: 'a', target_id: first.id, created_at: '2026-10-14T12:00:00.000Z' }))
        }
        return
      }
      if (url.pathname === '/v1/browse') {
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        const grid = url.searchParams.get('view') === 'grid'
        const item = passed ? second : first
        const items = passed ? [second] : [first, second]
        response.end(JSON.stringify(grid ? { view: 'grid', next_cursor: null, items } : { view: 'card', item }))
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      const many = url.searchParams.has('marital_status') && url.searchParams.has('polygamy_intent')
      response.end(many ? sisterFiltered : html)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-discover-pass-${Date.now()}`)
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
    const value = async (sessionId: string, expression: string) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
      return (result.result as { value?: unknown } | undefined)?.value
    }
    try {
      const created = await send('Target.createTarget', { url: 'about:blank' })
      const targetId = String((created as { targetId?: string }).targetId)
      const attached = await send('Target.attachToTarget', { targetId, flatten: true })
      const sessionId = String((attached as { sessionId?: string }).sessionId)
      await send('Page.enable', {}, sessionId)
      await send('Runtime.enable', {}, sessionId)
      const loaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await send(
        'Page.navigate',
        { url: `${origin}/?marital_status=married&polygamy_intent=yes` },
        sessionId,
      )
      await loaded
      await value(sessionId, "document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      const searchTraits = (await value(
        sessionId,
        `new Promise((resolve) => {
          const start = Date.now()
          const tick = () => {
            const host = document.querySelector('#discover-focus [data-card-traits]')
            const text = host ? host.textContent : ''
            if (text.indexOf('Madhhab') >= 0 || Date.now() - start > 4000) {
              const icons = Array.from(host ? host.querySelectorAll('.material-symbols-outlined') : [])
              resolve({
                shell: host ? host.getAttribute('data-chip-shell') : '',
                names: icons.map((node) => node.textContent),
                marked: icons.map((node) => node.getAttribute('data-icon')),
                text,
                bookmark: document.querySelector('#discover-focus [data-bookmark] [data-icon]') ? document.querySelector('#discover-focus [data-bookmark] [data-icon]').getAttribute('data-icon') : '',
              })
              return
            }
            setTimeout(tick, 30)
          }
          tick()
        })`,
      )) as {
        shell: string
        names: string[]
        marked: Array<string | null>
        text: string
        bookmark: string
      }
      expect(searchTraits.shell).toBe('search')
      expect(searchTraits.names).toEqual(['location_on', 'menu_book', 'schedule'])
      expect(searchTraits.marked).toEqual([null, null, null])
      expect(searchTraits.text).toContain('Intention de polygamie : Oui')
      expect(searchTraits.text).toContain('Célibataire')
      expect(searchTraits.text).not.toContain('Projet monogame')
      expect(searchTraits.bookmark).toBe('bookmark')
      const home = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await send('Page.navigate', { url: `${origin}/` }, sessionId)
      await home
      await value(
        sessionId,
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText || ''; if (text.indexOf('Aminata') >= 0 || Date.now() - start > 4000) resolve(true); else setTimeout(tick, 30) }; tick() })",
      )
      const discoverTraits = (await value(
        sessionId,
        `(() => {
          const host = document.querySelector('#discover-focus [data-card-traits]')
          return {
            shell: host ? host.getAttribute('data-chip-shell') : '',
            icons: Array.from(document.querySelectorAll('#discover-focus [data-card-traits] [data-icon]')).map((node) => node.getAttribute('data-icon')),
            plain: Array.from(host ? host.children : []).filter((node) => !node.querySelector('[data-icon]')).map((node) => node.textContent),
          }
        })()`,
      )) as { shell: string; icons: string[]; plain: string[] }
      expect(discoverTraits.shell).toBe('discover')
      expect(discoverTraits.icons).toEqual(['location_on', 'menu_book', 'schedule', 'handshake'])
      expect(discoverTraits.plain).toEqual(['Célibataire'])
      await value(sessionId, "document.querySelector('#discover-focus [data-bookmark]').focus()")
      await send(
        'Input.dispatchKeyEvent',
        { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 },
        sessionId,
      )
      await send(
        'Input.dispatchKeyEvent',
        { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 },
        sessionId,
      )
      const pressed = await value(
        sessionId,
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const value = document.querySelector('#discover-focus [data-bookmark]')?.getAttribute('aria-pressed'); if (value === 'true' || Date.now() - start > 2000) resolve(value); else setTimeout(tick, 30) }; tick() })",
      )
      expect(pressed).toBe('true')
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(favouritePosts).toBe(1)
      await value(sessionId, "document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await value(
        sessionId,
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.getElementById('discover-grid')?.innerText || ''; if (text.indexOf('Aminata') >= 0 && text.indexOf('Bocar') >= 0 || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
      )
      await value(sessionId, "document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      await value(sessionId, "document.querySelector('[data-card-pass]').click()")
      await value(sessionId, "document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      const during = String(
        await value(sessionId, "document.getElementById('discover-grid') ? document.getElementById('discover-grid').innerText : ''"),
      )
      expect(during).toContain('Aminata')
      expect(releasePass).toBeTypeOf('function')
      releasePass?.()
      const after = String(
        await value(
          sessionId,
          "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.getElementById('discover-grid')?.innerText || ''; if ((text.indexOf('Aminata') < 0 && text.indexOf('Bocar') >= 0) || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
        ),
      )
      expect(after).not.toContain('Aminata')
      expect(after).toContain('Bocar')
      await value(sessionId, "document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      const nextCard = (await value(
        sessionId,
        `new Promise((resolve) => {
          const start = Date.now()
          const tick = () => {
            const name = document.querySelector('#discover-focus [data-card-name]')
            const text = name ? name.textContent : ''
            if (text.indexOf('Bocar') >= 0 || Date.now() - start > 4000) {
              const button = document.querySelector('#discover-focus [data-bookmark]')
              const icon = button ? button.querySelector('[data-icon]') : null
              resolve({
                text,
                pressed: button ? button.getAttribute('aria-pressed') : '',
                icon: icon ? icon.getAttribute('data-icon') : '',
                glyph: icon ? icon.textContent : '',
              })
              return
            }
            setTimeout(tick, 30)
          }
          tick()
        })`,
      )) as { text: string; pressed: string | null; icon: string; glyph: string }
      expect(nextCard.text).toContain('Bocar')
      expect(nextCard.pressed).toBeNull()
      expect(nextCard.icon).toBe('bookmark')
      expect(nextCard.glyph).toBe('bookmark')
      expect(favouritePosts).toBe(1)
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 60_000)

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
        if (url.searchParams.get('view') !== 'grid') {
          sendJson(response, 200, { view: 'card', item: null })
          return
        }
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
      await value("localStorage.setItem('ankanu_lite','0')")
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
        error: {
          code: 'FORBIDDEN',
          message: 'Not listable',
          details: {
            reason: 'viewer_not_listable',
            reasons: [
              { code: 'viewer_not_listable' },
              { code: 'id_document_pending', state: 'absent' },
              { code: 'profile_incomplete', missing: ['madhhab'] },
            ],
          },
          retryable: false,
        },
      })
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      const heldBrowse = (await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const title = document.getElementById('discover-hold-title'); const hold = document.getElementById('discover-hold'); if ((title && hold && hold.hidden === false && title.textContent) || Date.now() - start > 4000) resolve({ path: location.pathname, title: title ? title.textContent : '', hidden: hold ? hold.hidden : true, text: document.body.innerText || '', edit: !!document.querySelector('#discover-hold a[href=\"/profile-edit\"]') }); else setTimeout(tick, 30) }; tick() })",
      )) as { path: string; title: string; hidden: boolean; text: string; edit: boolean }
      expect(heldBrowse.path).toBe('/')
      expect(heldBrowse.hidden).toBe(false)
      expect(heldBrowse.title).toBe("Votre profil doit être validé avant de consulter d'autres profils.")
      expect(heldBrowse.text).toContain("La pièce d'identité est manquante.")
      expect(heldBrowse.text).toContain('fiche personnelle')
      expect(heldBrowse.text).not.toContain('Not listable')
      expect(heldBrowse.edit).toBe(true)

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

  it.skipIf(!binary)('applies catalogue filters without sample checks', async () => {
    const sisterHome = discoverHtml(stitch('screen.html'), stitch('grid.html'), ACCOUNT, 'sister')
    const catalogue = {
      filters: [
        {
          key: 'city',
          options: [
            { value: 'ouagadougou', label: 'Ouagadougou' },
            { value: 'bobo', label: 'Bobo-Dioulasso' },
            { value: 'koudougou', label: 'Koudougou' },
            { value: 'autre', label: 'Autre ville / Diaspora' },
          ],
        },
        {
          key: 'radius_km',
          options: [
            { value: '10', label: '10 km' },
            { value: '25', label: '25 km' },
            { value: '50', label: '50 km' },
            { value: null, label: 'Toute la ville' },
          ],
        },
        {
          key: 'marital_status',
          options: [
            { value: 'single', label: 'Célibataire' },
            { value: 'married', label: 'Marié(e)' },
            { value: 'divorced', label: 'Divorcé(e)' },
            { value: 'widowed', label: 'Veuf/Veuve' },
          ],
        },
        {
          key: 'polygamy_intent',
          options: [
            { value: 'yes', label: 'Oui' },
            { value: 'no', label: 'Non' },
          ],
        },
        {
          key: 'practice',
          options: [
            { value: 'assidue', label: 'Pratique assidue' },
            { value: 'heure', label: "Prières à l'heure" },
            { value: 'cheminement', label: 'En cheminement sincère' },
          ],
        },
        {
          key: 'madhhab',
          options: [
            { value: 'maliki', label: 'Maliki (courant majoritaire burkinabè)' },
            { value: 'hanafi', label: 'Hanafi' },
            { value: 'shafii', label: "Shafi'i" },
            { value: 'hanbali', label: 'Hanbali' },
            { value: 'apprentissage', label: 'Sans attachement strict' },
          ],
        },
        {
          key: 'life_plans',
          options: [
            { value: 'ready_now', label: 'Prêt(e) immédiatement' },
            { value: 'within_year', label: "D'ici un an" },
            { value: 'exploring', label: "En démarche d'exploration sereine" },
          ],
        },
      ],
    }
    let filterFetches = 0
    const browseUrls: string[] = []
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/v1/filters') {
        filterFetches += 1
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        response.end(JSON.stringify(catalogue))
        return
      }
      if (url.pathname === '/v1/browse') {
        browseUrls.push(url.search)
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        const grid = url.searchParams.get('view') === 'grid'
        response.end(
          JSON.stringify(
            grid ? { view: 'grid', next_cursor: null, items: [] } : { view: 'card', item: null },
          ),
        )
        return
      }
      const filtered = url.searchParams.get('marital_status')
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(filtered ? sisterFiltered : sisterHome)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-filters-${Date.now()}`)
    const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/epic-3-3.9-widths/', import.meta.url))
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
      const value = async (expression: string) => {
        const result = await send(
          'Runtime.evaluate',
          { expression, awaitPromise: true, returnByValue: true },
          sessionId,
        )
        return (result.result as { value?: unknown } | undefined)?.value
      }
      const measure = async (width: number, state: string) => {
        await send(
          'Emulation.setDeviceMetricsOverride',
          { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 },
          sessionId,
        )
        const sample = await value('({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth })')
        const box = sample as { scrollWidth: number; width: number } | undefined
        if (!box || box.scrollWidth > box.width) {
          failures.push(`${state}@${width} scroll ${box?.scrollWidth ?? '?'} > ${box?.width ?? width}`)
        }
        if (width === 360 || width === 1440) {
          const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
          const data = String((shot as { data?: string }).data ?? '')
          if (data) writeFileSync(join(shots, `${state}-${width}.png`), Buffer.from(data, 'base64'))
        }
      }
      const go = async (path: string) => {
        const loaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
        await send('Page.navigate', { url: `${origin}${path}` }, sessionId)
        await loaded
      }
      await go('/')
      expect(filterFetches).toBe(0)
      expect(browseUrls).toEqual([''])
      await value("document.querySelector('[data-open-filters]').click()")
      const opened = (await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const apply = document.getElementById('filters-apply'); if ((apply && apply.disabled === false) || Date.now() - start > 4000) resolve({ disabled: apply ? apply.disabled : true, checked: document.querySelectorAll('#filters-modal input:checked').length, distance: document.querySelector('#filters-modal input[name=\"distance\"]').disabled, madhhab: document.getElementById('madhhab-select').value, hidden: document.getElementById('filters-modal').hidden }); else setTimeout(tick, 30) }; tick() })",
      )) as { disabled: boolean; checked: number; distance: boolean; madhhab: string; hidden: boolean }
      expect(opened.disabled).toBe(false)
      expect(opened.checked).toBe(0)
      expect(opened.distance).toBe(true)
      expect(opened.madhhab).toBe('')
      expect(opened.hidden).toBe(false)
      expect(filterFetches).toBe(1)
      await value("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))")
      expect(await value("document.getElementById('filters-modal').hidden")).toBe(true)
      await value("document.querySelector('[data-open-filters]').click()")
      await value("document.querySelector('#filters-modal input[name=\"ville\"][value=\"ouagadougou\"]').click()")
      const named = (await value(`(() => {
        const citywide = document.querySelector('#filters-modal input[name="distance"][value=""]')
        const km = document.querySelector('#filters-modal input[name="distance"][value="25"]')
        return { citywide: citywide ? citywide.checked : false, disabled: km ? km.disabled : true }
      })()`)) as { citywide: boolean; disabled: boolean }
      expect(named.citywide).toBe(true)
      expect(named.disabled).toBe(false)
      await value("document.getElementById('filters-reset').click()")
      const cleared = (await value(
        "new Promise((resolve) => setTimeout(() => resolve({ checked: document.querySelectorAll('#filters-modal input:checked').length, disabled: document.querySelector('#filters-modal input[name=\"distance\"]').disabled, path: location.pathname + location.search }), 30))",
      )) as { checked: number; disabled: boolean; path: string }
      expect(cleared.checked).toBe(0)
      expect(cleared.disabled).toBe(true)
      expect(cleared.path).toBe('/')
      for (const width of WIDTHS) await measure(width, 'filters')
      await value("document.querySelector('#filters-modal input[name=\"situation\"][value=\"married\"]').click()")
      const nextLoaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await value("document.getElementById('filters-apply').click()")
      await nextLoaded
      const landed = String(await value('location.pathname + location.search'))
      expect(landed).toBe('/decouvrir?marital_status=married&polygamy_intent=yes')
      const painted = (await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const chip = document.body.innerText || ''; const empty = document.getElementById('discover-empty'); if ((chip.includes('Marié(e)') && empty && empty.hidden === false) || Date.now() - start > 4000) resolve({ text: chip, empty: empty ? empty.hidden : true, grid: document.getElementById('discover-grid').hidden, card: document.getElementById('discover-card').hidden, chips: document.querySelectorAll('[data-filter-chips] span.inline-flex').length, markup: document.documentElement.innerHTML.indexOf('view=card') }); else setTimeout(tick, 30) }; tick() })",
      )) as { text: string; empty: boolean; grid: boolean; card: boolean; chips: number; markup: number }
      expect(painted.empty).toBe(false)
      expect(painted.grid).toBe(false)
      expect(painted.card).toBe(true)
      expect(painted.chips).toBe(2)
      expect(painted.text).toContain('Marié(e)')
      expect(painted.text).not.toContain('Oui')
      expect(painted.text).not.toContain('Al-Hassan')
      expect(painted.markup).toBe(-1)
      expect(browseUrls.some((search) => search.includes('marital_status=married') && search.includes('polygamy_intent=yes'))).toBe(true)
      expect(browseUrls.some((search) => search.includes('view=card'))).toBe(false)
      const cacheKey = String(await value(`sessionStorage.getItem('ankanu_browse_grid_text:${ACCOUNT}:marital_status=married&polygamy_intent=yes') || ''`))
      expect(cacheKey).toContain(`"account":"${ACCOUNT}"`)
      await value("document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      const cardEmpty = (await value(`new Promise((resolve) => {
        const start = Date.now()
        const tick = () => {
          const node = document.getElementById('discover-card-empty')
          const ready = node && node.hidden === false && (node.textContent || '').indexOf('Aucun profil') >= 0
          if (ready || Date.now() - start > 4000) resolve({ hidden: node ? node.hidden : true, text: node ? node.textContent : '', card: document.getElementById('discover-card').hidden })
          else setTimeout(tick, 30)
        }
        tick()
      })`)) as { hidden: boolean; text: string; card: boolean }
      expect(cardEmpty.card).toBe(false)
      expect(cardEmpty.hidden).toBe(false)
      expect(cardEmpty.text).toBe('Aucun profil pour ces filtres.')
      for (const width of WIDTHS) await measure(width, 'filtered')
      expect(filterFetches).toBe(2)
      await go('/decouvrir?city=ouagadougou')
      const oneFilter = (await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText || ''; const card = document.getElementById('discover-card'); const grid = document.getElementById('discover-grid'); const ready = text.indexOf('Ville : Ouagadougou') >= 0; if (ready || Date.now() - start > 4000) resolve({ text: text, card: card ? card.hidden : true, grid: grid ? grid.hidden : true, chips: document.querySelectorAll('[data-filter-chips] span.inline-flex').length }); else setTimeout(tick, 30) }; tick() })",
      )) as { text: string; card: boolean; grid: boolean; chips: number }
      expect(oneFilter.text).toContain('Ville : Ouagadougou')
      expect(oneFilter.text).not.toContain('Marié(e)')
      expect(oneFilter.card).toBe(false)
      expect(oneFilter.grid).toBe(true)
      expect(oneFilter.chips).toBe(2)
      expect(filterFetches).toBe(3)
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    expect(failures).toEqual([])
  }, 120_000)

  it.skipIf(!binary)('holds the photo well until a Lite thumbnail loads', async () => {
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    const prefs: string[] = []
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/v1/me/prefs') prefs.push(url.pathname)
      if (url.pathname === '/v1/pin') {
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({ locked: false }))
        return
      }
      if (url.pathname === '/media/ok') {
        response.setHeader('content-type', 'image/gif')
        response.end(gif)
        return
      }
      if (url.pathname === '/settings') {
        response.setHeader('content-type', 'text/html; charset=utf-8')
        response.end(
          settingsHtml(
            readFileSync(
              fileURLToPath(new URL('../../../design-stitch/ankanu-v2/27-settings/screen.html', import.meta.url)),
              'utf8',
            ),
          ),
        )
        return
      }
      if (url.pathname === '/v1/browse') {
        response.setHeader('content-type', 'application/json')
        if (url.searchParams.get('view') !== 'grid') {
          response.end(JSON.stringify({ view: 'card', item: null }))
          return
        }
        response.end(
          JSON.stringify({
            view: 'grid',
            next_cursor: null,
            items: [
              {
                id: '01990000-0000-7000-8000-000000000011',
                pseudonym: 'Amina',
                age: 29,
                city: 'Bobo',
                marital_status: 'Célibataire',
                polygamy_intent: null,
                madhhab: null,
                practice: null,
                verified: true,
                photo_blur: false,
                photo: { id: 'bad', url: '/media/bad' },
              },
              {
                id: '01990000-0000-7000-8000-000000000012',
                pseudonym: 'Bintou',
                age: 27,
                city: 'Ouaga',
                marital_status: 'Célibataire',
                polygamy_intent: null,
                madhhab: null,
                practice: null,
                verified: false,
                photo_blur: false,
                photo: { id: 'ok', url: '/media/ok' },
              },
              {
                id: '01990000-0000-7000-8000-000000000013',
                pseudonym: 'Moussa',
                age: 36,
                city: 'Kaya',
                marital_status: null,
                polygamy_intent: null,
                madhhab: null,
                practice: null,
                verified: false,
                photo_blur: true,
                photo: { id: 'blur', url: '/media/bad' },
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
    const profile = join(tmpdir(), `ankanu-lite-browse-${Date.now()}`)
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
    try {
      const created = await send('Target.createTarget', { url: 'about:blank' })
      const targetId = String((created as { targetId?: string }).targetId)
      const attached = await send('Target.attachToTarget', { targetId, flatten: true })
      const sessionId = String((attached as { sessionId?: string }).sessionId)
      await send('Page.enable', {}, sessionId)
      await send('Runtime.enable', {}, sessionId)
      const value = async (expression: string) => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
        return (result.result as { value?: unknown } | undefined)?.value
      }
      const loaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await send('Page.navigate', { url: origin }, sessionId)
      await loaded
      await send(
        'Emulation.setDeviceMetricsOverride',
        { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false },
        sessionId,
      )
      await value("localStorage.setItem('ankanu_lite','1')")
      await value(`(() => {
        const Native = window.IntersectionObserver
        let open = 0
        function Counting(callback, options) {
          const observer = new Native(callback, options)
          open += 1
          const disconnect = observer.disconnect.bind(observer)
          let closed = false
          observer.disconnect = function () {
            if (!closed) {
              closed = true
              open -= 1
            }
            return disconnect()
          }
          return observer
        }
        Counting.prototype = Native.prototype
        window.IntersectionObserver = Counting
        window.__liteObserversOpen = function () { return open }
      })()`)
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      const state = (await value(`new Promise((resolve) => {
        const start = Date.now()
        const tick = () => {
          const tiles = Array.from(document.querySelectorAll('#discover-tiles article'))
          const ready = tiles.length === 3 && tiles.some((tile) => {
            const name = tile.querySelector('[data-name]')
            return name && name.textContent.indexOf('Bintou') === 0 && tile.querySelector('img')
          })
          if (ready || Date.now() - start > 4000) {
            resolve(tiles.map((tile) => {
              const photo = tile.querySelector('[data-photo]')
              const image = tile.querySelector('img')
              const reserved = tile.querySelector('[data-reserved]')
              return {
                name: tile.querySelector('[data-name]') ? tile.querySelector('[data-name]').textContent : '',
                city: tile.querySelector('[data-city]') ? tile.querySelector('[data-city]').textContent : '',
                chip: tile.querySelector('[data-chips]') ? tile.querySelector('[data-chips]').textContent : '',
                well: photo ? photo.className : '',
                reserved: reserved && reserved.hidden === false ? reserved.textContent : '',
                src: image ? image.getAttribute('src') : '',
                loading: image ? image.getAttribute('loading') : '',
                decoding: image ? image.getAttribute('decoding') : '',
                images: tile.querySelectorAll('img').length,
              }
            }))
            return
          }
          setTimeout(tick, 30)
        }
        tick()
      })`)) as Array<{
        name: string
        city: string
        chip: string
        well: string
        reserved: string
        src: string
        loading: string
        decoding: string
        images: number
      }>
      const amina = state.find((tile) => tile.name.startsWith('Amina'))
      const bintou = state.find((tile) => tile.name.startsWith('Bintou'))
      const moussa = state.find((tile) => tile.name.startsWith('Moussa'))
      expect(amina?.images).toBe(0)
      expect(amina?.reserved).toBe('')
      expect(amina?.well).toContain('h-52')
      expect(amina?.well).toContain('bg-[#0B1D36]')
      expect(amina?.well).toContain('bg-dot-pattern')
      expect(amina?.city).toBe('Bobo')
      expect(amina?.chip).toContain('Célibataire')
      expect(bintou?.src).toBe('/media/ok')
      expect(bintou?.loading).toBe('lazy')
      expect(bintou?.decoding).toBe('async')
      expect(bintou?.well).toContain('h-52')
      expect(bintou?.chip).toContain('Célibataire')
      expect(moussa?.images).toBe(1)
      expect(moussa?.src).toBe('/media/bad')
      expect(moussa?.loading ?? '').toBe('')
      expect(moussa?.reserved).toContain('Photographie réservée')
      expect(moussa?.city).toBe('Kaya')
      expect(prefs).toEqual([])
      const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/epic-3-3.12-widths/', import.meta.url))
      mkdirSync(shots, { recursive: true })
      const failures: string[] = []
      for (const width of WIDTHS) {
        await send(
          'Emulation.setDeviceMetricsOverride',
          { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 },
          sessionId,
        )
        const fit = (await value(
          '({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth })',
        )) as { scrollWidth: number; width: number }
        if (!fit || fit.scrollWidth > fit.width) failures.push(`grid@${width} ${fit?.scrollWidth ?? '?'} > ${fit?.width ?? width}`)
        if (width === 360 || width === 1440) {
          const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
          const data = String((shot as { data?: string }).data ?? '')
          if (data) writeFileSync(join(shots, `grid-lite-${width}.png`), Buffer.from(data, 'base64'))
        }
      }
      expect(failures).toEqual([])
      expect(await value('window.__liteObserversOpen()')).toBe(0)
      await value("document.getElementById('discover-grid').style.paddingTop = '4000px'")
      await value("document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      await value('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
      const held = (await value(`new Promise((resolve) => {
        const start = Date.now()
        const tick = () => {
          const tiles = document.querySelectorAll('#discover-tiles article').length
          const clear = Array.from(document.querySelectorAll('#discover-tiles article')).filter((tile) => {
            const name = tile.querySelector('[data-name]')
            return name && (name.textContent.indexOf('Amina') === 0 || name.textContent.indexOf('Bintou') === 0)
          })
          const waiting = clear.every((tile) => tile.querySelectorAll('img').length === 0)
          if ((tiles === 3 && waiting) || Date.now() - start > 4000) {
            resolve({ tiles, waiting, open: window.__liteObserversOpen() })
            return
          }
          setTimeout(tick, 30)
        }
        tick()
      })`)) as { tiles: number; waiting: boolean; open: number }
      expect(held.tiles).toBe(3)
      expect(held.waiting).toBe(true)
      expect(held.open).toBe(2)
      await value("document.querySelector('#discover-grid [data-discover-view=\"card\"]').click()")
      await value("document.querySelector('#discover-card [data-discover-view=\"grid\"]').click()")
      const repainted = (await value(`new Promise((resolve) => {
        const start = Date.now()
        const tick = () => {
          const tiles = document.querySelectorAll('#discover-tiles article').length
          if (tiles === 3 || Date.now() - start > 4000) {
            resolve({ tiles, open: window.__liteObserversOpen() })
            return
          }
          setTimeout(tick, 30)
        }
        tick()
      })`)) as { tiles: number; open: number }
      expect(repainted.tiles).toBe(3)
      expect(repainted.open).toBe(2)
      const settingsLoaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
      await send('Page.navigate', { url: `${origin}/settings` }, sessionId)
      await settingsLoaded
      const toggle = (await value(`(() => {
        const button = document.getElementById('lite-mode-toggle')
        const thumb = document.getElementById('lite-mode-thumb')
        return {
          checked: button ? button.getAttribute('aria-checked') : '',
          navy: button ? button.classList.contains('bg-deep-navy') : false,
          hairline: button ? button.classList.contains('bg-hairline') : false,
          thumbOn: thumb ? thumb.classList.contains('translate-x-5') : false,
          stored: localStorage.getItem('ankanu_lite'),
          onclick: button ? button.getAttribute('onclick') : '',
          copy: document.body.innerText.indexOf('Mode Allégé (Basse consommation)') !== -1,
        }
      })()`)) as {
        checked: string
        navy: boolean
        hairline: boolean
        thumbOn: boolean
        stored: string
        onclick: string
        copy: boolean
      }
      expect(toggle.checked).toBe('true')
      expect(toggle.navy).toBe(true)
      expect(toggle.hairline).toBe(false)
      expect(toggle.thumbOn).toBe(true)
      expect(toggle.stored).toBe('1')
      expect(toggle.onclick ?? '').toBe('')
      expect(toggle.copy).toBe(true)
      await value("document.getElementById('lite-mode-toggle').click()")
      const off = (await value(`(() => {
        const button = document.getElementById('lite-mode-toggle')
        const thumb = document.getElementById('lite-mode-thumb')
        return {
          checked: button ? button.getAttribute('aria-checked') : '',
          hairline: button ? button.classList.contains('bg-hairline') : false,
          thumbOff: thumb ? thumb.classList.contains('translate-x-0.5') : false,
          stored: localStorage.getItem('ankanu_lite'),
        }
      })()`)) as { checked: string; hairline: boolean; thumbOff: boolean; stored: string }
      expect(off.checked).toBe('false')
      expect(off.hairline).toBe(true)
      expect(off.thumbOff).toBe(true)
      expect(off.stored).toBe('0')
      const settingsFit: string[] = []
      for (const width of WIDTHS) {
        await send(
          'Emulation.setDeviceMetricsOverride',
          { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 },
          sessionId,
        )
        const fit = (await value(
          '({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth })',
        )) as { scrollWidth: number; width: number }
        if (!fit || fit.scrollWidth > fit.width) {
          settingsFit.push(`settings@${width} ${fit?.scrollWidth ?? '?'} > ${fit?.width ?? width}`)
        }
        if (width === 360 || width === 1440) {
          const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
          const data = String((shot as { data?: string }).data ?? '')
          if (data) writeFileSync(join(shots, `settings-${width}.png`), Buffer.from(data, 'base64'))
        }
      }
      expect(settingsFit).toEqual([])
      expect(prefs).toEqual([])
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 60_000)
})
