import type { BrowserContext, Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Stories 5.3 (Chat Photo) and 5.4 (Voice note) on screen 21. Like chat.spec.ts, these tests answer every browser
// call to /v1 themselves (the web-only dev server has no API) and replace the Socket.IO client with a fake. The
// microphone is Chromium's fake capture device, so the real MediaRecorder runs. Stub cookies are a dev-build seam only.
const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  },
})

const ME = '01990000-0000-7000-8000-0000000000e1'
const HIM = '01990000-0000-7000-8000-0000000000e2'
const CONVERSATION = '01990000-0000-7000-8000-0000000000c1'
const PHOTO_MESSAGE = '01990000-0000-7000-8000-000000000101'
const VOICE_MESSAGE = '01990000-0000-7000-8000-000000000102'

// Story chat-polish brought read receipts (« Lu ») on purpose; hold, scan and transcript copy stays banned.
const HOLD_COPY = /En cours de vérification|vérification|modération|scan|retenu|en attente de|transcri/i

type Item = {
  id: string
  conversation_id: string
  sender_id: string
  kind: 'text' | 'photo' | 'voice'
  state: 'delivered'
  text: string | null
  created_at: string
  media?: Record<string, unknown>
}

type Post = { kind?: unknown; image?: unknown; audio?: unknown; duration_ms?: unknown; language?: unknown; text?: unknown }

type Api = {
  messages: Item[]
  posts: Post[]
  /** Every /v1 media request, in order: access grants and gateway reads. */
  mediaCalls: string[]
  closed: boolean
  failNextPost?: { status: number; body: unknown }
  serial: number
}

function crc32(bytes: Buffer): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

/** A small solid PNG, built here so the test needs no fixture file. */
function png(width: number, height: number, rgb: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  const rows = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) rows.set(rgb, y * (width * 3 + 1) + 1 + x * 3)
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))])
}

/** One second of silence as WAV: decodable by headless Chromium, so playback really starts. */
function wav(): Buffer {
  const rate = 8000
  const data = Buffer.alloc(rate)
  data.fill(128)
  const head = Buffer.alloc(44)
  head.write('RIFF', 0, 'latin1')
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVEfmt ', 8, 'latin1')
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20)
  head.writeUInt16LE(1, 22)
  head.writeUInt32LE(rate, 24)
  head.writeUInt32LE(rate, 28)
  head.writeUInt16LE(1, 32)
  head.writeUInt16LE(8, 34)
  head.write('data', 36, 'latin1')
  head.writeUInt32LE(data.length, 40)
  return Buffer.concat([head, data])
}

const BLUR = png(8, 6, [190, 175, 150])
const CLEAR = png(160, 120, [40, 90, 140])
const AUDIO = wav()

const FAKE_IO = `(function () {
  var fake = { sockets: [], emitted: [] }
  window.__fake = fake
  fake.fire = function (name, payload) { fake.sockets.forEach(function (socket) { (socket.handlers[name] || []).forEach(function (fn) { fn(payload) }) }) }
  window.io = function (options) {
    var socket = { options: options, handlers: {}, connected: true }
    socket.on = function (name, fn) { (socket.handlers[name] = socket.handlers[name] || []).push(fn); return socket }
    socket.emit = function (name, payload) { fake.emitted.push({ name: name, payload: payload }) }
    socket.disconnect = function () { socket.connected = false }
    fake.sockets.push(socket)
    setTimeout(function () { fake.fire('connect') }, 0)
    return socket
  }
})()`

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

function api(): Api {
  return {
    messages: [
      {
        id: PHOTO_MESSAGE,
        conversation_id: CONVERSATION,
        sender_id: HIM,
        kind: 'photo',
        state: 'delivered',
        text: null,
        created_at: iso(30),
        media: { id: '01990000-0000-7000-8000-0000000000a1', kind: 'photo', width: 160, height: 120, blur_url: '/v1/media/get?token=blur-1' },
      },
      {
        id: VOICE_MESSAGE,
        conversation_id: CONVERSATION,
        sender_id: HIM,
        kind: 'voice',
        state: 'delivered',
        text: null,
        created_at: iso(20),
        media: { id: '01990000-0000-7000-8000-0000000000a2', kind: 'voice', duration_ms: 48_000 },
      },
    ],
    posts: [],
    mediaCalls: [],
    closed: false,
    serial: 0x200,
  }
}

