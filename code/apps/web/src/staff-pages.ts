import { recaptchaTag } from './v2-client'
import { prepareV2 } from './v2-document'

/**
 * Staff shell (Story 12.1, UX-DR19, UX-DR27). Built on the head and tokens of Stitch screen 52.
 * Every staff surface carries the staff-only badge and no member nav. Two panes from 768 px; below that the
 * queue stacks above the case.
 */

export type StaffMfaState = 'password_change' | 'enroll' | 'verify' | 'done'

export type StaffIdentity = {
  email: string
  roles: string[]
}

export const STAFF_BADGE_TEXT = 'Réservé Staff / Confidentiel'

const ROLE_LABEL: Record<string, string> = {
  moderator: 'Modérateur',
  operator: 'Opérateur',
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

export function staffBadgeHtml(): string {
  return `<span data-testid="staff-only-badge" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-cream text-deep-navy"><span class="w-1.5 h-1.5 rounded-full bg-soft-gold" aria-hidden="true"></span>${STAFF_BADGE_TEXT}</span>`
}

/** The centred row the staff header and the staff home content share. */
const STAFF_ROW = 'max-w-7xl mx-auto px-4 md:px-12'

/**
 * The inside of the staff header: brand, badge and the sign-out link. No member nav.
 * `pending`: the sign-in page, where the link shows once a session exists (an MFA-pending one can leave too).
 */
export function staffHeaderInner(signedIn: boolean | { pending: boolean }): string {
  const hidden = typeof signedIn === 'object' && !signedIn.pending ? ' hidden' : ''
  const leave = signedIn
    ? `<a class="inline-flex${hidden} items-center min-h-[44px] px-2 text-sm font-medium text-cream underline underline-offset-4 decoration-soft-gold/60 hover:decoration-soft-gold" href="/staff/connexion?leave=1" id="staff-leave">Se déconnecter</a>`
    : ''
  return `<div class="${STAFF_ROW} py-2 flex flex-wrap items-center justify-between gap-3" data-shell="staff" data-testid="staff-header-row">
<div class="flex flex-wrap items-center gap-3 min-w-0">
<a class="inline-flex items-center min-h-[44px] font-display text-xl text-cream" href="/staff">AnKanu</a>
${staffBadgeHtml()}
</div>
${leave}
</div>`
}

/** Fills Stitch 52's empty staff header. */
export function fillStaffHeader(html: string, signedIn: boolean): string {
  return html.replace(
    /(<header class="w-full bg-deep-navy text-cream[^"]*"[^>]*>)\s*(<\/header>)/,
    `$1${staffHeaderInner(signedIn)}$2`,
  )
}

function stitchHead(stitch: string): string {
  const start = stitch.indexOf('<head>')
  const end = stitch.indexOf('</head>')
  if (start < 0 || end < start) {
    throw new Error('Stitch 52 has no head')
  }
  return stitch.slice(start + '<head>'.length, end)
}

function page(stitch: string, title: string, body: string, signedIn: boolean | { pending: boolean }, extra = ''): string {
  const head = stitchHead(stitch).replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
  const html = `<!DOCTYPE html><html class="h-full" lang="fr"><head>${head}</head>
<body class="bg-cream text-deep-navy font-body antialiased min-h-full flex flex-col" data-staff-surface="true">
<header class="w-full bg-deep-navy text-cream sticky top-0 z-50 shadow-sm border-b border-soft-gold/20">${staffHeaderInner(signedIn)}</header>
${body}
</body></html>`
  return prepareV2(html, '') + extra
}

const FIELD =
  'w-full h-12 px-4 rounded-md bg-cream border border-hairline text-deep-navy text-sm placeholder:text-deep-navy/40 focus:border-soft-gold focus:ring-0 transition-colors'
const LABEL = 'block text-xs font-semibold uppercase tracking-wider text-deep-navy/80'
const PRIMARY =
  'w-full min-h-[48px] px-6 rounded-md bg-deep-navy text-on-navy font-medium text-sm flex items-center justify-center gap-2'

function codeField(id: string): string {
  return `<div class="space-y-2">
<label class="${LABEL}" for="${id}">Code à six chiffres <span class="text-soft-gold">*</span></label>
<input class="${FIELD} tracking-[0.4em] font-mono" id="${id}" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="16" required>
</div>`
}

/** `/staff/connexion`: email and password, then new password, then QR enrollment or the code. */
export function staffSignInHtml(stitch: string, siteKey: string, initial: StaffMfaState | null): string {
  const form = (step: string, own: StaffMfaState | 'login') =>
    `class="mt-6 space-y-5${(initial ?? 'login') === own ? '' : ' hidden'}" id="staff-step-${step}"`
  const body = `<main class="flex-1 w-full max-w-md mx-auto px-4 py-10" id="staff-signin">
<h1 class="font-display text-3xl text-deep-navy font-normal">Connexion staff</h1>
<p class="font-body text-sm text-deep-navy/70 mt-2">Accès individuel réservé au personnel de modération.</p>
<p class="hidden mt-6 p-3 rounded-md border border-[#9B2C2C]/40 bg-[#9B2C2C]/5 text-sm text-[#9B2C2C] font-medium" id="staff-error" role="alert"></p>
<form ${form('login', 'login')} method="post" novalidate>
<div class="space-y-2">
<label class="${LABEL}" for="staff-email">Adresse email <span class="text-soft-gold">*</span></label>
<input class="${FIELD}" id="staff-email" name="email" type="email" autocomplete="username" placeholder="nom@exemple.bf" required>
</div>
<div class="space-y-2">
<label class="${LABEL}" for="staff-password">Mot de passe <span class="text-soft-gold">*</span></label>
<input class="${FIELD}" id="staff-password" name="password" type="password" autocomplete="current-password" required>
</div>
<div class="p-3.5 border border-hairline rounded-md bg-cream overflow-hidden" id="staff-recaptcha-slot"><div id="staff-recaptcha"></div></div>
<button class="${PRIMARY}" id="staff-login-submit" type="submit">Se connecter</button>
</form>
<form ${form('password', 'password_change')} method="post" novalidate>
<h2 class="font-display text-2xl text-deep-navy" tabindex="-1">Choisissez un nouveau mot de passe</h2>
<p class="text-sm text-deep-navy/70">Le mot de passe provisoire ne sert qu'une fois.</p>
<div class="space-y-2">
<label class="${LABEL}" for="staff-new-password">Nouveau mot de passe <span class="text-soft-gold">*</span></label>
<input class="${FIELD}" id="staff-new-password" name="new_password" type="password" autocomplete="new-password" minlength="12" maxlength="128" aria-describedby="staff-new-password-hint" required>
<p class="text-xs text-deep-navy/75" id="staff-new-password-hint">De 12 à 128 caractères. Les espaces sont acceptés.</p>
</div>
<button class="${PRIMARY}" id="staff-password-submit" type="submit">Continuer</button>
</form>
<form ${form('enroll', 'enroll')} method="post" novalidate>
<h2 class="font-display text-2xl text-deep-navy" tabindex="-1">Configurer l'application d'authentification</h2>
<p class="text-sm text-deep-navy/70">Scannez ce code avec Google Authenticator ou Authy, puis saisissez le code à six chiffres affiché.</p>
<div class="flex justify-center p-4 bg-white border border-hairline rounded-md"><img class="w-56 h-56 max-w-full" id="staff-qr" alt="Code QR de configuration de l'application d'authentification" hidden></div>
<div class="space-y-1">
<p class="${LABEL}" id="staff-key-label">Clé de configuration manuelle</p>
<p class="font-mono text-sm text-deep-navy break-all select-all p-3 border border-hairline rounded-md bg-cream" id="staff-key" aria-labelledby="staff-key-label"></p>
</div>
${codeField('staff-enroll-code')}
<button class="${PRIMARY}" id="staff-enroll-submit" type="submit">Confirmer le code</button>
</form>
<form ${form('verify', 'verify')} method="post" novalidate>
<h2 class="font-display text-2xl text-deep-navy" tabindex="-1">Code de l'application d'authentification</h2>
<p class="text-sm text-deep-navy/70">Saisissez le code à six chiffres affiché par votre application.</p>
${codeField('staff-verify-code')}
<button class="${PRIMARY}" id="staff-verify-submit" type="submit">Confirmer le code</button>
</form>
</main>`
  return page(
    stitch,
    'AnKanu — Connexion staff',
    body,
    { pending: initial !== null },
    `<script>${staffSignInScript(siteKey, initial)}</script>${recaptchaTag(siteKey)}`,
  )
}

export function staffSignInScript(siteKey: string, initial: StaffMfaState | null): string {
  return `(function () {
  var SITE_KEY = ${scriptJson(siteKey)}
  var widget
  var STEPS = { login: 'login', password_change: 'password', enroll: 'enroll', verify: 'verify' }
  function el(id) { return document.getElementById(id) }
  window.onRecaptchaLoad = function () {
    if (window.grecaptcha && SITE_KEY && el('staff-recaptcha')) widget = window.grecaptcha.render(el('staff-recaptcha'), { sitekey: SITE_KEY })
  }
  function token() {
    if (!window.grecaptcha || widget === undefined) return ''
    return window.grecaptcha.getResponse(widget) || ''
  }
  function resetCaptcha() {
    if (window.grecaptcha && widget !== undefined) window.grecaptcha.reset(widget)
  }
  function showError(message) {
    var box = el('staff-error')
    box.textContent = message || ''
    box.classList.toggle('hidden', !message)
  }
  function show(state) {
    if (state === 'done') { window.location.assign('/staff'); return }
    var step = STEPS[state] || 'login'
    ;['login', 'password', 'enroll', 'verify'].forEach(function (name) {
      el('staff-step-' + name).classList.toggle('hidden', name !== step)
    })
    var leave = el('staff-leave')
    if (leave) leave.classList.toggle('hidden', step === 'login')
    var heading = el('staff-step-' + step).querySelector('h2')
    if (heading) heading.focus()
    if (step === 'enroll') loadEnrollment()
  }
  function call(method, path, body) {
    return fetch(path, {
      method: method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store'
    }).then(function (response) {
      return response.json().catch(function () { return null }).then(function (json) {
        return { status: response.status, body: json }
      })
    })
  }
  function failed(result) {
    var message = result.body && result.body.error && result.body.error.message
    showError(message || 'Request failed')
    if (result.status === 401 && result.body && result.body.error && result.body.error.code === 'UNAUTHENTICATED') show('login')
    if (result.status === 429 && result.body && result.body.error && result.body.error.details && result.body.error.details.reason === 'staff_locked') show('login')
  }
  function busy(button, on) { if (button) { button.disabled = on; button.setAttribute('aria-busy', on ? 'true' : 'false') } }
  function loadEnrollment() {
    call('GET', '/v1/staff/sessions/enrollment').then(function (result) {
      if (result.status !== 200 || !result.body) { failed(result); return }
      var qr = el('staff-qr')
      qr.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(result.body.qr_svg)
      qr.hidden = false
      el('staff-key').textContent = result.body.secret
    }, function () { showError('Request failed') })
  }
  function submit(form, button, method, path, body, after) {
    showError('')
    busy(button, true)
    call(method, path, body).then(function (result) {
      busy(button, false)
      if (result.status >= 200 && result.status < 300 && result.body) { after(result.body); return }
      failed(result)
    }, function () { busy(button, false); showError('Request failed') })
  }
  el('staff-step-login').addEventListener('submit', function (event) {
    event.preventDefault()
    submit(this, el('staff-login-submit'), 'POST', '/v1/staff/sessions', {
      email: el('staff-email').value,
      password: el('staff-password').value,
      recaptcha_token: token()
    }, function (body) { el('staff-password').value = ''; show(body.mfa_state) })
    resetCaptcha()
  })
  el('staff-step-password').addEventListener('submit', function (event) {
    event.preventDefault()
    submit(this, el('staff-password-submit'), 'POST', '/v1/staff/sessions/password', {
      new_password: el('staff-new-password').value
    }, function (body) { el('staff-new-password').value = ''; show(body.mfa_state) })
  })
  function codeForm(step) {
    el('staff-step-' + step).addEventListener('submit', function (event) {
      event.preventDefault()
      var input = el('staff-' + step + '-code')
      var value = input.value.replace(/\\s/g, '')
      submit(this, el('staff-' + step + '-submit'), 'POST', '/v1/staff/sessions/mfa', { code: value }, function (body) {
        input.value = ''
        show(body.mfa_state)
      })
    })
  }
  codeForm('enroll')
  codeForm('verify')
  var initial = ${scriptJson(initial)}
  if (initial === 'enroll') loadEnrollment()
})()`
}

function roleLine(identity: StaffIdentity | null): string {
  if (!identity) {
    return ''
  }
  const roles = identity.roles.map((role) => ROLE_LABEL[role] ?? role).join(', ')
  return `<p class="font-body text-sm text-deep-navy/75 mt-1 break-words" id="staff-identity">${escapeHtml(roles)} • ${escapeHtml(identity.email)}</p>`
}

/** `/staff`: the staff home. Queue on the left, case on the right from 768 px; stacked below. */
export function staffHomeHtml(stitch: string, identity: StaffIdentity | null): string {
  // Same box as the header's inner row (STAFF_ROW), so the brand and the title share a left edge at every width.
  const body = `<main class="flex-1 w-full" id="staff-home">
<div class="${STAFF_ROW} py-8" data-testid="staff-content">
<div class="pb-6 border-b border-hairline/80 mb-6">
<h1 class="font-display text-3xl md:text-4xl text-deep-navy font-normal">Console de modération</h1>
${roleLine(identity)}
</div>
<div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start" data-testid="staff-panes">
<section aria-label="Liste des fiches à examiner" class="md:col-span-5 flex flex-col gap-3.5 min-w-0" data-pane="queue">
<div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-deep-navy/75 px-1">
<span>Signalements &amp; Contrôles</span>
</div>
<a class="block bg-cream border border-hairline rounded-md p-4 hover:border-soft-gold/80 transition-colors" href="/staff/visit-signals" style="background-color: rgb(251, 248, 241);">
<span class="flex items-start justify-between gap-2 mb-2">${staffBadgeHtml().replace('data-testid="staff-only-badge" ', '').replace('bg-cream text-deep-navy', 'bg-deep-navy text-cream')}</span>
<span class="block text-base font-semibold text-deep-navy tracking-tight">Signaux de visite</span>
<span class="block text-xs text-deep-navy/70 mt-2 leading-relaxed">Surveillance T&amp;S • Détection de Consultation Intensive</span>
<span class="mt-3.5 pt-2.5 border-t border-hairline/60 flex items-center justify-end text-[11px] text-deep-navy font-semibold gap-1">Examiner <span class="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span></span>
</a>
</section>
<section aria-label="Détails du dossier sélectionné" class="md:col-span-7 bg-cream border border-hairline rounded-md p-6 md:p-8 flex flex-col gap-3 min-w-0" data-pane="case" style="background-color: rgb(251, 248, 241);">
<p class="text-xs font-mono uppercase tracking-wider text-deep-navy/75">Dossier d'arbitrage</p>
<h2 class="font-display text-2xl text-deep-navy">Instruction du dossier</h2>
<p class="text-sm text-deep-navy/70">Sélectionnez une fiche dans la file.</p>
</section>
</div>
</div>
</main>`
  return page(stitch, 'AnKanu — Console de modération', body, true)
}
