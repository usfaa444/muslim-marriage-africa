import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, 'bro1', { width: 390, height: 800 })
const page = await ctx.newPage()
const log = []; watch(page, log)
const puts = []
page.on('request', (r) => { if (r.method() === 'PUT' && r.url().endsWith('/v1/me/profile')) puts.push(r.postData()?.slice(0, 120)) })
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value))
say(`brother profile loaded; pin checked=${await page.locator('#profile-pin').isChecked()}`)
await page.fill('#origin', 'Frère QA')
await page.locator('label:has(#profile-pin)').first().click()
await sleep(1500)
say(`brother, unsaved edit, PIN switch -> url=${new URL(page.url()).pathname} pinChecked=${await page.locator('#profile-pin').isChecked()} status=${JSON.stringify(await page.textContent('#profile-save-status'))} puts=${puts.length}`)
await page.screenshot({ path: `${EV}/brother-save-refused-390.png` })
await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value)); await sleep(300)
await page.locator('label:has(#profile-pin)').first().click()
await page.waitForURL(/\/pin\?next=/, { timeout: 8000 }).catch(() => {})
say(`brother, no unsaved edit, PIN switch -> url=${new URL(page.url()).pathname}${new URL(page.url()).search}`)
writeFileSync(`${EV}/brother-pin-switch.txt`, out.join('\n') + '\n')
await browser.close()
