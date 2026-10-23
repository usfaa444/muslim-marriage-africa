import * as L from './lib.mjs'
import * as B from './br.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')), s3 = JSON.parse(readFileSync('state3.json')), s2 = JSON.parse(readFileSync('state2.json'))
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }
const browser = await B.launch()
const open = async (cookie, accountId, vp = { width: 1440, height: 900 }) => {
  const ctx = await B.newCtx(browser, cookie, { viewport: vp }); const page = await ctx.newPage(); const bag = {}; B.watch(page, bag)
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  await page.locator(`#review-queue button[data-account="${accountId}"]`).click(); await page.waitForSelector('[data-testid=case-pose]')
  return { ctx, page, bag }
}
// ---------- F1 scenario 1: two moderators, same case (J)
P('=== F1 scenario 1: two Moderators decide the same ID (member J)')
const m1 = await open(st.mod1.cookie, s3.J.id), m2 = await open(st.mod2.cookie, s3.J.id)
const f2 = m2.page.getByTestId('decision-id_document'); await f2.getByLabel('Approuver').check(); await f2.getByRole('button', { name: 'Enregistrer la décision' }).click()
await m2.page.getByRole('status').filter({ hasText: 'Décision enregistrée' }).waitFor(); P('mod2 saved:', (await m2.page.getByRole('status').allTextContents()).join('|'))
const f1 = m1.page.getByTestId('decision-id_document'); await f1.getByLabel('Refuser et demander une nouvelle prise').check(); await f1.getByLabel('Motif du refus').selectOption('expired')
const posts = []; m1.page.on('request', r => { if (r.method() === 'POST' && /decisions/.test(r.url())) posts.push(1) })
await f1.getByRole('button', { name: 'Enregistrer la décision' }).dblclick(); await m1.page.waitForTimeout(1800)
const alerts = await m1.page.getByRole('alert').allTextContents(); P('mod1 alert text:', JSON.stringify(alerts))
const al = m1.page.getByRole('alert').first()
P('alert visible:', await al.isVisible(), '| in viewport:', await al.evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight }), '| focused:', await al.evaluate(e => document.activeElement === e), '| role/aria-live:', await al.evaluate(e => e.getAttribute('role') + '/' + e.getAttribute('aria-live')))
P('POSTs on double click:', posts.length, '| mod1 ID form still present:', await m1.page.getByTestId('decision-id_document').count(), '| ID status badge:', JSON.stringify(await m1.page.getByTestId('review-case').locator('text=/Approuvé|Refusé|En attente/').allTextContents()))
await m1.page.screenshot({ path: `${B.EV}/shots/f1-two-moderators.png` })
P('DB:', L.sql(`select status, coalesce(decision_reason,'-'), decided_by from verification_record where id='${s3.J.idRec}'`), '(mod2 =', st.mod2.id + ')')
P('DB rows for J ID (latest has decision from mod2):', L.sql(`select count(*) from audit_event where action='moderator_verification_decision' and payload->>'account_id'='${s3.J.id}'`), 'audit decision rows')
P('console errors mod1 (409 resource line expected):', JSON.stringify(m1.bag.console))
await m1.ctx.close(); await m2.ctx.close()
// ---------- F1 scenario 2: member retake after the case was opened (K)
P('=== F1 scenario 2: member retakes the selfie after the case was opened (member K)')
const k = await open(st.mod1.cookie, s3.K.id)
const poseBefore = await k.page.getByTestId('case-pose').textContent()
const mk = new L.Client(); mk.jar.set('ankanu_session', s3.K.cookie.split('=')[1])
const ch = await L.challenge(mk); const up = await L.uploadSelfie(mk, ch.json.challenge_id, 'retake'); P('member K retake', up.status, 'new pose', ch.json.pose, 'was', poseBefore)
const fl = k.page.getByTestId('decision-liveness'); await fl.getByLabel('Approuver').check(); await fl.getByRole('button', { name: 'Enregistrer la décision' }).click(); await k.page.waitForTimeout(1800)
P('mod alert text:', JSON.stringify(await k.page.getByRole('alert').allTextContents()))
P('case reloaded: pose shown now =', await k.page.getByTestId('case-pose').textContent(), '(expect', ch.json.pose + ')')
P('history:', JSON.stringify(await k.page.getByTestId('case-history').allTextContents()))
P('DB old selfie status (must stay pending, untouched):', L.sql(`select status, coalesce(decision_reason,'-'), coalesce(decided_by::text,'-') from verification_record where id='${s3.K.liveRec}'`), '| new selfie:', L.sql(`select status from verification_record where id='${up.json.id}'`))
await k.page.screenshot({ path: `${B.EV}/shots/f1-member-retake.png`, fullPage: true })
// F2 French values
P('=== F2 case profile values')
const prof = await k.page.getByTestId('review-case').innerText(); const m = prof.match(/SITUATION MATRIMONIALE[\s\S]{0,40}/i); P('marital block:', JSON.stringify(m?.[0])); P('contains english tokens single/no/ouagadougou(lowercase):', /\bsingle\b/.test(prof), /\bPolygamie\s*\n?no\b/i.test(prof), /ouagadougou/.test(prof))
P('profile section text:', JSON.stringify(prof.slice(prof.indexOf('Profil'), prof.indexOf('Profil') + 420)))
await k.ctx.close()
// F8 queue 500
P('=== F8 queue 500 -> French')
{ const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage(); await page.route('**/v1/staff/review/queue', r => r.fulfill({ status: 500, json: { error: { code: 'UNHANDLED', message: 'Request failed' } } })); await page.goto('/staff/revue'); await page.waitForTimeout(1200); P('alert:', JSON.stringify(await page.getByRole('alert').allTextContents())); await ctx.close() }
// F4 held member + F9 targets
P('=== F4 held member page, F9 targets')
const hid = s2.H.id, email = L.sql(`select email from account where id='${hid}'`)
const h = new L.Client(); await h.post('/v1/sessions', { identifier: email, password: 'phrase membre qa revue', remember_me: false, recaptcha_token: 'test-ok' })
for (const [name, cookie] of [['held H', 'ankanu_session=' + h.jar.get('ankanu_session')], ['rejected J', s3.J.cookie]]) {
  const ctx = await B.newCtx(browser, cookie, { viewport: { width: 390, height: 900 } }); const page = await ctx.newPage(); const bag = {}; B.watch(page, bag)
  await page.goto('/id-liveness'); await page.waitForTimeout(1500)
  const vis = await page.evaluate(() => Object.fromEntries(['Remplacer', 'Activer la caméra', 'Reprendre la capture', 'Confirmer et transmettre'].map(t => [t, [...document.querySelectorAll('button')].filter(b => b.textContent.includes(t)).map(b => { const r = b.getBoundingClientRect(); return `visible=${r.width > 0 && r.height > 0 && getComputedStyle(b).display !== 'none'} disabled=${b.disabled}` })])))
  P(name, 'controls:', JSON.stringify(vis)); P(name, 'notices:', JSON.stringify(await page.locator('[data-testid=id-held]:visible,[data-testid=id-reject]:visible,[data-testid=live-reject]:visible').allTextContents()))
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); P(name, 'overflow', JSON.stringify(o))
  P(name, 'targets <44px:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button, a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== 'none' && (r.height < 44 || r.width < 44) }).map(e => (e.id || e.textContent.trim().slice(0, 30)) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)))))
  await B.axe(page, name + ' @390', out); await page.screenshot({ path: `${B.EV}/shots/member-${name.replace(' ', '-')}-390.png`, fullPage: true })
  P(name, 'console', JSON.stringify(bag.console), 'bad', JSON.stringify(bag.bad)); await ctx.close()
}
// F5 retry-after
P('=== F5 Retry-After')
const c = new L.Client(); c.noRetry = true; const A = st.memberA
const rs = await Promise.all(Array.from({ length: 33 }, () => c.get(`/v1/staff/review/evidence/${A.idRec}`, { cookie: st.op1.cookie.replace(/.*/, st.mod2.cookie) })))
const r429 = rs.find(r => r.status === 429); P('statuses 200/429:', rs.filter(r => r.status === 200).length, rs.filter(r => r.status === 429).length, '| Retry-After:', r429?.headers['retry-after'], '| body:', r429?.json?.error?.message)
writeFileSync(B.EV + '/b7-round2-walk.txt', out.join('\n')); await browser.close()
