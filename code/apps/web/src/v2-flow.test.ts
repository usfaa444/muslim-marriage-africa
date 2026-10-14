import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GET as getDecouvrir } from '../app/decouvrir/route.js'
import { entryLocation, entryRedirect } from './entry-guard.js'
import { authResponse } from './v2-serve.js'
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
  profileHtml,
  pseudonymHtml,
  resetHtml,
  pendingProfilePhoto,
  reviewHtml,
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
    expect(email).toContain("fetch('/v1/accounts/email-verifications', { credentials: 'same-origin' })")
    expect(email).toContain('/v1/accounts/email-verifications/consume')
    expect(email).not.toContain('ibrahim.sawadogo@exemple.bf')
    expect(email).not.toContain('sessionStorage.getItem(EMAIL_KEY)')
    expect(email).not.toContain('sessionStorage.setItem(EMAIL_KEY')
    expect(email).toContain('placeholder="votre.nom@exemple.bf"')
    expect(email).toContain('id="email-link-error"')
    expect(email).toContain('data-icon="error"')
    expect(email).toContain('Renvoyer un lien')
    expect(email).toContain('Se connecter')
    expect(email).toContain("href = '/auth'")
    expect(email).toContain('Lien expiré ou adresse inconnue')
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
    expect(otp).toContain("fetch('/v1/verifications/otp'")
    expect(otp).toContain('phone_masked')
    expect(otp).toContain('id="phone-display"')
    expect(otp).not.toContain('70 24 58 19')
    expect(otp).not.toContain('+226 70 •• ••')
    expect(otp).not.toContain('setInterval')
  })

  it('offers another account on the in-progress steps that already have a text link', () => {
    const pages = [
      emailHtml(stitch('04-email-verification')),
      phoneHtml(stitch('06-otp')),
      otpHtml(stitch('56-otp-alt')),
      idHtml(stitch('07-id-liveness')),
    ]
    for (const page of pages) {
      expect(page.match(/id="switch-account"/g)?.length).toBe(1)
      expect(page).toContain('>Se connecter avec un autre compte</a>')
      expect(page).toContain('href="/auth?leave=1"')
      expect(page).toContain("fetch('/v1/sessions/current', { method: 'DELETE', credentials: 'same-origin' })")
      expect(page).toContain("location.assign('/auth?leave=1')")
    }
    expect(phoneHtml(stitch('06-otp'))).toContain('hover:text-soft-gold')
    expect(otpHtml(stitch('56-otp-alt'))).toContain('href="/phone"')
    expect(idHtml(stitch('07-id-liveness'))).toContain('hover:text-soft-gold')
  })

  it('hides the specimen identity state until a capture is stored', () => {
    const page = idHtml(stitch('07-id-liveness'))
    expect(page).not.toContain('CNIB_recto_verso.pdf')
    expect(page).toContain("fetch('/v1/verifications/id'")
    expect(page).toContain("fetch('/v1/verifications/liveness'")
    expect(page).toContain("fetch('/v1/accounts/gate'")
    expect(page).toContain("account: '/onboarding'")
    expect(page).toContain('window.location.assign(path)')
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
    expect(onboarding).toContain('id="onboarding-next"')
    expect(onboarding).toContain('href="/photo-rules"')
    expect(onboarding).toContain("fetch('/v1/accounts/gate'")
    expect(onboarding).toContain("account: '/photo-rules'")
    expect(onboarding).toContain('disabled=""')
    expect(onboarding).not.toContain('href="#consultation"')
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
    expect(page).not.toContain('00:00:00')
    expect(page).toContain("fetch('/v1/me/export-status'")
  })

  it('serves no specimen strings on the built v2 screens', () => {
    const specimens = [
      'ibrahim.sawadogo@exemple.bf',
      '70 24 58 19',
      '+226 70 24 58 19',
      'CNIB_recto_verso.pdf',
      '29 ans',
      '1996-09-14',
      'Région du Centre, Plateau-Central',
      'Je suis une personne calme',
      'exp-84092-bf',
      '47:55:56',
      '00:00:00',
      '+226 70 •• •• 84',
      '•• •• 42',
      'Al-Hassan_BF',
      '70% complété',
    ]
    const pages = [
      splashHtml(),
      identityHtml(stitch('03-age-gate')),
      pseudonymHtml(stitch('54-pseudonym-dob')),
      authHtml(stitch('02-auth'), 'login', SITE),
      authHtml(stitch('02-auth'), 'signup', SITE),
      emailHtml(stitch('04-email-verification')),
      phoneHtml(stitch('06-otp')),
      otpHtml(stitch('56-otp-alt')),
      idHtml(stitch('07-id-liveness')),
      resetHtml(stitch('05-password-reset')),
      resetHtml(stitch('05-password-reset'), 'renew'),
      resetHtml(stitch('05-password-reset'), 'invalid'),
      pinHtml(stitch('10-pin-lock')),
      onboardingHtml(stitch('08-onboarding')),
      photoHtml(stitch('09-photo-rules')),
      profileHtml(stitch('11-profile-edit')),
      reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 24, bioPending: true }),
      settingsHtml(stitch('27-settings')),
      statusHtml(stitch('28-delete-export-status')),
    ]
    for (const page of pages) {
      for (const specimen of specimens) {
        expect(page).not.toContain(specimen)
      }
    }
    const profile = profileHtml(stitch('11-profile-edit'))
    expect(profile).not.toContain('selected="" value="ouagadougou"')
    expect(profile).not.toContain('selected="" value="master_eco"')
    expect(profile).not.toContain('checked="" value="celibataire"')
    expect(profile).not.toContain("Projet d'édification")
    expect(profile).not.toContain('profil faible')
    expect(profile).not.toContain('confrérie')
    expect(profile).not.toContain('hijra')
    expect(profile).toContain("fetch('/v1/me/profile'")
    expect(profile).toContain("method: 'PUT'")
    expect(profile).toContain("fetch('/v1/me/deactivate'")
    expect(profile).toContain('<option selected="" value=""></option>')
    expect(phoneHtml(stitch('06-otp'))).toContain('placeholder="70 00 00 00"')
    expect(authHtml(stitch('02-auth'), 'login', SITE)).toContain('placeholder="nom@exemple.bf"')
  })

  it('compiles every served inline script as a classic script', () => {
    const auth = stitch('02-auth')
    const pages = [
      splashHtml(),
      identityHtml(stitch('03-age-gate')),
      pseudonymHtml(stitch('54-pseudonym-dob')),
      authHtml(auth, 'login', SITE),
      authHtml(auth, 'signup', SITE),
      emailHtml(stitch('04-email-verification')),
      phoneHtml(stitch('06-otp')),
      otpHtml(stitch('56-otp-alt')),
      idHtml(stitch('07-id-liveness')),
      resetHtml(stitch('05-password-reset')),
      resetHtml(stitch('05-password-reset'), 'renew'),
      resetHtml(stitch('05-password-reset'), 'invalid'),
      resetHtml(stitch('05-password-reset'), 'done'),
      pinHtml(stitch('10-pin-lock')),
      onboardingHtml(stitch('08-onboarding')),
      photoHtml(stitch('09-photo-rules')),
      profileHtml(stitch('11-profile-edit')),
      reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 24, bioPending: true }),
      settingsHtml(stitch('27-settings')),
      statusHtml(stitch('28-delete-export-status')),
    ]
    for (const page of pages) {
      const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
      expect(scripts.length).toBeGreaterThan(0)
      for (const source of scripts) {
        expect(() => new Script(source)).not.toThrow()
      }
    }
    expect(resetHtml(stitch('05-password-reset'), 'renew')).not.toContain('if (!form) return')
  })
})

