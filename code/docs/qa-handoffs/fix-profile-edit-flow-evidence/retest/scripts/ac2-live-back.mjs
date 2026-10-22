// AC2 with a live (approved) main photo and a pending one: leave /profile-edit, wait past the TTL, Back; then Forward and Back again.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, 'r2photo', { width: 360, height: 780 })
const page = await ctx.newPage()
const log = []; watch(page, log)
const net = []
page.on('response', (r) => { const u = r.url(); if (u.includes('/v1/media/get') || u.includes('/v1/me/profile')) net.push(`${r.status()} ${r.request().method()} ${u.replace(BASE, '').replace(/token=([0-9a-f]{8})[^&]*/, 'token=$1…')}`) })
const state = () => page.evaluate(() => [...document.querySelectorAll('#profile-photo-grid img')].map((i) => ({ ok: i.complete && i.naturalWidth > 0, alt: i.alt })))
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length >= 2, null, { timeout: 15000 })
await sleep(1500)
say(`first view: ${JSON.stringify(await state())}`)
await page.goto(`${BASE}/settings`, { waitUntil: 'load' })
say('on /settings, waiting 65 s'); await sleep(65000)
net.length = 0
await page.goBack({ waitUntil: 'load' })
await page.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length >= 2, null, { timeout: 15000 }).catch(() => say('grid did not repopulate'))
await sleep(2000)
say(`after Back: ${JSON.stringify(await state())} network=${JSON.stringify(net)}`)
await page.screenshot({ path: `${EV}/ac2-live-back-360.png` })
say(`403s: ${net.filter((n) => n.startsWith('403')).length}`)
say(`problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_BLOCKED_BY_CLIENT/.test(l)))}`)
writeFileSync(`${EV}/ac2-live-back.txt`, out.join('\n') + '\n')
await browser.close()
