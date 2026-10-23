import fs from 'node:fs'
import { launch, ctxFor, WEB, AxeBuilder } from './br.mjs'
const { B, S } = JSON.parse(fs.readFileSync('ids.json'))
const br = await launch(); const ctx = await ctxFor(br, B.cookie); const page = await ctx.newPage()
for (const p of ['/profil/' + S.id, '/decouvrir']) {
  await page.goto(WEB + p); await page.waitForTimeout(2500)
  const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  console.log(p, ax.violations.map((v) => [v.id, v.impact, v.nodes.map((n) => n.target.join(' ')).slice(0, 6)]))
}
// invite page with icon text forced transparent to isolate glyph-only
await page.goto(WEB + '/invitations/envoyer/' + S.id); await page.waitForSelector('#invite-form:not([hidden])')
await page.addStyleTag({ content: '[data-icon]{color:transparent !important}' })
const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
console.log('compose w/ icon glyph text excluded', ax.violations.map((v) => [v.id, v.impact, v.nodes.length]))
const t = await page.locator('main').evaluate(() => [...document.querySelectorAll('h2')].map((e) => [e.textContent.trim(), getComputedStyle(e).textTransform]))
console.log(t)
await br.close()
