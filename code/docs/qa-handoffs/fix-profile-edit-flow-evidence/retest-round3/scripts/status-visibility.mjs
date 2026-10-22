import { launch, memberContext, sleep, BASE, SC, EV } from './lib.mjs'
import { readFileSync, appendFileSync } from 'node:fs'
const browser = await launch()
for (const [w, h] of [[390, 800], [1440, 900]]) {
  const ctx = await memberContext(browser, 'bro1', { width: w, height: h })
  await ctx.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(`${SC}/tw3/shim.union.js`, 'utf8') }))
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '.material-symbols-outlined{display:inline-block;width:1.25em;height:1.25em;overflow:hidden;font-size:24px;color:transparent}' }))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value))
  await page.fill('#origin', 'Frère QA 2')
  await page.locator('#profile-pin').scrollIntoViewIfNeeded()
  await page.locator('label:has(#profile-pin)').first().click()
  await sleep(1500)
  const r = await page.evaluate(() => { const s = document.getElementById('profile-save-status'); const b = s.getBoundingClientRect(); const sw = document.getElementById('profile-pin').closest('label').getBoundingClientRect(); return { text: s.textContent, statusTop: Math.round(b.top), statusBottom: Math.round(b.bottom), switchTop: Math.round(sw.top), viewportH: innerHeight, statusInViewport: b.top >= 0 && b.bottom <= innerHeight, scrollY: Math.round(scrollY) } })
  const line = `[${w}x${h}] refused pre-PIN save: ${JSON.stringify(r)}`
  console.log(line); appendFileSync(`${EV}/brother-pin-switch.txt`, line + '\n')
  await page.screenshot({ path: `${EV}/pin-switch-error-visibility-${w}.png` })
  await ctx.close()
}
await browser.close()
