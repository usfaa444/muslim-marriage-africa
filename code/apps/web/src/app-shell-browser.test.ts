import { existsSync, readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { describe, expect, it } from 'vitest'
import { discoverHtml } from './discover-page.js'
import { inviteInboxHtml } from './invite-inbox-page.js'
import { authHtml, settingsHtml } from './v2-pages.js'

// Story discover-app-shell, AC 1, 4, 6, 7: in a real browser, switching Discover views leaves every piece of chrome
// where it was, and the bottom nav never covers the end of the page, at every factory width. Story chat-polish: app
// screens have no site header or footer any more, so the end of the page is the end of <main>; /auth keeps its footer.

const WIDTHS = [360, 390, 768, 1024, 1280, 1440] as const

function chromeBinary(): string | null {
  const found: string[] = [process.env.ANKANU_CHROME ?? '', '/usr/bin/google-chrome', '/usr/bin/chromium']
  for (const cache of [join(homedir(), '.cache/ms-playwright'), process.env.PLAYWRIGHT_BROWSERS_PATH ?? '']) {
    if (!cache) continue
    for (const dir of ['chromium-1243', 'chromium-1194']) {
      found.push(join(cache, dir, 'chrome-linux64', 'chrome'), join(cache, dir, 'chrome-linux', 'chrome'))
    }
  }
  return found.find((path) => path.length > 0 && existsSync(path)) ?? null
}

function stitch(folder: string, name = 'screen.html'): string {
  return readFileSync(fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/${name}`, import.meta.url)), 'utf8')
}

const ACCOUNT = '01990000-0000-7000-8000-0000000000aa'

function item(id: string, pseudonym: string) {
  return {
    id,
    pseudonym,
    age: 29,
    city: 'Ouagadougou',
    marital_status: 'Célibataire',
    polygamy_intent: 'Non',
    madhhab: 'Maliki',
    practice: 'Pratique assidue',
    verified: true,
    photo_blur: true,
    photo: null,
  }
}

const CHROME = `(() => {
  const box = (selector) => {
    const node = document.querySelector(selector)
    if (!node) return 'missing'
    const rect = node.getBoundingClientRect()
    return [rect.x, rect.y + window.scrollY, rect.width, rect.height].map((value) => Math.round(value)).join(',')
  }
  return {
    header: box('#app-header'),
    footer: box('#app-footer'),
    eyebrow: box('#discover-main h1'),
    toolbar: box('#discover-main section'),
    filters: box('[data-open-filters]'),
    toggle: box('[data-discover-view="grid"]'),
    nav: box('#app-bottom-nav nav'),
    body: getComputedStyle(document.body).backgroundColor,
  }
})()`

const FOOTER_CLEAR = `(() => {
  window.scrollTo(0, document.documentElement.scrollHeight)
  const last = document.getElementById('app-footer') || document.querySelector('main')
  const footer = last.getBoundingClientRect()
  const nav = document.querySelector('#app-bottom-nav nav')
  return {
    scrollWidth: document.documentElement.scrollWidth,
    width: window.innerWidth,
    gap: nav ? Math.round(nav.getBoundingClientRect().top - footer.bottom) : null,
    navItems: nav ? Array.from(nav.querySelectorAll('a')).map((link) => {
      const rect = link.getBoundingClientRect()
      return Math.min(rect.width, rect.height)
    }) : [],
  }
})()`

describe('app shell in a browser', () => {
  const binary = chromeBinary()

  it.skipIf(!binary)('keeps the Discover chrome still between views and clears the footer at every width', async () => {
    const pages: Record<string, string> = {
      '/decouvrir': discoverHtml(stitch('57-discover'), stitch('57-discover', 'grid.html'), ACCOUNT),
      '/settings': settingsHtml(stitch('27-settings')),
      '/invitations': inviteInboxHtml(stitch('19-invite-inbox')),
      '/auth': authHtml(stitch('02-auth'), 'login', ''),
    }
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/v1/browse') {
        response.setHeader('content-type', 'application/json; charset=utf-8')
        const grid = url.searchParams.get('view') === 'grid'
        const items = ['1', '2', '3'].map((n) => item(`01990000-0000-7000-8000-00000000000${n}`, `Membre_${n}`))
        response.end(JSON.stringify(grid ? { view: 'grid', next_cursor: null, items } : { view: 'card', item: { ...items[0], sharedTraits: [] } }))
        return
      }
      if (url.pathname === '/v1/invites') {
        // Stories 4.4, 4.5: one long-named row per box, so the width sweep covers real inbox rows.
        response.setHeader('content-type', 'application/json; charset=utf-8')
        const box = url.searchParams.get('box') ?? 'received'
        const row = {
          id: '01990000-0000-7000-8000-0000000000a1',
          state: box === 'accepted' ? 'accepted' : 'pending',
          created_at: '2026-10-23T10:00:00.000Z',
          direction: box === 'sent' ? 'sent' : 'received',
          other_id: '01990000-0000-7000-8000-000000000001',
          pseudonym: 'Abdoul_Rahmane_Ouedraogo_Bobo',
          conversation_id: box === 'accepted' ? '01990000-0000-7000-8000-0000000000c1' : null,
          other: { available: true, age: 34, city: 'fada', marital_status: 'married', polygamy_intent: 'yes', verified: true, photo: null },
        }
        response.end(JSON.stringify({ box, count: 1, items: [row] }))
        return
      }
      if (url.pathname.startsWith('/v1/')) {
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.end('{}')
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(pages[url.pathname] ?? 'missing')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const origin = `http://127.0.0.1:${address.port}`
    const browser = await chromium.launch({ executablePath: binary as string })
    const failures: string[] = []
    try {
      for (const width of WIDTHS) {
        const context = await browser.newContext({ viewport: { width, height: 900 } })
        const page = await context.newPage()
        await page.goto(`${origin}/decouvrir`)
        await page.waitForFunction("!!document.querySelector('#discover-focus') && document.querySelector('#discover-focus').hidden === false")
        const card = await page.evaluate(CHROME)
        expect((card as { header: string; footer: string }).header).toBe('missing')
        expect((card as { header: string; footer: string }).footer).toBe('missing')
        expect(await page.getAttribute('[data-discover-view="card"]', 'aria-pressed')).toBe('true')
        await page.click('[data-discover-view="grid"]')
        await page.waitForFunction("document.querySelectorAll('#discover-tiles [data-tile]').length === 3")
        const grid = await page.evaluate(CHROME)
        expect(await page.getAttribute('[data-discover-view="grid"]', 'aria-pressed')).toBe('true')
        expect(await page.getAttribute('[data-discover-view="card"]', 'aria-pressed')).toBe('false')
        if (JSON.stringify(card) !== JSON.stringify(grid)) failures.push(`moved@${width} ${JSON.stringify(card)} -> ${JSON.stringify(grid)}`)
        await page.click('[data-discover-view="card"]')
        await page.waitForFunction("document.getElementById('discover-card').hidden === false")
        const back = await page.evaluate(CHROME)
        if (JSON.stringify(card) !== JSON.stringify(back)) failures.push(`moved back@${width}`)
        // QA round 2: the filters overlay shows its form and always has a close control that works.
        await page.click('[data-open-filters]')
        await page.waitForFunction("document.getElementById('filters-modal').hidden === false")
        expect(await page.isVisible('#filters-form')).toBe(true)
        const close = page.locator('[data-close-filters]')
        expect(await close.isVisible()).toBe(true)
        const closeBox = await close.boundingBox()
        expect(Math.min(closeBox?.width ?? 0, closeBox?.height ?? 0)).toBeGreaterThanOrEqual(44)
        expect(await close.evaluate((node) => node === document.activeElement)).toBe(true)
        await close.click()
        expect(await page.evaluate("document.getElementById('filters-modal').hidden")).toBe(true)
        expect(await page.evaluate("document.activeElement && document.activeElement.hasAttribute('data-open-filters')")).toBe(true)
        for (const path of ['/decouvrir', '/settings', '/invitations', '/auth']) {
          await page.goto(`${origin}${path}`)
          const clear = (await page.evaluate(FOOTER_CLEAR)) as { scrollWidth: number; width: number; gap: number | null; navItems: number[] }
          if (clear.scrollWidth > clear.width) failures.push(`${path}@${width} scroll ${clear.scrollWidth} > ${clear.width}`)
          if (path === '/auth') {
            if (clear.gap !== null) failures.push(`/auth@${width} has a bottom nav`)
            continue
          }
          if (clear.gap === null || clear.gap < 0) failures.push(`${path}@${width} nav covers the end of the page (${clear.gap})`)
          if (clear.navItems.length !== 4 || clear.navItems.some((size) => size < 44)) {
            failures.push(`${path}@${width} nav targets ${clear.navItems.join(',')}`)
          }
        }
        await context.close()
      }
    } finally {
      await browser.close()
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    expect(failures).toEqual([])
  }, 120_000)
})
