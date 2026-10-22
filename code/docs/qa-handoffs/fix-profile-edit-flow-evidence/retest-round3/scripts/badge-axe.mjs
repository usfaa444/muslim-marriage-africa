import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
import AxeBuilder from '/home/claude/ankanu-profile-fix/code/node_modules/@axe-core/playwright/dist/index.mjs'
const browser = await launch()
const out = []
for (const label of (process.env.LABELS ?? 'r3a,r3photo').split(',')) {
  const ctx = await memberContext(browser, label, { width: 390, height: 800 })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.getElementById("dob") && /^\d{4}-/.test(document.getElementById("dob").value), null, { timeout: 8000 }).catch(() => {})
  await sleep(800)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()
  const line = `${label} landed ${new URL(page.url()).pathname} ` + (axe.violations.map((v) => `${v.id} ${v.impact} x${v.nodes.length}`).join('; ') || 'no violations') + ` | pending-photo badge present: ${await page.evaluate(() => !!document.querySelector('.px-2.py-0\\.5.text-soft-gold'))}`
  console.log(line); out.push(line)
  await ctx.close()
}
writeFileSync(`${EV}/r3-profile-edit-axe-pending-badge.txt`, '# Why /profile-edit shows 11 contrast nodes in r3-styled-metrics.json and 10 in round 2: the pre-existing « En revue » photo badge (text-soft-gold, 2:1) exists only for a member with a photo in review (r3photo); r3a has none.\n' + out.join('\n') + '\n')
await browser.close()
