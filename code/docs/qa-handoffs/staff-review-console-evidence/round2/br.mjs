import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire('/home/claude/ankanu-qa-review/code/package.json')
export const { chromium } = require('playwright-core')
export const AxeBuilder = require('@axe-core/playwright').default ?? require('@axe-core/playwright')
export const BASE = 'http://localhost:4022'
const S = process.env.QAS
export const EV = '/home/claude/ankanu-qa-review/code/docs/qa-handoffs/staff-review-console-evidence/round2'
export const WIDTHS = [360, 390, 768, 1024, 1280, 1440]
export async function launch(extraArgs = []) {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...extraArgs] })
}
export async function newCtx(browser, cookie, opts = {}) {
  const ctx = await browser.newContext({ baseURL: BASE, locale: 'fr-FR', timezoneId: 'Africa/Ouagadougou', viewport: { width: 1440, height: 900 }, permissions: ['camera'], ...opts })
  const tw = readFileSync(`${S}/tw.css`, 'utf8')
  await ctx.route('https://cdn.tailwindcss.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: `window.tailwind={};(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(tw + '\n.material-symbols-outlined{display:inline-block;width:1em;height:1em;overflow:hidden;font-size:24px;line-height:1}')};document.head.appendChild(s)})()` }))
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ contentType: 'text/css', body: '' }))
  await ctx.route(/google\.com\/recaptcha|gstatic\.com\/recaptcha/, (r) => r.fulfill({ contentType: 'application/javascript', body: 'window.grecaptcha={};' }))
  if (cookie) { const v = cookie.split('=')[1]; await ctx.addCookies([{ name: 'ankanu_session', value: v, url: BASE }]) }
  return ctx
}
export function watch(page, bag) {
  bag.console = []; bag.failed = []; bag.bad = []; bag.reqs = []
  page.on('console', (m) => { if (m.type() === 'error') bag.console.push(m.text() + ' ' + m.location().url) })
  page.on('pageerror', (e) => bag.console.push('PAGEERROR ' + e.message))
  page.on('requestfailed', (r) => bag.failed.push(r.method() + ' ' + r.url() + ' ' + r.failure()?.errorText))
  page.on('response', (r) => { bag.reqs.push(r.status() + ' ' + r.request().method() + ' ' + r.url()); if (r.status() >= 400) bag.bad.push(r.status() + ' ' + r.request().method() + ' ' + r.url()) })
}
export async function axe(page, label, out) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  const lines = violations.flatMap((v) => v.nodes.map((n) => `${v.impact} ${v.id} ${n.target.join(' ')} :: ${n.any[0]?.message ?? v.help}`))
  out.push(`AXE ${label}: ${violations.length} rules, serious/critical=${violations.filter((v) => ['serious', 'critical'].includes(v.impact)).length}`)
  lines.forEach((l) => out.push('   ' + l))
  return violations
}
