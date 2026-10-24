import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The chrome of every in-app page (story discover-app-shell). The landing page and the staff console keep their own
 * chrome and never call this module. Story chat-polish (Faycal, 2026-10-24): « Header and footer will only be on the
 * landing page. The actual app screens should not have header and footer. The bottom nav menu is plenty enough. »
 *
 * - Member pages (free navigation): the bottom nav only. « Confidentialité » moved from the footer to Paramètres.
 * - Signed-in, linear steps (email, phone, OTP, PIN, ID, onboarding, photo rules, status): no header, no footer, no
 *   bottom nav; one quiet « Confidentialité » link at the end of the page, so the policy stays one tap away.
 * - Public, signed-out pages (sign up, sign in, password reset): header without a link and footer, as before.
 */

export type NavSection = 'decouvrir' | 'invitations' | 'discussions' | 'profil'

export type ShellOptions = { kind: 'member'; active: NavSection } | { kind: 'gated' } | { kind: 'public' }

export const MEMBER_HOME = '/decouvrir'

/** The design source of the bottom nav (Fay, 2026-10-23). The Dockerfile copies it into the web image. */
export const BOTTOM_NAV_SOURCE = '53-barre-de-navigation/screen.html'

export const NAV_HREFS: Record<NavSection, string> = {
  decouvrir: '/decouvrir',
  invitations: '/invitations',
  discussions: '/discussions',
  profil: '/profil',
}

export const FOOTER_PRIVACY_HREF = '/#legal'

/** The one link the app footer carried, kept for signed-in steps that have no footer and no bottom nav. */
export function legalLine(): string {
  return `<p id="app-legal" data-app-shell="legal" class="ank-legal"><a class="ank-footer-link" href="${FOOTER_PRIVACY_HREF}">Confidentialité</a></p>`
}

/**
 * Paths from the working directory only: the bundler rewrites `new URL(template, import.meta.url)` into one of its own
 * assets, which in `next dev` is not the screen asked for.
 */
function loadStitch(name: string): string {
  const candidates = [
    resolve(process.cwd(), `design-stitch/ankanu-v2/${name}`),
    resolve(process.cwd(), `../design-stitch/ankanu-v2/${name}`),
    resolve(process.cwd(), `../../design-stitch/ankanu-v2/${name}`),
    `/app/design-stitch/ankanu-v2/${name}`,
  ]
  const found = candidates.find((path) => existsSync(path))
  if (!found) {
    throw new Error(`code/design-stitch/ankanu-v2/${name} is not on disk`)
  }
  return readFileSync(found, 'utf8')
}

type NavItem = { section: NavSection; icon: string; label: string }

type NavDesign = {
  navClass: string
  label: string
  activeClass: string
  idleClass: string
  activeIconClass: string
  idleIconClass: string
  items: NavItem[]
}

const SECTIONS = new Set<string>(['decouvrir', 'invitations', 'discussions', 'profil'])

/** Reads items, order, icons, labels and classes from screen 53. Throws when the design no longer has them. */
export function readNavDesign(source: string): NavDesign {
  const nav = /<nav\b([^>]*)>([\s\S]*?)<\/nav>/i.exec(source)
  if (!nav) {
    throw new Error(`${BOTTOM_NAV_SOURCE} has no <nav>`)
  }
  const navAttrs = nav[1] ?? ''
  const navClass = /class="([^"]*)"/.exec(navAttrs)?.[1] ?? ''
  const label = /aria-label="([^"]*)"/.exec(navAttrs)?.[1] ?? 'Navigation principale'
  const items: NavItem[] = []
  let activeClass = ''
  let idleClass = ''
  let activeIconClass = ''
  let idleIconClass = ''
  const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let match = anchor.exec(nav[2] ?? '')
  while (match) {
    const attrs = match[1] ?? ''
    const inner = match[2] ?? ''
    const section = /href="#([a-z]+)"/.exec(attrs)?.[1] ?? ''
    const anchorClass = /class="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const svg = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/i.exec(inner)
    const text = /<span\b[^>]*>([\s\S]*?)<\/span>/i.exec(inner)?.[1]?.trim() ?? ''
    if (!SECTIONS.has(section) || !svg || !text) {
      throw new Error(`${BOTTOM_NAV_SOURCE} item is not a known section: ${section}`)
    }
    const svgAttrs = svg[1] ?? ''
    const iconClass = /class="([^"]*)"/.exec(svgAttrs)?.[1] ?? ''
    const bareSvgAttrs = svgAttrs.replace(/\sclass="[^"]*"/, '')
    if (/aria-current="page"/.test(attrs)) {
      activeClass = anchorClass
      activeIconClass = iconClass
    } else if (!idleClass) {
      idleClass = anchorClass
      idleIconClass = iconClass
    }
    items.push({
      section: section as NavSection,
      icon: `<svg aria-hidden="true" focusable="false"${bareSvgAttrs}>${(svg[2] ?? '').trim()}</svg>`,
      label: text,
    })
    match = anchor.exec(nav[2] ?? '')
  }
  if (items.length !== 4 || !activeClass || !idleClass) {
    throw new Error(`${BOTTOM_NAV_SOURCE} no longer has four items with one selected`)
  }
  return { navClass, label, activeClass, idleClass, activeIconClass, idleIconClass, items }
}

