import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/profile-edit/route.js'
import { profileEditBehavior, profileEditPageHtml } from './profile-edit-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/21-profile-edit/screen.html', import.meta.url)),
  'utf8',
)
const page = profileEditPageHtml(stitch)

type Call = { url: string; method: string; body: string }

function runScreen(status: string, respond: (call: Call) => { ok: boolean; body: unknown }): Promise<{
  calls: Call[]
  click(id: string): void
  cancel(): void
  openDrawer(): void
  setReason(value: string): void
  setNote(value: string): void
  label(): string
  icon(): string
  drawerHidden(): boolean
  success(): string[]
  error(): string
  saveText(): string
  toggleDisabled(): boolean
}> {
  const source = profileEditBehavior()
  const calls: Call[] = []
  const listeners: Record<string, Array<(event: { preventDefault: () => void; stopImmediatePropagation: () => void }) => void>> = {}
  const classes = new Map<string, Set<string>>()
  function classList(id: string) {
    const found = classes.get(id) ?? new Set<string>()
    classes.set(id, found)
    return {
      contains(token: string) {
        return found.has(token)
      },
      add(token: string) {
        found.add(token)
      },
      remove(token: string) {
        found.delete(token)
      },
      toggle(token: string) {
        if (found.has(token)) {
          found.delete(token)
        } else {
          found.add(token)
        }
      },
    }
  }
  const text = new Map<string, string>()
  const nodes = new Map<string, { id: string; textContent: string; disabled: boolean; style: { color: string }; classList: ReturnType<typeof classList> }>()
  function node(id: string, initial = '') {
    const current = nodes.get(id)
    if (current) {
      return current
    }
    text.set(id, initial)
    const created = {
      id,
      disabled: false,
      style: { color: '' },
      classList: classList(id),
      get textContent() {
        return text.get(id) ?? ''
      },
      set textContent(value: string) {
        text.set(id, value)
      },
    }
    nodes.set(id, created)
    return created
  }
  classList('pauseDrawer').add('hidden')
  classList('alertSuccess').add('hidden')
  classList('alertError').add('hidden')
  classList('saveSpinner').add('hidden')
  const icon = node('icon', 'pause_circle')
  const label = node('label', 'Configurer une pause')
  const toggle = node('togglePauseBtn')
  const save = node('saveButton')
  const saveText = node('saveText', 'Enregistrer les modifications')
  const successTitle = node('success-title', 'Modifications enregistrées avec succès')
  const successLine = node('success-line', 'printed')
  const errorLine = node('alertErrorMessage', '')
  const note = { value: '' }
  let reason = 'ramadan'
  const cancel = node('cancel', '\n          Annuler\n        ')
  const toggleButton = Object.assign(toggle, {
    querySelectorAll() {
      return [icon, label]
    },
    addEventListener(_type: string, fn: (event: { preventDefault: () => void; stopImmediatePropagation: () => void }) => void) {
      const found = listeners.toggle ?? []
      found.push(fn)
      listeners.toggle = found
    },
  })
  const saveButton = Object.assign(save, {
    addEventListener(_type: string, fn: (event: { preventDefault: () => void; stopImmediatePropagation: () => void }) => void) {
      const found = listeners.save ?? []
      found.push(fn)
      listeners.save = found
    },
  })
  function fire(id: string) {
    const event = { preventDefault() {}, stopImmediatePropagation() {} }
    for (const listener of listeners[id] ?? []) {
      listener(event)
    }
  }
  const sandbox = {
    document: {
      addEventListener(name: string, fn: () => void) {
        if (name === 'DOMContentLoaded') {
          fn()
        }
      },
      getElementById(id: string) {
        if (id === 'togglePauseBtn') {
          return toggleButton
        }
        if (id === 'saveButton') {
          return saveButton
        }
        if (id === 'pauseDrawer') {
          return {
            classList: classList('pauseDrawer'),
            querySelector() {
              return note
            },
          }
        }
        if (id === 'alertSuccess') {
          return {
            classList: classList('alertSuccess'),
            querySelectorAll() {
              return [successTitle, successLine]
            },
          }
        }
        if (id === 'alertError') {
          return { classList: classList('alertError') }
        }
        if (id === 'alertErrorMessage') {
          return errorLine
        }
        if (id === 'saveSpinner') {
          return { classList: classList('saveSpinner') }
        }
        if (id === 'saveText') {
          return saveText
        }
        return null
      },
      querySelector(selector: string) {
        if (selector === 'input[name="pause_reason"]:checked') {
          return { value: reason }
        }
        return null
      },
      querySelectorAll(selector: string) {
        if (selector === 'button') {
          return [
            Object.assign(cancel, {
              addEventListener(_type: string, fn: (event: { preventDefault: () => void; stopImmediatePropagation: () => void }) => void) {
                const found = listeners.cancel ?? []
                found.push(fn)
                listeners.cancel = found
              },
            }),
          ]
        }
        return []
      },
    },
    fetch(url: string, init?: { method?: string; body?: string }) {
      const call = { url, method: init?.method ?? 'GET', body: init?.body ?? '' }
      calls.push(call)
      const result = respond(call)
      return Promise.resolve({
        ok: result.ok,
        json: async () => result.body,
      })
    },
  }
  runInNewContext(source, sandbox)
  return Promise.resolve({
    calls,
    click(id: string) {
      fire(id)
    },
    cancel() {
      fire('cancel')
    },
    openDrawer() {
      classList('pauseDrawer').remove('hidden')
    },
    setReason(value: string) {
      reason = value
    },
    setNote(value: string) {
      note.value = value
    },
    label() {
      return label.textContent
    },
    icon() {
      return icon.textContent
    },
    drawerHidden() {
      return classList('pauseDrawer').contains('hidden')
    },
    success() {
      return [successTitle.textContent, successLine.textContent]
    },
    error() {
      return errorLine.textContent
    },
    saveText() {
      return saveText.textContent
    },
    toggleDisabled() {
      return toggle.disabled
    },
  })
}

