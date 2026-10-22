import * as L from './lib.mjs'
import * as B from './br.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')), s3 = JSON.parse(readFileSync('state3.json'))
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }
const browser = await B.launch()
// API failure states
{
  const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage()
  await page.route('**/v1/staff/review/queue', r => r.fulfill({ status: 500, json: { error: { code: 'UNHANDLED', message: 'Request failed', retryable: true } } }))
  await page.goto('/staff/revue'); await page.waitForTimeout(1200)
  P('queue 500 ->', JSON.stringify((await page.getByRole('alert').allTextContents())), '| body has queue region:', await page.getByRole('region', { name: 'Liste des fiches à examiner' }).count())
  await page.screenshot({ path: `${B.EV}/shots/queue-500.png` })
  await page.unroute('**/v1/staff/review/queue'); await page.route('**/v1/staff/review/queue', r => r.abort())
  await page.reload(); await page.waitForTimeout(1200)
  P('queue network fail ->', JSON.stringify((await page.getByRole('alert').allTextContents())))
  await ctx.close()
}
{
  const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage()
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  await page.locator(`#review-queue button[data-account="${s3.K.id}"]`).click(); await page.waitForSelector('[data-testid=case-pose]')
  await page.route('**/v1/staff/review/evidence/*', r => r.fulfill({ status: 503, json: { error: { code: 'UNHANDLED', message: 'La pièce est indisponible.', retryable: true } } }))
  await page.getByRole('button', { name: 'Afficher la pièce' }).click(); await page.waitForTimeout(800)
  P('evidence 503 ->', JSON.stringify(await page.getByRole('alert').allTextContents()))
  await page.unroute('**/v1/staff/review/evidence/*'); await page.route('**/v1/staff/review/evidence/*', r => r.fulfill({ status: 429, json: { error: { code: 'RATE_LIMITED', message: 'Trop de consultations. Réessayez dans une minute.', retryable: true } } }))
  await page.getByRole('button', { name: 'Afficher le selfie' }).click(); await page.waitForTimeout(800)
  P('evidence 429 ->', JSON.stringify(await page.getByRole('alert').allTextContents()))
  await ctx.close()
}
// 200% zoom emulation: viewport 720 wide at DPR2 equivalent => test 1440/2 = 720 css px and 360 css px
{
  const ctx = await B.newCtx(browser, st.mod1.cookie, { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 }); const page = await ctx.newPage()
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  await page.locator(`#review-queue button[data-account="${s3.K.id}"]`).click(); await page.waitForSelector('[data-testid=case-pose]')
  P('200% zoom (720 css px) overflow', JSON.stringify(await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))))
  await page.screenshot({ path: `${B.EV}/shots/zoom200-720.png` })
  await ctx.close()
}
// slow 3G queue load
{
  const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024 })
  await page.setViewportSize({ width: 360, height: 780 })
  const t0 = Date.now(); await page.goto('/staff/revue'); const t1 = Date.now() - t0; await page.waitForSelector('#review-queue button'); P('3G: page load', t1, 'ms; queue visible', Date.now() - t0, 'ms')
  const early = await page.getByTestId('review-counts').textContent(); P('3G counts text', early)
  const t2 = Date.now(); await page.locator(`#review-queue button[data-account="${s3.K.id}"]`).click(); await page.waitForSelector('[data-testid=case-pose]'); P('3G: case opened in', Date.now() - t2, 'ms')
  const bytes = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.transferSize).reduce((a, b) => a + b, 0)); P('3G: resource transfer bytes', bytes)
  const lcp = await page.evaluate(() => new Promise(res => { new PerformanceObserver(l => res(l.getEntries().at(-1).startTime)).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => res(null), 1500) })); P('LCP(ms, stand-in CSS)', lcp)
  await ctx.close()
}
// keyboard-only decision (approve K ID)
{
  const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage()
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  await page.locator(`#review-queue button[data-account="${s3.K.id}"]`).focus(); await page.keyboard.press('Enter'); await page.waitForSelector('[data-testid=case-pose]')
  const trail = []
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); trail.push(await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return (e.getAttribute('aria-label') || e.textContent || e.id || e.tagName).trim().slice(0, 32) + ' [outline ' + cs.outlineStyle + ' ' + cs.outlineWidth + '|shadow ' + (cs.boxShadow !== 'none') + ']' })) }
  P('tab order after case open:', JSON.stringify(trail, null, 1))
  await ctx.close()
}
writeFileSync(B.EV + '/b4-states-zoom-3g-kbd.txt', out.join('\n')); await browser.close()
