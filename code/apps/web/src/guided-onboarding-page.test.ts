import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { GET as getOnboarding } from '../app/onboarding/route.js'
import { GET as getPhotoRules } from '../app/photo-rules/route.js'
import { audioPromptAction } from './audio-prompt.js'
import { onboardingPageHtml } from './onboarding-page.js'
import { photoRulesPageHtml } from './photo-rules-page.js'

const onboardingStitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/16-onboarding/screen.html', import.meta.url)),
  'utf8',
)
const photoRulesStitch = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/18-photo-rules/screen.html', import.meta.url)),
  'utf8',
)
const onboarding = onboardingPageHtml(onboardingStitch)
const photoRules = photoRulesPageHtml(photoRulesStitch)

describe('guided onboarding screens', () => {
  it('keeps the onboarding drawing and does not save', () => {
    expect(onboarding).toContain('Constitution du Folio Biographique')
    expect(onboarding).toContain('Requis pour consultation')
    expect(onboarding).toContain('Requis pour envoyer des invitations')
    expect(onboarding).toContain('Il manque : madhhab, intention matrimoniale')
    expect(onboarding).toContain('Découverte en lecture seule')
    expect(onboarding).toContain('Finaliser et débloquer les invitations')
    expect(onboarding).toContain('Mooré (mos)')
    expect(onboarding).toContain('Dioula (dyu)')
    expect(onboarding).toContain('Hébergement souverain chiffré')
    expect(onboarding).not.toContain('dating')
    expect(onboarding).not.toContain('rencontre romantique')
    expect(onboarding).not.toContain('fetch(')
    expect(onboarding).not.toContain('localStorage')
    expect(onboarding).not.toContain('sessionStorage')
    expect(onboarding).not.toContain('indexedDB')
    expect(onboarding).not.toContain('/v1/')
    expect(onboardingStitch).toContain('Mooré (mos)')
  })

  it('serves onboarding as a private page', async () => {
    const response = getOnboarding()
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    const html = await response.text()
    expect(html).toContain('Requis pour consultation')
    expect(html).toContain('minHeight = \'44px\'')
  })

  it('drops the photo-rules hosting line and leaves the rules', () => {
    expect(photoRules).toContain('Exigences pour votre portrait matrimonial')
    expect(photoRules).toContain('id="btn-moore"')
    expect(photoRules).toContain('id="btn-dioula"')
    expect(photoRules).toContain("J'ai compris ces exigences")
    expect(photoRules).toContain('© 2025 AnKanu')
    expect(photoRules).not.toContain('Scaleway')
    expect(photoRules).not.toContain('hébergée souverainement')
    expect(photoRules).not.toContain('Paris')
    expect(photoRules).not.toContain('Île-de-France')
    expect(photoRules).not.toContain('fr-par')
    expect(photoRules).not.toContain('dating')
    expect(photoRules).not.toContain('rencontre romantique')
    expect(photoRules).not.toContain('fetch(')
    expect(photoRules).not.toContain('localStorage')
    expect(photoRules).not.toContain('/v1/')
    expect(photoRulesStitch).toContain('Scaleway Paris')
  })

  it('serves photo rules as a private page', async () => {
    const response = getPhotoRules()
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    const html = await response.text()
    expect(html).not.toContain('Scaleway')
    expect(html).toContain('id="btn-moore"')
  })

  it('plays only when a file is available', () => {
    expect(audioPromptAction({}, 'mos')).toBe('pictogram')
    expect(audioPromptAction({}, 'dyu')).toBe('pictogram')
    expect(audioPromptAction({ mos: 'mos.opus' }, 'mos')).toBe('play')
    expect(audioPromptAction({ mos: 'mos.opus' }, 'dyu')).toBe('pictogram')
  })

  it('keeps the pictograms when no audio file is available', async () => {
    const onboardingClick = await runOnboardingClick()
    expect(onboardingClick.played).toEqual([])
    expect(onboardingClick.mosHeight).toBe('44px')
    expect(onboardingClick.speakerHeight).toBe('44px')
    expect(onboardingClick.prevented).toBe(true)

    const photo = await runPhotoRulesToggle(photoRules)
    expect(photo.played).toEqual([])
    expect(photo.status).toBe('Kẽng n kẽele gom-biisã')
    expect(photo.icon).toBe('play_circle')
    expect(photo.rules).toBe(4)
  })

  it('plays a provided file and returns to the pictograms when playback fails', async () => {
    const page = photoRulesPageHtml(photoRulesStitch, { mos: 'mos.opus' })
    const photo = await runPhotoRulesToggle(page)
    expect(photo.played).toEqual(['mos.opus'])
    expect(photo.status).toBe('Kẽng n kẽele gom-biisã')
    expect(photo.icon).toBe('play_circle')
    expect(photo.rules).toBe(4)
  })
})

type FakeNode = {
  id: string
  textContent: string
  className: string
  style: { minHeight?: string; minWidth?: string }
  onclickAttr: string
  parentElement: FakeNode | null
  children: FakeNode[]
  listeners: Record<string, Array<(event?: { preventDefault: () => void }) => void>>
  classList: { add: (...names: string[]) => void; remove: (...names: string[]) => void }
  getAttribute: (name: string) => string | null
  addEventListener: (name: string, fn: (event?: { preventDefault: () => void }) => void) => void
  querySelectorAll: (selector: string) => FakeNode[]
  closest: (selector: string) => FakeNode | null
}

