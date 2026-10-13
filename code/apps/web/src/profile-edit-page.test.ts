import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { profileHtml } from './v2-pages.js'

function stitch(): string {
  return readFileSync(
    fileURLToPath(new URL('../../../design-stitch/ankanu-v2/11-profile-edit/screen.html', import.meta.url)),
    'utf8',
  )
}

type Listener = (event?: {
  target?: {
    id?: string
    name?: string
    closest?: (selector: string) => { getAttribute: (name: string) => string | null } | null
  }
}) => void

type Control = {
  id: string
  name: string
  value: string
  checked: boolean
  type: string
  textContent: string
  className: string
  style: { width: string; backgroundColor: string }
  classList: {
    contains: (name: string) => boolean
    add: (name: string) => void
    remove: (name: string) => void
    toggle: (name: string, force?: boolean) => void
  }
  listeners: Record<string, Listener[]>
  addEventListener: (type: string, fn: Listener) => void
  closest: (selector: string) => null
}

function control(id: string, extra: Partial<Control> = {}): Control {
  const node = {
    id,
    name: extra.name ?? '',
    value: extra.value ?? '',
    checked: false,
    type: extra.type ?? '',
    textContent: extra.textContent ?? '',
    className: extra.className ?? '',
    style: { width: '', backgroundColor: '' },
    listeners: {} as Record<string, Listener[]>,
    closest: () => null,
  } as Control
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
  node.addEventListener = (type, fn) => {
    node.listeners[type] = node.listeners[type] ?? []
    node.listeners[type].push(fn)
  }
  return node
}

function profileScript(): string {
  const page = profileHtml(stitch())
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
  const source = scripts.find((script) => script.includes("fetch('/v1/me/profile'"))
  if (!source) throw new Error('profile script missing')
  return source
}

const stored = {
  dob: '1990-01-15',
  city: 'ouagadougou',
  country: 'BF',
  origin: 'Plateau-Central',
  education: 'licence',
  profession: 'enseignement',
  marital_status: null,
  polygamy_intent: null,
  madhhab: 'maliki',
  practice: 'assidue',
  life_plans: 'tf:6months\nUnion stable',
  bio_pending: 'Une présentation sobre.',
  bio_live: null,
  completeness: { percent: 100, missing: [] as string[], ready: true },
}

