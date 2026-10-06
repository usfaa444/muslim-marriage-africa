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

describe('otp screen', () => {
  it('keeps the downloaded screen and posts send and verify', () => {
    expect(page).toContain('Vérification du Numéro de Téléphone')
    expect(page).toContain('id="otp-0"')
    expect(page).toContain('id="otp-5"')
    expect(page).toContain('Confirmer le code scellé')
    expect(page).toContain('Renvoyer le code par SMS')
    expect(page).toContain('>58<')
    expect(page).toContain('+226 70 •• •• 84')
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
    expect(added).toContain("action: 'send'")
    expect(added).toContain("action: 'verify'")
    expect(added).toContain('startCooldown(60)')
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
    expect(added).not.toContain("setScreenState('success')")
    expect(stitch).toContain('btn-state-default')
    expect(stitch).toContain("Accéder à l'étape Wali")
    expect(maskE164('+22670123484')).toBe('+226 70 •• •• 84')
  })

  it('sends the normalized number and verifies the six digits', async () => {
    const screen = await runScreen(async (_url, body) => {
      const action = body.action
      return {
        status: action === 'verify' ? 200 : 201,
        json: async () => (action === 'verify' ? { status: 'granted' } : {}),
      }
    })
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls).toEqual([
      { action: 'send', phone_e164: '+22670123484' },
    ])
    expect(screen.states).toEqual(['sent'])
    expect(screen.cooldowns).toEqual([60])
    expect(screen.alerts).toEqual([])
    expect(screen.mask).toBe('+226 70 •• •• 84')
    expect(screen.phoneHidden).toBe(true)

    screen.fill('222222')
    screen.submit()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls[1]).toEqual({ action: 'verify', code: '222222' })
    expect(screen.states).toEqual(['sent'])
    expect(screen.digits).toBe('222222')
    expect(screen.digitsLocked).toBe(true)
    expect(screen.successHidden).toBe(false)
    expect(screen.submitDisabled).toBe(true)
    expect(screen.submitLabel).toBe('Confirmer le code scellé')
    expect(screen.modifyHidden).toBe(true)
    expect(screen.resendDisabled).toBe(true)
    expect(screen.cooldownStopped).toBe(true)
  })

  it('shows the error state for a rejected code and waits 60 seconds', async () => {
    const screen = await runScreen(async () => ({ status: 400 }))
    screen.fill('111111')
    screen.submit()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.states).toEqual(['error'])
    expect(screen.cooldowns).toEqual([60])
    expect(screen.submitDisabled).toBe(false)
    screen.fill('222222')
    screen.submit()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls).toHaveLength(2)
  })

  it('keeps the mask and the resend number when a send is inside the wait', async () => {
    const screen = await runScreen(
      async (_url, body) => ({ status: body.phone_e164 === '+22670999999' ? 200 : 201 }),
      ['+226 70 12 34 84', '+226 70 99 99 99'],
    )
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls.slice(0, 2)).toEqual([
      { action: 'send', phone_e164: '+22670123484' },
      { action: 'send', phone_e164: '+22670999999' },
    ])
    expect(screen.alerts).toHaveLength(0)
    expect(screen.mask).toBe('+226 70 •• •• 84')
    expect(screen.states).toEqual(['sent'])
    screen.resend()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls[2]).toEqual({ action: 'send', phone_e164: '+22670123484' })
  })

  it('does not verify the specimen after the code is granted', async () => {
    const screen = await runScreen(async (_url, body) => ({
      status: body.action === 'verify' ? 200 : 201,
      json: async () => (body.action === 'verify' ? { status: 'granted' } : {}),
    }))
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    screen.fill('111111')
    screen.submit()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls[1]).toEqual({ action: 'verify', code: '111111' })
    expect(screen.states).toEqual(['sent'])
    expect(screen.digits).toBe('111111')
    expect(screen.digitsLocked).toBe(true)
    expect(screen.successHidden).toBe(false)
    expect(screen.submitDisabled).toBe(true)
    expect(screen.submitLabel).toBe('Confirmer le code scellé')
    screen.submit()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls).toHaveLength(2)
    expect(screen.states).toEqual(['sent'])
    expect(screen.digits).toBe('111111')
    expect(screen.modifyHidden).toBe(true)
    screen.modify()
    screen.resend()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls).toHaveLength(2)
    expect(screen.states).toEqual(['sent'])
    expect(screen.digits).toBe('111111')
    expect(screen.resendDisabled).toBe(true)
  })

  it('shows a rejected send on the page and accepts another number', async () => {
    let attempt = 0
    const screen = await runScreen(async () => {
      attempt += 1
      if (attempt === 1) {
        return {
          status: 400,
          json: async () => ({ error: { message: 'phone_e164 : un numéro E.164 est requis.' } }),
        }
      }
      return { status: 201 }
    }, ['+226 70 12 34 84', '+226 70 12 34 84'])
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.states).toEqual([])
    expect(screen.errorText).toBe('phone_e164 : un numéro E.164 est requis.')
    expect(screen.phoneHidden).toBe(false)
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls[1]).toEqual({ action: 'send', phone_e164: '+22670123484' })
    expect(screen.states).toEqual(['sent'])
    expect(screen.phoneHidden).toBe(true)
  })

  it('closes an empty number field without posting', async () => {
    const screen = await runScreen(async () => ({ status: 201 }), [''])
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls).toEqual([])
    expect(screen.phoneHidden).toBe(true)
    expect(screen.mask).toBe('+226 70 •• •• 84')
    expect(screen.errorText).toBe('Code invalide ou expiré')
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

async function runScreen(
  respond: (
    url: string,
    body: { action?: string; phone_e164?: string; code?: string },
  ) => Promise<{ status: number; json?: () => Promise<unknown> }>,
  prompts: string[] = ['+226 70 12 34 84'],
): Promise<{
  calls: Array<{ action?: string; phone_e164?: string; code?: string }>
  states: string[]
  cooldowns: number[]
  alerts: string[]
  mask: string
  errorText: string
  phoneHidden: boolean
  submitDisabled: boolean
  submitLabel: string
  successHidden: boolean
  digits: string
  digitsLocked: boolean
  resendDisabled: boolean
  cooldownStopped: boolean
  modifyHidden: boolean
  modify: () => void
  resend: () => void
  submit: () => void
  fill: (code: string) => void
}> {
  const html = otpPageHtml(stitch)
  const start = html.lastIndexOf('<script>')
  const source = html.slice(start + '<script>'.length, html.lastIndexOf('</script>'))
  const calls: Array<{ action?: string; phone_e164?: string; code?: string }> = []
  const states: string[] = []
  const cooldowns: number[] = []
  const alerts: string[] = []
  const inputs = Array.from({ length: 6 }, () => ({ value: '', readOnly: false, classList: classNames('border-danger') }))
  const phoneInput = {
    value: '',
    classList: classNames('hidden'),
    focus() {},
    addEventListener() {},
  }
  const phoneMask = {
    textContent: '+226 70 •• •• 84',
    classList: classNames(''),
  }
  const errorTitle = { textContent: 'Code invalide ou expiré' }
  const errorBanner = {
    classList: classNames('hidden'),
    querySelector() {
      return errorTitle
    },
  }
  const successBanner = { classList: classNames('hidden') }
  const submitBtn = { disabled: true, className: '' }
  const submitLabel = { textContent: 'Confirmer le code scellé' }
  const resendAction = { disabled: true, className: 'text-disabled font-body-strong cursor-not-allowed transition-colors' }
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
  const nodes = new Map<string, unknown>([
    ['otp-phone-input', phoneInput],
    ['otp-phone-mask', phoneMask],
    ['error-banner', errorBanner],
    ['success-banner', successBanner],
    ['submit-btn', submitBtn],
    ['submit-btn-text', submitLabel],
    ['resend-action', resendAction],
  ])
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
    fetch: async (url: string, init?: { body?: string }) => {
      const body = JSON.parse(init?.body ?? '{}') as { action?: string; phone_e164?: string; code?: string }
      calls.push(body)
      return respond(url, body)
    },
    alert(message: string) {
      alerts.push(message)
    },
    setScreenState(state: string) {
      states.push(state)
      if (state === 'success') {
        '840192'.split('').forEach((digit, index) => {
          const input = inputs[index]
          if (input) {
            input.value = digit
          }
        })
      }
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
    window: {} as {
      handleFormSubmit?: (event: { preventDefault: () => void }) => void
      triggerResend?: () => void
      openModifyNumberModal?: () => void
    },
  }
  sandbox.window = sandbox as unknown as typeof sandbox.window
  runInNewContext(source, sandbox)
  return {
    calls,
    states,
    cooldowns,
    alerts,
    get mask() {
      return phoneMask.textContent
    },
    get errorText() {
      return errorTitle.textContent
    },
    get phoneHidden() {
      return phoneInput.classList.contains('hidden')
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
    modify() {
      const open = sandbox.window.openModifyNumberModal
      if (!open) {
        throw new Error('openModifyNumberModal missing')
      }
      if (phoneInput.classList.contains('hidden')) {
        open()
      }
      phoneInput.value = prompts.shift() ?? ''
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
  }
}
