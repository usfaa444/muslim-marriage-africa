import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { accountScript } from './v2-client.js'
import { authHtml } from './v2-pages.js'

type TextNode = { nodeType: number; textContent: string }
type Listener = (event: { preventDefault: () => void }) => Promise<void> | void
type El = {
  id: string
  value: string
  checked: boolean
  disabled: boolean
  className: string
  type: string
  nodeType: number
  lastChild: TextNode | El | null
  childNodes: Array<TextNode | El>
  listeners: Record<string, Listener>
  classList: { remove: (token: string) => void; toggle: (token: string, force?: boolean) => void }
  addEventListener: (type: string, fn: Listener) => void
  appendChild: (child: TextNode | El) => TextNode | El
  hidden: string | null
  setAttribute: (name: string, value: string) => void
  removeAttribute: (name: string) => void
  getAttribute: (name: string) => string | null
}

function textNode(value = ' '): TextNode {
  return { nodeType: 3, textContent: value }
}

function element(id: string, className = ''): El {
  const node: El = {
    id,
    value: '',
    checked: false,
    disabled: false,
    className,
    type: id.includes('password') ? 'password' : 'text',
    nodeType: 1,
    lastChild: textNode(),
    childNodes: [textNode()],
    listeners: {},
    classList: {
      remove(token) {
        node.className = node.className
          .split(/\s+/)
          .filter((part) => part && part !== token)
          .join(' ')
      },
      toggle(token, force) {
        const parts = node.className.split(/\s+/).filter(Boolean)
        const has = parts.includes(token)
        const on = force ?? !has
        node.className = (on ? [...parts.filter((part) => part !== token), token] : parts.filter((part) => part !== token)).join(
          ' ',
        )
      },
    },
    addEventListener(type, fn) {
      node.listeners[type] = fn
    },
    appendChild(child) {
      node.childNodes.push(child)
      node.lastChild = child
      return child
    },
    hidden: null,
    setAttribute(name, value) {
      if (name === 'hidden') node.hidden = value
    },
    removeAttribute(name) {
      if (name === 'hidden') node.hidden = null
    },
    getAttribute(name) {
      return name === 'hidden' ? node.hidden : null
    },
  }
  if (node.lastChild) node.childNodes.push(node.lastChild)
  return node
}

type Page = {
  nodes: Map<string, El>
  assigned: string[]
  resets: number
  refillAndSolve: () => void
}

function mount(fetchImpl: (url: string, init?: RequestInit) => Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>): Page {
  const nodes = new Map<string, El>()
  for (const id of [
    'login-form',
    'login-email',
    'login-password',
    'login-remember',
    'login-submit',
    'login-error',
    'login-recaptcha',
    'signup-recaptcha',
  ]) {
    nodes.set(
      id,
      element(id, id === 'login-error' ? 'hidden text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1' : ''),
    )
  }
  const assigned: string[] = []
  let token = 'solved'
  let callback: (() => void) | null = null
  const resets = { count: 0 }
  const windowRef = {
    location: {
      assign(path: string) {
        assigned.push(path)
      },
    },
    grecaptcha: {
      render(_slot: unknown, options: { callback: () => void }) {
        callback = options.callback
        return 7
      },
      getResponse() {
        return token
      },
      reset() {
        resets.count += 1
        token = ''
      },
    },
    onRecaptchaLoad: null as null | (() => void),
  }
  const documentRef = {
    getElementById(id: string) {
      return nodes.get(id) ?? null
    },
    querySelectorAll() {
      return []
    },
    createTextNode(value: string) {
      return textNode(value)
    },
  }
  const sessionStorage = {
    getItem() {
      return null
    },
    setItem() {},
    removeItem() {},
  }
  const run = new Function('document', 'window', 'sessionStorage', 'fetch', accountScript('site-key', 'login'))
  run(documentRef, windowRef, sessionStorage, fetchImpl)
  windowRef.onRecaptchaLoad?.()
  return {
    nodes,
    assigned,
    get resets() {
      return resets.count
    },
    refillAndSolve() {
      nodes.get('login-password')!.value = 'phrase avec espaces'
      token = 'solved-again'
      callback?.()
    },
  }
}

async function submit(page: Page): Promise<void> {
  const email = page.nodes.get('login-email')!
  const password = page.nodes.get('login-password')!
  const remember = page.nodes.get('login-remember')!
  const button = page.nodes.get('login-submit')!
  email.value = 'fatim@example.bf'
  password.value = 'phrase avec espaces'
  remember.checked = true
  button.disabled = false
  let prevented = false
  await page.nodes.get('login-form')!.listeners.submit?.({
    preventDefault() {
      prevented = true
    },
  })
  expect(prevented).toBe(true)
}

