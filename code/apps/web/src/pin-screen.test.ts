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
  const source = scripts.find((script) => script.includes("'/v1/pin/unlock'"))
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

type Answer = { status: number; body?: unknown } | 'network'

const RESTING = 'Chiffrement et vérification locale sécurisée'
const SET_LENGTH = 'pin : six chiffres sont requis.'
const UNLOCK_LENGTH = 'pin : quatre ou six chiffres sont requis.'

function mount(options: { search?: string; enabled: boolean; answer?: number | Answer; state?: Answer }) {
  const dots = Array.from({ length: 6 }, () => ({ style: { opacity: '' } }))
  const keys = '1234567890'.split('').map((key) => button(key))
  const controls = new Map<string, Button>([
    ['btn-backspace', button('back')],
    ['btn-clear', button('clear')],
    ['btn-submit', button('submit')],
  ])
  const assigned: string[] = []
  const calls: Call[] = []
  const events: string[] = []
  const hint = { textContent: RESTING }
  let answer: Answer =
    typeof options.answer === 'number' ? { status: options.answer } : (options.answer ?? { status: 200, body: {} })
  let state: Answer = options.state ?? { status: 200, body: { enabled: options.enabled, locked: options.enabled } }
  let gate: Promise<void> | null = null
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
      if (id === 'pin-status-text') return hint
      return controls.get(id) ?? null
    },
  }
  const window = {
    location: {
      origin: 'http://localhost:3100',
      search: options.search ?? '',
      assign(path: string) {
        assigned.push(path)
        events.push(`assign ${path}`)
      },
    },
  }
  function fetchImpl(url: string, init?: { method?: string; body?: string; cache?: string }) {
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body, cache: init?.cache })
    const reply = url === '/v1/pin' && method === 'GET' ? state : answer
    if (reply === 'network') return Promise.reject(new TypeError('Failed to fetch'))
    const wait = method !== 'GET' && gate ? gate : Promise.resolve()
    return wait.then(() => ({
      ok: reply.status < 300,
      status: reply.status,
      json: async () => {
        if (method !== 'GET') events.push(`read ${method} ${url}`)
        return reply.body ?? {}
      },
    }))
  }
  new Function('document', 'window', 'fetch', pinSource())(document, window, fetchImpl)
  return {
    dots,
    assigned,
    calls,
    events,
    hint: () => hint.textContent,
    answerWith(next: Answer) {
      answer = next
    },
    stateWith(next: Answer) {
      state = next
    },
    holdWrites() {
      let open: () => void = () => {}
      gate = new Promise<void>((resolve) => {
        open = resolve
      })
      return () => open()
    },
    async clear() {
      for (const fn of controls.get('btn-clear')?.listeners ?? []) fn()
      await flush()
    },
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

    // Four digits are only an unlock length. A new PIN waits for the sixth digit, and the hint says so.
    await page.submit()
    expect(page.writes()).toEqual([])
    expect(page.filled()).toBe(4)
    expect(page.assigned).toEqual([])
    expect(page.hint()).toBe(SET_LENGTH)

    await page.press('5')
    expect(page.filled()).toBe(5)
    expect(page.hint()).toBe(RESTING)
    expect(page.writes()).toEqual([])
    await page.submit()
    expect(page.writes()).toEqual([])
    expect(page.hint()).toBe(SET_LENGTH)
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
    expect(legacy.writes()).toEqual([])
    expect(legacy.hint()).toBe(UNLOCK_LENGTH)
    await legacy.press('7')
    expect(legacy.writes()).toEqual([])
    expect(legacy.filled()).toBe(4)
    await legacy.submit()
    expect(legacy.writes()).toEqual([
      { url: '/v1/pin/unlock', method: 'POST', body: JSON.stringify({ pin: '1357' }), cache: undefined },
    ])
    expect(legacy.assigned).toEqual(['/onboarding'])

    const five = mount({ enabled: true })
    await five.press('13579')
    await five.submit()
    expect(five.writes()).toEqual([])
    expect(five.filled()).toBe(5)
    expect(five.hint()).toBe(UNLOCK_LENGTH)
  })

  it('reads the answer to the write before leaving, so the browser does not cancel it', async () => {
    const set = mount({ search: '?next=%2Fprofile-edit', enabled: false })
    await set.press('123456')
    expect(set.events).toEqual(['read PUT /v1/pin', 'assign /profile-edit'])

    const unlock = mount({ search: '?next=%2Fprofile-edit', enabled: true })
    await unlock.press('1357')
    await unlock.submit()
    expect(unlock.events).toEqual(['read POST /v1/pin/unlock', 'assign /profile-edit'])
  })

  it('reads the PIN state without the HTTP cache', async () => {
    const page = mount({ enabled: false })
    await page.press('123456')
    expect(page.calls[0]).toEqual({ url: '/v1/pin', method: 'GET', body: undefined, cache: 'no-store' })
  })

  it('clears the dots, stays and says why after a refused PIN', async () => {
    const page = mount({
      search: '?next=%2Fprofile-edit',
      enabled: true,
      answer: { status: 400, body: { error: { code: 'PIN_INVALID', message: 'Code incorrect.', details: { attempts_left: 4 } } } },
    })
    await page.press('135791')
    expect(page.writes()).toHaveLength(1)
    expect(page.filled()).toBe(0)
    expect(page.assigned).toEqual([])
    expect(page.hint()).toBe('Code incorrect.')

    // Typing again puts the resting hint back.
    await page.press('1')
    expect(page.hint()).toBe(RESTING)
  })

  it('says the session is locked after the last wrong PIN, and that sign-in is needed after that', async () => {
    const page = mount({
      enabled: true,
      answer: { status: 401, body: { error: { code: 'PIN_LOCKED', message: 'Session verrouillée.', details: null } } },
    })
    await page.press('135791')
    expect(page.hint()).toBe('Session verrouillée.')
    expect(page.filled()).toBe(0)
    expect(page.assigned).toEqual([])

    // The API ended the session: the PIN state read now answers 401 and nothing is sent.
    page.stateWith({ status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.', details: null } } })
    await page.press('135790')
    expect(page.writes()).toHaveLength(1)
    expect(page.hint()).toBe('Authentification requise.')
    expect(page.filled()).toBe(0)
    expect(page.assigned).toEqual([])
  })

  it('shows the Stitch progress line while the PIN is checked, and a connection error when the API cannot be reached', async () => {
    const page = mount({ enabled: true, answer: 'network' })
    await page.press('135790')
    expect(page.hint()).toBe('La connexion a échoué.')
    expect(page.filled()).toBe(0)
    expect(page.assigned).toEqual([])

    const held = mount({ search: '?next=%2Fprofile-edit', enabled: false })
    const release = held.holdWrites()
    await held.press('123456')
    expect(held.writes()).toHaveLength(1)
    expect(held.hint()).toBe('Validation du code en cours...')
    // Keys, backspace and clear wait for the answer.
    await held.press('7')
    await held.clear()
    expect(held.filled()).toBe(6)
    release()
    await flush()
    expect(held.assigned).toEqual(['/profile-edit'])
  })

  it('returns only to a same-origin path', async () => {
    const cases: Array<[string, string]> = [
      ['?next=%2Fprofile-edit', '/profile-edit'],
      ['?next=%2Fprofil%2Fabc%3Fvue%3Dgrille%23photos', '/profil/abc?vue=grille#photos'],
      // A path that only looks encoded stays a path on this origin.
      ['?next=%2F%252F%2Fevil.example', '/%2F/evil.example'],
      ['?next=%2F%2Fevil.example', '/onboarding'],
      ['?next=%2F%5Cevil.example', '/onboarding'],
      ['?next=%5C%5Cevil.example', '/onboarding'],
      ['?next=%2F%2F%2Fevil.example', '/onboarding'],
      ['?next=https%3A%2F%2Fevil.example', '/onboarding'],
      ['?next=http%3A%2F%2Flocalhost%3A3100%2Fprofile-edit', '/onboarding'],
      ['?next=javascript%3Aalert(1)', '/onboarding'],
      ['?next=%2F%2Fevil.example%2F%2E%2E', '/onboarding'],
      // The URL parser deletes tab, LF and CR, so these would become //evil.example.
      ['?next=%2F%09%2Fevil.example%2Fx', '/onboarding'],
      ['?next=%2F%0A%2Fevil.example%2Fx', '/onboarding'],
      ['?next=%2F%0D%2Fevil.example%2Fx', '/onboarding'],
      ['?next=%2F%09%5Cevil.example', '/onboarding'],
      ['?next=%09%2F%2Fevil.example', '/onboarding'],
      ['?next=%2F%00%2Fevil.example', '/onboarding'],
      ['?next=%2F%7F%2Fevil.example', '/onboarding'],
      // Dot segments that resolve to a protocol-relative path.
      ['?next=%2F.%2F%2Fevil.example', '/onboarding'],
      ['?next=%2F..%2F%2Fevil.example', '/onboarding'],
      ['?next=%2F%2E%2E%2F%2Fevil.example', '/onboarding'],
      ['', '/onboarding'],
    ]
    for (const [search, target] of cases) {
      const page = mount({ search, enabled: false })
      await page.press('123456')
      expect(page.assigned, search).toEqual([target])
      // What the browser would load: never another origin.
      expect(new URL(target, 'http://localhost:3100').origin, search).toBe('http://localhost:3100')
    }
  })
})
