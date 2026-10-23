import fs from 'node:fs'
import { member, call, sql } from './lib.mjs'
import { launch, ctxFor, watch, WEB, EV, AxeBuilder } from './br.mjs'
const results = []
const rec = (id, what, ok, actual) => { results.push({ id, what, ok, actual }); console.log(ok ? 'PASS' : 'FAIL', id, what, '=>', typeof actual === 'string' ? actual : JSON.stringify(actual)) }
const shot = (page, name) => page.screenshot({ path: `${EV}/${name}.png`, fullPage: true })
const vis = async (page, sel) => page.locator(sel).evaluate((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 }).catch(() => false)
const noise = (l) => !/ERR_FAILED|fonts\.(googleapis|gstatic)|tailwind|status of (429|403|500)|http (429|403|500) POST .*\/v1\/invites$|http 404 GET .*\/(premium|v1\/profiles\/[0-9a-f-]+)$/i.test(l)
const br = await launch()
const B = await member('brother'), S = await member('sister'), S2 = await member('sister'), S3 = await member('sister'), S4 = await member('sister')
const log = []
// ---- Free brother, fresh, all widths
for (const w of [360, 390, 768, 1024, 1280, 1440]) {
  const ctx = await ctxFor(br, B.cookie, { width: w, height: 900 }); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/invitations/envoyer/' + S.id); await page.waitForSelector('#invite-form:not([hidden])', { timeout: 10000 })
  await page.waitForTimeout(500)
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])
  rec('G4', `free state ${w}px no h-scroll`, sw[0] <= sw[1], sw)
  await shot(page, `ui-free-${w}`)
  if (w === 390) {
    const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    fs.writeFileSync(`${EV}/axe-free.json`, JSON.stringify(ax.violations, null, 1))
    rec('G6', 'axe free state serious/critical', ax.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).length === 0, ax.violations.map((v) => [v.id, v.impact, v.nodes.length]))
    // hidden-vs-display check
    const hiddenShown = {}
    for (const s of ['#invite-photo-missing', '#invite-profile-missing', '#invite-quota-wall', '#invite-unavailable', '#invite-load-error', '#invite-loading', '#invite-error']) hiddenShown[s] = await vis(page, s)
    rec('G4', 'elements marked [hidden] are really not displayed (Tailwind CSS override check)', Object.values(hiddenShown).every((v) => v === false), hiddenShown)
    const texts = await page.locator('main').innerText()
    fs.writeFileSync(`${EV}/ui-free-text.txt`, texts)
    for (const t of ["Transmettre une invitation Ta'aruf", 'Conforme', 'Invitations restantes aujourd\'hui : 3', 'Invitations illimitées pour les abonnements engagés.', "Envoyer l'invitation Ta'aruf", 'Protocole & Rôle du Tuteur (Wali)']) rec('G4', `copy: ${t}`, texts.toLowerCase().includes(t.toLowerCase()), '')
    rec('G4', 'no pack/aucune IA wording', !/pack|intelligence artificielle|mois/i.test(texts), '')
    const btn = await page.locator('#invite-send').boundingBox(); rec('G5', 'send button >=44px', btn.height >= 44 && btn.width >= 44, btn)
    const small = await page.evaluate(() => [...document.querySelectorAll('main a, main button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44) }).map((e) => (e.textContent || '').trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)))
    rec('G5', 'touch targets in main >= 44x44', small.length === 0, small)
  }
  await ctx.close()
}
// ---- send, keyboard only
{
  const ctx = await ctxFor(br, B.cookie); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/invitations/envoyer/' + S.id); await page.waitForSelector('#invite-form:not([hidden])')
  let reached = false
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement?.id === 'invite-send')) { reached = true; break } }
  rec('G6', 'send button reachable with Tab', reached, '')
  const focusVis = await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return [cs.outlineStyle, cs.outlineWidth, cs.boxShadow] })
  await shot(page, 'ui-focus-send'); rec('G6', 'focus indicator on send (outline/box-shadow)', !(focusVis[0] === 'none' && focusVis[2] === 'none') , focusVis)
  const sendResp = page.waitForResponse((r) => r.url().endsWith('/v1/invites') && r.request().method() === 'POST')
  await page.keyboard.press('Enter'); const resp = await sendResp
  await page.waitForTimeout(600)
  rec('AC1', 'keyboard Enter sends -> 201', resp.status() === 201, resp.status())
  const status = await page.locator('#invite-status').innerText(); rec('G5', 'success message', status.includes('Invitation envoyée.'), status)
  const dis = await page.locator('#invite-send').isDisabled(); const lbl = await page.locator('#invite-send-label').innerText()
  rec('G5', 'button locked after success', dis && lbl === 'Invitation envoyée', [dis, lbl])
  const live = await page.locator('#invite-status').getAttribute('aria-live'); rec('G6', 'status is aria-live', live === 'polite', live)
  await shot(page, 'ui-sent-390')
  rec('AC1', 'persisted in DB', sql(`select count(*) from invite where from_id='${B.id}' and to_id='${S.id}' and state='pending'`) === '1', '')
  // reload and send again
  await page.reload(); await page.waitForSelector('#invite-form:not([hidden])'); await page.waitForTimeout(400)
  const q = await page.locator('#invite-quota-pill').innerText().catch(() => ''); rec('G3', 'after reload remaining = 2', q.includes('2'), q)
  await page.click('#invite-send'); await page.waitForTimeout(800)
  const st2 = await page.locator('#invite-status').innerText(); rec('E-1', 'resend after reload -> already sent message', st2.includes('Invitation déjà envoyée.'), st2)
  rec('E-1', 'still 1 row, quota 1', sql(`select count(*) from invite where from_id='${B.id}'`) === '1' && sql(`select sent_count from invite_quota where account_id='${B.id}'`) === '1', '')
  await ctx.close()
}
// ---- double-click rapid submit on slow net (3G)
{
  const B3 = await member('brother'); const ctx = await ctxFor(br, B3.cookie); const page = await ctx.newPage(); watch(page, log)
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 25 * 1024 })
  let posts = 0; page.on('request', (r) => { if (r.url().endsWith('/v1/invites') && r.method() === 'POST') posts++ })
  const t0 = Date.now(); await page.goto(WEB + '/invitations/envoyer/' + S2.id); await page.waitForSelector('#invite-form:not([hidden])', { timeout: 30000 })
  const loadMs = Date.now() - t0
  const loading = await page.evaluate(() => document.querySelector('#invite-compose')?.getAttribute('aria-busy'))
  await page.dblclick('#invite-send'); await page.waitForTimeout(4000)
  rec('E-1', 'double-click on slow 3G -> one POST', posts === 1, posts)
  rec('G7', 'compose loads on throttled 3G (ms)', loadMs < 8000, loadMs)
  rec('E-1', 'one row', sql(`select count(*) from invite where from_id='${B3.id}'`) === '1', '')
  await ctx.close()
}
// ---- quota wall
{
  const B4 = await member('brother'); for (const t of [S, S2, S3]) await call('/v1/invites', B4.cookie, 'POST', { to_id: t.id })
  for (const w of [360, 390, 768, 1024, 1280, 1440]) {
    const ctx = await ctxFor(br, B4.cookie, { width: w, height: 900 }); const page = await ctx.newPage(); watch(page, log)
    await page.goto(WEB + '/invitations/envoyer/' + S4.id); await page.waitForSelector('#invite-form:not([hidden])'); await page.waitForTimeout(500)
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); rec('G4', `wall ${w}px no h-scroll`, sw[0] <= sw[1], sw)
    await shot(page, `ui-wall-${w}`)
    if (w === 390) {
      const wall = await page.locator('#invite-quota-wall').innerText(); fs.writeFileSync(`${EV}/ui-wall-text.txt`, wall)
      rec('AC12', 'wall visible on load', await vis(page, '#invite-quota-wall'), '')
      rec('AC12', 'wall copy', wall.includes('Envoi refusé. Quota du jour atteint.') && wall.includes('Nouvelles invitations demain à partir de 00:00 (heure de Ouagadougou).') && wall.includes('Avec Premium, invitations et messages illimités.') && wall.includes('Découvrir Premium'), wall)
      rec('AC12', 'exactly one Premium link, no pack', (await page.locator('main a[href="/premium"]').count()) === 1 && !/pack|achet|recharge|mois/i.test(await page.locator('main').innerText()), await page.locator('main a[href="/premium"]').count())
      rec('AC6', 'send disabled at wall', await page.locator('#invite-send').isDisabled(), '')
      rec('G4', 'inline count/upsell hidden at wall', !(await vis(page, '#invite-quota-pack')), await page.locator('#invite-quota').innerText())
      const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      fs.writeFileSync(`${EV}/axe-wall.json`, JSON.stringify(ax.violations, null, 1))
      rec('G6', 'axe wall serious/critical', ax.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).length === 0, ax.violations.map((v) => [v.id, v.impact, v.nodes.length]))
      const pl = await page.locator('main a[href="/premium"]').boundingBox(); rec('G5', 'Premium link >=44px', pl.height >= 44, pl)
      const r = await page.request.get(WEB + '/premium'); rec('KNOWN', '/premium is 404 (Epic 10 placeholder, flagged)', true, r.status())
    }
    await ctx.close()
  }
}
// ---- 4th via API-stale page: page loaded before quota exhausted, then QUOTA_EXCEEDED on send
{
  const B5 = await member('brother'); const ctx = await ctxFor(br, B5.cookie); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/invitations/envoyer/' + S4.id); await page.waitForSelector('#invite-form:not([hidden])')
  for (const t of [S, S2, S3]) await call('/v1/invites', B5.cookie, 'POST', { to_id: t.id })
  await page.click('#invite-send'); await page.waitForTimeout(1200)
  rec('AC6', 'stale page: 4th send opens wall', await vis(page, '#invite-quota-wall') && await page.locator('#invite-send').isDisabled(), await page.locator('#invite-wall-reset').innerText())
  await shot(page, 'ui-wall-after-429'); await ctx.close()
}
// ---- no photo
{
  const NP = await member('brother', { photo: false }); const ctx = await ctxFor(br, NP.cookie); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/invitations/envoyer/' + S.id); await page.waitForSelector('#invite-form:not([hidden])'); await page.waitForTimeout(500)
  rec('AC2', 'no-photo block visible with link', await vis(page, '#invite-photo-missing') && !(await vis(page, '#invite-photo-ok')), '')
  await shot(page, 'ui-nophoto-390')
  await page.click('#invite-send'); await page.waitForTimeout(1000)
  const err = await page.locator('#invite-error').innerText().catch(() => ''); const foc = await page.evaluate(() => document.activeElement?.id)
  rec('AC2', 'send refused with prompt, focus on add-photo link', err.includes('Ajoutez une photo de profil pour envoyer une invitation.') && foc === 'invite-photo-link', [err, foc])
  rec('AC2', 'no invite row', sql(`select count(*) from invite where from_id='${NP.id}'`) === '0', '')
  const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  fs.writeFileSync(`${EV}/axe-nophoto.json`, JSON.stringify(ax.violations, null, 1))
  rec('G6', 'axe nophoto serious/critical', ax.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).length === 0, ax.violations.map((v) => [v.id, v.impact, v.nodes.length]))
  await ctx.close()
}
// ---- unavailable recipient + bad id + deep link anon
{
  const U = await member('sister'); sql(`update account set status='deactivated' where id='${U.id}'`)
  const ctx = await ctxFor(br, B.cookie); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/invitations/envoyer/' + U.id); await page.waitForSelector('#invite-unavailable:not([hidden])'); await page.waitForTimeout(300)
  rec('AC3', 'unavailable block visible, send hidden', await vis(page, '#invite-unavailable') && !(await vis(page, '#invite-send')), '')
  await shot(page, 'ui-unavailable-390')
  await page.goto(WEB + '/invitations/envoyer/not-a-uuid'); rec('G3', 'bad id -> /decouvrir', page.url().endsWith('/decouvrir'), page.url())
  await page.goto(WEB + '/invitations/envoyer/01a166d8-da04-70cc-9557-000000000000'); await page.waitForTimeout(1500); rec('G3', 'unknown id -> unavailable', await vis(page, '#invite-unavailable'), '')
  await ctx.close()
  const a = await ctxFor(br, null); const p2 = await a.newPage(); await p2.goto(WEB + '/invitations/envoyer/' + S.id); rec('SEC', 'anon deep link -> /auth', /\/auth/.test(p2.url()), p2.url()); await a.close()
}
// ---- Sister default capped; free_unlimited
{
  const SS = await member('sister'); const ts = []; for (let i = 0; i < 4; i++) ts.push(await member('brother'))
  for (const t of ts.slice(0, 3)) await call('/v1/invites', SS.cookie, 'POST', { to_id: t.id })
  const ctx = await ctxFor(br, SS.cookie); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/invitations/envoyer/' + ts[3].id); await page.waitForSelector('#invite-form:not([hidden])'); await page.waitForTimeout(500)
  rec('AC5', 'Sister 4th: wall in UI (default mode)', await vis(page, '#invite-quota-wall') && await page.locator('#invite-send').isDisabled(), '')
  await shot(page, 'ui-sister-wall-390')
  sql(`update operator_config set value='free_unlimited' where key='sister_reach_mode'`)
  await page.reload(); await page.waitForSelector('#invite-form:not([hidden])'); await page.waitForTimeout(500)
  const t = await page.locator('#invite-quota').innerText(); fs.writeFileSync(`${EV}/ui-sister-unlimited-text.txt`, t)
  rec('AC4', 'free_unlimited UI: Invitations illimitées., no count/pack', t.includes('Invitations illimitées.') && !/restantes|Premium|Abonnez/.test(t) && !(await vis(page, '#invite-quota-wall')), t)
  await shot(page, 'ui-sister-unlimited-390')
  await page.click('#invite-send'); await page.waitForTimeout(1000); rec('AC4', 'free_unlimited 4th send OK', (await page.locator('#invite-status').innerText()).includes('Invitation envoyée.'), '')
  sql(`update operator_config set value='same_quota_as_brothers' where key='sister_reach_mode'`)
  await ctx.close()
}
// ---- API failure handling
{
  const B6 = await member('brother'); const ctx = await ctxFor(br, B6.cookie); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/invitations/envoyer/' + S.id); await page.waitForSelector('#invite-form:not([hidden])')
  await page.route('**/v1/invites', (r) => r.request().method() === 'POST' ? r.abort('failed') : r.continue())
  await page.click('#invite-send'); await page.waitForTimeout(800)
  const e = await page.locator('#invite-error').innerText(); rec('G7', 'send network error: message + button re-enabled', e.includes('Envoi impossible. Vérifiez votre connexion et réessayez.') && !(await page.locator('#invite-send').isDisabled()), e)
  await shot(page, 'ui-send-network-error')
  await page.unroute('**/v1/invites'); await page.route('**/v1/invites', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"UNHANDLED","message":"Request failed"}}' }) : r.continue())
  await page.click('#invite-send'); await page.waitForTimeout(800)
  const e2 = await page.locator('#invite-error').innerText(); rec('G7', 'send 500: handled error shown', e2.length > 0 && !(await page.locator('#invite-send').isDisabled()), e2)
  await ctx.close()
  const ctx2 = await ctxFor(br, B6.cookie); const p2 = await ctx2.newPage()
  await p2.route('**/v1/invites/quota', (r) => r.abort('failed'))
  await p2.goto(WEB + '/invitations/envoyer/' + S.id); await p2.waitForSelector('#invite-load-error:not([hidden])', { timeout: 10000 }).catch(() => {})
  rec('G7', 'quota load failure -> retry state', await vis(p2, '#invite-load-error'), await p2.locator('#invite-load-error').innerText().catch(() => ''))
  await shot(p2, 'ui-load-error'); await p2.unroute('**/v1/invites/quota'); await p2.click('#invite-retry'); await p2.waitForTimeout(1500)
  rec('G7', 'retry recovers', await vis(p2, '#invite-send'), ''); await ctx2.close()
}
// ---- entry points
{
  const B7 = await member('brother'); const ctx = await ctxFor(br, B7.cookie); const page = await ctx.newPage(); watch(page, log)
  await page.goto(WEB + '/decouvrir'); await page.waitForSelector('[data-card-invite]', { timeout: 10000 })
  const href = await page.locator('[data-card-invite]').first().getAttribute('href'); const tag = await page.locator('[data-card-invite]').first().evaluate((e) => e.tagName)
  await page.locator('[data-card-invite]').first().click(); await page.waitForURL(/invitations\/envoyer\//); rec('AC1', 'Discover card button opens compose', /invitations\/envoyer\/[0-9a-f-]{36}/.test(page.url()), [tag, href, page.url()])
  await page.goBack(); rec('G3', 'back returns to Discover', /decouvrir/.test(page.url()), page.url())
  await page.goto(WEB + '/profil/' + S.id); await page.waitForTimeout(1500)
  const lk = page.locator('a[href^="/invitations/envoyer/"]'); rec('AC1', 'profile detail has invite link', (await lk.count()) >= 1, await lk.count())
  await lk.first().click(); await page.waitForURL(/invitations\/envoyer\//); rec('AC1', 'profile detail opens compose', page.url().endsWith(S.id), page.url())
  await page.click('text=Annuler et revenir au profil'); await page.waitForTimeout(800); rec('G5', 'cancel returns to profile', /\/profil\//.test(page.url()), page.url())
  await ctx.close()
}
// ---- zoom 200%: 640 and 180 css px
for (const w of [640, 180]) {
  const ctx = await ctxFor(br, B.cookie, { width: w, height: 800 }); const page = await ctx.newPage()
  await page.goto(WEB + '/invitations/envoyer/' + S3.id); await page.waitForSelector('#invite-form:not([hidden])'); await page.waitForTimeout(400)
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); rec('G6', `200% zoom equiv (${w}px css) no h-scroll`, sw[0] <= sw[1], sw); await shot(page, `ui-zoom-${w}`); await ctx.close()
}
const bad = log.filter(noise); fs.writeFileSync(`${EV}/ui-console-network-log.txt`, log.join('\n'))
rec('G7', 'no unexpected console errors / 4xx/5xx (filtered CDN/fonts)', bad.length === 0, bad)
fs.writeFileSync(`${EV}/g3-ui-matrix.json`, JSON.stringify(results, null, 1))
console.log('FAILS', results.filter((r) => !r.ok).length, 'of', results.length)
await br.close()
