import * as L from './lib.mjs'
import * as B from './br.mjs'
const m = await L.createMember({ photo: false })
const browser = await B.launch(); const ctx = await B.newCtx(browser, m.cookieHeader(), { viewport: { width: 390, height: 900 } }); const page = await ctx.newPage()
await page.goto('/id-liveness'); await page.waitForTimeout(1200)
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[class*="text-deep-navy/60"]')].map(e => e.textContent.trim().slice(0, 60) + ' | ' + e.outerHTML.slice(0, 90)))))
await browser.close()
