import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/pin/route.js'
import { pinGuardScript } from './pin-guard.js'
import { pinPageHtml } from './pin-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/19-pin-lock/screen.html', import.meta.url)),
  'utf8',
)
const page = pinPageHtml(stitch)
const EMPTY_WELL =
  'w-4 h-4 rounded-full border-2 border-border-hairline bg-surface-sand transition-all duration-200" id="dot-1"'

describe('shared-device PIN screen', () => {
  it('keeps the sanctuary and drops the demo, the prefilled wells, and the hosting line', () => {
    expect(page).toContain('Sanctuaire Verrouillé')
    expect(page).toContain('Touch ID')
    expect(page).toContain('Ré-authentification SMS OTP')
    expect(page).toContain('Mot de passe maître')
    expect(page).toContain('Code PIN oublié ?')
    expect(page).toContain('Se déconnecter du sanctuaire')
    expect(page).toContain('id="lockout-banner"')
    expect(page).toContain('id="attempt-warning"')
    expect(page).toContain(EMPTY_WELL)
    expect(page).toContain("fetch('/v1/pin/unlock'")
    expect(page).toContain("fetch('/v1/sessions/current'")
    expect(page).toContain("location.assign('/auth')")
    expect(page).not.toContain('Simuler états')
    expect(page).not.toContain('1234')
    expect(page).not.toContain('alert(')
    expect(page).not.toContain('Scaleway')
    expect(page).not.toContain('currentPin')
    expect(page).not.toContain('dating')
    expect(stitch).toContain('Simuler états')
    expect(stitch).toContain('Scaleway')
    expect(stitch).toContain('1234')
  })

  it('serves the lock screen as a private page', async () => {
    const response = GET()
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    const html = await response.text()
    expect(html).toContain('Sanctuaire Verrouillé')
    expect(html).not.toContain('Scaleway')
  })

  it('asks the server before it leaves, and does not compare the digits itself', async () => {
    const opened = await runPin('?next=//evil', async () => ({
      ok: true,
      json: async () => ({ enabled: true, locked: false }),
    }))
    expect(opened.assigned).toEqual(['/'])

    const stayed = await runPin('?next=/age-gate', async (url) => {
      if (url === '/v1/pin/unlock') {
        return { ok: false, json: async () => ({ error: { code: 'PIN_INVALID' } }) }
      }
      return { ok: true, json: async () => ({ enabled: true, locked: true }) }
    })
    stayed.enter('1')
    stayed.enter('3')
    stayed.enter('5')
    stayed.enter('7')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(stayed.assigned).toEqual([])
    expect(stayed.calls.some((call) => call.url === '/v1/pin/unlock' && call.body === '{"pin":"1357"}')).toBe(true)
    expect(stayed.warningHidden).toBe(false)
  })
})

describe('PIN guard', () => {
  it('locks after a minute away and redirects only for a required PIN', async () => {
    const guard = await runGuard()
    guard.visibility('hidden')
    expect(guard.storage.get('ankanu_pin_hidden_at')).toBeTruthy()
    guard.storage.set('ankanu_pin_hidden_at', String(Date.now() - 60_001))
    guard.visibility('visible')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(guard.calls.some((call) => call.url === '/v1/pin/lock' && call.method === 'POST')).toBe(true)
    expect(guard.storage.has('ankanu_pin_hidden_at')).toBe(false)

    guard.respond = async (url) => {
      if (url === '/v1/pin') {
        return { ok: true, json: async () => ({ enabled: true, locked: true }) }
      }
      return { ok: false, json: async () => ({ error: { code: 'UNAUTHENTICATED' } }) }
    }
    guard.load()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(guard.assigned.some((path) => path.startsWith('/pin?next='))).toBe(true)

    const before = guard.assigned.length
    await guard.fetchWrapped('/v1/health', { error: { code: 'UNAUTHENTICATED' } })
    expect(guard.assigned).toHaveLength(before)
    await guard.fetchWrapped('/v1/health', { error: { code: 'PIN_REQUIRED' } })
    expect(guard.assigned.length).toBe(before + 1)
  })
})

type PinCall = { url: string; body: string }

