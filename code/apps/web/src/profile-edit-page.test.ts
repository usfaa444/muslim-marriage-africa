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

type Listener = (event?: { target?: { id?: string; name?: string } }) => void

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
  const photoNote = control('profile-photo-note', { textContent: 'Aucun affichage public.' })
  const photoFile = control('profile-photo-file') as Control & { files: Array<{ name: string }>; click: () => void }
  photoFile.files = []
  photoFile.click = () => {
    photoFile.files = [{ name: 'face.png' }]
  }
  byId.set(banner.id, banner)
  byId.set(note.id, note)
  byId.set(photoNote.id, photoNote)
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
  const location = { href: '' }
  const calls: Array<{ url: string; method: string; body?: string }> = []
  let release: (body: typeof stored) => void = () => {}
  const gate = new Promise<typeof stored>((resolve) => {
    release = resolve
  })
  let completeness = stored.completeness

  function fetchImpl(url: string, init?: { method?: string; body?: string }) {
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body })
    if (url === '/v1/pin') {
      return Promise.resolve({ ok: true, json: async () => ({ enabled: false }) })
    }
    if (url === '/v1/me/profile' && method === 'GET') {
      return gate.then((body) => ({ ok: true, json: async () => body }))
    }
    if (method === 'PUT') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ ...JSON.parse(init?.body ?? '{}'), bio_live: null, completeness }),
      })
    }
    if (url === '/v1/media' && method === 'POST') {
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
    photoFile,
    inputs,
    save,
    upload,
    location,
    form,
    calls,
    release,
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

  it('uploads a profile photo and shows the pending caption without blurring the original in css', async () => {
    const html = profileHtml(stitch())
    expect(html).toContain('id="profile-photo-file"')
    expect(html).toContain("fetch('/v1/media'")
    expect(html).toContain('Mettre à jour la photo')
    expect(html).toContain('Consignes de pudeur')
    expect(html).not.toContain('original_key')
    expect(html).not.toContain('filter:blur')
    expect(html).not.toContain('filter: blur')

    const page = mount()
    expect(page.photoNote.textContent).toBe('Aucun affichage public.')
    page.release({
      ...stored,
      photo: { moderation_state: 'pending', caption: 'Photo en revue — pas encore publique.' },
    })
    await flush()
    expect(page.photoNote.textContent).toBe('Photo en revue — pas encore publique.')
    expect(page.photoNote.style.backgroundColor).toBe('')

    await page.upload.listeners.click?.[0]?.()
    expect(page.photoFile.files).toEqual([{ name: 'face.png' }])
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
  })
})
