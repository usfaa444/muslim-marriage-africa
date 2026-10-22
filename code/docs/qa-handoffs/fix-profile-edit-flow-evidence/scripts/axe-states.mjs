import { launch, memberContext, sleep, BASE, SC, EV } from './lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import AxeBuilder from '/home/claude/ankanu-profile-fix/code/node_modules/@axe-core/playwright/dist/index.mjs'
const browser = await launch()
const res = {}
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
async function run(name, label, act) {
  const ctx = await memberContext(browser, label, { width: 390, height: 800 })
  await ctx.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(`${SC}/tw3/shim.union.js`, 'utf8') }))
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '.material-symbols-outlined{display:inline-block;width:1.25em;height:1.25em;overflow:hidden;font-size:24px;color:transparent}' }))
  const page = await ctx.newPage()
  await act(page)
  const axe = await new AxeBuilder({ page }).withTags(tags).analyze()
  res[name] = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
  console.log(name, res[name].map((v) => `${v.impact}:${v.id}(${v.nodes})`).join(', ') || 'none')
  await ctx.close()
}
await run('profile-edit-error-line', 'bro1', async (p) => { await p.goto(`${BASE}/profile-edit`); await p.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value)); await p.fill('#origin', 'x'); await p.locator('label:has(#profile-pin)').first().click(); await sleep(1500) })
await run('profile-edit-photos-live-and-pending', 'photo1', async (p) => { await p.goto(`${BASE}/profile-edit`); await p.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length >= 2); await sleep(1000) })
await run('pin-4-dots', 'kbd', async (p) => { await p.goto(`${BASE}/pin?next=%2Fprofile-edit`); for (const d of '1357') await p.locator(`[data-key="${d}"]`).click(); await sleep(300) })
writeFileSync(`${EV}/axe-states.json`, JSON.stringify(res, null, 1))
await browser.close()
