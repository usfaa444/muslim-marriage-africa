import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { discoverHtml } from './discover-page.js'
import { desktopDiscoverNav, holdCard, mobileDiscoverNav, notListablePage } from './not-listable.js'

function stitch(folder: string, name = 'screen.html'): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/${name}`, import.meta.url)),
    'utf8',
  )
}

describe('not-listable hold', () => {
  it('names only the real pending items and links profile edit for an incomplete profile', () => {
    const html = notListablePage(stitch('12-profile-not-yet-public'), stitch('57-discover'), stitch('53-barre-de-navigation'), {
      reason: 'viewer_not_listable',
      reasons: [
        { code: 'viewer_not_listable' },
        { code: 'photo_review', sla_hours: 24 },
        { code: 'id_document_pending', state: 'absent' },
        { code: 'liveness_pending', state: 'open' },
        { code: 'profile_incomplete', missing: ['madhhab', 'pratique'] },
      ],
    })
    expect(html).toContain('Photo en revue — pas encore publique.')
    expect(html).toContain("La pièce d'identité est manquante.")
    expect(html).toContain('Photo de présence')
    expect(html).toContain('« Il manque : madhhab, pratique »')
    expect(html).toContain('href="/profile-edit"')
    expect(html).toContain('Délai habituel de modération : 24 heures.')
    expect(html).toContain('href="/decouvrir"')
    expect(html).toContain('href="/invitations"')
    expect(html).toContain('href="/discussions"')
    expect(html).toContain('href="/profil"')
    expect(html).not.toContain('href="#"')
    expect(html).not.toContain('Al-Hassan')
    expect(html).not.toContain('Conformité aux règles de pudeur')
    expect(html).not.toContain('12 à 24 heures')
    expect(html.match(/href="\/profile-edit"/g)).toHaveLength(1)
  })

  it('does not offer profile edit when the profile is complete and only captures are open', () => {
    const card = holdCard({
      reasons: [
        { code: 'viewer_not_listable' },
        { code: 'id_document_pending', state: 'open' },
        { code: 'liveness_pending', state: 'absent' },
      ],
    })
    expect(card).toContain("Pièce officielle d'identité")
    expect(card).toContain('La photo de présence est manquante.')
    expect(card).toContain("Votre profil doit être validé avant de consulter d'autres profils.")
    expect(card).not.toContain('href="/profile-edit"')
    expect(card).not.toContain('Photo en revue')
  })

  it('keeps Discover selected on the desktop bar and the mobile bar', () => {
    const desktop = desktopDiscoverNav(stitch('53-barre-de-navigation'))
    expect(desktop).toContain('href="/decouvrir" aria-current="page"')
    expect(desktop).toContain('flex-wrap')
    expect(desktop.match(/aria-current="page"/g)).toHaveLength(1)
    expect(desktop).not.toContain('href="#')
    const mobile = mobileDiscoverNav(stitch('57-discover'))
    expect(mobile).toContain('href="/decouvrir"')
    expect(mobile).toContain('aria-current="page"')
    expect(mobile).not.toContain('href="#"')
    const page = discoverHtml(stitch('57-discover'), stitch('57-discover', 'grid.html'))
    expect(page).toContain('id="discover-hold" hidden')
    expect(page).toContain('function showNotListable')
  })
})
