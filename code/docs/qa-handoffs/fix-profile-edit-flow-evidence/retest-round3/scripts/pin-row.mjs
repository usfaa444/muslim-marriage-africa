import { launch, memberContext, sleep, BASE, SC, EV } from './lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const browser = await launch(); const out = []
for (const w of [360, 390, 768]) {
  const ctx = await memberContext(browser, 'r3kbd', { width: w, height: 800 })
  const page = await ctx.newPage(); await page.goto(`${BASE}/pin`); await sleep(500)
  const m = await page.evaluate(() => { const row = document.getElementById('pin-display').getBoundingClientRect(); const slots = [...document.querySelectorAll('.pin-slot')].map((s) => s.getBoundingClientRect()); const card = document.getElementById('pin-display').closest('[class*="rounded"]').getBoundingClientRect(); const cs = getComputedStyle(document.getElementById('pin-display').closest('[class*="rounded"]')); return { card: [Math.round(card.left), Math.round(card.right)], padL: cs.paddingLeft, row: [Math.round(row.left), Math.round(row.right)], firstSlotLeft: Math.round(slots[0].left), lastSlotRight: Math.round(slots[5].right), slotW: Math.round(slots[0].width), slotH: Math.round(slots[0].height) } })
  const line = `[${w}] ${JSON.stringify(m)}`; console.log(line); out.push(line)
  await ctx.close()
}
writeFileSync(`${EV}/pin-slot-row-geometry.txt`, out.join('\n') + '\n'); await browser.close()
