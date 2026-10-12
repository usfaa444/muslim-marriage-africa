import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GET as getDecouvrir } from '../app/decouvrir/route.js'
import { entryLocation, entryRedirect } from './entry-guard.js'
import { LandingPage } from './landing.js'
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
  pseudonymHtml,
  resetHtml,
  settingsHtml,
  splashHtml,
  statusHtml,
} from './v2-pages.js'

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

const SITE = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

describe('v2 signup and sign-in screens', () => {
  it('builds step 0 from the splash mark, not the broken stitch HTML', () => {
    const page = splashHtml()
    const broken = stitch('01-splash')
    expect(page).toContain('AnKanu')
    expect(page).toContain('<a class="continue" href="/signup/identity">Créer un compte</a>')
    expect(page).toContain('<a class="signin" href="/auth">Se connecter</a>')
    expect(page).toContain('a.continue { background: #0B1D36; color: #F7F1E3; font-size: 0.875rem; }')
    expect(page).toContain(
      'a.signin { background: #F7F1E3; color: #0B1D36; border: 1px solid #E2D4B8; font-size: 0.75rem; font-weight: 500; padding: 0 1rem; }',
    )
    expect(page).toContain('min-height: 3rem')
    expect(page).toContain('border-radius: 8px')
    expect(page).toContain('a.signin:hover { background: rgba(226, 212, 184, 0.2); }')
    expect(page).not.toContain('Continuer')
    expect(page).toContain('<rect ')
    expect(page).toContain('stroke-dasharray')
    expect(page).not.toContain('rotate(')
    expect(page).toContain('ankanu-responsive')
    expect(page).not.toContain('accounts.google.com')
    expect(broken).toContain('accounts.google.com')
    expect(page).not.toContain(broken.slice(0, 80))
  })

  it('opens sign-in from the splash without writing the signup draft', () => {
    const page = splashHtml()
    const script = page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
    const store = new Map<string, string>([
      ['ankanu.signup.v2', '{"pseudonym":"awa"}'],
      ['ankanu.signup', 'old'],
    ])
    const clicks: Record<string, Array<(event?: { button?: number; metaKey?: boolean; ctrlKey?: boolean }) => void>> = {
      continue: [],
      signin: [],
    }
    const document = {
      querySelector(selector: string) {
        const key = selector === 'a.continue' ? 'continue' : selector === 'a.signin' ? 'signin' : ''
        if (!key) return null
        return {
          addEventListener(_type: string, listener: (event?: { button?: number }) => void) {
            clicks[key]?.push(listener)
          },
        }
      },
    }
    const sessionStorage = {
      removeItem(key: string) {
        store.delete(key)
      },
    }
    new Function('document', 'sessionStorage', script)(document, sessionStorage)
    expect(store.get('ankanu.signup.v2')).toBe('{"pseudonym":"awa"}')
    expect(clicks.signin).toHaveLength(0)
    clicks.continue[0]?.({ button: 0, ctrlKey: true })
    expect(store.get('ankanu.signup.v2')).toBe('{"pseudonym":"awa"}')
    clicks.continue[0]?.({ button: 0 })
    expect(store.has('ankanu.signup.v2')).toBe(false)
    expect(store.has('ankanu.signup')).toBe(false)
    const login = authHtml(stitch('02-auth'), 'login', SITE)
    const submit = login.slice(login.indexOf("var loginForm = document.getElementById('login-form')"))
    expect(submit).toContain("fetch('/v1/sessions'")
    expect(submit).not.toContain('writeDraft')
    expect(submit).not.toContain('clearDraft')
    expect(submit).not.toContain('removeItem')
    expect(submit).not.toContain('civil_given_name')
    expect(login).toContain("if (PANEL === 'login') window.location.assign('/signup')")
  })

  it('creates the account once from the signup panel with a captcha token', () => {
    const page = authHtml(stitch('02-auth'), 'signup', SITE)
    expect(page).toContain('Créer mon compte')
    expect(page).toContain('Engagement Solennel de Ta')
    expect(page).toContain('id="signup-recaptcha"')
    expect(page).toContain('recaptcha_token')
    expect(page).toContain("fetch('/v1/accounts'")
    expect(page).toContain('pledge_accepted: true')
    expect(page).toContain('civil_given_name')
    expect(page).not.toContain('human_verified')
    expect(page).not.toContain('Continuer avec Google')
    expect(page).not.toContain('id="signup-pseudonym"')
    expect(page).not.toContain('alert(')
    expect(page).not.toContain('confirm(')
    expect(page).toContain('grecaptcha.reset')
    expect(page).toContain('finally')
    expect(page).toContain('ankanu.signup.v2')
    expect(page).toContain("location.assign('/auth')")
  })

  it('signs in from the connexion panel and returns to step 0 from the other tab', () => {
    const page = authHtml(stitch('02-auth'), 'login', SITE)
    expect(page).toContain('id="login-recaptcha"')
    expect(page).not.toContain('id="login-captcha"')
    expect(page).toContain("fetch('/v1/sessions'")
    expect(page).toContain('recaptcha_token')
    expect(page).toContain('href="/password-reset"')
    expect(page).toContain("location.assign('/signup')")
    expect(page).toContain('class="hidden space-y-6" id="panel-signup"')
    expect(page).toContain('class="space-y-6" id="panel-login"')
    expect(page).toContain('id="login-form" method="post"')
    expect(page).toContain('id="login-error"')
    expect(page).toContain('class="hidden text-xs text-[#9B2C2C] flex items-center gap-1 font-medium mt-1" id="login-error"')
    expect(page).not.toContain("STEP[step] || '/onboarding'")
    expect(page).not.toContain('Continuer avec Google')
  })

  it('keeps steps 1 and 2 on the client until precheck passes', () => {
    const identity = identityHtml(stitch('03-age-gate'))
    expect(identity).toContain('id="first-name"')
    expect(identity).toContain("gender.value === 'frere' ? 'brother' : 'sister'")
    expect(identity).toContain("location.assign('/signup/pseudonym')")
    expect(identity).not.toContain("fetch('/v1/accounts'")
    const step = pseudonymHtml(stitch('54-pseudonym-dob'))
    expect(step).toContain('Accès réservé aux personnes majeures de 19 ans et plus.')
    expect(step).toContain("fetch('/v1/accounts/precheck'")
    expect(step).toContain('pseudonym_available')
    expect(step).toContain('age_eligible')
  })

  it('verifies email, phone, and the code only after a real send', () => {
    const email = emailHtml(stitch('04-email-verification'))
    expect(email).toContain("fetch('/v1/accounts/email-verifications'")
    expect(email).toContain('/v1/accounts/email-verifications/consume')
    expect(email).toContain("fetch('/v1/accounts/email'")
    expect(email).toContain('editEmailBtn')
    expect(email).toContain('editEmailForm')
    expect(email).toContain('id="email-change-error"')
    const phone = phoneHtml(stitch('06-otp'))
    expect(phone).not.toContain('70 24 58 19')
    expect(phone).toContain("action: 'send'")
    expect(phone).toContain("location.assign('/otp')")
    const otp = otpHtml(stitch('56-otp-alt'))
    expect(otp).toContain('otp-digit')
    expect(otp).toContain("action: 'verify'")
    expect(otp).toContain('href="/phone"')
    expect(otp).not.toContain('setInterval')
  })

  it('hides the specimen identity state until a capture is stored', () => {
    const page = idHtml(stitch('07-id-liveness'))
    expect(page).not.toContain('CNIB_recto_verso.pdf')
    expect(page).toContain("fetch('/v1/verifications/id'")
    expect(page).toContain("fetch('/v1/verifications/liveness'")
    expect(page).toContain("location.assign('/onboarding')")
  })

  it('asks for a reset link and unlocks a four-digit PIN', () => {
    const reset = resetHtml(stitch('05-password-reset'))
    expect(reset).toContain("fetch('/v1/password-resets'")
    expect(reset).toContain('href="/auth"')
    expect(reset).toContain('id="email"')
    expect(reset).not.toContain('id="reset-password"')
    const renew = resetHtml(stitch('05-password-reset'), 'renew')
    expect(renew).toContain('Nouveau mot de passe')
    expect(renew).toContain('Confirmation du mot de passe')
    expect(renew).toContain('Au minimum 12 caractères avec lettres, chiffres et symbole noble.')
    expect(renew).toContain("fetch('/v1/password-resets/consume'")
    expect(renew).toContain('password.value !== confirm.value')
    expect(renew).toContain('PASSWORD_RESET_INVALID')
    expect(renew).toContain('history.replaceState')
    expect(renew).not.toContain('id="email"')
    expect(renew).not.toContain("Renseignez l'adresse email")
    expect(renew).not.toContain('Scaleway')
    const invalid = resetHtml(stitch('05-password-reset'), 'invalid')
    expect(invalid).toContain('Lien expiré ou adresse inconnue')
    expect(invalid).toContain('Reprendre la demande')
    expect(invalid).toContain('href="/password-reset"')
    const done = resetHtml(stitch('05-password-reset'), 'done')
    expect(done).toContain('Mot de passe renouvelé · Anciennes sessions révoquées')
    expect(done).toContain('Session locale active et reconnue pour 30 jours.')
    expect(done).toContain('Accéder à mon espace Ta\'aruf')
    expect(done).toContain('id="reset-enter"')
    const pin = pinHtml(stitch('10-pin-lock'))
    expect(pin).toContain("fetch('/v1/pin/unlock'")
    expect(pin).toContain('digits.length === 4')
    expect(pin).toContain('pin-dot')
    expect(pin).toContain("next.charAt(0) !== '/'")
    expect(pin).toContain("next.charAt(1) === '/'")
    const settings = settingsHtml(stitch('27-settings'))
    expect(settings).toContain('confirm: true')
    const onboarding = onboardingHtml(stitch('08-onboarding'))
    const photo = photoHtml(stitch('09-photo-rules'))
    expect(onboarding).toContain('id="audio-guide-heading"')
    expect(onboarding).toContain('toggleAudio')
    expect(onboarding).toContain('id="audio-guide-heading"')
    expect(photo).toContain('toggleAudio')
    expect(photo).toContain('id="audio-guide-heading"')
    expect(photo).toContain("closest('section')")
    expect(photo).toContain('aria-label')
    expect(onboarding).not.toContain('.mp3')
    expect(photo).not.toContain('.mp3')
    expect(pin).not.toContain('width: 1280px')
    expect(statusHtml(stitch('28-delete-export-status'))).not.toContain('width: 1280px')
  })

  it('clears the specimen status until the ticket is read', () => {
    const page = statusHtml(stitch('28-delete-export-status'))
    expect(page).not.toContain('exp-84092-bf')
    expect(page).not.toContain('47:55:56')
    expect(page).toContain("fetch('/v1/me/export-status'")
  })
})

