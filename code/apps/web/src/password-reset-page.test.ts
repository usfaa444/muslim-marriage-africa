import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { passwordResetPageHtml } from './password-reset-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/15-password-reset/screen.html', import.meta.url)),
  'utf8',
)
const page = passwordResetPageHtml(stitch)

describe('password reset screen', () => {
  it('keeps the stitch copy and drops the forbidden hosting lines', () => {
    expect(page).toContain('Réinitialisation du Mot de Passe')
    expect(page).toContain('Transmettre le lien d\'accès')
    expect(page).toContain('Au minimum 12 caractères avec lettres, chiffres et symbole noble.')
    expect(page).toContain('Lien expiré ou adresse inconnue')
    expect(page).toContain('Session locale active et reconnue pour 30 jours.')
    expect(page).toContain('© 2026 AnKanu. Tous droits réservés.')
    expect(page).toContain('Chiffrement de bout en bout. Zéro traitement publicitaire de vos identifiants.')
    expect(page).toContain('placeholder="ex. foyer.ouedraogo@kanu.bf"')
    expect(page).not.toContain('mariam.sawadogo@famille.bf')
    expect(page).not.toContain('Barakah2025!Honor')
    expect(page).not.toContain('bout .')
    expect(page).not.toContain('Scaleway')
    expect(page).not.toContain('hébergement souverain en France')
    expect(page).not.toContain("Plateforme d'engagement matrimonial honorable")
    expect(page).toContain("fetch('/v1/password-resets'")
    expect(page).toContain("fetch('/v1/password-resets/consume'")
    expect(page).toContain('password !== confirmation')
    expect(page).not.toContain('tab-state-')
    expect(page).not.toContain('Simuler')
    expect(page).not.toContain("switchState('state-5')")
    expect(page).not.toContain("switchState('state-3')")
    expect(page).toContain('id="state-1"')
    expect(page).toContain('id="state-5"')
    expect(page).toContain('Reprendre la demande')
    expect(stitch).toContain("Simuler l'ouverture du lien reçu")
  })

  it('asks for the link, then posts one password after the local confirmation matches', async () => {
    const requested = await runScreen('', async (url) => ({
      status: url.endsWith('/consume') ? 400 : 201,
      json: async () => ({ error: { code: 'PASSWORD_RESET_INVALID' } }),
    }))
    await requested.request('fatim@example.bf')
    expect(requested.calls.map((call) => call.url)).toEqual(['/v1/password-resets'])
    expect(requested.calls[0]?.body).toEqual({ email: 'fatim@example.bf' })
    expect(requested.states).toEqual(['state-2'])

    const opened = await runScreen('?token=abc', async () => ({
      status: 200,
      json: async () => ({}),
    }))
    expect(opened.states).toEqual(['state-3'])
    await opened.submit('abc', 'une phrase plus longue', 'autre phrase plus longue')
    expect(opened.calls).toEqual([])
    await opened.submit('abc', 'une phrase plus longue', 'une phrase plus longue')
    expect(opened.calls.map((call) => call.url)).toEqual(['/v1/password-resets/consume'])
    expect(opened.calls[0]?.body).toEqual({ token: 'abc', password: 'une phrase plus longue' })
    expect(opened.states).toEqual(['state-3', 'state-5'])
    expect(opened.path).toBe('/password-reset')
  })

  it('shows the stitch error when the link is refused', async () => {
    const refused = await runScreen('?token=abc', async () => ({
      status: 400,
      json: async () => ({ error: { code: 'PASSWORD_RESET_INVALID' } }),
    }))
    await refused.submit('abc', 'une phrase plus longue', 'une phrase plus longue')
    expect(refused.states).toEqual(['state-3', 'state-4'])
  })
})

async function runScreen(
  search: string,
  respond: (url: string) => Promise<{ status: number; json: () => Promise<unknown> }>,
): Promise<{
  calls: Array<{ url: string; body: unknown }>
  states: string[]
  path: string
  request: (email: string) => Promise<void>
  submit: (token: string, password: string, confirmation: string) => Promise<void>
}> {
  const start = page.lastIndexOf('<script>')
  const source = page.slice(start + '<script>'.length, page.lastIndexOf('</script>'))
  const calls: Array<{ url: string; body: unknown }> = []
  const states: string[] = []
  const recorded = { path: '' }
  const sandbox = {
    document: {
      querySelector() {
        return null
      },
      getElementById() {
        return null
      },
    },
    fetch: async (url: string, init?: { body?: string }) => {
      calls.push({ url, body: init?.body ? JSON.parse(init.body) : null })
      return respond(url)
    },
    switchState(value: string) {
      states.push(value)
    },
    URLSearchParams,
    location: { search, pathname: '/password-reset' },
    history: {
      replaceState(_data: unknown, _title: unknown, next: string) {
        recorded.path = next
      },
    },
    window: {} as {
      requestPasswordReset?: (email: string) => Promise<void>
      submitNewPassword?: (token: string, password: string, confirmation: string) => Promise<void>
    },
  }
  sandbox.window = sandbox as unknown as typeof sandbox.window
  runInNewContext(source, sandbox)
  await new Promise((resolve) => setTimeout(resolve, 0))
  return {
    calls,
    states,
    get path() {
      return recorded.path
    },
    request(email) {
      const request = sandbox.window.requestPasswordReset
      if (!request) {
        throw new Error('requestPasswordReset missing')
      }
      return request(email)
    },
    submit(token, password, confirmation) {
      const submit = sandbox.window.submitNewPassword
      if (!submit) {
        throw new Error('submitNewPassword missing')
      }
      return submit(token, password, confirmation)
    },
  }
}
