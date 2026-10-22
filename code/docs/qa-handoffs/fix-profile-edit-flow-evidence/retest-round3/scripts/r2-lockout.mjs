// Finding 7 + lockout in a real browser: four wrong PINs say "Code incorrect.", the fifth says the session is locked, then the session is gone.
import { launch, memberContext, watch, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'r3x'; const width = Number(process.argv[3] ?? 390); const height = Number(process.argv[4] ?? 844)
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, label, { width, height })
const cookie = (await ctx.cookies())[0]; const hdr = { cookie: `${cookie.name}=${cookie.value}`, 'content-type': 'application/json' }
const api = async (m, p, b) => { const r = await fetch(`${BASE}${p}`, { method: m, headers: hdr, body: b ? JSON.stringify(b) : undefined }); return `${r.status} ${(await r.text()).slice(0, 170)}` }
const page = await ctx.newPage(); const log = []; watch(page, log)
const status = () => page.evaluate(() => { const s = document.getElementById('status-hint'); const b = s.getBoundingClientRect(); return { text: document.getElementById('pin-status-text').textContent, inView: b.top >= 0 && b.bottom <= innerHeight, top: Math.round(b.top), vh: innerHeight } })
const filled = () => page.evaluate(() => [...document.querySelectorAll('.pin-dot')].filter((d) => d.style.opacity === '1').length)
const key = (d) => page.locator(`[data-key="${d}"]`).click()
const st = await api('GET', '/v1/pin'); say(`[${width}x${height}] ${st}`)
if (!/"enabled":true/.test(st)) { say(`PUT: ${await api('PUT', '/v1/pin', { pin: '135790' })}`); await sleep(7000) }
say(`lock: ${await api('POST', '/v1/pin/lock')}`); await sleep(7000)
await page.goto(`${BASE}/decouvrir`, { waitUntil: 'load' })
say(`[${width}x${height}] open /decouvrir while locked -> ${new URL(page.url()).pathname}${new URL(page.url()).search}`)
for (let i = 1; i <= 6; i++) {
  for (const d of '000000') await key(d).catch(() => {})
  await sleep(1300)
  say(`[${width}x${height}] wrong PIN #${i}: ${JSON.stringify(await status())} filledDots=${await filled()} url=${new URL(page.url()).pathname}`)
  if (i === 1 || i === 5) await page.screenshot({ path: `${EV}/shots/r3-lockout-${i}-${width}x${height}.png` })
  await sleep(6500)
}
say(`[${width}x${height}] after lockout GET /v1/pin: ${await api('GET', '/v1/pin')}`)
const r = await fetch(`${BASE}/decouvrir`, { headers: { cookie: hdr.cookie }, redirect: 'manual' })
say(`[${width}x${height}] after lockout GET /decouvrir with the same cookie -> ${r.status} ${r.headers.get('location')}`)
const link = await page.getByRole('link', { name: "S'identifier à nouveau" }).boundingBox()
say(`[${width}x${height}] "S'identifier à nouveau" box: ${JSON.stringify(link)} viewportH=${height}`)
say(`[${width}x${height}] problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_NAME_NOT_RESOLVED|recaptcha|autocomplete|favicon|http 40|status of 40/.test(l)))}`)
writeFileSync(`${EV}/r3-lockout-${label}-${width}x${height}.txt`, out.join('\n') + '\n')
await browser.close()
