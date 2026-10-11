/** Shared transforms for AnKanu v2 Stitch HTML. Demo scripts never ship. */

const RESPONSIVE = `<style id="ankanu-responsive">
*, *::before, *::after { box-sizing: border-box; }
html, body { max-width: 100%; }
img, svg, video, canvas { max-width: 100%; height: auto; }
iframe { max-width: 100%; }
main, section, form, header, footer { min-width: 0; max-width: 100%; }
@media (max-width: 400px) {
  .g-recaptcha { transform: scale(0.88); transform-origin: 0 0; }
}
</style>`

export function stripDemoScripts(html: string): string {
  return html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (full, attrs: string) => {
    if (/\bsrc\s*=/i.test(attrs) || /\bid\s*=\s*["']tailwind-config["']/i.test(attrs)) {
      return full
    }
    return ''
  })
}

export function stripInlineHandlers(html: string): string {
  return html.replace(/\s(?:onclick|oninput|onchange|onsubmit)="[^"]*"/gi, '')
}

export function prepareV2(html: string, script: string): string {
  let next = stripInlineHandlers(stripDemoScripts(html))
  if (next.includes('</head>')) {
    next = next.replace('</head>', `${RESPONSIVE}</head>`)
  } else {
    next = `${RESPONSIVE}${next}`
  }
  const tag = `<script>${script}</script>`
  if (next.includes('</body>')) {
    return next.replace('</body>', `${tag}</body>`)
  }
  return `${next}${tag}`
}

export function hideGoogleAuth(html: string): string {
  return html.replace(/<!-- Divider -->[\s\S]*?Continuer avec Google[\s\S]*?<\/button>/g, '')
}

export function dropSignupPseudonym(html: string): string {
  return html.replace(/<!-- 1\. Pseudonyme Unique -->[\s\S]*?<!-- 2\. Email Address -->/, '<!-- 2. Email Address -->')
}

const RECAPTCHA_SLOT = `<div class="p-3.5 border border-hairline rounded-md bg-cream" id="signup-recaptcha-slot"><div id="signup-recaptcha"></div></div>`

export function insertSignupRecaptcha(html: string): string {
  const marker = '<button class="w-full min-h-[48px] px-6 rounded-md bg-deep-navy text-on-navy font-medium text-sm transition-opacity duration-150 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed" disabled="" id="signup-submit"'
  const at = html.indexOf(marker)
  if (at < 0) {
    return html
  }
  return html.slice(0, at) + RECAPTCHA_SLOT + html.slice(at)
}

export function replaceLoginCaptcha(html: string): string {
  return html.replace(
    /<div class="p-3\.5 border border-hairline rounded-md bg-cream flex items-center justify-between">[\s\S]*?id="login-captcha-badge"[\s\S]*?<\/div>\s*<\/div>/,
    '<div class="p-3.5 border border-hairline rounded-md bg-cream" id="login-recaptcha-slot"><div id="login-recaptcha"></div></div>',
  )
}

const TAB_SELECTED =
  'flex-1 min-h-[44px] text-xs font-medium text-center rounded transition-all duration-150 py-2.5 px-3 bg-cream text-deep-navy shadow-sm font-semibold'
const TAB_IDLE =
  'flex-1 min-h-[44px] text-xs font-medium text-center rounded transition-all duration-150 py-2.5 px-3 text-deep-navy/70 hover:text-deep-navy'

export function showAuthPanel(html: string, panel: 'signup' | 'login'): string {
  if (panel === 'signup') {
    return html
  }
  return html
    .replace('class="space-y-6" id="panel-signup"', 'class="hidden space-y-6" id="panel-signup"')
    .replace('class="hidden space-y-6" id="panel-login"', 'class="space-y-6" id="panel-login"')
    .replace('aria-controls="panel-signup" aria-selected="true"', 'aria-controls="panel-signup" aria-selected="false"')
    .replace('aria-controls="panel-login" aria-selected="false"', 'aria-controls="panel-login" aria-selected="true"')
    .replace(`class="${TAB_SELECTED}"`, 'class="__TAB_SELECTED__"')
    .replace(`class="${TAB_IDLE}"`, `class="${TAB_SELECTED}"`)
    .replace('class="__TAB_SELECTED__"', `class="${TAB_IDLE}"`)
}

export function pointAuthLinks(html: string): string {
  return html.replace('href="#">Mot de passe oublié ?', 'href="/password-reset">Mot de passe oublié ?')
}
