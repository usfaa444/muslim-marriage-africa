import * as L from './lib.mjs'
import * as B from './br.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')), s3 = JSON.parse(readFileSync('state3.json'))
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }
const c = new L.Client(); c.noRetry = true
P('--- /staff/revue page gate (no redirect follow)')
for (const [n, ck] of [['signed-out',' '],['forged uuid','ankanu_session=01a165b2-46d8-7568-8d03-62b4d1d5855b'],['stub staff','ankanu_session=staff'],['member sister',st.memberA.cookie],['mahram',st.mahram.cookie],['mfa-pending',st.pend.cookie],['operator',st.op1.cookie],['moderator',st.mod1.cookie]]) {
  const r = await c.get('/staff/revue', { cookie: ck }); P(n.padEnd(14), r.status, r.headers.location ?? '', r.headers['cache-control'] ?? '', r.buf.length)
}
const browser = await B.launch()
// operator page
{
  const ctx = await B.newCtx(browser, st.op1.cookie); const page = await ctx.newPage(); const bag = {}; B.watch(page, bag)
  await page.goto('/staff/revue'); await page.waitForSelector('[data-testid=review-operator]')
  P('operator counts', await page.getByTestId('review-counts').textContent(), '| msg', (await page.getByTestId('review-operator').textContent()).trim())
  P('operator queue buttons', await page.locator('#review-queue button').count())
  P('operator network', bag.reqs.filter(r => /v1/.test(r)).join(' | ')); P('operator bad', JSON.stringify(bag.bad), JSON.stringify(bag.console))
  for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: 800 }); await page.screenshot({ path: `${B.EV}/shots/operator-${w}.png`, fullPage: true }) }
  await B.axe(page, 'operator', out); await ctx.close()
}
// mid-session expiry: delete session in DB while page open
{
  const ctx = await B.newCtx(browser, st.mod2.cookie); const page = await ctx.newPage(); const bag = {}; B.watch(page, bag)
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  await page.locator(`#review-queue button[data-account="${s3.J.id}"]`).click(); await page.waitForSelector('[data-testid=case-pose]')
  const sid = st.mod2.cookie.split('=')[1]
  L.sql(`delete from session where id='${sid}'`)
  await page.getByRole('button', { name: 'Afficher le selfie' }).click()
  await page.waitForURL(/staff\/connexion/, { timeout: 8000 }).then(() => P('session expiry mid-case -> redirected to', page.url())).catch(() => P('session expiry: NO redirect; url', page.url()))
  await ctx.close()
}
// keyboard + decision UX + double submit + 409 refresh (mod1)
{
  const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage(); const bag = {}; B.watch(page, bag)
  await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
  // keyboard: focus first row via tab & Enter
  await page.keyboard.press('Tab'); let steps = 0, found = false
  for (; steps < 40; steps++) { const t = await page.evaluate(() => document.activeElement?.getAttribute('data-account')); if (t) { found = true; break }; await page.keyboard.press('Tab') }
  P('keyboard: reached a queue row after', steps, 'tabs', found)
  await page.keyboard.press('Enter'); await page.waitForSelector('[data-testid=case-pose]')
  P('keyboard open -> focus', await page.evaluate(() => document.activeElement?.tagName))
  // the J case; open in second tab and decide there to create staleness
  const idForm = page.getByTestId('decision-id_document')
  // submit with nothing chosen
  await idForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
  P('submit empty ->', (await page.getByRole('alert').allTextContents()).join('|'))
  // reject without reason
  await idForm.getByLabel('Refuser et demander une nouvelle prise').check()
  await idForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
  P('reject without reason ->', (await page.getByRole('alert').allTextContents()).join('|'))
  P('reason select options', JSON.stringify(await idForm.getByLabel('Motif du refus').locator('option').allTextContents()))
  // make stale: another moderator decides J's selfie through API first
  const rr = await c.raw('POST', '/v1/staff/review/decisions', { json: { kind: 'liveness', account_id: s3.J.id, record_id: s3.J.liveRec, decision: 'reject', reason: 'unclear' }, cookie: st.mod1.cookie }); P('side decision J selfie', rr.status)
  const liveForm = page.getByTestId('decision-liveness')
  await liveForm.getByLabel('Approuver').check()
  const posts = []; page.on('request', r => { if (r.method() === 'POST' && /decisions/.test(r.url())) posts.push(r.url()) })
  await liveForm.getByRole('button', { name: 'Enregistrer la décision' }).dblclick()
  await page.waitForTimeout(1500)
  P('double-click POSTs sent', posts.length)
  P('stale message ->', (await page.getByRole('alert').allTextContents()).join('|'))
  await page.screenshot({ path: `${B.EV}/shots/stale-409.png`, fullPage: true })
  P('after 409 selfie form present?', await page.getByTestId('decision-liveness').count(), '(case reloaded)')
  // double submit approve on ID
  const idf = page.getByTestId('decision-id_document'); await idf.getByLabel('Approuver').check()
  posts.length = 0
  await idf.getByRole('button', { name: 'Enregistrer la décision' }).dblclick(); await page.waitForTimeout(1500)
  P('ID approve double-click POSTs', posts.length, '| status', (await page.getByRole('status').allTextContents()).join('|'))
  await page.screenshot({ path: `${B.EV}/shots/after-approve.png`, fullPage: true })
  P('console', JSON.stringify(bag.console), 'bad', JSON.stringify(bag.bad))
  await ctx.close()
}
writeFileSync(B.EV + '/b2-gates-ux.txt', out.join('\n')); await browser.close()
