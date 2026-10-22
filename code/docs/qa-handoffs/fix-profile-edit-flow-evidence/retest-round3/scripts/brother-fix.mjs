import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, process.argv[2], { width: 390, height: 800 })
const page = await ctx.newPage()
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value))
await page.locator('input[name="marital_status"][value="celibataire"]').check({ force: true })
const tap = async () => { await page.locator('label:has(#profile-pin)').first().click(); await sleep(1500); return page.evaluate(() => ({ alert: document.getElementById('profile-pin-status').textContent, hidden: document.getElementById('profile-pin-status').classList.contains('hidden'), pin: document.getElementById('profile-pin').checked })) }
say(`step 1 (marital only): ${JSON.stringify(await tap())} url=${new URL(page.url()).pathname}`)
await page.locator('input[name="polygyny_intent"][value="non"]').check({ force: true })
await page.locator('label:has(#profile-pin)').first().click()
await page.waitForURL(/\/pin\?next=/, { timeout: 10000 }).catch(() => {})
say(`step 2 (marital + polygyny): url=${new URL(page.url()).pathname}${new URL(page.url()).search}`)
const prof = await (await ctx.request.get(`${BASE}/v1/me/profile`)).json()
say(`API after: marital_status=${prof.marital_status} polygamy_intent=${prof.polygamy_intent}`)
writeFileSync(`${EV}/r3-brother-fix-cause.txt`, out.join('\n') + '\n')
await browser.close()
