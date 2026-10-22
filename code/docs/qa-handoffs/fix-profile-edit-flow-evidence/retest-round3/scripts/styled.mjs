// Styled render of the touched screens at the six factory widths, with the Tailwind CDN served from a local compile.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import AxeBuilder from '/home/claude/ankanu-profile-fix/code/node_modules/@axe-core/playwright/dist/index.mjs'
const WIDTHS = [360, 390, 768, 1024, 1280, 1440]
const only = process.argv[2]
const SCREENS = [
  { name: 'profile-edit', path: '/profile-edit', label: 'pinfail', shim: 'profile-edit', ready: () => /^\d{4}-/.test(document.getElementById('dob').value) },
  { name: 'pin', path: '/pin?next=%2Fprofile-edit', label: 'pinfail', shim: 'pin', ready: () => document.querySelectorAll('.pin-dot').length === 6 },
  { name: 'profile-review', path: '/profile-review', label: 'sis1', shim: 'profile-review', ready: () => document.body.innerText.includes('modération') },
]
mkdirSync(`${EV}/shots`, { recursive: true })
const browser = await launch()
const results = []
const fontsCss = `.material-symbols-outlined{display:inline-block;width:1.25em;height:1.25em;overflow:hidden;font-size:24px;line-height:1;white-space:nowrap;color:transparent;vertical-align:middle;direction:ltr;font-style:normal}`
for (const s of SCREENS) {
  if (only && s.name !== only) continue
  const shim = readFileSync(`${SC}/tw3/shim.${s.shim}.js`, 'utf8')
  for (const width of WIDTHS) {
    const ctx = await memberContext(browser, s.label, { width, height: 800 })
    // Playwright runs the most recently added matching route first, so the specific stubs go after the catch-all abort.
    await ctx.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: shim }))
    await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: fontsCss }))
    const page = await ctx.newPage()
    const log = []
    watch(page, log)
    await page.goto(`${BASE}${s.path}`, { waitUntil: 'load' })
    await page.waitForFunction(s.ready, null, { timeout: 15000 }).catch(() => log.push('ready-timeout'))
    await sleep(500)
    const m = await page.evaluate(() => {
      const vw = window.innerWidth
      const out = []
      for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], label')) {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue
        const sr = el.classList.contains('sr-only')
        if (sr) continue
        const label = (el.getAttribute('aria-label') || el.textContent || el.id || el.name || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
        out.push({ tag: el.tagName.toLowerCase(), id: el.id || null, label, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), left: Math.round(r.left) })
      }
      const small = out.filter((x) => (x.w < 44 || x.h < 44) && !(x.tag === 'label' && x.w >= 44))
      const outside = out.filter((x) => x.right > vw + 1 || x.left < -1)
      return { scrollWidth: document.documentElement.scrollWidth, innerWidth: vw, small, outside, tailwind: 'tailwind' in window, styled: !!document.querySelector('style[data-qa-tailwind]') }
    })
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    const viol = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) }))
    await page.screenshot({ path: `${EV}/shots/${s.name}-${width}.png`, fullPage: true })
    results.push({ screen: s.name, width, overflow: m.scrollWidth > m.innerWidth, scrollWidth: m.scrollWidth, innerWidth: m.innerWidth, styled: m.styled, small: m.small, outside: m.outside, axe: viol, problems: log.filter((l) => !/ERR_BLOCKED_BY_CLIENT|tailwind is not defined/.test(l)) })
    console.log(s.name, width, 'overflow', m.scrollWidth > m.innerWidth, `${m.scrollWidth}/${m.innerWidth}`, 'small', m.small.length, 'outside', m.outside.length, 'axe', viol.map((v) => `${v.impact}:${v.id}(${v.nodes})`).join(','), log.filter((l) => !/ERR_BLOCKED_BY_CLIENT|tailwind is not defined/.test(l)).join(' | '))
    await ctx.close()
  }
}
writeFileSync(`${EV}/styled-metrics${only ? '-' + only : ''}.json`, JSON.stringify(results, null, 1))
await browser.close()
