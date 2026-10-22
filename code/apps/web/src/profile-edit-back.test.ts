import { createServer, type Server } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { describe, expect, it } from 'vitest'
import { profileHtml } from './v2-pages.js'

// Real Chromium, real HTTP cache. Playwright request routing would turn the cache off,
// so this test serves the page and a stand-in API itself.

function chromeBinary(): string | null {
  const found: string[] = []
  if (process.env.ANKANU_CHROME) {
    found.push(process.env.ANKANU_CHROME)
  }
  found.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser')
  for (const cache of [join(homedir(), '.cache/ms-playwright'), process.env.PLAYWRIGHT_BROWSERS_PATH ?? '']) {
    if (!cache || !existsSync(cache)) {
      continue
    }
    for (const dir of ['chromium-1243', 'chromium-1194', 'chromium-1187']) {
      found.push(join(cache, dir, 'chrome-linux64', 'chrome'))
      found.push(join(cache, dir, 'chrome-linux', 'chrome'))
    }
  }
  return found.find((path) => existsSync(path)) ?? null
}

const binary = chromeBinary()

function stitch(): string {
  return readFileSync(
    fileURLToPath(new URL('../../../design-stitch/ankanu-v2/11-profile-edit/screen.html', import.meta.url)),
    'utf8',
  )
}

// 1x1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

type Api = { server: Server; origin: string; expireAll: () => void; denied: () => string[]; minted: () => number }

/** Signs a new grant on every profile read, like the API, and refuses a grant once it has expired. */
async function startApi(): Promise<Api> {
  const html = profileHtml(stitch())
  const live = new Set<string>()
  const denied: string[] = []
  let minted = 0
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (url.pathname === '/profile-edit') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      response.end(html)
      return
    }
    if (url.pathname === '/profile-review') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      // Any other page that reads the profile with the browser's default caching (the review page did)
      // leaves the newest stored copy holding grants this page never loaded.
      response.end(
        "<!DOCTYPE html><html lang=\"fr\"><title>review</title><p>review</p><script>fetch('/v1/me/profile').then(function (r) { return r.json() }).then(function () { document.title = 'review-read' })</script></html>",
      )
      return
    }
    if (url.pathname === '/v1/me/profile') {
      minted += 1
      const token = `grant-${minted}`
      live.add(token)
      // No cache-control: this is how the API answered before the fix. The page alone must not reuse it.
      response.writeHead(200, { 'content-type': 'application/json', etag: `W/"profile-${minted}"` })
      response.end(
        JSON.stringify({
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
          bio_pending: null,
          bio_live: null,
          photo_blur: true,
          completeness: { percent: 100, missing: [], ready: true },
          photo: null,
          photos: [{ id: 'main', moderation_state: 'live', is_main: true, caption: null, url: `/v1/media/get?token=${token}` }],
        }),
      )
      return
    }
    if (url.pathname === '/v1/media/get') {
      const token = url.searchParams.get('token') ?? ''
      if (!live.has(token)) {
        denied.push(token)
        response.writeHead(403, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Accès au média refusé.' } }))
        return
      }
      response.writeHead(200, { 'content-type': 'image/png' })
      response.end(PNG)
      return
    }
    if (url.pathname === '/v1/pin') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ enabled: false, locked: false }))
      return
    }
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end('{}')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('test server has no port')
  }
  return {
    server,
    origin: `http://127.0.0.1:${address.port}`,
    expireAll: () => live.clear(),
    denied: () => [...denied],
    minted: () => minted,
  }
}

describe('profile edit photos after a back navigation in Chromium', () => {
  it.skipIf(!binary)('reads fresh grants on Back instead of the cached profile, so no photo is broken', async () => {
    const api = await startApi()
    const browser = await chromium.launch({
      executablePath: binary as string,
      // Fonts and Tailwind come from CDNs; fail them fast instead of waiting on the network.
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
    })
    try {
      const page = await browser.newPage()
      const photo = page.locator('#profile-photo-grid img').first()
      const loaded = () => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)

      await page.goto(`${api.origin}/profile-edit`, { waitUntil: 'domcontentloaded' })
      await expect.poll(loaded, { timeout: 15_000 }).toBe(true)
      const first = await photo.getAttribute('src')
      expect(first).toBe('/v1/media/get?token=grant-1')

      await page.goto(`${api.origin}/profile-review`, { waitUntil: 'domcontentloaded' })
      await expect.poll(() => page.title(), { timeout: 15_000 }).toBe('review-read')
      // The member stayed on the review page longer than signed_url_ttl_seconds.
      api.expireAll()
      await page.goBack({ waitUntil: 'domcontentloaded' })
      expect(page.url()).toBe(`${api.origin}/profile-edit`)

      await expect.poll(loaded, { timeout: 15_000 }).toBe(true)
      expect(await photo.getAttribute('src')).not.toBe(first)
      expect(api.minted()).toBeGreaterThanOrEqual(2)
      // The page never asked for the expired grant: no broken image, not even briefly.
      expect(api.denied()).toEqual([])
    } finally {
      await browser.close()
      await new Promise<void>((resolve) => api.server.close(() => resolve()))
    }
  }, 60_000)
})
