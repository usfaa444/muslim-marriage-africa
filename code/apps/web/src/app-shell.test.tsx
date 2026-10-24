import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GET as getDiscussions } from '../app/discussions/route.js'
import { GET as getInvitations } from '../app/invitations/route.js'
import { GET as getProfil } from '../app/profil/route.js'
import {
  APP_SHELL_STYLE,
  appFooter,
  appHeader,
  bottomNav,
  NAV_BADGE_SCRIPT,
  NAV_HREFS,
  readNavDesign,
  stripStitchChrome,
  withAppShell,
  type NavSection,
} from './app-shell.js'
import { DISCOVER_EYEBROW, discoverHtml } from './discover-page.js'
import { favouritesHtml } from './favourites-page.js'
import { inviteComposeHtml } from './invite-compose-page.js'
import { inviteInboxHtml } from './invite-inbox-page.js'
import { LandingPage } from './landing.js'
import { chatThreadHtml, discussionsHtml } from './discussions-page.js'
import { notListablePage } from './not-listable.js'
import { profileDetailHtml, type ProfileDetailView } from './profile-detail.js'
import { staffHomeHtml, staffSignInHtml } from './staff-pages.js'
import { staffReviewHtml } from './staff-review-page.js'
import {
  authHtml,
  emailHtml,
  idHtml,
  identityHtml,
  onboardingHtml,
  otpHtml,
  phoneHtml,
  photoHtml,
  pinHtml,
  profileHtml,
  pseudonymHtml,
  resetHtml,
  reviewHtml,
  settingsHtml,
  statusHtml,
} from './v2-pages.js'

