import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  authHtml,
  emailHtml,
  idHtml,
  identityHtml,
  onboardingHtml,
  otpHtml,
  phoneHtml,
  photoHtml,
  pinHtml,
  profileHtml,
  pseudonymHtml,
  reviewHtml,
  resetHtml,
  settingsHtml,
  splashHtml,
  statusHtml,
} from './v2-pages.js'
import { discoverHtml } from './discover-page.js'
import { profileDetailHtml, type ProfileDetailView } from './profile-detail.js'

const WIDTHS = [360, 390, 768, 1024, 1280, 1440] as const
const SHOTS = new Set([360, 1440])

function chromeBinary(): string | null {
  const found: string[] = []
  if (process.env.ANKANU_CHROME) {
    found.push(process.env.ANKANU_CHROME)
  }
  found.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser')
  const cache = join(homedir(), '.cache/ms-playwright')
  if (existsSync(cache)) {
    for (const dir of ['chromium-1243', 'chromium-1194', 'chromium-1187']) {
      found.push(join(cache, dir, 'chrome-linux64', 'chrome'))
      found.push(join(cache, dir, 'chrome-linux', 'chrome'))
    }
  }
  return found.find((path) => existsSync(path)) ?? null
}

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

function screens(): Array<{ name: string; html: string }> {
  const auth = stitch('02-auth')
  return [
    { name: '00-splash', html: splashHtml() },
    { name: '01-identity', html: identityHtml(stitch('03-age-gate')) },
    { name: '02-pseudonym', html: pseudonymHtml(stitch('54-pseudonym-dob')) },
    { name: '03-account', html: authHtml(auth, 'signup', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI') },
    { name: '04-sign-in', html: authHtml(auth, 'login', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI') },
    {
      name: '04b-sign-in-error',
      html: authHtml(auth, 'login', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI')
        .replace(
          'class="hidden text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="login-error"',
          'class="text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="login-error"',
        )
        .replace(
          'id="login-error"><span class="material-symbols-outlined text-[14px]" data-icon="error">error</span> ',
          'id="login-error"><span class="material-symbols-outlined text-[14px]" data-icon="error">error</span> Identifiant ou mot de passe incorrect.',
        ),
    },
    { name: '05-email', html: emailHtml(stitch('04-email-verification')) },
    {
      name: '05b-email-long',
      html: emailHtml(stitch('04-email-verification')).replace(
        'id="currentEmail">',
        'id="currentEmail">prenom.tres.long.ibrahim.sawadogo.ouagadougou@exemple-domaine.bf',
      ),
    },
    {
      name: '05c-email-expired',
      html: emailHtml(stitch('04-email-verification'))
        .replace('Vérification de votre adresse email', 'Lien expiré ou adresse inconnue')
        .replace(
          'class="hidden text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="email-link-error"',
          'class="text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="email-link-error"',
        )
        .replace('id="email-link-error-text"></span>', 'id="email-link-error-text">Lien expiré ou caduc.</span>')
        .replace('>Renvoyer le lien de confirmation<', '>Renvoyer un lien<'),
    },
    { name: '06-phone', html: phoneHtml(stitch('06-otp')) },
    {
      name: '07-otp',
      html: otpHtml(stitch('56-otp-alt')).replace(
        'id="phone-display"></span>',
        'id="phone-display">+226 70 •• •• 19</span>',
      ),
    },
    { name: '08-id', html: idHtml(stitch('07-id-liveness')) },
    {
      name: '08b-id-error',
      html: idHtml(stitch('07-id-liveness'))
        .replace(
          'class="hidden w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-[#9B2C2C] flex items-start gap-1 font-medium" id="id-error"',
          'class="w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-[#9B2C2C] flex items-start gap-1 font-medium" id="id-error"',
        )
        .replace(
          'id="id-error-text"></span>',
          'id="id-error-text">La pièce d\'identité et la photo de présence sont manquantes.</span>',
        ),
    },
    { name: '09-reset', html: resetHtml(stitch('05-password-reset')) },
    { name: '09b-reset-renew', html: resetHtml(stitch('05-password-reset'), 'renew') },
    { name: '09c-reset-invalid', html: resetHtml(stitch('05-password-reset'), 'invalid') },
    { name: '09d-reset-done', html: resetHtml(stitch('05-password-reset'), 'done') },
    { name: '10-pin', html: pinHtml(stitch('10-pin-lock')) },
    { name: '11-onboarding', html: onboardingHtml(stitch('08-onboarding')) },
    { name: '12-photo', html: photoHtml(stitch('09-photo-rules')) },
    { name: '13-profile', html: profileHtml(stitch('11-profile-edit')) },
    {
      name: '13d-profile-strike',
      html: profileHtml(stitch('11-profile-edit')).replace(
        '<p id="profile-save-status" class="hidden w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-deep-navy" role="status"></p>',
        '<p id="profile-save-status" class="w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-deep-navy" role="status">Envoi de photos suspendu jusqu\'au 14/10 à 02:00 : 3 photos ont été refusées.</p>',
      ),
    },
    { name: '13b-profile-replacement', html: profileHtml(stitch('11-profile-edit')) },
    { name: '13e-profile-cap', html: profileHtml(stitch('11-profile-edit')) },
    { name: '13b-profile-review', html: reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 24, bioPending: true }) },
    { name: '13c-profile-review-no-bio', html: reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 48, bioPending: false }) },
    { name: '14-settings', html: settingsHtml(stitch('27-settings')) },
    { name: '15-status', html: statusHtml(stitch('28-delete-export-status')) },
    { name: '16-profile-detail', html: profileDetailHtml(stitch('15-profile-detail'), profileDetailView(true)) },
    { name: '16b-profile-phone', html: profileDetailHtml(stitch('15-profile-detail'), profileDetailView(false)) },
    {
      name: '17-discover',
      html: discoverHtml(
        stitch('57-discover'),
        readFileSync(
          fileURLToPath(new URL('../../../design-stitch/ankanu-v2/57-discover/grid.html', import.meta.url)),
          'utf8',
        ),
      ),
    },
  ]
}

function profileDetailView(identity: boolean): ProfileDetailView {
  return {
    profile: {
      id: '01990000-0000-7000-8000-000000000099',
      pseudonym: 'Aminata_KDG_long_pseudonym',
      age: 29,
      city: 'ouagadougou',
      country: 'BF',
      profession: 'ingenierie',
      marital_status: 'single',
      polygamy_intent: 'no',
      madhhab: 'apprentissage',
      practice: 'assidue',
      life_plans: 'tf:serene\nUn foyer stable, avec de la patience et le respect du rythme de chacun.',
    },
    verification: { phone: true, id: identity, mahram: identity },
    photo_blur: true,
    photos: [1, 2, 3, 4].map((index) => ({
      id: `01990000-0000-7000-8000-00000000010${index}`,
      is_main: index === 1,
      url: `/v1/media/get?token=photo-${index}`,
    })),
  }
}

type CdpResult = Record<string, unknown>

function connect(
  wsUrl: string,
  onEvent?: (message: { method?: string; params?: { exceptionDetails?: { text?: string } } }) => void,
): Promise<{
  send: (method: string, params?: object, sessionId?: string) => Promise<CdpResult>
  wait: (method: string, sessionId?: string) => Promise<void>
  close: () => void
}> {
  const ws = new WebSocket(wsUrl)
  let seq = 0
  const pending = new Map<number, { resolve: (value: CdpResult) => void; reject: (error: Error) => void }>()
  const waits: Array<{ method: string; sessionId?: string; resolve: () => void }> = []
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number
      method?: string
      sessionId?: string
      params?: { exceptionDetails?: { text?: string } }
      result?: CdpResult
      error?: { message?: string }
    }
    if (message.id && pending.has(message.id)) {
      const waiter = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) {
        waiter?.reject(new Error(message.error.message ?? 'cdp error'))
      } else {
        waiter?.resolve(message.result ?? {})
      }
      return
    }
    if (!message.method) {
      return
    }
    onEvent?.(message)
    for (let index = waits.length - 1; index >= 0; index -= 1) {
      const waiter = waits[index]
      if (waiter && waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
        waits.splice(index, 1)
        waiter.resolve()
      }
    }
  })
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params, sessionId) {
          const id = ++seq
          return new Promise((resolveSend, rejectSend) => {
            pending.set(id, { resolve: resolveSend, reject: rejectSend })
            ws.send(JSON.stringify({ id, method, params, sessionId }))
          })
        },
        wait(method, sessionId) {
          return new Promise((resolveWait) => {
            waits.push({ method, sessionId, resolve: resolveWait })
          })
        },
        close() {
          ws.close()
        },
      })
    })
    ws.addEventListener('error', () => reject(new Error('chrome socket failed')))
  })
}