function messageId(serial: number): string {
  return `01990000-0000-7000-8000-${serial.toString(16).padStart(12, '0')}`
}

async function serveApi(context: BrowserContext, baseURL: string, state: Api): Promise<void> {
  await context.addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL }])
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname === '/v1/realtime/socket.io.min.js') {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE_IO })
      return
    }
    if (url.pathname === '/v1/conversations' && method === 'GET') {
      const last = state.messages[state.messages.length - 1]
      await route.fulfill(
        json({
          count: 1,
          items: [
            {
              id: CONVERSATION,
              invite_id: '01990000-0000-7000-8000-0000000000d1',
              stage: 'chat',
              other_id: HIM,
              pseudonym: 'Al-Hassan_BF',
              other: { available: true, age: 29, city: 'ouagadougou', verified: true, photo: null },
              last_message: last ? { id: last.id, mine: last.sender_id === ME, kind: last.kind, preview: last.text, created_at: last.created_at } : null,
            },
          ],
        }),
      )
      return
    }
    if (url.pathname === '/v1/media/get') {
      const token = url.searchParams.get('token') ?? ''
      state.mediaCalls.push(`get ${token}`)
      if (token.startsWith('blur')) await route.fulfill({ status: 200, contentType: 'image/png', body: BLUR })
      else if (token.startsWith('clear')) await route.fulfill({ status: 200, contentType: 'image/png', body: CLEAR })
      else if (token.startsWith('voice')) await route.fulfill({ status: 200, contentType: 'audio/wav', body: AUDIO })
      else await route.fulfill(json({ error: { code: 'FORBIDDEN', message: 'Accès au média refusé.', details: null } }, 403))
      return
    }
    const access = /^\/v1\/conversations\/([^/]+)\/messages\/([^/]+)\/media$/.exec(url.pathname)
    if (access && method === 'GET') {
      const item = state.messages.find((row) => row.id === access[2])
      state.mediaCalls.push(`access ${access[2]}`)
      if (!item || item.kind === 'text') {
        await route.fulfill(json({ error: { code: 'NOT_FOUND', message: 'Ce média est introuvable.', details: null } }, 404))
        return
      }
      const token = `${item.kind === 'photo' ? 'clear' : 'voice'}-${item.id}`
      await route.fulfill(json({ url: `/v1/media/get?token=${token}`, expires_at: new Date(Date.now() + 60_000).toISOString() }))
      return
    }
    if (/^\/v1\/conversations\/[^/]+\/read$/.test(url.pathname) && method === 'POST') {
      const body = request.postDataJSON() as { message_id: string }
      await route.fulfill(json({ read: { message_id: body.message_id } }))
      return
    }
    const thread = /^\/v1\/conversations\/([^/]+)(\/messages)?$/.exec(url.pathname)
    if (thread && thread[1] === CONVERSATION) {
      if (!thread[2] && method === 'GET') {
        await route.fulfill(
          json({
            conversation: {
              id: CONVERSATION,
              stage: 'chat',
              other_id: HIM,
              pseudonym: 'Al-Hassan_BF',
              other: { available: true, age: 29, city: 'ouagadougou', verified: true, photo: null },
              closed: state.closed,
            },
            me: { id: ME },
          }),
        )
        return
      }
      if (thread[2] && method === 'GET') {
        const after = url.searchParams.get('after')
        const items = after ? state.messages.filter((row) => row.id > after) : state.messages
        await route.fulfill(json({ items: items.map((row) => ({ ...row, mine: row.sender_id === ME })), has_more: false }))
        return
      }
      if (thread[2] && method === 'POST') {
        const body = request.postDataJSON() as Post
        state.posts.push(body)
        if (state.failNextPost) {
          const fail = state.failNextPost
          delete state.failNextPost
          await route.fulfill(json(fail.body, fail.status))
          return
        }
        state.serial += 1
        const id = messageId(state.serial)
        const media =
          body.kind === 'photo'
            ? { id: messageId(state.serial + 0x1000), kind: 'photo', width: 160, height: 120, blur_url: '/v1/media/get?token=blur-new' }
            : { id: messageId(state.serial + 0x1000), kind: 'voice', duration_ms: body.duration_ms }
        const item: Item = { id, conversation_id: CONVERSATION, sender_id: ME, kind: body.kind === 'photo' ? 'photo' : 'voice', state: 'delivered', text: null, created_at: new Date().toISOString(), media }
        state.messages.push(item)
        await route.fulfill(json({ message: { ...item, mine: true } }, 201))
        return
      }
    }
    if (url.pathname === '/v1/pin' && method === 'GET') {
      await route.fulfill(json({ enabled: false, locked: false }))
      return
    }
    await route.fulfill(json({ error: { code: 'NOT_FOUND', message: 'Not found', details: null } }, 404))
  })
}

