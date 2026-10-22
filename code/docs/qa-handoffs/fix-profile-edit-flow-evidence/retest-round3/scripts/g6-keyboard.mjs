// G6 manual checks: keyboard-only PIN flow, focus visibility, zoom 200%, live region.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const out = []
const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const mk = async (label, width = 390) => {
  const ctx = await memberContext(browser, label, { width, height: 800 })
  await ctx.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(`${SC}/tw3/shim.union.js`, 'utf8') }))
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '.material-symbols-outlined{display:inline-block;width:1.25em;height:1.25em;overflow:hidden;font-size:24px;line-height:1;white-space:nowrap;color:transparent}' }))
  return ctx
}
// 1. keyboard-only: profile-edit -> type in origin -> Tab to the PIN switch -> Space -> PIN screen -> Tab/Enter six digits
const ctx = await mk('kbd')
const page = await ctx.newPage()
const log = []
watch(page, log)
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value))
await page.focus('#origin'); await page.keyboard.press('Control+A'); await page.keyboard.type('Clavier seul')
// tab forward until the PIN checkbox has focus
let tabs = 0
await page.focus('#origin')
while (tabs < 80) {
  await page.keyboard.press('Tab'); tabs += 1
  const id = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('name') || document.activeElement?.tagName)
  if (id === 'profile-pin') break
}
say(`tabs from #origin to the PIN switch: ${tabs}`)
const focusStyle = await page.evaluate(() => { const i = document.getElementById('profile-pin'); const label = i.closest('label'); const track = i.nextElementSibling; const cs = track ? getComputedStyle(track) : null; return { activeIsPin: document.activeElement === i, trackBoxShadow: cs?.boxShadow, trackOutline: cs?.outlineStyle, ariaLabel: i.getAttribute('aria-label') } })
say(`focus on PIN switch: ${JSON.stringify(focusStyle)}`)
await page.screenshot({ path: `${EV}/g6-focus-pin-switch.png`, clip: { x: 0, y: 0, width: 390, height: 800 } }).catch(() => {})
await page.keyboard.press('Space')
await page.waitForURL(/\/pin\?next=/, { timeout: 10000 })
say(`after Space: ${new URL(page.url()).pathname + new URL(page.url()).search}`)
// 2. PIN screen keyboard only
const order = []
for (let i = 0; i < 16; i += 1) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => { const a = document.activeElement; return (a?.getAttribute('data-key') ?? a?.id ?? a?.textContent?.trim().slice(0, 18) ?? a?.tagName) })) }
say(`tab order on /pin: ${JSON.stringify(order)}`)
const ring = await page.evaluate(() => { const a = document.querySelector('[data-key="1"]'); a.focus(); const cs = getComputedStyle(a); return { outline: cs.outlineStyle + ' ' + cs.outlineWidth, boxShadow: cs.boxShadow } })
say(`focus ring on key 1: ${JSON.stringify(ring)}`)
await page.focus('[data-key="1"]')
const seq = ['1', '3', '5', '7', '9', '0']
for (const d of seq) { await page.focus(`[data-key="${d}"]`); await page.keyboard.press(d === '0' ? 'Enter' : 'Space') }
await page.waitForURL('**/profile-edit', { timeout: 10000 }).catch(() => {})
say(`six digits by keyboard (Space/Enter on keys) -> ${new URL(page.url()).pathname}`)
await sleep(800)
say(`origin after return: ${await page.inputValue('#origin').catch(() => 'n/a')}`)
// 3. a physical keyboard cannot type digits on /pin
await ctx.close()
const ctx2 = await mk('photo1')
const p2 = await ctx2.newPage()
await p2.goto(`${BASE}/pin?next=%2Fprofile-edit`, { waitUntil: 'load' })
await p2.keyboard.type('123456')
await sleep(800)
say(`typing 123456 on a physical keyboard on /pin: url=${new URL(p2.url()).pathname}, dots=${await p2.evaluate(() => [...document.querySelectorAll('.pin-dot')].map((d) => d.style.opacity).join(''))}`)
// 4. 200% zoom (viewport 195 css px is equivalent of 390 at 200%): check overflow
for (const [w, name] of [[180, '200%-of-360'], [195, '200%-of-390']]) {
  await p2.setViewportSize({ width: w, height: 800 })
  await p2.goto(`${BASE}/pin`, { waitUntil: 'load' }); await sleep(300)
  const o = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))
  const o2 = await (async () => { await p2.goto(`${BASE}/profile-edit`, { waitUntil: 'load' }); await sleep(500); return p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })) })()
  say(`zoom ${name}: /pin scrollWidth ${o.sw} vs ${o.iw}; /profile-edit scrollWidth ${o2.sw} vs ${o2.iw}`)
}
// 5. status line is a live region
await p2.setViewportSize({ width: 390, height: 800 })
await p2.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
say(`profile-save-status role=${await p2.getAttribute('#profile-save-status', 'role')} aria-live=${await p2.getAttribute('#profile-save-status', 'aria-live')}`)
say(`problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_BLOCKED_BY_CLIENT/.test(l)))}`)
writeFileSync(`${EV}/g6-keyboard-zoom.txt`, out.join('\n') + '\n')
await browser.close()
