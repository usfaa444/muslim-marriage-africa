// AC5 in a real browser: a stored four-digit PIN (2468) unlocks with the button; wrong PINs; lockout after five failures.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'legacy2'
const width = Number(process.argv[3] ?? 360)
const out = []
const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, label, { width, height: 780 })
const page = await ctx.newPage()
const log = []
watch(page, log)
const calls = []
page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/v1/pin') && r.method() !== 'GET') calls.push(`${r.method()} ${u.pathname} ${r.postData() ?? ''}`) })
say(`[${width}] session pin state before: ${await (await ctx.request.get(`${BASE}/v1/pin`)).text()} (a locked session is redirected to /auth by the server, see finding; this run uses a fresh signed-in session)`)
await page.goto(`${BASE}/pin?next=%2Fprofile-edit`, { waitUntil: 'load' })
const key = (d) => page.locator(`[data-key="${d}"]`).click()
const dots = () => page.evaluate(() => [...document.querySelectorAll('.pin-dot')].map((d) => d.style.opacity).join(''))
// 1. four digits alone: nothing is sent
for (const d of '2468') await key(d)
await sleep(800)
say(`[${width}] 4 digits typed: calls=${JSON.stringify(calls)} dots=${await dots()} url=${new URL(page.url()).pathname}`)
// 2. unlock button
await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
await page.waitForURL('**/profile-edit', { timeout: 10000 }).catch(() => {})
say(`[${width}] after unlock button: url=${new URL(page.url()).pathname + new URL(page.url()).search} calls=${JSON.stringify(calls)}`)
const st = await (await ctx.request.get(`${BASE}/v1/pin`)).json()
say(`[${width}] pin state ${JSON.stringify(st)}`)
// 3. wrong PINs then lockout (lock again first)
calls.length = 0
await page.goto(`${BASE}/pin?next=%2Fprofile-edit`, { waitUntil: 'load' })
const wrong = ['1111', '222222', '3333', '444444', '5555']
for (const w of wrong) {
  for (const d of w) await key(d)
  if (w.length === 4) await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
  await sleep(1200)
  say(`[${width}] wrong ${w}: dots after=${await dots()} url=${new URL(page.url()).pathname}`)
  await sleep(6000)
}
say(`[${width}] calls: ${JSON.stringify(calls)}`)
const me = await ctx.request.get(`${BASE}/v1/me/profile`)
say(`[${width}] after lockout /v1/me/profile -> ${me.status()}`)
await page.screenshot({ path: `${EV}/ac5-after-lockout-${width}.png` })
say(`[${width}] visible text on screen after lockout: ${JSON.stringify((await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300))}`)
// does a further attempt tell the member anything?
await key('1'); await key('2'); await key('3'); await key('4'); await key('5'); await key('6'); await sleep(1500)
say(`[${width}] 6 more digits after lockout: url=${new URL(page.url()).pathname} dots=${await dots()} text=${JSON.stringify((await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200))}`)
say(`[${width}] problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_BLOCKED_BY_CLIENT/.test(l)))}`)
writeFileSync(`${EV}/ac5-legacy-${label}-${width}.txt`, out.join('\n') + '\n')
await browser.close()
