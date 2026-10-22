// Round 3, finding 17, on the real stack: after each step, starting from the top of the page, is the PIN screen's message
// (and the "S'identifier à nouveau" link) fully inside the viewport? usage: node r3-pin-status-inview.mjs <setLabel> <lockLabel> <width> <height>
import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const [setLabel, lockLabel, W, H] = [process.argv[2], process.argv[3], Number(process.argv[4]), Number(process.argv[5])]
const tag = `${W}x${H}`
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const measure = (page) => page.evaluate(() => {
  const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top * 10) / 10, bottom: Math.round(b.bottom * 10) / 10, left: Math.round(b.left), right: Math.round(b.right) } }
  const vh = innerHeight, vw = innerWidth
  const full = (b) => !!b && b.top >= 0 && b.bottom <= vh && b.left >= 0 && b.right <= vw
  const hint = document.getElementById('status-hint'), text = document.getElementById('pin-status-text')
  const link = [...document.querySelectorAll('a')].find((a) => /S'identifier à nouveau/.test(a.textContent))
  const h = rect(hint), t = rect(text), l = rect(link)
  return { text: text.textContent, hintBox: h, textBox: t, linkBox: l, hintFullyInView: full(h), textFullyInView: full(t), linkFullyInView: full(l), roomBelowHint: h ? Math.round((vh - h.bottom) * 10) / 10 : null, scrollY: Math.round(scrollY), vh, vw }
})
const toTop = (page) => page.evaluate(() => window.scrollTo(0, 0))
const key = (page, d) => page.locator(`[data-key="${d}"]`).click()
const press = async (page, digits) => { for (const d of digits) await key(page, d) }
const settle = (ms = 900) => sleep(ms)
let problems = 0
const check = (label, m) => {
  const ok = m.hintFullyInView && m.textFullyInView && m.linkFullyInView
  if (!ok) problems++
  say(`[${tag}] ${label}: ${ok ? 'IN VIEW' : 'NOT FULLY IN VIEW'} text="${m.text}" hint=${JSON.stringify(m.hintBox)} link=${JSON.stringify(m.linkBox)} roomBelowHint=${m.roomBelowHint}px scrollY=${m.scrollY} vh=${m.vh}`)
}

// Step A: setting a PIN (not enabled): four digits then the button says six digits are needed.
{
  const ctx = await memberContext(browser, setLabel, { width: W, height: H })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/pin?next=%2Fprofile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelectorAll('.pin-dot').length === 6)
  await settle(600)
  const rest = await measure(page); say(`[${tag}] resting: text="${rest.text}" scrollY=${rest.scrollY} (top of page) hintBottom=${rest.hintBox?.bottom} vh=${rest.vh}`)
  await toTop(page); await press(page, '1357')
  const afterDigits = await measure(page); say(`[${tag}] four digits typed (nothing said yet): text="${afterDigits.text}" scrollY=${afterDigits.scrollY}`)
  await toTop(page)
  await page.locator('#btn-submit').click(); await settle()
  const m = await measure(page); check('A set a PIN: four digits + button', m)
  await page.screenshot({ path: `${EV}/shots/r3-inview-A-six-digits-${tag}.png` })
  // the same message after a fifth digit? the hint rests again; then the button again, from the top
  await toTop(page); await press(page, '5'); await settle(300)
  const rest2 = await measure(page); say(`[${tag}] fifth digit: text back to resting="${rest2.text}" scrollY=${rest2.scrollY}`)
  await toTop(page); await page.locator('#btn-submit').click(); await settle()
  check('A again: five digits + button', await measure(page))
  await ctx.close()
}

// Step B: a PIN-locked member opens a member page, is sent to /pin, enters wrong PINs until the lockout.
{
  const ctx = await memberContext(browser, lockLabel, { width: W, height: H })
  const cookie = (await ctx.cookies())[0]; const hdr = { cookie: `${cookie.name}=${cookie.value}`, 'content-type': 'application/json' }
  const api = async (m, p, b) => { const r = await fetch(`${BASE}${p}`, { method: m, headers: hdr, body: b ? JSON.stringify(b) : undefined }); return `${r.status} ${(await r.text()).slice(0, 120)}` }
  const st = await api('GET', '/v1/pin'); say(`[${tag}] ${lockLabel} pin state: ${st}`)
  if (!/"enabled":true/.test(st)) { say(`PUT /v1/pin: ${await api('PUT', '/v1/pin', { pin: '135790' })}`); await sleep(7500) }
  say(`lock: ${await api('POST', '/v1/pin/lock')}`); await sleep(7500)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/decouvrir`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelectorAll('.pin-dot').length === 6)
  say(`[${tag}] locked, open /decouvrir -> ${new URL(page.url()).pathname}${new URL(page.url()).search}`)
  await settle(600)
  for (let i = 1; i <= 5; i++) {
    await toTop(page)
    const before = await measure(page)
    await press(page, '000000')
    await page.waitForFunction((was) => document.getElementById('pin-status-text').textContent !== was && !/en cours/.test(document.getElementById('pin-status-text').textContent), before.text, { timeout: 15000 }).catch(() => {})
    await settle()
    const m = await measure(page)
    check(`B wrong PIN #${i} (typed from the top)`, m)
    if (i === 1 || i === 5) await page.screenshot({ path: `${EV}/shots/r3-inview-B${i}-${tag}.png` })
    await sleep(6500)
  }
  await ctx.close()
}
say(`[${tag}] SUMMARY: steps not fully in view: ${problems}`)
writeFileSync(`${EV}/r3-pin-status-inview-${tag}.txt`, out.join('\n') + '\n')
await browser.close()