let cachedDesign: NavDesign | null = null

function navDesign(): NavDesign {
  if (!cachedDesign) {
    cachedDesign = readNavDesign(loadStitch('53-barre-de-navigation/screen.html'))
  }
  return cachedDesign
}

/** The label screen 53 gives a section (for example « Invitations »). */
export function navLabel(section: NavSection, design: NavDesign = navDesign()): string {
  return design.items.find((item) => item.section === section)?.label ?? section
}

/** Story chat-polish: the sections that carry a live badge, and what a screen reader hears with the count. */
export const NAV_BADGES = {
  invitations: { one: 'invitation en attente', many: 'invitations en attente' },
  discussions: { one: 'discussion non lue', many: 'discussions non lues' },
} as const
export const NAV_BADGE_CAP = 99
export const BADGES_PATH = '/v1/me/badges'
/** One badge reload at most per burst of events (NFR-005). */
export const BADGE_REFRESH_MS = 300

function badgeSlot(section: NavSection): string {
  if (section !== 'invitations' && section !== 'discussions') {
    return ''
  }
  return `<span class="ank-nav-badge" data-nav-badge="${section}" aria-hidden="true" hidden></span>`
}

/** What a screen reader hears after the label (« Invitations 2 invitations en attente »); empty at 0. */
function badgeWords(section: NavSection): string {
  return section === 'invitations' || section === 'discussions' ? `<span class="ank-sr" data-badge-sr="${section}"></span>` : ''
}

/**
 * Keeps the badges right on every member screen: one small GET on load, on focus and on realtime events (a message
 * delivered or read, an invite received or answered). The Discussions page has its own socket and calls
 * `window.__ankBadges.refresh()`; every other page opens one here. ES5, no backslashes or backticks.
 */
/** The DOM event the nav's socket fires on the page for `chat.receipts`, so Paramètres can follow it live. */
export const RECEIPTS_DOM_EVENT = 'ank:chat-receipts'