function launch(binary: string, profile: string): Promise<{ proc: ChildProcessWithoutNullStreams; ws: string }> {
  const proc = spawn(
    binary,
    ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  return new Promise((resolve, reject) => {
    let buf = ''
    const take = (chunk: Buffer) => {
      buf += chunk.toString()
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match?.[1]) {
        resolve({ proc, ws: match[1] })
      }
    }
    proc.stdout.on('data', take)
    proc.stderr.on('data', take)
    proc.on('exit', (code) => reject(new Error(`chrome exited ${code ?? 0}: ${buf.slice(-400)}`)))
  })
}

const CREAM = 'rgb(247, 241, 227)'
const NAVY = 'rgb(11, 29, 54)'
const CREAM_90 = 'rgba(247, 241, 227, 0.9)'
const CARD_90 = 'rgba(251, 248, 241, 0.9)'
const BORDER = 'rgb(226, 212, 184)'
const BORDER_90 = 'rgba(226, 212, 184, 0.9)'
const MUTED_90 = 'rgba(122, 117, 105, 0.9)'

type ColorExpect = {
  control: string
  controlBg: string
  controlColor: string
  input?: string
  inputBg?: string
  inputBorder?: string
  inputOnParent?: boolean
  pseudonym?: boolean
}

const COLOR_EXPECT: Record<string, ColorExpect> = {
  '00-splash': { control: 'a.continue', controlBg: NAVY, controlColor: CREAM },
  '01-identity': {
    control: '#submitBtn',
    controlBg: NAVY,
    controlColor: CREAM,
    input: '#first-name',
    inputBg: CREAM_90,
    inputBorder: BORDER,
  },
  '02-pseudonym': {
    control: 'button[type="submit"]',
    controlBg: NAVY,
    controlColor: CREAM,
    pseudonym: true,
  },
  '03-account': {
    control: '#signup-submit',
    controlBg: NAVY,
    controlColor: CREAM,
    input: '#signup-email',
    inputBg: CREAM,
    inputBorder: BORDER,
  },
  '04-sign-in': {
    control: '#login-submit',
    controlBg: NAVY,
    controlColor: CREAM,
    input: '#login-email',
    inputBg: CREAM,
    inputBorder: BORDER,
  },
  '05-email': { control: '#resendBtn', controlBg: NAVY, controlColor: CREAM },
  '06-phone': {
    control: '#send-code-btn',
    controlBg: NAVY,
    controlColor: CREAM,
    input: '#phone-input',
    inputBg: CREAM,
    inputBorder: BORDER,
    inputOnParent: true,
  },
  '07-otp': {
    control: '#submit-btn',
    controlBg: NAVY,
    controlColor: CREAM,
    input: 'input[aria-label="Chiffre 2"]',
    inputBg: CREAM,
    inputBorder: BORDER,
  },
  '08-id': { control: 'confirm', controlBg: NAVY, controlColor: CREAM },
  '08b-id-error': { control: 'confirm', controlBg: NAVY, controlColor: CREAM },
  '09-reset': {
    control: 'button[type="submit"]',
    controlBg: NAVY,
    controlColor: CREAM,
    input: '#email',
    inputBg: CREAM,
    inputBorder: BORDER,
    inputOnParent: true,
  },
  '10-pin': { control: '#btn-submit', controlBg: NAVY, controlColor: CREAM },
  '11-onboarding': { control: 'a[href="#consultation"]', controlBg: NAVY, controlColor: CREAM },
}

