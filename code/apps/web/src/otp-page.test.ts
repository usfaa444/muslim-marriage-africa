import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { maskE164, otpPageHtml } from './otp-page.js'

const stitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/14-otp/screen.html', import.meta.url)),
  'utf8',
)
const page = otpPageHtml(stitch)
const PHONE_FAILED = 'phone_e164 : un numéro E.164 est requis.'
const VERIFY_FAILED = 'Code invalide ou expiré'

describe('otp screen', () => {
  it('keeps the downloaded screen and posts send and verify', () => {
    expect(page).toContain('Vérification du Numéro de Téléphone')
    expect(page).toContain('id="otp-0"')
    expect(page).toContain('id="otp-5"')
    expect(page).toContain('Confirmer le code scellé')
    expect(page).toContain('Envoyer le code par SMS')
    expect(page).toContain("Entrez le numéro de téléphone pour le Burkina Faso ou l'international :")
    expect(page).toContain('value="+226"')
    expect(page).toContain('Renvoyer le code par SMS')
    expect(page).toContain('>58<')
    expect(page).toContain('id="otp-phone-mask"')
    expect(page).toContain('id="otp-phone-input"')
    expect(page).toContain('aria-label="Numéro de téléphone"')
    expect(page).toContain('Code invalide ou expiré')
    expect(page).toContain('Niveau téléphonique accordé (Phone level granted)')
    expect(page).toContain('Hébergement souverain certifié Scaleway')
    expect(page).toContain('ankanu_pin_hidden_at')
    expect(page).toContain("fetch('/v1/pin'")
    expect(page.lastIndexOf('ankanu_pin_hidden_at')).toBeLessThan(page.lastIndexOf('<script>'))
    const added = page.slice(page.lastIndexOf('<script>'))
    expect(added).toContain("fetch('/v1/verifications/otp'")
    expect(added).toContain("method: 'GET'")
    expect(added).toContain("cache: 'no-store'")
    expect(added).toContain("action: 'send'")
    expect(added).toContain("action: 'verify'")
    expect(added).toContain('showCodeEntry(maskPhone(normalized), 60)')
    expect(added).toContain("location.assign('/auth?mode=login')")
    expect(added).not.toContain('setScreenState(')
    expect(added).not.toContain("code === '123456'")
    expect(added).not.toContain('alert(')
    expect(added).not.toContain('prompt(')
    expect(page).not.toContain('alert(')
    expect(page).not.toContain('confirm(')
    expect(page).not.toContain('prompt(')
    expect(page).not.toContain('btn-state-')
    expect(page).not.toContain("Contrôleur d'états")
    expect(page).not.toContain('onclick="setScreenState')
    expect(page).not.toContain("code === '123456'")
    expect(page).not.toContain("Accéder à l'étape Wali")
    expect(page).not.toContain("['8', '4', '0', '1', '9', '2']")
    expect(page).toContain('window.stopOtpCooldown')
    expect(page).toContain('window.otpGranted')
    expect(stitch).toContain('btn-state-default')
    expect(stitch).toContain("Accéder à l'étape Wali")
    expect(maskE164('+22670123484')).toBe('+226 70 •• •• 84')
  })

  it('first paint has no visible boxes and no specimen mask', () => {
    expect(page).toContain('id="otp-code-block" hidden')
    expect(page).toContain('id="otp-resend-row" hidden')
    expect(page).toContain('id="otp-sent-row" hidden')
    expect(page).toContain('id="otp-sent-copy" hidden')
    expect(page).toContain('id="error-banner"')
    expect(page).toContain('class="hidden rounded-lg p-3 bg-danger-soft')
    expect(page).toContain('class="hidden rounded-lg p-3 bg-success-soft')
    expect(page).not.toContain('+226 70 •• •• 84')
    expect(page).not.toContain("Aujourd'hui, 14:32:08 UTC")
    expect(page).not.toContain('startCooldown(58)')
  })

  it('sends a valid number and verifies the six digits', async () => {
    const screen = await runScreen(async (_url, body) => {
      const action = body.action
      return {
        status: action === 'verify' ? 200 : 201,
        json: async () => (action === 'verify' ? { status: 'granted' } : {}),
      }
    })
    expect(screen.codeHidden).toBe(true)
    expect(screen.sentHidden).toBe(true)
    expect(screen.resendHidden).toBe(true)
    expect(screen.phoneHidden).toBe(false)
    screen.setPhone('+226 70 12 34 84')
    screen.submit()
    await flush()
    expect(screen.posts).toEqual([{ action: 'send', phone_e164: '+22670123484' }])
    expect(screen.cooldowns).toEqual([60])
    expect(screen.mask).toBe('+226 70 •• •• 84')
    expect(screen.phoneHidden).toBe(true)
    expect(screen.codeHidden).toBe(false)
    expect(screen.sentHidden).toBe(false)
    expect(screen.resendHidden).toBe(false)
    expect(screen.submitLabel).toBe('Confirmer le code scellé')

    screen.fill('222222')
    screen.submit()
    await flush()
    expect(screen.posts[1]).toEqual({ action: 'verify', code: '222222' })
    expect(screen.digits).toBe('222222')
    expect(screen.digitsLocked).toBe(true)
    expect(screen.successHidden).toBe(false)
    expect(screen.errorHidden).toBe(true)
    expect(screen.submitDisabled).toBe(true)
    expect(screen.submitLabel).toBe('Confirmer le code scellé')
    expect(screen.modifyHidden).toBe(true)
    expect(screen.resendDisabled).toBe(true)
    expect(screen.cooldownStopped).toBe(true)
  })

  it('keeps an invalid number on the phone field and does not post', async () => {
    const screen = await runScreen(async () => ({ status: 201 }))
    screen.setPhone('70 12 34 84')
    screen.submit()
    await flush()
    expect(screen.posts).toEqual([])
    expect(screen.errorText).toBe(PHONE_FAILED)
    expect(screen.errorHidden).toBe(false)
    expect(screen.phoneHidden).toBe(false)
    expect(screen.codeHidden).toBe(true)
    expect(screen.submitDisabled).toBe(false)
    expect(screen.submitLabel).toBe('Envoyer le code par SMS')
  })

  it('keeps phone entry and a usable button when the send fails', async () => {
    let attempt = 0
    const screen = await runScreen(async () => {
      attempt += 1
      if (attempt === 1) {
        return {
          status: 503,
          json: async () => ({ error: { message: "L'envoi du code a échoué." } }),
        }
      }
      return { status: 201 }
    })
    screen.setPhone('+22670123484')
    screen.submit()
    await flush()
    expect(screen.errorText).toBe("L'envoi du code a échoué.")
    expect(screen.phoneHidden).toBe(false)
    expect(screen.codeHidden).toBe(true)
    expect(screen.sentHidden).toBe(true)
    expect(screen.submitDisabled).toBe(false)
    screen.submit()
    await flush()
    expect(screen.posts[1]).toEqual({ action: 'send', phone_e164: '+22670123484' })
    expect(screen.codeHidden).toBe(false)
    expect(screen.mask).toBe('+226 70 •• •• 84')
    expect(screen.errorHidden).toBe(true)
  })

  it('keeps the earlier mask when a send is inside the wait', async () => {
    const screen = await runScreen(async (_url, body) => ({
      status: body.phone_e164 === '+22670999999' ? 200 : 201,
      json: async () => ({ expires_at: new Date(Date.now() + 9 * 60 * 1000).toISOString() }),
    }))
    screen.setPhone('+226 70 12 34 84')
    screen.submit()
    await flush()
    screen.modify('+226 70 99 99 99')
    await flush()
    expect(screen.posts.slice(0, 2)).toEqual([
      { action: 'send', phone_e164: '+22670123484' },
      { action: 'send', phone_e164: '+22670999999' },
    ])
    expect(screen.mask).toBe('+226 70 •• •• 84')
    expect(screen.codeHidden).toBe(false)
    screen.resend()
    await flush()
    expect(screen.posts[2]).toEqual({ action: 'send', phone_e164: '+22670123484' })
  })

  it('shows the error banner for a rejected code and still allows another try', async () => {
    const screen = await runScreen(async (_url, body) => ({ status: body.action === 'verify' ? 400 : 201 }))
    screen.setPhone('+22670123484')
    screen.submit()
    await flush()
    screen.fill('111111')
    screen.submit()
    await flush()
    expect(screen.errorHidden).toBe(false)
    expect(screen.errorText).toBe(VERIFY_FAILED)
    expect(screen.codeHidden).toBe(false)
    expect(screen.submitDisabled).toBe(false)
    screen.fill('222222')
    screen.submit()
    await flush()
    expect(screen.posts).toHaveLength(3)
    expect(screen.posts[2]).toEqual({ action: 'verify', code: '222222' })
  })

  it('does not verify again after the code is granted', async () => {
    const screen = await runScreen(async (_url, body) => ({
      status: body.action === 'verify' ? 200 : 201,
      json: async () => (body.action === 'verify' ? { status: 'granted' } : {}),
    }))
    screen.setPhone('+22670123484')
    screen.submit()
    await flush()
    screen.fill('111111')
    screen.submit()
    await flush()
    expect(screen.posts[1]).toEqual({ action: 'verify', code: '111111' })
    expect(screen.digits).toBe('111111')
    expect(screen.digitsLocked).toBe(true)
    expect(screen.successHidden).toBe(false)
    expect(screen.submitDisabled).toBe(true)
    expect(screen.submitLabel).toBe('Confirmer le code scellé')
    screen.submit()
    await flush()
    expect(screen.posts).toHaveLength(2)
    expect(screen.digits).toBe('111111')
    expect(screen.modifyHidden).toBe(true)
    screen.modify('+33612345678')
    screen.resend()
    await flush()
    expect(screen.posts).toHaveLength(2)
    expect(screen.resendDisabled).toBe(true)
  })

  it('opens code entry from a live pending read', async () => {
    const expires = new Date(Date.now() + 10 * 60 * 1000 - 15 * 1000).toISOString()
    const screen = await runScreen(async () => ({ status: 500 }), {
      read: { status: 'pending', expires_at: expires, phone_masked: '+226 70 •• •• 84' },
    })
    expect(screen.posts).toEqual([])
    expect(screen.codeHidden).toBe(false)
    expect(screen.sentHidden).toBe(false)
    expect(screen.phoneHidden).toBe(true)
    expect(screen.mask).toBe('+226 70 •• •• 84')
    expect(screen.errorHidden).toBe(true)
    expect(screen.successHidden).toBe(true)
    expect(screen.cooldowns).toEqual([45])
  })

  it('shows the expired banner when the pending code is already past', async () => {
    const screen = await runScreen(async () => ({ status: 201 }), {
      read: {
        status: 'pending',
        expires_at: new Date(Date.now() - 1000).toISOString(),
        phone_masked: '+226 70 •• •• 84',
      },
    })
    expect(screen.errorHidden).toBe(false)
    expect(screen.errorText).toBe(VERIFY_FAILED)
    expect(screen.codeHidden).toBe(false)
    expect(screen.resendHidden).toBe(false)
    expect(screen.modifyHidden).toBe(false)
    expect(screen.submitDisabled).toBe(true)
    screen.fill('123456')
    screen.submit()
    await flush()
    expect(screen.posts).toEqual([])
  })

  it('shows only the granted state from the status read', async () => {
    const screen = await runScreen(async () => ({ status: 500 }), {
      read: {
        status: 'granted',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        phone_masked: '+226 70 •• •• 84',
      },
    })
    expect(screen.successHidden).toBe(false)
    expect(screen.errorHidden).toBe(true)
    expect(screen.phoneHidden).toBe(true)
    expect(screen.modifyHidden).toBe(true)
    expect(screen.digits).toBe('')
    expect(screen.digitsLocked).toBe(true)
    expect(screen.submitLabel).toBe('Confirmer le code scellé')
    expect(screen.submitDisabled).toBe(true)
    expect(screen.mask).toBe('+226 70 •• •• 84')
    screen.resend()
    screen.submit()
    await flush()
    expect(screen.posts).toEqual([])
  })

  it('sends an anonymous visitor to login and does not reveal a code state', async () => {
    const screen = await runScreen(async () => ({ status: 201 }), { readStatus: 401 })
    expect(screen.assigned).toEqual(['/auth?mode=login'])
    expect(screen.codeHidden).toBe(true)
    expect(screen.errorHidden).toBe(true)
    expect(screen.successHidden).toBe(true)
    expect(screen.mask).toBe('')
    expect(screen.posts).toEqual([])
  })

  it('opens the number field on resend when the status read did not return the full number', async () => {
    const screen = await runScreen(async () => ({ status: 201 }), {
      read: {
        status: 'pending',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        phone_masked: '+226 70 •• •• 84',
      },
    })
    screen.resend()
    await flush()
    expect(screen.posts).toEqual([])
    expect(screen.phoneHidden).toBe(false)
    expect(screen.codeHidden).toBe(false)
    expect(screen.mask).toBe('+226 70 •• •• 84')
  })

  it('sends a signed-out send back to login', async () => {
    const screen = await runScreen(async () => ({
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHENTICATED' } }),
    }))
    screen.setPhone('+22670123484')
    screen.submit()
    await flush()
    expect(screen.posts).toEqual([{ action: 'send', phone_e164: '+22670123484' }])
    expect(screen.assigned).toEqual(['/auth?mode=login'])
    expect(screen.codeHidden).toBe(true)
  })

  it('uses a granted status read when a send returns the cooldown body', async () => {
    let reads = 0
    const screen = await runScreen(async () => ({ status: 200, json: async () => ({ expires_at: new Date().toISOString() }) }), {
      read: () => {
        reads += 1
        if (reads === 1) {
          return { status: 'none' }
        }
        return {
          status: 'granted',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          phone_masked: '+226 70 •• •• 84',
        }
      },
    })
    expect(screen.successHidden).toBe(true)
    expect(screen.codeHidden).toBe(true)
    screen.setPhone('+33612345678')
    screen.submit()
    await flush()
    expect(screen.posts).toEqual([{ action: 'send', phone_e164: '+33612345678' }])
    expect(screen.modifyHidden).toBe(true)
    expect(screen.successHidden).toBe(false)
    expect(screen.mask).toBe('+226 70 •• •• 84')
  })

  it('does not show boxes, an error, or success for a deep link with no code', async () => {
    const screen = await runScreen(async () => ({ status: 201 }))
    expect(screen.reads).toEqual(['/v1/verifications/otp'])
    expect(screen.codeHidden).toBe(true)
    expect(screen.sentHidden).toBe(true)
    expect(screen.resendHidden).toBe(true)
    expect(screen.errorHidden).toBe(true)
    expect(screen.successHidden).toBe(true)
    expect(screen.phoneHidden).toBe(false)
    expect(screen.mask).toBe('')
    expect(screen.posts).toEqual([])
  })
})