function runPin(
  search: string,
  respond: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>,
): Promise<{
  assigned: string[]
  calls: PinCall[]
  enter: (digit: string) => void
  warningHidden: boolean
}> {
  const html = pinPageHtml(stitch)
  const start = html.lastIndexOf('<script>')
  const source = html.slice(start + '<script>'.length, html.lastIndexOf('</script>'))
  const assigned: string[] = []
  const calls: PinCall[] = []
  const warning = { className: 'hidden', classList: { remove(name: string) { warning.className = warning.className.replace(name, '') } } }
  const sandbox = {
    document: {
      getElementById(id: string) {
        if (id === 'attempt-warning') {
          return warning
        }
        return { className: '' }
      },
      querySelectorAll(selector: string) {
        if (selector === 'button') {
          return [{ textContent: 'Mot de passe maître', addEventListener() {} }, { textContent: 'Se déconnecter du sanctuaire', addEventListener() {} }]
        }
        return [{ textContent: 'Code PIN oublié ?', addEventListener() {} }]
      },
    },
    URLSearchParams,
    fetch(url: string, init?: { body?: string }) {
      calls.push({ url, body: init?.body ?? '' })
      return respond(url)
    },
    location: {
      search,
      assign(path: string) {
        assigned.push(path)
      },
    },
    window: {} as { location?: { search: string; assign: (path: string) => void }; enterDigit?: (digit: string) => void },
  }
  sandbox.window = sandbox
  runInNewContext(source, sandbox)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        assigned,
        calls,
        enter(digit: string) {
          sandbox.window.enterDigit?.(digit)
        },
        get warningHidden() {
          return warning.className.includes('hidden')
        },
      })
    }, 0)
  })
}

type GuardCall = { url: string; method: string }

function runGuard(): Promise<{
  storage: Map<string, string>
  calls: GuardCall[]
  assigned: string[]
  visibility: (state: string) => void
  load: () => void
  respond: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>
  fetchWrapped: (url: string, body: unknown) => Promise<void>
}> {
  const source = pinGuardScript().replace('<script>', '').replace('</script>', '')
  const storage = new Map<string, string>()
  const calls: GuardCall[] = []
  const assigned: string[] = []
  const listeners: Record<string, Array<() => void>> = {}
  let visibilityState = 'visible'
  let bodyFor = (_url: string): unknown => ({ locked: false })
  function responseFor(body: unknown): Promise<{ clone: () => { json: () => Promise<unknown> }; json: () => Promise<unknown> }> {
    const response = {
      clone() {
        return response
      },
      json: async () => body,
    }
    return Promise.resolve(response)
  }
  const sandbox = {
    localStorage: {
      getItem(key: string) {
        return storage.get(key) ?? null
      },
      setItem(key: string, value: string) {
        storage.set(key, value)
      },
      removeItem(key: string) {
        storage.delete(key)
      },
    },
    document: {
      get visibilityState() {
        return visibilityState
      },
      addEventListener(name: string, fn: () => void) {
        const found = listeners[name] ?? []
        found.push(fn)
        listeners[name] = found
      },
    },
    location: {
      pathname: '/age-gate',
      search: '',
      assign(path: string) {
        assigned.push(path)
      },
    },
    fetch(url: string, init?: { method?: string }) {
      calls.push({ url, method: init?.method ?? 'GET' })
      return responseFor(bodyFor(url))
    },
    window: {} as {
      location?: { pathname: string; search: string; assign: (path: string) => void }
      fetch?: (url: string, init?: { method?: string }) => Promise<unknown>
      addEventListener: (name: string, fn: () => void) => void
    },
    Date,
    Number,
    encodeURIComponent,
  }
  sandbox.window = sandbox
  sandbox.window.addEventListener = (name: string, fn: () => void) => {
    const found = listeners[name] ?? []
    found.push(fn)
    listeners[name] = found
  }
  runInNewContext(source, sandbox)
  return Promise.resolve({
    storage,
    calls,
    assigned,
    visibility(state: string) {
      visibilityState = state
      for (const fn of listeners.visibilitychange ?? []) {
        fn()
      }
    },
    load() {
      for (const fn of listeners.load ?? []) {
        fn()
      }
    },
    set respond(next: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>) {
      bodyFor = (url) => {
        void next
        return url === '/v1/pin' ? { enabled: true, locked: true } : { error: { code: 'UNAUTHENTICATED' } }
      }
    },
    async fetchWrapped(_url: string, body: unknown) {
      bodyFor = () => body
      await sandbox.window.fetch?.('/v1/health')
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
  })
}
