import { chromium } from '/home/claude/ankanu-profile-fix/code/node_modules/@playwright/test/index.mjs'
import { readFileSync } from 'node:fs'
export const SC = '/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3'
export const EV = '/home/claude/ankanu-profile-fix/code/docs/qa-handoffs/fix-profile-edit-flow-evidence'
export const BASE = process.env.BASE ?? 'http://localhost:4043'
export const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
export function cookieFor(label) {
  const raw = readFileSync(`${SC}/cookie-${label}.txt`, 'utf8').trim()
  const [name, ...rest] = raw.split('=')
  return { name, value: rest.join('='), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
}
export async function launch(opts = {}) {
  return chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'], ...opts })
}
/** A context for one member. Blocks the hosts the sandbox cannot reach (CDN, fonts, reCAPTCHA) so they fail fast. */
export async function memberContext(browser, label, viewport = { width: 360, height: 780 }, extra = {}) {
  const ctx = await browser.newContext({ viewport, locale: 'fr-FR', timezoneId: 'Africa/Ouagadougou', ...extra })
  if (label) await ctx.addCookies([cookieFor(label)])
  await ctx.route(/^https?:\/\/(?!localhost)/, (route) => route.abort('blockedbyclient'))
  return ctx
}
export function watch(page, log) {
  page.on('console', (m) => log.push(`console.${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => log.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => { if (r.status() >= 400) log.push(`http ${r.status()}: ${r.request().method()} ${r.url()}`) })
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
