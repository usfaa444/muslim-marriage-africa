import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/id-liveness/route.js'
import { idLivenessPageHtml } from './id-liveness-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/17-id-liveness/screen.html', import.meta.url)),
  'utf8',
)
const page = idLivenessPageHtml(stitch)

describe('id and liveness screen', () => {
  it('keeps the downloaded layout and drops every hosting line', () => {
    expect(page).toContain("Vérification d'Identité Officielle &amp; Test de Vivacité")
    expect(page).toContain('id="status-ready"')
    expect(page).toContain('id="status-mismatch"')
    expect(page).toContain('id="status-minorhold"')
    expect(page).toContain('id="status-success"')
    expect(page).toContain('id="submit-btn"')
    expect(page).toContain('Reprendre la capture sans frais')
    expect(page).toContain('CNIB_Sawadogo_Recto.jpg')
    expect(page).not.toContain('Scaleway')
    expect(page).not.toContain('btn-state-')
    expect(page).not.toContain("Simulateur d'Audit")
    expect(page).not.toContain('onclick="setScreenState')
    expect(stitch).toContain('btn-state-success')
    expect(page).toContain('Conformité stricte aux lois burkinabè')
    expect(page).toContain('ankanu_pin_hidden_at')
    expect(page).toContain("fetch('/v1/pin'")
    expect(page.lastIndexOf('ankanu_pin_hidden_at')).toBeLessThan(page.lastIndexOf('<script>'))
    const added = page.slice(page.lastIndexOf('<script>'))
    expect(added).toContain("fetch('/v1/verifications/id'")
    expect(added).toContain("fetch('/v1/verifications/liveness'")
    expect(added).toContain('setScreenState')
    expect(added).not.toContain('BillingPort')
  })

  it('serves the screen with a private response', async () => {
    const response = GET()
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    const html = await response.text()
    expect(html).not.toContain('Scaleway')
    expect(html).toContain('id="status-minorhold"')
  })

  it('shows a free retake when either capture is rejected', async () => {
    const shown = await runScreen({ id: 'none', liveness: 'rejected' })
    expect(shown.visible).toBe('mismatch')
    expect(page).toContain('Reprendre la capture sans frais')
    expect(page).not.toContain('payer')
  })

  it('shows the member hold when either capture is held', async () => {
    const shown = await runScreen({ id: 'held', liveness: 'pending' })
    expect(shown.visible).toBe('minorhold')
  })

  it('shows success only when both captures are pending, and ready when neither exists', async () => {
    const ready = await runScreen({ id: 'none', liveness: 'none' })
    expect(ready.visible).toBe('ready')
    const one = await runScreen({ id: 'pending', liveness: 'none' })
    expect(one.visible).toBe('ready')
    const success = await runScreen({ id: 'pending', liveness: 'pending' })
    expect(success.visible).toBe('success')
  })

  it('shows a hold or a rejection on either capture', async () => {
    const held = await runScreen({ id: 'pending', liveness: 'held' })
    expect(held.visible).toBe('minorhold')
    const rejected = await runScreen({ id: 'rejected', liveness: 'pending' })
    expect(rejected.visible).toBe('mismatch')
  })

  it('posts both chosen images', async () => {
    const posted = await runSubmit()
    expect(posted).toEqual([
      { url: '/v1/verifications/id', body: { image: 'QUJDRA==' } },
      { url: '/v1/verifications/liveness', body: { image: 'R0lGOA==' } },
    ])
  })
})