type FakeNode = {
  id: string
  className: string
  textContent: string
  value: string
  disabled: boolean
  href: string
  parentNode: FakeNode | null
  children: FakeNode[]
  listener: ((
    event?: {
      button?: number
      metaKey?: boolean
      ctrlKey?: boolean
      shiftKey?: boolean
      altKey?: boolean
      preventDefault?: () => void
    },
  ) => void | Promise<void>) | null
  classList: {
    contains: (name: string) => boolean
    add: (name: string) => void
    remove: (name: string) => void
    toggle: (name: string, force?: boolean) => void
  }
  addEventListener: (
    type: string,
    fn: (event?: {
      button?: number
      metaKey?: boolean
      ctrlKey?: boolean
      shiftKey?: boolean
      altKey?: boolean
      preventDefault?: () => void
    }) => void | Promise<void>,
  ) => void
  querySelector: (selector: string) => FakeNode | null
  replaceChild: (next: FakeNode, prev: FakeNode) => void
  focus: () => void
}

function fakeNode(id = ''): FakeNode {
  const node = {
    id,
    className: '',
    textContent: '',
    value: '',
    disabled: false,
    href: '',
    parentNode: null,
    children: [],
    listener: null,
  } as FakeNode
  node.classList = {
    contains(name: string) {
      return node.className.split(/\s+/).includes(name)
    },
    add(name: string) {
      if (!node.classList.contains(name)) node.className = `${node.className} ${name}`.trim()
    },
    remove(name: string) {
      node.className = node.className
        .split(/\s+/)
        .filter((item) => item && item !== name)
        .join(' ')
    },
    toggle(name: string, force?: boolean) {
      const on = force === undefined ? !node.classList.contains(name) : force
      if (on) node.classList.add(name)
      else node.classList.remove(name)
    },
  }
  node.addEventListener = (_type, fn) => {
    node.listener = fn
  }
  node.querySelector = (selector) => node.children.find((child) => selector === 'button' || child.id === selector) ?? null
  node.replaceChild = (next, prev) => {
    const index = node.children.indexOf(prev)
    if (index >= 0) node.children[index] = next
    next.parentNode = node
    prev.parentNode = null
  }
  node.focus = () => {}
  return node
}

