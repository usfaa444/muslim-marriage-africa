// Security: where does /pin?next=... send the browser after a successful PIN? Real browser, real API.
import { launch, memberContext, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = []; const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, process.argv[2] ?? 'photo1', { width: 390, height: 800 })
const cases = [
  ['control: plain path', '/profile-edit'],
  ['control: protocol-relative //', '//evil.example/x'],
  ['control: backslash /\\', '/\\evil.example/x'],
  ['control: absolute https', 'https://evil.example/x'],
  ['control: javascript:', 'javascript:alert(1)'],
  ['tab inside: /<TAB>/evil', '/\t/evil.example/x'],
  ['newline inside: /<LF>/evil', '/\n/evil.example/x'],
  ['carriage return inside: /<CR>/evil', '/\r/evil.example/x'],
  ['tab then backslash: /<TAB>\\evil', '/\t\\evil.example/x'],
]
for (const [name, next] of cases) {
  const page = await ctx.newPage()
  const requested = []
  page.on('request', (r) => { if (r.isNavigationRequest()) requested.push(r.url()) })
  await page.goto(`${BASE}/pin?next=${encodeURIComponent(next)}`, { waitUntil: 'load' })
  for (const d of '135790') await page.locator(`[data-key="${d}"]`).click()
  await sleep(2500)
  const external = requested.filter((u) => !u.startsWith(BASE))
  say(`${name} | next=${JSON.stringify(next)} | navigations=${JSON.stringify(requested.map((u) => u.replace(BASE, '')))} | LEFT ORIGIN: ${external.length > 0 ? 'YES -> ' + external.join(',') : 'no'}`)
  await page.close()
  await sleep(6000)
}
writeFileSync(`${EV}/sec-next-param.txt`, out.join('\n') + '\n')
await browser.close()