async function openThread(page: Page): Promise<void> {
  const loaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${CONVERSATION}/messages`))
  await page.goto(`/discussions/${CONVERSATION}`)
  await loaded
  await expect(page.locator('#chat-thread')).toHaveAttribute('aria-busy', 'false')
}

function bubbles(page: Page) {
  return page.getByRole('log', { name: 'Messages' }).getByTestId('chat-bubble')
}

/** Lite off unless a test asks for it (the CI machine is not a 2G phone). */
async function setLite(context: BrowserContext, on: boolean): Promise<void> {
  await context.addInitScript((value) => {
    try {
      localStorage.setItem('ankanu_lite', value)
    } catch {
      // No storage: the page falls back to its automatic rule.
    }
  }, on ? '1' : '0')
}

test.describe('Chat Photo and Voice note (Stories 5.3, 5.4, screen 21)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 5.3-1 / 5.4-1: a received Photo shows at once and a Voice note plays on tap only, with no transcript and no hold copy', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(bubbles(page)).toHaveCount(2)
    const photo = bubbles(page).first()
    // The clear image loads straight away outside Lite, from a fresh signed URL fetched for this reader.
    await expect(photo.getByRole('img', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()
    expect(state.mediaCalls).toContain(`access ${PHOTO_MESSAGE}`)
    // The other member's media can be reported like a text (Story 8.5).
    await expect(photo.getByRole('link', { name: 'Signaler ce message' })).toHaveAttribute('href', `/signaler/${HIM}?discussion=${CONVERSATION}&message=${PHOTO_MESSAGE}`)

    const voice = bubbles(page).nth(1)
    await expect(voice.getByText('Note vocale', { exact: true })).toBeVisible()
    await expect(voice.getByTestId('chat-voice-time')).toHaveText('0:48')
    // No autoplay: nothing about the note was fetched before the tap.
    expect(state.mediaCalls.filter((call) => call.includes(VOICE_MESSAGE))).toEqual([])
    const play = voice.getByRole('button', { name: 'Écouter la note vocale' })
    const box = await play.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    await play.click()
    await expect(voice.getByRole('button', { name: 'Mettre en pause la note vocale' })).toBeVisible()
    expect(state.mediaCalls).toEqual(expect.arrayContaining([`access ${VOICE_MESSAGE}`, `get voice-${VOICE_MESSAGE}`]))
    await expect(voice.getByRole('button', { name: 'Écouter la note vocale' })).toBeVisible({ timeout: 5000 })

    await expect(page.locator('main')).not.toContainText(HOLD_COPY)
    await expect(voice.getByRole('link', { name: 'Signaler ce message' })).toBeVisible()
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('Lite mode (2G/3G): the Photo shows its server blur and waits for « Afficher la photo »', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, true)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const photo = bubbles(page).first()
    await expect(photo.getByTestId('chat-photo-blur')).toBeVisible()
    const show = photo.getByRole('button', { name: 'Afficher la photo' })
    await expect(show).toBeVisible()
    expect(state.mediaCalls).toEqual(['get blur-1'])
    await show.click()
    await expect(photo.getByRole('img', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()
    expect(state.mediaCalls).toEqual(['get blur-1', `access ${PHOTO_MESSAGE}`, `get clear-${PHOTO_MESSAGE}`])
    await expectAccessible(page)
  })

  test('outside Lite on a slow link, the blur shows a loading note, never a dead « Afficher la photo » button (Mac live QA D1)', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => { release = resolve })
    // Registered last, so it runs first: hold the signed-URL answer like a 2G link would.
    await context.route(`**/v1/conversations/${CONVERSATION}/messages/${PHOTO_MESSAGE}/media`, async (route) => {
      await held
      await route.fallback()
    })
    await openThread(page)
    const photo = bubbles(page).first()
    await expect(photo.getByTestId('chat-photo-blur')).toBeVisible()
    await expect(photo.getByTestId('chat-photo-loading')).toHaveText('Chargement de la photo…')
    await expect(photo.getByRole('button', { name: 'Afficher la photo' })).toBeHidden()
    await expectAccessible(page)
    release()
    await expect(photo.getByRole('img', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()
    await expect(photo.getByTestId('chat-photo-loading')).toHaveCount(0)
  })

  test('AC 5.3-1: « Joindre une photo sobre » compresses the Photo to JPEG, previews it, and the sent bubble appears at once', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Joindre une photo sobre' }).click()
    await (await chooser).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png(2400, 1800, [120, 60, 30]) })
    const panel = page.getByTestId('thread-media')
    await expect(panel.getByRole('img', { name: 'Aperçu de la photo à envoyer' })).toBeVisible()
    await expectAccessible(page)
    const posted = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/messages'))
    await panel.getByRole('button', { name: 'Envoyer la photo' }).click()
    expect((await posted).status()).toBe(201)
    expect(state.posts).toHaveLength(1)
    const body = state.posts[0] ?? {}
    expect(body.kind).toBe('photo')
    // Re-encoded in the browser: a JPEG (base64 « /9j/ »), no bigger than 2 Mo, longest edge 1600 px.
    expect(String(body.image)).toMatch(/^\/9j\//)
    const bytes = Buffer.from(String(body.image), 'base64')
    expect(bytes.length).toBeLessThanOrEqual(2_097_152)
    let width = 0
    for (let offset = 2; offset < bytes.length - 9; ) {
      const marker = bytes[offset + 1] ?? 0
      const length = bytes.readUInt16BE(offset + 2)
      if (marker >= 0xc0 && marker <= 0xc2) {
        width = bytes.readUInt16BE(offset + 7)
        break
      }
      offset += 2 + length
    }
    expect(width).toBe(1600)
    await expect(panel).toBeHidden()
    await expect(bubbles(page)).toHaveCount(3)
    await expect(bubbles(page).last()).toHaveAttribute('data-mine', 'true')
    await expect(bubbles(page).last().getByRole('img', { name: 'Votre photo' })).toBeVisible()
    await expect(bubbles(page).last().getByRole('link', { name: 'Signaler ce message' })).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Photo envoyée' })).toHaveCount(1)
  })

  test('AC 5.4-1 / 5.4-4: « Enregistrer une note vocale sobre » records, lets her pick Mooré, and sends a voice message', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await page.getByRole('button', { name: 'Enregistrer une note vocale sobre' }).click()
    const panel = page.getByTestId('thread-media')
    await expect(panel.getByText('Enregistrement en cours')).toBeVisible()
    await expect(panel.getByTestId('voice-timer')).toHaveText(/^0:0[2-9] \/ 2:00$/, { timeout: 6000 })
    await panel.getByRole('button', { name: "Arrêter l'enregistrement" }).click()
    await expect(panel.getByTestId('voice-ready')).toHaveText(/^Note vocale prête : 0:0\d$/)
    await panel.getByLabel('Langue de la note').selectOption({ label: 'Mooré' })
    await expectAccessible(page)
    const posted = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/messages'))
    await panel.getByRole('button', { name: 'Envoyer la note vocale' }).click()
    expect((await posted).status()).toBe(201)
    const body = state.posts[0] ?? {}
    expect(body.kind).toBe('voice')
    expect(body.language).toBe('mos')
    expect(Number(body.duration_ms)).toBeGreaterThanOrEqual(1000)
    expect(Number(body.duration_ms)).toBeLessThanOrEqual(120_000)
    const audio = Buffer.from(String(body.audio), 'base64')
    expect(audio.length).toBeGreaterThan(100)
    expect(audio.length).toBeLessThanOrEqual(1_048_576)
    // Chromium records Opus in WebM: the EBML magic.
    expect(audio.subarray(0, 4)).toEqual(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    await expect(panel).toBeHidden()
    await expect(bubbles(page)).toHaveCount(3)
    await expect(bubbles(page).last().getByTestId('chat-voice')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Note vocale envoyée' })).toHaveCount(1)
  })

  test('a refused microphone explains itself; « Annuler » closes the recorder and sends nothing', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await page.getByRole('button', { name: 'Enregistrer une note vocale sobre' }).click()
    const panel = page.getByTestId('thread-media')
    await expect(panel.getByText('Enregistrement en cours')).toBeVisible()
    await panel.getByRole('button', { name: 'Annuler' }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('button', { name: 'Enregistrer une note vocale sobre' })).toBeFocused()

    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'))
    })
    await page.getByRole('button', { name: 'Enregistrer une note vocale sobre' }).click()
    await expect(page.getByRole('alert').filter({ hasText: "Micro indisponible. Autorisez l'accès au micro pour enregistrer une note vocale." })).toBeVisible()
    expect(state.posts).toEqual([])
  })

  test('QA F2: « Retour », « Signaler / Bloquer », « Signaler ce message » and « Envoyer » are 44 x 44 targets, even unstyled', async ({ page, context, baseURL }, testInfo) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await page.getByRole('textbox').first().fill('Bien reçu.')
    // Story chat-polish: « Retour » is the phone way back; from 768 px the list row beside the thread is the target.
    const targets = [
      testInfo.project.name === 'mobile'
        ? page.getByRole('link', { name: 'Retour aux discussions' })
        : page.getByTestId('conversation-row').getByRole('link'),
      page.getByRole('link', { name: 'Signaler / Bloquer' }),
      page.getByRole('button', { name: 'Envoyer', exact: true }),
      ...(await bubbles(page).getByRole('link', { name: 'Signaler ce message' }).all()),
    ]
    expect(targets.length).toBeGreaterThanOrEqual(5)
    for (const target of targets) {
      await expect(target).toBeVisible()
      const box = await target.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('QA F3: a GIF or a corrupt file is refused before any preview, whatever its name or type; a JPEG still previews', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const panel = page.getByTestId('thread-media')
    const unsupported = "Ce format de photo n'est pas pris en charge. Choisissez une photo JPEG ou PNG."
    // A real, decodable GIF the browser could re-encode, named and typed as a JPEG; then a corrupt GIF.
    const realGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    const corruptGif = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(32, 0x5a)])
    for (const file of [
      { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: realGif },
      { name: 'anim.gif', mimeType: 'image/gif', buffer: corruptGif },
    ]) {
      const chooser = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: 'Joindre une photo sobre' }).click()
      await (await chooser).setFiles(file)
      await expect(page.getByRole('alert').filter({ hasText: unsupported })).toBeVisible()
      await expect(panel.getByRole('img', { name: 'Aperçu de la photo à envoyer' })).toHaveCount(0)
      await expect(panel.getByRole('button', { name: 'Envoyer la photo' })).toHaveCount(0)
    }
    expect(state.posts).toEqual([])

    // A JPEG (made by this browser) passes the same check and previews.
    const jpeg = Buffer.from(
      (await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 40
        canvas.height = 30
        const context2d = canvas.getContext('2d')
        if (context2d) {
          context2d.fillStyle = '#336699'
          context2d.fillRect(0, 0, 40, 30)
        }
        return canvas.toDataURL('image/jpeg', 0.8)
      })).split(',')[1] ?? '',
      'base64',
    )
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Joindre une photo sobre' }).click()
    await (await chooser).setFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: jpeg })
    await expect(panel.getByRole('img', { name: 'Aperçu de la photo à envoyer' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: unsupported })).toBeHidden()
  })

  test('AC 5.3-2 / 5.4-2 (UI side of the 5.11 seam): a refused send shows the API message and keeps the Photo ready', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    state.failNextPost = {
      status: 429,
      body: { error: { code: 'MESSAGE_CAP_EXCEEDED', message: 'Limite de messages du jour atteinte.', details: { cap: 10, resets_at: '2026-10-25T00:00:00.000Z' }, retryable: false } },
    }
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Joindre une photo sobre' }).click()
    await (await chooser).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png(64, 48, [10, 20, 30]) })
    const panel = page.getByTestId('thread-media')
    await panel.getByRole('button', { name: 'Envoyer la photo' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Limite de messages du jour atteinte.' })).toBeVisible()
    // Nothing was added to the thread; the Photo is still ready to send.
    await expect(bubbles(page)).toHaveCount(2)
    await expect(panel.getByRole('button', { name: 'Envoyer la photo' })).toBeEnabled()
  })

  test('a closed or blocked conversation disables the Photo and Voice buttons; a 409 on a media send closes the composer', async ({ page, context, baseURL }) => {
    const state = api()
    state.closed = true
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(page.getByRole('button', { name: 'Joindre une photo sobre' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Enregistrer une note vocale sobre' })).toBeDisabled()
    // Earlier media stays readable.
    await expect(bubbles(page).first().getByRole('img', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()

    state.closed = false
    state.failNextPost = { status: 409, body: { error: { code: 'UNHANDLED', message: 'Cette discussion est fermée.', details: { reason: 'conversation_closed' }, retryable: false } } }
    await openThread(page)
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Joindre une photo sobre' }).click()
    await (await chooser).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png(64, 48, [10, 20, 30]) })
    await page.getByTestId('thread-media').getByRole('button', { name: 'Envoyer la photo' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Cette discussion est fermée.' })).toBeVisible()
    await expect(page.getByTestId('thread-media')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Joindre une photo sobre' })).toBeDisabled()
  })

  test('the Discussions list names a Photo or a Voice note as the last message, and nothing offers a GIF', async ({ page, context, baseURL }) => {
    const state = api()
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', state)
    const listed = page.waitForResponse((response) => response.url().endsWith('/v1/conversations'))
    await page.goto('/discussions')
    await listed
    await expect(page.getByTestId('conversation-preview')).toHaveText('Note vocale')
    await openThread(page)
    await expect(page.getByRole('button', { name: /gif/i })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(/\bGIF\b/)
  })

  test('fits every factory width with Photo and Voice note bubbles and an open recorder', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await setLite(context, false)
    await serveApi(context, baseURL ?? '', api())
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openThread(page)
      await expect(bubbles(page).first().getByRole('img', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()
      await page.getByRole('button', { name: 'Enregistrer une note vocale sobre' }).click()
      await expect(page.getByTestId('thread-media').getByText('Enregistrement en cours')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.getByTestId('thread-media').getByRole('button', { name: 'Annuler' }).click()
    }
  })
})
