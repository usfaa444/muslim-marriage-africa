import { launch, memberContext, BASE, SC } from './lib.mjs'
const browser = await launch({ executablePath: `${SC}/cdn/chrome-wrap.sh` })
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } })
await ctx.addCookies([{ name: 'ankanu_session', value: 'web', url: BASE }])
const page = await ctx.newPage()
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('requestfailed', (r) => errs.push('failed ' + r.url()))
await page.goto(`${BASE}/pin`, { waitUntil: 'load' })
console.log(await page.evaluate(() => ({ tailwind: 'tailwind' in window, styleTag: !!document.querySelector('style[data-qa-tailwind]'), keyH: document.querySelector('[data-key="1"]').getBoundingClientRect().height })))
console.log(errs)
await browser.close()
