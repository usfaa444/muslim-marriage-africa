// Mac live QA, stories 8.5 / 8.6: styled checks at 6 widths and the two-member walkthrough on http://localhost:4012
// (real Tailwind CDN, Google Fonts, Material Symbols). usage: node live-qa.mjs <pair.json> <out dir>
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const [pairPath, OUT] = process.argv.slice(2)
const pair = JSON.parse(readFileSync(pairPath, 'utf8'))
const BASE = 'http://localhost:4012'
const WIDTHS = [360, 390, 768, 1024, 1280, 1440]
const CONV = pair.conversation
const A = pair.brother, B = pair.sister
mkdirSync(`${OUT}/shots`, { recursive: true })
const report = { widths: [], walk: {}, api: {}, db: {}, console: [] }
const log = (...a) => console.log(...a)
const sql = (q) => execFileSync('docker', ['compose', '-p', 'ankanu-local', 'exec', '-T', 'postgres', 'psql', '-U', 'ankanu', '-d', 'ankanu', '-AF', '|', '-c', q], { encoding: 'utf8' }).trim()

async function api(who, method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: { origin: BASE, 'content-type': 'application/json', cookie: who.cookies.map(([k, v]) => `${k}=${v}`).join('; ') },
    body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
  })
  const text = await res.text(); let json = null; try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text: text.slice(0, 300) }
}
async function visibility(tag) {
  const out = {}
  for (const [me, other, name] of [[A, B, 'A_sees_B'], [B, A, 'B_sees_A']]) {
    const browse = await api(me, 'GET', '/v1/browse')
    const profile = await api(me, 'GET', `/v1/profiles/${other.id}`)
    const thread = await api(me, 'GET', `/v1/conversations/${CONV}`)
    out[name] = { browseStatus: browse.status, inBrowse: browse.text !== null && JSON.stringify(browse.json).includes(other.id), profile: profile.status, threadClosed: thread.json?.closed, threadOtherAvailable: thread.json?.other?.available }
  }
  report.api[tag] = out
  log(tag, JSON.stringify(out))
  return out
}

