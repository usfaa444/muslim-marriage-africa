import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/settings/route.js'
import { settingsPageHtml } from './settings-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/40-settings/screen.html', import.meta.url)),
  'utf8',
)
const page = settingsPageHtml(stitch)

describe('settings delete and export', () => {
  it('keeps the settings layout and drops the sentences this story does not do', () => {
    expect(page).toContain('Exporter mon dossier civil')
    expect(page).toContain('Demande de suppression définitive')
    expect(page).toContain('id="modal-deletion"')
    expect(page).toContain('Conserver mon sanctuaire')
    expect(page).toContain('Confirmer le scellage définitif')
    expect(page).toContain('Émission d’un ticket CIL de clôture.')
    expect(page).not.toContain('Oumar')
    expect(page).not.toContain('Scaleway')
    expect(page).not.toContain('vérifiable publiquement')
    expect(page).not.toContain('Génère une archive scellée')
    expect(page).toContain("fetch('/v1/me/delete'")
    expect(page).toContain("fetch('/v1/me/export'")
    expect(page).toContain('ankanu_pin_hidden_at')
    const markup = page.slice(0, page.indexOf('<script>'))
    expect(markup).toContain('<button')
    expect(markup).toContain('Exporter mon dossier civil')
    expect(markup).toContain('Mode Allégé')
    expect(markup).toContain('Langue des Directives Vocales')
    expect(markup).toContain('Sécurité du Sanctuaire')
    expect(markup).toContain('Formule d’Engagement')
  })

  it('serves the screen with a private response', async () => {
    const response = GET()
    expect(response.headers.get('cache-control')).toBe('no-store')
    const html = await response.text()
    expect(html).toContain('id="modal-deletion"')
    expect(html).not.toContain('Scaleway')
  })
})
