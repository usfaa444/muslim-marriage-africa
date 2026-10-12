/** Shared transforms for AnKanu v2 Stitch HTML. Demo scripts never ship. */

const RESPONSIVE = `<style id="ankanu-responsive">
*, *::before, *::after { box-sizing: border-box; }
html, body {
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  min-height: 100%;
  overflow: auto !important;
}
img, svg, video, canvas { max-width: 100%; height: auto; }
iframe { max-width: 100%; }
main, section, form, header, footer { min-width: 0; max-width: 100%; }
@media (max-width: 400px) {
  .g-recaptcha { transform: scale(0.88); transform-origin: 0 0; }
}
</style>`

export function stripDemoScripts(html: string): string {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs: string, body: string) => {
    if (/\bsrc\s*=/i.test(attrs) || /\bid\s*=\s*["']tailwind-config["']/i.test(attrs)) {
      return full
    }
    if (/^\s*tailwind\.config\s*=/.test(body)) {
      return full
    }
    return ''
  })
}

export function stripInlineHandlers(html: string): string {
  return html.replace(/\s(?:onclick|oninput|onchange|onsubmit)="[^"]*"/gi, '')
}

/** Stitch exports lock the document to a desktop frame. That frame must not ship. */
function unlockStitchCanvas(html: string): string {
  return html.replace(
    /(<html\b[^>]*?)\sstyle="width:\s*\d+px;\s*height:\s*\d+px;\s*overflow:\s*hidden;\s*position:\s*relative;?"/i,
    '$1',
  )
}

export function prepareV2(html: string, script: string): string {
  let next = unlockStitchCanvas(stripInlineHandlers(stripDemoScripts(html)))
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

const LOGIN_ERROR = `<p class="hidden text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="login-error"><span class="material-symbols-outlined text-[14px]" data-icon="error">error</span> </p>`

/** Same pattern as `#email-error`, hidden until a real sign-in failure. */
export function insertLoginError(html: string): string {
  const marker = '<!-- Se souvenir de moi -->'
  if (!html.includes(marker) || html.includes('id="login-error"')) {
    return html
  }
  return html.replace(marker, `${LOGIN_ERROR}${marker}`)
}

/** A missing script must not GET the password into the query string. */
export function guardAuthPost(html: string): string {
  return html
    .replace('id="login-form"', 'id="login-form" method="post"')
    .replace('id="signup-form"', 'id="signup-form" method="post"')
}