function classNames(initial: string) {
  const names = new Set(initial.split(/\s+/).filter(Boolean))
  return {
    contains(name: string) {
      return names.has(name)
    },
    add(name: string) {
      names.add(name)
    },
    remove(name: string) {
      names.delete(name)
    },
  }
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

async function runScreen(
  respond: (
    url: string,
    body: { action?: string; phone_e164?: string; code?: string },
  ) => Promise<{ status: number; json?: () => Promise<unknown> }>,
  options: {
    read?: Record<string, unknown> | (() => Record<string, unknown>)
    readStatus?: number
  } = {},
): Promise<{
  posts: Array<{ action?: string; phone_e164?: string; code?: string }>
  reads: string[]
  cooldowns: number[]
  assigned: string[]
  mask: string
  errorText: string
  errorHidden: boolean
  phoneHidden: boolean
  codeHidden: boolean
  sentHidden: boolean
  resendHidden: boolean
  submitDisabled: boolean
  submitLabel: string
  successHidden: boolean
  digits: string
  digitsLocked: boolean
  resendDisabled: boolean
  cooldownStopped: boolean
  modifyHidden: boolean
  modify: (value: string) => void
  resend: () => void
  submit: () => void
  fill: (code: string) => void
  setPhone: (value: string) => void
}> {
  const html = otpPageHtml(stitch)
  const start = html.lastIndexOf('<script>')
  const source = html.slice(start + '<script>'.length, html.lastIndexOf('</script>'))
  const posts: Array<{ action?: string; phone_e164?: string; code?: string }> = []
  const reads: string[] = []
  const cooldowns: number[] = []
  const assigned: string[] = []
  const inputs = Array.from({ length: 6 }, () => ({ value: '', readOnly: false, classList: classNames('border-danger') }))
  const phoneInput = {
    value: '+226',
    classList: classNames(''),
    focus() {},
    addEventListener() {},
  }
  const phoneMask = {
    textContent: '',
    classList: classNames('hidden'),
  }
  const errorTitle = { textContent: VERIFY_FAILED }
  const errorBanner = {
    classList: classNames('hidden'),
    querySelector() {
      return errorTitle
    },
  }
  const successBanner = { classList: classNames('hidden') }
  const submitBtn = { disabled: false, className: '' }
  const submitLabel = { textContent: 'Envoyer le code par SMS' }
  const resendAction = { disabled: true, className: 'text-disabled font-body-strong cursor-not-allowed transition-colors' }
  const cooldownLabel = { textContent: '' }
  let cooldownStopped = false
  const modifyButton = {
    textContent: 'Modifier le numéro',
    disabled: false,
    hidden: false,
    classList: classNames(''),
    setAttribute(name: string) {
      if (name === 'hidden') {
        this.hidden = true
      }
    },
  }
  function hiddenNode() {
    return { classList: classNames('hidden'), textContent: '' }
  }
  const nodes = new Map<string, unknown>([
    ['otp-phone-input', phoneInput],
    ['otp-phone-mask', phoneMask],
    ['otp-phone-label', hiddenNode()],
    ['otp-sent-copy', hiddenNode()],
    ['otp-sent-row', hiddenNode()],
    ['status-detail', hiddenNode()],
    ['otp-sent-time', hiddenNode()],
    ['otp-code-block', hiddenNode()],
    ['otp-resend-row', hiddenNode()],
    ['error-banner', errorBanner],
    ['success-banner', successBanner],
    ['submit-btn', submitBtn],
    ['submit-btn-text', submitLabel],
    ['resend-action', resendAction],
    ['cooldown-label', cooldownLabel],
  ])
  const phoneLabel = nodes.get('otp-phone-label') as { classList: ReturnType<typeof classNames> }
  phoneLabel.classList.remove('hidden')
  const sandbox = {
    document: {
      getElementById(id: string) {
        return nodes.get(id) ?? null
      },
      querySelectorAll(selector: string) {
        if (selector === '#otp-inputs-wrapper input') {
          return inputs
        }
        if (selector === 'button') {
          return [modifyButton]
        }
        return []
      },
    },
    fetch: async (url: string, init?: { method?: string; body?: string }) => {
      if (!init?.body) {
        reads.push(url)
        return {
          status: options.readStatus ?? 200,
          json: async () => (typeof options.read === 'function' ? options.read() : options.read ?? { status: 'none' }),
        }
      }
      const body = JSON.parse(init.body) as { action?: string; phone_e164?: string; code?: string }
      posts.push(body)
      return respond(url, body)
    },
    location: {
      assign(url: string) {
        assigned.push(url)
      },
    },
    startCooldown(seconds: number) {
      cooldowns.push(seconds)
    },
    stopOtpCooldown() {
      cooldownStopped = true
      resendAction.disabled = true
    },
    Array,
    String,
    Math,
    JSON,
    Date,
    Number,
    window: {} as {
      handleFormSubmit?: (event: { preventDefault: () => void }) => void
      triggerResend?: () => void
      openModifyNumberModal?: () => void
      location?: { assign: (url: string) => void }
      otpGranted?: boolean
      otpPhoneEntry?: boolean
      otpVerifyLocked?: boolean
    },
  }
  sandbox.window = sandbox as unknown as typeof sandbox.window
  runInNewContext(source, sandbox)
  await flush()
  return {
    posts,
    reads,
    cooldowns,
    assigned,
    get mask() {
      return phoneMask.textContent
    },
    get errorText() {
      return errorTitle.textContent
    },
    get errorHidden() {
      return errorBanner.classList.contains('hidden')
    },
    get phoneHidden() {
      return phoneInput.classList.contains('hidden')
    },
    get codeHidden() {
      const block = nodes.get('otp-code-block') as { classList: ReturnType<typeof classNames> }
      return block.classList.contains('hidden')
    },
    get sentHidden() {
      const row = nodes.get('otp-sent-row') as { classList: ReturnType<typeof classNames> }
      return row.classList.contains('hidden')
    },
    get resendHidden() {
      const row = nodes.get('otp-resend-row') as { classList: ReturnType<typeof classNames> }
      return row.classList.contains('hidden')
    },
    get modifyHidden() {
      return modifyButton.hidden === true && modifyButton.disabled === true
    },
    get submitDisabled() {
      return submitBtn.disabled
    },
    get submitLabel() {
      return submitLabel.textContent
    },
    get successHidden() {
      return successBanner.classList.contains('hidden')
    },
    get digits() {
      return inputs.map((input) => input.value).join('')
    },
    get digitsLocked() {
      return inputs.every((input) => input.readOnly === true && input.classList.contains('border-danger') === false)
    },
    get resendDisabled() {
      return resendAction.disabled
    },
    get cooldownStopped() {
      return cooldownStopped
    },
    modify(value: string) {
      const open = sandbox.window.openModifyNumberModal
      if (!open) {
        throw new Error('openModifyNumberModal missing')
      }
      if (phoneInput.classList.contains('hidden')) {
        open()
      }
      phoneInput.value = value
      open()
    },
    resend() {
      const sendAgain = sandbox.window.triggerResend
      if (!sendAgain) {
        throw new Error('triggerResend missing')
      }
      sendAgain()
    },
    submit() {
      const handle = sandbox.window.handleFormSubmit
      if (!handle) {
        throw new Error('handleFormSubmit missing')
      }
      void handle({ preventDefault() {} })
    },
    fill(code: string) {
      code.split('').forEach((digit, index) => {
        const input = inputs[index]
        if (input) {
          input.value = digit
        }
      })
    },
    setPhone(value: string) {
      phoneInput.value = value
    },
  }
}
