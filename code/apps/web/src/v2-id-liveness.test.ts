import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { idScript } from './v2-client.js'
import { stripDemoScripts } from './v2-document.js'
import {
  authHtml,
  emailHtml,
  idHtml,
  identityHtml,
  onboardingHtml,
  otpHtml,
  phoneHtml,
  pinHtml,
  pseudonymHtml,
  resetHtml,
  splashHtml,
} from './v2-pages.js'

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
const MISSING_ID = "La pièce d'identité est manquante."
const MISSING_LIVE = 'La photo de présence est manquante.'
const MISSING_BOTH = "La pièce d'identité et la photo de présence sont manquantes."
const CAMERA_REFUSED = 'La caméra a été refusée.'
const NETWORK = 'La connexion a échoué.'

type Listener = (event?: { preventDefault: () => void }) => Promise<void> | void
type JsonResult = { status: number; ok: boolean; json: () => Promise<unknown> }

function classes(initial = '') {
  const node = {
    className: initial,
    classList: {
      add(...tokens: string[]) {
        const parts = new Set(node.className.split(/\s+/).filter(Boolean))
        for (const token of tokens) parts.add(token)
        node.className = [...parts].join(' ')
      },
      remove(...tokens: string[]) {
        const drop = new Set(tokens)
        node.className = node.className
          .split(/\s+/)
          .filter((part) => part && !drop.has(part))
          .join(' ')
      },
      contains(token: string) {
        return node.className.split(/\s+/).includes(token)
      },
    },
  }
  return node
}

function jpegFile(name: string): File {
  return new File([JPEG], name, { type: 'image/jpeg' })
}

type FetchImpl = (url: string, init?: RequestInit) => Promise<JsonResult>

function json(status: number, body: unknown): JsonResult {
  return { status, ok: status >= 200 && status < 300, json: async () => body }
}

const dialogs: string[] = []
const originalAlert = globalThis.alert
const originalConfirm = globalThis.confirm
const originalPrompt = globalThis.prompt

afterEach(() => {
  globalThis.alert = originalAlert
  globalThis.confirm = originalConfirm
  globalThis.prompt = originalPrompt
  dialogs.length = 0
})