function emailPage() {
  const nodes = new Map<string, FakeNode>()
  function add(id: string, parent?: FakeNode): FakeNode {
    const node = fakeNode(id)
    nodes.set(id, node)
    if (parent) {
      parent.children.push(node)
      node.parentNode = parent
    }
    return node
  }
  const heading = add('h1')
  heading.textContent = 'Vérification de votre adresse email'
  const intro = add('email-intro')
  intro.textContent = 'Un lien sécurisé de confirmation a été envoyé.'
  const shown = add('currentEmail')
  const editBtn = add('editEmailBtn')
  const editForm = add('editEmailForm')
  editForm.className = 'hidden'
  const save = fakeNode('save-email')
  editForm.children.push(save)
  save.parentNode = editForm
  add('newEmailInput')
  const changeError = add('email-change-error')
  changeError.className = 'hidden'
  const banner = add('resendSuccessBanner')
  banner.className = 'hidden'
  const line = add('email-link-error')
  line.className = 'hidden'
  const lineText = add('email-link-error-text', line)
  const actions = add('actions')
  const resend = add('resendBtn', actions)
  const btnText = add('btnText', resend)
  btnText.textContent = 'Renvoyer le lien de confirmation'
  const documentRef = {
    getElementById(id: string) {
      return nodes.get(id) ?? null
    },
    querySelector(selector: string) {
      return selector === 'h1' ? heading : null
    },
    createElement() {
      const node = fakeNode('email-signin')
      nodes.set(node.id, node)
      return node
    },
  }
  return { documentRef, nodes, heading, intro, shown, line, lineText, btnText, resend, save, banner }
}

