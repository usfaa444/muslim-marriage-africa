import { launch, memberContext, BASE } from './lib.mjs'
const browser = await launch()
const ctx = await memberContext(browser, 'legacy2')
const page = await ctx.newPage()
const r = await ctx.request.get(`${BASE}/v1/pin`); console.log('pin state', await r.text())
await page.goto(`${BASE}/pin?next=%2Fprofile-edit`, { waitUntil: 'load' })
console.log(page.url(), (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200))
await browser.close()
