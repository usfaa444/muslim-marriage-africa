import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { photoHtml } from './v2-pages.js'

function stitch(): string {
  return readFileSync(
    fileURLToPath(new URL('../../../design-stitch/ankanu-v2/09-photo-rules/screen.html', import.meta.url)),
    'utf8',
  )
}

type Listener = (event?: { preventDefault?: () => void }) => void

class El {
  id = ''
  className = ''
  textContent = ''
  tagName: string
  parentElement: El | null = null
  children: El[] = []
  attrs: Record<string, string> = {}
  style: Record<string, string> = {}
  listeners: Record<string, Listener[]> = {}

  constructor(tag: string) {
    this.tagName = tag.toUpperCase()
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value
  }

  querySelector(selector: string): El | null {
    return this.querySelectorAll(selector)[0] ?? null
  }

  addEventListener(type: string, listener: Listener): void {
    const list = this.listeners[type] ?? []
    list.push(listener)
    this.listeners[type] = list
  }

  appendChild(child: El): El {
    child.parentElement = this
    this.children.push(child)
    return child
  }

  closest(selector: string): El | null {
    let node: El | null = this
    while (node) {
      if (selector === 'section' && node.tagName === 'SECTION') {
        return node
      }
      if (selector === 'aside' && node.tagName === 'ASIDE') {
        return node
      }
      node = node.parentElement
    }
    return null
  }

  querySelectorAll(selector: string): El[] {
    const found: El[] = []
    const walk = (node: El) => {
      const classes = node.className.split(/\s+/)
      if (selector === 'button' && node.tagName === 'BUTTON') {
        found.push(node)
      }
      if (selector.startsWith('.') && classes.includes(selector.slice(1))) {
        found.push(node)
      }
      if (selector === '[data-hit="44"]' && node.attrs['data-hit'] === '44') {
        found.push(node)
      }
      for (const child of node.children) {
        walk(child)
      }
    }
    walk(this)
    return found
  }

  click(): void {
    for (const listener of this.listeners.click ?? []) {
      listener({ preventDefault() {} })
    }
  }
}

function pageDom(): { document: El & { head: El; body: El }; buttons: El[] } {
  const document = new El('document') as El & { head: El; body: El; createElement: (tag: string) => El; getElementById: (id: string) => El | null; getElementsByTagName: (tag: string) => El[] }
  const head = new El('head')
  const body = new El('body')
  document.appendChild(head)
  document.appendChild(body)
  document.head = head
  document.body = body
  const section = new El('section')
  section.id = 'audio-guide-heading'
  const pictograms = new El('div')
  pictograms.textContent = 'Pudeur & Modestie Clarté récente Authenticité réelle Personne seule'
  body.appendChild(pictograms)
  body.appendChild(section)
  const buttons: El[] = []
  for (const [label, iconText] of [
    ['Écouter en Mooré', 'play_arrow'],
    ['Écouter en Dioula', 'play_arrow'],
  ] as const) {
    const card = new El('div')
    card.className = 'w-9 h-9'
    const volume = new El('span')
    volume.className = 'material-symbols-outlined'
    volume.textContent = 'volume_up'
    card.appendChild(volume)
    const button = new El('button')
    button.className = 'w-8 h-8 rounded-full bg-deep-navy text-cream'
    button.attrs['aria-label'] = label
    button.textContent = iconText
    const icon = new El('span')
    icon.className = 'material-symbols-outlined'
    icon.textContent = iconText
    button.appendChild(icon)
    card.appendChild(button)
    section.appendChild(card)
    buttons.push(button)
  }
  const cta = new El('button')
  cta.className = 'w-full h-12'
  cta.textContent = "J'ai pris connaissance des règles arrow_forward"
  body.appendChild(cta)
  buttons.push(cta)
  document.createElement = (tag: string) => new El(tag)
  document.getElementById = (id: string) => {
    const walk = (node: El): El | null => {
      if (node.id === id) {
        return node
      }
      for (const child of node.children) {
        const found = walk(child)
        if (found) {
          return found
        }
      }
      return null
    }
    return walk(document)
  }
  document.getElementsByTagName = (tag: string) => {
    const found: El[] = []
    const walk = (node: El) => {
      if (node.tagName === tag.toUpperCase()) {
        found.push(node)
      }
      for (const child of node.children) {
        walk(child)
      }
    }
    walk(document)
    return found
  }
  return { document, buttons }
}

