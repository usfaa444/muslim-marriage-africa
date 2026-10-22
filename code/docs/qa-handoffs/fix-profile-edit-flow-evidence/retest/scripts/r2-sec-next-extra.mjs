// Retest finding 2: where does /pin?next=<payload> send a real browser after an accepted PIN? Stubbed unlock, real /pin page from the stack.
import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'r2other'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const ORIGIN = new URL(BASE).origin
const payloads = [
  ['control: plain', '/profile-edit'],
  ['URL parse failure: //[', '//['],
  ['URL parse failure: //[::1', '//[::1'],
  ['IPv6 host //[::1]/x', '//[::1]/x'],
  ['userinfo //a@evil.example', '//a@evil.example/x'],
  ['port //evil.example:80', '//evil.example:80/x'],
  ['lone percent', '/%'],
  ['percent-encoded slash /%2F/evil', '/%2F/evil.example'],
  ['/%09/ (encoded tab kept literal by the page)', '/%09/evil.example'],
  ['/%0A/', '/%0A/evil.example'],
  ['/%5C evil', '/%5Cevil.example'],
  ['long path 3000 chars', '/' + 'a'.repeat(3000)],
  ['emoji path', '/\u{1F600}'],
  ['RTL override', '/\u202E/evil.example'],
  ['zero-width space', '/\u200B/evil.example'],
  ['BOM', '/\uFEFF/evil.example'],
  ['null byte only', '/\u0000'],
  ['tab only after slash then path', '/\tprofile-edit'],
  ['bare slash then LF then path', '/\nprofile-edit'],
  ['javascript with leading slash', '/javascript:alert(1)'],
  ['backslash then slash', '\\/evil.example'],
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