function stitch(folder: string, name = 'screen.html'): string {
  return readFileSync(fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/${name}`, import.meta.url)), 'utf8')
}

const TARGET = '01990000-0000-7000-8000-000000000099'

const VIEW: ProfileDetailView = {
  profile: {
    id: TARGET,
    pseudonym: 'Aminata_BF',
    age: 29,
    city: 'ouagadougou',
    country: 'BF',
    profession: null,
    marital_status: 'single',
    polygamy_intent: 'no',
    madhhab: 'maliki',
    practice: null,
    life_plans: null,
  },
  verification: { phone: true, id: true, mahram: false },
  photo_blur: true,
  photos: [],
} as ProfileDetailView

type Page = { name: string; html: string; nav: NavSection | null; public?: true }

/**
 * Every in-app page the web serves from Stitch HTML. `nav: null` is a linear flow: signed in (no chrome but the legal
 * line) or, with `public`, signed out (header and footer, story chat-polish).
 */
function pages(): Page[] {
  const discover = [stitch('57-discover'), stitch('57-discover', 'grid.html')] as const
  return [
    { name: '/decouvrir', html: discoverHtml(...discover), nav: 'decouvrir' },
    { name: '/decouvrir (2 filtres)', html: discoverHtml(...discover, null, '', '?city=ouagadougou&practice=assidue'), nav: 'decouvrir' },
    { name: '/favoris', html: favouritesHtml(stitch('17-favourites')), nav: 'decouvrir' },
    { name: '/profil/<id>', html: profileDetailHtml(stitch('15-profile-detail'), VIEW), nav: 'decouvrir' },
    { name: '/profil/<id> (hold)', html: notListablePage(stitch('12-profile-not-yet-public'), { reasons: [] }), nav: 'decouvrir' },
    { name: '/invitations/envoyer/<id>', html: inviteComposeHtml(stitch('18-invite-compose-flash'), TARGET), nav: 'invitations' },
    { name: '/invitations', html: inviteInboxHtml(stitch('19-invite-inbox')), nav: 'invitations' },
    { name: '/discussions', html: discussionsHtml(stitch('20-discussions-list')), nav: 'discussions' },
    { name: '/discussions/<id>', html: chatThreadHtml(stitch('21-chat-thread'), TARGET), nav: 'discussions' },
    { name: '/profile-edit', html: profileHtml(stitch('11-profile-edit')), nav: 'profil' },
    { name: '/profile-review', html: reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 24, bioPending: true }), nav: 'profil' },
    { name: '/settings', html: settingsHtml(stitch('27-settings')), nav: 'profil' },
    { name: '/auth', html: authHtml(stitch('02-auth'), 'login', ''), nav: null, public: true },
    { name: '/signup/account', html: authHtml(stitch('02-auth'), 'signup', ''), nav: null, public: true },
    { name: '/signup/identity', html: identityHtml(stitch('03-age-gate')), nav: null, public: true },
    { name: '/signup/pseudonym', html: pseudonymHtml(stitch('54-pseudonym-dob')), nav: null, public: true },
    { name: '/email-verification', html: emailHtml(stitch('04-email-verification')), nav: null },
    { name: '/phone', html: phoneHtml(stitch('06-otp')), nav: null },
    { name: '/otp', html: otpHtml(stitch('56-otp-alt')), nav: null },
    { name: '/id-liveness', html: idHtml(stitch('07-id-liveness')), nav: null },
    { name: '/password-reset', html: resetHtml(stitch('05-password-reset')), nav: null, public: true },
    { name: '/pin', html: pinHtml(stitch('10-pin-lock')), nav: null },
    { name: '/onboarding', html: onboardingHtml(stitch('08-onboarding')), nav: null },
    { name: '/photo-rules', html: photoHtml(stitch('09-photo-rules')), nav: null },
    { name: '/privacy/status/<ticket>', html: statusHtml(stitch('28-delete-export-status')), nav: null },
  ]
}

function count(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0
}

describe('bottom nav from screen 53', () => {
  const design = readNavDesign(stitch('53-barre-de-navigation'))

  it('keeps the items, order, labels, icons and styling of the design', () => {
    expect(design.items.map((item) => item.label)).toEqual(['Découvrir', 'Invitations', 'Discussions', 'Profil'])
    expect(design.items.map((item) => item.section)).toEqual(['decouvrir', 'invitations', 'discussions', 'profil'])
    expect(design.label).toBe('Navigation principale')
    expect(design.navClass).toContain('bg-[#0B1D36]')
    expect(design.navClass).toContain('rounded-full')
    expect(design.activeClass).toContain('bg-[#C9A86C] text-[#0B1D36]')
    expect(design.idleClass).toContain('text-[#F7F1E3]/80')
    expect(design.idleIconClass).toContain('text-[#C9A86C]')
    // The compass, envelope, speech bubble and person drawn in screen 53.
    expect(design.items[0]?.icon).toContain('polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"')
    expect(design.items[1]?.icon).toContain('polyline points="3 7 12 13 21 7"')
    expect(design.items[2]?.icon).toContain('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')
    expect(design.items[3]?.icon).toContain('circle cx="12" cy="7" r="4"')
    for (const item of design.items) expect(item.icon).toContain('aria-hidden="true"')
  })

  it('links each item and marks only the current section', () => {
    for (const section of ['decouvrir', 'invitations', 'discussions', 'profil'] as const) {
      const nav = bottomNav(section, design)
      expect(count(nav, /<nav\b/g)).toBe(1)
      expect(nav).toContain('aria-label="Navigation principale"')
      expect(count(nav, /aria-current="page"/g)).toBe(1)
      expect(nav).toContain(`href="${NAV_HREFS[section]}" data-nav-item="${section}" aria-current="page"`)
      expect(nav).not.toContain('href="#')
      const hrefs = [...nav.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
      expect(hrefs).toEqual(['/decouvrir', '/invitations', '/discussions', '/profil'])
    }
  })

  it('refuses a design that lost its items', () => {
    expect(() => readNavDesign('<nav aria-label="x"></nav>')).toThrow(/four items/)
    expect(() => readNavDesign('<div></div>')).toThrow(/no <nav>/)
  })

  it('keeps 44 px targets, safe-area padding and room for the bar at the end of the page', () => {
    expect(APP_SHELL_STYLE).toContain('#app-bottom-nav .ank-nav-item { display: flex; align-items: center; flex: 1 1 0; min-width: 0; min-height: 44px;')
    expect(APP_SHELL_STYLE).toContain('env(safe-area-inset-bottom, 0px)')
    expect(APP_SHELL_STYLE).toContain('body.ank-has-nav { padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px)) !important; }')
    expect(APP_SHELL_STYLE).toContain('.ank-footer-link { display: inline-flex; align-items: center; min-height: 44px; min-width: 44px;')
    expect(APP_SHELL_STYLE).toContain('a.ank-brand:focus-visible')
  })
})

describe('app header and footer', () => {
  it('links the brand home on member pages only', () => {
    const member = appHeader({ kind: 'member', active: 'decouvrir' })
    expect(member).toContain('<a class="ank-brand" href="/decouvrir" aria-label="AnKanu, accueil">AnKanu</a>')
    const gated = appHeader({ kind: 'gated' })
    expect(gated).toContain('<span class="ank-brand">AnKanu</span>')
    expect(gated).not.toContain('href=')
  })

  it('prints the year, the brand and the privacy link', () => {
    const footer = appFooter(2026)
    expect(footer).toContain('© 2026 AnKanu')
    expect(footer).toContain('<a class="ank-footer-link" href="/#legal">Confidentialité</a>')
  })

  it('drops Stitch page bars, footers and member navs but keeps content headers', () => {
    const html = `<body><header class="w-full top-0 sticky"><a>x</a></header><main><header class="mb-10">Titre</header><aside class="mt-12">note</aside><nav aria-label="Fil d'Ariane">fil</nav></main><nav aria-label="Navigation mobile"><a>a</a></nav><nav aria-label="Navigation membre"><a>b</a></nav><aside aria-label="Navigation membre" class="fixed"></aside><footer class="w-full border-t">  </footer></body>`
    const stripped = stripStitchChrome(html)
    expect(stripped).toBe(`<body><main><header class="mb-10">Titre</header><aside class="mt-12">note</aside><nav aria-label="Fil d'Ariane">fil</nav></main></body>`)
    const page = `<html><head><meta name="viewport" content="width=device-width"></head>${html}</html>`
    const shelled = withAppShell(page, { kind: 'member', active: 'profil' })
    expect(shelled).toContain('content="width=device-width, viewport-fit=cover"')
    expect(shelled).toContain('<body class="ank-shell ank-has-nav">')
    // Story chat-polish: app screens carry the bottom nav only, no header and no footer.
    expect(shelled).not.toContain('data-app-shell="header"')
    expect(shelled).not.toContain('data-app-shell="footer"')
    expect(shelled.indexOf('data-app-shell="bottom-nav"')).toBeGreaterThan(shelled.indexOf('</main>'))
    const signedIn = withAppShell(page, { kind: 'gated' })
    expect(signedIn).not.toContain('data-app-shell="header"')
    expect(signedIn).not.toContain('data-app-shell="footer"')
    expect(signedIn.indexOf('data-app-shell="legal"')).toBeGreaterThan(signedIn.indexOf('</main>'))
    const signedOut = withAppShell(page, { kind: 'public' })
    expect(signedOut.indexOf('data-app-shell="header"')).toBeLessThan(signedOut.indexOf('<main>'))
    expect(signedOut.indexOf('data-app-shell="footer"')).toBeGreaterThan(signedOut.indexOf('</main>'))
    expect(signedOut).not.toContain('data-app-shell="bottom-nav"')
  })
})

describe('one shell on every in-app page', () => {
  const all = pages()

  for (const page of all) {
    const chrome = page.nav ? `the bottom nav on ${page.nav}, no header, no footer` : page.public ? 'one header, one footer, no bottom nav' : 'no header, no footer, no bottom nav, the privacy link'
    it(`${page.name}: ${chrome}`, () => {
      const html = page.html
      // Story chat-polish (Faycal): header and footer only on the landing page and the signed-out pages.
      expect(count(html, /data-app-shell="header"/g)).toBe(page.public ? 1 : 0)
      expect(count(html, /data-app-shell="footer"/g)).toBe(page.public ? 1 : 0)
      expect(count(html, /<footer\b/g)).toBe(page.public ? 1 : 0)
      expect(count(html, /data-app-shell="legal"/g)).toBe(!page.nav && !page.public ? 1 : 0)
      if (!page.nav && !page.public) expect(html).toContain('<a class="ank-footer-link" href="/#legal">Confidentialité</a>')
      expect(count(html, /<header class="w-full/g)).toBe(0)
      expect(count(html, /aria-label="Navigation (?:mobile|membre)"/g)).toBe(0)
      expect(html).not.toContain('id="discover-desktop-nav"')
      expect(html).not.toContain('id="discover-mobile-nav"')
      expect(count(html, /id="app-shell-style"/g)).toBe(1)
      if (page.nav) {
        expect(count(html, /data-app-shell="bottom-nav"/g)).toBe(1)
        expect(count(html, /aria-label="Navigation principale"/g)).toBe(1)
        expect(count(html, /<nav\b[^>]*aria-current|data-nav-item="[a-z]+" aria-current="page"/g)).toBe(1)
        expect(html).toContain(`data-nav-item="${page.nav}" aria-current="page"`)
        expect(html).not.toContain('aria-label="AnKanu, accueil"')
        expect(html).toMatch(/<body\b[^>]*class="[^"]*ank-has-nav/)
        // The live badges (story chat-polish) ship with every bottom nav, and survive the demo-script strip.
        expect(count(html, /data-nav-badge="invitations"/g)).toBe(1)
        expect(count(html, /data-nav-badge="discussions"/g)).toBe(1)
        expect(html).toContain(NAV_BADGE_SCRIPT)
      } else {
        expect(count(html, /data-app-shell="bottom-nav"/g)).toBe(0)
        expect(count(html, /data-nav-item=/g)).toBe(0)
        expect(html.includes('<span class="ank-brand">AnKanu</span>')).toBe(!!page.public)
        expect(html).not.toMatch(/<body\b[^>]*class="[^"]*ank-has-nav/)
      }
    })
  }

  it('renders the same nav on every member page, and the same header and footer on every signed-out page', () => {
    const members = all.filter((page) => page.nav === 'decouvrir')
    const signedOut = all.filter((page) => page.public)
    const piece = (html: string, marker: string, close: string) => {
      const start = html.lastIndexOf('<', html.indexOf(marker))
      return html.slice(start, html.indexOf(close, start) + close.length)
    }
    const headers = new Set(signedOut.map((page) => piece(page.html, 'data-app-shell="header"', '</header>')))
    const footers = new Set(signedOut.map((page) => piece(page.html, 'data-app-shell="footer"', '</footer>')))
    const navs = new Set(members.map((page) => piece(page.html, 'data-app-shell="bottom-nav"', '</nav></div>')))
    expect(headers.size).toBe(1)
    expect(footers.size).toBe(1)
    expect(navs.size).toBe(1)
  })
})

describe('Discover: one layout for both views', () => {
  const html = discoverHtml(stitch('57-discover'), stitch('57-discover', 'grid.html'))
  const filtered = discoverHtml(stitch('57-discover'), stitch('57-discover', 'grid.html'), null, '', '?city=ouagadougou&practice=assidue')

  it('drops the Stitch sentence and the formal eyebrow, and shows the casual one', () => {
    for (const page of [html, filtered]) {
      expect(page).not.toContain('Consultation sobre des profils engagés')
      expect(page).not.toContain('ESPACE DE CONVENANCE MATRIMONIALE')
      expect(page.toUpperCase()).not.toContain('ESPACE DE CONVENANCE')
      expect(page).toContain(`<span>${DISCOVER_EYEBROW}</span>`)
      expect(DISCOVER_EYEBROW).toBe('Faites connaissance')
      expect(page).toContain('Découvrir selon vos affinités éthiques')
    }
  })

  it('keeps the title, toolbar and toggle outside the swapped card area', () => {
    const main = html.indexOf('<main id="discover-main"')
    const card = html.indexOf('<div id="discover-card"')
    const grid = html.indexOf('<div id="discover-grid"')
    expect(main).toBeGreaterThan(-1)
    for (const marker of ['Faites connaissance', 'data-open-filters="true"', 'data-discover-view="card"', 'data-discover-view="grid"', 'Découverte respectueuse']) {
      const at = html.indexOf(marker)
      expect(at, marker).toBeGreaterThan(main)
      expect(at, marker).toBeLessThan(card)
    }
    expect(card).toBeLessThan(grid)
    expect(count(html, /data-open-filters="true"/g)).toBe(1)
    expect(count(html, /Découverte respectueuse/g)).toBe(1)
    expect(count(html, /La bienséance précède toute démarche de rencontre/g)).toBe(1)
    expect(html.indexOf('La bienséance')).toBeGreaterThan(grid)
  })

  it('draws the toggle state on the server and on every switch', () => {
    expect(html).toContain('data-discover-view="card" aria-label="Affichage unitaire" title="Affichage unitaire" aria-pressed="true"')
    expect(html).toContain('data-discover-view="grid" aria-label="Grille panoramique" title="Grille panoramique" aria-pressed="false"')
    expect(filtered).toContain('data-discover-view="card" aria-label="Affichage unitaire" title="Affichage unitaire" aria-pressed="false"')
    expect(filtered).toContain('data-discover-view="grid" aria-label="Grille panoramique" title="Grille panoramique" aria-pressed="true"')
    expect(html).toContain("syncToggle(mode === 'grid' ? 'grid' : 'card')")
    expect(html).toContain('style="min-width:44px;min-height:44px"')
    expect(html).not.toContain('aria-current="page" aria-label="Grille panoramique"')
  })

  it('keeps the single card markup of screen 57', () => {
    expect(html).toContain(
      '<article id="discover-focus" hidden tabindex="0" data-card-open class="max-w-2xl mx-auto w-full bg-[#FBF8F1] border border-[#E2D4B8] rounded-xl p-6 sm:p-8 flex flex-col gap-6 shadow-none mt-2 min-w-0">',
    )
    expect(html).toContain('data-card-invite')
    expect(html).toContain('Envoyer une invitation Ta')
  })

  it('ships the filters form from screen 14, the search card from screen 13, and a close control', () => {
    for (const page of [html, filtered]) {
      const canvas = page.slice(page.indexOf('id="filters-canvas"'), page.indexOf('</main>', page.indexOf('id="filters-canvas"')))
      expect(canvas).toContain('<form id="filters-form"')
      expect(canvas).toContain('Filtres de convenance')
      expect(canvas).toContain('id="filters-apply"')
      const modal = page.slice(page.indexOf('<div id="filters-modal"'), page.indexOf('id="filters-canvas"'))
      expect(modal).toContain('role="dialog" aria-modal="true"')
      expect(modal).toContain('data-close-filters aria-label="Fermer les filtres"')
    }
    expect(html).toContain("closer = event.target && event.target.closest ? event.target.closest('[data-close-filters]')")
    // Two filters or more: the single card comes from screen 13 (search), the default from screen 57.
    expect(filtered).toContain('data-chip-shell="search"')
    expect(html).toContain('data-chip-shell="discover"')
    expect(filtered).toContain('<section id="discover-focus"')
    expect(html).toContain('<article id="discover-focus"')
  })

  it('hides the shared Discover layout when the hold shows', () => {
    expect(html).toContain('#discover-main[hidden]')
    expect(html).toContain("var discoverMain = document.getElementById('discover-main')")
  })
})

describe('pages that keep their own chrome', () => {
  it('leaves the landing header and footer alone', () => {
    const landing = renderToStaticMarkup(<LandingPage />)
    expect(landing).not.toContain('data-app-shell')
    expect(landing).toContain('<footer id="legal"')
    expect(landing).toContain('Board consultatif')
  })

  it('leaves the staff console alone', () => {
    const source = stitch('52-ts-visit-signals')
    for (const html of [staffHomeHtml(source, null), staffSignInHtml(source, '', null), staffReviewHtml(source, null)]) {
      expect(html).not.toContain('data-app-shell')
      expect(html).not.toContain('Navigation principale')
    }
  })
})

describe('member section routes for a live session', () => {
  async function withGate<T>(run: () => Promise<T>, gate: { status: number; body: unknown } = { status: 200, body: { step: 'account' } }): Promise<T> {
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/v1/accounts/gate')) {
        return new Response(JSON.stringify(gate.body), { status: gate.status, headers: { 'content-type': 'application/json' } })
      }
      return original(input)
    }) as typeof fetch
    try {
      return await run()
    } finally {
      globalThis.fetch = original
    }
  }
  const live = (path: string) => new Request(`http://localhost${path}`, { headers: { cookie: 'ankanu_session=live-session-token' } })

  it('opens Invitations and Discussions inside the shell, and Profil on the member profile', async () => {
    await withGate(async () => {
      const invitations = await getInvitations(live('/invitations'))
      expect(invitations.status).toBe(200)
      expect(invitations.headers.get('content-type')).toContain('text/html')
      const invitationsHtml = await invitations.text()
      expect(invitationsHtml).toContain('data-nav-item="invitations" aria-current="page"')
      // Stories 4.4, 4.5: the Invitations tab is the Invite inbox (screen 19), no longer the title-only placeholder.
      expect(invitationsHtml).toContain("<title>AnKanu • Invitations Ta'aruf</title>")
      expect(invitationsHtml).toContain('role="tablist"')
      const discussions = await getDiscussions(live('/discussions'))
      expect(discussions.status).toBe(200)
      const discussionsPage = await discussions.text()
      expect(discussionsPage).toContain('data-nav-item="discussions" aria-current="page"')
      // Stories 5.1, 5.2: the Discussions tab is the Discussions list (screen 20), no longer the title-only placeholder.
      expect(discussionsPage).toContain("<title>AnKanu • Discussions Ta'aruf</title>")
      const profil = await getProfil(live('/profil'))
      expect(profil.status).toBe(303)
      expect(profil.headers.get('location')).toBe('http://localhost/profile-edit')
    })
  })

  // QA round 2, minor 2: the cookie is checked by the API gate before any page renders, like every member page.
  it('sends an expired or forged session to sign-in, and an unfinished account to its step', async () => {
    await withGate(
      async () => {
        for (const [get, path] of [[getInvitations, '/invitations'], [getDiscussions, '/discussions'], [getProfil, '/profil']] as const) {
          const response = await get(live(path))
          expect(response.status).toBe(303)
          expect(response.headers.get('location')).toBe('http://localhost/auth')
        }
      },
      { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Session non authentifiée.' } } },
    )
    await withGate(
      async () => {
        const response = await getInvitations(live('/invitations'))
        expect(response.status).toBe(303)
        expect(response.headers.get('location')).toBe('http://localhost/phone')
      },
      { status: 200, body: { step: 'phone' } },
    )
    await withGate(
      async () => {
        const response = await getDiscussions(live('/discussions'))
        expect(response.status).toBe(303)
        expect(response.headers.get('location')).toBe('http://localhost/auth')
      },
      { status: 503, body: {} },
    )
  })

  it('keeps stub cookies on the JSON envelope and sends a signed-out visitor to sign-in', async () => {
    for (const get of [getInvitations, getDiscussions, getProfil]) {
      const staff = await get(new Request('http://localhost/invitations', { headers: { cookie: 'ankanu_session=staff' } }))
      expect(staff.headers.get('content-type')).toContain('application/json')
      const mahram = await get(new Request('http://localhost/invitations', { headers: { cookie: 'ankanu_session=mahram' } }))
      expect(mahram.headers.get('content-type')).toContain('application/json')
    }
    const web = await getProfil(new Request('http://localhost/invitations', { headers: { cookie: 'ankanu_session=web' } }))
    expect(web.headers.get('content-type')).toContain('application/json')
    // Stories 5.1, 5.2: the Discussions list renders for the member dev stub like the inbox below.
    const list = await getDiscussions(new Request('http://localhost/discussions', { headers: { cookie: 'ankanu_session=web' } }))
    expect(list.status).toBe(200)
    expect(list.headers.get('content-type')).toContain('text/html')
    // Stories 4.4, 4.5: like the Invite compose page, the inbox renders for the member dev stub (its data loads in
    // the browser, so the API still decides every refusal). A built image ignores stub cookies.
    const inbox = await getInvitations(new Request('http://localhost/invitations', { headers: { cookie: 'ankanu_session=web' } }))
    expect(inbox.status).toBe(200)
    expect(inbox.headers.get('content-type')).toContain('text/html')
    const anon = await getInvitations(new Request('http://localhost/invitations'))
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://localhost/auth')
  })
})
