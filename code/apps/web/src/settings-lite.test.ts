import { readFileSync } from 'node:fs'
import { Script, createContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { settingsScript } from './v2-client.js'
import { settingsHtml } from './v2-pages.js'

function stitch(): string {
  return readFileSync(
    fileURLToPath(new URL('../../../design-stitch/ankanu-v2/27-settings/screen.html', import.meta.url)),
    'utf8',
  )
}

function buttonSlice(html: string): string {
  const at = html.indexOf('id="lite-mode-toggle"')
  const start = html.lastIndexOf('<button', at)
  const end = html.indexOf('</button>', at)
  return html.slice(start, end)
}

describe('settings lite switch', () => {
  const html = settingsHtml(stitch())
  const toggle = buttonSlice(html)

  it('keeps the Stitch copy and drops the demo onclick', () => {
    expect(html).toContain('Mode Allégé (Basse consommation)')
    expect(html).toContain('Optimise la consommation des données mobiles (2G/3G) et désactive le préchargement visuel.')
    expect(html).toContain('id="lite-hit"')
    expect(html).toContain('height:44px')
    expect(html).toContain('function liteEnabled()')
    expect(html).toContain('function setLite(on)')
    expect(html).toContain("event.key !== 'ankanu_lite'")
    expect(html).toContain("fetch('/v1/me/export'")
    expect(html).toContain("fetch('/v1/me/delete'")
    expect(html).toContain('Mooré')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('/v1/me/prefs')
    expect(toggle).toContain('aria-checked="false"')
    expect(toggle).toContain('bg-hairline')
    expect(toggle).not.toContain('bg-deep-navy')
    expect(toggle).toContain('h-6 w-11')
    expect(html).toContain('id="lite-mode-thumb"')
    expect(html).toContain('translate-x-0.5')
  })

  it('paints the stored value, ignores a failed write, and follows another tab', () => {
    const store = new Map<string, string>()
    let failWrite = false
    const classes = new Map<string, Set<string>>()
    const made: Array<{ id: string; attrs: Map<string, string>; text: string; click?: (() => void) | undefined }> = []
    function element(id: string, className: string, text = '') {
      const attrs = new Map<string, string>()
      const names = new Set(className.split(/\s+/).filter(Boolean))
      classes.set(id, names)
      const node = {
        id,
        attrs,
        text,
        get textContent() {
          return text
        },
        getAttribute: (key: string) => attrs.get(key) ?? null,
        setAttribute: (key: string, value: string) => {
          attrs.set(key, value)
        },
        classList: {
          toggle(name: string, force: boolean) {
            const set = classes.get(id)
            if (!set) return
            if (force) set.add(name)
            else set.delete(name)
          },
        },
        addEventListener(_type: string, fn: () => void) {
          node.click = fn
        },
        click: undefined as (() => void) | undefined,
      }
      made.push(node)
      return node
    }
    const toggleNode = element(
      'lite-mode-toggle',
      'relative inline-flex h-6 w-11 bg-hairline',
    )
    toggleNode.setAttribute('aria-checked', 'false')
    const thumb = element('lite-mode-thumb', 'translate-x-0.5')
    const download = element('export', '', 'Télécharger mes données')
    let storageHandler = null as ((event: { key: string }) => void) | null
    const context = createContext({
      document: {
        getElementById(id: string) {
          return made.find((node) => node.id === id) ?? null
        },
        querySelectorAll() {
          return [toggleNode, download]
        },
      },
      window: {
        addEventListener(_type: string, fn: (event: { key: string }) => void) {
          storageHandler = fn
        },
      },
      localStorage: {
        getItem(key: string) {
          return store.has(key) ? store.get(key)! : null
        },
        setItem(key: string, value: string) {
          if (failWrite) throw new Error('full')
          store.set(key, value)
        },
      },
      navigator: { connection: { saveData: true, effectiveType: '4g' }, deviceMemory: 8 },
    })
    new Script(settingsScript()).runInContext(context)
    expect(toggleNode.getAttribute('aria-checked')).toBe('true')
    expect(classes.get('lite-mode-toggle')?.has('bg-deep-navy')).toBe(true)
    expect(classes.get('lite-mode-thumb')?.has('translate-x-5')).toBe(true)
    expect(store.size).toBe(0)
    toggleNode.click?.()
    expect(store.get('ankanu_lite')).toBe('0')
    expect(toggleNode.getAttribute('aria-checked')).toBe('false')
    expect(classes.get('lite-mode-toggle')?.has('bg-hairline')).toBe(true)
    expect(classes.get('lite-mode-thumb')?.has('translate-x-0.5')).toBe(true)
    failWrite = true
    toggleNode.click?.()
    expect(store.get('ankanu_lite')).toBe('0')
    expect(toggleNode.getAttribute('aria-checked')).toBe('false')
    failWrite = false
    store.set('ankanu_lite', '1')
    storageHandler?.({ key: 'ankanu_lite' })
    expect(toggleNode.getAttribute('aria-checked')).toBe('true')
    expect(thumb.getAttribute('aria-checked')).toBeNull()
  })
})
