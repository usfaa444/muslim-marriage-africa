import * as L from './lib.mjs'
import * as B from './br.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const s3 = JSON.parse(readFileSync('state3.json')); const st = JSON.parse(readFileSync('state.json'))
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }
P('J latest ID row:', L.sql(`select status, coalesce(decision_reason,'-'), decided_by from verification_record where account_id='${s3.J.id}' and kind='id_document' order by id desc limit 1`), '(approved by mod2', st.mod2.id + ')')
P('J audit decisions:', L.sql(`select payload->>'decision', actor_id from audit_event where action='moderator_verification_decision' and payload->>'account_id'='${s3.J.id}'`))
const m = await L.createMember({ photo: false }); const ch = await L.challenge(m)
const browser = await B.launch()
for (const w of [360, 390, 768, 1440]) {
  const ctx = await B.newCtx(browser, m.cookieHeader(), { viewport: { width: w, height: 900 } }); const page = await ctx.newPage()
  await page.goto('/id-liveness'); await page.waitForTimeout(1500)
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))
  const small = await page.evaluate(() => [...document.querySelectorAll('button, a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== 'none' && (r.height < 44 || r.width < 44) }).map(e => (e.id || e.textContent.trim().slice(0, 30)) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)))
  P(`member new @${w}: overflow ${JSON.stringify(o)} targets<44: ${JSON.stringify(small)} pose card: ${await page.getByTestId('pose-card').isVisible()}`)
  if (w === 390) { await B.axe(page, 'member id-liveness 390 (round2)', out); await page.screenshot({ path: `${B.EV}/shots/member-new-390.png`, fullPage: true }) }
  await ctx.close()
}
writeFileSync(B.EV + '/b8-member-targets.txt', out.join('\n')); await browser.close()