function mount() {
  const ids = [
    'dob',
    'origin',
    'country_residence',
    'city_residence',
    'education',
    'job',
    'intentions',
    'bio',
    'profile-age',
    'profile-meter-percent',
    'profile-meter-fill',
    'profile-meter-missing',
    'profile-save-status',
    'madhhab-block',
  ]
  const byId = new Map<string, Control>(ids.map((id) => [id, control(id)]))
  const banner = control('profile-meter-banner', { className: 'hidden flex items-start gap-3 pt-2' })
  const note = control('profile-meter-note', { className: 'hidden text-xs' })
  const photoNote = control('profile-photo-note', {
    textContent: "Aucun affichage public. Votre image n'est jamais exposée aux regards ouverts ni aux moteurs de recherche.",
  })
  const photoGrid = control('profile-photo-grid') as Control & { innerHTML: string }
  photoGrid.innerHTML = ''
  const photoCap = control('profile-photo-cap', { className: 'hidden text-xs text-deep-navy/70 leading-normal' })
  const photoBlur = control('profile-photo-blur', { type: 'checkbox' })
  const photoRules = control('profile-photo-rules')
  const pin = control('profile-pin', { type: 'checkbox' })
  const photoFile = control('profile-photo-file') as Control & { files: Array<{ name: string }>; click: () => void }
  photoFile.files = []
  photoFile.click = () => {
    photoFile.files = [{ name: 'face.png' }]
  }
  byId.set(banner.id, banner)
  byId.set(note.id, note)
  byId.set(photoNote.id, photoNote)
  byId.set(photoGrid.id, photoGrid)
  byId.set(photoCap.id, photoCap)
  byId.set(photoBlur.id, photoBlur)
  byId.set(photoRules.id, photoRules)
  byId.set(pin.id, pin)
  byId.set(photoFile.id, photoFile)
  const inputs = [
    control('', { name: 'madhhab', value: 'maliki', type: 'radio' }),
    control('', { name: 'religious_practice', value: 'assidue', type: 'radio' }),
    control('', { name: 'marriage_timeframe', value: '6months', type: 'radio' }),
    control('', { name: 'pin', type: 'checkbox' }),
  ]
  const save = control('', { textContent: 'Enregistrer les modifications' })
  const upload = control('', { textContent: 'Mettre à jour la photo' })
  const form = control('profile-form')
  const location = {
    href: '',
    assign(path: string) {
      this.href = path
    },
  }
  const calls: Array<{ url: string; method: string; body?: string }> = []
  let release: (body: typeof stored) => void = () => {}
  const gate = new Promise<typeof stored>((resolve) => {
    release = resolve
  })
  let completeness = stored.completeness
  let rejectMedia = false
  let strike: { message: string; blockedUntil: string } | null = null

  function fetchImpl(url: string, init?: { method?: string; body?: string }) {
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body })
    if (url === '/v1/pin') {
      return Promise.resolve({ ok: true, json: async () => ({ enabled: false }) })
    }
    if (url === '/v1/me/profile' && method === 'GET') {
      return gate.then((body) => ({ ok: true, json: async () => body }))
    }
    if ((method === 'PUT' || method === 'DELETE') && url.indexOf('/v1/media/') === 0) {
      return Promise.resolve({ ok: true, json: async () => ({ photos: [] }) })
    }
    if (method === 'PUT') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ ...JSON.parse(init?.body ?? '{}'), bio_live: null, completeness }),
      })
    }
    if (url === '/v1/me/profile' && method === 'PATCH') {
      const sent = JSON.parse(init?.body ?? '{}') as { photo_blur?: boolean }
      return Promise.resolve({ ok: true, json: async () => ({ ...stored, photo_blur: sent.photo_blur }) })
    }
    if (url === '/v1/media' && method === 'POST') {
      if (strike) {
        return Promise.resolve({
          ok: false,
          json: async () => ({
            error: {
              code: 'RATE_LIMITED',
              message: strike?.message,
              details: { reason: 'photo_strike', blocked_until: strike?.blockedUntil },
              retryable: true,
            },
          }),
        })
      }
      if (rejectMedia) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: { message: 'image : une image JPEG ou PNG est requise.' } }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ moderation_state: 'pending', caption: 'Photo en revue — pas encore publique.' }),
      })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  }

  const documentRef = {
    getElementById(id: string) {
      return byId.get(id) ?? null
    },
    querySelector(selector: string) {
      if (selector === 'form') return form
      if (selector === 'input[type="checkbox"]') return inputs.find((input) => input.type === 'checkbox') ?? null
      const checked = /^input\[name="([^"]+)"\]:checked$/.exec(selector)
      if (!checked) return null
      return inputs.find((input) => input.name === checked[1] && input.checked) ?? null
    },
    querySelectorAll(selector: string) {
      if (selector === 'button') return [save, upload]
      const named = /^input\[name="([^"]+)"\]$/.exec(selector)
      if (!named) return []
      return inputs.filter((input) => input.name === named[1])
    },
  }

  new Function('document', 'window', 'fetch', profileScript())(documentRef, { location }, fetchImpl)

  return {
    byId,
    banner,
    note,
    photoNote,
    photoGrid,
    photoCap,
    photoBlur,
    photoRules,
    pin,
    photoFile,
    inputs,
    save,
    upload,
    location,
    form,
    calls,
    release,
    rejectMedia() {
      rejectMedia = true
    },
    strikeMedia(message: string, blockedUntil: string) {
      strike = { message, blockedUntil }
    },
    setCompleteness(next: typeof stored.completeness) {
      completeness = next
    },
  }
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function fire(form: Control, target: Control): void {
  for (const fn of form.listeners.input ?? []) fn({ target })
}