const browser = await chromium.launch()
async function ctxFor(who, width = 390) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-FR', timezoneId: 'Africa/Ouagadougou' })
  await ctx.addCookies(who.cookies.map(([name, value]) => ({ name, value, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' })))
  return ctx
}
async function page(ctx, label) {
  const p = await ctx.newPage()
  p.on('console', (m) => { if (m.type() === 'error') report.console.push(`${label} ${p.url().replace(BASE, '')}: ${m.text()}`) })
  p.on('pageerror', (e) => report.console.push(`${label} pageerror: ${e.message}`))
  return p
}
async function measure(p) {
  return p.evaluate(() => {
    const small = []
    for (const el of document.querySelectorAll('a, button, textarea, input, select, [role="button"], label:has(input)')) {
      let r = el.getBoundingClientRect(); const s = getComputedStyle(el)
      if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) {
        const l = el.closest('label') ?? (el.id && document.querySelector(`label[for="${el.id}"]`)); if (l) r = l.getBoundingClientRect()
      }
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue
      if (el.classList.contains('sr-only') || (r.width <= 1 && r.height <= 1)) continue
      if (r.height < 43.5 || r.width < 43.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return {
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
      iconFont: document.fonts.check('24px "Material Symbols Outlined"'),
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i),
      tailwind: typeof window.tailwind !== 'undefined',
      lang: document.documentElement.lang,
      small,
    }
  })
}
async function check(p, screen, width) {
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${OUT}/shots/${screen}-${width}.png`, fullPage: true })
  const m = await measure(p)
  const axe = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  const bad = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const row = { screen, width, url: p.url().replace(BASE, ''), overflow: m.scrollWidth > m.innerWidth, scrollWidth: m.scrollWidth, iconFont: m.iconFont, tailwind: m.tailwind, lang: m.lang, fonts: m.fonts, small: m.small,
    axeSeriousCritical: bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary ?? '').split('\n').slice(0, 2).join(' ')).slice(0, 5) })),
    axeOther: axe.violations.filter((v) => !bad.includes(v)).map((v) => `${v.id} (${v.impact})`) }
  report.widths.push(row)
  log(screen, width, 'overflow', row.overflow, 'icon', row.iconFont, 'tw', row.tailwind, 'axe', bad.map((v) => v.id).join(',') || 0, 'small', row.small.join('; ') || 0)
}
async function sweep(who, screen, url, prepare) {
  for (const width of WIDTHS) {
    const ctx = await ctxFor(who, width); const p = await page(ctx, `${screen}@${width}`)
    await p.goto(BASE + url, { waitUntil: 'networkidle' })
    if (prepare) await prepare(p)
    await check(p, screen, width)
    await ctx.close()
  }
}
const reportReady = (p) => p.getByRole('heading', { level: 1, name: 'Signaler ou bloquer ce profil' }).waitFor()

// ---------- Phase 1: before any Block ----------
await visibility('before')
report.db.before = { report: sql('select count(*) from report'), block: sql('select count(*) from block') }
await sweep(A, 'report-from-profile', `/signaler/${B.id}`, reportReady)
await sweep(A, 'report-from-chat', `/signaler/${B.id}?discussion=${CONV}&message=${B.messageId}`, reportReady)
await sweep(A, 'settings-card', '/settings', async (p) => {
  const card = p.getByRole('link', { name: /Membres bloqués/ }).or(p.getByRole('link', { name: /Gérer/ })).first()
  await card.scrollIntoViewIfNeeded()
})
await sweep(A, 'bloques-empty', '/settings/bloques', (p) => p.getByText('Vous n\'avez bloqué aucun membre.').waitFor())

// Entry from the profile page (screen 15)
{
  const ctx = await ctxFor(A); const p = await page(ctx, 'walk-profile-entry')
  await p.goto(`${BASE}/profil/${B.id}`, { waitUntil: 'networkidle' })
  const link = p.getByRole('link', { name: 'Signaler / Bloquer le profil' })
  report.walk.profileEntryHref = await link.getAttribute('href')
  await link.click(); await reportReady(p)
  report.walk.profileEntryLanded = p.url().replace(BASE, '')
  report.walk.profileChip = await p.getByText(/Profil concerné/).innerText()
  await ctx.close()
}

// ---------- Phase 2: A reports B's message from Chat, with Block ----------
{
  const ctx = await ctxFor(A); const p = await page(ctx, 'walk-report')
  await p.goto(`${BASE}/discussions/${CONV}`, { waitUntil: 'networkidle' })
  await p.locator('#chat-thread[aria-busy="false"]').waitFor()
  const flags = p.getByRole('link', { name: 'Signaler ce message' })
  report.walk.flagsUnderOtherBubbles = await flags.count()
  report.walk.headerLink = await p.getByRole('link', { name: 'Signaler / Bloquer' }).getAttribute('href')
  await p.screenshot({ path: `${OUT}/shots/walk-01-thread-before-390.png`, fullPage: true })
  await flags.first().click(); await reportReady(p)
  report.walk.flagLanded = p.url().replace(BASE, '')
  report.walk.messageNote = await p.getByText('Le message choisi dans la discussion est joint à ce signalement.').isVisible()
  await p.getByRole('radio', { name: 'Dissimulation ou fausse déclaration de situation matrimoniale' }).check()
  report.walk.blockCheckedByDefault = await p.getByRole('checkbox', { name: 'Bloquer également ce profil' }).isChecked()
  await p.getByLabel(/Précisions utiles pour les modérateurs/).fill('Déclare une situation qui semble inexacte ; test QA local.')
  await p.screenshot({ path: `${OUT}/shots/walk-02-report-filled-390.png`, fullPage: true })
  const before = new Date()
  const posted = p.waitForResponse((r) => r.url().endsWith('/v1/reports') && r.request().method() === 'POST')
  await p.getByRole('button', { name: 'Transmettre le signalement' }).click()
  const res = await posted; const after = new Date()
  report.walk.reportPost = { status: res.status(), body: await res.json().catch(() => null), clickAt: before.toISOString(), responseAt: after.toISOString(), requestBody: JSON.parse(res.request().postData() ?? '{}') }
  await p.getByRole('heading', { level: 1, name: 'Signalement transmis' }).waitFor()
  report.walk.sentFocused = await p.evaluate(() => document.activeElement?.textContent?.trim())
  report.walk.sentText = (await p.locator('main').innerText()).slice(0, 500)
  await p.screenshot({ path: `${OUT}/shots/walk-03-report-sent-390.png`, fullPage: true })
  await ctx.close()
}
report.db.afterReport = {
  report: sql('select id, reporter_id, target_kind, target_id, conversation_id, reason, details, sla_started_at from report'),
  moderation_case: sql('select * from moderation_case'),
  block: sql('select * from block'),
  messageTextInReport: sql(`select count(*) from report r where r::text like '%célibataire%'`),
}
log(JSON.stringify(report.db.afterReport, null, 1))
await visibility('afterBlock')
report.api.afterBlock_sends = {
  B_send: await api(B, 'POST', `/v1/conversations/${CONV}/messages`, { kind: 'text', text: 'Message après blocage (B)' }),
  A_send: await api(A, 'POST', `/v1/conversations/${CONV}/messages`, { kind: 'text', text: 'Message après blocage (A)' }),
  B_invite: await api(B, 'POST', '/v1/invites', { to_id: A.id }),
  A_invite: await api(A, 'POST', '/v1/invites', { to_id: B.id }),
  storedAfterBlock: sql(`select count(*) from message where conversation_id = '${CONV}'`),
}
log(JSON.stringify(report.api.afterBlock_sends))

// UI after the Block: closed thread both sides, profile redirect, discover
await sweep(A, 'thread-closed-A', `/discussions/${CONV}`, (p) => p.locator('#chat-thread[aria-busy="false"]').waitFor())
for (const [who, other, tag] of [[B, A, 'B'], [A, B, 'A']]) {
  const ctx = await ctxFor(who); const p = await page(ctx, `walk-closed-${tag}`)
  await p.goto(`${BASE}/discussions/${CONV}`, { waitUntil: 'networkidle' })
  await p.locator('#chat-thread[aria-busy="false"]').waitFor()
  const composer = p.getByLabel('Réponse réfléchie et posée')
  report.walk[`closed_${tag}`] = {
    unavailableText: await p.getByText('Ce profil n\'est plus disponible.').first().isVisible().catch(() => false),
    composerDisabled: await composer.isDisabled().catch(() => 'no composer'),
    sendDisabled: await p.getByRole('button', { name: 'Envoyer' }).isDisabled().catch(() => 'no button'),
  }
  await p.screenshot({ path: `${OUT}/shots/walk-04-thread-closed-${tag}-390.png`, fullPage: true })
  await p.goto(`${BASE}/profil/${other.id}`, { waitUntil: 'networkidle' })
  report.walk[`profileRedirect_${tag}`] = p.url().replace(BASE, '')
  await p.goto(`${BASE}/decouvrir`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  report.walk[`discoverShowsOther_${tag}`] = (await p.locator('body').innerText()).includes(other.pseudonym)
  await p.screenshot({ path: `${OUT}/shots/walk-05-discover-${tag}-390.png`, fullPage: true })
  await p.goto(`${BASE}/discussions`, { waitUntil: 'networkidle' })
  report.walk[`discussionsList_${tag}`] = (await p.locator('main').innerText()).slice(0, 400)
  await p.screenshot({ path: `${OUT}/shots/walk-06-discussions-${tag}-390.png`, fullPage: true })
  await ctx.close()
}

// Operator metrics (moderator session)
report.api.metricsAfterReport = await api({ cookies: pair.staffCookies }, 'GET', '/v1/staff/metrics')
log('metrics', JSON.stringify(report.api.metricsAfterReport.json?.reports ?? report.api.metricsAfterReport))

// ---------- Phase 3: Membres bloqués ----------
const listReady = (p) => p.getByRole('button', { name: `Débloquer ${B.pseudonym}` }).waitFor()
await sweep(A, 'bloques-list', '/settings/bloques', listReady)
await sweep(A, 'bloques-confirm', '/settings/bloques', async (p) => {
  await listReady(p)
  await p.getByRole('button', { name: `Débloquer ${B.pseudonym}` }).click()
  await p.getByRole('button', { name: 'Confirmer le déblocage' }).waitFor()
})
report.api.blocksListA = await api(A, 'GET', '/v1/blocks')
report.api.blocksListB = await api(B, 'GET', '/v1/blocks')
{
  const ctx = await ctxFor(A); const p = await page(ctx, 'walk-unblock')
  const deletes = []
  p.on('request', (r) => { if (r.method() === 'DELETE') deletes.push(r.url().replace(BASE, '')) })
  await p.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await p.getByRole('link', { name: /Membres bloqués|Gérer/ }).first().click()
  await listReady(p)
  report.walk.listUrl = p.url().replace(BASE, '')
  report.walk.listText = (await p.locator('main').innerText()).slice(0, 600)
  const img = p.locator('main li img').first()
  report.walk.listPhoto = await img.evaluate((el) => ({ src: el.getAttribute('src')?.slice(0, 80), natural: [el.naturalWidth, el.naturalHeight], box: [el.clientWidth, el.clientHeight], alt: el.alt })).catch((e) => ({ error: String(e).slice(0, 120) }))
  await p.getByRole('button', { name: `Débloquer ${B.pseudonym}` }).click()
  report.walk.confirmFocused = await p.evaluate(() => document.activeElement?.textContent?.trim())
  await p.screenshot({ path: `${OUT}/shots/walk-07-confirm-open-390.png`, fullPage: true })
  await p.getByRole('button', { name: 'Annuler' }).click()
  report.walk.cancelFocus = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim())
  report.walk.afterCancel = { deletes: [...deletes], block: sql('select count(*) from block') }
  await p.getByRole('button', { name: `Débloquer ${B.pseudonym}` }).click()
  await p.getByRole('button', { name: 'Confirmer le déblocage' }).click()
  await p.getByText(`Blocage levé pour ${B.pseudonym}.`).waitFor()
  report.walk.afterConfirm = { deletes: [...deletes], focused: await p.evaluate(() => document.activeElement?.tagName + ' ' + document.activeElement?.textContent?.trim()), block: sql('select count(*) from block'), text: (await p.locator('main').innerText()).slice(0, 400) }
  await p.screenshot({ path: `${OUT}/shots/walk-08-unblocked-390.png`, fullPage: true })
  await ctx.close()
}
await visibility('afterUnblock')
report.api.afterUnblock_sends = {
  B_send: await api(B, 'POST', `/v1/conversations/${CONV}/messages`, { kind: 'text', text: 'Message après déblocage (B)' }),
  A_send: await api(A, 'POST', `/v1/conversations/${CONV}/messages`, { kind: 'text', text: 'Message après déblocage (A)' }),
}
{
  const ctx = await ctxFor(A); const p = await page(ctx, 'walk-reopened')
  await p.goto(`${BASE}/discussions/${CONV}`, { waitUntil: 'networkidle' })
  await p.locator('#chat-thread[aria-busy="false"]').waitFor()
  report.walk.reopened = { unavailableText: await p.getByText('Ce profil n\'est plus disponible.').first().isVisible().catch(() => false), composerDisabled: await p.getByLabel('Réponse réfléchie et posée').isDisabled() }
  await p.screenshot({ path: `${OUT}/shots/walk-09-thread-reopened-A-390.png`, fullPage: true })
  await p.goto(`${BASE}/profil/${B.id}`, { waitUntil: 'networkidle' })
  report.walk.profileAfterUnblock = p.url().replace(BASE, '')
  await ctx.close()
}
report.api.metricsEnd = await api({ cookies: pair.staffCookies }, 'GET', '/v1/staff/metrics')
await browser.close()
writeFileSync(`${OUT}/live-qa.json`, JSON.stringify(report, null, 2))
log(JSON.stringify(report.walk, null, 1))
log(JSON.stringify(report.api.afterUnblock_sends))
log('console errors', report.console.length, report.console.slice(0, 20))
