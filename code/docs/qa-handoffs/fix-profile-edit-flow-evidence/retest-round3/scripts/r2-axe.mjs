// G6/G4 retest: styled render (real fonts, per-page compiled Tailwind) of the three touched screens at the six widths: axe (all tags), overflow, touch targets.
import { launch, memberContext, watch, sleep, BASE, EV } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import AxeBuilder from '/home/claude/ankanu-profile-fix/code/node_modules/@axe-core/playwright/dist/index.mjs'
const WIDTHS = [360, 390, 768, 1024, 1280, 1440]
const label = { edit: process.argv[2] ?? 'r3a', review: process.argv[3] ?? 'r3photo' }
const SCREENS = [
  { name: 'profile-edit', path: '/profile-edit', label: label.edit, ready: () => /^\d{4}-/.test(document.getElementById('dob').value) },
  { name: 'pin', path: '/pin?next=%2Fprofile-edit', label: label.edit, ready: () => document.querySelectorAll('.pin-dot').length === 6 },
  { name: 'profile-review', path: '/profile-review', label: label.review, ready: () => document.body.innerText.includes('modération') },
]
mkdirSync(`${EV}/shots`, { recursive: true })
const browser = await launch()
const results = []
for (const s of SCREENS) {
  for (const width of WIDTHS) {
    const ctx = await memberContext(browser, s.label, { width, height: 800 })
    const page = await ctx.newPage()
    const log = []; watch(page, log)
    await page.goto(`${BASE}${s.path}`, { waitUntil: 'load' })
    await page.waitForFunction(s.ready, null, { timeout: 20000 }).catch(() => log.push('ready-timeout'))
    await sleep(600)
    const m = await page.evaluate(() => {
      const vw = window.innerWidth; const out = []
      for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], label')) {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none' || el.classList.contains('sr-only')) continue
        const label = (el.getAttribute('aria-label') || el.textContent || el.id || el.name || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
        out.push({ tag: el.tagName.toLowerCase(), id: el.id || null, label, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), left: Math.round(r.left) })
      }
      return { scrollWidth: document.documentElement.scrollWidth, innerWidth: vw, small: out.filter((x) => (x.w < 44 || x.h < 44) && !(x.tag === 'label' && x.w >= 44)), outside: out.filter((x) => x.right > vw + 1 || x.left < -1), styled: !!document.querySelector('style[data-qa-tailwind]'), icons: document.fonts.check('24px "Material Symbols Outlined"') }
    })
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    const viol = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), msg: (n.any[0]?.message ?? n.all[0]?.message ?? '').slice(0, 140) })) }))
    await page.screenshot({ path: `${EV}/shots/r3-${s.name}-${width}.png`, fullPage: true })
    results.push({ screen: s.name, width, overflow: m.scrollWidth > m.innerWidth, scrollWidth: m.scrollWidth, innerWidth: m.innerWidth, styled: m.styled, iconFont: m.icons, small: m.small, outside: m.outside, axe: viol, problems: log.filter((l) => !/ERR_NAME_NOT_RESOLVED|recaptcha|autocomplete|favicon/.test(l)) })
    const ser = viol.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    console.log(s.name, width, 'overflow', m.scrollWidth > m.innerWidth, `${m.scrollWidth}/${m.innerWidth}`, 'styled', m.styled, 'small', m.small.length, 'outside', m.outside.length, 'serious/critical', ser.map((v) => `${v.id}(${v.nodes.length})`).join(',') || 'none', 'other', viol.filter((v) => !ser.includes(v)).map((v) => `${v.id}:${v.impact}(${v.nodes.length})`).join(','))
    await ctx.close()
  }
}
writeFileSync(`${EV}/r3-styled-metrics.json`, JSON.stringify(results, null, 1))
await browser.close()
