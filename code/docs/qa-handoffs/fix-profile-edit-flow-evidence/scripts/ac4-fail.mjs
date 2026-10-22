// AC4 failure handling + edge cases in a real browser: refused save, network failure, 503, double tap, Back from /pin, keyboard.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'pinfail'
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
  if (u.pathname === '/v1/me/profile' && r.method() !== 'GET') calls.push(`${r.method()} /v1/me/profile ${r.postData()?.slice(0, 80)}`)
  if (r.isNavigationRequest()) calls.push(`NAV ${u.pathname}${u.search}`)
})
const open = async () => {
  await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.getElementById('dob').value === '1990-01-15' || document.getElementById('dob').value === '2015-06-01', null, { timeout: 15000 })
  await sleep(300)
}
const toggle = () => page.locator('label:has(#profile-pin)').first().click()
const state = () => page.evaluate(() => ({ path: location.pathname + location.search, pin: document.getElementById('profile-pin').checked, dob: document.getElementById('dob').value, origin: document.getElementById('origin').value, status: document.getElementById('profile-save-status').textContent, statusHidden: document.getElementById('profile-save-status').classList.contains('hidden') }))

// 1. Refused save (under-age date of birth): API answers 400 with a message
await open()
await page.fill('#dob', '2015-06-01'); await page.fill('#origin', 'Valeur à garder')
calls.length = 0
await toggle(); await sleep(1500)
say(`[${width}] 1 refused save -> ${JSON.stringify(await state())}`)
say(`[${width}] 1 calls: ${JSON.stringify(calls)}`)
await page.screenshot({ path: `${EV}/ac4-refused-save-${width}.png` })

// 2. Network failure on the pre-PIN save
await page.fill('#dob', '1990-01-15')
await page.route('**/v1/me/profile', (route) => (route.request().method() === 'PUT' ? route.abort('failed') : route.continue()))
calls.length = 0
await toggle(); await sleep(1500)
say(`[${width}] 2 network failure -> ${JSON.stringify(await state())}`)
say(`[${width}] 2 calls: ${JSON.stringify(calls)}`)
await page.unroute('**/v1/me/profile')

// 3. 503 from the API
await page.route('**/v1/me/profile', (route) => (route.request().method() === 'PUT' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UNHANDLED', message: 'Service indisponible.', details: null, retryable: true } }) }) : route.continue()))
calls.length = 0
await toggle(); await sleep(1500)
say(`[${width}] 3 503 -> ${JSON.stringify(await state())}`)
await page.unroute('**/v1/me/profile')

// 4. Double tap with valid edits: one save, one navigation
await page.fill('#origin', 'Double tap')
calls.length = 0
await page.locator('label:has(#profile-pin)').first().dblclick()
await page.waitForURL(/\/pin\?next=/, { timeout: 15000 })
await sleep(800)
say(`[${width}] 4 double tap: calls=${JSON.stringify(calls)}`)

// 5. Back from /pin without setting a PIN: switch must be off, saved edits on the page
await page.goBack({ waitUntil: 'load' })
await page.waitForFunction(() => document.getElementById('dob').value === '1990-01-15', null, { timeout: 15000 })
await sleep(800)
say(`[${width}] 5 back from /pin without PIN -> ${JSON.stringify(await state())}`)

// 6. No edits at all: no save, straight to /pin (reload first so nothing is dirty)
await open()
calls.length = 0
await toggle()
await page.waitForURL(/\/pin\?next=/, { timeout: 15000 })
say(`[${width}] 6 no edits: calls=${JSON.stringify(calls)}`)
await page.goBack({ waitUntil: 'load' }); await sleep(800)

// 7. Keyboard only: focus the switch, press Space
await open()
await page.fill('#origin', 'Clavier')
calls.length = 0
await page.focus('#profile-pin')
await page.keyboard.press('Space')
await page.waitForURL(/\/pin\?next=/, { timeout: 15000 }).catch(() => {})
say(`[${width}] 7 keyboard Space on switch: url=${page.url().replace(BASE, '')} calls=${JSON.stringify(calls)}`)
say(`[${width}] console/network problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_BLOCKED_BY_CLIENT/.test(l)))}`)
writeFileSync(`${EV}/ac4-fail-${label}-${width}.txt`, out.join('\n') + '\n')
await browser.close()