async function runEmail(search: string, fetchImpl: (url: string, init?: { method?: string }) => Promise<{ status: number; json: () => Promise<unknown> }>) {
  const page = emailPage()
  const moves: string[] = []
  const stored: string[] = []
  const scripts = [...emailHtml(stitch('04-email-verification')).matchAll(/<script>([\s\S]*?)<\/script>/g)]
  const script = scripts.find((match) => match[1]?.includes('email-verifications'))?.[1] ?? ''
  const windowRef = { location: { search, assign(url: string) { moves.push(url) } } }
  new Function('document', 'window', 'fetch', 'sessionStorage', script)(
    page.documentRef,
    windowRef,
    fetchImpl,
    { setItem(key: string) { stored.push(key) }, getItem() { return '' }, removeItem() {} },
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  return { page, moves, stored }
}

describe('email link result', () => {
  it('shows the real address from the read and not from session storage', async () => {
    const { page, stored } = await runEmail('', async (url) => {
      expect(url).toBe('/v1/accounts/email-verifications')
      return { status: 200, json: async () => ({ email: 'fatim@example.bf', email_verified_at: null }) }
    })
    expect(page.shown.textContent).toBe('fatim@example.bf')
    expect(stored).toEqual([])
    expect(page.heading.textContent).toBe('Vérification de votre adresse email')
  })

  it('moves on only when consume succeeds', async () => {
    const { moves, page } = await runEmail('?token=live', async (url, init) => {
      expect(url).toBe('/v1/accounts/email-verifications/consume')
      expect(init?.method).toBe('POST')
      return { status: 200, json: async () => ({ email_verified_at: '2026-10-12T00:00:00.000Z' }) }
    })
    expect(moves).toEqual(['/phone'])
    expect(page.heading.textContent).toBe('Vérification de votre adresse email')
  })

  it('shows the expired state and a resend when the member is signed in', async () => {
    const { page, moves } = await runEmail('?token=old', async (url, init) => {
      if (init?.method === 'POST') {
        return { status: 400, json: async () => ({ error: { code: 'EMAIL_LINK_INVALID', message: 'Lien expiré ou caduc.' } }) }
      }
      return { status: 200, json: async () => ({ email: 'fatim@example.bf', email_verified_at: null }) }
    })
    expect(moves).toEqual([])
    expect(page.shown.textContent).toBe('')
    expect(page.heading.textContent).toBe('Lien expiré ou adresse inconnue')
    expect(page.intro.textContent).toBe('Lien expiré ou caduc.')
    expect(page.lineText.textContent).toBe('Lien expiré ou caduc.')
    expect(page.line.classList.contains('hidden')).toBe(false)
    expect(page.btnText.textContent).toBe('Renvoyer un lien')
    expect(page.nodes.has('email-signin')).toBe(false)
  })

  it('sends a signed-out member to sign in after a dead link', async () => {
    const { page } = await runEmail('?token=dead', async (_url, init) => {
      if (init?.method === 'POST') {
        return { status: 400, json: async () => ({ error: { code: 'EMAIL_LINK_INVALID', message: 'Lien expiré ou caduc.' } }) }
      }
      return { status: 401, json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.' } }) }
    })
    expect(page.shown.textContent).toBe('')
    const link = page.nodes.get('email-signin')
    expect(link?.href).toBe('/auth')
    expect(link?.textContent).toBe('Se connecter')
    expect(page.resend.parentNode).toBeNull()
  })

  it('updates the shown address from the change-email response', async () => {
    const page = emailPage()
    const scripts = [...emailHtml(stitch('04-email-verification')).matchAll(/<script>([\s\S]*?)<\/script>/g)]
  const script = scripts.find((match) => match[1]?.includes('email-verifications'))?.[1] ?? ''
    new Function('document', 'window', 'fetch', 'sessionStorage', script)(
      page.documentRef,
      { location: { search: '', assign() {} } },
      async (url: string) => {
        if (url === '/v1/accounts/email') {
          return { status: 200, json: async () => ({ email: 'nouvelle@example.bf', expires_at: '2026-10-12T00:30:00.000Z' }) }
        }
        return { status: 200, json: async () => ({ email: 'fatim@example.bf', email_verified_at: null }) }
      },
      { setItem() {}, getItem() { return '' }, removeItem() {} },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(page.shown.textContent).toBe('fatim@example.bf')
    page.nodes.get('newEmailInput')!.value = 'nouvelle@example.bf'
    await page.save.listener?.({ preventDefault() {} })
    expect(page.shown.textContent).toBe('nouvelle@example.bf')
  })

  it('deletes the session and opens sign-in, including when logout fails', async () => {
    const page = emailPage()
    const link = fakeNode('switch-account')
    page.nodes.set('switch-account', link)
    const calls: Array<{ url: string; method?: string }> = []
    const removed: string[] = []
    const moves: string[] = []
    const scripts = [...emailHtml(stitch('04-email-verification')).matchAll(/<script>([\s\S]*?)<\/script>/g)]
    const script = scripts.find((match) => match[1]?.includes('switch-account'))?.[1] ?? ''
    new Function('document', 'window', 'fetch', 'sessionStorage', script)(
      page.documentRef,
      { location: { search: '', assign(url: string) { moves.push(url) } } },
      async (url: string, init?: { method?: string }) => {
        calls.push({ url, method: init?.method })
        if (init?.method === 'DELETE') {
          throw new Error('down')
        }
        return { status: 200, json: async () => ({ email: 'fatim@example.bf', email_verified_at: null }) }
      },
      { setItem() {}, getItem() { return 'kept' }, removeItem(key: string) { removed.push(key) } },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(page.shown.textContent).toBe('fatim@example.bf')
    let prevented = false
    await link.listener?.({
      button: 0,
      preventDefault() {
        prevented = true
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(prevented).toBe(true)
    expect(calls).toContainEqual({ url: '/v1/sessions/current', method: 'DELETE' })
    expect(moves).toEqual(['/auth?leave=1'])
    expect(removed).toContain('ankanu.signup.email')
    moves.length = 0
    calls.length = 0
    await link.listener?.({ button: 1, preventDefault() {} })
    expect(moves).toEqual([])
    expect(calls).toEqual([])
  })
})

describe('screen 12 review timing', () => {
  it('prints one configured SLA and omits a bio row that is not pending', () => {
    const hidden = reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 24, bioPending: false })
    expect(hidden).toContain('Délai habituel de modération : 24 heures.')
    expect(hidden).not.toContain('12 à')
    expect(hidden).not.toContain('ouvrées')
    expect(hidden).not.toContain('Présentation &amp; Bio')
    expect(hidden).toContain('Photographie de profil')
    expect(hidden).toContain("Conformité aux règles de pudeur")
    const shown = reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 48, bioPending: true })
    expect(shown).toContain('Délai habituel de modération : 48 heures.')
    expect(shown).toContain('Présentation &amp; Bio')
    expect(shown).not.toContain('12 à')
    expect(shown).not.toContain('ouvrées')
    expect(pendingProfilePhoto({ photo: { moderation_state: 'pending' } })).toBe(true)
    expect(pendingProfilePhoto({ photo: { moderation_state: 'live' }, pending_photo: { moderation_state: 'pending' } })).toBe(false)
    expect(pendingProfilePhoto({ photo: { moderation_state: 'live' } })).toBe(false)
    expect(hidden).toContain("window.location.replace('/profile-edit')")
    expect(hidden).toContain('photo.url || photo.blur_url')
    expect(hidden).toContain('data-icon="photo_camera"')
    expect(hidden).not.toContain('pending_photo')
    expect(hidden).toContain('id="profile-review-understood"')
    expect(hidden).toContain("J'ai compris")
    expect(hidden).toContain('min-h-[44px]')
    expect(hidden).toContain('min-w-[44px]')
    expect(hidden).toContain('bg-deep-navy text-cream')
    expect(hidden).toContain("sessionStorage.getItem(RETURN_KEY)")
    expect(hidden).toContain("window.location.assign(reviewReturn())")
    expect(hidden).toContain("return '/profile-edit'")
  })
})

describe('server entry guard', () => {
  it('sends each account to the first unfinished step', () => {
    expect(entryLocation('/signup', 'anon')).toBeNull()
    expect(entryLocation('/signup/account', 'anon')).toBeNull()
    expect(entryLocation('/auth', 'anon')).toBeNull()
    expect(entryLocation('/auth', 'account')).toBe('/decouvrir')
    expect(entryLocation('/password-reset', 'email')).toBeNull()
    expect(entryLocation('/age-gate', 'anon')).toBe('/signup/identity')
    expect(entryLocation('/email-verification', 'anon')).toBe('/auth')
    expect(entryLocation('/decouvrir', 'anon')).toBe('/auth')
    expect(entryLocation('/favoris', 'anon')).toBe('/auth')
    expect(entryLocation('/favoris', 'account')).toBeNull()
    expect(entryLocation('/signup', 'email')).toBe('/email-verification')
    expect(entryLocation('/auth', 'phone')).toBe('/phone')
    expect(entryLocation('/otp', 'phone')).toBe('/phone')
    expect(entryLocation('/otp', 'otp')).toBeNull()
    expect(entryLocation('/id-liveness', 'identity')).toBeNull()
    expect(entryLocation('/onboarding', 'identity')).toBe('/id-liveness')
    expect(entryLocation('/profile-edit', 'anon')).toBe('/auth')
    expect(entryLocation('/profile-review', 'anon')).toBe('/auth')
    expect(entryLocation('/profile-review', 'account')).toBeNull()
    expect(entryLocation('/pin', 'account')).toBeNull()
    expect(entryLocation('/privacy/status/ticket-1', 'account')).toBeNull()
    expect(entryLocation('/settings', 'email')).toBe('/email-verification')
    expect(entryLocation('/profil/01990000-0000-7000-8000-000000000001', 'anon')).toBe('/auth')
    expect(entryLocation('/profil/01990000-0000-7000-8000-000000000001', 'account')).toBeNull()
    expect(entryLocation('/profil/01990000-0000-7000-8000-000000000001', 'email')).toBe('/email-verification')
  })

  it('sends a signed-in account away from the login form to in-app home', async () => {
    const home = await authResponse(
      new Request('http://127.0.0.1/auth', { headers: { cookie: 'ankanu_session=real-session' } }),
      async () => 'account',
    )
    expect(home.status).toBe(303)
    expect(home.headers.get('location')).toBe('http://127.0.0.1/decouvrir')
    expect(await home.text()).not.toContain('login-email')
    const phone = await authResponse(
      new Request('http://127.0.0.1/auth', { headers: { cookie: 'ankanu_session=real-session' } }),
      async () => 'phone',
    )
    expect(phone.status).toBe(303)
    expect(phone.headers.get('location')).toBe('http://127.0.0.1/phone')
  })

  it('keeps an email link on the page until consume finishes', async () => {
    let loads = 0
    const later = await entryRedirect(
      new Request('http://localhost/email-verification?token=old-link', {
        headers: { cookie: 'ankanu_session=real-session' },
      }),
      '/email-verification',
      async () => {
        loads += 1
        return 'phone'
      },
    )
    expect(later).toBeNull()
    expect(loads).toBe(0)
    const anon = await entryRedirect(
      new Request('http://localhost/email-verification?token=old-link'),
      '/email-verification',
      async () => 'anon',
    )
    expect(anon).toBeNull()
    const blank = await entryRedirect(new Request('http://localhost/email-verification?token='), '/email-verification', async () => 'anon')
    expect(blank?.status).toBe(303)
    expect(blank?.headers.get('location')).toBe('http://localhost/auth')
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

  it('clears the cookie on leave and the next /auth stays on the sign-in panel', async () => {
    const webRoot = fileURLToPath(new URL('../', import.meta.url))
    const previous = process.cwd()
    process.chdir(webRoot)
    const original = globalThis.fetch
    try {
      const { authResponse } = await import('./v2-serve.js')
      const sent: string[] = []
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        sent.push(`${init?.method ?? 'GET'} ${String(input)}`)
        const headers = new Headers()
        if (init?.method === 'DELETE') {
          headers.append('set-cookie', 'ankanu_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
        }
        return new Response(null, { status: 204, headers })
      }) as typeof fetch
      const left = await authResponse(
        new Request('http://127.0.0.1/auth?leave=1', { headers: { cookie: 'ankanu_session=real-session' } }),
      )
      expect(left.status).toBe(303)
      expect(left.headers.get('location')).toBe('http://127.0.0.1/auth')
      expect(left.headers.get('set-cookie')).toContain('Max-Age=0')
      expect(sent).toHaveLength(1)
      expect(sent[0]).toMatch(/^DELETE .+\/v1\/sessions\/current$/)
      const signIn = await authResponse(new Request('http://127.0.0.1/auth'))
      expect(signIn.status).toBe(200)
      expect(await signIn.text()).toContain('class="space-y-6" id="panel-login"')
      sent.length = 0
      globalThis.fetch = (async () => {
        throw new Error('down')
      }) as typeof fetch
      const failed = await authResponse(
        new Request('http://127.0.0.1/auth?leave=1', { headers: { cookie: 'ankanu_session=real-session' } }),
      )
      expect(failed.status).toBe(303)
      expect(failed.headers.get('location')).toBe('http://127.0.0.1/auth')
      expect(failed.headers.get('set-cookie')).toContain('ankanu_session=')
      expect(failed.headers.get('set-cookie')).toContain('Max-Age=0')
      const again = await entryRedirect(new Request('https://staging.ankanu.com/auth'), '/auth', async () => 'anon')
      expect(again).toBeNull()
    } finally {
      globalThis.fetch = original
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
