// Retest finding 2: where does /pin?next=<payload> send a real browser after an accepted PIN? Stubbed unlock, real /pin page from the stack.
import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'r2other'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const ORIGIN = new URL(BASE).origin
const payloads = [
  ['plain path', '/profile-edit'], ['path with query and hash', '/decouvrir?vue=grille#x'], ['profile id path', '/profil/abc'], ['root', '/'],
  ['protocol-relative //', '//evil.example/x'], ['triple slash', '///evil.example'], ['/\\', '/\\evil.example/x'], ['backslash first', '\\evil.example'], ['double backslash', '\\\\evil.example'],
  ['https absolute', 'https://evil.example/x'], ['HTTPS upper', 'HTTPS://EVIL.EXAMPLE'], ['http: no slashes', 'http:evil.example'], ['javascript:', 'javascript:alert(1)'], ['data:', 'data:text/html,x'], ['bare host', 'evil.example'], ['empty', ''],
  ['/<TAB>/', '/\t/evil.example/x'], ['/<LF>/', '/\n/evil.example/x'], ['/<CR>/', '/\r/evil.example/x'], ['/<TAB>\\', '/\t\\evil.example'], ['/<VT>/', '/\u000b/evil.example'], ['/<FF>/', '/\f/evil.example'], ['/<NUL>/', '/\u0000/evil.example'], ['/<US>/', '/\u001f/evil.example'], ['/<DEL>/', '/\u007f/evil.example'], ['/<CRLF>/', '/\r\n/evil.example'], ['//<TAB>evil', '//\tevil.example'], ['/<TAB><TAB>/', '/\t\t/evil.example'],
  ['dot segment /.//', '/.//evil.example'], ['dot segment /..//', '/..//evil.example'], ['/a/..//', '/a/..//evil.example'], ['encoded dots /%2e%2e//', '/%2e%2e//evil.example'], ['mixed /%2E./ /', '/%2E.//evil.example'], ['/./\\', '/./\\evil.example'], ['/a/./..//', '/a/./..//evil.example'],
  ['literal %2F//', '/%2F/evil.example'], ['literal %2F%2F no slash first', '%2F%2Fevil.example'], ['literal %5C', '/%5Cevil.example'], ['double-encoded', '%252F%252Fevil.example'],
  ['U+2028', '/ /evil.example'], ['NBSP', '/ /evil.example'], ['ideographic space', '/　/evil.example'], ['fullwidth solidus', '/／/evil.example'], ['division slash', '/∕/evil.example'], ['NEL', '/\u0085/evil.example'],
  ['@host', '/@evil.example'], ['query //', '/?//evil.example'], ['hash //', '/#//evil.example'], ['leading space', ' /evil.example'], ['leading TAB', '\t/evil.example'], ['space inside', '/ /evil.example'],
]
const browser = await launch()
const ctx = await memberContext(browser, label, { width: 390, height: 800 })
await ctx.route('**/v1/pin', (r) => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"enabled":true}' }) : r.continue())
await ctx.route('**/v1/pin/unlock', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"locked":false}' }))
let nav = []
await ctx.route((u) => true, async (r) => {
  const req = r.request()
  if (req.isNavigationRequest() && !req.url().includes('/pin?next') && !req.url().includes('/pin?') ) { nav.push(req.url()); await r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' }); return }
  await r.fallback()
})
let leaks = 0
async function run(name, rawQuery) {
  const page = await ctx.newPage()
  nav = []
  await page.goto(`${BASE}/pin?${rawQuery}`, { waitUntil: 'load' })
  for (const d of '135790') await page.locator(`[data-key="${d}"]`).click()
  await sleep(700)
  const dest = nav[nav.length - 1] ?? '(stayed on /pin)'
  let origin = null; try { origin = new URL(dest).origin } catch {}
  const left = origin !== null && origin !== ORIGIN
  if (left) leaks += 1
  say(`${left ? 'LEFT ORIGIN' : 'same origin '} | ${name} | query=${rawQuery.length > 60 ? rawQuery.slice(0, 60) + '…' : rawQuery} | goes to ${dest.replace(ORIGIN, '')}`)
  await page.close()
}
for (const [name, next] of payloads) await run(name, `next=${encodeURIComponent(next)}`)
await run('raw: first next wins, ok then evil', 'next=%2Fprofile-edit&next=%2F%2Fevil.example')
await run('raw: first next wins, evil then ok', 'next=%2F%2Fevil.example&next=%2Fprofile-edit')
await run('raw: no next', 'x=1')
await run('raw: next in hash only', 'x=1#next=//evil.example')
await run('raw: plus sign as space', 'next=/+/evil.example')
await run('raw: unencoded tab char (browser encodes)', 'next=/%09/evil.example')
say(`SUMMARY: ${payloads.length + 6} cases, leaving the origin: ${leaks}`)
writeFileSync(`${EV}/${process.argv[3] ?? 'r2-sec-next-param.txt'}`, out.join('\n') + '\n')
await browser.close()
