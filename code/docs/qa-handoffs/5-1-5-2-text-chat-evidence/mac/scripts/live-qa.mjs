// Live QA on the Mac (stories 5.1, 5.2): two real accounts on http://localhost:4012, real fonts and Tailwind CDN.
// usage: node live-qa.mjs <pair.json> <out dir>   (pair.json holds the two session cookies, kept outside the repo)
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync, writeFileSync } from 'node:fs'
const [pairPath, OUT] = process.argv.slice(2)
const pair = JSON.parse(readFileSync(pairPath, 'utf8'))
const BASE = 'http://localhost:4012'
const WIDTHS = [360, 390, 768, 1024, 1280, 1440]
const CONV = pair.conversation
const report = { live: {}, widths: [], console: [] }
const log = (...a) => console.log(...a)
const browser = await chromium.launch()
async function ctxFor(who, width = 390) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-FR' })
  await ctx.addCookies(pair[who].cookies.map(([name, value]) => ({ name, value, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' })))
  return ctx
}
async function page(ctx, who) {
  const p = await ctx.newPage()
  p.on('console', (m) => { if (m.type() === 'error') report.console.push(`${who}: ${m.text()}`) })
  p.on('pageerror', (e) => report.console.push(`${who} pageerror: ${e.message}`))
  return p
}
const input = (p) => p.getByLabel('Réponse réfléchie et posée')
const bubbles = (p) => p.getByRole('log', { name: 'Messages' }).getByTestId('chat-bubble')
async function openThread(p) {
  await p.goto(`${BASE}/discussions/${CONV}`, { waitUntil: 'networkidle' })
  await p.locator('#chat-thread[aria-busy="false"]').waitFor()
}
const FORBIDDEN = /En cours de vérification|vérification|modération|\bscan\b|\bLu\b|non lu/i

// 1. Empty list (before any message), sister side, for the blurred thumbnail
{
  const ctx = await ctxFor('sister', 390); const p = await page(ctx, 'sister')
  await p.goto(`${BASE}/discussions`, { waitUntil: 'networkidle' })
  await p.screenshot({ path: `${OUT}/shots/list-empty-390.png`, fullPage: true })
  const img = p.locator('main img').first()
  const thumb = await img.evaluate((el) => ({ src: el.getAttribute('src'), natural: [el.naturalWidth, el.naturalHeight], complete: el.complete, box: [el.clientWidth, el.clientHeight], filter: getComputedStyle(el).filter, alt: el.alt })).catch((e) => ({ error: String(e) }))
  report.thumbnail = thumb
  if (!thumb.error) await img.screenshot({ path: `${OUT}/shots/list-thumbnail-zoom.png` })
  report.emptyListText = (await p.locator('main').innerText()).slice(0, 600)
  await ctx.close()
}

// 2. Live typing and delivery between two contexts
{
  const cb = await ctxFor('brother'); const ca = await ctxFor('sister')
  const B = await page(cb, 'brother'); const A = await page(ca, 'sister')
  await openThread(A); await openThread(B)
  const before = await bubbles(A).count()
  const typing = A.getByText(`${pair.brother.pseudonym} écrit…`)
  await input(B).click()
  const t0 = Date.now()
  await B.keyboard.type('As-sal', { delay: 60 })
  await typing.waitFor({ timeout: 5000 })
  report.live.typingSeenMs = Date.now() - t0
  await A.screenshot({ path: `${OUT}/shots/live-typing-sister-390.png` })
  const t1 = Date.now()
  await typing.waitFor({ state: 'hidden', timeout: 10000 })
  report.live.typingClearedAfterStopMs = Date.now() - t1
  await input(B).fill('As-salāmu ʿalaykum Khadija, merci d’avoir accepté la démarche. 🌙')
  const t2 = Date.now()
  await B.getByRole('button', { name: 'Envoyer' }).click()
  await bubbles(B).nth(before).waitFor()
  report.live.senderBubbleMs = Date.now() - t2
  await bubbles(A).nth(before).waitFor({ timeout: 5000 })
  report.live.recipientLiveMs = Date.now() - t2
  report.live.statusText = await B.getByRole('status').allInnerTexts()
  await input(A).fill('Wa ʿalaykum as-salām. Avec plaisir, in shā’ Allāh.')
  const t3 = Date.now()
  await A.getByRole('button', { name: 'Envoyer' }).click()
  await bubbles(B).nth(before + 1).waitFor({ timeout: 5000 })
  report.live.replyLiveMs = Date.now() - t3
  for (const [who, p] of [['brother', B], ['sister', A]]) {
    const text = await p.locator('body').innerText()
    report.live[`forbidden_${who}`] = text.match(FORBIDDEN)?.[0] ?? null
  }
  await B.screenshot({ path: `${OUT}/shots/live-brother-390.png`, fullPage: true })
  await A.screenshot({ path: `${OUT}/shots/live-sister-390.png`, fullPage: true })
  await cb.close(); await ca.close()
}

// 3. Widths: screenshots, overflow, touch targets, axe, fonts
async function measure(p) {
  return p.evaluate(() => {
    const small = []
    for (const el of document.querySelectorAll('a, button, textarea, input, select, [role="button"]')) {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue
      if (el.classList.contains('sr-only') || (r.width <= 1 && r.height <= 1)) continue
      if (r.height < 44 || r.width < 44) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return {
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
      iconFont: document.fonts.check('24px "Material Symbols Outlined"'),
      fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i),
      tailwind: typeof window.tailwind !== 'undefined',
      small,
    }
  })
}
for (const width of WIDTHS) {
  const ctx = await ctxFor('sister', width); const p = await page(ctx, 'sister')
  for (const [screen, url] of [['list', '/discussions'], ['thread', `/discussions/${CONV}`]]) {
    await p.goto(BASE + url, { waitUntil: 'networkidle' })
    if (screen === 'thread') await p.locator('#chat-thread[aria-busy="false"]').waitFor()
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: `${OUT}/shots/${screen}-${width}.png`, fullPage: true })
    const m = await measure(p)
    const axe = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    const bad = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    const row = { screen, width, overflow: m.scrollWidth > m.innerWidth, scrollWidth: m.scrollWidth, iconFont: m.iconFont, tailwind: m.tailwind, fonts: m.fontsLoaded, small: m.small,
      axeSeriousCritical: bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + n.failureSummary?.split('\n').slice(0, 2).join(' ')).slice(0, 5) })),
      axeOther: axe.violations.filter((v) => !bad.includes(v)).map((v) => `${v.id} (${v.impact})`) }
    report.widths.push(row)
    log(screen, width, 'overflow', row.overflow, 'icon', row.iconFont, 'tw', row.tailwind, 'axe', bad.map((v) => v.id).join(',') || 0, 'small', row.small.length)
  }
  await ctx.close()
}
await browser.close()
writeFileSync(`${OUT}/live-qa.json`, JSON.stringify(report, null, 2))
log(JSON.stringify(report.live), JSON.stringify(report.thumbnail))
log('console errors', report.console.length)