function colorExpression(spec: ColorExpect): string {
  return `(() => {
    const norm = (value) => (value || '').replace(/\\s+/g, '')
    const pageBg = (el) => {
      const bg = getComputedStyle(el).backgroundColor
      const flat = norm(bg)
      if (!flat || flat === 'transparent' || flat === 'rgba(0,0,0,0)') {
        return getComputedStyle(document.documentElement).backgroundColor
      }
      return bg
    }
    const marker = ${JSON.stringify(spec.control)}
    const control = marker === 'confirm'
      ? Array.from(document.querySelectorAll('button')).find((el) => (el.textContent || '').indexOf('Confirmer et transmettre') !== -1)
      : document.querySelector(marker)
    const controlStyle = control ? getComputedStyle(control) : null
    let input = ${spec.input ? `document.querySelector(${JSON.stringify(spec.input)})` : 'null'}
    if (input && ${spec.inputOnParent ? 'true' : 'false'} && input.parentElement) input = input.parentElement
    const inputStyle = input ? getComputedStyle(input) : null
    const card = document.querySelector('[data-purpose="identification-container"] > div')
    const field = document.querySelector('[data-purpose="field-pseudonym"] .form-input-custom')
    const muted = document.querySelector('[data-purpose="field-pseudonym"] p')
    const error = document.getElementById('id-error-text')
    return {
      pageBg: norm(pageBg(document.body)),
      bodyColor: norm(getComputedStyle(document.body).color),
      controlBg: controlStyle ? norm(controlStyle.backgroundColor) : '',
      controlColor: controlStyle ? norm(controlStyle.color) : '',
      inputBg: inputStyle ? norm(inputStyle.backgroundColor) : '',
      inputBorder: inputStyle ? norm(inputStyle.borderTopColor) : '',
      cardBg: card ? norm(getComputedStyle(card).backgroundColor) : '',
      fieldBorder: field ? norm(getComputedStyle(field).borderTopColor) : '',
      muted: muted ? norm(getComputedStyle(muted).color) : '',
      errorColor: error ? norm(getComputedStyle(error).color) : '',
    }
  })()`
}

