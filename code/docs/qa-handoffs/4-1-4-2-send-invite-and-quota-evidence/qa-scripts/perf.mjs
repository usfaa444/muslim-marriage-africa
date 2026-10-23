import fs from 'node:fs'
import { launch, ctxFor, WEB, EV } from './br.mjs'
const { B, S } = JSON.parse(fs.readFileSync('ids.json'))
const br = await launch(); const ctx = await ctxFor(br, B.cookie, { width: 360, height: 780 }); const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 90 * 1024 })
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await page.addInitScript(() => { window.__v = { lcp: 0, cls: 0 }; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value }).observe({ type: 'layout-shift', buffered: true }) })
const bytes = []; page.on('response', async (r) => { try { bytes.push([r.url().replace(WEB, ''), (await r.body()).length]) } catch {} })
await page.goto(WEB + '/invitations/envoyer/' + S.id); await page.waitForSelector('#invite-form:not([hidden])'); await page.waitForTimeout(2500)
const v = await page.evaluate(() => window.__v)
const t0 = Date.now(); await page.click('#invite-send'); await page.waitForFunction(() => /envoyée/.test(document.querySelector('#invite-status')?.textContent || ''), null, { timeout: 15000 }); const ack = Date.now() - t0
const apiCalls = bytes.filter(([u]) => u.startsWith('/v1/')).map(([u]) => u)
const out = { lcp_ms: Math.round(v.lcp), cls: v.cls, send_ack_ms_slow3g_cpu4x: ack, api_calls: apiCalls, total_bytes: bytes.reduce((a, b) => a + b[1], 0) }
console.log(out); fs.writeFileSync(`${EV}/g7-perf.json`, JSON.stringify(out, null, 1))
const h = await page.request.get(WEB + '/invitations/envoyer/' + S.id); console.log(Object.fromEntries(Object.entries(h.headers()).filter(([k]) => /content-security|x-frame|x-content|referrer|strict|cache-control|permissions/.test(k))))
const api = await fetch('http://127.0.0.1:3000/v1/invites/quota', { headers: { cookie: B.cookie } }); console.log([...api.headers].filter(([k]) => /cache|x-content|strict|frame/.test(k)))
await br.close()
