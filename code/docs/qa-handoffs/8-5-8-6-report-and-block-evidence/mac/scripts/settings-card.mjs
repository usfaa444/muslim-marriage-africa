// Scope check of the new « Membres bloqués » card on Paramètres: axe on the card only, its link size, and
// whether the page-level violations are on elements this branch changed. usage: node settings-card.mjs <pair.json> <out dir>
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync, writeFileSync } from 'node:fs'
const [pairPath, OUT] = process.argv.slice(2)
const A = JSON.parse(readFileSync(pairPath, 'utf8')).brother
const browser = await chromium.launch(); const rows = []
for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-FR' })
  await ctx.addCookies(A.cookies.map(([name, value]) => ({ name, value, domain: 'localhost', path: '/' })))
  const p = await ctx.newPage(); await p.goto('http://localhost:4012/settings', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready)
  const link = p.locator('a[href="/settings/bloques"]')
  const card = link.locator('xpath=ancestor::*[self::section or self::article or self::div][1]')
  await card.scrollIntoViewIfNeeded()
  const box = await link.boundingBox()
  await card.screenshot({ path: `${OUT}/shots/settings-card-crop-${width}.png` })
  const axe = await new AxeBuilder({ page: p }).include('a[href="/settings/bloques"]').include(await card.evaluate((el) => el.id ? `#${el.id}` : null) ?? 'a[href="/settings/bloques"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  rows.push({ width, linkCount: await link.count(), linkText: (await link.innerText()).replace(/\s+/g, ' '), cardText: (await card.innerText()).replace(/\s+/g, ' ').slice(0, 200), box: box && [Math.round(box.width), Math.round(box.height)], axe: axe.violations.map((v) => `${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`) })
  await ctx.close()
}
await browser.close()
writeFileSync(`${OUT}/settings-card.json`, JSON.stringify(rows, null, 2)); console.log(JSON.stringify(rows, null, 1))