describe('photo rules', () => {
  const page = photoHtml(stitch())

  it('keeps the stitch pictograms, intro, and captions', () => {
    expect(page).toContain('Afin de préserver la solennité')
    expect(page).toContain('Pudeur &amp; Modestie')
    expect(page).toContain('Clarté récente')
    expect(page).toContain('Authenticité réelle')
    expect(page).toContain('Personne seule')
    expect(page).toContain('Modeste :')
    expect(page).toContain('Récente :')
    expect(page).toContain('Réelle :')
    expect(page).toContain('Sans tiers :')
    expect(page).toContain('Écouter en Mooré')
    expect(page).toContain('Écouter en Dioula')
    expect(page).toContain('w-8 h-8')
    expect(page).toContain("J'ai pris connaissance des règles")
    expect(page).not.toContain("textContent = 'pause'")
    expect(page).not.toContain('audio_asset')
    expect(page).not.toContain('/v1/academie')
    expect(page).toContain('"mos":null')
    expect(page).toContain('"dyu":null')
    expect(page).toContain("location.assign('/profile-edit')")
    expect(page).toContain("hit.style.width = '44px'")
    expect(page).toContain("hit.style.height = '44px'")
  })

  it('leaves the pictograms when play has no file, and the acknowledgement opens profile edit', () => {
    const { document, buttons } = pageDom()
    const assigned: string[] = []
    let audioBuilds = 0
    const context = createContext({
      document,
      window: {
        location: {
          pathname: '/photo-rules',
          search: '',
          assign(path: string) {
            assigned.push(path)
          },
        },
      },
      Audio: function Audio() {
        audioBuilds += 1
      },
    })
    const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
    expect(scripts.length).toBeGreaterThan(0)
    for (const source of scripts) {
      runInContext(source, context)
    }
    const moore = buttons[0]
    const dioula = buttons[1]
    const cta = buttons[2]
    expect(moore).toBeDefined()
    expect(dioula).toBeDefined()
    expect(cta).toBeDefined()
    moore?.click()
    dioula?.click()
    expect(audioBuilds).toBe(0)
    expect(moore?.textContent).toBe('play_arrow')
    expect(dioula?.textContent).toBe('play_arrow')
    expect(moore?.style.minWidth).toBeUndefined()
    expect(dioula?.style.minHeight).toBeUndefined()
    expect(moore?.querySelector('[data-hit="44"]')?.style.width).toBe('44px')
    expect(dioula?.querySelector('[data-hit="44"]')?.style.height).toBe('44px')
    expect(moore?.parentElement?.tagName).toBe('DIV')
    expect(moore?.parentElement?.style.minWidth).toBeUndefined()
    expect(dioula?.parentElement?.style.minHeight).toBeUndefined()
    expect(document.body.children[0]?.textContent).toContain('Pudeur')
    cta?.click()
    expect(assigned).toEqual(['/profile-edit'])
    expect(audioBuilds).toBe(0)
  })

  it('keeps a 32px play circle in Chrome and opens profile edit from the acknowledgement button', async () => {
    const binary = [
      join(process.env.HOME || '', '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
    ].find((path) => existsSync(path))
    expect(binary).toBeTruthy()
    const html = photoHtml(stitch())
    const server = createServer((request, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      const path = request.url?.split('?')[0]
      response.end(path === '/profile-edit' ? '<!DOCTYPE html><title>profile-edit</title><p>profile-edit</p>' : html)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('test server has no port')
    }
    const origin = `http://127.0.0.1:${address.port}`
    const profile = mkdtempSync(join(tmpdir(), 'ankanu-photo-rules-'))
    const chrome = spawn(binary as string, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
    const ws = await new Promise<string>((resolve, reject) => {
      let buf = ''
      const take = (chunk: Buffer) => {
        buf += chunk.toString()
        const match = buf.match(/DevTools listening on (ws:\/\/\S+)/)
        if (match?.[1]) {
          resolve(match[1])
        }
      }
      chrome.stdout.on('data', take)
      chrome.stderr.on('data', take)
      chrome.on('exit', (code) => reject(new Error(`chrome exited ${code ?? 0}`)))
    })
    try {
      const result = await clickInChrome(ws, origin)
      expect(result.playWidth).toBe(32)
      expect(result.playHeight).toBe(32)
      expect(result.iconAfterPlay).toBe('play_arrow')
      expect(result.audioBuilds).toBe(0)
      expect(result.afterAck).toBe('/profile-edit')
      expect(result.hitOutside).toBe(true)
    } finally {
      chrome.kill()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

function clickInChrome(wsUrl: string, origin: string): Promise<{
  playWidth: number
  playHeight: number
  iconAfterPlay: string
  audioBuilds: number
  afterAck: string
  hitOutside: boolean
}> {
  const ws = new WebSocket(wsUrl)
  let seq = 0
  const pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }>()
  const waits: Array<{ method: string; sessionId?: string; resolve: () => void }> = []
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number
      method?: string
      sessionId?: string
      result?: Record<string, unknown>
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
  const send = (method: string, params?: object, sessionId?: string) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const id = ++seq
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  const wait = (method: string, sessionId?: string) =>
    new Promise<void>((resolve) => {
      waits.push({ method, sessionId, resolve })
    })
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      void (async () => {
        const created = await send('Target.createTarget', { url: 'about:blank' })
        const attached = await send('Target.attachToTarget', { targetId: created.targetId, flatten: true })
        const sessionId = String(attached.sessionId)
        await send('Page.enable', {}, sessionId)
        await send('Runtime.enable', {}, sessionId)
        await send(
          'Page.addScriptToEvaluateOnNewDocument',
          { source: 'window.__audioBuilds = 0; const Native = window.Audio; window.Audio = function () { window.__audioBuilds += 1; return new Native() }' },
          sessionId,
        )
        const loaded = wait('Page.loadEventFired', sessionId)
        await send('Page.navigate', { url: `${origin}/photo-rules` }, sessionId)
        await loaded
        await send(
          'Runtime.evaluate',
          {
            expression:
              "new Promise((resolve) => { const tick = () => { const button = document.querySelector('button[aria-label=\"Écouter en Mooré\"]'); if (button && Math.round(button.getBoundingClientRect().width) === 32) resolve(true); else setTimeout(tick, 50) }; tick() })",
            awaitPromise: true,
          },
          sessionId,
        )
        const played = await send(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const button = document.querySelector('button[aria-label="Écouter en Mooré"]')
              button.scrollIntoView({ block: 'center', inline: 'center' })
              const rect = button.getBoundingClientRect()
              const outside = document.elementFromPoint(rect.right + 4, rect.top + rect.height / 2)
              button.click()
              return {
                playWidth: Math.round(rect.width),
                playHeight: Math.round(rect.height),
                iconAfterPlay: button.querySelector('.material-symbols-outlined').textContent,
                audioBuilds: window.__audioBuilds,
                hitOutside: !!(outside && outside.getAttribute('data-hit') === '44' && outside.parentElement === button)
              }
            })()`,
            returnByValue: true,
          },
          sessionId,
        )
        const value = (played.result as { value?: Record<string, unknown> } | undefined)?.value
        const gone = wait('Page.loadEventFired', sessionId)
        await send(
          'Runtime.evaluate',
          {
            expression: `[...document.querySelectorAll('button')].find((button) => (button.textContent || '').indexOf("J'ai pris connaissance") !== -1).click()`,
          },
          sessionId,
        )
        await gone
        const landed = await send(
          'Runtime.evaluate',
          { expression: 'location.pathname', returnByValue: true },
          sessionId,
        )
        resolve({
          playWidth: Number(value?.playWidth),
          playHeight: Number(value?.playHeight),
          iconAfterPlay: String(value?.iconAfterPlay),
          audioBuilds: Number(value?.audioBuilds),
          hitOutside: value?.hitOutside === true,
          afterAck: String((landed.result as { value?: string } | undefined)?.value),
        })
      })().catch(reject)
    })
  })
}
