import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { settingsHtml } from './v2-pages.js'
import { visitSignalsHtml, officialStamp, type VisitSignalPaint } from './visit-signals-page.js'
import { visitSignalsResponse } from './v2-serve.js'

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

const generated = '2026-05-24T15:42:19.000Z'
const card = {
  account_id: '01990000-0000-7000-8000-0000000000aa',
  pseudonym: 'Aminata_KDG_long_pseudonym_that_wraps',
  gender: 'sister' as const,
  age: 29,
  city: 'ouagadougou',
  member_since: '2026-01-15T12:00:00.000Z',
  id_verified: true,
  profiles_viewed_24h: 64,
  invites_sent_24h: 0,
  over_threshold_at: '2026-05-24T14:00:00.000Z',
}
const other = {
  ...card,
  account_id: '01990000-0000-7000-8000-0000000000bb',
  pseudonym: 'Moussa_BF_long_pseudonym',
  gender: 'brother' as const,
  age: null,
  city: null,
  id_verified: false,
  profiles_viewed_24h: 52,
}

function paint(rows: VisitSignalPaint['rows']): VisitSignalPaint {
  return { threshold: 50, window_hours: 24, generated_at: generated, count: rows.length, rows }
}

describe('screen 52 visit signals', () => {
  const source = stitch('52-ts-visit-signals')

  it('stamps the official clock in Ouagadougou', () => {
    expect(officialStamp(generated)).toBe('24 Mai 2026 • 15:42:19 GMT (Ouagadougou)')
  })

  it('paints the empty shell without sample members or later-story controls', () => {
    const html = visitSignalsHtml(source, paint([]))
    expect(html).toContain('Surveillance T&amp;S • Détection de Consultation Intensive')
    expect(html).toContain('Cadre de vigilance éthique')
    expect(html).toContain("Règle d'or de retenue AnKanu")
    expect(html).toContain('Cas sous seuil de bienveillance')
    expect(html).toContain('0 cas actif')
    expect(html).toContain("Aucun membre n'a consulté plus de 50 fiches en 24h sans envoyer d'invitation.")
    expect(html).toContain('Actualiser')
    expect(html).toContain('min-h-[44px]')
    expect(html).toContain('24 Mai 2026 • 15:42:19 GMT (Ouagadougou)')
    expect(html).toContain('data-visit-signals="static"')
    expect(html).not.toContain("fetch('/v1/staff/signals/visits'")
    expect(html).not.toContain('Souleymane')
    expect(html).not.toContain('Al-Hassan')
    expect(html).not.toContain('Oumar_K')
    expect(html).not.toContain('CNIB')
    expect(html).not.toContain('SHA256')
    expect(html).not.toContain('Moyenne de séjour')
    expect(html).not.toContain("Décision de l'arbitre")
    expect(html).not.toContain('Retour à la console de modération')
    expect(html).not.toContain('REF-TS')
    expect(html).not.toContain('MED-OUAGA')
    expect(html).not.toContain('id="visit-dossier" class=')
  })

  it('selects the first real row and leaves the decision block off the page', () => {
    const html = visitSignalsHtml(source, paint([card, other]))
    expect(html).toContain('2 cas actifs')
    expect(html).toContain('Identité vérifiée')
    expect(html).toContain("En cours d'examen")
    expect(html).toContain('Fiche active')
    expect(html).toContain('Examiner la fiche')
    expect(html).toContain('border-2 border-deep-navy')
    expect(html).toContain('64 fiches')
    expect(html).toContain('(+14/seuil)')
    expect(html).toContain('0 transmise')
    expect(html).toContain('Aminata_KDG_long_pseudonym_that_wraps (F / 29 ans)')
    expect(html).toContain('64 / 0 (24h)')
    expect(html).toContain('Membre depuis Janvier 2026 • Ouagadougou')
    const noAge = visitSignalsHtml(source, paint([other]))
    expect(noAge).toContain('Moussa_BF_long_pseudonym (M)')
    expect(noAge).not.toContain('Moussa_BF_long_pseudonym (M /')
    expect(html).toContain('Seuil de bienveillance configuré')
    expect(html).toContain('Qualification déontologique')
    expect(html).toContain('id="visit-empty" hidden')
    expect(html).not.toContain('CNIB Vérifiée')
    const live = visitSignalsHtml(source, null)
    expect(live).toContain('data-visit-signals="live"')
    expect(live).toContain("fetch('/v1/staff/signals/visits'")
    const script = [...live.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '').find((item) => item.includes('loadVisits'))
    expect(script).toBeTruthy()
    expect(() => new Function(script ?? '')).not.toThrow()
  })

  it('does not add a who-viewed list to settings', () => {
    const html = settingsHtml(stitch('27-settings'))
    expect(html).not.toContain('qui a consulté')
    expect(html).not.toContain('profile_visit')
    expect(html).not.toContain('who_viewed')
  })

  it('keeps the staff shell and sends members and anonymous visitors away', async () => {
    const previous = process.env.ANKANU_API_ORIGIN
    process.env.ANKANU_API_ORIGIN = 'http://127.0.0.1:1'
    try {
      const staff = await visitSignalsResponse(
        new Request('http://127.0.0.1/staff/visit-signals', { headers: { cookie: 'ankanu_session=staff' } }),
      )
      expect(staff.status).toBe(200)
      expect(await staff.text()).toContain('data-visit-signals="live"')
      const member = await visitSignalsResponse(
        new Request('http://127.0.0.1/staff/visit-signals', { headers: { cookie: 'ankanu_session=web' } }),
      )
      expect(member.status).toBe(303)
      expect(member.headers.get('location')).toContain('/decouvrir')
      const mahram = await visitSignalsResponse(
        new Request('http://127.0.0.1/staff/visit-signals', { headers: { cookie: 'ankanu_session=mahram' } }),
      )
      expect(mahram.headers.get('location')).toContain('/decouvrir')
      const anon = await visitSignalsResponse(new Request('http://127.0.0.1/staff/visit-signals'))
      expect(anon.status).toBe(303)
      expect(anon.headers.get('location')).toContain('/auth')
      const opaque = await visitSignalsResponse(
        new Request('http://127.0.0.1/staff/visit-signals', { headers: { cookie: 'ankanu_session=opaque-token' } }),
      )
      expect(opaque.status).toBe(303)
      expect(opaque.headers.get('location')).toContain('/auth')
    } finally {
      if (previous === undefined) {
        delete process.env.ANKANU_API_ORIGIN
      } else {
        process.env.ANKANU_API_ORIGIN = previous
      }
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

describe('visit signal widths', () => {
  const binary = chromeBinary()

  it.skipIf(!binary)('fits the empty list and one dossier at every required width', async () => {
    const empty = visitSignalsHtml(stitch('52-ts-visit-signals'), paint([]))
    const filled = visitSignalsHtml(stitch('52-ts-visit-signals'), paint([card, other]))
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(url.pathname === '/filled' ? filled : empty)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-visits-${Date.now()}`)
    const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/epic-3-3.11-widths/', import.meta.url))
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

  it.skipIf(!binary)('selects a row from the live list and shows a retryable error', async () => {
    const live = visitSignalsHtml(stitch('52-ts-visit-signals'), null)
    let fail = false
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/v1/staff/signals/visits') {
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        if (fail) {
          response.statusCode = 500
          response.end(JSON.stringify({ error: { code: 'UNHANDLED', message: 'Les signaux de visite sont indisponibles.', retryable: true } }))
          return
        }
        response.end(JSON.stringify(paint([card, other])))
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(live)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const profile = join(tmpdir(), `ankanu-visits-live-${Date.now()}`)
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
      const shown = await value(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const text = document.body.innerText; if ((text.includes('Aminata_KDG_long_pseudonym_that_wraps') && text.includes('Moussa_BF_long_pseudonym')) || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
        sessionId,
      )
      expect(String(shown)).toContain('Aminata_KDG_long_pseudonym_that_wraps')
      expect(String(shown)).toContain('64 / 0 (24h)')
      await value("document.querySelector('[data-select=\"01990000-0000-7000-8000-0000000000bb\"]').click()", sessionId)
      const selected = String(
        await value(
          "document.getElementById('visit-dossier').textContent + '|' + document.querySelector('[data-account=\"01990000-0000-7000-8000-0000000000bb\"]').textContent",
          sessionId,
        ),
      )
      expect(selected).toContain('Moussa_BF_long_pseudonym (M)')
      expect(selected).toContain('52 / 0 (24h)')
      expect(selected).toContain("En cours d'examen")
      expect(selected).not.toContain('Souleymane')
      fail = true
      await value("document.getElementById('visit-refresh') ? document.getElementById('visit-refresh').click() : document.querySelector('[data-select]').click()", sessionId)
      const error = String(
        await value(
          "new Promise((resolve) => { const start = Date.now(); const tick = () => { const node = document.getElementById('visit-error-text'); const text = node ? node.textContent : ''; if (text.indexOf('indisponibles') >= 0 || Date.now() - start > 4000) resolve(text); else setTimeout(tick, 30) }; tick() })",
          sessionId,
        ),
      )
      expect(error).toContain('Les signaux de visite sont indisponibles.')
    } finally {
      ws.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 120_000)
})