export const NAV_BADGE_SCRIPT = `(function () {
  var nav = document.getElementById('app-bottom-nav')
  if (!nav || !window.fetch) return
  var COPY = ${JSON.stringify(NAV_BADGES)}
  var timer = null
  var busy = false
  var again = false
  function paint(name, value) {
    var badge = nav.querySelector('[data-nav-badge="' + name + '"]')
    if (!badge) return
    var count = typeof value === 'number' && value > 0 ? Math.floor(value) : 0
    var words = COPY[name][count > 1 ? 'many' : 'one']
    badge.hidden = count === 0
    badge.setAttribute('data-count', String(count))
    badge.textContent = count === 0 ? '' : count > ${NAV_BADGE_CAP} ? '${NAV_BADGE_CAP}+' : String(count)
    var spoken = nav.querySelector('[data-badge-sr="' + name + '"]')
    if (spoken) spoken.textContent = count === 0 ? '' : (count > ${NAV_BADGE_CAP} ? 'plus de ${NAV_BADGE_CAP}' : String(count)) + ' ' + words
  }
  function load() {
    if (busy) { again = true; return }
    busy = true
    fetch('${BADGES_PATH}', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null })
      .then(function (body) {
        busy = false
        if (body) { paint('invitations', body.invitations); paint('discussions', body.discussions) }
        if (again) { again = false; soon() }
      })
      .catch(function () { busy = false })
  }
  function soon() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () { timer = null; load() }, ${BADGE_REFRESH_MS})
  }
  window.__ankBadges = { refresh: soon }
  var RECEIPTS_EVENT = '${RECEIPTS_DOM_EVENT}'
  function tell(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail })) } catch (error) { /* An old browser: focus still reloads. */ }
  }
  load()
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') soon() })
  window.addEventListener('focus', soon)
  window.addEventListener('pageshow', function (event) { if (event.persisted) soon() })
  if (document.getElementById('chat-app')) return
  var script = document.createElement('script')
  script.src = '/v1/realtime/socket.io.min.js'
  script.async = true
  script.onload = function () {
    if (typeof window.io !== 'function') return
    try {
      var socket = window.io({ path: '/v1/realtime', addTrailingSlash: false, withCredentials: true })
      socket.on('message.delivered', soon)
      socket.on('conversation.read', soon)
      socket.on('invite.changed', soon)
      socket.on('connect', soon)
      // Mac QA round 2: Paramètres follows a « Confirmations de lecture » change made in another window.
      socket.on('chat.receipts', function (payload) { tell(RECEIPTS_EVENT, payload) })
    } catch (error) { /* No realtime: the badges still reload on focus. */ }
  }
  script.onerror = function () { /* No realtime: the badges still reload on focus. */ }
  document.head.appendChild(script)
})()`

/** Screen 53's pill bar, with real links, the current section selected and the live badges. */
export function bottomNav(active: NavSection, design: NavDesign = navDesign()): string {
  const links = design.items
    .map((item) => {
      const on = item.section === active
      const anchorClass = on ? design.activeClass : design.idleClass
      const iconClass = on ? design.activeIconClass : design.idleIconClass
      const icon = item.icon.replace('<svg ', `<svg class="${iconClass}" `)
      const current = on ? ' aria-current="page"' : ''
      const label = on ? `<span class="font-semibold">${item.label}</span>` : `<span>${item.label}</span>`
      return `<a href="${NAV_HREFS[item.section]}" data-nav-item="${item.section}"${current} class="ank-nav-item ${anchorClass}"><span class="ank-nav-icon">${icon}${badgeSlot(item.section)}</span>${label}${badgeWords(item.section)}</a>`
    })
    .join('')
  return `<div id="app-bottom-nav" data-app-shell="bottom-nav"><nav class="ank-nav ${design.navClass}" aria-label="${design.label}">${links}</nav></div><script data-ank-keep>${NAV_BADGE_SCRIPT}</script>`
}

/** Grid view header (screen 57 grid) as the one app header: the AnKanu wordmark on cream. */
export function appHeader(options: ShellOptions): string {
  const brand =
    options.kind === 'member'
      ? `<a class="ank-brand" href="${MEMBER_HOME}" aria-label="AnKanu, accueil">AnKanu</a>`
      : '<span class="ank-brand">AnKanu</span>'
  return `<header id="app-header" data-app-shell="header" class="ank-header"><div class="ank-header-inner"><span class="ank-mark" aria-hidden="true"></span>${brand}</div></header>`
}

export function appFooter(year = new Date().getFullYear()): string {
  return `<footer id="app-footer" data-app-shell="footer" class="ank-footer"><div class="ank-footer-inner"><span class="ank-footer-brand">AnKanu</span><p class="ank-footer-line"><span>© ${year} AnKanu</span><span class="ank-footer-dot" aria-hidden="true">·</span><a class="ank-footer-link" href="${FOOTER_PRIVACY_HREF}">Confidentialité</a></p></div></footer>`
}

const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&amp;family=Plus+Jakarta+Sans:wght@400;500;600&amp;display=swap" rel="stylesheet"/>'

