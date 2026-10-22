import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium, devices } from '/home/claude/muslim-marriage-africa/code/node_modules/playwright-core/index.mjs'
const WEB = 'http://localhost:4021'
const SHIM = readFileSync('/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa/tw/cdn-shim.js', 'utf8')
const psql = (q) => execFileSync('docker', ['exec', '-i', 'ankanu-qa-postgres-1', 'psql', '-U', 'ankanu', '-d', 'ankanu', '-At', '-c', q], { encoding: 'utf8' }).trim()
async function acct(label, withOtp) {
  const res = await fetch(`${WEB}/v1/accounts`, { method: 'POST', headers: { 'content-type': 'application/json', origin: WEB }, body: JSON.stringify({ email: `qa.${label}@example.bf`, password: 'phrase avec espaces', pseudonym: `Qv${label}`, gender: 'brother', pledge_accepted: true, civil_given_name: 'S', civil_family_name: 'O', recaptcha_token: 'x', coc_version: 'FR-089', dob: '1990-01-15' }) })
  const j = await res.json(); const c = res.headers.getSetCookie()[0].split(';')[0].split('=')[1]
  psql(`update credential set email_verified_at=now() where account_id='${j.id}' and kind='password'`)
  if (withOtp) await fetch(`${WEB}/v1/verifications/otp`, { method: 'POST', headers: { 'content-type': 'application/json', origin: WEB, cookie: `ankanu_session=${c}` }, body: JSON.stringify({ action: 'send', phone_e164: '+22600005555' }) })
  return c
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const out = []
for (const [path, withOtp] of [['/phone', false], ['/otp', true]]) {
  const cookie = await acct(`vit${path.slice(1)}${Date.now() % 100000}`, withOtp)
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'fr-FR', baseURL: WEB })
  await ctx.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SHIM }))
  await ctx.addCookies([{ name: 'ankanu_session', value: cookie, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    window.__v = { lcp: 0, cls: 0 }
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
  })
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  let bytes = 0; const reqs = []
  page.on('response', async (r) => { try { const b = (await r.body()).length; bytes += b; reqs.push(`${r.status()} ${r.url().slice(0, 90)} ${b}`) } catch {} })
  const t0 = Date.now()
  await page.goto(path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const v = await page.evaluate(() => window.__v)
  const apiCalls = reqs.filter((r) => r.includes('/v1/'))
  out.push({ path, loadMs: Date.now() - t0, lcpMs: Math.round(v.lcp), cls: +v.cls.toFixed(4), transferKB: Math.round(bytes / 1024), requests: reqs.length, apiCalls })
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(out, null, 1))
writeFileSync(process.env.EV + '/g7-vitals-throttled.json', JSON.stringify(out, null, 1))
