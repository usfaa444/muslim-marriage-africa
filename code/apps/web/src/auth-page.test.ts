import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
    expect(page).toContain("fetch('/v1/accounts'")
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
  })
})