/** Self-contained: the shell looks the same whether or not the page loads Tailwind. Tokens from DESIGN.md. */
export const APP_SHELL_STYLE = `<style id="app-shell-style">
:root { --ank-navy: #0B1D36; --ank-gold: #C9A86C; --ank-cream: #F7F1E3; --ank-hairline: #E2D4B8; }
.ank-header { position: sticky; top: 0; z-index: 30; width: 100%; background: var(--ank-cream); border-bottom: 1px solid rgba(226, 212, 184, 0.6); }
.ank-header-inner { box-sizing: border-box; width: 100%; max-width: 80rem; margin: 0 auto; padding: 0 1rem; height: 4rem; display: flex; align-items: center; gap: 0.625rem; min-width: 0; }
.ank-mark { width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: var(--ank-gold); flex: none; }
.ank-brand { font-family: Newsreader, Georgia, serif; font-size: 1.5rem; line-height: 1; font-weight: 400; letter-spacing: 0.025em; color: var(--ank-navy); text-decoration: none; display: inline-flex; align-items: center; min-height: 44px; transition: color 0.2s; }
a.ank-brand:hover { color: #7D5F27; }
a.ank-brand:focus-visible, .ank-footer-link:focus-visible, .ank-nav-item:focus-visible { outline: 2px solid var(--ank-gold); outline-offset: 2px; border-radius: 6px; }
.ank-footer { width: 100%; margin-top: auto; background: var(--ank-cream); border-top: 1px solid rgba(226, 212, 184, 0.6); }
.ank-footer-inner { box-sizing: border-box; width: 100%; max-width: 80rem; margin: 0 auto; padding: 1.5rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; text-align: center; min-width: 0; }
.ank-footer-brand { font-family: Newsreader, Georgia, serif; font-size: 1.25rem; color: var(--ank-navy); }
.ank-footer-line { margin: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; column-gap: 0.5rem; font-family: "Plus Jakarta Sans", system-ui, sans-serif; font-size: 0.75rem; color: rgba(11, 29, 54, 0.75); }
.ank-footer-link { display: inline-flex; align-items: center; min-height: 44px; min-width: 44px; justify-content: center; color: var(--ank-navy); text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--ank-hairline); }
.ank-footer-link:hover { text-decoration-color: var(--ank-gold); }
.ank-legal { margin: auto 0 0; padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom, 0px)); display: flex; justify-content: center; font-family: "Plus Jakarta Sans", system-ui, sans-serif; font-size: 0.75rem; }
body.ank-shell { min-height: 100vh !important; min-height: 100dvh !important; }
body.ank-has-nav { padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px)) !important; }
#app-bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; justify-content: center; box-sizing: border-box; padding: 0 0.5rem calc(0.5rem + env(safe-area-inset-bottom, 0px)); pointer-events: none; }
#app-bottom-nav .ank-nav { pointer-events: auto; display: flex; align-items: center; width: 100%; max-width: 28rem; box-sizing: border-box; background: var(--ank-navy); color: var(--ank-cream); border: 1px solid rgba(201, 168, 108, 0.25); border-radius: 9999px; padding: 0.375rem; gap: 0.125rem; font-family: "Plus Jakarta Sans", system-ui, sans-serif; }
#app-bottom-nav .ank-nav-item { display: flex; align-items: center; flex: 1 1 0; min-width: 0; min-height: 44px; flex-direction: column; justify-content: center; gap: 0.125rem; padding: 0.375rem 0.25rem; font-size: 0.6875rem; line-height: 1.1; text-align: center; text-decoration: none; border-radius: 9999px; }
#app-bottom-nav .ank-nav-item:not([aria-current]) { color: rgba(247, 241, 227, 0.85); }
#app-bottom-nav .ank-nav-item:not([aria-current]):hover { color: var(--ank-cream); }
#app-bottom-nav .ank-nav-item[aria-current] { background: var(--ank-gold); color: var(--ank-navy); }
#app-bottom-nav .ank-nav-item svg { width: 1rem; height: 1rem; flex: none; }
#app-bottom-nav .ank-nav-item:not([aria-current]) svg { color: var(--ank-gold); }
#app-bottom-nav .ank-nav-item > span:not(.ank-nav-icon):not(.ank-sr) { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#app-bottom-nav .ank-nav-icon { position: relative; display: inline-flex; flex: none; overflow: visible; }
#app-bottom-nav .ank-nav-badge { position: absolute; top: -0.5rem; left: 0.625rem; min-width: 1.125rem; height: 1.125rem; padding: 0 0.3rem; box-sizing: border-box; border-radius: 9999px; background: #FFFFFF; color: var(--ank-navy); border: 1.5px solid var(--ank-navy); font-size: 0.625rem; font-weight: 700; line-height: 1; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; }
#app-bottom-nav .ank-nav-badge[hidden] { display: none; }
.ank-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (min-width: 640px) {
  .ank-header-inner { padding: 0 1.5rem; height: 5rem; }
  .ank-brand { font-size: 1.875rem; }
  #app-bottom-nav { padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); }
  #app-bottom-nav .ank-nav { width: auto; max-width: none; padding: 0.5rem 0.75rem; }
  #app-bottom-nav .ank-nav-item { flex: none; flex-direction: row; gap: 0.5rem; padding: 0.625rem 1.25rem; font-size: 0.875rem; }
}
@media (min-width: 768px) {
  .ank-header-inner, .ank-footer-inner { padding-left: 3rem; padding-right: 3rem; }
}
</style>`

