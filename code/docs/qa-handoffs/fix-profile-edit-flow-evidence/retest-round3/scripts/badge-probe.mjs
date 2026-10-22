import { launch, memberContext, sleep, BASE } from './lib.mjs'
const browser = await launch()
for (const label of ['r3a','r3photo']) {
  const ctx = await memberContext(browser, label, { width: 390, height: 800 })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' })
  await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value), null, { timeout: 20000 }).catch(() => {})
  await sleep(600)
  const r = await page.evaluate(() => [...document.querySelectorAll('.text-soft-gold')].filter((e) => e.classList.contains('px-2')).map((e) => ({ text: e.textContent.trim(), cls: e.className, parent: e.parentElement.textContent.trim().replace(/\s+/g,' ').slice(0, 80) })))
  console.log(label, JSON.stringify(r))
  await ctx.close()
}
await browser.close()