describe('profile edit load and meter', () => {
  it('hides the whole missing banner until a response names a gap', () => {
    const page = profileHtml(stitch())
    const bannerAt = page.indexOf('id="profile-meter-banner" class="hidden flex items-start gap-3 pt-2"')
    const iconAt = page.indexOf('data-icon="info"')
    expect(bannerAt).toBeGreaterThan(-1)
    expect(iconAt).toBeGreaterThan(bannerAt)
    expect(page.indexOf('id="profile-meter-missing"')).toBeGreaterThan(iconAt)
    expect(page).toContain('if (!profileLoaded) return')
  })

  it('ignores a save before the profile loads and does not paint over edits', async () => {
    const page = mount()
    const dob = page.byId.get('dob')
    const origin = page.byId.get('origin')
    if (!dob || !origin) throw new Error('profile controls missing')
    dob.value = '1992-03-04'
    origin.value = 'Kadiogo'
    fire(page.form, dob)
    fire(page.form, origin)
    await page.save.listeners.click?.[0]?.()
    expect(page.calls.filter((call) => call.method === 'PUT')).toEqual([])

    page.release(stored)
    await flush()

    expect(dob.value).toBe('1992-03-04')
    expect(origin.value).toBe('Kadiogo')
    expect(page.byId.get('city_residence')?.value).toBe('ouagadougou')
    expect(page.byId.get('country_residence')?.value).toBe('BF')
    expect(page.byId.get('education')?.value).toBe('licence')
    expect(page.byId.get('job')?.value).toBe('enseignement')
    expect(page.byId.get('bio')?.value).toBe('Une présentation sobre.')
    expect(page.byId.get('intentions')?.value).toBe('Union stable')
    expect(page.inputs.find((input) => input.name === 'madhhab')?.checked).toBe(true)
    expect(page.banner.classList.contains('hidden')).toBe(true)
    expect(page.byId.get('profile-meter-missing')?.textContent).toBe('')
    expect(page.note.classList.contains('hidden')).toBe(true)
    expect(page.byId.get('profile-meter-fill')?.style.backgroundColor).toBe('#C9A86C')

    await page.save.listeners.click?.[0]?.()
    await flush()
    const put = page.calls.find((call) => call.method === 'PUT')
    expect(JSON.parse(put?.body ?? '{}')).toMatchObject({
      dob: '1992-03-04',
      origin: 'Kadiogo',
      city: 'ouagadougou',
      country: 'BF',
      profession: 'enseignement',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
      bio_pending: 'Une présentation sobre.',
    })

    page.setCompleteness({ percent: 67, missing: ['madhhab'], ready: false })
    await page.save.listeners.click?.[0]?.()
    await flush()
    expect(page.banner.classList.contains('hidden')).toBe(false)
    expect(page.note.classList.contains('hidden')).toBe(false)
    expect(page.byId.get('profile-meter-missing')?.textContent).toBe('« Il manque : madhhab »')
    expect(page.byId.get('profile-meter-fill')?.style.backgroundColor).toBe('')
  })

  it('keeps the stored delay when only the intentions text is edited early', async () => {
    const page = mount()
    const intentions = page.byId.get('intentions')
    if (!intentions) throw new Error('intentions missing')
    intentions.value = 'Texte saisi'
    fire(page.form, intentions)
    page.release(stored)
    await flush()
    expect(intentions.value).toBe('Texte saisi')
    expect(page.inputs.find((input) => input.name === 'marriage_timeframe')?.checked).toBe(true)
    await page.save.listeners.click?.[0]?.()
    await flush()
    const put = page.calls.find((call) => call.method === 'PUT')
    expect(JSON.parse(put?.body ?? '{}').life_plans).toBe('tf:6months\nTexte saisi')
  })

  it('shows the banner without the madhhab helper when another criterion is missing', async () => {
    const page = mount()
    page.release({
      ...stored,
      completeness: { percent: 67, missing: ['pratique'], ready: false },
    })
    await flush()
    expect(page.banner.classList.contains('hidden')).toBe(false)
    expect(page.note.classList.contains('hidden')).toBe(true)
    expect(page.byId.get('profile-meter-missing')?.textContent).toBe('« Il manque : pratique »')
  })

  it('uploads a profile photo and shows the pending tile without sample faces', async () => {
    const html = profileHtml(stitch())
    expect(html).toContain('id="profile-photo-file"')
    expect(html).toContain('id="profile-photo-grid"')
    expect(html).toContain('id="profile-photo-blur"')
    expect(html).toContain("fetch('/v1/media'")
    expect(html).toContain('Ajouter une photo')
    expect(html).toContain('Activer le flou protecteur')
    expect(html).toContain('id="profile-photo-rules"')
    expect(html).toContain("location.assign('/photo-rules')")
    expect(html).toContain('Consignes de pudeur')
    expect(html).toContain('Aucun affichage public')
    expect(html).not.toContain('Mettre à jour la photo')
    expect(html).not.toContain('googleusercontent')
    expect(html).not.toContain('original_key')
    expect(html).not.toContain('filter:blur')
    expect(html).not.toContain('filter: blur')

    const page = mount()
    expect(page.photoNote.textContent).toContain('Aucun affichage public')
    page.release({
      ...stored,
      photo_blur: true,
      photo: { id: 'pend', moderation_state: 'pending', caption: 'Photo en revue — pas encore publique.' },
    })
    await flush()
    expect(page.photoNote.textContent).toContain('Aucun affichage public')
    expect(page.photoGrid.innerHTML).toContain('En revue')
    expect(page.photoGrid.innerHTML).toContain('Photographie de profil')
    expect(page.photoGrid.innerHTML).not.toContain('pas encore publique')
    expect(page.photoBlur.checked).toBe(true)
    expect(page.photoNote.style.backgroundColor).toBe('')

    await page.photoGrid.listeners.click?.[0]?.({
      target: { closest: (selector: string) => (selector === '#profile-photo-add' ? { getAttribute: () => null } : null) },
    })
    expect(page.photoFile.files).toEqual([{ name: 'face.png' }])
    page.photoFile.value = 'C:\\fakepath\\face.png'
    const previousReader = globalThis.FileReader
    class FakeReader {
      result = 'data:image/png;base64,QUJD'
      onload: (() => void) | null = null
      readAsDataURL(): void {
        this.onload?.()
      }
    }
    globalThis.FileReader = FakeReader as unknown as typeof FileReader
    try {
      await page.photoFile.listeners.change?.[0]?.()
      await flush()
    } finally {
      globalThis.FileReader = previousReader
    }
    const post = page.calls.find((call) => call.url === '/v1/media')
    expect(post?.method).toBe('POST')
    expect(JSON.parse(post?.body ?? '{}')).toEqual({ kind: 'profile_photo', image: 'QUJD' })
    expect(page.location.href).toBe('/profile-review')
    expect(page.photoFile.value).toBe('')
    expect(page.photoCap.classList.contains('hidden')).toBe(true)
  })

  it('stays on screen 11 when a live photo has a pending replacement', async () => {
    const html = profileHtml(stitch())
    expect(html).toContain('id="profile-photo-grid"')
    expect(html).not.toContain('id="profile-photo-review"')
    const page = mount()
    page.release({
      ...stored,
      review_sla_hours: 24,
      photo: { id: 'live', moderation_state: 'live', is_main: true, url: '/v1/media/get?token=live' },
      pending_photo: { id: 'pend', moderation_state: 'pending' },
    })
    await flush()
    expect(page.photoNote.textContent).toContain('Aucun affichage public')
    expect(page.photoGrid.innerHTML).toContain('Principale')
    expect(page.photoGrid.innerHTML).toContain('Photographie de profil')
    expect(page.photoGrid.innerHTML).toContain('En revue')
    expect(page.photoGrid.innerHTML).toContain('photo_camera')
    expect(page.photoGrid.innerHTML).toContain('Ajouter une photo')
    expect(page.photoGrid.innerHTML).not.toContain('Délai habituel de modération')
    expect(page.photoGrid.innerHTML).not.toContain('pas encore publique')
    expect(page.photoGrid.innerHTML).not.toContain('en cours de revue')
    expect(page.photoGrid.innerHTML).not.toContain('data-photo-remove="pend"')
    expect(page.location.href).toBe('')

    await page.photoGrid.listeners.click?.[0]?.({
      target: { closest: (selector: string) => (selector === '#profile-photo-add' ? { getAttribute: () => null } : null) },
    })
    page.photoFile.value = 'C:\\fakepath\\face.png'
    const previousReader = globalThis.FileReader
    class FakeReader {
      result = 'data:image/png;base64,QUJD'
      onload: (() => void) | null = null
      readAsDataURL(): void {
        this.onload?.()
      }
    }
    globalThis.FileReader = FakeReader as unknown as typeof FileReader
    try {
      await page.photoFile.listeners.change?.[0]?.()
      await flush()
    } finally {
      globalThis.FileReader = previousReader
    }
    expect(page.location.href).toBe('')
    expect(page.photoGrid.innerHTML).toContain('En revue')
    expect(page.photoNote.textContent).toContain('Aucun affichage public')
  })

  it('clears the file input when the upload is rejected or the reader fails', async () => {
    const rejected = mount()
    rejected.rejectMedia()
    rejected.photoFile.value = 'C:\\fakepath\\not-a-photo.png'
    rejected.photoFile.files = [{ name: 'not-a-photo.png' }]
    const previousReader = globalThis.FileReader
    class FakeReader {
      result = 'data:image/png;base64,QUJD'
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL(): void {
        this.onload?.()
      }
    }
    globalThis.FileReader = FakeReader as unknown as typeof FileReader
    try {
      await rejected.photoFile.listeners.change?.[0]?.()
      await flush()
    } finally {
      globalThis.FileReader = previousReader
    }
    expect(rejected.photoFile.value).toBe('')
    expect(rejected.location.href).toBe('')
    expect(rejected.byId.get('profile-save-status')?.textContent).toBe('image : une image JPEG ou PNG est requise.')

    const failed = mount()
    failed.photoFile.value = 'C:\\fakepath\\not-a-photo.png'
    failed.photoFile.files = [{ name: 'not-a-photo.png' }]
    class ErrorReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL(): void {
        this.onerror?.()
      }
    }
    globalThis.FileReader = ErrorReader as unknown as typeof FileReader
    try {
      await failed.photoFile.listeners.change?.[0]?.()
    } finally {
      globalThis.FileReader = previousReader
    }
    expect(failed.photoFile.value).toBe('')
    expect(failed.calls.filter((call) => call.url === '/v1/media')).toEqual([])
    expect(failed.byId.get('profile-save-status')?.textContent).toBe('Envoi de la photo impossible.')
  })

  it('shows the photo-strike sentence on the existing status line after a refused upload', async () => {
    const page = profileHtml(stitch())
    expect(page).toContain('Ajouter une photo')
    expect(page).not.toContain('photo-strike')
    expect(page).toContain('id="profile-save-status" class="hidden w-full min-w-0 max-w-full whitespace-normal break-words text-xs text-deep-navy"')
    expect(profileScript()).toContain('match(/(\\d+)/)')

    const blockedUntil = '2026-10-14T18:05:00.000Z'
    const until = new Date(blockedUntil)
    const two = (value: number) => String(value).padStart(2, '0')
    const sentence = `Envoi de photos suspendu jusqu'au ${two(until.getDate())}/${two(until.getMonth() + 1)} à ${two(until.getHours())}:${two(until.getMinutes())} : 3 photos ont été refusées.`
    const struck = mount()
    struck.strikeMedia('Envoi de photos suspendu : 3 photos ont été refusées.', blockedUntil)
    struck.photoFile.value = 'C:\\fakepath\\face.png'
    struck.photoFile.files = [{ name: 'face.png' }]
    const previousReader = globalThis.FileReader
    class FakeReader {
      result = 'data:image/png;base64,QUJD'
      onload: (() => void) | null = null
      readAsDataURL(): void {
        this.onload?.()
      }
    }
    globalThis.FileReader = FakeReader as unknown as typeof FileReader
    try {
      await struck.photoFile.listeners.change?.[0]?.()
      await flush()
    } finally {
      globalThis.FileReader = previousReader
    }
    expect(struck.photoFile.value).toBe('')
    expect(struck.location.href).toBe('')
    expect(struck.byId.get('profile-save-status')?.textContent).toBe(sentence)
    expect(profileScript()).toContain('Ajouter une photo')

    const raw = mount()
    raw.strikeMedia('Envoi de photos suspendu : 3 photos ont été refusées.', 'pas-une-date')
    raw.photoFile.value = 'C:\\fakepath\\face.png'
    raw.photoFile.files = [{ name: 'face.png' }]
    globalThis.FileReader = FakeReader as unknown as typeof FileReader
    try {
      await raw.photoFile.listeners.change?.[0]?.()
      await flush()
    } finally {
      globalThis.FileReader = previousReader
    }
    expect(raw.byId.get('profile-save-status')?.textContent).toBe('Envoi de photos suspendu : 3 photos ont été refusées.')
  })

  it('switches the main photo, removes a live photo, and saves the one blur setting', async () => {
    const page = mount()
    const photos = [
      { id: 'main', moderation_state: 'live', is_main: true, url: '/v1/media/get?token=main' },
      { id: 'other', moderation_state: 'live', is_main: false, url: '/v1/media/get?token=other' },
    ]
    page.release({ ...stored, photo_blur: true, photos, photo: photos[0] })
    await flush()
    expect(page.photoGrid.innerHTML).toContain('Principale')
    expect(page.photoGrid.innerHTML).toContain('Définir comme principale')
    expect(page.photoGrid.innerHTML).toContain('data-photo-remove="other"')
    expect(page.photoGrid.innerHTML).not.toContain('data-photo-remove="main"')
    expect(page.photoCap.classList.contains('hidden')).toBe(true)

    await page.photoGrid.listeners.click?.[0]?.({
      target: {
        closest(selector: string) {
          if (selector === '[data-photo-main]') return { getAttribute: () => 'other' }
          return null
        },
      },
    })
    await flush()
    expect(page.calls.some((call) => call.method === 'PUT' && call.url === '/v1/media/other/main')).toBe(true)

    await page.photoGrid.listeners.click?.[0]?.({
      target: {
        closest(selector: string) {
          if (selector === '[data-photo-remove]') return { getAttribute: () => 'other' }
          return null
        },
      },
    })
    await flush()
    expect(page.calls.some((call) => call.method === 'DELETE' && call.url === '/v1/media/other')).toBe(true)

    page.photoBlur.checked = false
    await page.photoBlur.listeners.change?.[0]?.()
    await flush()
    const patch = page.calls.find((call) => call.method === 'PATCH')
    expect(JSON.parse(patch?.body ?? '{}')).toEqual({ photo_blur: false })
    expect(page.photoBlur.checked).toBe(false)
  })

  it('hides the add tile and shows the six-photo line when the cap is reached', async () => {
    const html = profileHtml(stitch())
    expect(html).toContain('id="profile-photo-cap" class="hidden text-xs text-deep-navy/70 leading-normal"')
    expect(html).toContain('6 photos maximum. Retirez une photo pour en ajouter une autre.')
    const page = mount()
    const photos = Array.from({ length: 6 }, (_, index) => ({
      id: `p${index}`,
      moderation_state: index === 5 ? 'pending' : 'live',
      is_main: index === 0,
      url: `/v1/media/get?token=${index}`,
    }))
    page.release({ ...stored, photos, photo: photos[0] })
    await flush()
    expect(page.photoGrid.innerHTML).not.toContain('Ajouter une photo')
    expect(page.photoGrid.innerHTML).not.toContain('data-photo-remove="p0"')
    expect(page.photoGrid.innerHTML).toContain('data-photo-remove="p1"')
    expect(page.photoGrid.innerHTML).toContain('En revue')
    expect(page.photoCap.classList.contains('hidden')).toBe(false)
  })

  it('opens pin setup when the access code is turned on', async () => {
    const html = profileHtml(stitch())
    expect(html).toContain('id="profile-pin"')
    expect(html).toContain("Activer le code PIN d'accès")
    const page = mount()
    await flush()
    expect(page.calls.some((call) => call.method === 'GET' && call.url === '/v1/pin')).toBe(true)
    expect(page.pin.checked).toBe(false)
    page.pin.checked = true
    page.pin.listeners.change?.[0]?.()
    expect(page.location.href).toBe('/pin')
    expect(page.calls.some((call) => call.method === 'PATCH')).toBe(false)
  })

  it('opens the photo rules page from consignes de pudeur', () => {
    const page = mount()
    page.photoRules.listeners.click?.[0]?.()
    expect(page.location.href).toBe('/photo-rules')
  })
})
