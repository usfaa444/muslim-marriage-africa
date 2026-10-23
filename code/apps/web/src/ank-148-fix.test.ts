import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { discoverHtml } from './discover-page.js'
import { notListablePage } from './not-listable.js'
import { onboardingHtml, photoHtml, profileHtml } from './v2-pages.js'

const WIDTHS = [360, 390, 768, 1024, 1280, 1440] as const

function chromeBinary(): string | null {
  const found = [
    process.env.ANKANU_CHROME,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((path): path is string => Boolean(path))
  const cache = join(homedir(), '.cache/ms-playwright')
  if (existsSync(cache)) {
    for (const dir of ['chromium-1243', 'chromium-1194', 'chromium-1187']) {
      found.push(join(cache, dir, 'chrome-linux64', 'chrome'))
      found.push(join(cache, dir, 'chrome-linux', 'chrome'))
    }
  }
  return found.find((path) => existsSync(path)) ?? null
}

function stitch(folder: string, name = 'screen.html'): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/${name}`, import.meta.url)),
    'utf8',
  )
}

type CdpResult = Record<string, unknown>

function connect(wsUrl: string): Promise<{
  send: (method: string, params?: object, sessionId?: string) => Promise<CdpResult>
  wait: (method: string, sessionId?: string) => Promise<void>
  close: () => void
}> {
  const ws = new WebSocket(wsUrl)
  let seq = 0
  const pending = new Map<number, { method: string; resolve: (value: CdpResult) => void; reject: (error: Error) => void }>()
  const waits: Array<{ method: string; sessionId?: string | undefined; resolve: () => void }> = []
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
      if (message.error) waiter?.reject(new Error(`${waiter?.method ?? 'cdp'}: ${message.error.message ?? 'cdp error'}`))
      else waiter?.resolve(message.result ?? {})
      return
    }
    if (!message.method) return
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
            pending.set(id, { method, resolve: resolveSend, reject: rejectSend })
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

const FIT = `(() => {
  const width = window.innerWidth
  const scrollWidth = document.documentElement.scrollWidth
  const bad = []
  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect()
    const overflowX = getComputedStyle(el).overflowX
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
      bad.push((el.id || el.tagName) + ' overflow-x')
    }
    if (rect.width < 1 || rect.height < 1) continue
    if (rect.right > width + 1 || rect.left < -1) bad.push((el.id || el.tagName) + ' ' + Math.round(rect.left) + '..' + Math.round(rect.right))
    if (bad.length >= 8) break
  }
  return { width, scrollWidth, bad, path: location.pathname }
})()`

const HOLD = {
  reason: 'viewer_not_listable',
  reasons: [
    { code: 'viewer_not_listable' },
    { code: 'photo_review', sla_hours: 24 },
    { code: 'profile_review', sla_hours: 24 },
    { code: 'profile_incomplete', missing: ['madhhab'] },
    { code: 'id_document_pending', state: 'absent' },
    { code: 'liveness_pending', state: 'open' },
  ],
}

describe('founder staging fixes', () => {
  const binary = chromeBinary()
  it.skipIf(!binary)('wires onboarding, the browse hold, and the first photo, and fits six widths', async () => {
    const onboarding = onboardingHtml(stitch('08-onboarding'))
    const photo = photoHtml(stitch('09-photo-rules'))
    const profile = profileHtml(stitch('11-profile-edit'))
    const discover = discoverHtml(stitch('57-discover'), stitch('57-discover', 'grid.html'))
    const hold = notListablePage(
      stitch('12-profile-not-yet-public'),
      HOLD,
    )
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const photoPath = join(mkdtempSync(join(tmpdir(), 'ankanu-face-')), 'face.png')
    writeFileSync(photoPath, png)
    let gateStep = 'account'
    let mediaMode: 'fail' | 'ok' = 'fail'
    let uploaded = false
    const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/epic-3-ank-148-widths/', import.meta.url))
    mkdirSync(shots, { recursive: true })
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      const sendJson = (status: number, body: unknown) => {
        response.statusCode = status
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify(body))
      }
      if (url.pathname === '/v1/pin') {
        sendJson(200, { enabled: false, locked: false })
        return
      }
      if (url.pathname === '/v1/accounts/gate') {
        sendJson(200, { step: gateStep })
        return
      }
      if (url.pathname === '/v1/browse') {
        sendJson(403, {
          error: {
            code: 'FORBIDDEN',
            message: 'Not listable',
            details: HOLD,
            retryable: false,
          },
        })
        return
      }
      if (url.pathname === '/v1/me/profile') {
        sendJson(200, {
          dob: '1990-01-15',
          city: null,
          country: null,
          origin: null,
          education: null,
          profession: null,
          marital_status: null,
          polygamy_intent: null,
          madhhab: null,
          practice: null,
          life_plans: null,
          bio_pending: null,
          bio_live: null,
          photo_blur: true,
          completeness: { percent: 0, missing: ['madhhab'], ready: false },
          photo: uploaded ? { id: 'pend', moderation_state: 'pending', caption: 'Photo en revue — pas encore publique.' } : null,
          photos: uploaded ? [{ id: 'pend', moderation_state: 'pending' }] : [],
        })
        return
      }
      if (url.pathname === '/v1/media' && request.method === 'POST') {
        if (mediaMode === 'fail') {
          sendJson(400, { error: { code: 'UNHANDLED', message: 'image : une image JPEG ou PNG est requise.' } })
          return
        }
        uploaded = true
        sendJson(200, { moderation_state: 'pending', caption: 'Photo en revue — pas encore publique.' })
        return
      }
      const pages: Record<string, string> = {
        '/onboarding': onboarding,
        '/photo-rules': photo,
        '/id-liveness': '<!DOCTYPE html><title>id</title><p>id-liveness</p>',
        '/decouvrir': discover,
        '/profile-edit': profile,
        '/profile-review': '<!DOCTYPE html><title>review</title><p>profile-review</p>',
        '/hold': hold,
      }
      const html = pages[url.pathname]
      if (!html) {
        response.statusCode = 404
        response.end('missing')
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(html)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const chrome = await launch(binary as string, mkdtempSync(join(tmpdir(), 'ankanu-148-')))
    const cdp = await connect(chrome.ws)
    const failures: string[] = []
    try {
      const created = await cdp.send('Target.createTarget', { url: 'about:blank' })
      const attached = await cdp.send('Target.attachToTarget', { targetId: String(created.targetId), flatten: true })
      const sessionId = String(attached.sessionId)
      await cdp.send('Page.enable', {}, sessionId)
      await cdp.send('Runtime.enable', {}, sessionId)
      await cdp.send('DOM.enable', {}, sessionId)
      const read = async (expression: string) => {
        let last: unknown
        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            const measured = await cdp.send(
              'Runtime.evaluate',
              { expression, returnByValue: true, awaitPromise: true },
              sessionId,
            )
            return (measured.result as { value?: unknown } | undefined)?.value
          } catch (error) {
            last = error
            await new Promise((resolve) => setTimeout(resolve, 80))
          }
        }
        throw last
      }
      const open = async (path: string, width: number) => {
        await cdp.send(
          'Emulation.setDeviceMetricsOverride',
          { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 },
          sessionId,
        )
        const loaded = cdp.wait('Page.loadEventFired', sessionId)
        const timed = new Promise<void>((resolve) => setTimeout(resolve, 8000))
        await cdp.send('Page.navigate', { url: `${origin}${path}` }, sessionId)
        await Promise.race([loaded, timed])
        const start = Date.now()
        while (Date.now() - start < 8000) {
          const current = await read('location.pathname')
          const color = await read("document.body ? getComputedStyle(document.body).backgroundColor : ''")
          if (current === path && color && color !== 'rgba(0, 0, 0, 0)') return
          if (current === path && Date.now() - start > 4000) return
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
        throw new Error(`did not stay on ${path}`)
      }
      const fit = async (name: string, path: string, width: number) => {
        await open(path, width)
        if (name === 'discover-hold') {
          await read(`new Promise((resolve) => {
            const start = Date.now()
            const tick = () => {
              const sla = document.getElementById('discover-hold-sla')
              const hold = document.getElementById('discover-hold')
              const ready = hold && hold.hidden === false && sla && (sla.textContent || '').indexOf('24 heures') !== -1
              if (ready || Date.now() - start > 4000) resolve(true)
              else setTimeout(tick, 30)
            }
            tick()
          })`)
        }
        const value = (await read(FIT)) as { width: number; scrollWidth: number; bad: string[]; path: string }
        if (!value || value.scrollWidth > value.width || value.bad.length > 0) {
          failures.push(`${name}@${width} ${JSON.stringify(value)}`)
        }
        if (name === 'discover-hold' && (width === 360 || width === 1440)) {
          const chrome = (await read(`(() => {
            const sla = document.getElementById('discover-hold-sla')
            const tag = document.getElementById('discover-hold-tag')
            const desk = document.getElementById('discover-desktop-nav')
            const mobile = document.getElementById('discover-mobile-nav')
            const link = document.querySelector('#discover-hold a[href="/profile-edit"]')
            const card = document.querySelector('#discover-hold .max-w-xl')
            const shown = (node) => node ? getComputedStyle(node).display : ''
            const lr = link ? link.getBoundingClientRect() : null
            const cr = card ? card.getBoundingClientRect() : null
            return {
              sla: shown(sla),
              tag: shown(tag),
              slaHiddenClass: sla ? sla.classList.contains('hidden') : true,
              tagHiddenClass: tag ? tag.classList.contains('hidden') : true,
              desk: shown(desk),
              mobile: shown(mobile),
              text: document.body.innerText || '',
              linkText: link ? link.textContent : '',
              linkInside: !!(lr && cr && lr.width > 20 && lr.left >= cr.left - 1 && lr.right <= cr.right + 1 && link.scrollWidth <= link.clientWidth + 1)
            }
          })()`)) as {
            sla: string
            tag: string
            slaHiddenClass: boolean
            tagHiddenClass: boolean
            desk: string
            mobile: string
            text: string
            linkText: string
            linkInside: boolean
          }
          if (chrome.sla === 'none' || chrome.tag === 'none' || chrome.slaHiddenClass || chrome.tagHiddenClass) {
            failures.push(`${name}@${width} hold chrome ${JSON.stringify(chrome)}`)
          }
          if (!chrome.text.includes('Délai habituel de modération : 24 heures.') || !chrome.text.includes('En revue')) {
            failures.push(`${name}@${width} hold copy ${chrome.text.slice(0, 240)}`)
          }
          if (chrome.linkText !== 'fiche personnelle' || !chrome.linkInside) {
            failures.push(`${name}@${width} link ${chrome.linkText} inside=${chrome.linkInside}`)
          }
          if (width >= 768 && chrome.desk !== 'flex') failures.push(`${name}@${width} desktop nav ${chrome.desk}`)
          if (width >= 768 && chrome.mobile !== 'none') failures.push(`${name}@${width} mobile nav ${chrome.mobile}`)
          if (width < 768 && chrome.desk !== 'none') failures.push(`${name}@${width} desktop nav ${chrome.desk}`)
          if (width < 768 && chrome.mobile === 'none') failures.push(`${name}@${width} mobile nav ${chrome.mobile}`)
        }
        if (width === 360 || width === 1440) {
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
          const data = String(shot.data ?? '')
          writeFileSync(join(shots, `${name}-${width}.png`), Buffer.from(data, 'base64'))
        }
      }
      const pages = [
        ['onboarding', '/onboarding'],
        ['profile', '/profile-edit'],
        ['discover-hold', '/decouvrir'],
        ['not-listable', '/hold'],
      ] as const
      for (const [name, path] of pages) {
        for (const width of WIDTHS) {
          await fit(name, path, width)
        }
      }
      await open('/decouvrir', 1280)
      const ready = (await read(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const hold = document.getElementById('discover-hold'); const title = document.getElementById('discover-hold-title'); if ((hold && hold.hidden === false && title && title.textContent) || Date.now() - start > 4000) resolve({ path: location.pathname, title: title ? title.textContent : '', text: document.body.innerText || '' }); else setTimeout(tick, 30) }; tick() })",
      )) as { path: string; title: string; text: string }
      expect(ready.path).toBe('/decouvrir')
      expect(ready.title).toContain('Photo en revue')
      expect(ready.text).toContain('Délai habituel de modération : 24 heures.')
      expect(ready.text).toContain('En revue')
      expect(ready.text).toContain("La pièce d'identité est manquante.")
      expect(ready.text).toContain('fiche personnelle')
      expect(ready.text).not.toContain('Not listable')
      gateStep = 'account'
      await open('/onboarding', 1280)
      await read("document.getElementById('onboarding-next').click()")
      const photoPathname = (await read(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { if (location.pathname === '/photo-rules' || Date.now() - start > 4000) resolve(location.pathname); else setTimeout(tick, 30) }; tick() })",
      )) as string
      expect(photoPathname).toBe('/photo-rules')
      expect(String(await read('document.body.innerText'))).toContain('règles')
      gateStep = 'identity'
      await open('/onboarding', 1280)
      await read("document.getElementById('onboarding-next').click()")
      const idPath = (await read(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { if (location.pathname === '/id-liveness' || Date.now() - start > 4000) resolve(location.pathname); else setTimeout(tick, 30) }; tick() })",
      )) as string
      expect(idPath).toBe('/id-liveness')
      mediaMode = 'fail'
      uploaded = false
      await open('/profile-edit', 1280)
      await read(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { if (document.getElementById('profile-photo-add') || Date.now() - start > 4000) resolve(true); else setTimeout(tick, 30) }; tick() })",
      )
      const doc = await cdp.send('DOM.getDocument', {}, sessionId)
      const rootId = Number((doc.root as { nodeId?: number } | undefined)?.nodeId)
      const queried = await cdp.send('DOM.querySelector', { nodeId: rootId, selector: '#profile-photo-file' }, sessionId)
      await cdp.send('DOM.setFileInputFiles', { nodeId: Number(queried.nodeId), files: [photoPath] }, sessionId)
      const failed = (await read(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { const node = document.getElementById('profile-photo-status'); if ((node && node.textContent) || Date.now() - start > 4000) resolve({ text: node ? node.textContent : '', hidden: node ? node.classList.contains('hidden') : true, path: location.pathname }); else setTimeout(tick, 30) }; tick() })",
      )) as { text: string; hidden: boolean; path: string }
      expect(failed.path).toBe('/profile-edit')
      expect(failed.hidden).toBe(false)
      expect(failed.text).toBe('image : une image JPEG ou PNG est requise.')
      mediaMode = 'ok'
      const queriedAgain = await cdp.send('DOM.querySelector', { nodeId: rootId, selector: '#profile-photo-file' }, sessionId)
      await cdp.send('DOM.setFileInputFiles', { nodeId: Number(queriedAgain.nodeId), files: [photoPath] }, sessionId)
      const reviewed = (await read(
        "new Promise((resolve) => { const start = Date.now(); const tick = () => { if (location.pathname === '/profile-review' || Date.now() - start > 4000) resolve(location.pathname); else setTimeout(tick, 30) }; tick() })",
      )) as string
      expect(reviewed).toBe('/profile-review')
      expect(failures).toEqual([])
    } finally {
      cdp.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 180_000)
})