async function runScreen(statuses: { id: string; liveness: string }): Promise<{ visible: string }> {
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
  const elements = new Map<string, { hidden: boolean; disabled: boolean; className: string }>()
  function element(id: string) {
    const found = elements.get(id)
    if (found) {
      return found
    }
    const created = {
      hidden: id !== 'status-ready',
      disabled: false,
      className: '',
      addEventListener: () => undefined,
      querySelectorAll: () => [],
      classList: {
        add(...names: string[]) {
          if (names.includes('hidden')) {
            created.hidden = true
          }
        },
        remove(...names: string[]) {
          if (names.includes('hidden')) {
            created.hidden = false
          }
        },
        contains(name: string) {
          return name === 'hidden' && created.hidden
        },
      },
    }
    elements.set(id, created)
    return created
  }
  const context = {
    document: {
      getElementById: (id: string) => element(id),
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    fetch: async (url: string) => ({
      status: 200,
      json: async () =>
        url.endsWith('/liveness')
          ? { id: 'live', kind: 'liveness', status: statuses.liveness }
          : { id: 'doc', kind: 'id_document', status: statuses.id },
    }),
    setTimeout,
    console,
  }
  for (const source of scripts) {
    runInNewContext(source, context)
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
  const visible = ['ready', 'loading', 'mismatch', 'minorhold', 'success'].find(
    (state) => element(`status-${state}`).hidden === false,
  )
  return { visible: visible ?? '' }
}

async function runSubmit(): Promise<Array<{ url: string; body: unknown }>> {
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
  const posts: Array<{ url: string; body: unknown }> = []
  const listeners = new Map<string, Array<(event?: { target?: unknown }) => void>>()
  function listen(target: string, name: string, fn: (event?: { target?: unknown }) => void) {
    const key = `${target}:${name}`
    const found = listeners.get(key) ?? []
    found.push(fn)
    listeners.set(key, found)
  }
  function fire(target: string, name: string, event?: { target?: unknown }) {
    for (const fn of listeners.get(`${target}:${name}`) ?? []) {
      fn(event)
    }
  }
  const docInput = {
    files: [{ name: 'carte.jpg' }] as Array<{ name: string }> | null,
    addEventListener: (name: string, fn: (event?: { target?: unknown }) => void) => listen('doc', name, fn),
  }
  const selfie = {
    type: '',
    accept: '',
    className: '',
    files: null as Array<{ name: string }> | null,
    click: () => undefined,
    addEventListener: (name: string, fn: (event?: { target?: unknown }) => void) => listen('selfie', name, fn),
  }
  const viewport = {
    appendChild: () => undefined,
    addEventListener: (name: string, fn: (event?: { target?: unknown }) => void) => listen('view', name, fn),
  }
  const submit = {
    disabled: false,
    classList: { add: () => undefined, remove: () => undefined },
    addEventListener: (name: string, fn: () => void) => listen('submit', name, fn),
  }
  const context = {
    document: {
      getElementById: (id: string) => (id === 'submit-btn' ? submit : { classList: { add() {}, remove() {} }, querySelectorAll: () => [] }),
      querySelector: (selector: string) => {
        if (selector === 'input[type="file"]') {
          return docInput
        }
        if (selector === '[data-icon="face"]') {
          return { closest: () => viewport }
        }
        return null
      },
      querySelectorAll: () => [],
      createElement: () => selfie,
    },
    FileReader: class {
      result = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL() {
        this.result = this.result || 'data:image/jpeg;base64,QUJDRA=='
        this.onload?.()
      }
    },
    fetch: async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'POST') {
        posts.push({ url, body: JSON.parse(init.body ?? '{}') as unknown })
      }
      return { status: 201, json: async () => ({ status: 'pending' }) }
    },
    setTimeout,
    console,
    setScreenState: () => undefined,
  }
  const reader = context.FileReader.prototype
  const original = reader.readAsDataURL
  let reads = 0
  reader.readAsDataURL = function (this: { result: string; onload: (() => void) | null }) {
    reads += 1
    this.result = reads === 1 ? 'data:image/jpeg;base64,QUJDRA==' : 'data:image/png;base64,R0lGOA=='
    original.call(this)
  }
  for (const source of scripts) {
    runInNewContext(source, context)
  }
  fire('doc', 'change')
  selfie.files = [{ name: 'selfie.png' }]
  fire('view', 'click', { target: viewport })
  fire('selfie', 'change')
  await new Promise((resolve) => setTimeout(resolve, 0))
  fire('submit', 'click')
  await new Promise((resolve) => setTimeout(resolve, 0))
  return posts
}
