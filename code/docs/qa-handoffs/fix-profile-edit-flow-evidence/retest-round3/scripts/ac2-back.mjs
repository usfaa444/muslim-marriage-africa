// AC2: upload a photo on /profile-edit, land on /profile-review, wait past the 60 s signed-URL TTL, press Back.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'photo1'
const width = Number(process.argv[3] ?? 360)
const waitS = Number(process.argv[4] ?? 65)
const out = []
const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, label, { width, height: 780 })
const page = await ctx.newPage()
const log = []
watch(page, log)
await page.addInitScript(() => { window.addEventListener('pageshow', (e) => console.log('PAGESHOW persisted=' + e.persisted + ' ' + location.pathname)) })
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
const cached = new Set()
cdp.on('Network.requestServedFromCache', (e) => cached.add(e.requestId))
const reqs = new Map()
cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, e.request.url))
const net = []
page.on('response', async (r) => {
  const u = r.url()
  if (u.includes('/v1/media/get') || u.includes('/v1/me/profile') || u.includes('/v1/pin')) {
    const h = r.headers()
    net.push({ t: Date.now(), status: r.status(), url: u.replace(/token=[^&]+/, 'token=…').replace(BASE, ''), cc: h['cache-control'] ?? null, method: r.request().method() })
  }
})
const t0 = Date.now()
const rel = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`
const photosState = () => page.evaluate(() => [...document.querySelectorAll('#profile-photo-grid img')].map((i) => ({ complete: i.complete, w: i.naturalWidth, src: (i.getAttribute('src') || '').replace(/token=[^&]+/, 'token=…') })))
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
say(`[${width}] ${rel()} opened ${new URL(page.url()).pathname}`)
await page.setInputFiles('#profile-photo-file', `${SC}/photo.png`)
await page.waitForURL('**/profile-review', { timeout: 20000 })
say(`[${width}] ${rel()} after upload -> ${new URL(page.url()).pathname}`)
say(`[${width}] ${rel()} waiting ${waitS} s (signed_url_ttl_seconds = 60)`)
await sleep(waitS * 1000)
const mark = net.length
await page.goBack({ waitUntil: 'load' })
say(`[${width}] ${rel()} back -> ${new URL(page.url()).pathname}`)
await page.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length > 0, null, { timeout: 15000 }).catch(() => say('no photo tile appeared'))
await sleep(2500)
const st = await photosState()
say(`[${width}] photos after back: ${JSON.stringify(st)}`)
say(`[${width}] all photos loaded: ${st.length > 0 && st.every((p) => p.complete && p.w > 0)}`)
const afterBack = net.slice(mark)
for (const n of afterBack) say(`[${width}] after-back net: ${n.method} ${n.status} ${n.url} cache-control=${n.cc}`)
const fromCache = [...cached].map((id) => reqs.get(id)).filter((u) => u && (u.includes('/v1/me/profile') || u.includes('/v1/media/get')))
say(`[${width}] requests served from HTTP cache (profile/media): ${JSON.stringify(fromCache.map((u) => u.replace(/token=[^&]+/, 'token=…').replace(BASE, '')))}`)
say(`[${width}] 403/4xx from media: ${JSON.stringify(net.filter((n) => n.url.includes('/media/get') && n.status >= 400))}`)
// Second Back/forward hop: forward to review, wait, back again (no reload).
await page.goForward({ waitUntil: 'load' }).catch(() => {})
say(`[${width}] ${rel()} forward -> ${new URL(page.url()).pathname}`)
await sleep(Math.round(waitS * 1000))
const mark2 = net.length
await page.goBack({ waitUntil: 'load' })
await page.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length > 0, null, { timeout: 15000 }).catch(() => say('no photo tile appeared (2nd)'))
await sleep(2500)
const st2 = await photosState()
say(`[${width}] 2nd back photos: ${JSON.stringify(st2)} all loaded: ${st2.length > 0 && st2.every((p) => p.complete && p.w > 0)}`)
for (const n of net.slice(mark2)) say(`[${width}] 2nd-back net: ${n.method} ${n.status} ${n.url} cache-control=${n.cc}`)
await page.screenshot({ path: `${EV}/ac2-back-${width}.png`, fullPage: false })
say(`[${width}] console/network problems: ${JSON.stringify(log.filter((l) => !/tailwind|tailwindcss|ERR_BLOCKED_BY_CLIENT/.test(l)))}`)
say(`[${width}] pageshow events: ${JSON.stringify(log.filter((l) => l.includes('PAGESHOW')))}`)
writeFileSync(`${EV}/ac2-back-${width}.txt`, out.join('\n') + '\n')
await browser.close()
