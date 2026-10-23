import * as L from './lib.mjs'
import * as B from './br.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')), s3 = JSON.parse(readFileSync('state3.json')), s2 = JSON.parse(readFileSync('state2.json'))
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }
const c = new L.Client(); c.noRetry = true
const browser = await B.launch()
// 1 stale in UI
{
  const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage(); const bag = {}; B.watch(page, bag)
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  await page.locator(`#review-queue button[data-account="${s3.J.id}"]`).click(); await page.waitForSelector('[data-testid=case-pose]')
  const rr = await c.raw('POST', '/v1/staff/review/decisions', { json: { kind: 'id_document', account_id: s3.J.id, record_id: s3.J.idRec, decision: 'reject', reason: 'expired' }, cookie: st.mod2.cookie.replace(/.*/, 'x') })
  // mod2 session was deleted earlier; use mod1 API
  const r2 = await c.raw('POST', '/v1/staff/review/decisions', { json: { kind: 'id_document', account_id: s3.J.id, record_id: (await c.get(`/v1/staff/review/cases/${s3.J.id}`, { cookie: st.mod1.cookie })).json.id_document.record_id, decision: 'reject', reason: 'expired' }, cookie: st.mod1.cookie }); P('side decision', r2.status)
  const f = page.getByTestId('decision-id_document'); await f.getByLabel('Approuver').check()
  await f.getByRole('button', { name: 'Enregistrer la décision' }).click(); await page.waitForTimeout(1500)
  P('stale UI alert ->', JSON.stringify(await page.getByRole('alert').allTextContents()), 'status ->', JSON.stringify(await page.getByRole('status').allTextContents()))
  await page.screenshot({ path: `${B.EV}/shots/stale-409-real.png` })
  P('ID form after 409:', await page.getByTestId('decision-id_document').count(), '| history:', JSON.stringify(await page.getByTestId('case-history').allTextContents()))
  P('bad (expected 409 only):', JSON.stringify(bag.bad), 'console:', JSON.stringify(bag.console))
  await ctx.close()
}
// 2 member J page
const jctx = await B.newCtx(browser, s3.J.cookie)
const jp = await jctx.newPage(); const bag = {}; B.watch(jp, bag)
await jp.goto('/id-liveness'); await jp.waitForTimeout(1500)
P('member URL', jp.url())
P('notices:', JSON.stringify(await jp.locator('[data-testid=id-reject],[data-testid=live-reject],[data-testid=hold-notice]').allTextContents()))
P('pose card:', JSON.stringify(await jp.getByTestId('pose-card').allTextContents()))
for (const w of B.WIDTHS) { await jp.setViewportSize({ width: w, height: 900 }); const o = await jp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); P(`member id-liveness@${w} sw=${o.sw} iw=${o.iw}`); await jp.screenshot({ path: `${B.EV}/shots/member-idlive-${w}.png`, fullPage: true }) }
await jp.setViewportSize({ width: 390, height: 900 })
await B.axe(jp, 'member id-liveness 390', out)
P('"pay|Premium|payer|paiement" text on page:', /pay|premium|paiement/i.test(await jp.locator('body').innerText()))
P('console', JSON.stringify(bag.console), 'bad', JSON.stringify(bag.bad), 'storage', JSON.stringify(await jp.evaluate(() => ({ ls: Object.keys(localStorage), ss: Object.keys(sessionStorage) }))))
// touch targets
const small = await jp.evaluate(() => [...document.querySelectorAll('button, a, input, select, label[for]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44) }).map(e => (e.id || e.textContent.trim().slice(0, 30)) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)))
P('member page targets <44px:', JSON.stringify(small))
await jctx.close()
// 3 hold notice
const hid = s2.H.id; const email = L.sql(`select email from account where id='${hid}'`)
const h = new L.Client(); let r = await h.post('/v1/sessions', { identifier: email, password: 'phrase membre qa revue', remember_me: false, recaptcha_token: 'test-ok' }); P('H login', r.status)
const hctx = await B.newCtx(browser, 'ankanu_session=' + h.jar.get('ankanu_session')); const hp = await hctx.newPage(); B.watch(hp, {})
await hp.goto('/id-liveness'); await hp.waitForTimeout(1500); P('H url', hp.url()); P('H body:', (await hp.locator('main').innerText().catch(() => hp.locator('body').innerText())).replace(/\s+/g, ' ').slice(0, 700))
await hp.setViewportSize({ width: 390, height: 900 }); await hp.screenshot({ path: `${B.EV}/shots/member-held-390.png`, fullPage: true })
writeFileSync(B.EV + '/b3-stale-member.txt', out.join('\n')); await browser.close()
