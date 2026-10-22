import { launch, memberContext, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, 'r3other', { width: 360, height: 780 })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
const calls = []
page.on('request', (r) => { const u = new URL(r.url()); if (r.method() !== 'GET' && u.pathname.startsWith('/v1/')) calls.push(`${r.method()} ${u.pathname}`) ; if (r.isNavigationRequest()) calls.push(`NAV ${u.pathname}`) })
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value))
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8 })
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await page.fill('#origin', 'Lente 3G')
calls.length = 0
const t0 = Date.now()
await page.locator('label:has(#profile-pin)').first().click()
await page.locator('label:has(#profile-pin)').first().click().catch(() => {})
await page.waitForURL(/\/pin\?next=/, { timeout: 30000 })
say(`Slow 3G: switch tapped twice -> /pin after ${Date.now() - t0} ms; calls=${JSON.stringify(calls)}`)
await page.waitForFunction(() => document.querySelectorAll('.pin-dot').length === 6)
calls.length = 0
const t1 = Date.now()
for (const d of '246801') await page.locator(`[data-key="${d}"]`).click()
for (const d of '99') await page.locator(`[data-key="${d}"]`).click({ timeout: 3000 }).catch(() => {})
await page.waitForURL('**/profile-edit', { timeout: 30000 })
say(`Slow 3G: 6th digit -> /profile-edit after ${Date.now() - t1} ms; calls=${JSON.stringify(calls)}`)
writeFileSync(`${EV}/slow3g-pin-flow.txt`, out.join('\n') + '\n')
await browser.close()