function node(id: string, text: string, className = ''): FakeNode {
  const created: FakeNode = {
    id,
    textContent: text,
    className,
    style: {},
    onclickAttr: '',
    parentElement: null,
    children: [],
    listeners: {},
    classList: {
      add() {},
      remove() {},
    },
    getAttribute(name: string) {
      return name === 'onclick' ? created.onclickAttr : null
    },
    addEventListener(name: string, fn: (event?: { preventDefault: () => void }) => void) {
      const found = created.listeners[name] ?? []
      found.push(fn)
      created.listeners[name] = found
    },
    querySelectorAll(selector: string) {
      return walk(created).filter((item) => matches(item, selector))
    },
    closest() {
      return created
    },
  }
  return created
}

function walk(root: FakeNode): FakeNode[] {
  return [root, ...root.children.flatMap((child) => walk(child))]
}

function matches(item: FakeNode, selector: string): boolean {
  if (selector === 'button') {
    return item.className.includes('button') || item.onclickAttr.includes('toggleAudio') || item.id.startsWith('btn-')
  }
  if (selector === '.material-symbols-outlined') {
    return item.className.includes('material-symbols-outlined')
  }
  return false
}

function adopt(parent: FakeNode, child: FakeNode): FakeNode {
  child.parentElement = parent
  parent.children.push(child)
  child.closest = () => parent
  return child
}

function scriptsOf(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
}

async function runOnboardingClick(): Promise<{
  played: string[]
  mosHeight: string | undefined
  speakerHeight: string | undefined
  prevented: boolean
}> {
  const played: string[] = []
  const aside = node('aside', '', 'aside')
  const title = adopt(aside, node('audio-guidance-title', 'Guide audio des étapes'))
  title.closest = () => aside
  const speaker = adopt(aside, node('speaker', '', 'w-9 h-9'))
  adopt(speaker, node('volume', 'volume_up', 'material-symbols-outlined'))
  const mos = adopt(aside, node('mos', 'Mooré (mos)', 'button'))
  adopt(aside, node('dyu', 'Dioula (dyu)', 'button'))
  const form = node('form', '', 'form')
  let prevented = false
  const context = {
    document: {
      getElementById: (id: string) => (id === 'audio-guidance-title' ? title : id === 'audio-guide-heading' ? null : null),
      getElementsByTagName: (name: string) => (name === 'form' ? [form] : []),
      querySelectorAll: () => [],
    },
    Audio: class {
      constructor(src: string) {
        played.push(src)
      }
      play() {
        return Promise.resolve()
      }
      pause() {}
      addEventListener() {}
    },
    console,
  }
  for (const source of scriptsOf(onboarding)) {
    runInNewContext(source, context)
  }
  const click = mos.listeners.click?.[0]
  click?.({ preventDefault() {} })
  const submit = form.listeners.submit?.[0]
  submit?.({
    preventDefault() {
      prevented = true
    },
  })
  return {
    played,
    mosHeight: mos.style.minHeight,
    speakerHeight: speaker.style.minHeight,
    prevented,
  }
}

async function runPhotoRulesToggle(html: string): Promise<{
  played: string[]
  status: string
  icon: string
  rules: number
}> {
  const played: string[] = []
  const section = node('audio-section', '', 'section')
  const heading = adopt(section, node('audio-guide-heading', 'Écoute guidée dans nos langues'))
  heading.closest = () => section
  const moore = adopt(section, node('btn-moore', 'Mooré (mos)', 'button'))
  moore.onclickAttr = "toggleAudio('moore')"
  const icon = adopt(moore, node('icon-moore', 'play_circle', 'material-symbols-outlined'))
  const status = adopt(moore, node('status-moore', 'Kẽng n kẽele gom-biisã'))
  const dioula = adopt(section, node('btn-dioula', 'Dioula (dyu)', 'button'))
  dioula.onclickAttr = "toggleAudio('dioula')"
  adopt(dioula, node('icon-dioula', 'play_circle', 'material-symbols-outlined'))
  adopt(dioula, node('status-dioula', 'Ja ladon kulu mɛn'))
  const byId = new Map<string, FakeNode>([
    ['audio-guide-heading', heading],
    ['btn-moore', moore],
    ['btn-dioula', dioula],
    ['icon-moore', icon],
    ['icon-dioula', dioula.children[0] ?? dioula],
    ['status-moore', status],
    ['status-dioula', dioula.children[1] ?? dioula],
  ])
  const context = {
    document: {
      getElementById: (id: string) => byId.get(id) ?? null,
      getElementsByTagName: () => [],
      querySelectorAll: () => [],
    },
    Audio: class {
      listeners: Record<string, Array<() => void>> = {}
      constructor(src: string) {
        played.push(src)
      }
      play() {
        return Promise.reject(new Error('2g'))
      }
      pause() {}
      addEventListener(name: string, fn: () => void) {
        const found = this.listeners[name] ?? []
        found.push(fn)
        this.listeners[name] = found
      }
    },
    console,
  }
  for (const source of scriptsOf(html)) {
    runInNewContext(source, context)
  }
  const toggle = (context as { toggleAudio?: (lang: string) => void }).toggleAudio
  toggle?.('moore')
  await new Promise((resolve) => setTimeout(resolve, 0))
  return {
    played,
    status: status.textContent,
    icon: icon.textContent,
    rules: (html.match(/check_circle/g) ?? []).length,
  }
}
