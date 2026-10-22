// Retest finding 6 / AC 6 and finding 7: a PIN-locked session reaches /pin, other member pages go to /pin?next=, sign-in stays open, and the PIN screen says what happened.
import { launch, memberContext, watch, sleep, BASE, EV, cookieFor } from './lib.mjs'
import AxeBuilder from '/home/claude/ankanu-profile-fix/code/node_modules/@axe-core/playwright/dist/index.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const label = process.argv[2] ?? 'r3lock'
const width = Number(process.argv[3] ?? 390)
const out = []; const say = (s) => { out.push(s); console.log(s) }
mkdirSync(`${EV}/shots`, { recursive: true })
const browser = await launch()
const ctx = await memberContext(browser, label, { width, height: 800 })
const PIN = '135790'
const cookie = (await ctx.cookies())[0]
const hdr = { cookie: `${cookie.name}=${cookie.value}`, 'content-type': 'application/json' }
const api = async (method, path, body) => { const r = await fetch(`${BASE}${path}`, { method, headers: hdr, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' }); return { status: r.status, body: await r.text() } }
const page = await ctx.newPage()
const log = []; watch(page, log)
const navs = []
page.on('request', (r) => { if (r.isNavigationRequest()) navs.push(new URL(r.url()).pathname + new URL(r.url()).search) })
const status = () => page.evaluate(() => (document.getElementById('pin-status-text') || {}).textContent)
const role = () => page.evaluate(() => document.getElementById('status-hint')?.getAttribute('role'))
const dots = () => page.evaluate(() => [...document.querySelectorAll('.pin-dot')].filter((d) => d.style.opacity === '1').length)
const type = async (digits) => { for (const d of digits) await page.locator(`[data-key="${d}"]`).click() }
const axe = async (tag) => { const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze(); const v = r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical'); say(`[${width}] axe ${tag}: serious/critical=${v.length} ${v.map((x) => x.id + '(' + x.nodes.length + ')').join(',')} all=${r.violations.map((x) => x.id + ':' + x.impact).join(',')}`) }
// Make the member's PIN state: set once (if not set), then lock.
const st = await api('GET', '/v1/pin'); say(`[${width}] GET /v1/pin -> ${st.status} ${st.body}`)
if (!/"enabled":true/.test(st.body)) { const s = await api('PUT', '/v1/pin', { pin: PIN }); say(`[${width}] PUT /v1/pin -> ${s.status} ${s.body}`); await sleep(7000) }
const lock = async () => { const l = await api('POST', '/v1/pin/lock'); say(`[${width}] POST /v1/pin/lock -> ${l.status} ${l.body}`); await sleep(7000) }
await lock()
const gate = await api('GET', '/v1/accounts/gate'); say(`[${width}] gate for locked session -> ${gate.status} ${gate.body}`)
// 1. another member page
navs.length = 0
await page.goto(`${BASE}/decouvrir`, { waitUntil: 'load' })
say(`[${width}] locked, open /decouvrir -> ${new URL(page.url()).pathname}${new URL(page.url()).search} (navigations: ${navs.join(' > ')})`)
await page.waitForFunction(() => document.querySelectorAll('.pin-dot').length === 6)
say(`[${width}] pin screen: dots=${await page.locator('.pin-dot').count()} status="${await status()}" role=${await role()}`)
await page.screenshot({ path: `${EV}/shots/r3-locked-pin-${width}.png` })
await axe('locked /pin (resting)')
// 2. wrong PIN
await type('111111'); await page.waitForFunction(() => (document.getElementById('pin-status-text') || {}).textContent !== 'Chiffrement et vérification locale sécurisée' && document.getElementById('pin-status-text').textContent !== 'Validation du code en cours...', null, { timeout: 8000 }).catch(() => {})
say(`[${width}] wrong six digits -> status="${await status()}" dotsFilled=${await dots()} url=${new URL(page.url()).pathname}`)
await page.screenshot({ path: `${EV}/shots/r3-locked-wrong-${width}.png` })
await axe('after wrong PIN')
await sleep(7000)
// 3. five digits + unlock button
await type('12345'); await page.locator('#btn-submit').click(); await sleep(400)
say(`[${width}] five digits + button -> status="${await status()}" dotsFilled=${await dots()} (nothing sent)`)
// 4. next key restores resting line
await type('6'); await sleep(1500)
say(`[${width}] sixth digit (123456, wrong) -> status="${await status()}" dotsFilled=${await dots()}`)
await sleep(7000)
// 5. correct PIN returns to /decouvrir
navs.length = 0
await type(PIN)
await page.waitForURL('**/decouvrir', { timeout: 15000 }).catch(() => {})
say(`[${width}] correct PIN -> ${new URL(page.url()).pathname}${new URL(page.url()).search}; page title="${await page.title()}"`)
const gate2 = await api('GET', '/v1/accounts/gate'); say(`[${width}] gate after unlock -> ${gate2.status} ${gate2.body}`)
// 6. query string on the way in
await sleep(7000); await lock()
navs.length = 0
await page.goto(`${BASE}/decouvrir?vue=grille`, { waitUntil: 'load' })
say(`[${width}] locked, open /decouvrir?vue=grille -> ${new URL(page.url()).pathname}${new URL(page.url()).search}`)
await sleep(300)
await type(PIN); await page.waitForURL('**/decouvrir*', { timeout: 15000 }).catch(() => {})
say(`[${width}] after unlock -> ${new URL(page.url()).pathname}${new URL(page.url()).search} (query kept: ${new URL(page.url()).search.includes('vue=grille')})`)
await sleep(7000); await lock()
// 7. /pin directly, /auth and password reset stay open, /profile-edit
for (const p of ['/pin', '/auth', '/password-reset', '/signup', '/profile-edit', '/settings', '/profile-review', '/favoris', '/onboarding', '/']) {
  const r = await fetch(`${BASE}${p}`, { headers: { cookie: hdr.cookie }, redirect: 'manual' })
  say(`[${width}] locked GET ${p} -> ${r.status} ${r.headers.get('location') ?? ''}`)
}
// 8. the sign-in link on the PIN screen
await page.goto(`${BASE}/pin`, { waitUntil: 'load' })
const href = await page.getByRole('link', { name: "S'identifier à nouveau" }).getAttribute('href')
say(`[${width}] "S'identifier à nouveau" href=${href}`)
await page.getByRole('link', { name: "S'identifier à nouveau" }).click(); await sleep(1200)
say(`[${width}] after clicking it -> ${new URL(page.url()).pathname} (locked session on /auth is shown the sign-in form: ${await page.getByRole('button', { name: /Se connecter/ }).count() > 0})`)
// 9. /pin direct unlock without next
await page.goto(`${BASE}/pin`, { waitUntil: 'load' }); await type(PIN); await page.waitForURL((u) => !u.pathname.startsWith('/pin'), { timeout: 15000 }).catch(() => {})
say(`[${width}] /pin without next, correct PIN -> ${new URL(page.url()).pathname}`)
say(`[${width}] problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_NAME_NOT_RESOLVED|recaptcha|autocomplete|favicon|status of 400|status of 404|status of 401/.test(l)))}`)
writeFileSync(`${EV}/r3-locked-${label}-${width}.txt`, out.join('\n') + '\n')
await browser.close()
