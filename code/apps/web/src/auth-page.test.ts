import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { authPageHtml, COC_VERSION_ON_SCREEN } from './auth-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/11-auth/screen.html', import.meta.url)),
  'utf8',
)
const page = authPageHtml(stitch)

describe('auth screen', () => {
  it('keeps the downloaded signup layout, including captcha, Google, and the 19+ notice', () => {
    expect(page).toContain("Démarche d'Alliance Sacrée")
    expect(page).toContain('Chemin réservé aux adultes de 19 ans et plus.')
    expect(page).toContain('id="human-verify"')
    expect(page).toContain('Continuer via Google')
    expect(page).toContain('Engagement de Sincérité')
    expect(page).toContain('union matrimoniale')
    expect(page).toContain('id="pledge-check"')
    expect(page).not.toContain('accounts.google.com')
    const added = page.slice(page.lastIndexOf('<script>'))
    expect(added).toContain("getElementById('human-verify')")
    expect(added).not.toContain('id="human-verify"')
    expect(added).toContain('human_verified:')
    expect(COC_VERSION_ON_SCREEN).toBe('FR-089')
    expect(page).toContain('coc_version: "FR-089"')
    expect(added).toContain('sessionStorage.setItem("ankanu.signup"')
    expect(added).toContain("location.assign('/age-gate')")
    expect(added).not.toContain("fetch('/v1/accounts'")
    expect(added).toContain("fetch('/v1/sessions'")
    expect(added).toContain('remember_me:')
    expect(added).toContain("querySelector('#login-form input[type=\"checkbox\"]')")
    expect(added).toContain("getElementById('login-form')")
    expect(added).toContain("addEventListener('submit'")
    expect(added).toContain("event.key === 'Enter'")
    expect(added).not.toContain('id="captcha-box"')
    expect(page).not.toContain('date of birth')
    expect(page).not.toContain('date_of_birth')
    expect(added).toContain('function validateSubmissionState')
    expect(added).toContain('length >= 12')
    expect(added).toContain("selected.value === 'frere' ? 'brother'")
    expect(added).toContain('button.disabled = true')
    expect(added).toContain('catch (error)')
    expect(added).toContain("addEventListener('pageshow'")
    expect(added).toContain('event.persisted')
    expect(added).toContain("type === 'back_forward'")
    expect(added).toContain("getElementById('password')")
  })

  it('enables signup again when the browser restores the page', () => {
    const start = page.lastIndexOf('<script>')
    const source = page.slice(start + '<script>'.length, page.lastIndexOf('</script>'))
    const values = new Map<string, string>([
      ['email', 'fatim@example.bf'],
      ['pseudonym', 'Fatim_Ouaga'],
      ['password', 'phrase avec espaces'],
    ])
    const checked = new Map<string, boolean>([
      ['pledge-check', true],
      ['human-verify', true],
    ])
    const button = { disabled: false, className: '' }
    const store = new Map<string, string>()
    const navigation = { type: 'navigate' }
    const listeners = new Map<string, Array<(event: { preventDefault: () => void; persisted?: boolean }) => void>>()
    function listen(id: string, type: string, listener: (event: { preventDefault: () => void; persisted?: boolean }) => void) {
      const key = `${id}:${type}`
      const current = listeners.get(key) ?? []
      current.push(listener)
      listeners.set(key, current)
    }
    const sandbox = {
      document: {
        getElementById(id: string) {
          if (id === 'btn-submit-signup') {
            return button
          }
          return {
            get value() {
              return values.get(id) ?? ''
            },
            set value(next: string) {
              values.set(id, next)
            },
            get checked() {
              return checked.get(id) === true
            },
            set checked(next: boolean) {
              checked.set(id, next)
            },
            addEventListener(type: string, listener: (event: { preventDefault: () => void }) => void) {
              listen(id, type, listener)
            },
          }
        },
        querySelector() {
          return null
        },
        querySelectorAll() {
          return []
        },
      },
      sessionStorage: {
        setItem(key: string, value: string) {
          store.set(key, value)
        },
        getItem(key: string) {
          return store.get(key) ?? null
        },
      },
      performance: {
        getEntriesByType(kind: string) {
          return kind === 'navigation' ? [navigation] : []
        },
      },
      location: { assign() {} },
      window: {
        addEventListener(type: string, listener: (event: { persisted: boolean }) => void) {
          listen('window', type, listener)
        },
      },
    }
    runInNewContext(source, sandbox)
    const submit = listeners.get('signup-form:submit')?.[0]
    if (!submit) {
      throw new Error('signup submit missing')
    }
    submit({ preventDefault() {} })
    expect(button.disabled).toBe(true)
    const pageshow = listeners.get('window:pageshow')?.[0]
    if (!pageshow) {
      throw new Error('pageshow missing')
    }
    values.set('password', '')
    pageshow({ preventDefault() {}, persisted: false })
    expect(button.disabled).toBe(true)
    expect(values.get('password')).toBe('')
    navigation.type = 'back_forward'
    pageshow({ preventDefault() {}, persisted: false })
    expect(values.get('password')).toBe('phrase avec espaces')
    expect(button.disabled).toBe(false)
    expect(button.className).toContain('bg-indigo')
    navigation.type = 'navigate'
    values.set('password', '')
    button.disabled = true
    pageshow({ preventDefault() {}, persisted: true })
    expect(values.get('password')).toBe('phrase avec espaces')
    expect(button.disabled).toBe(false)
  })
})
