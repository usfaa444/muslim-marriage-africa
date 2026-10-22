import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LEGACY_PIN_LENGTH, PIN_LENGTH } from '@ankanu/kernel'
import { pinHtml } from './v2-pages.js'

function stitch(): string {
  return readFileSync(
    fileURLToPath(new URL('../../../design-stitch/ankanu-v2/10-pin-lock/screen.html', import.meta.url)),
    'utf8',
  )
}

function pinSource(): string {
  const page = pinHtml(stitch())
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
  const source = scripts.find((script) => script.includes("fetch('/v1/pin/unlock'"))
  if (!source) throw new Error('pin script missing')
  return source
}

type Listener = () => void
type Button = { key: string; listeners: Listener[]; addEventListener: (type: string, fn: Listener) => void }
type Call = { url: string; method: string; body?: string | undefined; cache?: string | undefined }

function button(key: string): Button {
  const node: Button = {
    key,
    listeners: [],
    addEventListener(_type, fn) {
      node.listeners.push(fn)
    },
  }
  return node
}

async function flush(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function mount(options: { search?: string; enabled: boolean; answer?: number }) {
  const dots = Array.from({ length: 6 }, () => ({ style: { opacity: '' } }))
  const keys = '1234567890'.split('').map((key) => button(key))
  const controls = new Map<string, Button>([
    ['btn-backspace', button('back')],
    ['btn-clear', button('clear')],
    ['btn-submit', button('submit')],
  ])
  const assigned: string[] = []
  const calls: Call[] = []
  const document = {
    querySelectorAll(selector: string) {
      if (selector === '.pin-dot') return dots
      if (selector === '[data-key]') {
        return keys.map((key) => ({
          getAttribute: (name: string) => (name === 'data-key' ? key.key : null),
          addEventListener: key.addEventListener,
        }))
      }
      return []
    },
    getElementById(id: string) {
      return controls.get(id) ?? null
    },
  }
  const window = {
    location: {
      search: options.search ?? '',
      assign(path: string) {
        assigned.push(path)
      },
    },
  }
  function fetchImpl(url: string, init?: { method?: string; body?: string; cache?: string }) {
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body, cache: init?.cache })
    if (url === '/v1/pin' && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => ({ enabled: options.enabled, locked: options.enabled }) })
    }
    const status = options.answer ?? 200
    return Promise.resolve({ ok: status < 300, status, json: async () => ({}) })
  }
  new Function('document', 'window', 'fetch', pinSource())(document, window, fetchImpl)
  return {
    dots,
    assigned,
    calls,
    async press(digits: string) {
      for (const digit of digits) {
        const key = keys.find((item) => item.key === digit)
        for (const fn of key?.listeners ?? []) fn()
        await flush()
      }
    },
    async submit() {
      for (const fn of controls.get('btn-submit')?.listeners ?? []) fn()
      await flush()
    },
    filled() {
      return dots.filter((dot) => dot.style.opacity === '1').length
    },
    writes() {
      return calls.filter((call) => call.method !== 'GET')
    },
  }
}

describe('PIN screen length', () => {
  it('uses the six slots of the Stitch screen and the shared kernel length', () => {
    expect(PIN_LENGTH).toBe(6)
    expect(stitch().match(/pin-dot"/g)?.length).toBe(PIN_LENGTH)
    expect(pinSource()).toContain(`var PIN_LENGTH = ${PIN_LENGTH}`)
    expect(pinSource()).toContain(`var LEGACY_PIN_LENGTH = ${LEGACY_PIN_LENGTH}`)
  })

  it('fills all six dots and saves a new PIN only after the sixth digit', async () => {
    const page = mount({ search: '?next=%2Fprofile-edit', enabled: false })
    await page.press('1234')
    expect(page.filled()).toBe(4)
    expect(page.calls).toEqual([])

    // Four digits are only an unlock length. A new PIN waits for the sixth digit.
    await page.submit()
    expect(page.writes()).toEqual([])
    expect(page.filled()).toBe(4)
    expect(page.assigned).toEqual([])

    await page.press('5')
    expect(page.filled()).toBe(5)
    expect(page.writes()).toEqual([])
    await page.press('6')
    expect(page.filled()).toBe(6)
    expect(page.writes()).toEqual([{ url: '/v1/pin', method: 'PUT', body: JSON.stringify({ pin: '123456' }), cache: undefined }])
    expect(page.assigned).toEqual(['/profile-edit'])

    await page.press('7')
    expect(page.writes()).toHaveLength(1)
  })

  it('unlocks a six-digit PIN on the sixth digit and a stored four-digit PIN with the unlock button', async () => {
    const six = mount({ search: '?next=%2Fdecouvrir', enabled: true })
    await six.press('13579')
    expect(six.writes()).toEqual([])
    await six.press('0')
    expect(six.writes()).toEqual([
      { url: '/v1/pin/unlock', method: 'POST', body: JSON.stringify({ pin: '135790' }), cache: undefined },
    ])
    expect(six.assigned).toEqual(['/decouvrir'])

    const legacy = mount({ enabled: true })
    await legacy.press('135')
    await legacy.submit()
    expect(legacy.calls).toEqual([])
    await legacy.press('7')
    expect(legacy.calls).toEqual([])
    expect(legacy.filled()).toBe(4)
    await legacy.submit()
    expect(legacy.writes()).toEqual([
      { url: '/v1/pin/unlock', method: 'POST', body: JSON.stringify({ pin: '1357' }), cache: undefined },
    ])
    expect(legacy.assigned).toEqual(['/onboarding'])

    const five = mount({ enabled: true })
    await five.press('13579')
    await five.submit()
    expect(five.calls).toEqual([])
  })

  it('reads the PIN state without the HTTP cache', async () => {
    const page = mount({ enabled: false })
    await page.press('123456')
    expect(page.calls[0]).toEqual({ url: '/v1/pin', method: 'GET', body: undefined, cache: 'no-store' })
  })

  it('clears the dots and stays after a refused PIN', async () => {
    const page = mount({ search: '?next=%2Fprofile-edit', enabled: true, answer: 400 })
    await page.press('135791')
    expect(page.writes()).toHaveLength(1)
    expect(page.filled()).toBe(0)
    expect(page.assigned).toEqual([])
  })

  it('returns only to a same-origin path', async () => {
    const cases: Array<[string, string]> = [
      ['?next=%2Fprofile-edit', '/profile-edit'],
      ['?next=%2F%2Fevil.example', '/onboarding'],
      ['?next=%2F%5Cevil.example', '/onboarding'],
      ['?next=https%3A%2F%2Fevil.example', '/onboarding'],
      ['', '/onboarding'],
    ]
    for (const [search, target] of cases) {
      const page = mount({ search, enabled: false })
      await page.press('123456')
      expect(page.assigned).toEqual([target])
    }
  })
})