function mount(fetchImpl: FetchImpl, camera: { getUserMedia?: () => Promise<unknown> } = {}) {
  globalThis.alert = () => {
    dialogs.push('alert')
  }
  globalThis.confirm = () => {
    dialogs.push('confirm')
    return false
  }
  globalThis.prompt = () => {
    dialogs.push('prompt')
    return null
  }
  const title = { ...classes(''), textContent: 'Document téléversé : CNIB_recto_verso.pdf' }
  const badge = {
    ...classes(''),
    textContent: 'Document conforme & lisible',
    children: [{}, {}],
    attrs: {} as Record<string, string>,
    querySelector() {
      return null
    },
    style: { display: '' },
    setAttribute(name: string, value: string) {
      this.attrs[name] = value
    },
  }
  const error = { ...classes('hidden'), textContent: '' }
  const errorText = { textContent: '' }
  const notice = () => ({ ...classes('hidden'), textContent: '', innerHTML: '' })
  const poseCard = notice()
  const poseLabel = notice()
  const posePicto = notice()
  const countdown = notice()
  const idReject = notice()
  const liveReject = notice()
  const held = notice()
  const listeners: Record<string, Listener> = {}
  function button(text: string) {
    const node = {
      textContent: text,
      disabled: false,
      listeners: {} as Record<string, Listener>,
      addEventListener(type: string, fn: Listener) {
        node.listeners[type] = fn
      },
    }
    return node
  }
  const replace = button('Remplacer')
  const confirm = button('Confirmer et transmettre pour vérification arrow_forward')
  const cameraButton = button('Activer la caméra pour la capture')
  const retakeButton = button('refresh Reprendre la capture')
  const idFile = {
    type: '',
    accept: '',
    className: '',
    files: null as { 0?: File } | null,
    listeners: {} as Record<string, Listener>,
    addEventListener(type: string, fn: Listener) {
      idFile.listeners[type] = fn
    },
    click() {
      listeners.fileClick = () => {}
    },
  }
  const video = {
    className: '',
    muted: false,
    playsInline: false,
    srcObject: null as unknown,
    videoWidth: 4,
    videoHeight: 3,
    setAttribute() {},
    play: async () => {},
    remove() {},
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage() {} }),
    toBlob(resolve: (blob: Blob | null) => void) {
      resolve(new Blob([JPEG], { type: 'image/jpeg' }))
    },
  }
  const assigned: string[] = []
  const documentRef = {
    body: { appendChild() {} },
    getElementById(id: string) {
      if (id === 'doc-title') return title
      if (id === 'id-error') return error
      if (id === 'id-error-text') return errorText
      if (id === 'trigger-cam-btn') return cameraButton
      if (id === 'switch-account') return { addEventListener() {} }
      if (id === 'pose-card') return poseCard
      if (id === 'pose-label') return poseLabel
      if (id === 'pose-picto') return posePicto
      if (id === 'pose-countdown') return countdown
      if (id === 'id-reject') return idReject
      if (id === 'live-reject') return liveReject
      if (id === 'id-held') return held
      return null
    },
    querySelector(selector: string) {
      if (selector === '[data-id-badge]' && badge.attrs['data-id-badge']) return badge
      return null
    },
    querySelectorAll(selector: string) {
      if (selector === 'div') return [badge]
      if (selector === 'button') return [replace, confirm, cameraButton, retakeButton]
      if (selector === 'a') return []
      return []
    },
    createElement(tag: string) {
      if (tag === 'input') return idFile
      if (tag === 'video') return video
      if (tag === 'canvas') return canvas
      throw new Error(`unexpected element ${tag}`)
    },
  }
  const windowRef = {
    location: {
      assign(path: string) {
        assigned.push(path)
      },
    },
  }
  const navigatorRef = {
    mediaDevices: camera.getUserMedia ? { getUserMedia: camera.getUserMedia } : undefined,
  }
  const run = new Function('document', 'window', 'fetch', 'navigator', 'sessionStorage', idScript({ tickMs: 0 }))
  run(documentRef, windowRef, fetchImpl, navigatorRef, {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  })
  return {
    title,
    badge,
    error,
    errorText,
    idFile,
    confirm,
    cameraButton,
    retakeButton,
    assigned,
    dialogs,
    poseCard,
    poseLabel,
    posePicto,
    countdown,
    idReject,
    liveReject,
    held,
  }
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('pseudonym tailwind config', () => {
  it('keeps a config script and still strips a demo script', () => {
    const stripped = stripDemoScripts(
      '<script src="https://cdn.tailwindcss.com"></script><script>\n    tailwind.config = { theme: { extend: { colors: { brand: { cream: \'#F7F1E3\' } } } } }\n  </script><script>window.__stitchDemo = true</script>',
    )
    expect(stripped).toContain('cdn.tailwindcss.com')
    expect(stripped).toContain('tailwind.config')
    expect(stripped).toContain('#F7F1E3')
    expect(stripped).not.toContain('__stitchDemo')

    const withDemo = stitch('54-pseudonym-dob').replace('</head>', '<script>window.__stitchDemo = true</script></head>')
    const page = pseudonymHtml(withDemo)
    expect(page).toContain('tailwind.config')
    expect(page).toContain("cream: '#F7F1E3'")
    expect(page).toContain("card: '#FBF8F1'")
    expect(page).toContain("navy: '#0B1D36'")
    expect(page).toContain("gold: '#C9A86C'")
    expect(page).toContain("border: '#E2D4B8'")
    expect(page).toContain("muted: '#7A7569'")
    expect(page).toContain('Cormorant Garamond')
    expect(page).toContain('bg-brand-cream')
    expect(page).toContain('bg-brand-navy')
    expect(page).toContain('text-brand-cream')
    expect(page).toContain('hover:bg-[#122849]')
    expect(page).toContain('active:bg-[#071324]')
    expect(page).not.toContain('__stitchDemo')
    expect(page).not.toContain('opacity-50')
  })

  it('keeps the cream and navy tokens on every served signup and sign-in step', () => {
    const site = 'site-key'
    const auth = stitch('02-auth')
    const pages = [
      splashHtml(),
      identityHtml(stitch('03-age-gate')),
      pseudonymHtml(stitch('54-pseudonym-dob')),
      authHtml(auth, 'login', site),
      authHtml(auth, 'signup', site),
      emailHtml(stitch('04-email-verification')),
      phoneHtml(stitch('06-otp')),
      otpHtml(stitch('56-otp-alt')),
      idHtml(stitch('07-id-liveness')),
      resetHtml(stitch('05-password-reset')),
      pinHtml(stitch('10-pin-lock')),
      onboardingHtml(stitch('08-onboarding')),
    ]
    for (const page of pages) {
      expect(page).toContain('#F7F1E3')
      expect(page).toContain('#0B1D36')
    }
  })
})

