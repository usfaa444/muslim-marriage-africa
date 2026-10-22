import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
for (const [w, h] of [[360, 640], [360, 780], [390, 844], [768, 1024], [1280, 800], [1440, 900]]) {
  const ctx = await memberContext(browser, process.argv[2] ?? 'r3a', { width: w, height: h })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/pin?next=%2Fprofile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelectorAll('.pin-dot').length === 6)
  await sleep(500)
  const m = await page.evaluate(() => { const r = (id) => { const b = document.getElementById(id)?.getBoundingClientRect(); return b ? { top: Math.round(b.top), bottom: Math.round(b.bottom) } : null }; return { vh: innerHeight, hint: r('status-hint'), submit: r('btn-submit'), docH: document.documentElement.scrollHeight, scrollable: document.documentElement.scrollHeight > innerHeight } })
  // type 4 digits and press the button: in set mode the hint says six digits are needed
  for (const d of '1357') await page.locator(`[data-key="${d}"]`).click()
  await page.locator('#btn-submit').click(); await sleep(300)
  const after = await page.evaluate(() => { const b = document.getElementById('status-hint').getBoundingClientRect(); return { text: document.getElementById('pin-status-text').textContent, top: Math.round(b.top), bottom: Math.round(b.bottom), visible: b.top >= 0 && b.bottom <= innerHeight, scrollY: Math.round(scrollY) } })
  say(`[${w}x${h}] ${JSON.stringify(m)} after 4 digits + button: ${JSON.stringify(after)}`)
  await page.screenshot({ path: `${EV}/shots/r3-pin-hint-${w}x${h}.png` })
  await ctx.close()
}
writeFileSync(`${EV}/r3-pin-hint-position.txt`, out.join('\n') + '\n')
await browser.close()
