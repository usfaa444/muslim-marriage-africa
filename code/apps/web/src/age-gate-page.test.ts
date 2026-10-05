import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { ageGatePageHtml } from './age-gate-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/12-age-gate/screen.html', import.meta.url)),
  'utf8',
)
const page = ageGatePageHtml(stitch)

describe('age gate screen', () => {
  it('keeps the downloaded layout, drops the hosting statute line, and posts dob with the signup draft', () => {
    expect(page).toContain('id="dobDay"')
    expect(page).toContain('id="dobMonth"')
    expect(page).toContain('id="dobYear"')
    expect(page).toContain('id="submitBtn"')
    expect(page).toContain('id="stateUnderage"')
    expect(page).toContain('Supervision éthique communautaire Ouagadougou &amp; Bobo-Dioulasso')
    expect(page).toContain('Mariages homologués documentés')
    expect(page).not.toContain('Loi 010-2004/AN')
    expect(page).not.toContain('Scaleway')
    const added = page.slice(page.lastIndexOf('<script>'))
    expect(added).toContain('sessionStorage.getItem("ankanu.signup")')
    expect(added).toContain("fetch('/v1/accounts'")
    expect(added).toContain("payload.status === 'held'")
    expect(added).toContain('stateUnderage')
    expect(added).toContain("alert(\"Redirection vers la passerelle OTP SMS d'AnKanu Burkina Faso.\")")
    expect(added).not.toContain('location.assign')
    expect(added).not.toContain('/otp')
  })

  it('posts the draft with dob, holds a young account, and alerts only an adult create', async () => {
    const draft = {
      email: 'fatim@example.bf',
      password: 'phrase avec espaces',
      pseudonym: 'Fatim_Ouaga',
      gender: 'sister',
      pledge_accepted: true,
      human_verified: true,
      coc_version: 'FR-089',
    }
    const missing = await runGate(null, async () => ({ status: 201, json: async () => ({ status: 'Active' }) }))
    await missing.submit('15', '01', '1990', false)
    expect(missing.calls).toEqual([])
    expect(missing.hint).toBe('La création a échoué.')

    const held = await runGate(draft, async () => ({ status: 201, json: async () => ({ status: 'held' }) }))
    await held.submit('05', '10', '2007', false)
    expect(held.calls).toEqual([
      {
        url: '/v1/accounts',
        body: { ...draft, dob: '2007-10-05' },
      },
    ])
    expect(held.alerts).toEqual([])
    expect(held.visible).toBe('stateUnderage')
    expect(held.stored).toBeNull()
    expect(held.buttonDisabled).toBe(true)
    expect(held.buttonClass).toContain('bg-disabled')
    expect(held.buttonClass).not.toContain('bg-indigo')
    expect(held.labelText).toBe('Continuer vers la vérification (SMS / OTP)')
    held.unlock()
    held.fireChange('dobYear')
    expect(held.buttonDisabled).toBe(true)
    expect(held.buttonClass).toContain('bg-disabled')
    expect(held.buttonClass).not.toContain('bg-indigo')
    expect(held.labelText).toBe('Continuer vers la vérification (SMS / OTP)')
    expect(held.visible).toBe('stateUnderage')

    const adult = await runGate(draft, async () => ({ status: 201, json: async () => ({ status: 'Active' }) }))
    await adult.submit('15', '01', '1990', false)
    expect(adult.calls[0]?.body).toEqual({ ...draft, dob: '1990-01-15' })
    expect(adult.alerts).toEqual(["Redirection vers la passerelle OTP SMS d'AnKanu Burkina Faso."])
    expect(adult.stored).toBeNull()
    expect(adult.visible).toBe('stateEmpty')

    const refused = await runGate(draft, async () => ({
      status: 400,
      json: async () => ({ error: { message: 'dob : une date de naissance est requise.' } }),
    }))
    await refused.submit('31', '02', '2010', false)
    expect(refused.hint).toBe('dob : une date de naissance est requise.')
    expect(refused.buttonDisabled).toBe(false)
  })
})

