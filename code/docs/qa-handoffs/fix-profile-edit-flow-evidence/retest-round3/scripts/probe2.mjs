import { launch, memberContext, sleep, BASE, EV } from './lib.mjs'
const browser = await launch()
const ctx = await memberContext(browser, process.argv[2] ?? null, { width: 390, height: 800 })
const page = await ctx.newPage()
const log = []
page.on('console', (m) => log.push(`console.${m.type()}: ${m.text()}`))
page.on('requestfailed', (r) => log.push(`failed ${r.url()} ${r.failure()?.errorText}`))
await page.goto(`${BASE}${process.argv[3] ?? '/auth'}`, { waitUntil: 'load' })
await sleep(1500)
const info = await page.evaluate(async () => {
  await document.fonts.ready
  return { tailwind: 'tailwind' in window, styleTag: !!document.querySelector('style[data-qa-tailwind]'), cssBytes: document.querySelector('style[data-qa-tailwind]')?.textContent.length, bodyFont: getComputedStyle(document.body).fontFamily, iconFont: document.fonts.check('24px "Material Symbols Outlined"'), fonts: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight).slice(0,8), sw: document.documentElement.scrollWidth, iw: innerWidth }
})
console.log(JSON.stringify(info)); console.log(log.join('\n'))
await page.screenshot({ path: `${EV}/probe2-${(process.argv[3] ?? '/auth').replace(/\W+/g,'_')}.png`, fullPage: false })
await browser.close()
