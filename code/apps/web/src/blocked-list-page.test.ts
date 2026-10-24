import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/settings/bloques/route.js'
import { BLOCKED_COPY, BLOCKED_PATH, blockedListHtml } from './blocked-list-page.js'
import { entryLocation } from './entry-guard.js'
import { settingsHtml } from './v2-pages.js'

function stitch(): string {
  return readFileSync(fileURLToPath(new URL('../../../design-stitch/ankanu-v2/27-settings/screen.html', import.meta.url)), 'utf8')
}

function scripts(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
}

describe('Membres bloqués (Story 8.6 follow-up)', () => {
  const html = blockedListHtml(stitch())
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))

  it('renders inside the shared member shell on the Profil tab, in the Paramètres style, in French', () => {
    expect(html).toContain('<title>AnKanu • Membres bloqués</title>')
    expect(html).toMatch(/<html[^>]* lang="fr"/)
    expect(main).toContain(`>${BLOCKED_COPY.title}</h1>`)
    expect(main).toContain('Préférences &amp; confidentialité')
    expect(main).toContain(BLOCKED_COPY.intro)
    expect(main).toContain(`href="/settings"`)
    expect(main).toContain(`<span>${BLOCKED_COPY.back}</span>`)
    expect(html).toContain('data-nav-item="profil" aria-current="page"')
    // Story chat-polish: app screens have no site header or footer, only the bottom nav.
    expect(html).not.toContain('id="app-header"')
    expect(html.match(/id="app-bottom-nav"/g)).toHaveLength(1)
    expect(html).toContain('ankanu_pin_hidden_at')
    // The Stitch settings modules are replaced, not shown under the list.
    expect(main).not.toContain('Mode Allégé')
    expect(main).not.toContain('Code secret PIN')
  })

  it('lists pseudonym and blurred photo only, and unblocks after an inline confirmation (no native dialog)', () => {
    const template = main.slice(main.indexOf('<template id="blocked-row">'), main.indexOf('</template>'))
    expect(template).toContain('data-name')
    expect(template).toContain('data-photo')
    expect(template).toContain('data-date')
    for (const field of ['data-age', 'data-city', 'data-bio', 'data-verified', 'data-open']) {
      expect(template).not.toContain(field)
    }
    expect(template).toContain(`>${BLOCKED_COPY.unblock}</span>`)
    expect(template).toContain('data-confirm hidden')
    expect(template).toContain(`>${BLOCKED_COPY.confirm}</button>`)
    expect(template).toContain(`>${BLOCKED_COPY.cancel}</button>`)
    expect(template).toContain(BLOCKED_COPY.confirmExplain)
    expect(template).toContain('min-h-[44px]')
    const script = scripts(html).find((item) => item.includes('/v1/blocks')) ?? ''
    expect(script).toContain("fetch('/v1/blocks', { credentials: 'same-origin', cache: 'no-store' })")
    expect(script).toContain("fetch('/v1/blocks/' + encodeURIComponent(item.blocked_id), { method: 'DELETE'")
    // The DELETE is only inside the confirm handler.
    expect(script.indexOf("method: 'DELETE'")).toBeGreaterThan(script.indexOf("yes.addEventListener('click'"))
    expect(script).not.toMatch(/\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/)
    expect(() => new Function(script)).not.toThrow()
    // A clear photo is never asked for: the API returns the blurred derivative only.
    expect(script).not.toContain('derivative')
  })

  it('has the loading, empty, error, retry and signed-out states', () => {
    expect(main).toContain(`id="blocked-loading" class="text-sm text-deep-navy/80">${BLOCKED_COPY.loading}`)
    expect(main).toContain(`id="blocked-empty" hidden`)
    expect(main).toContain(BLOCKED_COPY.empty)
    expect(main).toContain('id="blocked-load-error" hidden')
    expect(main).toContain(`>${BLOCKED_COPY.retry}</button>`)
    expect(main).toContain(`id="blocked-load-signin" hidden href="/auth"`)
    expect(main).toContain('id="blocked-status" role="status" hidden')
  })

  it('Paramètres links to the list from a card after the PIN card, before « Formules & Packs »', () => {
    const settings = settingsHtml(stitch())
    const card = settings.indexOf('data-blocked-settings')
    expect(card).toBeGreaterThan(settings.indexOf("Code secret PIN d'accès"))
    expect(card).toBeLessThan(settings.indexOf('Formules &amp; Packs'))
    expect(settings).toContain(`href="${BLOCKED_PATH}"`)
    expect(settings).toContain(`>${BLOCKED_COPY.settingsTitle}</h2>`)
    expect(settings).toContain(BLOCKED_COPY.settingsExplain)
  })
})

describe('Membres bloqués route', () => {
  function request(cookie?: string): Request {
    return new Request(`http://localhost${BLOCKED_PATH}`, { headers: cookie ? { cookie: `ankanu_session=${cookie}` } : {} })
  }

  it('is an account page: signed out goes to sign-in; staff and mahram stubs are refused', async () => {
    expect(entryLocation(BLOCKED_PATH, 'anon')).toBe('/auth')
    expect(entryLocation(BLOCKED_PATH, 'account')).toBeNull()
    const page = await GET(request('web'))
    expect(page.status).toBe(200)
    expect(page.headers.get('cache-control')).toBe('no-store')
    expect(await page.text()).toContain('id="blocked-list-page"')
    const anon = await GET(request())
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://localhost/auth')
    for (const cookie of ['staff', 'mahram']) {
      expect((await GET(request(cookie))).status, cookie).toBe(403)
    }
  })
})