/** End index of the element of `tag` that opens at `start`, counting nested ones; -1 when unbalanced. */
export function balancedEnd(html: string, tag: string, start: number): number {
  const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi')
  token.lastIndex = start
  let depth = 0
  let match = token.exec(html)
  while (match) {
    if (match[0].startsWith('</')) {
      depth -= 1
      if (depth === 0) {
        return match.index + match[0].length
      }
    } else {
      depth += 1
    }
    match = token.exec(html)
  }
  return -1
}

/** Drops every element of `tag` whose opening tag matches `open`, with its content. */
function dropElements(html: string, tag: string, open: RegExp): string {
  let next = html
  let from = 0
  const opener = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
  while (from < next.length) {
    opener.lastIndex = from
    const match = opener.exec(next)
    if (!match) {
      break
    }
    if (!open.test(match[0])) {
      from = match.index + match[0].length
      continue
    }
    const end = balancedEnd(next, tag, match.index)
    if (end < 0) {
      break
    }
    next = next.slice(0, match.index) + next.slice(end)
    from = match.index
  }
  return next
}

/**
 * Removes the page chrome a Stitch export ships: the full-width top bar, the full-width footer and any member nav.
 * Headers and asides inside the content (card headers, notes) stay.
 */
export function stripStitchChrome(html: string): string {
  let next = dropElements(html, 'header', /class="w-full\b/)
  next = dropElements(next, 'footer', /class="w-full\b/)
  next = dropElements(next, 'nav', /aria-label="Navigation (?:mobile|membre|principale)"/)
  next = dropElements(next, 'aside', /aria-label="Navigation membre"/)
  return next
}

function addBodyClass(html: string, name: string): string {
  return html.replace(/<body\b([^>]*)>/i, (full, attrs: string) => {
    if (/\sclass="/.test(attrs)) {
      return `<body${attrs.replace(/\sclass="([^"]*)"/, (_all, value: string) => ` class="${value} ${name}"`)}>`
    }
    return `<body${attrs} class="${name}">`
  })
}

function coverViewport(html: string): string {
  return html.replace(/<meta\b[^>]*name="viewport"[^>]*>/i, (meta) =>
    meta.includes('viewport-fit') ? meta : meta.replace(/content="([^"]*)"/, 'content="$1, viewport-fit=cover"'),
  )
}

/**
 * Puts the page's chrome on, after removing the Stitch chrome: the bottom nav on member pages, the legal line on
 * signed-in steps, the header and the footer on public pages only.
 */
export function withAppShell(html: string, options: ShellOptions): string {
  let next = coverViewport(stripStitchChrome(html))
  const head = `${next.includes('Newsreader') ? '' : FONTS}${APP_SHELL_STYLE}`
  next = next.includes('</head>') ? next.replace('</head>', `${head}</head>`) : `${head}${next}`
  next = addBodyClass(next, options.kind === 'member' ? 'ank-shell ank-has-nav' : 'ank-shell')
  if (options.kind === 'public') {
    const header = appHeader(options)
    next = /<body\b[^>]*>/i.test(next) ? next.replace(/<body\b[^>]*>/i, (body) => `${body}\n${header}`) : `${header}${next}`
  }
  const tail = options.kind === 'member' ? bottomNav(options.active) : options.kind === 'gated' ? legalLine() : appFooter()
  return next.includes('</body>') ? next.replace('</body>', `${tail}</body>`) : `${next}${tail}`
}
