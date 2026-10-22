// G7: Web Vitals (LCP, CLS), request counts and transfer size on the touched screens under throttled 3G and 4x CPU slowdown.
import { launch, memberContext, sleep, BASE, SC, EV } from './lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const profiles = { 'Slow 3G': { latency: 400, down: 500 * 1024 / 8, up: 500 * 1024 / 8 }, 'Fast 3G': { latency: 150, down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8 } }
for (const [pname, p] of Object.entries(profiles)) {
  for (const [name, path, label] of [['profile-edit', '/profile-edit', 'r2perf'], ['pin', '/pin', 'r2perf'], ['profile-review', '/profile-review', 'r2perf']]) {
    const ctx = await memberContext(browser, label, { width: 360, height: 780 })
    await ctx.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(`${SC}/tw3/shim.union.js`, 'utf8') }))
    await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }))
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.latency, downloadThroughput: p.down, uploadThroughput: p.up })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const reqs = []
    page.on('response', (r) => { const u = new URL(r.url()); if (u.origin === new URL(BASE).origin) reqs.push(`${r.request().method()} ${u.pathname}`) })
    await page.addInitScript(() => {
      window.__v = { lcp: 0, cls: 0 }
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    })
    const t0 = Date.now()
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
    const loadMs = Date.now() - t0
    await sleep(3500)
    const v = await page.evaluate(() => ({ ...window.__v, nav: performance.getEntriesByType('navigation')[0].toJSON() }))
    const counts = {}; for (const r of reqs) counts[r] = (counts[r] || 0) + 1
    say(`${pname} ${name}: landed ${new URL(page.url()).pathname} LCP ${Math.round(v.lcp)} ms, CLS ${v.cls.toFixed(3)}, load event ${loadMs} ms, transferSize(doc) ${v.nav.transferSize} B, requests ${JSON.stringify(counts)}`)
    await ctx.close()
  }
}
writeFileSync(`${EV}/g7-perf.txt`, out.join('\n') + '\n')
await browser.close()