describe('server entry guard', () => {
  it('sends each account to the first unfinished step', () => {
    expect(entryLocation('/signup', 'anon')).toBeNull()
    expect(entryLocation('/signup/account', 'anon')).toBeNull()
    expect(entryLocation('/auth', 'anon')).toBeNull()
    expect(entryLocation('/password-reset', 'email')).toBeNull()
    expect(entryLocation('/age-gate', 'anon')).toBe('/signup/identity')
    expect(entryLocation('/email-verification', 'anon')).toBe('/auth')
    expect(entryLocation('/decouvrir', 'anon')).toBe('/auth')
    expect(entryLocation('/signup', 'email')).toBe('/email-verification')
    expect(entryLocation('/auth', 'phone')).toBe('/phone')
    expect(entryLocation('/otp', 'phone')).toBe('/phone')
    expect(entryLocation('/otp', 'otp')).toBeNull()
    expect(entryLocation('/id-liveness', 'identity')).toBeNull()
    expect(entryLocation('/onboarding', 'identity')).toBe('/id-liveness')
    expect(entryLocation('/pin', 'account')).toBeNull()
    expect(entryLocation('/privacy/status/ticket-1', 'account')).toBeNull()
    expect(entryLocation('/settings', 'email')).toBe('/email-verification')
  })

  it('redirects a signed-out member route and leaves stub cookies on the JSON envelope', async () => {
    const anon = await getDecouvrir(new Request('http://localhost/decouvrir'))
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://localhost/auth')
    const staff = await getDecouvrir(
      new Request('http://localhost/decouvrir', { headers: { cookie: 'ankanu_session=staff' } }),
    )
    expect(staff.status).toBe(403)
    const held = await entryRedirect(
      new Request('http://localhost/signup', { headers: { cookie: 'ankanu_session=real-session' } }),
      '/signup',
      async () => 'identity',
    )
    expect(held?.status).toBe(303)
    expect(held?.headers.get('location')).toBe('http://localhost/id-liveness')
  })

  it('keeps a gate error off auth and password reset', async () => {
    const auth = await entryRedirect(
      new Request('http://localhost/auth', { headers: { cookie: 'ankanu_session=real-session' } }),
      '/auth',
      async () => 'error',
    )
    expect(auth).toBeNull()
    const reset = await entryRedirect(
      new Request('http://localhost/password-reset', { headers: { cookie: 'ankanu_session=real-session' } }),
      '/password-reset',
      async () => 'error',
    )
    expect(reset).toBeNull()
    const onward = await entryRedirect(
      new Request('http://localhost/onboarding', { headers: { cookie: 'ankanu_session=real-session' } }),
      '/onboarding',
      async () => 'error',
    )
    expect(onward?.status).toBe(303)
    expect(onward?.headers.get('location')).toBe('http://localhost/auth')
    const publicHost = await entryRedirect(
      new Request('http://0.0.0.0:3000/onboarding', { headers: { host: '72.61.0.79:4012' } }),
      '/onboarding',
      async () => 'anon',
    )
    expect(publicHost?.headers.get('location')).toBe('http://72.61.0.79:4012/auth')
    const previousOrigin = process.env.ANKANU_PUBLIC_ORIGIN
    const previousAllowed = process.env.ANKANU_ALLOWED_ORIGINS
    process.env.ANKANU_PUBLIC_ORIGIN = 'https://staging.ankanu.com'
    process.env.ANKANU_ALLOWED_ORIGINS = 'https://staging.ankanu.com,http://72.61.0.79:4012'
    const edge = await entryRedirect(
      new Request('http://0.0.0.0:3000/onboarding', {
        headers: {
          host: '172.24.0.1:4012',
          'x-forwarded-proto': 'http, https',
          'x-forwarded-host': 'evil.example, staging.ankanu.com',
        },
      }),
      '/onboarding',
      async () => 'anon',
    )
    expect(edge?.headers.get('location')).toBe('https://staging.ankanu.com/auth')
    const spoofed = await entryRedirect(
      new Request('http://0.0.0.0:3000/onboarding', {
        headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'evil.example' },
      }),
      '/onboarding',
      async () => 'anon',
    )
    expect(spoofed?.headers.get('location')).toBe('https://staging.ankanu.com/auth')
    if (previousOrigin === undefined) {
      delete process.env.ANKANU_PUBLIC_ORIGIN
    } else {
      process.env.ANKANU_PUBLIC_ORIGIN = previousOrigin
    }
    if (previousAllowed === undefined) {
      delete process.env.ANKANU_ALLOWED_ORIGINS
    } else {
      process.env.ANKANU_ALLOWED_ORIGINS = previousAllowed
    }
  })
})

