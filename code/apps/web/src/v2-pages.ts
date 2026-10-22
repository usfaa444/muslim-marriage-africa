import { audioPromptScript } from './audio-prompt'
import { pinGuardScript } from './pin-guard'
import {
  accountScript,
  emailScript,
  idScript,
  identityScript,
  otpScript,
  phoneScript,
  pinScript,
  profileScript,
  pseudonymScript,
  reviewScript,
  recaptchaTag,
  resetScript,
  settingsScript,
  splashScript,
  statusScript,
} from './v2-client'
import {
  dropSignupPseudonym,
  guardAuthPost,
  hideGoogleAuth,
  insertLoginError,
  insertSignupRecaptcha,
  pointAuthLinks,
  prepareV2,
  replaceLoginCaptcha,
  showAuthPanel,
} from './v2-document'

function mount(html: string, script: string, extra = ''): string {
  const page = prepareV2(html, script)
  if (!extra) {
    return page
  }
  return page.includes('</body>') ? page.replace('</body>', `${extra}</body>`) : `${page}${extra}`
}

function guarded(html: string, script: string): string {
  return mount(html, script, pinGuardScript())
}

export function splashHtml(): string {
  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AnKanu</title>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&amp;family=Plus+Jakarta+Sans:wght@500&amp;display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; min-height: 100%; background: #F7F1E3; color: #0B1D36; }
  body { display: flex; align-items: center; justify-content: center; position: relative; }
  main { width: min(100%, 28rem); padding: 1.5rem; text-align: center; }
  .mark { width: 5.75rem; height: 5.75rem; margin: 0 auto 1.1rem; }
  .top-rule { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: #C9A86C; opacity: 0.55; }
  h1 { font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(2.4rem, 8vw, 3rem); letter-spacing: -0.02em; margin: 0; }
  .rule { width: 2.25rem; height: 1px; background: #C9A86C; margin: 1.35rem auto 1.6rem; }
  .actions { width: min(100%, 17.5rem); margin: 0 auto; display: flex; flex-direction: column; gap: 0.5rem; }
  a.continue, a.signin { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 3rem; text-decoration: none; border-radius: 8px; font-family: "Plus Jakarta Sans", system-ui, sans-serif; }
  a.continue { background: #0B1D36; color: #F7F1E3; font-size: 0.875rem; }
  a.signin { background: #F7F1E3; color: #0B1D36; border: 1px solid #E2D4B8; font-size: 0.75rem; font-weight: 500; padding: 0 1rem; }
  a.signin:hover { background: rgba(226, 212, 184, 0.2); }
  .dots { margin-top: 2.25rem; display: flex; gap: 0.5rem; justify-content: center; }
  .dots i { width: 0.38rem; height: 0.38rem; border-radius: 50%; background: #C9A86C; display: block; }
</style>
</head><body>
<div class="top-rule" aria-hidden="true"></div>
<main>
<svg class="mark" viewBox="0 0 120 120" aria-hidden="true">
<circle cx="60" cy="60" r="54" fill="none" stroke="#C9A86C" stroke-width="0.8" opacity="0.4"></circle>
<rect x="36" y="36" width="48" height="48" rx="1" fill="none" stroke="#C9A86C" stroke-width="0.9"></rect>
<path d="M60 40c6 7.5 11 13 11 19.2a11 11 0 1 1-22 0c0-6.2 5-11.7 11-19.2z" fill="none" stroke="#C9A86C" stroke-width="1.15"></path>
<circle cx="60" cy="62" r="6.4" fill="none" stroke="#C9A86C" stroke-width="0.9" stroke-dasharray="0.55 1.55" stroke-linecap="round"></circle>
<circle cx="60" cy="62" r="1.2" fill="#C9A86C"></circle>
</svg>
<h1>AnKanu</h1>
<div class="rule"></div>
<div class="actions">
<a class="continue" href="/signup/identity">Créer un compte</a>
<a class="signin" href="/auth">Se connecter</a>
</div>
<div class="dots" aria-hidden="true"><i></i><i></i><i></i></div>
</main>
</body></html>`
  return prepareV2(html, splashScript())
}

export function identityHtml(stitch: string): string {
  return mount(stitch, identityScript())
}

export function pseudonymHtml(stitch: string): string {
  return mount(stitch, pseudonymScript())
}

export function authHtml(stitch: string, panel: 'signup' | 'login', siteKey: string): string {
  let html = pointAuthLinks(
    guardAuthPost(insertLoginError(replaceLoginCaptcha(insertSignupRecaptcha(dropSignupPseudonym(hideGoogleAuth(stitch)))))),
  )
  html = showAuthPanel(html, panel)
  return mount(html, accountScript(siteKey, panel), recaptchaTag(siteKey))
}

const EMAIL_LINK_ERROR = `<p class="hidden text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="email-link-error"><span class="material-symbols-outlined text-[14px]" data-icon="error">error</span><span id="email-link-error-text"></span></p>`

function switchAccountLink(className: string): string {
  return `<a class="${className}" href="/auth?leave=1" id="switch-account">Se connecter avec un autre compte</a>`
}

const EMAIL_SWITCH = switchAccountLink(
  'inline-block max-w-full text-center whitespace-normal text-xs text-deep-navy/70 hover:text-deep-navy underline underline-offset-4 decoration-hairline transition-colors',
)
const PHONE_SWITCH = switchAccountLink(
  'inline-block max-w-full text-center whitespace-normal text-xs font-medium text-deep-navy hover:text-soft-gold transition-colors duration-150 underline underline-offset-4 decoration-hairline',
)
const OTP_SWITCH = switchAccountLink(
  'inline-block max-w-full text-center whitespace-normal font-body text-xs text-deep-navy/70 hover:text-soft-gold underline underline-offset-4 decoration-hairline transition-colors duration-150',
)
const ID_SWITCH = switchAccountLink(
  'inline-block max-w-full text-center whitespace-normal text-xs text-deep-navy/80 hover:text-soft-gold underline underline-offset-4 font-medium transition-colors',
)
const ID_ERROR = `<p class="hidden w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-[#9B2C2C] flex items-start gap-1 font-medium" id="id-error"><span class="material-symbols-outlined text-[14px] shrink-0" data-icon="error">error</span><span class="min-w-0 break-words" id="id-error-text"></span></p>`

const EMAIL_CHANGE_FIT = `<style>
#editEmailForm .flex { flex-wrap: wrap; }
#newEmailInput { min-width: 0; flex: 1 1 10rem; }
#currentEmail { min-width: 0; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
</style>`

const RESET_INVALID_TITLE = 'Lien expiré ou adresse inconnue'
const RESET_INVALID_TEXT =
  "Par mesure de discrétion et de protection de la pudeur, aucun indice public sur l'existence du compte n'est divulgué."

export function emailHtml(stitch: string): string {
  const helper = `<p class="text-[11px] text-deep-navy/60">
            Un nouveau lien unique sera immédiatement transmis à cette nouvelle boîte.
          </p>`
  const error = `<p class="hidden text-xs text-[#9B2C2C] font-medium" id="email-change-error"></p>
${helper}`
  let html = stitch.includes(helper) ? stitch.replace(helper, error) : stitch
  html = html.replaceAll('ibrahim.sawadogo@exemple.bf', '')
  html = html.replace(
    'class="text-sm font-semibold text-deep-navy truncate" id="currentEmail"',
    'class="text-sm font-semibold text-deep-navy min-w-0 break-all" id="currentEmail"',
  )
  html = html.replace(
    'class="flex items-center gap-2.5 overflow-hidden w-full sm:w-auto"',
    'class="flex items-center gap-2.5 overflow-hidden w-full min-w-0 max-w-full"',
  )
  html = html.replace(
    '<p class="text-deep-navy/85 text-sm md:text-base leading-relaxed font-normal">',
    '<p class="text-deep-navy/85 text-sm md:text-base leading-relaxed font-normal" id="email-intro">',
  )
  html = html.replace('<!-- Adresse de référence', `${EMAIL_LINK_ERROR}<!-- Adresse de référence`)
  html = html.replace(
    'Tout nouvel envoi désactivera immédiatement le lien précédent pour garantir la sécurité absolue de votre compte.\n        </p>',
    `Tout nouvel envoi désactivera immédiatement le lien précédent pour garantir la sécurité absolue de votre compte.\n        </p>\n${EMAIL_SWITCH}`,
  )
  html = html.includes('</head>') ? html.replace('</head>', `${EMAIL_CHANGE_FIT}</head>`) : html
  return mount(
    html,
    emailScript({
      invalidTitle: RESET_INVALID_TITLE,
      invalidFallback: RESET_INVALID_TEXT,
    }),
  )
}

export function phoneHtml(stitch: string): string {
  let html = stitch.replace('value="70 24 58 19"', 'value=""').replace('+226 70 24 58 19', '')
  html = html.replace(
    '<!-- Trust / Security Footnote -->\n<div class="mt-8 pt-6 border-t border-hairline/60 w-full flex flex-col items-center">',
    `<!-- Trust / Security Footnote -->\n<div class="mt-8 pt-6 border-t border-hairline/60 w-full flex flex-col items-center gap-3">\n${PHONE_SWITCH}`,
  )
  return mount(html, phoneScript())
}

const OTP_NUMBER = `<div class="inline-flex flex-wrap items-center justify-center gap-2.5 px-3.5 py-1.5 rounded-full border border-hairline bg-[#FAF6EC]/80 mb-7 text-xs font-body max-w-full" id="otp-phone"><span class="text-deep-navy/60">Numéro renseigné :</span><span class="font-medium text-deep-navy tracking-wide break-all" id="phone-display"></span></div>`

export function otpHtml(stitch: string): string {
  let html = stitch.replace(
    /<a href="#"([^>]*)>([\s\S]*?Modifier le numéro[\s\S]*?)<\/a>/,
    '<a href="/phone"$1>$2</a>',
  )
  html = html.replace('+226 70 24 58 19', '').replace('value="70 24 58 19"', 'value=""')
  html = html.replace('<span class="">Modifier le numéro</span></a>', `<span class="">Modifier le numéro</span></a>\n${OTP_SWITCH}`)
  if (!html.includes('id="phone-display"')) {
    html = html.replace('<!-- OTP Form -->', `${OTP_NUMBER}<!-- OTP Form -->`)
  }
  return mount(html, otpScript())
}

export function idHtml(stitch: string): string {
  let html = stitch.replace('Document téléversé : CNIB_recto_verso.pdf', '')
  html = html.replace(
    '<div class="pt-2 flex flex-col gap-3">',
    `<div class="pt-2 flex flex-col gap-3">\n${ID_ERROR}`,
  )
  html = html.replace(
    'strictement réservées à la validation du compte.\n          </span>\n</div>',
    `strictement réservées à la validation du compte.\n          </span>\n</div>\n${ID_SWITCH}`,
  )
  return mount(html, idScript())
}

const RESET_BUTTON =
  'w-full min-w-0 min-h-[44px] py-3.5 px-4 rounded-md bg-deep-navy text-cream font-body text-sm font-semibold tracking-wide hover:bg-deep-navy/95 active:scale-[0.99] transition-all duration-150 shadow-sm flex flex-wrap items-center justify-center gap-2 border border-deep-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream text-center whitespace-normal'

const RESET_BACK = `<div class="text-center pt-2">
<a class="inline-flex items-center space-x-1.5 text-xs font-medium text-deep-navy/70 hover:text-deep-navy transition-colors duration-150 focus:outline-none focus:underline underline-offset-4 decoration-soft-gold" href="/auth">
<span class="material-symbols-outlined text-sm" data-icon="arrow_back">arrow_back</span>
<span>Retour à la connexion</span>
</a>
</div>`

const RESET_DONE_TITLE = 'Mot de passe renouvelé · Anciennes sessions révoquées'
const RESET_DONE_TEXT = 'Session locale active et reconnue pour 30 jours.'

function resetPasswordField(id: string, label: string, hint: string): string {
  return `<div class="space-y-1.5">
<label class="block text-xs font-semibold uppercase tracking-wider text-deep-navy/80" for="${id}">${label}</label>
<div class="relative">
<input autocomplete="new-password" class="w-full min-w-0 h-12 pl-4 pr-12 rounded-md bg-cream border border-hairline text-deep-navy text-sm placeholder:text-deep-navy/40 focus:border-soft-gold focus:ring-0 transition-colors" id="${id}" type="password">
<button aria-label="Afficher ou masquer le mot de passe" class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-deep-navy/60 hover:text-deep-navy" type="button">
<span class="material-symbols-outlined text-[20px]" data-icon="visibility">visibility</span>
</button>
</div>
${hint}
</div>`
}

const RESET_RENEW = `<div class="space-y-4" id="reset-renew">
${resetPasswordField('reset-password', 'Nouveau mot de passe', '<p class="text-xs text-deep-navy/60">Au minimum 12 caractères avec lettres, chiffres et symbole noble.</p>')}
${resetPasswordField('reset-confirm', 'Confirmation du mot de passe', '')}
<p class="hidden text-xs text-[#9B2C2C] font-medium" id="reset-error"></p>
<p class="text-xs text-deep-navy/70 leading-relaxed">La validation de ce nouveau mot de passe invalidera immédiatement toutes les sessions antérieures actives sur d'autres appareils, à l'exception de la session présente.</p>
</div>`

const RESET_INVALID_FORM = `<div class="pt-2"><a class="${RESET_BUTTON}" href="/password-reset"><span>Reprendre la demande</span></a></div>
${RESET_BACK}`

const RESET_DONE_FORM = `<div class="pt-2"><button class="${RESET_BUTTON}" id="reset-enter" type="button"><span>Accéder à mon espace Ta'aruf</span></button></div>
${RESET_BACK}`

export type ResetView = 'request' | 'renew' | 'invalid' | 'done'

function applyResetView(html: string, view: ResetView): string {
  if (view === 'request') {
    return html
  }
  if (view === 'renew') {
    return html
      .replace(
        /<p class="font-body text-sm leading-relaxed text-deep-navy\/70 max-w-md mx-auto">\s*Renseignez l'adresse email associée à votre compte AnKanu pour recevoir un lien sécurisé à usage unique\.\s*<\/p>/,
        '',
      )
      .replace(/<!-- Email Input Group -->[\s\S]*?<!-- Primary Action Button -->/, `${RESET_RENEW}<!-- Primary Action Button -->`)
      .replace('Envoyer le lien de réinitialisation', 'Valider et renouveler l\'accès')
  }
  const title = view === 'invalid' ? RESET_INVALID_TITLE : RESET_DONE_TITLE
  const text = view === 'invalid' ? RESET_INVALID_TEXT : RESET_DONE_TEXT
  const form = view === 'invalid' ? RESET_INVALID_FORM : RESET_DONE_FORM
  return html
    .replaceAll('Réinitialisation du mot de passe', title)
    .replace(
      "Renseignez l'adresse email associée à votre compte AnKanu pour recevoir un lien sécurisé à usage unique.",
      text,
    )
    .replace(/<form class="space-y-6"[^>]*>[\s\S]*?<\/form>/, `<form class="space-y-6">${form}</form>`)
}

export function resetHtml(stitch: string, view: ResetView = 'request'): string {
  // deep-navy/50 is 3.2:1 on cream; /70 meets WCAG AA for the small print.
  const linked = stitch
    .replace(
      /<a ([^>]*?)href="#"([^>]*)>([\s\S]*?Retour à la connexion[\s\S]*?)<\/a>/,
      '<a $1href="/auth"$2>$3</a>',
    )
    .replace('<p class="text-[11px] text-deep-navy/50 font-normal">', '<p class="text-[11px] text-deep-navy/70 font-normal">')
    .replace('<p class="text-xs text-deep-navy/50 font-body">', '<p class="text-xs text-deep-navy/70 font-body">')
  return mount(
    applyResetView(linked, view),
    resetScript({
      invalidTitle: RESET_INVALID_TITLE,
      invalidText: RESET_INVALID_TEXT,
      invalidForm: RESET_INVALID_FORM,
      doneTitle: RESET_DONE_TITLE,
      doneText: RESET_DONE_TEXT,
      doneForm: RESET_DONE_FORM,
      mismatch: 'password : la confirmation ne correspond pas.',
    }),
  )
}

/** Draws a Material Symbols icon from its data-icon name, so the ligature name is not page text. */
const ICON_GLYPH_STYLE = '<style>.material-symbols-outlined[data-icon]:empty::before{content:attr(data-icon)}</style>'

/** Screen 10. The status hint carries the PIN screen's feedback; its icons are decoration. */
export function pinHtml(stitch: string): string {
  const html = stitch
    .replace('</head>', `${ICON_GLYPH_STYLE}</head>`)
    .replace(
      'class="h-14 rounded-md border border-transparent hover:border-hairline text-xs font-medium text-deep-navy/60 hover:text-deep-navy transition-all duration-150 flex items-center justify-center focus:outline-none" id="btn-clear"',
      'class="h-14 rounded-md border border-transparent hover:border-hairline text-xs font-medium text-deep-navy/70 hover:text-deep-navy transition-all duration-150 flex items-center justify-center focus:outline-none" id="btn-clear"',
    )
    .replace(
      '<span class="material-symbols-outlined text-xl" data-icon="backspace">backspace</span>',
      '<span aria-hidden="true" class="material-symbols-outlined text-xl" data-icon="backspace"></span>',
    )
    .replace(
      '<div class="mt-6 text-xs text-deep-navy/50 flex items-center gap-1.5" id="status-hint">\n<span class="material-symbols-outlined text-sm text-soft-gold" data-icon="verified_user">verified_user</span>\n<span class="">Chiffrement et vérification locale sécurisée</span>',
      '<div class="mt-6 text-xs text-deep-navy/70 flex items-center gap-1.5" id="status-hint" role="status">\n<span aria-hidden="true" class="material-symbols-outlined text-sm text-soft-gold" data-icon="verified_user"></span>\n<span id="pin-status-text" class="">Chiffrement et vérification locale sécurisée</span>',
    )
    .replace(/href="#">(\s*S'identifier à nouveau)/, 'href="/auth">$1')
  return mount(html, pinScript())
}

function onboardingScript(): string {
  return `
<script>
(function () {
  var STEP = {
    email: '/email-verification',
    phone: '/phone',
    otp: '/otp',
    identity: '/id-liveness',
    account: '/photo-rules'
  }
  var link = document.getElementById('onboarding-next')
  if (!link) return
  link.addEventListener('click', function (event) {
    if (event && event.preventDefault) event.preventDefault()
    var status = document.getElementById('onboarding-status')
    function fail() {
      if (!status) return
      status.textContent = 'La connexion a échoué.'
      status.classList.remove('hidden')
    }
    fetch('/v1/accounts/gate', { credentials: 'same-origin' }).then(function (response) {
      return response.json().then(function (body) {
        return { ok: response.ok, body: body }
      }, function () {
        return { ok: false, body: null }
      })
    }).then(function (result) {
      var step = result.ok && result.body ? result.body.step : ''
      var path = STEP[step]
      if (typeof path === 'string') {
        window.location.assign(path)
        return
      }
      fail()
    }).catch(fail)
  })
})()
</script>`
}

export function onboardingHtml(stitch: string): string {
  const html = stitch
    .replace(
      'class="text-xs font-semibold uppercase tracking-wider text-deep-navy flex items-center gap-1.5"',
      'id="audio-guide-heading" class="text-xs font-semibold uppercase tracking-wider text-deep-navy flex items-center gap-1.5"',
    )
    .replace('>70% complété<', '><')
    .replace('style="width: 70%"', 'style="width: 0%"')
    .replace('Il manque : madhhab', '')
    .replace(
      'href="#consultation"',
      'id="onboarding-next" href="/photo-rules"',
    )
    .replace(
      '</a>\n<!-- Secondary Blocked Button: Quiet & Respectful Notice -->',
      '</a>\n<p id="onboarding-status" class="hidden text-center text-xs text-deep-navy pt-1 break-words" role="status"></p>\n<!-- Secondary Blocked Button: Quiet & Respectful Notice -->',
    )
  return mount(html, '', audioPromptScript() + onboardingScript() + pinGuardScript())
}

/** Board card 09459686: client navigation only. No acknowledgement request. */
function photoRulesScript(): string {
  return `
<script>
(function () {
  const buttons = document.getElementsByTagName('button')
  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index]
    if ((button.textContent || '').indexOf("J'ai pris connaissance des règles") === -1) {
      continue
    }
    button.addEventListener('click', function () {
      window.location.assign('/profile-edit')
    })
  }
})()
</script>`
}

export function photoHtml(stitch: string): string {
  const html = stitch.replace(
    '<section aria-labelledby="audio-guidance-title"',
    '<section id="audio-guide-heading" aria-labelledby="audio-guidance-title"',
  )
  return mount(html, '', audioPromptScript() + photoRulesScript() + pinGuardScript())
}

export function profileHtml(stitch: string): string {
  let html = stitch
    .replace('<span class="">29 ans</span>', '<span id="profile-age" class=""></span>')
    .replace('value="1996-09-14"', 'value=""')
    .replace('value="Région du Centre, Plateau-Central"', 'value=""')
    .replace(
      '<span class="text-xs font-semibold text-deep-navy font-mono">70% complété</span>',
      '<span id="profile-meter-percent" class="text-xs font-semibold text-deep-navy font-mono">0% complété</span>',
    )
    .replace(
      '<div class="h-full bg-deep-navy rounded-full" style="width: 70%;"></div>',
      '<div id="profile-meter-fill" class="h-full bg-deep-navy rounded-full" style="width: 0%;"></div>',
    )
    .replace(
      '<div class="flex items-start gap-3 pt-2">',
      '<div id="profile-meter-banner" class="hidden flex items-start gap-3 pt-2">',
    )
    .replace(
      '<p class="text-sm font-semibold text-deep-navy">« Il manque : madhhab »</p>',
      '<p id="profile-meter-missing" class="text-sm font-semibold text-deep-navy"></p>',
    )
    .replace(
      '<p class="text-xs text-deep-navy/70 mt-1 leading-relaxed">',
      '<p id="profile-meter-note" class="hidden text-xs text-deep-navy/70 mt-1 leading-relaxed">',
    )
    .replace(
      '<p class="text-xs text-deep-navy/80 leading-normal pt-1">',
      '<p id="profile-photo-note" class="text-xs text-deep-navy/80 leading-normal pt-1">',
    )
    .replace(
      '<button class="text-xs font-medium text-deep-navy underline hover:text-soft-gold transition-colors self-start sm:self-auto" type="button">',
      '<button id="profile-photo-rules" class="text-xs font-medium text-deep-navy underline hover:text-soft-gold transition-colors self-start sm:self-auto" type="button">',
    )
    .replace(
      '<!-- Protective Blur Control Toggle (Identical to PIN toggle row) -->',
      '<p id="profile-photo-cap" class="hidden text-xs text-deep-navy/70 leading-normal">6 photos maximum. Retirez une photo pour en ajouter une autre.</p>\n<!-- Protective Blur Control Toggle (Identical to PIN toggle row) -->',
    )
    .replace(
      '<input checked="" class="sr-only peer" type="checkbox"/>',
      '<input id="profile-photo-blur" class="sr-only peer" type="checkbox" aria-label="Activer le flou protecteur"/>',
    )
    .replace(
      '<input checked="" class="sr-only peer" type="checkbox"/>',
      '<input id="profile-pin" class="sr-only peer" type="checkbox" aria-label="Activer le code PIN d\'accès"/>',
    )
    .replace(
      '<div class="p-4 rounded-md border-2 border-soft-gold/70 bg-cream space-y-3">',
      '<div id="madhhab-block" class="p-4 rounded-md border-2 border-soft-gold/70 bg-cream space-y-3">',
    )
    .replace(
      'class="flex items-center justify-center p-3 rounded-md border border-deep-navy bg-deep-navy text-cream cursor-pointer text-xs font-medium text-center"',
      'class="flex items-center justify-center p-3 rounded-md border border-hairline bg-cream text-deep-navy hover:border-soft-gold cursor-pointer text-xs font-medium text-center"',
    )
    .replace(
      '</label>\n</div>\n</section>\n<!-- SECTION 8:',
      // Right under the PIN switch: why the switch went back off, read out as soon as it is written.
      '</label>\n</div>\n<p id="profile-pin-status" class="hidden w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-deep-navy" role="alert"></p>\n</section>\n<!-- SECTION 8:',
    )
    .replace(
      '<div class="pt-8 pb-4 flex justify-end">',
      '<p id="profile-save-status" class="hidden w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-deep-navy" role="status"></p><div class="pt-8 pb-4 flex justify-end">',
    )
    .replaceAll(' checked=""', '')
    .replaceAll(' selected=""', '')
  html = html.replace(
    /<!-- 5-Slot Photo Grid -->[\s\S]*?<!-- Privacy Note -->/,
    `<!-- 5-Slot Photo Grid -->
<div id="profile-photo-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-4"></div>
<p id="profile-photo-status" class="hidden w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-deep-navy" role="status"></p>
<input id="profile-photo-file" class="sr-only" accept="image/jpeg,image/png" type="file" aria-label="Ajouter une photo">
<!-- Privacy Note -->`,
  )
  html = html.replace(/(<textarea\b[^>]*\bid="bio"[^>]*>)[\s\S]*?(<\/textarea>)/, '$1$2')
  html = html.replace(/(<textarea\b[^>]*\bid="intentions"[^>]*>)[\s\S]*?(<\/textarea>)/, '$1$2')
  html = html.replace(/<select\b([^>]*)>/g, '<select$1><option selected="" value=""></option>')
  return guarded(html, profileScript())
}

function photoIsPending(photo: unknown): boolean {
  return typeof photo === 'object' && photo !== null && (photo as { moderation_state?: unknown }).moderation_state === 'pending'
}

export function pendingProfilePhoto(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) {
    return false
  }
  return photoIsPending((body as { photo?: unknown }).photo)
}

const REVIEW_SLA_SENTENCE = 'Délai habituel de modération : 12 à 24 heures ouvrées.'

const REVIEW_UNDERSTOOD =
  '<div class="mt-6"><button class="box-border w-full max-w-full inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-8 py-3.5 rounded-md bg-deep-navy text-cream text-sm font-semibold hover:bg-deep-navy/90 active:opacity-90 transition-all shadow-none" id="profile-review-understood" type="button">J\'ai compris</button></div>'

export function reviewHtml(stitch: string, state: { slaHours: number; bioPending: boolean }): string {
  let html = stitch.replace(REVIEW_SLA_SENTENCE, `Délai habituel de modération : ${state.slaHours} heures.`)
  if (!state.bioPending) {
    html = html.replace(/<!-- Element 2 -->[\s\S]*?<!-- Element 3 -->/, '<!-- Element 3 -->')
  }
  html = html.replace(
    /(<p class="text-xs text-deep-navy\/50">[\s\S]*?<\/p>\s*<\/div>)/,
    `$1${REVIEW_UNDERSTOOD}`,
  )
  return guarded(html, reviewScript())
}

const LITE_HIT = `<style id="lite-hit">#lite-mode-toggle::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}</style>`

/** Stitch ships the switch already on, with a demo onclick. The first paint uses the real device value. */
function neutralizeLiteToggle(html: string): string {
  const buttonAt = html.indexOf('id="lite-mode-toggle"')
  if (buttonAt < 0) return html
  const start = html.lastIndexOf('<button', buttonAt)
  const end = html.indexOf('>', buttonAt)
  if (start < 0 || end < 0) return html
  const open = html
    .slice(start, end)
    .replace('aria-checked="true"', 'aria-checked="false"')
    .replace(' bg-deep-navy', ' bg-hairline')
  return (
    html.slice(0, start) +
    open +
    html.slice(end).replace(
      'h-5 w-5 translate-x-5 transform rounded-full bg-cream shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5" id="lite-mode-thumb"',
      'h-5 w-5 translate-x-0.5 transform rounded-full bg-cream shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5" id="lite-mode-thumb"',
    )
  )
}

export function settingsHtml(stitch: string): string {
  const neutral = neutralizeLiteToggle(stitch)
  const withHit = neutral.includes('</head>')
    ? neutral.replace('</head>', `${LITE_HIT}</head>`)
    : `${LITE_HIT}${neutral}`
  return guarded(withHit, settingsScript())
}

export function statusHtml(stitch: string): string {
  const html = stitch
    .replace('value="https://ankanu.bf/securite/demande/exp-84092-bf"', 'value=""')
    .replace('>47:55:56<', '><')
    .replaceAll('00:00:00', '')
  return guarded(html, statusScript())
}
