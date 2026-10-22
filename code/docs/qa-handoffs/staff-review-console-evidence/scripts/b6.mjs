import * as B from './br.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')), s2 = JSON.parse(readFileSync('state2.json'))
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }
const browser = await B.launch()
for (const w of [390, 1440]) {
  const ctx = await B.newCtx(browser, st.mod1.cookie, { viewport: { width: w, height: 900 } }); const page = await ctx.newPage()
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  await page.locator(`#review-queue button[data-account="${s2.F.id}"]`).click(); await page.waitForSelector('[data-testid=case-pose]')
  await B.axe(page, `case with decision forms @${w}`, out)
  const small = await page.evaluate(() => [...document.querySelectorAll('main button, main a, main input, main select, main label, main textarea')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44) }).map(e => (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 28) || e.tagName + e.type) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)))
  P(`staff targets <44px @${w}:`, JSON.stringify(small))
  await page.screenshot({ path: `${B.EV}/shots/case-forms-${w}.png`, fullPage: true })
  await ctx.close()
}
writeFileSync(B.EV + '/b6-axe-targets.txt', out.join('\n')); await browser.close()