describe('id-liveness confirm', () => {
  function captureFetch(state: {
    id: string
    live: string
    gate: string
    postId?: JsonResult
    postLive?: JsonResult
    failPost?: boolean
    idReason?: string
    liveReason?: string
  }) {
    const calls: Array<{ url: string; method: string; body?: Record<string, unknown> }> = []
    const poses = ['look_left', 'thumbs_up', 'two_fingers']
    let issued = 0
    const fetchImpl: FetchImpl = async (url, init) => {
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
      calls.push({ url, method, ...(body ? { body } : {}) })
      if (method === 'POST' && url === '/v1/verifications/liveness-challenge') {
        const pose = poses[issued % poses.length]
        issued += 1
        return json(201, {
          challenge_id: `challenge-${issued}`,
          pose,
          pose_label: 'libellé serveur',
          expires_at: new Date(Date.now() + 600_000).toISOString(),
        })
      }
      if (state.failPost && method === 'POST') {
        throw new Error('offline')
      }
      if (method === 'POST' && url === '/v1/verifications/id') {
        const result = state.postId ?? json(201, { id: 'id-1', kind: 'id_document', status: 'pending' })
        if (result.ok) state.id = 'pending'
        return result
      }
      if (method === 'POST' && url === '/v1/verifications/liveness') {
        const result = state.postLive ?? json(201, { id: 'live-1', kind: 'liveness', status: 'pending' })
        if (result.ok) state.live = 'pending'
        return result
      }
      if (method === 'GET' && url === '/v1/verifications/id') return json(200, { status: state.id, ...(state.idReason ? { reason: state.idReason } : {}) })
      if (method === 'GET' && url === '/v1/verifications/liveness') return json(200, { status: state.live, ...(state.liveReason ? { reason: state.liveReason } : {}) })
      if (url === '/v1/accounts/gate') return json(200, { step: state.gate })
      return json(500, { error: { message: 'Request failed' } })
    }
    return { calls, fetchImpl }
  }

  async function ready(fetchImpl: FetchImpl, camera?: { getUserMedia?: () => Promise<unknown> }) {
    const page = mount(fetchImpl, camera)
    await settle()
    return page
  }

  async function chooseId(page: ReturnType<typeof mount>, name = 'cnib-recto.jpg') {
    page.idFile.files = { 0: jpegFile(name) }
    page.idFile.listeners.change?.()
  }

  async function takeSelfie(page: ReturnType<typeof mount>) {
    await page.cameraButton.listeners.click?.()
  }

  it('sends a fresh id and selfie, then opens onboarding', async () => {
    const { calls, fetchImpl } = captureFetch({ id: 'none', live: 'none', gate: 'account' })
    const page = await ready(fetchImpl, {
      getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
    })
    await chooseId(page, 'cnib-recto.jpg')
    expect(page.title.textContent).toBe('cnib-recto.jpg')
    await takeSelfie(page)
    const before = calls.length
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.assigned).toEqual(['/onboarding'])
    expect(calls.slice(before).map((call) => `${call.method} ${call.url}`)).toEqual([
      'POST /v1/verifications/id',
      'POST /v1/verifications/liveness',
      'GET /v1/verifications/id',
      'GET /v1/verifications/liveness',
      'GET /v1/accounts/gate',
    ])
    expect(page.error.classList.contains('hidden')).toBe(true)
    expect(dialogs).toEqual([])
  })

  it('opens onboarding in one click when both captures are already pending', async () => {
    const { calls, fetchImpl } = captureFetch({ id: 'pending', live: 'pending', gate: 'account' })
    const page = await ready(fetchImpl)
    expect(page.title.textContent).toBe('Pièce enregistrée')
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.assigned).toEqual(['/onboarding'])
    expect(calls.filter((call) => call.method === 'POST')).toEqual([])
    expect(dialogs).toEqual([])
  })

  it('follows the gate when the server step is not onboarding', async () => {
    const { fetchImpl } = captureFetch({ id: 'granted', live: 'pending', gate: 'phone' })
    const page = await ready(fetchImpl)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.assigned).toEqual(['/phone'])
  })

  it('keeps the page when the id is missing', async () => {
    const { fetchImpl } = captureFetch({ id: 'none', live: 'pending', gate: 'account' })
    const page = await ready(fetchImpl)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.assigned).toEqual([])
    expect(page.errorText.textContent).toBe(MISSING_ID)
    expect(page.error.classList.contains('hidden')).toBe(false)
    expect(page.confirm.disabled).toBe(false)
    expect(dialogs).toEqual([])
  })

  it('keeps the page when the selfie is missing', async () => {
    const { fetchImpl } = captureFetch({ id: 'pending', live: 'none', gate: 'account' })
    const page = await ready(fetchImpl)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.assigned).toEqual([])
    expect(page.errorText.textContent).toBe(MISSING_LIVE)
    expect(dialogs).toEqual([])
  })

  it('names both captures when neither is present', async () => {
    const { calls, fetchImpl } = captureFetch({ id: 'none', live: 'none', gate: 'account' })
    const page = await ready(fetchImpl)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.errorText.textContent).toBe(MISSING_BOTH)
    expect(page.assigned).toEqual([])
    expect(calls.some((call) => call.url === '/v1/accounts/gate')).toBe(false)
  })

  it('shows the server message when the upload fails', async () => {
    const { fetchImpl } = captureFetch({
      id: 'none',
      live: 'none',
      gate: 'account',
      postId: json(400, { error: { message: 'Reprenez la capture.' } }),
    })
    const page = await ready(fetchImpl, {
      getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
    })
    await chooseId(page)
    await takeSelfie(page)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.errorText.textContent).toBe('Reprenez la capture.')
    expect(page.assigned).toEqual([])
    expect(page.confirm.disabled).toBe(false)
    expect(dialogs).toEqual([])
  })

  it('shows a French message when the upload cannot reach the server', async () => {
    const { fetchImpl } = captureFetch({ id: 'none', live: 'none', gate: 'account', failPost: true })
    const page = await ready(fetchImpl)
    await chooseId(page)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.errorText.textContent).toBe(NETWORK)
    expect(page.assigned).toEqual([])
    expect(dialogs).toEqual([])
  })

  it('disables the confirm button only while the request is in flight', async () => {
    let release: () => void = () => {}
    const hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const fetchImpl: FetchImpl = async (url, init) => {
      const method = init?.method ?? 'GET'
      if (method === 'POST') {
        await hold
        return json(400, { error: { message: 'Reprenez la capture.' } })
      }
      if (url === '/v1/verifications/id') return json(200, { status: 'none' })
      if (url === '/v1/verifications/liveness') return json(200, { status: 'none' })
      return json(200, { step: 'account' })
    }
    const page = await ready(fetchImpl)
    await chooseId(page)
    const pending = page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.confirm.disabled).toBe(true)
    release()
    await pending
    expect(page.confirm.disabled).toBe(false)
    expect(dialogs).toEqual([])
  })

  it('asks for a new capture when the stored photo is held and does not open onboarding', async () => {
    const { fetchImpl } = captureFetch({ id: 'held', live: 'pending', gate: 'identity' })
    const page = await ready(fetchImpl)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.assigned).toEqual([])
    expect(page.errorText.textContent).toBe('Reprenez la capture.')
    expect(dialogs).toEqual([])
  })

  it('shows a French message when the camera is refused', async () => {
    const { fetchImpl } = captureFetch({ id: 'none', live: 'none', gate: 'account' })
    const page = await ready(fetchImpl, {
      getUserMedia: async () => {
        const denied = new Error('denied')
        denied.name = 'NotAllowedError'
        throw denied
      },
    })
    await page.cameraButton.listeners.click?.()
    expect(page.errorText.textContent).toBe(CAMERA_REFUSED)
    expect(page.assigned).toEqual([])
    expect(page.confirm.disabled).toBe(false)
    expect(dialogs).toEqual([])
  })

  it('shows a random pose with its pictogram when the selfie step opens, and sends its challenge with the selfie', async () => {
    const { calls, fetchImpl } = captureFetch({ id: 'none', live: 'none', gate: 'account' })
    const page = await ready(fetchImpl, { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) })
    expect(calls.filter((call) => call.method === 'POST').map((call) => call.url)).toEqual(['/v1/verifications/liveness-challenge'])
    expect(page.poseCard.classList.contains('hidden')).toBe(false)
    expect(page.poseLabel.textContent).toBe('Regardez vers la gauche')
    expect(page.posePicto.innerHTML).toContain('<svg')
    await chooseId(page)
    await takeSelfie(page)
    expect(page.countdown.classList.contains('hidden')).toBe(true)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    const selfie = calls.find((call) => call.method === 'POST' && call.url === '/v1/verifications/liveness')
    expect(selfie?.body).toMatchObject({ challenge_id: 'challenge-1' })
    expect(page.assigned).toEqual(['/onboarding'])
  })

  it('asks for no pose when the selfie is already pending', async () => {
    const { calls, fetchImpl } = captureFetch({ id: 'pending', live: 'pending', gate: 'account' })
    const page = await ready(fetchImpl)
    expect(calls.some((call) => call.url === '/v1/verifications/liveness-challenge')).toBe(false)
    expect(page.poseCard.classList.contains('hidden')).toBe(true)
  })

  it('names each refused step with the reason category, gives a new pose, and never mentions payment', async () => {
    const { calls, fetchImpl } = captureFetch({
      id: 'rejected',
      live: 'rejected',
      gate: 'identity',
      idReason: 'unreadable',
      liveReason: 'pose_not_done',
    })
    const page = await ready(fetchImpl)
    expect(page.idReject.classList.contains('hidden')).toBe(false)
    expect(page.idReject.textContent).toBe(
      "Votre pièce d'identité n'a pas été acceptée : la photo de la pièce est illisible. Envoyez une nouvelle photo de votre pièce avec le bouton « Remplacer ».",
    )
    expect(page.liveReject.textContent).toBe(
      "Votre selfie n'a pas été accepté : le geste demandé n'apparaît pas sur le selfie. Reprenez le selfie en faisant le nouveau geste demandé.",
    )
    expect(`${page.idReject.textContent} ${page.liveReject.textContent}`).not.toMatch(/pay|pack|premium|abonnement|prix/i)
    expect(page.poseLabel.textContent).toBe('Regardez vers la gauche')
    await page.retakeButton.listeners.click?.()
    expect(page.poseLabel.textContent, 'Reprendre la capture draws a new pose').toBe('Levez le pouce')
    expect(calls.filter((call) => call.url === '/v1/verifications/liveness-challenge')).toHaveLength(2)
  })

  it('shows the age-hold notice instead of a retake for a held account', async () => {
    const { calls, fetchImpl } = captureFetch({ id: 'held', live: 'held', gate: 'identity' })
    const page = await ready(fetchImpl)
    expect(page.held.classList.contains('hidden')).toBe(false)
    expect(page.idReject.classList.contains('hidden')).toBe(true)
    expect(calls.some((call) => call.url === '/v1/verifications/liveness-challenge')).toBe(false)
  })

  it('draws a new pose and asks for a new selfie when the challenge expired before the upload', async () => {
    const { calls, fetchImpl } = captureFetch({
      id: 'pending',
      live: 'none',
      gate: 'account',
      postLive: json(400, { error: { code: 'VERIFICATION_RETAKE', message: 'Reprenez la capture.', details: { field: 'challenge_id', reason: 'challenge' } } }),
    })
    const page = await ready(fetchImpl, { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) })
    await takeSelfie(page)
    await page.confirm.listeners.click?.({ preventDefault() {} })
    expect(page.errorText.textContent).toBe('Le geste a expiré. Reprenez le selfie avec le nouveau geste.')
    expect(page.poseLabel.textContent).toBe('Levez le pouce')
    expect(calls.filter((call) => call.url === '/v1/verifications/liveness-challenge')).toHaveLength(2)
    expect(page.assigned).toEqual([])
  })

  it('places the pose card, the refusal notices and the live preview box on the served page', () => {
    const page = idHtml(stitch('07-id-liveness'))
    for (const id of ['pose-card', 'pose-label', 'pose-picto', 'pose-countdown', 'id-reject', 'live-reject', 'id-held', 'liveness-viewfinder']) {
      expect(page, id).toContain(`id="${id}"`)
    }
    expect(page.indexOf('id="id-reject"')).toBeLessThan(page.indexOf('id="pose-card"'))
    expect(page.indexOf('id="pose-card"')).toBeLessThan(page.indexOf('id="liveness-viewfinder"'))
  })

  it('puts the error line on the served page and does not call a native dialog', () => {
    const page = idHtml(stitch('07-id-liveness'))
    expect(page).toContain('id="id-error"')
    expect(page).toContain('text-[#9B2C2C]')
    expect(page).toContain('data-icon="error"')
    expect(page).toContain('id="switch-account"')
    expect(page).not.toContain('CNIB_recto_verso.pdf')
    expect(page).not.toMatch(/\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/)
  })
})
