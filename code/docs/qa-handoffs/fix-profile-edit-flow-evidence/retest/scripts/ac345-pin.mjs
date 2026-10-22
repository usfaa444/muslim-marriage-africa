// AC3, AC4, AC5 in a real browser: edit without saving, turn on the PIN, set a six-digit PIN, come back.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'pinweb'
const width = Number(process.argv[3] ?? 360)
const out = []
const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, label, { width, height: 780 })
const page = await ctx.newPage()
const log = []
watch(page, log)
const calls = []
page.on('request', (r) => {
  const u = new URL(r.url())
  if (u.pathname === '/v1/me/profile' && r.method() !== 'GET') calls.push({ t: Date.now(), kind: `${r.method()} /v1/me/profile`, body: r.postData() })
  if (u.pathname === '/v1/pin' && r.method() === 'PUT') calls.push({ t: Date.now(), kind: 'PUT /v1/pin', body: r.postData() })
  if (u.pathname === '/v1/pin/unlock') calls.push({ t: Date.now(), kind: 'POST /v1/pin/unlock', body: r.postData() })
  if (r.isNavigationRequest()) calls.push({ t: Date.now(), kind: `NAV ${u.pathname}${u.search}`, body: null })
})
const ORIGIN = 'Kadiogo – Ouaga ébène ñ 日本 <b>x</b>'
const BIO = 'Texte non enregistré — vérifié par QA. “Guillemets” & accents éàçù.'
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => document.getElementById('profile-meter-percent') && document.getElementById('profile-pin') && document.getElementById('dob').value === '1990-01-15', null, { timeout: 15000 })
say(`[${width}] profile loaded; pin switch checked=${await page.locator('#profile-pin').isChecked()}`)
await page.fill('#origin', ORIGIN)
await page.fill('#bio', BIO)
await page.selectOption('#education', 'licence')
say(`[${width}] typed origin/bio/education without saving`)
calls.length = 0
await page.locator('label:has(#profile-pin)').first().click({ trial: false }).catch(async () => { await page.locator('#profile-pin').check({ force: true }) })
await page.waitForURL(/\/pin\?next=/, { timeout: 15000 })
say(`[${width}] url after PIN switch: ${page.url().replace(BASE, '')}`)
const putProfile = calls.filter((c) => c.kind === 'PUT /v1/me/profile')
say(`[${width}] saves before /pin: ${putProfile.length}; body has typed origin: ${putProfile[0]?.body?.includes('Kadiogo') ?? false}; bio: ${putProfile[0]?.body?.includes('Texte non enregistré') ?? false}; education: ${putProfile[0]?.body?.includes('licence') ?? false}`)
say(`[${width}] sequence: ${calls.map((c) => c.kind).join(' -> ')}`)
// /pin screen
const dots = await page.locator('.pin-dot').count()
say(`[${width}] pin dots on screen: ${dots}`)
const key = (d) => page.locator(`[data-key="${d}"]`).click()
calls.length = 0
for (const d of ['4', '8', '2', '9']) await key(d)
const opacity = () => page.evaluate(() => [...document.querySelectorAll('.pin-dot')].map((d) => d.style.opacity))
say(`[${width}] after 4 digits dots=${JSON.stringify(await opacity())}`)
await page.locator('#btn-submit').click()
await sleep(1500)
say(`[${width}] after 4 digits + 'Déverrouiller l'espace': url=${page.url().replace(BASE, '')} PUT /v1/pin sent=${calls.some((c) => c.kind === 'PUT /v1/pin')} dots=${JSON.stringify(await opacity())}`)
await key('1')
await sleep(1200)
say(`[${width}] after 5 digits: url=${page.url().replace(BASE, '')} PUT sent=${calls.some((c) => c.kind === 'PUT /v1/pin')} dots=${JSON.stringify(await opacity())}`)
await page.screenshot({ path: `${EV}/ac5-pin-5dots-${width}.png` })
await key('6')
await page.waitForURL('**/profile-edit', { timeout: 15000 })
const putPin = calls.filter((c) => c.kind === 'PUT /v1/pin')
say(`[${width}] after 6th digit: PUT /v1/pin x${putPin.length} body=${putPin[0]?.body}; now at ${page.url().replace(BASE, '')}`)
say(`[${width}] sequence on pin screen: ${calls.map((c) => c.kind).join(' -> ')}`)
await page.waitForFunction(() => document.getElementById('dob').value === '1990-01-15' && document.getElementById('profile-pin').checked, null, { timeout: 15000 })
await sleep(500)
const back = await page.evaluate(() => ({ origin: document.getElementById('origin').value, bio: document.getElementById('bio').value, education: document.getElementById('education').value, pin: document.getElementById('profile-pin').checked }))
say(`[${width}] back on profile-edit: ${JSON.stringify(back)}`)
say(`[${width}] edits kept: origin=${back.origin === ORIGIN} bio=${back.bio === BIO} education=${back.education === 'licence'} pinOn=${back.pin}`)
await page.screenshot({ path: `${EV}/ac3-return-${width}.png` })
// Persisted? read the API with a fresh request context (no page state).
const api = await ctx.request.get(`${BASE}/v1/me/profile`)
const prof = await api.json()
say(`[${width}] API says origin=${JSON.stringify(prof.origin)} education=${JSON.stringify(prof.education)} bio_pending=${JSON.stringify(prof.bio_pending)}; cache-control=${api.headers()['cache-control']}`)
const pinState = await (await ctx.request.get(`${BASE}/v1/pin`)).json()
say(`[${width}] API pin state ${JSON.stringify(pinState)}`)
say(`[${width}] console/network problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_BLOCKED_BY_CLIENT/.test(l)))}`)
writeFileSync(`${EV}/ac345-pin-${label}-${width}.txt`, out.join('\n') + '\n')
await browser.close()
