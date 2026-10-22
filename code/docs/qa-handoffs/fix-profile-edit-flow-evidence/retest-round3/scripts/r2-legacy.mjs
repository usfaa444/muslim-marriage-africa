// AC5 retest in a real browser: a LOCKED session with a stored four-digit PIN reaches /pin (AC6) and unlocks with four digits and the button.
import { launch, memberContext, watch, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'r3leg'; const width = Number(process.argv[3] ?? 390)
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, label, { width, height: 800 })
const cookie = (await ctx.cookies())[0]; const hdr = { cookie: `${cookie.name}=${cookie.value}`, 'content-type': 'application/json' }
const api = async (m, p, b) => { const r = await fetch(`${BASE}${p}`, { method: m, headers: hdr, body: b ? JSON.stringify(b) : undefined }); return `${r.status} ${(await r.text()).slice(0, 170)}` }
const page = await ctx.newPage(); const log = []; watch(page, log)
const calls = []
page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/v1/pin') && r.method() !== 'GET') calls.push(`${r.method()} ${u.pathname} ${r.postData() ?? ''}`) })
const status = () => page.evaluate(() => document.getElementById('pin-status-text')?.textContent)
const key = (d) => page.locator(`[data-key="${d}"]`).click()
say(`[${width}] stored PIN state: ${await api('GET', '/v1/pin')}`)
say(`[${width}] lock: ${await api('POST', '/v1/pin/lock')}`); await sleep(7000)
await page.goto(`${BASE}/decouvrir`, { waitUntil: 'load' })
say(`[${width}] locked, open /decouvrir -> ${new URL(page.url()).pathname}${new URL(page.url()).search}`)
for (const d of '1234') await key(d)
await sleep(900)
say(`[${width}] 4 digits typed: calls=${JSON.stringify(calls)} status="${await status()}" url=${new URL(page.url()).pathname}`)
await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
await page.waitForURL('**/decouvrir', { timeout: 10000 }).catch(() => {})
say(`[${width}] after "Déverrouiller l'espace": url=${new URL(page.url()).pathname} calls=${JSON.stringify(calls)}`)
say(`[${width}] pin state after: ${await api('GET', '/v1/pin')}`); await sleep(7000)
// New six-digit PIN retires the four-digit one (API)
say(`[${width}] PUT /v1/pin 1234 (4 digits): ${await api('PUT', '/v1/pin', { pin: '1234' })}`); await sleep(7000)
say(`[${width}] PUT /v1/pin 135790: ${await api('PUT', '/v1/pin', { pin: '135790' })}`); await sleep(7000)
say(`[${width}] lock: ${await api('POST', '/v1/pin/lock')}`); await sleep(7000)
say(`[${width}] unlock with the old 1234: ${await api('POST', '/v1/pin/unlock', { pin: '1234' })}`); await sleep(7000)
say(`[${width}] unlock with 135790: ${await api('POST', '/v1/pin/unlock', { pin: '135790' })}`)
say(`[${width}] problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_NAME_NOT_RESOLVED|recaptcha|autocomplete|favicon|status of 40|http 40|status of 403/.test(l)))}`)
writeFileSync(`${EV}/r3-legacy-${label}-${width}.txt`, out.join('\n') + '\n')
await browser.close()
