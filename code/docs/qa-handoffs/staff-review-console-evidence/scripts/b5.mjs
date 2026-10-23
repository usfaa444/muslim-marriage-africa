import * as B from './br.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json'))
const browser = await B.launch(); const ctx = await B.newCtx(browser, st.mod1.cookie); const page = await ctx.newPage()
await page.goto('/staff/revue'); await page.waitForSelector('#review-queue button')
await page.locator('header a, header [tabindex]').first().focus().catch(()=>{})
const info = await page.evaluate(() => { const e = [...document.querySelectorAll('a,button,[tabindex]')].find(x => /AnKanu/.test(x.textContent) && /Réservé/.test(x.textContent)); if (!e) return null; e.focus(); const cs = getComputedStyle(e); return { tag: e.tagName, href: e.getAttribute('href'), tabindex: e.getAttribute('tabindex'), role: e.getAttribute('role'), outline: cs.outline, html: e.outerHTML.slice(0, 300) } })
console.log(JSON.stringify(info, null, 1)); await browser.close()
