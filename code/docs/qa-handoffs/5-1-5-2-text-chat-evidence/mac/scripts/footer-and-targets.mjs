// Scrolled to the bottom at each width: is any footer text or the composer under the fixed bottom nav? Lists every target size.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const [pairPath, OUT] = process.argv.slice(2)
const pair = JSON.parse(readFileSync(pairPath, 'utf8'))
const browser = await chromium.launch()
for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 900 } })
  await ctx.addCookies(pair.sister.cookies.map(([name, value]) => ({ name, value, domain: 'localhost', path: '/' })))
  const p = await ctx.newPage()
  for (const [screen, url] of [['list', '/discussions'], ['thread', `/discussions/${pair.conversation}`]]) {
    await p.goto('http://localhost:4012' + url, { waitUntil: 'networkidle' })
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await p.waitForTimeout(300)
    const r = await p.evaluate(() => {
      const nav = [...document.querySelectorAll('nav')].find((n) => getComputedStyle(n).position === 'fixed' || getComputedStyle(n.parentElement).position === 'fixed')
      const nr = nav?.getBoundingClientRect()
      const covered = []
      for (const el of document.querySelectorAll('footer *, textarea, button, a')) {
        if (nav?.contains(el) || !el.offsetParent) continue
        const b = el.getBoundingClientRect()
        if (nr && b.bottom > nr.top + 1 && b.top < nr.bottom && b.right > nr.left && b.left < nr.right && b.height > 0) covered.push(`${el.tagName} "${(el.innerText || '').trim().slice(0, 30)}"`)
      }
      const targets = [...document.querySelectorAll('a, button, textarea')].filter((e) => e.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return `${(e.innerText || e.getAttribute('aria-label') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 22)} ${Math.round(b.width)}x${Math.round(b.height)}` })
      return { navTop: nr && Math.round(nr.top), covered: [...new Set(covered)], targets }
    })
    console.log(screen, width, 'covered:', JSON.stringify(r.covered), '\n   targets:', r.targets.join(' | '))
    if (width === 360 || width === 1440) await p.screenshot({ path: `${OUT}/shots/${screen}-${width}-scrolled-bottom.png` })
  }
  await ctx.close()
}
await browser.close()
