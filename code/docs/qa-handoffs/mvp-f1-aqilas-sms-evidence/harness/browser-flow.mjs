// Real-browser QA of the phone/OTP flow against the local stack (aqilas mode, stub vendor).
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
const SHIM = readFileSync('/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa/tw/cdn-shim.js', 'utf8')
import { chromium, devices } from '/home/claude/muslim-marriage-africa/code/node_modules/playwright-core/index.mjs'
import AxeBuilder from '/home/claude/muslim-marriage-africa/code/node_modules/@axe-core/playwright/dist/index.mjs'

const WEB = 'http://localhost:4021'
const STUB = 'http://localhost:4023'
const EV = process.env.EV
mkdirSync(EV, { recursive: true })
const WIDTHS = [360, 390, 768, 1024, 1280, 1440]
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const results = []
const axeAll = {}
let n = Number(process.env.QA_START ?? 700)
let phoneN = Number(process.env.QA_PHONE_START ?? 600)

const psql = (q) => execFileSync('docker', ['exec', '-i', 'ankanu-qa-postgres-1', 'psql', '-U', 'ankanu', '-d', 'ankanu', '-At', '-c', q], { encoding: 'utf8' }).trim()
const stubMode = (m) => fetch(`${STUB}/__mode`, { method: 'POST', body: JSON.stringify({ status: 201, delay: 0, mode: 'normal', ...m }) })
const stubSeen = async () => (await fetch(`${STUB}/__seen`)).json()
const stubReset = () => fetch(`${STUB}/__reset`)
const LOG = process.env.QA_MODE === 'log'
const logCode = () => execFileSync('sh', ['-c', "docker logs ankanu-qa-api-1 2>&1 | grep -E '^otp [0-9]{6}$' | tail -n 1"], { encoding: 'utf8' }).trim().split(' ')[1]
const codeOf = (e) => /votre code est (\d{6})\./.exec(e?.body?.text ?? '')?.[1]
function check(id, desc, ok, detail = '') {
  results.push({ id, desc, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${desc}${detail ? ' | ' + detail : ''}`)
}
function note(id, desc, detail) {
  results.push({ id, desc, ok: null, detail })
  console.log(`NOTE ${id} ${desc} | ${detail}`)
}

async function account(label, { verified = true } = {}) {
  n += 1
  const email = `qa.${label}.${n}@example.bf`
  const res = await fetch(`${WEB}/v1/accounts`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: WEB },
    body: JSON.stringify({ email, password: 'phrase avec espaces', pseudonym: `Qb${label}${n}`, gender: 'brother', pledge_accepted: true, civil_given_name: 'Salif', civil_family_name: 'Ouedraogo', recaptcha_token: 'qa-token', coc_version: 'FR-089', dob: '1990-01-15' }),
  })
  const j = await res.json()
  if (res.status !== 201) throw new Error('signup ' + res.status + JSON.stringify(j))
  const value = res.headers.getSetCookie()[0].split(';')[0].split('=')[1]
  if (verified) psql(`update credential set email_verified_at=now() where account_id='${j.id}' and kind='password'`)
  return { id: j.id, cookie: value, email }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })

async function open(acc, { width = 390, height = 800, mobile = false, ...rest } = {}) {
  const ctx = await browser.newContext({
    ...(mobile ? devices['Pixel 7'] : {}),
    viewport: { width, height }, locale: 'fr-FR', timezoneId: 'Africa/Ouagadougou', baseURL: WEB, ...rest,
  })
  // Sandbox policy blocks cdn.tailwindcss.com (403). Serve the same utility CSS compiled locally with Tailwind 3.4 and the page's own config.
  await ctx.route(/cdn\.tailwindcss\.com/, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: SHIM }))
  if (acc) await ctx.addCookies([{ name: 'ankanu_session', value: acc.cookie, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
  const page = await ctx.newPage()
  const log = { console: [], pageerrors: [], failed: [], bad: [] }
  page.on('console', (m) => { if (m.type() === 'error') log.console.push(`${m.text()} ${m.location().url}`) })
  page.on('pageerror', (e) => log.pageerrors.push(e.message))
  page.on('requestfailed', (r) => log.failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => { if (r.status() >= 400) log.bad.push(`${r.status()} ${r.request().method()} ${r.url()}`) })
  page.qlog = log
  return { ctx, page }
}
async function axe(page, label) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  axeAll[label] = violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((x) => x.target.join(' ')) }))
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  return { violations, blocking }
}
const overflow = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
const shot = (page, name, opts = {}) => page.screenshot({ path: `${EV}/${name}.png`, ...opts })
const typePhone = async (page, digits) => { await page.locator('#phone-input').click(); await page.keyboard.type(digits) }
const nextPhone = () => { phoneN += 1; return String(phoneN).padStart(8, '0') }
const only = (process.env.QA_ONLY ?? '').split(',').filter(Boolean)
const want = (id) => only.length === 0 || only.includes(id)

try {
  await stubMode({}); await stubReset()

  // F1: happy path, mobile profile, UI only
  if (want('F1')) {
    const acc = await account('happy')
    const { ctx, page } = await open(acc, { width: 360, height: 780, mobile: true })
    await page.goto('/phone')
    check('F1a', '/phone renders for a phone-step account (no redirect)', new URL(page.url()).pathname === '/phone', page.url())
    await shot(page, 'f1a-phone-360')
    const digits = nextPhone()
    await typePhone(page, digits)
    await shot(page, 'f1b-phone-filled-360')
    await page.keyboard.press('Enter')
    await page.waitForURL('**/otp', { timeout: 8000 }).catch(() => {})
    const seen = await stubSeen()
    if (LOG) check('F1b', 'LOG MODE: submit -> /otp, vendor NOT called, code printed as `otp NNNNNN` in the api log', new URL(page.url()).pathname === '/otp' && seen.length === 0 && /^\d{6}$/.test(logCode() ?? ''), `url=${page.url()} vendorCalls=${seen.length} logCode=${logCode()}`)
    else check('F1b', 'submit -> /otp, vendor received exactly one SMS to +226<digits>', new URL(page.url()).pathname === '/otp' && seen.length === 1 && seen[0].body.to[0] === `+226${digits}`, `url=${page.url()} calls=${seen.length} to=${seen[0]?.body?.to}`)
    await page.locator('#phone-display').waitFor()
    await page.waitForFunction(() => document.getElementById('phone-display')?.textContent?.trim().length > 0, null, { timeout: 5000 }).catch(() => {})
    const disp = (await page.locator('#phone-display').textContent())?.trim()
    check('F1c', 'OTP screen shows only the masked number', /^\+226 \d\d •• •• \d\d$/.test(disp ?? '') && !(await page.content()).includes(`+226${digits}`), disp)
    await shot(page, 'f1c-otp-360')
    await page.reload()
    await page.waitForFunction(() => document.getElementById('phone-display')?.textContent?.trim().length > 0, null, { timeout: 5000 }).catch(() => {})
    check('F1d', 'reload on /otp keeps the pending state (masked number re-read from server)', new URL(page.url()).pathname === '/otp' && (await page.locator('#phone-display').textContent())?.trim() === disp, page.url())
    const code = LOG ? logCode() : codeOf(seen[0])
    await page.locator('.otp-digit').first().click()
    await page.keyboard.type(code)
    await shot(page, 'f1e-otp-filled-360')
    await page.keyboard.press('Enter')
    await page.waitForURL('**/id-liveness', { timeout: 8000 }).catch(() => {})
    check('F1e', 'code from the vendor SMS typed in the 6 boxes -> /id-liveness', new URL(page.url()).pathname === '/id-liveness', page.url())
    const st = psql(`select status from verification_record where account_id='${acc.id}' and kind='phone_otp'`)
    check('F1f', 'persisted: verification_record status granted', st === 'granted', st)
    const errs = [...page.qlog.console, ...page.qlog.pageerrors, ...page.qlog.failed, ...page.qlog.bad].filter((e) => !/favicon/.test(e))
    check('F1g', 'no console errors, page errors, failed requests or 4xx/5xx during the happy path', errs.length === 0, errs.join(' // '))
    await ctx.close()
  }

  // F2: widths + axe on both screens
  if (want('F2')) {
    const phoneAcc = await account('wphone')
    const otpAcc = await account('wotp')
    await stubReset()
    const sent = await fetch(`${WEB}/v1/verifications/otp`, { method: 'POST', headers: { 'content-type': 'application/json', origin: WEB, cookie: `ankanu_session=${otpAcc.cookie}` }, body: JSON.stringify({ action: 'send', phone_e164: '+22600000999' }) })
    check('F2pre', 'otp-step account prepared via API', sent.status === 201, String(sent.status))
    for (const [screen, acc, path] of [['phone', phoneAcc, '/phone'], ['otp', otpAcc, '/otp']]) {
      for (const w of WIDTHS) {
        const { ctx, page } = await open(acc, { width: w, height: 900 })
        await page.goto(path)
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(400)
        const o = await overflow(page)
        await shot(page, `f2-${screen}-${w}`, { fullPage: true })
        const a = await axe(page, `${screen}-${w}`)
        const small = await page.evaluate(() => [...document.querySelectorAll('button, a, input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44) }).map((e) => `${e.tagName.toLowerCase()}#${e.id || ''}.${(e.className || '').toString().slice(0, 20)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`))
        check(`F2-${screen}-${w}`, `${path} @${w}: no horizontal scroll; axe 0 serious/critical`, o.sw <= o.iw && a.blocking.length === 0, `scrollWidth=${o.sw} innerWidth=${o.iw} axe=${a.violations.map((v) => v.id + ':' + v.impact).join(',') || 'none'}${small.length ? ' smallTargets=' + small.join('; ') : ''}`)
        await ctx.close()
      }
    }
  }

  // F3: vendor failure as the member sees it
  if (want('F3')) {
    const acc = await account('fail')
    const { ctx, page } = await open(acc, { width: 390, height: 800 })
    await page.goto('/phone')
    await stubMode({ status: 500 }); await stubReset()
    const digits = nextPhone()
    await typePhone(page, digits)
    const respP = page.waitForResponse((r) => r.url().includes('/v1/verifications/otp') && r.request().method() === 'POST')
    await page.keyboard.press('Enter')
    const resp = await respP
    await page.waitForTimeout(1500)
    const body = await resp.text()
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    const live = await page.evaluate(() => [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map((e) => `${e.tagName}#${e.id}:${(e.textContent || '').trim().slice(0, 80)}`))
    await shot(page, 'f3a-phone-after-503')
    check('F3a', 'API answers 503 UNHANDLED retryable for the browser call', resp.status() === 503 && body.includes("L'envoi du code a échoué."), `${resp.status()} ${body.slice(0, 160)}`)
    const sawMessage = text.includes("L'envoi du code a échoué") || /réessay|échou|erreur/i.test(text)
    check('F3b', 'member is told the send failed and can retry (error message visible on /phone)', sawMessage, `visible text mentions failure: ${sawMessage}; role=alert/status/aria-live regions: ${JSON.stringify(live)}; url=${page.url()}`)
    check('F3c', 'form keeps the typed number after the failure', (await page.locator('#phone-input').inputValue()).replace(/\D/g, '') === digits, await page.locator('#phone-input').inputValue())
    await stubMode({ status: 201 }); await stubReset()
    await page.keyboard.press('Enter')
    await page.waitForURL('**/otp', { timeout: 8000 }).catch(() => {})
    check('F3d', 'after the vendor recovers, pressing Enter again sends and reaches /otp', new URL(page.url()).pathname === '/otp', page.url())
    const expected503 = page.qlog.bad.filter((e) => /^503 POST .*\/v1\/verifications\/otp/.test(e))
    const other = [...page.qlog.console.filter((c) => !/503|favicon/.test(c)), ...page.qlog.pageerrors, ...page.qlog.failed, ...page.qlog.bad.filter((e) => !/503 POST|favicon/.test(e))]
    note('F3e', 'console during failure', `expected 503 responses=${expected503.length}; console=${JSON.stringify(page.qlog.console)}; other problems=${JSON.stringify(other)}`)
    await ctx.close()
  }

  // F4: resend behaviour (cooldown, failure, new code replaces old)
  if (want('F4')) {
    const acc = await account('resend')
    const { ctx, page } = await open(acc, { width: 390, height: 800 })
    await stubMode({}); await stubReset()
    await page.goto('/phone')
    const digits = nextPhone()
    await typePhone(page, digits)
    await page.keyboard.press('Enter')
    await page.waitForURL('**/otp', { timeout: 8000 }).catch(() => {})
    const first = codeOf((await stubSeen())[0])
    await page.locator('#resend-btn').click()
    await page.waitForTimeout(800)
    let seen = await stubSeen()
    check('F4a', 'Resend inside 60 s: no second SMS (Story 2.7 cooldown)', seen.length === 1, `calls=${seen.length}`)
    psql(`update sms_dispatch set created_at = created_at - interval '2 minutes' where account_id='${acc.id}'`)
    await stubMode({ status: 500 })
    await page.locator('#resend-btn').click()
    await page.waitForTimeout(1000)
    seen = await stubSeen()
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    await shot(page, 'f4b-otp-resend-failed')
    check('F4b', 'Resend while vendor fails: vendor tried once; member sees an error', seen.length === 2 && /échou|réessay|erreur/i.test(text), `calls=${seen.length} errorVisible=${/échou|réessay|erreur/i.test(text)}`)
    const stillOld = psql(`select count(*) from verification_record where account_id='${acc.id}' and kind='phone_otp' and hash='${execFileSync('sh', ['-c', `printf %s ${first} | sha256sum | cut -d' ' -f1`], { encoding: 'utf8' }).trim()}'`)
    check('F4c', 'after the failed resend the first code is still the stored one', stillOld === '1', stillOld)
    await stubMode({ status: 201 })
    await page.locator('#resend-btn').click()
    await page.waitForTimeout(1000)
    seen = await stubSeen()
    const second = codeOf(seen[seen.length - 1])
    check('F4d', 'Resend with vendor healthy: new SMS with a different code', seen.length === 3 && second && second !== first, `calls=${seen.length} first=${first} second=${second}`)
    // old code no longer verifies, new does
    const post = (code) => fetch(`${WEB}/v1/verifications/otp`, { method: 'POST', headers: { 'content-type': 'application/json', origin: WEB, cookie: `ankanu_session=${acc.cookie}` }, body: JSON.stringify({ action: 'verify', code }) }).then((r) => r.status)
    const oldStatus = await post(first)
    const newStatus = await post(second)
    check('F4e', 'old code rejected (400), new code accepted (200)', oldStatus === 400 && newStatus === 200, `${oldStatus}/${newStatus}`)
    await ctx.close()
  }

  // F5: keyboard only
  if (want('F5')) {
    const acc = await account('kbd')
    const { ctx, page } = await open(acc, { width: 1280, height: 900 })
    await stubMode({}); await stubReset()
    await page.goto('/phone')
    let tabs = 0
    for (; tabs < 12; tabs++) {
      await page.keyboard.press('Tab')
      const id = await page.evaluate(() => document.activeElement?.id)
      if (id === 'phone-input') break
    }
    const reached = await page.evaluate(() => document.activeElement?.id)
    check('F5a', 'Tab reaches the phone input', reached === 'phone-input', `after ${tabs + 1} Tab presses`)
    const outline = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('phone-input').parentElement); return `${s.boxShadow} | ${s.borderColor}` })
    await shot(page, 'f5a-phone-focus-1280')
    await page.keyboard.type(nextPhone())
    await page.keyboard.press('Enter')
    await page.waitForURL('**/otp', { timeout: 8000 }).catch(() => {})
    const activeOnOtp = await page.evaluate(() => `${document.activeElement?.tagName}.${document.activeElement?.getAttribute('aria-label') || document.activeElement?.id}`)
    note('F5b', 'focus on arrival at /otp', activeOnOtp)
    const code = codeOf((await stubSeen())[0])
    let t2 = 0
    for (; t2 < 15; t2++) {
      await page.keyboard.press('Tab')
      const lbl = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
      if (lbl === 'Chiffre 1') break
    }
    await page.keyboard.type(code)
    await shot(page, 'f5b-otp-focus-1280')
    await page.keyboard.press('Enter')
    await page.waitForURL('**/id-liveness', { timeout: 8000 }).catch(() => {})
    check('F5c', 'whole flow completes with the keyboard only (Tab, digits, Enter)', new URL(page.url()).pathname === '/id-liveness', `${page.url()} tabsOnOtp=${t2 + 1}`)
    await ctx.close()
  }

  // F6: slow network (Slow 3G) and slow vendor; double submit
  if (want('F6')) {
    const acc = await account('slow')
    const { ctx, page } = await open(acc, { width: 360, height: 780, mobile: true })
    const cdp = await ctx.newCDPSession(page)
    await stubMode({ delay: 1500 }); await stubReset()
    await page.goto('/phone')
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 })
    await typePhone(page, nextPhone())
    const t0 = Date.now()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.locator('#send-code-btn').click({ noWaitAfter: true }).catch(() => {})
    await page.waitForURL('**/otp', { timeout: 30000 }).catch(() => {})
    const dt = Date.now() - t0
    const seen = await stubSeen()
    check('F6a', 'Slow 3G + 1.5 s vendor: reaches /otp; triple submit sends ONE SMS', new URL(page.url()).pathname === '/otp' && seen.length === 1, `${dt} ms to /otp; vendorCalls=${seen.length}`)
    note('F6b', 'time to feedback', `submit->/otp ${dt} ms (3G + 1.5 s vendor). The send button shows no pending/disabled state in this screen.`)
    await ctx.close()
    await stubMode({})
  }

  // F7: session expiry / signed out in the UI
  if (want('F7')) {
    const acc = await account('expiry')
    const { ctx, page } = await open(acc, { width: 390, height: 800 })
    await stubMode({}); await stubReset()
    await page.goto('/phone')
    await ctx.clearCookies()
    await typePhone(page, nextPhone())
    const respP = page.waitForResponse((r) => r.url().includes('/v1/verifications/otp') && r.request().method() === 'POST')
    await page.keyboard.press('Enter')
    const resp = await respP
    await page.waitForTimeout(800)
    const seen = await stubSeen()
    note('F7', 'session cleared mid-flow then submit', `api=${resp.status()} vendorCalls=${seen.length} url=${page.url()} (UI shows no message on 401)`)
    check('F7a', 'expired session: API 401 and no SMS sent', resp.status() === 401 && seen.length === 0, `${resp.status()} calls=${seen.length}`)
    await page.goto('/phone')
    check('F7b', 'deep link /phone while signed out -> /auth', new URL(page.url()).pathname === '/auth', page.url())
    await ctx.close()
  }

  // F8: back button and deep links
  if (want('F8')) {
    const acc = await account('back')
    const { ctx, page } = await open(acc, { width: 390, height: 800 })
    await stubMode({}); await stubReset()
    await page.goto('/phone')
    await typePhone(page, nextPhone())
    await page.keyboard.press('Enter')
    await page.waitForURL('**/otp', { timeout: 8000 }).catch(() => {})
    await page.goBack()
    await page.waitForTimeout(800)
    note('F8a', 'Back from /otp', `lands on ${new URL(page.url()).pathname}`)
    await page.goto('/phone')
    check('F8b', 'deep link /phone while code pending is redirected to /otp (server-side step guard)', new URL(page.url()).pathname === '/otp', page.url())
    await page.goto('/id-liveness')
    check('F8c', 'deep link to a later step while pending -> /otp', new URL(page.url()).pathname === '/otp', page.url())
    const link = await page.locator('a', { hasText: 'Modifier le numéro' }).first().getAttribute('href').catch(() => null)
    note('F8d', 'change-number link on /otp', String(link))
    await ctx.close()
  }

  // F9: zoom / reflow
  if (want('F9')) {
    const acc = await account('zoom')
    await stubMode({}); await stubReset()
    for (const [w, label] of [[320, '320 (400% of 1280)'], [720, '720 (200% of 1440)']]) {
      const { ctx, page } = await open(acc, { width: w, height: 800 })
      await page.goto('/phone')
      const o = await overflow(page)
      await shot(page, `f9-phone-${w}`)
      check(`F9-${w}`, `/phone reflows at ${label}: no horizontal scroll`, o.sw <= o.iw, `${o.sw}/${o.iw}`)
      await ctx.close()
    }
  }

  // F10: stored XSS / injection via the form (client sends digits only; also try the raw API from the page context)
  if (want('F10')) {
    const acc = await account('xss')
    await stubMode({}); await stubReset()
    const { ctx, page } = await open(acc, { width: 390, height: 800 })
    await page.goto('/phone')
    await page.locator('#phone-input').click()
    await page.keyboard.type("<img src=x onerror=alert(1)>'; DROP--")
    const val = await page.locator('#phone-input').inputValue()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(600)
    const seen = await stubSeen()
    check('F10', 'non-digit junk in the field never reaches the vendor (client needs 8 digits; server validates E.164)', seen.length === 0 && new URL(page.url()).pathname === '/phone', `typed=${JSON.stringify(val)} vendorCalls=${seen.length}`)
    await ctx.close()
  }
} finally {
  writeFileSync(`${EV}/g6-axe-violations.json`, JSON.stringify(axeAll, null, 1))
  await browser.close()
  const f = results.filter((r) => r.ok === false)
  console.log(`\nSUMMARY ${results.filter((r) => r.ok === true).length} pass, ${f.length} fail, ${results.filter((r) => r.ok === null).length} notes`)
  if (f.length) console.log('FAILED:', f.map((x) => x.id).join(', '))
}
