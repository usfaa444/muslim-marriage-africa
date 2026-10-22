import { launch, memberContext, sleep, BASE, SC } from './lib.mjs'
import { readFileSync } from 'node:fs'
import AxeBuilder from '/home/claude/ankanu-profile-fix/code/node_modules/@axe-core/playwright/dist/index.mjs'
const browser = await launch()
async function targets(label, act) {
  const ctx = await memberContext(browser, label, { width: 390, height: 800 })
  await ctx.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(`${SC}/tw3/shim.union.js`, 'utf8') }))
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '.material-symbols-outlined{display:inline-block;width:1.25em;height:1.25em;overflow:hidden;font-size:24px;color:transparent}' }))
  const page = await ctx.newPage(); await act(page)
  const a = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()
  const t = a.violations.filter((v) => v.id === 'color-contrast').flatMap((v) => v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.any[0]?.message ?? '').slice(0, 110)))
  await ctx.close(); return t
}
const base = await targets('kbd', async (p) => { await p.goto(`${BASE}/profile-edit`); await p.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value)); await sleep(500) })
const withPhotos = await targets('photo1', async (p) => { await p.goto(`${BASE}/profile-edit`); await p.waitForFunction(() => document.querySelectorAll('#profile-photo-grid img').length >= 2); await sleep(1000) })
console.log('baseline nodes', base.length, 'with photos', withPhotos.length)
console.log('only with photos:', withPhotos.filter((x) => !base.includes(x)))
await browser.close()
