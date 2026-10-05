import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { emailVerificationPageHtml } from './email-verification-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/13-email-verification/screen.html', import.meta.url)),
  'utf8',
)
const page = emailVerificationPageHtml(stitch, 'fatim@example.bf')
const waiting = emailVerificationPageHtml(stitch, null)

describe('email verification screen', () => {
  it('matches the downloaded screen and shows the account email instead of the specimen', () => {
    expect(page).toContain('Vérification du Courrier Électronique')
    expect(page).toContain("Modifier l'adresse")
    expect(page).toContain('Renvoyer un nouveau lien d\'activation')
    expect(page).toContain('Demander un nouveau lien scellé')
    expect(page).toContain('Courrier validé avec honneur')
    expect(page).toContain('Lien expiré ou caduc')
    const markup = page.slice(0, page.lastIndexOf('<script>'))
    expect(markup).toContain('fatim@example.bf')
    expect(markup).not.toContain('tahir.sawadogo@courrier.bf')
    expect(waiting).toContain('tahir.sawadogo@courrier.bf')
    const added = page.slice(page.lastIndexOf('<script>'))
    expect(added).toContain("fetch('/v1/accounts/email-verifications'")
    expect(added).toContain("fetch('/v1/accounts/email-verifications/consume'")
    expect(added).toContain('x-account-email')
    expect(added).toContain('Envoi en cours...')
    expect(added).toContain("Modifier l'adresse")
    expect(added).toContain('preventDefault')
    expect(added).not.toContain('sms')
    expect(added).not.toContain('60s')
    expect(page).toContain('sous deux minutes')
    expect(page).not.toContain('btn-tab-')
    expect(page).not.toContain('Simuler')
    expect(page).not.toContain('onclick="setState')
    expect(page).toContain('id="state-waiting"')
    expect(page).toContain('id="state-expired"')
    expect(page).toContain('id="state-success"')
    expect(stitch).toContain('Simuler les états FR-006')
    expect(page).toContain('ankanu_pin_hidden_at')
    expect(page).toContain("fetch('/v1/pin'")
    expect(page.lastIndexOf('ankanu_pin_hidden_at')).toBeLessThan(page.lastIndexOf('<script>'))
  })

  it('escapes an address that would close the stitch script', () => {
    const hostile = emailVerificationPageHtml(stitch, 'a</script>@example.com')
    const markup = hostile.slice(0, hostile.lastIndexOf('<script>'))
    expect(markup).not.toContain('a</script>@example.com')
    expect(markup).toContain('a&lt;/script&gt;@example.com')
  })

  it('consumes a token and leaves a token-less load idle until resend', async () => {
    const withToken = await runScreen('?token=abc', async (url) => ({
      status: url.endsWith('/consume') ? 200 : 201,
      headers: { get: () => encodeURIComponent('fatim@example.bf') },
    }))
    expect(withToken.calls.map((call) => call.url)).toEqual(['/v1/accounts/email-verifications/consume'])
    expect(withToken.states).toEqual(['success'])
    expect(withToken.path).toBe('/email-verification')

    const withoutToken = await runScreen('', async () => ({
      status: 201,
      headers: { get: () => null },
    }))
    expect(withoutToken.calls).toEqual([])
    expect(withoutToken.states).toEqual([])
    withoutToken.resend()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(withoutToken.calls.map((call) => call.url)).toEqual(['/v1/accounts/email-verifications'])
    expect(withoutToken.states).toEqual(['waiting'])

    const rejected = await runScreen('?token=abc', async () => ({
      status: 400,
      headers: { get: () => null },
    }))
    expect(rejected.states).toEqual(['expired'])
  })
})

async function runScreen(
  search: string,
  respond: (url: string) => Promise<{ status: number; headers: { get: (name: string) => string | null } }>,
): Promise<{ calls: Array<{ url: string }>; states: string[]; path: string; resend: () => void }> {
  const html = emailVerificationPageHtml(stitch, null)
  const start = html.lastIndexOf('<script>')
  const source = html.slice(start + '<script>'.length, html.lastIndexOf('</script>'))
  const calls: Array<{ url: string }> = []
  const states: string[] = []
  let path = ''
  const sandbox = {
    document: {
      body: {},
      createTreeWalker() {
        return { nextNode: () => null }
      },
      getElementById() {
        return { disabled: false, textContent: '' }
      },
      querySelector() {
        return null
      },
      querySelectorAll() {
        return []
      },
    },
    fetch: async (url: string) => {
      calls.push({ url })
      return respond(url)
    },
    setState(value: string) {
      states.push(value)
    },
    URLSearchParams,
    location: { search, pathname: '/email-verification' },
    history: {
      replaceState(_data: unknown, _title: unknown, next: string) {
        path = next
      },
    },
    NodeFilter: { SHOW_TEXT: 4 },
    window: {} as { triggerResend?: () => void },
  }
  sandbox.window = sandbox as unknown as { triggerResend?: () => void }
  runInNewContext(source, sandbox)
  await new Promise((resolve) => setTimeout(resolve, 0))
  return {
    calls,
    states,
    path,
    resend() {
      const trigger = sandbox.window.triggerResend
      if (!trigger) {
        throw new Error('triggerResend missing')
      }
      trigger()
    },
  }
}
