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
  recaptchaTag,
  resetScript,
  settingsScript,
  splashScript,
  statusScript,
} from './v2-client'
import {
  dropSignupPseudonym,
  hideGoogleAuth,
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
  a.continue { display: flex; align-items: center; justify-content: center; width: min(100%, 17.5rem); margin: 0 auto; min-height: 3rem; background: #0B1D36; color: #F7F1E3; text-decoration: none; border-radius: 8px; font-family: "Plus Jakarta Sans", system-ui, sans-serif; font-size: 0.875rem; }
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
<a class="continue" href="/signup/identity">Continuer</a>
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
  let html = pointAuthLinks(replaceLoginCaptcha(insertSignupRecaptcha(dropSignupPseudonym(hideGoogleAuth(stitch)))))
  html = showAuthPanel(html, panel)
  return mount(html, accountScript(siteKey, panel), recaptchaTag(siteKey))
}

const EMAIL_CHANGE_FIT = `<style>
#editEmailForm .flex { flex-wrap: wrap; }
#newEmailInput { min-width: 0; flex: 1 1 10rem; }
</style>`

export function emailHtml(stitch: string): string {
  const helper = `<p class="text-[11px] text-deep-navy/60">
            Un nouveau lien unique sera immédiatement transmis à cette nouvelle boîte.
          </p>`
  const error = `<p class="hidden text-xs text-[#9B2C2C] font-medium" id="email-change-error"></p>
${helper}`
  let html = stitch.includes(helper) ? stitch.replace(helper, error) : stitch
  html = html.includes('</head>') ? html.replace('</head>', `${EMAIL_CHANGE_FIT}</head>`) : html
  return mount(html, emailScript())
}

export function phoneHtml(stitch: string): string {
  const html = stitch.replace('value="70 24 58 19"', 'value=""').replace('+226 70 24 58 19', '')
  return mount(html, phoneScript())
}

export function otpHtml(stitch: string): string {
  const html = stitch.replace(
    /<a href="#"([^>]*)>([\s\S]*?Modifier le numéro[\s\S]*?)<\/a>/,
    '<a href="/phone"$1>$2</a>',
  )
  return mount(html, otpScript())
}

export function idHtml(stitch: string): string {
  const html = stitch.replace('Document téléversé : CNIB_recto_verso.pdf', '')
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

const RESET_INVALID_TITLE = 'Lien expiré ou adresse inconnue'
const RESET_INVALID_TEXT =
  "Par mesure de discrétion et de protection de la pudeur, aucun indice public sur l'existence du compte n'est divulgué."
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
  const linked = stitch.replace(
    /<a ([^>]*?)href="#"([^>]*)>([\s\S]*?Retour à la connexion[\s\S]*?)<\/a>/,
    '<a $1href="/auth"$2>$3</a>',
  )
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

export function pinHtml(stitch: string): string {
  return mount(stitch, pinScript())
}

export function onboardingHtml(stitch: string): string {
  const html = stitch.replace(
    'class="text-xs font-semibold uppercase tracking-wider text-deep-navy flex items-center gap-1.5"',
    'id="audio-guide-heading" class="text-xs font-semibold uppercase tracking-wider text-deep-navy flex items-center gap-1.5"',
  )
  return mount(html, '', audioPromptScript() + pinGuardScript())
}

export function photoHtml(stitch: string): string {
  const html = stitch.replace(
    '<section aria-labelledby="audio-guidance-title"',
    '<section id="audio-guide-heading" aria-labelledby="audio-guidance-title"',
  )
  return mount(html, '', audioPromptScript() + pinGuardScript())
}

export function profileHtml(stitch: string): string {
  return guarded(stitch, profileScript())
}

export function settingsHtml(stitch: string): string {
  return guarded(stitch, settingsScript())
}

export function statusHtml(stitch: string): string {
  const html = stitch
    .replace('value="https://ankanu.bf/securite/demande/exp-84092-bf"', 'value=""')
    .replace('>47:55:56<', '><')
  return guarded(html, statusScript())
}
