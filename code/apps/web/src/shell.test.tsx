import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MahramChrome, MemberChrome, RoleChrome, shellForKind, StaffChrome } from './chrome.js'
import { frenchErrorMessage } from './components.js'
import {
  ButtonPrimary,
  EmptyState,
  ErrorBanner,
  payUnavailableDisables,
  SAFETY_ACTIONS,
} from './components.js'
import { LandingPage } from './landing.js'
import { SplashPage } from './splash.js'

function render(node: ReactNode): string {
  return renderToStaticMarkup(node)
}

describe('public landing', () => {
  const html = render(<LandingPage />)

  it('is the French AnKanu landing with the zero counter', () => {
    expect(html).toContain('id="cookie-consent"')
    expect(html).toContain('AnKanu')
    expect(html).toContain('Mariages confirmés : 0')
    expect(html).toContain('from-mihrab/15')
    expect(html).toContain('Déposer une demande de ta')
    expect(html.toLowerCase()).not.toContain('dating')
    expect(html.toLowerCase()).not.toContain('rencontre romantique')
    expect(html).not.toContain('href="/decouvrir"')
    expect(html).not.toContain('Équipe seulement')
    expect(html).not.toContain('+247.8k')
  })
})

describe('splash', () => {
  const html = render(<SplashPage />)

  it('shows the brand field and continue without a member nav', () => {
    expect(html).toContain('AnKanu')
    expect(html).toContain('Mihrab')
    expect(html).toContain('href="#prochaine-etape"')
    expect(html).toContain('Continuer vers le sanctuaire')
    expect(html).toContain('min-h-[48px]')
    expect(html).toContain('Vérification du sanctuaire sécurisé')
    expect(html).toContain('id="error-alert-box"')
    expect(html).toContain('hidden mb-8 p-4')
    expect(html).not.toContain('Découvrir')
    expect(html).not.toContain('Équipe seulement')
    expect(html.toLowerCase()).not.toContain('dating')
    expect(html.toLowerCase()).not.toContain('rencontre romantique')
  })
})

describe('tokens and components', () => {
  it('keeps DESIGN.md colors and the two Source families in the theme', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
    for (const hex of ['#f4ede0', '#1f3a5f', '#c4a35a', '#6b3d2e', '#c8bba6']) {
      expect(css).toContain(hex)
    }
    expect(css).toContain('--radius-sm: 6px')
    expect(css).toContain('--radius-md: 12px')
    expect(css).toContain('--radius-lg: 20px')
    expect(layout).toContain('lang="fr"')
    expect(layout).toContain('Source_Serif_4')
    expect(layout).toContain('Source_Sans_3')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })

  it('builds primary, empty-state, and error-banner', () => {
    const primary = render(<ButtonPrimary>Continuer</ButtonPrimary>)
    expect(primary).toContain('min-h-[48px]')
    expect(primary).toContain('bg-indigo')

    const empty = render(<EmptyState action={<ButtonPrimary>Reprendre</ButtonPrimary>} sentence="Aucun résultat." />)
    expect(empty).toContain('Aucun résultat.')
    expect(empty).toContain('Reprendre')
    expect(empty.match(/<p>/g)).toHaveLength(1)

    const banner = render(<ErrorBanner code="PAY_UNAVAILABLE" />)
    expect(banner).toContain('Le paiement est indisponible.')
    expect(banner).toContain('Réessayer')
    for (const action of SAFETY_ACTIONS) {
      expect(payUnavailableDisables(action)).toBe(false)
    }
    expect(frenchErrorMessage('toString')).toBe('Une erreur est survenue.')
  })
})

describe('role chrome', () => {
  it('keeps the three shells apart', () => {
    expect(shellForKind('staff')).toBe('staff')
    expect(shellForKind('mahram')).toBe('mahram')
    expect(shellForKind('web')).toBe('member')
    expect(shellForKind('capacitor')).toBe('member')
    expect(shellForKind(null)).toBe('public')

    const member = render(<MemberChrome />)
    expect(member).toContain('Découvrir')
    expect(member).toContain('Invitations')
    expect(member).toContain('Discussions')
    expect(member).toContain('Profil')

    const mahram = render(<MahramChrome />)
    expect(mahram).not.toContain('Découvrir')
    expect(mahram).not.toContain('Invitations')

    const staff = render(<StaffChrome />)
    expect(staff).toContain('Équipe seulement')
    expect(staff).toContain('md:grid-cols-2')
    expect(staff).not.toContain('Découvrir')

    expect(render(<RoleChrome kind={null} />)).toBe('')
    expect(render(<RoleChrome kind="web" />)).toContain('Découvrir')
    expect(render(<RoleChrome kind="mahram" />)).not.toContain('Découvrir')
    expect(render(<RoleChrome kind="mahram" />)).not.toContain('Invitations')
    expect(render(<RoleChrome kind="staff" />)).toContain('Équipe seulement')
    expect(render(<RoleChrome kind="staff" />)).not.toContain('Découvrir')
  })
})
