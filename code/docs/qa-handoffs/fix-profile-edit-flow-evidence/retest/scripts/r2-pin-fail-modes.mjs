// AC4 failure modes: every way the pre-PIN save can fail ends with the member on /profile-edit, the switch off, the edit kept, and the reason beside the switch.
import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const modes = [
  ['network failure', (r) => r.abort('failed')],
  ['503 with JSON error body', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Service indisponible.', details: null, retryable: true } }) })],
  ['503 with HTML body', (r) => r.fulfill({ status: 503, contentType: 'text/html', body: '<html><body>Bad gateway</body></html>' })],
  ['400 with no message', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: '{}' })],
  ['200 OK (control: saves then opens /pin)', (r) => r.continue()],
]
for (const [name, handler] of modes) {
  const ctx = await memberContext(browser, process.argv[2] ?? 'r2b', { width: 390, height: 800 })
  const page = await ctx.newPage()
  let puts = 0; const navs = []
  page.on('request', (r) => { if (r.method() === 'PUT' && r.url().endsWith('/v1/me/profile')) puts++; if (r.isNavigationRequest()) navs.push(new URL(r.url()).pathname) })
  await ctx.route('**/v1/me/profile', (r) => (r.request().method() === 'PUT' ? handler(r) : r.fallback()))
  await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value))
  await page.fill('#origin', `Edit ${name}`)
  await page.locator('label:has(#profile-pin)').first().click()
  await sleep(1500)
  const s = await page.evaluate(() => { const a = document.getElementById('profile-pin-status'); const b = a.getBoundingClientRect(); return { alert: a.textContent, shown: !a.classList.contains('hidden'), inView: b.top >= 0 && b.bottom <= innerHeight, pin: document.getElementById('profile-pin').checked, origin: document.getElementById('origin').value, bottomLine: document.getElementById('profile-save-status').textContent, path: location.pathname } })
  say(`${name}: puts=${puts} ${JSON.stringify(s)} navigations=${JSON.stringify(navs)}`)
  await ctx.close()
}
writeFileSync(`${EV}/r2-pin-fail-modes.txt`, out.join('\n') + '\n')
await browser.close()