async function settled(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve()
  }
}

describe('profile edit life-pause screen', () => {
  it('serves the Stitch folio and adds no chrome to the file', async () => {
    expect(stitch).toContain('Configurer une pause')
    expect(stitch).toContain('id="pauseDrawer"')
    expect(stitch).toContain('value="mourning"')
    expect(stitch).not.toContain('Réactiver mon profil')
    expect(stitch).not.toContain('play_circle')
    expect(stitch).not.toContain('Scaleway')
    expect(page).toContain('Édition du Folio Personnel')
    expect(page).toContain('Configurer une pause')
    expect(page).toContain("fetch('/v1/me/deactivate'")
    expect(page).toContain("fetch('/v1/me/reactivate'")
    expect(page).toContain('Réactiver mon profil')
    expect(page).toContain('ankanu_pin_hidden_at')
    expect(page).not.toContain('Scaleway')
    expect(page).not.toContain('hébergée souverainement')
    const response = GET()
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toContain('id="togglePauseBtn"')
  })

  it('saves an open drawer as deactivate and uses the same button to reactivate', async () => {
    const screen = await runScreen('Active', (call) => {
      if (call.method === 'GET') {
        return { ok: true, body: { status: 'Active' } }
      }
      if (call.url === '/v1/me/reactivate') {
        return { ok: true, body: { status: 'Active' } }
      }
      return { ok: true, body: { status: 'deactivated' } }
    })
    await settled()
    expect(screen.calls[0]).toMatchObject({ url: '/v1/me/deactivate', method: 'GET' })
    screen.click('save')
    expect(screen.calls).toHaveLength(1)
    screen.click('toggle')
    expect(screen.drawerHidden()).toBe(false)
    screen.setReason('exams')
    screen.setNote('  concours  ')
    screen.click('save')
    await settled()
    const post = screen.calls[1]
    expect(post?.url).toBe('/v1/me/deactivate')
    expect(JSON.parse(post?.body ?? '{}')).toEqual({ reason: 'exams', note: '  concours  ' })
    expect(screen.label()).toBe('Réactiver mon profil')
    expect(screen.icon()).toBe('play_circle')
    expect(screen.drawerHidden()).toBe(true)
    expect(screen.success()[0]).toBe('Pause enregistrée')
    expect(screen.success()[1]).toContain("vérifications d'identité préservées.")
    screen.click('toggle')
    await settled()
    expect(screen.calls[2]).toMatchObject({ url: '/v1/me/reactivate', method: 'POST', body: '{}' })
    expect(screen.label()).toBe('Configurer une pause')
    expect(screen.icon()).toBe('pause_circle')
    expect(screen.success()).toEqual(['Profil réactivé', 'Votre compte est de nouveau actif.'])
  })

  it('closes on Annuler, disables a hold, and shows the server message', async () => {
    const held = await runScreen('held', () => ({ ok: true, body: { status: 'held' } }))
    await settled()
    expect(held.toggleDisabled()).toBe(true)
    expect(held.drawerHidden()).toBe(true)
    held.click('toggle')
    expect(held.calls.filter((call) => call.method === 'POST')).toHaveLength(0)

    const failed = await runScreen('Active', (call) => {
      if (call.method === 'GET') {
        return { ok: true, body: { status: 'Active' } }
      }
      return { ok: false, body: { error: { message: 'reason : un motif est requis.' } } }
    })
    await settled()
    failed.openDrawer()
    failed.click('save')
    await settled()
    expect(failed.error()).toBe('reason : un motif est requis.')
    expect(failed.saveText()).toBe('Enregistrer les modifications')
    failed.click('toggle')
    failed.cancel()
    expect(failed.drawerHidden()).toBe(true)
    expect(failed.calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  })
})