describe('route files', () => {
  it('reads the v2 screens when the process cwd is the web package', async () => {
    const webRoot = fileURLToPath(new URL('../', import.meta.url))
    const previous = process.cwd()
    process.chdir(webRoot)
    try {
      const { authResponse, resetResponse, signupResponse } = await import('./v2-serve.js')
      const splash = await signupResponse(new Request('http://127.0.0.1/signup'))
      expect(splash.status).toBe(200)
      const splashBody = await splash.text()
      expect(splashBody).toContain('<a class="continue" href="/signup/identity">Créer un compte</a>')
      expect(splashBody).toContain('<a class="signin" href="/auth">Se connecter</a>')
      const signIn = await authResponse(new Request('http://127.0.0.1/auth'))
      expect(signIn.status).toBe(200)
      const body = await signIn.text()
      expect(body).toContain('Se connecter')
      const loginMode = await authResponse(new Request('http://127.0.0.1/auth?mode=login'))
      expect(loginMode.status).toBe(200)
      expect(await loginMode.text()).toContain('class="space-y-6" id="panel-login"')
      expect(body).not.toContain('Continuer avec Google')
      const restart = await authResponse(new Request('http://127.0.0.1/auth?mode=signup'))
      expect(restart.status).toBe(303)
      expect(restart.headers.get('location')).toBe('http://127.0.0.1/signup')
      const ask = await resetResponse(new Request('http://127.0.0.1/password-reset'))
      expect(ask.status).toBe(200)
      expect(await ask.text()).toContain('id="email"')
      const renew = await resetResponse(new Request('http://127.0.0.1/password-reset?token=link-token'))
      expect(renew.status).toBe(200)
      const renewBody = await renew.text()
      expect(renewBody).toContain('id="reset-password"')
      expect(renewBody).not.toContain('id="email"')
      expect(renewBody).not.toContain("Renseignez l'adresse email")
    } finally {
      process.chdir(previous)
    }
  })
})

describe('landing calls', () => {
  it('keeps the landing visual and points signup and login at the v2 screens', () => {
    const html = renderToStaticMarkup(createElement(LandingPage))
    expect(html.match(/href="\/signup"/g)?.length).toBe(4)
    expect(html.match(/href="\/auth"/g)?.length).toBe(2)
    expect(html).not.toContain('href="#auth-inscription"')
    expect(html).not.toContain('mode=signup')
    expect(html).not.toContain('mode=login')
    expect(html).toContain('Commencer')
  })
})
