import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { favouritesHtml, type FavouriteCard } from './favourites-page.js'
import { settingsHtml } from './v2-pages.js'
import { favouritesResponse } from './v2-serve.js'

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

const card: FavouriteCard = {
  target_id: '01990000-0000-7000-8000-000000000099',
  pseudonym: 'Aminata_KDG_long_pseudonym',
  age: 29,
  city: 'Ouagadougou',
  profession: 'ingenierie',
  madhhab: 'Maliki',
  practice: 'Pratique assidue',
  marital_status: 'Célibataire',
  polygamy_intent: 'Non',
  verified: true,
  photo: { id: 'p1', url: '/v1/media/get?token=blur' },
  bio: 'Foyer posé.',
}

describe('screen 17 private favourites', () => {
  const source = stitch('17-favourites')

  it('paints the empty shell without the sample members', () => {
    const html = favouritesHtml(source, [])
    expect(html).toContain('Profils favoris')
    expect(html).toContain('Mon espace personnel')
    expect(html).toContain('Aucun favori.')
    expect(html).toContain('href="/decouvrir"')
    expect(html).toContain('href="/profil"')
    expect(html).toContain('id="favourites-count" hidden')
    expect(html).toContain('id="favourites-aside" hidden')
    expect(html).not.toContain('Al-Hassan')
    expect(html).not.toContain('Ibrahim_S')
    expect(html).not.toContain('Secteur 15')
    expect(html).not.toContain('googleusercontent')
    expect(html).not.toContain('data-favourites="live"')
    expect(html).not.toContain("fetch('/v1/favourites'")
  })

  it('paints one real card and keeps the live list on a fetch', () => {
    const filled = favouritesHtml(source, [card])
    expect(filled).toContain('1 profil enregistré')
    expect(filled).toContain('Aminata_KDG_long_pseudonym, 29 ans')
    expect(filled).toContain('Ouagadougou • Ingénieur / Technique')
    expect(filled).toContain('Madhhab : Maliki')
    expect(filled).toContain('Pratique assidue')
    expect(filled).toContain('Profil vérifié')
    expect(filled).toContain('« Foyer posé. »')
    expect(filled).toContain('src="/v1/media/get?token=blur"')
    expect(filled).toContain('href="/profil/01990000-0000-7000-8000-000000000099"')
    expect(filled).toContain('Retirer de ma sélection')
    expect(filled).toContain('Consulter la fiche détaillée')
    const list = filled.slice(filled.indexOf('id="favourites-list"'), filled.indexOf('<template'))
    expect(list).toContain('src="/v1/media/get?token=blur"')
    expect(list).not.toContain('Photographie réservée')
    expect(filled).not.toContain('Secteur 15')
    expect(filled).toContain('id="favourites-empty" hidden')
    expect(filled).not.toContain('id="favourites-aside" hidden')

    const live = favouritesHtml(source)
    expect(live).toContain('data-favourites="live"')
    expect(live).toContain("fetch('/v1/favourites'")
    expect(live).toContain("method: 'DELETE'")
    expect(live).toContain('id="favourites-empty" hidden')
    expect(live).toContain('Aucun favori.')
    expect(live).not.toContain('Al-Hassan')
    expect(live).not.toContain('Ibrahim_S')
  })

  it('does not add a who-favourited list to settings', () => {
    const html = settingsHtml(stitch('27-settings'))
    expect(html.toLowerCase()).not.toContain('favori')
    expect(html).not.toContain('who_favourited')
    expect(html).not.toContain('qui vous a ajouté')
  })

  it('keeps a staff cookie on the member envelope and sends an anonymous visitor to auth', async () => {
    const staff = await favouritesResponse(
      new Request('http://127.0.0.1/favoris', { headers: { cookie: 'ankanu_session=staff' } }),
    )
    expect(staff.status).toBe(403)
    expect(await staff.json()).toMatchObject({
      error: { code: 'FORBIDDEN', message: "Cette session d'équipe ne peut pas ouvrir un espace membre." },
    })
    const anon = await favouritesResponse(new Request('http://127.0.0.1/favoris'))
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toContain('/auth')
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

function launch(binary: string, profile: string): Promise<{ proc: ChildProcess; ws: string }> {
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

describe('favourites widths', () => {
  const binary = chromeBinary()

  it.skipIf(!binary)('fits the empty list and one card at every required width', async () => {
    const empty = favouritesHtml(stitch('17-favourites'), [])
    const filled = favouritesHtml(stitch('17-favourites'), [card])
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(url.pathname === '/filled' ? filled : empty)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-favourites-${Date.now()}`)
    const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/epic-3-3.10-widths/', import.meta.url))
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
            expression: '({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth })',
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
      const go = async (path: string) => {
        const loaded = new Promise<void>((resolve) => waits.push({ method: 'Page.loadEventFired', resolve }))
        await send('Page.navigate', { url: `${origin}${path}` }, sessionId)
        await loaded
      }
      await go('/')
      for (const width of WIDTHS) await measure(width, 'empty')
      await go('/filled')
      for (const width of WIDTHS) await measure(width, 'filled')
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    expect(failures).toEqual([])
  }, 120_000)

  it.skipIf(!binary)('hides the empty copy until the live list returns and keeps the other card after a failed remove', async () => {
    const live = favouritesHtml(stitch('17-favourites'))
    const items = [
      card,
      {
        target_id: '01990000-0000-7000-8000-000000000098',
        pseudonym: 'Moussa_BF',
        age: 36,
        city: 'Bobo-Dioulasso',
        profession: null,
        madhhab: null,
        practice: null,
        marital_status: null,
        polygamy_intent: null,
        verified: false,
        photo: null,
        bio: null,
      },
    ]
    let released = false
    const held: Array<{ setHeader: (name: string, value: string) => void; end: (body: string) => void }> = []
    const sendList = (response: { setHeader: (name: string, value: string) => void; end: (body: string) => void }) => {
      response.setHeader('content-type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ count: items.length, items }))
    }
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (request.method === 'GET' && url.pathname === '/v1/favourites') {
        if (!released) {
          held.push(response)
          return
        }
        sendList(response)
        return
      }
      if (request.method === 'DELETE' && url.pathname.startsWith('/v1/favourites/')) {
        response.statusCode = 404
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: "Ce favori n'existe pas." } }))
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(live)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-favourites-live-${Date.now()}`)
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
    const value = async (expression: string, sessionId: string) => {
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
      await send('Page.navigate', { url: `${origin}/` }, sessionId)
      await loaded
      const before = (await value(
        "({ display: getComputedStyle(document.getElementById('favourites-empty')).display, cards: document.querySelectorAll('[data-favourite]').length })",
        sessionId,
      )) as { display: string; cards: number }
      expect(before.display).toBe('none')
      expect(before.cards).toBe(0)
      released = true
      for (const response of held) sendList(response)
      const shown = await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.getElementById('favourites-list') ? document.getElementById('favourites-list').innerText : ''; if ((text.includes('Aminata_KDG_long_pseudonym') && text.includes('Moussa_BF')) || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
        sessionId,
      )
      expect(String(shown)).toContain('Aminata_KDG_long_pseudonym')
      expect(String(shown)).toContain('Moussa_BF')
      expect(String(shown)).not.toContain('Aucun favori.')
      await value("document.querySelector('[data-remove]').click()", sessionId)
      const after = (await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const error = document.getElementById('favourites-error'); const ready = error && error.textContent.indexOf('existe pas') >= 0; if (ready || Date.now() - start > 4000) resolve({ message: error ? error.textContent : '', cards: document.querySelectorAll('[data-favourite]').length, names: document.getElementById('favourites-list').innerText, display: getComputedStyle(document.getElementById('favourites-empty')).display }); else setTimeout(tick, 30) }; tick() })",
        sessionId,
      )) as { message: string; cards: number; names: string; display: string }
      expect(after.message).toContain("Ce favori n'existe pas.")
      expect(after.cards).toBe(2)
      expect(after.names).toContain('Aminata_KDG_long_pseudonym')
      expect(after.names).toContain('Moussa_BF')
      expect(after.display).toBe('none')
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 120_000)
})
