import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('/home/claude/muslim-marriage-africa/code/package.json')
export const { chromium } = require('@playwright/test')
export const AxeBuilder = require('@axe-core/playwright').default
export const WEB = 'http://localhost:3100'
export const EV = '/home/claude/muslim-marriage-africa/code/docs/qa-handoffs/4-1-4-2-send-invite-and-quota-evidence'
const CSS = '/tmp/claude-0/tw/out.css'
export async function launch() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
}
export async function ctxFor(browser, cookie, { width = 390, height = 800, collect } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'fr-FR', timezoneId: 'Africa/Ouagadougou', serviceWorkers: 'block' })
  if (cookie) { const [n, v] = cookie.split('='); await ctx.addCookies([{ name: n, value: v, url: WEB }]) }
  const FD = '/tmp/claude-0/tw/node_modules/'
  const fontFiles = { ms: FD + 'material-symbols/material-symbols-outlined.woff2', nw4: FD + '@fontsource/newsreader/files/newsreader-latin-400-normal.woff2', nw5: FD + '@fontsource/newsreader/files/newsreader-latin-500-normal.woff2', pj4: FD + '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2', pj6: FD + '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2', pj7: FD + '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2' }
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: 'text/css', body: `@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:100 700;src:url(https://fonts.gstatic.com/qa/ms.woff2) format('woff2')}.material-symbols-outlined{font-family:'Material Symbols Outlined';font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:'liga';font-feature-settings:'liga';-webkit-font-smoothing:antialiased}@font-face{font-family:'Newsreader';font-weight:300 700;src:url(https://fonts.gstatic.com/qa/nw4.woff2) format('woff2')}@font-face{font-family:'Plus Jakarta Sans';font-weight:300 500;src:url(https://fonts.gstatic.com/qa/pj4.woff2) format('woff2')}@font-face{font-family:'Plus Jakarta Sans';font-weight:600 700;src:url(https://fonts.gstatic.com/qa/pj7.woff2) format('woff2')}` }))
  await ctx.route(/fonts\.gstatic\.com\/qa\//, (r) => { const k = r.request().url().split('/').pop().replace('.woff2', ''); r.fulfill({ contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(fontFiles[k]) }) })
  await ctx.route(/cdn\.tailwindcss\.com/, (r) => {
    const css = fs.existsSync(CSS) ? fs.readFileSync(CSS, 'utf8') : ''
    r.fulfill({ contentType: 'application/javascript', body: `window.tailwind={};(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s)})()` })
  })
  return ctx
}
export function watch(page, log) {
  page.on('console', (m) => { if (m.type() === 'error') log.push('console: ' + m.text()) })
  page.on('pageerror', (e) => log.push('pageerror: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) log.push(`http ${r.status()} ${r.request().method()} ${r.url()}`) })
}
