import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/privacy/status/[ticketId]/route.js'
import { statusPageHtml } from './status-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/41-delete-export-status/screen.html', import.meta.url)),
  'utf8',
)
const ticketId = '018f0000-0000-7000-8000-000000000001'
const page = statusPageHtml(stitch, ticketId)

describe('delete and export status', () => {
  it('keeps one status panel and drops prototype chrome and hosting lines', () => {
    expect(page).toContain('id="content-ready"')
    expect(page).toContain('id="content-purging"')
    expect(page).toContain('id="content-incident"')
    expect(page).toContain('id="incident-banner"')
    expect(page).toContain('[ASSUMPTION] Clôture et suspension immédiate')
    expect(page).toContain('[ASSUMPTION] Effacement du compte')
    expect(page).toContain('30 jours')
    expect(page).toContain('[ASSUMPTION] Export des données')
    expect(page).toContain('72 heures')
    expect(page).toContain('Non demandé')
    expect(page).not.toContain('content-processing')
    expect(page).not.toContain('btn-state-')
    expect(page).not.toContain('Scaleway')
    expect(page).not.toContain('Oumar')
    expect(page).not.toContain('SLA 48h')
    expect(page).not.toContain('31h 14m')
    expect(page).not.toContain('Annuler la suppression')
    expect(page).toContain('Africa/Ouagadougou')
    expect(page).toContain(ticketId)
    expect(page).toContain("fetch('/v1/me/export-status'")
    expect(page).not.toContain('Archive ZIP')
    expect(page).not.toContain("Télécharger l'archive")
    expect(page).not.toContain('regard du tuteur')
    expect(page).not.toContain('24 octobre 2025')
    const escaped = statusPageHtml(stitch, `${ticketId}</script>`)
    expect(escaped).toContain('\\u003c/script>')
    expect(escaped).not.toContain(`${ticketId}</script>`)
  })

  it('serves a uuid ticket and rejects any other id before render', async () => {
    const rejected = await GET(new Request('http://localhost/privacy/status/abc'), {
      params: Promise.resolve({ ticketId: 'abc</script>' }),
    })
    expect(rejected.status).toBe(404)
    const rejectedHtml = await rejected.text()
    expect(rejectedHtml).not.toContain('content-ready')
    expect(rejectedHtml).not.toContain('<script>')
    const response = await GET(new Request(`http://localhost/privacy/status/${ticketId}`), {
      params: Promise.resolve({ ticketId }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const html = await response.text()
    expect(html).toContain(ticketId)
    expect(html).not.toContain('Scaleway')
  })
})
