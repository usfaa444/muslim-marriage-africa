import * as L from './lib.mjs'
import * as B from './br.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')), s3 = JSON.parse(readFileSync('state3.json')), P0 = JSON.parse(readFileSync('memberP.json'))
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }
const c = new L.Client(); c.noRetry = true
const dec = (b, ck = st.mod1.cookie) => c.raw('POST', '/v1/staff/review/decisions', { json: b, cookie: ck })
const WID = [360, 390, 1440]
const browser = await B.launch()
let totalSerious = 0
async function sweep(label, page, extra) {
  for (const w of WID) {
    await page.setViewportSize({ width: w, height: 900 })
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))
    const v = await B.axe(page, `${label} @${w} (overflow ${o.sw <= o.iw ? 'none' : o.sw + '>' + o.iw})`, out)
    totalSerious += v.filter(x => ['serious', 'critical'].includes(x.impact)).length
  }
}
// member states
const mk = async (cookie) => { const ctx = await B.newCtx(browser, cookie); const page = await ctx.newPage(); const bag = {}; B.watch(page, bag); return { ctx, page, bag } }
{ const { ctx, page } = await mk(P0.cookie); await page.goto('/id-liveness'); await page.getByTestId('pose-card').waitFor(); await sweep('id-liveness: ID + selfie steps with pose', page); await ctx.close() }
// rejected both: new member Q
const Q = await L.createMember({ photo: false }); const cap = await L.captureBoth(Q)
await dec({ kind: 'id_document', account_id: Q.id, record_id: cap.id.json.id, decision: 'reject', reason: 'unreadable' }); await dec({ kind: 'liveness', account_id: Q.id, record_id: cap.live.json.id, decision: 'reject', reason: 'pose_not_done' })
{ const { ctx, page } = await mk(Q.cookieHeader()); await page.goto('/id-liveness'); await page.getByTestId('id-reject').waitFor({ state: 'visible' }); P('rejected notices:', JSON.stringify(await page.locator('[data-testid=id-reject]:visible,[data-testid=live-reject]:visible').allTextContents())); await sweep('id-liveness: both refusal notices + new pose', page); await ctx.close() }
// held: H from suspected minor
const H = await L.createMember({ photo: false }); const capH = await L.captureBoth(H)
await dec({ kind: 'id_document', account_id: H.id, record_id: capH.id.json.id, decision: 'suspected_minor' })
{ const { ctx, page } = await mk(H.cookieHeader()); await page.goto('/id-liveness'); await page.getByTestId('id-held').waitFor({ state: 'visible' }); await sweep('id-liveness: held notice', page); await ctx.close() }
// pose expired message (stub the POST) and pose unavailable (503)
{ const R = await L.createMember({ photo: false }); const { ctx, page, bag } = await mk(R.cookieHeader())
  await page.route('**/v1/verifications/liveness', r => r.request().method() === 'POST' ? r.fulfill({ status: 400, json: { error: { code: 'VERIFICATION_RETAKE', message: 'Reprenez la capture.', details: { field: 'challenge_id', reason: 'challenge' }, retryable: true } } }) : r.continue())
  await page.goto('/id-liveness'); await page.getByTestId('pose-card').waitFor()
  await page.locator('input[type=file]').first().setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: L.jpeg('id') })
  await page.locator('#trigger-cam-btn').click(); await page.locator('#pose-countdown').waitFor({ state: 'hidden', timeout: 20000 })
  await page.getByRole('button', { name: /Confirmer et transmettre/ }).click(); await page.waitForTimeout(1500)
  P('expired msg:', await page.locator('#id-error-text').textContent()); await sweep('id-liveness: pose expired message', page)
  await page.unroute('**/v1/verifications/liveness'); await page.route('**/v1/verifications/liveness-challenge', r => r.fulfill({ status: 503, json: { error: { code: 'UNHANDLED', message: 'Request failed', retryable: true } } }))
  await page.getByRole('button', { name: /Reprendre la capture/ }).click(); await page.waitForTimeout(1200)
  P('pose unavailable msg (5xx):', await page.locator('#id-error-text').textContent())
  await page.unroute('**/v1/verifications/liveness-challenge'); await page.route('**/v1/verifications/liveness-challenge', r => r.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', message: 'Vérification du téléphone requise.', details: { required: 'phone_otp' } } } }))
  await page.getByRole('button', { name: /Reprendre la capture/ }).click(); await page.waitForTimeout(1200)
  P('pose 4xx msg:', await page.locator('#id-error-text').textContent())
  await page.unroute('**/v1/verifications/liveness-challenge'); await page.route('**/v1/verifications/liveness-challenge', r => r.abort())
  await page.getByRole('button', { name: /Reprendre la capture/ }).click(); await page.waitForTimeout(1200)
  P('pose network failure msg:', await page.locator('#id-error-text').textContent())
  await sweep('id-liveness: pose unavailable message', page); await ctx.close() }
// staff console states
{ const { ctx, page } = await mk(st.mod1.cookie); await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button'); await sweep('staff: queue', page)
  await page.locator(`#review-queue button[data-account="${s3.K.id}"]`).click(); await page.waitForSelector('[data-testid=case-pose]')
  await page.getByRole('button', { name: 'Afficher la pièce' }).click(); await page.getByRole('button', { name: 'Afficher le selfie' }).click(); await page.getByRole('img', { name: 'Selfie envoyé par le membre' }).waitFor()
  await sweep('staff: case with ID, selfie, decision forms, photo, profile form', page)
  // 409 alert: decide K's ID as mod2 by API, then click approve in UI
  const idr = (await c.get(`/v1/staff/review/cases/${s3.K.id}`, { cookie: st.mod2.cookie })).json.id_document.record_id
  await dec({ kind: 'id_document', account_id: s3.K.id, record_id: idr, decision: 'approve' }, st.mod2.cookie)
  const f = page.getByTestId('decision-id_document'); await f.getByLabel('Approuver').check(); await f.getByRole('button', { name: 'Enregistrer la décision' }).click(); await page.getByRole('alert').filter({ hasText: 'Ce dossier a changé' }).waitFor()
  await sweep('staff: alert after a 409', page); await ctx.close() }
{ const { ctx, page } = await mk(st.op1.cookie); await page.goto('/staff/revue'); await page.getByTestId('review-operator').waitFor(); await sweep('staff: Operator view', page); await ctx.close() }
P('TOTAL serious/critical across all states and widths:', totalSerious)
writeFileSync(B.EV + '/b10-axe-sweep-real-stack.txt', out.join('\n')); await browser.close()