function fetchQueue(steps: Array<{ status: number; body?: unknown } | 'throw'>) {
  const calls: string[] = []
  const fetchImpl = async (url: string) => {
    calls.push(url)
    const next = steps.shift()
    if (!next || next === 'throw') {
      throw new Error('network')
    }
    return {
      status: next.status,
      ok: next.status >= 200 && next.status < 300,
      json: async () => next.body ?? null,
    }
  }
  return { fetchImpl, calls }
}

function errorText(page: Page): string {
  const node = page.nodes.get('login-error')!
  return node.lastChild && 'textContent' in node.lastChild ? node.lastChild.textContent : ''
}

function expectKeptFields(page: Page, message: string): void {
  expect(page.assigned).toEqual([])
  expect(page.nodes.get('login-email')!.value).toBe('fatim@example.bf')
  expect(page.nodes.get('login-remember')!.checked).toBe(true)
  expect(page.nodes.get('login-password')!.value).toBe('')
  expect(page.resets).toBe(1)
  expect(page.nodes.get('login-error')!.className.includes('hidden')).toBe(false)
  expect(errorText(page)).toContain(message)
  expect(page.nodes.get('login-submit')!.disabled).toBe(true)
  page.nodes.get('login-password')!.value = 'phrase avec espaces'
  page.nodes.get('login-password')!.listeners.input?.({ preventDefault() {} })
  expect(page.nodes.get('login-submit')!.disabled).toBe(true)
  page.refillAndSolve()
  expect(page.nodes.get('login-submit')!.disabled).toBe(false)
  expect(page.nodes.get('login-email')!.value).toBe('fatim@example.bf')
}

const STEPS = [
  ['email', '/email-verification'],
  ['phone', '/phone'],
  ['otp', '/otp'],
  ['identity', '/id-liveness'],
  ['account', '/onboarding'],
] as const

