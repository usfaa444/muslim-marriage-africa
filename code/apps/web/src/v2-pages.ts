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
  .mark { width: 7.5rem; height: 7.5rem; margin: 0 auto 1.1rem; }
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
<circle cx="60" cy="60" r="56" fill="none" stroke="#C9A86C" stroke-width="0.8" opacity="0.35"></circle>
<rect x="28" y="28" width="64" height="64" rx="2" fill="none" stroke="#C9A86C" stroke-width="0.9"></rect>
<circle cx="60" cy="60" r="24" fill="none" stroke="#C9A86C" stroke-width="1.1" stroke-dasharray="0.7 2.5" stroke-linecap="round"></circle>
<line x1="36" y1="68" x2="84" y2="68" stroke="#C9A86C" stroke-width="0.8"></line>
<path d="M60 44c7 8 13 14 13 21a13 13 0 1 1-26 0c0-7 6-13 13-21z" fill="none" stroke="#C9A86C" stroke-width="1.2"></path>
<circle cx="60" cy="68" r="3.2" fill="#C9A86C"></circle>
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

function dropElement(html: string, id: string): string {
  const at = html.indexOf(`id="${id}"`)
  if (at < 0) {
    return html
  }
  const start = html.lastIndexOf('<', at)
  const tag = /^<?([a-zA-Z0-9]+)/.exec(html.slice(start))?.[1]
  if (!tag || start < 0) {
    return html
  }
  const open = `<${tag}`
  const close = `</${tag}>`
  let depth = 0
  let cursor = start
  while (cursor < html.length) {
    const nextOpen = html.indexOf(open, cursor)
    const nextClose = html.indexOf(close, cursor)
    if (nextClose < 0) {
      return html
    }
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1
      cursor = nextOpen + open.length
      continue
    }
    depth -= 1
    cursor = nextClose + close.length
    if (depth === 0) {
      return html.slice(0, start) + html.slice(cursor)
    }
  }
  return html
}

export function emailHtml(stitch: string): string {
  const html = dropElement(dropElement(stitch, 'editEmailForm'), 'editEmailBtn')
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

export function resetHtml(stitch: string): string {
  const html = stitch.replace(
    /<a ([^>]*?)href="#"([^>]*)>([\s\S]*?Retour à la connexion[\s\S]*?)<\/a>/,
    '<a $1href="/auth"$2>$3</a>',
  )
  return mount(html, resetScript())
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
