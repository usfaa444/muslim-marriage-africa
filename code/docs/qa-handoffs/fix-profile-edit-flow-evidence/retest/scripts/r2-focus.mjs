import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, 'r2other', { width: 390, height: 844 })
const page = await ctx.newPage()
await page.goto(`${BASE}/pin?next=%2Fprofile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => document.querySelectorAll('.pin-dot').length === 6)
const probe = () => page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { el: a.getAttribute('data-key') ?? a.id ?? a.textContent.trim().slice(0, 20), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, shadow: cs.boxShadow.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px,? ?/g, '').trim() || 'none', border: cs.borderColor } })
for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); await sleep(400); say(JSON.stringify(await probe())) }
await page.screenshot({ path: `${EV}/shots/r2-pin-focus-last.png` })
writeFileSync(`${EV}/r2-pin-focus.txt`, out.join('\n') + '\n')
await browser.close()
