// Retest finding 3: a refused pre-PIN save must be visible beside the PIN switch, in the viewport, announced as an alert.
import { launch, memberContext, watch, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const label = process.argv[2] ?? 'r3b'   // member
const cause = process.argv[3] ?? 'marital' // 'marital': a brother with no marital status; 'dob': an under-age date typed in
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null
const out = []; const say = (s) => { out.push(s); console.log(s) }
mkdirSync(`${EV}/shots`, { recursive: true })
const browser = await launch()
const SIZES = [[360, 780], [390, 800], [768, 1024], [1024, 768], [1280, 800], [1440, 900]]
for (const [w, h] of SIZES) {
  if (only && !only.includes(w)) continue
  const ctx = await memberContext(browser, label, { width: w, height: h })
  const page = await ctx.newPage()
  const log = []; watch(page, log)
  const puts = []
  page.on('request', (r) => { if (r.method() === 'PUT' && r.url().endsWith('/v1/me/profile')) puts.push(1) })
  await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value), null, { timeout: 20000 })
  await sleep(400)
  if (cause === 'dob') await page.fill('#dob', '2015-01-01'); else await page.fill('#origin', 'Frère QA r3')
  // Case A: the member scrolled to the switch like a real member would.
  await page.locator('label:has(#profile-pin)').first().scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => Math.round(scrollY))
  await page.locator('label:has(#profile-pin)').first().click()
  await page.waitForFunction(() => !document.getElementById('profile-pin-status').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {})
  await sleep(500)
  const r = await page.evaluate(() => {
    const s = document.getElementById('profile-pin-status'); const b = s.getBoundingClientRect()
    const sw = document.getElementById('profile-pin').closest('label').getBoundingClientRect()
    const save = document.getElementById('profile-save-status')
    const cs = getComputedStyle(s)
    return { text: s.textContent, role: s.getAttribute('role'), hidden: s.classList.contains('hidden'), top: Math.round(b.top), bottom: Math.round(b.bottom), inView: b.top >= 0 && b.bottom <= innerHeight, switchInView: sw.top >= 0 && sw.bottom <= innerHeight, switchTop: Math.round(sw.top), switchBottom: Math.round(sw.bottom), vh: innerHeight, pinChecked: document.getElementById('profile-pin').checked, bottomLineHidden: save.classList.contains('hidden'), bottomLineText: save.textContent, color: cs.color, fontSize: cs.fontSize, scrollY: Math.round(scrollY), overflow: document.documentElement.scrollWidth > innerWidth, active: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }
  })
  say(`[${w}x${h}] A refused save: ${JSON.stringify({ ...r, scrollBefore: before, puts: puts.length, url: new URL(page.url()).pathname })}`)
  await page.screenshot({ path: `${EV}/shots/r3-pin-alert-${label}-${cause}-${w}.png` })
  // Case B: second tap clears the line first, the refusal brings it back (one more save each time).
  await page.locator('label:has(#profile-pin)').first().click()
  await sleep(1200)
  const again = await page.evaluate(() => ({ hidden: document.getElementById('profile-pin-status').classList.contains('hidden'), text: document.getElementById('profile-pin-status').textContent, pinChecked: document.getElementById('profile-pin').checked }))
  say(`[${w}x${h}] B second tap: ${JSON.stringify({ ...again, puts: puts.length })}`)
  // Case C: fix the cause (marital status), the next tap saves and opens /pin, the line is gone.
  if (cause === 'dob') await page.fill('#dob', '1990-01-15'); else await page.locator('input[name="marital_status"][value="celibataire"]').check({ force: true }).catch(async () => { await page.locator('input[name="marital_status"]').first().check({ force: true }) })
  await page.locator('label:has(#profile-pin)').first().click()
  await page.waitForURL(/\/pin\?next=/, { timeout: 10000 }).catch(() => {})
  say(`[${w}x${h}] C after fixing the cause: url=${new URL(page.url()).pathname}${new URL(page.url()).search} puts=${puts.length}`)
  say(`[${w}x${h}] problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_NAME_NOT_RESOLVED|recaptcha|autocomplete|favicon|status of 400|status of 404/.test(l)))}`)
  await ctx.close()
}
writeFileSync(`${EV}/r3-pin-alert-${label}-${cause}.txt`, out.join('\n') + '\n')
await browser.close()