describe('sign-in routing and inline errors', () => {
  it('follows the server step and does not fall back to onboarding', async () => {
    for (const [step, path] of STEPS) {
      const queued = fetchQueue([
        { status: 201, body: { kind: 'web' } },
        { status: 200, body: { step } },
      ])
      const page = mount(queued.fetchImpl)
      await submit(page)
      expect(page.assigned).toEqual([path])
      expect(page.resets).toBe(0)
      expect(queued.calls).toEqual(['/v1/sessions', '/v1/accounts/gate'])
    }
    const missing = fetchQueue([
      { status: 201, body: { kind: 'web' } },
      { status: 200, body: { step: 'home' } },
    ])
    const dropped = mount(missing.fetchImpl)
    await submit(dropped)
    expectKeptFields(dropped, "La session n'a pas été conservée.")
    expect(dropped.assigned).not.toContain('/onboarding')
    expect(missing.calls).toEqual(['/v1/sessions', '/v1/accounts/gate', '/v1/sessions/current'])
  })

  it('stays on auth when the gate read is 401 or fails after 201', async () => {
    const denied = fetchQueue([{ status: 201, body: { kind: 'web' } }, { status: 401, body: { error: { code: 'UNAUTHENTICATED' } } }])
    const page = mount(denied.fetchImpl)
    await submit(page)
    expectKeptFields(page, "La session n'a pas été conservée.")
    expect(denied.calls).toEqual(['/v1/sessions', '/v1/accounts/gate', '/v1/sessions/current'])

    const failed = fetchQueue([{ status: 201, body: { kind: 'web' } }, 'throw'])
    const again = mount(failed.fetchImpl)
    await submit(again)
    expectKeptFields(again, "La session n'a pas été conservée.")

    const nonOk = fetchQueue([
      { status: 201, body: { kind: 'web' } },
      { status: 500, body: { step: 'account', error: { message: 'Pas cette phrase.' } } },
    ])
    const serverError = mount(nonOk.fetchImpl)
    await submit(serverError)
    expectKeptFields(serverError, "La session n'a pas été conservée.")
    expect(serverError.assigned).toEqual([])

    const calls: string[] = []
    const unreadable = mount(async (url: string) => {
      calls.push(url)
      if (url === '/v1/accounts/gate') {
        return {
          status: 200,
          ok: true,
          json: async () => {
            throw new Error('bad json')
          },
        }
      }
      return { status: 201, ok: true, json: async () => ({ kind: 'web' }) }
    })
    await submit(unreadable)
    expectKeptFields(unreadable, "La session n'a pas été conservée.")
    expect(calls).toEqual(['/v1/sessions', '/v1/accounts/gate', '/v1/sessions/current'])
  })

  it('shows each server message and a network failure without clearing the email', async () => {
    const cases = [
      { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Identifiant ou mot de passe incorrect.' } } },
      { status: 400, body: { error: { code: 'CAPTCHA_FAILED', message: 'Échec de validation de la vérification humaine.' } } },
      { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Cadence de requêtes régulée.' } } },
      { status: 401, body: { error: { code: 'PIN_LOCKED', message: 'Session verrouillée.' } } },
      { status: 403, body: { error: { code: 'FORBIDDEN', message: 'Compte en attente.', details: { status: 'held' } } } },
    ]
    for (const item of cases) {
      const queued = fetchQueue([item])
      const page = mount(queued.fetchImpl)
      await submit(page)
      expectKeptFields(page, String((item.body.error as { message: string }).message))
      expect(queued.calls).toEqual(['/v1/sessions'])
    }
    const offline = fetchQueue(['throw'])
    const page = mount(offline.fetchImpl)
    await submit(page)
    expectKeptFields(page, 'La connexion a échoué.')
  })

  it('ships the hidden v2 error and a post form, with no onboarding fallback', () => {
    const stitch = readFileSync(
      fileURLToPath(new URL('../../../design-stitch/ankanu-v2/02-auth/screen.html', import.meta.url)),
      'utf8',
    )
    const page = authHtml(stitch, 'login', 'site-key')
    expect(page).toContain('id="login-form" method="post"')
    expect(page).toContain('id="signup-form" method="post"')
    expect(page).not.toMatch(/id="login-form"[^>]*\saction=/)
    expect(page).toContain('class="hidden text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="login-error"')
    expect(page).toContain(
      'id="login-error"><span class="material-symbols-outlined text-[14px]" data-icon="error">error</span> </p><!-- Se souvenir de moi -->',
    )
    expect(page).not.toContain("|| '/onboarding'")
    expect(accountScript('site', 'login')).not.toContain("|| '/onboarding'")
    expect(accountScript('site', 'login')).toContain("addEventListener('pageshow'")
    expect(accountScript('site', 'login')).toContain('window.location.reload()')
    expect(accountScript('site', 'login')).not.toContain("fetch('/v1/accounts/gate', { credentials: 'same-origin', cache: 'no-store' })")
    expect(accountScript('site', 'login')).toContain("form.setAttribute('hidden', 'hidden')")
  })

  it('reads no gate on a fresh sign-in page and reloads a restored one so the server guard decides', async () => {
    const form = element('login-form')
    const calls: string[] = []
    let reloads = 0
    let pageshow = null as ((event: { persisted: boolean }) => void) | null
    const windowRef = {
      addEventListener(type: string, fn: (event: { persisted: boolean }) => void) {
        if (type === 'pageshow') pageshow = fn
      },
      location: {
        assign(path: string) {
          calls.push(`assign ${path}`)
        },
        replace(path: string) {
          calls.push(`replace ${path}`)
        },
        reload() {
          reloads += 1
        },
      },
    }
    const documentRef = {
      getElementById(id: string) {
        return id === 'login-form' ? form : null
      },
      querySelectorAll() {
        return []
      },
    }
    const sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} }
    const run = new Function('document', 'window', 'sessionStorage', 'fetch', accountScript('site-key', 'login'))
    run(documentRef, windowRef, sessionStorage, async (url: string) => {
      calls.push(`fetch ${url}`)
      return { status: 401, ok: false, json: async () => ({ error: { code: 'UNAUTHENTICATED' } }) }
    })
    expect(pageshow).not.toBeNull()

    // A fresh load was already answered by the server guard: no browser gate read, no 401.
    pageshow?.({ persisted: false })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls).toEqual([])
    expect(reloads).toBe(0)
    expect(form.getAttribute('hidden')).toBeNull()

    // A back-forward cache restore skipped the guard: hide the form and ask the server again.
    pageshow?.({ persisted: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.getAttribute('hidden')).toBe('hidden')
    expect(reloads).toBe(1)
    expect(calls).toEqual([])
  })

  it('registers no pageshow handler on the signup panel', () => {
    const types: string[] = []
    const windowRef = {
      addEventListener(type: string) {
        types.push(type)
      },
      location: { assign() {}, replace() {}, reload() {} },
    }
    const documentRef = { getElementById: () => null, querySelectorAll: () => [] }
    const sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} }
    const run = new Function('document', 'window', 'sessionStorage', 'fetch', accountScript('site-key', 'signup'))
    run(documentRef, windowRef, sessionStorage, async () => {
      throw new Error('no request expected')
    })
    expect(types).not.toContain('pageshow')
  })
})
