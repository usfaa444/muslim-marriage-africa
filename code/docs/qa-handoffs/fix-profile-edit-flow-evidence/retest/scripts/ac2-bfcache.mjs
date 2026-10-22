// AC2 with the real back/forward cache enabled (Playwright disables it by default): does a restored page repair its photos?
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch({ ignoreDefaultArgs: ['--disable-back-forward-cache'], args: ['--no-sandbox', '--enable-features=BackForwardCache,CacheControlNoStoreEnterBackForwardCache', '--disable-features=BackForwardCacheMemoryControls'] })
const ctx = await memberContext(browser, 'r2photo', { width: 360, height: 780 })
const page = await ctx.newPage()
const log = []; watch(page, log)
await page.addInitScript(() => { window.addEventListener('pageshow', (e) => console.log('PAGESHOW persisted=' + e.persisted + ' ' + location.pathname)) })
const net = []
page.on('response', (r) => { const u = r.url(); if (u.includes('/v1/media/get') || u.includes('/v1/me/profile')) net.push(`${r.status()} ${r.request().method()} ${u.replace(BASE, '').replace(/token=([0-9a-f]{8})[^&]*/, 'token=$1…')}`) })
const state = () => page.evaluate(() => [...document.querySelectorAll('#profile-photo-grid img')].map((i) => ({ ok: i.complete && i.naturalWidth > 0 })))
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length >= 2)
await sleep(1000)
await page.fill('#origin', 'Edit gardé dans le bfcache')
await page.goto(`${BASE}/settings`, { waitUntil: 'load' })
say('waiting 65 s'); await sleep(65000)
net.length = 0
await page.goBack({ waitUntil: 'load' })
await sleep(3000)
say(`after Back: photos=${JSON.stringify(await state())} origin=${JSON.stringify(await page.inputValue('#origin'))} net=${JSON.stringify(net)}`)
say(`pageshow: ${JSON.stringify(log.filter((l) => l.includes('PAGESHOW')))}`)
await page.screenshot({ path: `${EV}/ac2-bfcache-360.png` })
writeFileSync(`${EV}/ac2-bfcache.txt`, out.join('\n') + '\n')
await browser.close()
