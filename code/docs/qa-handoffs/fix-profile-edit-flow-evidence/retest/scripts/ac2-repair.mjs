// AC2: a signed photo URL that expires while /profile-edit stays open is repaired without a reload, bounded, edits kept.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'photo1'
const out = []
const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, label, { width: 390, height: 800 })
const page = await ctx.newPage()
const log = []
watch(page, log)
const net = []
page.on('response', (r) => { const u = r.url(); if (u.includes('/v1/media/get') || u.includes('/v1/me/profile')) net.push(`${r.status()} ${r.request().method()} ${u.replace(BASE, '').replace(/token=([0-9a-f]{8})[^&]*/, 'token=$1…')}`) })
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length > 0 && [...document.querySelectorAll('#profile-photo-grid img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 })
const tokens = () => page.evaluate(() => [...document.querySelectorAll('#profile-photo-grid img')].map((i) => (i.getAttribute('src') || '').match(/token=([0-9a-f]{8})/)?.[1]))
const before = await tokens()
say(`initial tokens ${JSON.stringify(before)}`)
await page.fill('#origin', 'Edit en cours — non enregistré')
const navs = []
page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs.push(f.url()) })
say('waiting 63 s so the grants expire (signed_url_ttl_seconds = 60)')
await sleep(63000)
net.length = 0
// the browser asks for an expired grant again (same URL), e.g. image re-decode or lazy reload
await page.evaluate(() => { const i = document.querySelector('#profile-photo-grid img'); i.src = i.getAttribute('src') + '&again=1' })
await sleep(3000)
const after = await tokens()
say(`tokens after repair ${JSON.stringify(after)}`)
say(`network after the expired request: ${JSON.stringify(net)}`)
const ok = await page.evaluate(() => [...document.querySelectorAll('#profile-photo-grid img')].every((i) => i.complete && i.naturalWidth > 0))
say(`all photos loaded after repair: ${ok}`)
say(`origin edit kept: ${await page.inputValue('#origin')}`)
say(`main-frame navigations during repair: ${JSON.stringify(navs)}`)
// Part 2: grants that always fail must not loop.
await page.route('**/v1/media/get**', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: '{}' }))
net.length = 0
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await sleep(6000)
const reads1 = net.filter((n) => n.includes('/v1/me/profile')).length
say(`always-403 media: profile reads in 6 s after load = ${reads1} (1 initial + at most 2 repairs)`)
for (let k = 0; k < 4; k += 1) { await page.evaluate((k) => { for (const i of document.querySelectorAll('#profile-photo-grid img')) i.src = i.getAttribute('src') + '&x=' + k }, k); await sleep(1500) }
const reads2 = net.filter((n) => n.includes('/v1/me/profile')).length
say(`after 4 more forced failures: profile reads = ${reads2} (must stay <= 3); media 403 count = ${net.filter((n) => n.startsWith('403')).length}`)
say(`problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_BLOCKED_BY_CLIENT|status of 403/.test(l)))}`)
writeFileSync(`${EV}/ac2-repair.txt`, out.join('\n') + '\n')
await browser.close()