async function runGate(
  draft: Record<string, unknown> | null,
  respond: () => Promise<{ status: number; json: () => Promise<unknown> }>,
): Promise<{
  calls: Array<{ url: string; body: unknown }>
  alerts: string[]
  hint: string
  visible: string
  stored: string | null
  buttonDisabled: boolean
  buttonClass: string
  labelText: string
  unlock: () => void
  fireChange: (id: string) => void
  submit: (day: string, month: string, year: string, disabled: boolean) => Promise<void>
}> {
  const start = page.lastIndexOf('<script>')
  const source = page.slice(start + '<script>'.length, page.lastIndexOf('</script>'))
  const calls: Array<{ url: string; body: unknown }> = []
  const alerts: string[] = []
  const classes = new Map<string, Set<string>>([
    ['stateEmpty', new Set()],
    ['stateEligible', new Set(['hidden'])],
    ['stateUnderage', new Set(['hidden'])],
  ])
  const nodes = new Map<string, { value: string; textContent: string; disabled: boolean; innerHTML: string; className: string; changes: Array<() => void> }>()
  function node(id: string) {
    const current = nodes.get(id) ?? {
      value: '',
      textContent: id === 'btnLabelText' ? 'Poursuivre vers l\'envoi du code OTP' : '',
      disabled: false,
      innerHTML: 'label',
      className: '',
      changes: [],
    }
    nodes.set(id, current)
    return {
      get value() {
        return current.value
      },
      set value(next: string) {
        current.value = next
      },
      get textContent() {
        return current.textContent
      },
      set textContent(next: string) {
        current.textContent = next
      },
      get disabled() {
        return current.disabled
      },
      set disabled(next: boolean) {
        current.disabled = next
      },
      get innerHTML() {
        return current.innerHTML
      },
      set innerHTML(next: string) {
        current.innerHTML = next
      },
      get className() {
        return current.className
      },
      set className(next: string) {
        current.className = next
      },
      classList: {
        add(name: string) {
          classes.get(id)?.add(name)
        },
        remove(name: string) {
          classes.get(id)?.delete(name)
        },
      },
      addEventListener(type: string, listener: () => void) {
        if (type === 'change') {
          current.changes.push(listener)
        }
      },
    }
  }
  const store = new Map<string, string>()
  if (draft) {
    store.set('ankanu.signup', JSON.stringify(draft))
  }
  const empty = node('stateEmpty')
  empty.textContent = 'Renseignez votre jour, mois et année de naissance pour débloquer l\'étape suivante.'
  const sandbox = {
    document: {
      querySelector(selector: string) {
        if (selector === '#stateEmpty span:last-of-type') {
          return empty
        }
        return null
      },
      getElementById(id: string) {
        return node(id)
      },
    },
    sessionStorage: {
      getItem(key: string) {
        return store.get(key) ?? null
      },
      removeItem(key: string) {
        store.delete(key)
      },
    },
    fetch: async (url: string, init?: { body?: string }) => {
      calls.push({ url, body: init?.body ? JSON.parse(init.body) : null })
      const response = await respond()
      return { ...response, ok: response.status >= 200 && response.status < 300 }
    },
    alert(message: string) {
      alerts.push(message)
    },
    window: {} as { handleContinue?: () => Promise<void> },
  }
  runInNewContext(source, sandbox)
  return {
    calls,
    alerts,
    get hint() {
      return nodes.get('stateEmpty')?.textContent ?? ''
    },
    get visible() {
      if (!classes.get('stateUnderage')?.has('hidden')) {
        return 'stateUnderage'
      }
      if (!classes.get('stateEligible')?.has('hidden')) {
        return 'stateEligible'
      }
      return 'stateEmpty'
    },
    get stored() {
      return store.get('ankanu.signup') ?? null
    },
    get buttonDisabled() {
      return nodes.get('submitBtn')?.disabled ?? true
    },
    get buttonClass() {
      return nodes.get('submitBtn')?.className ?? ''
    },
    get labelText() {
      return nodes.get('btnLabelText')?.textContent ?? ''
    },
    unlock() {
      const button = nodes.get('submitBtn')
      if (button) {
        button.disabled = false
        button.className = 'bg-indigo'
      }
      const label = nodes.get('btnLabelText')
      if (label) {
        label.textContent = 'Poursuivre vers l\'envoi du code OTP'
      }
      classes.get('stateUnderage')?.add('hidden')
      classes.get('stateEligible')?.delete('hidden')
    },
    fireChange(id: string) {
      for (const listener of nodes.get(id)?.changes ?? []) {
        listener()
      }
    },
    async submit(day, month, year, disabled) {
      node('dobDay').value = day
      node('dobMonth').value = month
      node('dobYear').value = year
      node('submitBtn').disabled = disabled
      const handle = sandbox.window.handleContinue
      if (!handle) {
        throw new Error('handleContinue missing')
      }
      await handle()
    },
  }
}