function sameColor(actual: string, expected: string): boolean {
  return actual.replace(/\s+/g, '') === expected.replace(/\s+/g, '')
}

const FIT = `(() => {
  const width = window.innerWidth
  const scrollWidth = document.documentElement.scrollWidth
  const bad = []
  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect()
    const overflowX = getComputedStyle(el).overflowX
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
      bad.push((el.id || el.tagName) + ' overflow-x ' + el.scrollWidth + '>' + el.clientWidth)
    }
    if (rect.width < 1 || rect.height < 1) continue
    if (rect.right > width + 1 || rect.left < -1) {
      bad.push((el.id || el.tagName) + ' ' + Math.round(rect.left) + '..' + Math.round(rect.right))
    }
    if (bad.length >= 8) break
  }
  return { width, scrollWidth, bad }
})()`

describe('v2 screens fit the required widths', () => {
  const binary = chromeBinary()
  it.skipIf(!binary)('keeps scrollWidth within the viewport at every required width', async () => {
    const pages = screens()
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/v1/me/profile') {
        const referer = request.headers.referer ?? ''
        const live = (id: string, main: boolean) => ({
          id,
          moderation_state: 'live',
          is_main: main,
          caption: null,
          url: `/v1/media/get?token=${id}`,
        })
        const pending = {
          id: 'pending',
          moderation_state: 'pending',
          is_main: false,
          caption: 'Photo en revue — pas encore publique.',
          url: '/v1/media/get?token=pending',
        }
        let photos = [pending]
        if (referer.includes('13b-profile-replacement')) {
          photos = [live('main', true), live('other', false), pending]
        }
        if (referer.includes('13e-profile-cap')) {
          photos = [live('p0', true), live('p1', false), live('p2', false), live('p3', false), live('p4', false), pending]
        }
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        response.end(JSON.stringify({ dob: '1990-01-15', photo_blur: true, photo: photos[0], photos }))
        return
      }
      const name = url.pathname.slice(1)
      const page = pages.find((item) => item.name === name)
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(page ? page.html : 'missing')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('test server has no port')
    }
    const origin = `http://127.0.0.1:${address.port}`
    const profile = mkdtempSync(join(tmpdir(), 'ankanu-chrome-'))
    const shots = fileURLToPath(new URL('../../../docs/qa-handoffs/ank-83-widths/', import.meta.url))
    mkdirSync(shots, { recursive: true })
    const chrome = await launch(binary as string, profile)
    const cdp = await connect(chrome.ws)
    const failures: string[] = []
    try {
      const created = await cdp.send('Target.createTarget', { url: 'about:blank' })
      const targetId = String(created.targetId)
      const attached = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
      const sessionId = String(attached.sessionId)
      await cdp.send('Page.enable', {}, sessionId)
      await cdp.send('Runtime.enable', {}, sessionId)
      await cdp.send(
        'Page.addScriptToEvaluateOnNewDocument',
        {
          source:
            "try{sessionStorage.setItem('ankanu.signup.v2', JSON.stringify({civil_given_name:'Awa',civil_family_name:'Sawadogo',gender:'sister',pseudonym:'awa_94',dob:'1990-01-15'}))}catch(e){}",
        },
        sessionId,
      )
      for (const page of pages) {
        for (const width of WIDTHS) {
          await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 },
            sessionId,
          )
          const loaded = cdp.wait('Page.loadEventFired', sessionId)
          await cdp.send('Page.navigate', { url: `${origin}/${page.name}` }, sessionId)
          await loaded
          await cdp.send(
            'Runtime.evaluate',
            {
              expression: `new Promise((resolve) => { const start = Date.now(); const tick = () => { const body = document.body; const color = body ? getComputedStyle(body).backgroundColor : ''; const slot = document.querySelector('#login-recaptcha, #signup-recaptcha'); const widget = slot && slot.querySelector('iframe'); const grid = document.getElementById('profile-photo-grid'); const gridReady = !grid || grid.childElementCount > 0 || Date.now() - start > 2000; const styled = color && color !== 'rgba(0, 0, 0, 0)'; const captchaReady = !slot || widget || Date.now() - start > 6000; if ((styled && captchaReady && gridReady) || Date.now() - start > 8000) resolve(true); else setTimeout(tick, 100) }; tick() })`,
              awaitPromise: true,
            },
            sessionId,
          )
          const measured = await cdp.send(
            'Runtime.evaluate',
            { expression: FIT, returnByValue: true },
            sessionId,
          )
          const value = (measured.result as { value?: { width: number; scrollWidth: number; bad: string[] } } | undefined)
            ?.value
          if (page.name === '00-splash') {
            const buttons = await cdp.send(
              'Runtime.evaluate',
              {
                expression: `(() => {
                  const links = Array.from(document.querySelectorAll('a.continue, a.signin'))
                  return links.map((el) => {
                    const rect = el.getBoundingClientRect()
                    const style = getComputedStyle(el)
                    return {
                      text: (el.textContent || '').trim(),
                      href: el.getAttribute('href'),
                      height: rect.height,
                      top: rect.top,
                      bottom: rect.bottom,
                      left: rect.left,
                      right: rect.right,
                      display: style.display,
                    }
                  })
                })()`,
                returnByValue: true,
              },
              sessionId,
            )
            const links = (
              buttons.result as {
                value?: Array<{
                  text: string
                  href: string
                  height: number
                  top: number
                  bottom: number
                  left: number
                  right: number
                }>
              }
            )?.value
            const signup = links?.find((link) => link.href === '/signup/identity')
            const signin = links?.find((link) => link.href === '/auth')
            const signupWidth = signup ? signup.right - signup.left : 0
            const signinWidth = signin ? signin.right - signin.left : 0
            if (
              !signup ||
              !signin ||
              signup.text !== 'Créer un compte' ||
              signin.text !== 'Se connecter' ||
              signup.height < 44 ||
              signin.height < 44 ||
              signup.top < 0 ||
              signin.bottom > 900 ||
              signup.bottom > signin.top + 1 ||
              Math.abs(signupWidth - signinWidth) > 1 ||
              signup.left < -1 ||
              signin.left < -1 ||
              signup.right > width + 1 ||
              signin.right > width + 1
            ) {
              failures.push(
                `00-splash@${width} buttons ${JSON.stringify(links ?? [])}`,
              )
            }
          }
          if (page.name === '13b-profile-replacement') {
            const row = await cdp.send(
              'Runtime.evaluate',
              {
                expression: `(() => {
                  const slot = document.getElementById('profile-photo-grid')
                  const cap = document.getElementById('profile-photo-cap')
                  if (!slot) return { ok: false, reason: 'missing' }
                  const rect = slot.getBoundingClientRect()
                  const text = slot.textContent || ''
                  const chip = slot.querySelector('span.inline-flex')
                  const chipRect = chip ? chip.getBoundingClientRect() : null
                  const capHidden = !cap || getComputedStyle(cap).display === 'none'
                  return {
                    ok: rect.height > 1 && rect.right <= ${width} + 1 && rect.left >= -1 && text.includes('Principale') && text.includes('Définir comme principale') && text.includes('Photographie de profil') && text.includes('En revue') && text.includes('Ajouter une photo') && !text.includes('pas encore publique') && !text.includes('en cours de revue') && capHidden && chipRect && chipRect.right <= ${width} + 1 && chipRect.left >= -1,
                    right: Math.round(rect.right),
                    chipRight: chipRect ? Math.round(chipRect.right) : -1,
                    text: text.replace(/\\s+/g, ' ').slice(0, 160),
                  }
                })()`,
                returnByValue: true,
              },
              sessionId,
            )
            const shown = (row.result as { value?: { ok?: boolean; right?: number; chipRight?: number; reason?: string; text?: string } } | undefined)?.value
            if (!shown?.ok) {
              failures.push(
                `${page.name}@${width} gallery not inside the viewport right=${shown?.right ?? '?'} chip=${shown?.chipRight ?? '?'} ${shown?.reason ?? ''} ${shown?.text ?? ''}`,
              )
            }
          }
          if (page.name === '13e-profile-cap') {
            const row = await cdp.send(
              'Runtime.evaluate',
              {
                expression: `(() => {
                  const slot = document.getElementById('profile-photo-grid')
                  const cap = document.getElementById('profile-photo-cap')
                  if (!slot || !cap) return { ok: false, reason: 'missing' }
                  const text = (slot.textContent || '') + (cap.textContent || '')
                  const capStyle = getComputedStyle(cap)
                  return {
                    ok: capStyle.display !== 'none' && text.includes('6 photos maximum') && text.includes('Principale') && text.includes('En revue') && !text.includes('Ajouter une photo'),
                  }
                })()`,
                returnByValue: true,
              },
              sessionId,
            )
            const shown = (row.result as { value?: { ok?: boolean } } | undefined)?.value
            if (!shown?.ok) failures.push(`${page.name}@${width} cap state missing`)
          }
          if (page.name === '04b-sign-in-error') {
            const shown = await cdp.send(
              'Runtime.evaluate',
              {
                expression: `(() => {
                  const el = document.getElementById('login-error')
                  if (!el) return { ok: false, reason: 'missing' }
                  const style = getComputedStyle(el)
                  const rect = el.getBoundingClientRect()
                  const text = el.textContent || ''
                  return {
                    ok: style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 1 && text.includes('Identifiant ou mot de passe incorrect.'),
                    display: style.display,
                    height: Math.round(rect.height),
                  }
                })()`,
                returnByValue: true,
              },
              sessionId,
            )
            const errorLine = (shown.result as { value?: { ok?: boolean; display?: string; height?: number; reason?: string } } | undefined)
              ?.value
            if (!errorLine?.ok) {
              failures.push(
                `${page.name}@${width} error line not visible display=${errorLine?.display ?? '?'} height=${errorLine?.height ?? '?'} ${errorLine?.reason ?? ''}`,
              )
            }
          }
          if (['05-email', '05b-email-long', '05c-email-expired', '06-phone', '07-otp', '08-id', '08b-id-error'].includes(page.name)) {
            const link = await cdp.send(
              'Runtime.evaluate',
              {
                expression: `(() => {
                  const el = document.getElementById('switch-account')
                  if (!el) return { ok: false, reason: 'missing' }
                  const rect = el.getBoundingClientRect()
                  const text = (el.textContent || '').trim()
                  return {
                    ok: text === 'Se connecter avec un autre compte' && rect.left >= -1 && rect.right <= ${width} + 1 && rect.width > 1 && rect.height > 1,
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    text,
                  }
                })()`,
                returnByValue: true,
              },
              sessionId,
            )
            const shown = (
              link.result as { value?: { ok?: boolean; left?: number; right?: number; text?: string; reason?: string } } | undefined
            )?.value
            if (!shown?.ok) {
              failures.push(
                `${page.name}@${width} switch-account ${shown?.text ?? shown?.reason ?? 'missing'} ${shown?.left ?? '?'}..${shown?.right ?? '?'}`,
              )
            }
          }
          const colors = COLOR_EXPECT[page.name]
          if (colors && width === 1440) {
            const painted = await cdp.send(
              'Runtime.evaluate',
              { expression: colorExpression(colors), returnByValue: true },
              sessionId,
            )
            const sample = (
              painted.result as {
                value?: {
                  pageBg: string
                  bodyColor: string
                  controlBg: string
                  controlColor: string
                  inputBg: string
                  inputBorder: string
                  cardBg: string
                  fieldBorder: string
                  muted: string
                  errorColor: string
                }
              }
            )?.value
            const problems: string[] = []
            if (!sample) {
              problems.push('no sample')
            } else {
              if (!sameColor(sample.pageBg, CREAM)) problems.push(`page ${sample.pageBg}`)
              if (!sameColor(sample.bodyColor, NAVY)) problems.push(`text ${sample.bodyColor}`)
              if (!sameColor(sample.controlBg, colors.controlBg)) problems.push(`button ${sample.controlBg}`)
              if (!sameColor(sample.controlColor, colors.controlColor)) problems.push(`buttonText ${sample.controlColor}`)
              if (colors.inputBg && !sameColor(sample.inputBg, colors.inputBg)) problems.push(`input ${sample.inputBg}`)
              if (colors.inputBorder && !sameColor(sample.inputBorder, colors.inputBorder)) problems.push(`border ${sample.inputBorder}`)
              if (colors.pseudonym) {
                if (!sameColor(sample.cardBg, CARD_90)) problems.push(`card ${sample.cardBg}`)
                if (!sameColor(sample.fieldBorder, BORDER_90)) problems.push(`field ${sample.fieldBorder}`)
                if (!sameColor(sample.muted, MUTED_90)) problems.push(`muted ${sample.muted}`)
              }
              if (page.name === '08b-id-error' && !sameColor(sample.errorColor, 'rgb(155, 44, 44)')) {
                problems.push(`error ${sample.errorColor}`)
              }
            }
            if (problems.length > 0) {
              failures.push(`${page.name}@${width} colors ${problems.join('; ')}`)
            }
          }
          if ((page.name === '08-id' || page.name === '08b-id-error') && width === 1440) {
            const row = await cdp.send(
              'Runtime.evaluate',
              {
                expression: `(() => {
                  const button = Array.from(document.querySelectorAll('button')).find((el) => (el.textContent || '').indexOf('Remplacer') !== -1)
                  const rect = button ? button.getBoundingClientRect() : null
                  const style = button ? getComputedStyle(button) : null
                  const badge = document.querySelector('[data-id-badge]')
                  const error = document.getElementById('id-error')
                  const errorStyle = error ? getComputedStyle(error) : null
                  const errorRect = error ? error.getBoundingClientRect() : null
                  return {
                    replace: !!(button && style && style.display !== 'none' && rect && rect.height > 1 && rect.left >= -1 && rect.right <= window.innerWidth + 1),
                    badgeChip: !!(badge && !badge.querySelector('div') && getComputedStyle(badge).display === 'none'),
                    errorHeight: errorRect ? Math.round(errorRect.height) : 0,
                    errorDisplay: errorStyle ? errorStyle.display : '',
                  }
                })()`,
                returnByValue: true,
              },
              sessionId,
            )
            const idRow = (
              row.result as {
                value?: { replace?: boolean; badgeChip?: boolean; errorHeight?: number; errorDisplay?: string }
              }
            )?.value
            if (!idRow?.replace || !idRow.badgeChip) {
              failures.push(`${page.name}@${width} id row replace=${idRow?.replace ?? false} badge=${idRow?.badgeChip ?? false}`)
            }
            if (page.name === '08b-id-error' && (idRow?.errorDisplay === 'none' || (idRow?.errorHeight ?? 0) < 1)) {
              failures.push(`${page.name}@${width} error line display=${idRow?.errorDisplay ?? '?'} height=${idRow?.errorHeight ?? 0}`)
            }
          }
          if (!value || value.scrollWidth > value.width || value.bad.length > 0) {
            failures.push(
              `${page.name}@${width} scroll ${value?.scrollWidth ?? '?'} > ${value?.width ?? width} ${value?.bad.join(' | ') ?? ''}`,
            )
          }
          if (SHOTS.has(width)) {
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
            const data = String(shot.data ?? '')
            if (data) {
              writeFileSync(join(shots, `${page.name}-${width}.png`), Buffer.from(data, 'base64'))
            }
          }
        }
      }
    } finally {
      cdp.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    expect(failures).toEqual([])
  }, 360_000)

  it.skipIf(!binary)('binds the served reset submit handler in a real browser', async () => {
    const html = resetHtml(stitch('05-password-reset'), 'renew')
    const posts: string[] = []
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (request.method === 'POST' && url.pathname === '/v1/password-resets/consume') {
        const chunks: Buffer[] = []
        request.on('data', (chunk: Buffer) => chunks.push(chunk))
        request.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          posts.push(raw)
          const token = (JSON.parse(raw) as { token?: string }).token
          response.setHeader('content-type', 'application/json; charset=utf-8')
          if (token === 'live-ok') {
            response.statusCode = 200
            response.end(JSON.stringify({ id: 'session', kind: 'web', expires_at: '2026-11-11T00:00:00.000Z' }))
            return
          }
          if (token === 'live-short') {
            response.statusCode = 400
            response.end(
              JSON.stringify({
                error: { code: 'UNHANDLED', message: "password : la règle publiée n'est pas respectée." },
              }),
            )
            return
          }
          response.statusCode = 400
          response.end(
            JSON.stringify({
              error: { code: 'PASSWORD_RESET_INVALID', message: 'Lien expiré ou adresse inconnue.' },
            }),
          )
        })
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(html)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('test server has no port')
    }
    const origin = `http://127.0.0.1:${address.port}`
    const profile = mkdtempSync(join(tmpdir(), 'ankanu-reset-'))
    const errors: string[] = []
    const chrome = await launch(binary as string, profile)
    const cdp = await connect(chrome.ws, (message) => {
      if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params?.exceptionDetails?.text ?? 'exception')
      }
    })
    try {
      const created = await cdp.send('Target.createTarget', { url: 'about:blank' })
      const attached = await cdp.send('Target.attachToTarget', { targetId: String(created.targetId), flatten: true })
      const sessionId = String(attached.sessionId)
      await cdp.send('Page.enable', {}, sessionId)
      await cdp.send('Runtime.enable', {}, sessionId)
      const read = async () => {
        const measured = await cdp.send(
          'Runtime.evaluate',
          {
            expression: `(() => ({
              title: ((document.querySelector('h1') && document.querySelector('h1').textContent) || '').trim(),
              error: ((document.getElementById('reset-error') && document.getElementById('reset-error').textContent) || '').trim(),
              resume: ((document.querySelector('a[href="/password-reset"]') && document.querySelector('a[href="/password-reset"]').textContent) || '').trim(),
              renew: Boolean(document.getElementById('reset-password')),
              done: ((document.getElementById('reset-enter') && document.getElementById('reset-enter').textContent) || '').trim()
            }))()`,
            returnByValue: true,
          },
          sessionId,
        )
        return (
          measured.result as {
            value?: { title: string; error: string; resume: string; renew: boolean; done: string }
          }
        )?.value
      }
      const open = async (token: string) => {
        const loaded = cdp.wait('Page.loadEventFired', sessionId)
        await cdp.send('Page.navigate', { url: `${origin}/password-reset?token=${token}` }, sessionId)
        await loaded
      }
      const submit = async (password: string) => {
        const sent = await cdp.send(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const password = document.getElementById('reset-password')
              const confirm = document.getElementById('reset-confirm')
              const form = document.querySelector('form')
              if (!password || !confirm || !form || typeof form.requestSubmit !== 'function') return 'unbound'
              password.value = ${JSON.stringify(password)}
              confirm.value = ${JSON.stringify(password)}
              form.requestSubmit()
              return 'sent'
            })()`,
            returnByValue: true,
          },
          sessionId,
        )
        return (sent.result as { value?: string } | undefined)?.value
      }
      const until = async (ready: (state: { title: string; error: string; resume: string; renew: boolean; done: string }) => boolean) => {
        const start = Date.now()
        let last: { title: string; error: string; resume: string; renew: boolean; done: string } | undefined
        while (Date.now() - start < 3000) {
          last = await read()
          if (last && ready(last)) return last
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
        throw new Error(`reset page did not update: ${JSON.stringify(last)} posts=${posts.join(' | ')} errors=${errors.join(' | ')}`)
      }

      await open('expired-token')
      expect(await submit('phrase avec espaces')).toBe('sent')
      const invalid = await until((state) => state.resume.includes('Reprendre la demande'))
      expect(invalid.title).toBe('Lien expiré ou adresse inconnue')
      expect(invalid.resume).toContain('Reprendre la demande')
      expect(posts.at(-1)).toContain('"token":"expired-token"')

      await open('live-short')
      expect(await submit('court')).toBe('sent')
      const held = await until((state) => state.error.includes("la règle publiée n'est pas respectée."))
      expect(held.renew).toBe(true)
      expect(held.title).not.toBe('Lien expiré ou adresse inconnue')
      expect(held.resume).toBe('')
      expect(posts.at(-1)).toContain('"token":"live-short"')

      await open('live-ok')
      expect(await submit('phrase avec espaces')).toBe('sent')
      const done = await until((state) => state.done.includes("Accéder à mon espace Ta'aruf"))
      expect(done.title).toBe('Mot de passe renouvelé · Anciennes sessions révoquées')
      expect(done.renew).toBe(false)
      expect(posts.at(-1)).toContain('"token":"live-ok"')
      expect(errors.join('\n')).not.toContain('Illegal return')
    } finally {
      cdp.close()
      chrome.proc.kill('SIGKILL')
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }, 60_000)
})
