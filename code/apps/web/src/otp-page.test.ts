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
    expect(page).toContain('Code invalide ou expiré')
    expect(page).toContain('Niveau téléphonique accordé (Phone level granted)')
    expect(page).toContain('Hébergement souverain certifié Scaleway')
    const added = page.slice(page.lastIndexOf('<script>'))
    expect(added).toContain("fetch('/v1/verifications/otp'")
    expect(added).toContain("action: 'send'")
    expect(added).toContain("action: 'verify'")
    expect(added).toContain('startCooldown(60)')
    expect(added).not.toContain("code === '123456'")
    expect(maskE164('+22670123484')).toBe('+226 70 •• •• 84')
  })

  it('sends the normalized number and verifies the six digits', async () => {
    const screen = await runScreen(async (_url, body) => {
      const action = body.action
      return { status: action === 'verify' ? 200 : 201 }
    })
    screen.modify()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls).toEqual([
      { action: 'send', phone_e164: '+22670123484' },
    ])
    expect(screen.states).toEqual(['sent'])
    expect(screen.cooldowns).toEqual([60])
    expect(screen.alerts).toEqual([
      'Numéro enregistré avec succès. Un nouveau code à 6 chiffres a été ordonnancé.',
    ])
    expect(screen.mask).toBe('+226 70 •• •• 84')

    screen.fill('840192')
    screen.submit()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.calls[1]).toEqual({ action: 'verify', code: '840192' })
    expect(screen.states).toEqual(['sent', 'success'])
  })

  it('shows the error state for a rejected code and waits 60 seconds', async () => {
    const screen = await runScreen(async () => ({ status: 400 }))
    screen.fill('111111')
    screen.submit()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.states).toEqual(['error'])
    expect(screen.cooldowns).toEqual([60])
  })
})

async function runScreen(
  respond: (url: string, body: { action?: string; phone_e164?: string; code?: string }) => Promise<{ status: number }>,
): Promise<{
  calls: Array<{ action?: string; phone_e164?: string; code?: string }>
  states: string[]
  cooldowns: number[]
  alerts: string[]
  mask: string
  modify: () => void
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
  const inputs = Array.from({ length: 6 }, () => ({ value: '' }))
  const phoneNode = { textContent: '+226 70 •• •• 84' }
  const sandbox = {
    document: {
      querySelectorAll(selector: string) {
        if (selector === '#otp-inputs-wrapper input') {
          return inputs
        }
        if (selector === 'span') {
          return [phoneNode]
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
    prompt() {
      return '+226 70 12 34 84'
    },
    setScreenState(state: string) {
      states.push(state)
    },
    startCooldown(seconds: number) {
      cooldowns.push(seconds)
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
      return phoneNode.textContent
    },
    modify() {
      const open = sandbox.window.openModifyNumberModal
      if (!open) {
        throw new Error('openModifyNumberModal missing')
      }
      open()
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
