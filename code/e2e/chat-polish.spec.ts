import type { BrowserContext, Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Story chat-polish on screens 20 and 21: full-screen Chat Photo, open at the latest message, read receipts, unread
// badges, and the split view from 768 px. Like chat.spec.ts, these tests answer every /v1 call themselves (the web-only
// dev server has no API) and replace the Socket.IO client with a fake a test drives. Stub cookies are a dev-build seam.
const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

const ME = '01990000-0000-7000-8000-0000000000e1'
const HIM = '01990000-0000-7000-8000-0000000000e2'
const OTHER = '01990000-0000-7000-8000-0000000000e3'
const FIRST = '01990000-0000-7000-8000-0000000000c1'
const SECOND = '01990000-0000-7000-8000-0000000000c2'

type Item = {
  id: string
  conversation_id: string
  sender_id: string
  kind: 'text' | 'photo'
  state: 'delivered'
  text: string | null
  created_at: string
  media?: Record<string, unknown>
}

type Api = {
  messages: Item[]
  /** Read pointers by conversation and account. */
  pointers: Record<string, Record<string, string>>
  reads: Array<{ conversation_id: string; message_id: string }>
  listCalls: number
  mediaCalls: string[]
  serial: number
}

const PEOPLE: Record<string, { other_id: string; pseudonym: string; age: number; city: string }> = {
  [FIRST]: { other_id: HIM, pseudonym: 'Al-Hassan_BF', age: 29, city: 'ouagadougou' },
  [SECOND]: { other_id: OTHER, pseudonym: 'Oumar_K', age: 31, city: 'koudougou' },
}

function crc32(bytes: Buffer): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

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

const BLUR = png(8, 6, [190, 175, 150])
const CLEAR = png(160, 120, [40, 90, 140])

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

function id(serial: number): string {
  return `01990000-0000-7000-8000-${serial.toString(16).padStart(12, '0')}`
}

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

function text(serial: number, conversation: string, sender: string, body: string, minutesAgo: number): Item {
  return { id: id(serial), conversation_id: conversation, sender_id: sender, kind: 'text', state: 'delivered', text: body, created_at: iso(minutesAgo) }
}

/** First: two of mine then three of his I have not read. Second: my last message, read by him. */
function api(): Api {
  return {
    messages: [
      text(0x101, FIRST, ME, 'As-salāmu ʿalaykum.', 90),
      text(0x102, FIRST, ME, 'Comment allez-vous ?', 80),
      text(0x103, FIRST, HIM, 'Wa alaykum salam.', 40),
      text(0x104, FIRST, HIM, 'Très bien, al-hamdulillah.', 35),
      text(0x105, FIRST, HIM, 'Et votre famille ?', 30),
      text(0x0f1, SECOND, OTHER, 'Bonjour.', 60 * 26),
      text(0x0f2, SECOND, ME, 'Bonjour, baraka Allahu fik.', 60 * 25),
    ],
    pointers: { [FIRST]: { [HIM]: id(0x101) }, [SECOND]: { [OTHER]: id(0x0f2), [ME]: id(0x0f1) } },
    reads: [],
    listCalls: 0,
    mediaCalls: [],
    serial: 0x300,
  }
}

function inThread(state: Api, conversation: string): Item[] {
  return state.messages.filter((item) => item.conversation_id === conversation).sort((a, b) => a.id.localeCompare(b.id))
}

function listItems(state: Api) {
  return Object.entries(PEOPLE)
    .map(([conversation, person]) => {
      const items = inThread(state, conversation)
      const last = items[items.length - 1]
      const mine = state.pointers[conversation]?.[ME] ?? ''
      const theirs = state.pointers[conversation]?.[person.other_id] ?? ''
      const unread = items.filter((item) => item.sender_id !== ME && item.id > mine).length
      return {
        id: conversation,
        invite_id: conversation.replace('c', 'd'),
        stage: 'chat',
        other_id: person.other_id,
        pseudonym: person.pseudonym,
        other: { available: true, age: person.age, city: person.city, verified: true, photo: null },
        unread,
        last_message: last
          ? { id: last.id, mine: last.sender_id === ME, kind: last.kind, preview: last.text, created_at: last.created_at, read: last.sender_id === ME ? theirs >= last.id : mine >= last.id }
          : null,
      }
    })
    .sort((a, b) => (b.last_message?.id ?? b.id).localeCompare(a.last_message?.id ?? a.id))
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
      state.listCalls += 1
      const items = listItems(state)
      await route.fulfill(json({ count: items.length, items }))
      return
    }
    if (url.pathname === '/v1/media/get') {
      const token = url.searchParams.get('token') ?? ''
      state.mediaCalls.push(`get ${token}`)
      await route.fulfill({ status: 200, contentType: 'image/png', body: token.startsWith('blur') ? BLUR : CLEAR })
      return
    }
    const access = /^\/v1\/conversations\/([^/]+)\/messages\/([^/]+)\/media$/.exec(url.pathname)
    if (access) {
      state.mediaCalls.push(`access ${access[2]}`)
      await route.fulfill(json({ url: `/v1/media/get?token=clear-${access[2]}`, expires_at: new Date(Date.now() + 60_000).toISOString() }))
      return
    }
    const read = /^\/v1\/conversations\/([^/]+)\/read$/.exec(url.pathname)
    if (read && method === 'POST') {
      const conversation = read[1] ?? ''
      const body = request.postDataJSON() as { message_id: string }
      state.reads.push({ conversation_id: conversation, message_id: body.message_id })
      const pointers = (state.pointers[conversation] ??= {})
      if (!pointers[ME] || pointers[ME] < body.message_id) pointers[ME] = body.message_id
      await route.fulfill(json({ read: { message_id: pointers[ME] } }))
      return
    }
    const thread = /^\/v1\/conversations\/([^/]+)(\/messages)?$/.exec(url.pathname)
    const person = thread ? PEOPLE[thread[1] ?? ''] : undefined
    if (thread && person) {
      const conversation = thread[1] ?? ''
      if (!thread[2] && method === 'GET') {
        await route.fulfill(
          json({
            conversation: { id: conversation, stage: 'chat', other_id: person.other_id, pseudonym: person.pseudonym, other: { available: true, age: person.age, city: person.city, verified: true, photo: null }, closed: false },
            me: { id: ME },
            read: { me: state.pointers[conversation]?.[ME] ?? null, other: state.pointers[conversation]?.[person.other_id] ?? null },
          }),
        )
        return
      }
      if (thread[2] && method === 'GET') {
        const after = url.searchParams.get('after')
        const all = inThread(state, conversation)
        const items = after ? all.filter((item) => item.id > after) : all.slice(-30)
        await route.fulfill(json({ items: items.map((item) => ({ ...item, mine: item.sender_id === ME })), has_more: !after && all.length > 30 }))
        return
      }
      if (thread[2] && method === 'POST') {
        const body = request.postDataJSON() as { text: string }
        state.serial += 1
        const item = text(state.serial, conversation, ME, String(body.text).trim(), 0)
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

async function fire(page: Page, name: string, payload: unknown): Promise<void> {
  await page.evaluate(([event, body]) => (window as unknown as { __fake: { fire(name: string, payload: unknown): void } }).__fake.fire(event as string, body), [name, payload] as const)
}

async function realtimeReady(page: Page): Promise<void> {
  await page.waitForFunction(() => ((window as unknown as { __fake?: { sockets: unknown[] } }).__fake?.sockets.length ?? 0) === 1)
}

async function openList(page: Page): Promise<void> {
  const listed = page.waitForResponse((response) => response.url().endsWith('/v1/conversations'))
  await page.goto('/discussions')
  await listed
  await expect(page.locator('#discussions')).toHaveAttribute('aria-busy', 'false')
}

async function openThread(page: Page, conversation = FIRST): Promise<void> {
  const loaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${conversation}/messages`))
  await page.goto(`/discussions/${conversation}`)
  await loaded
  await expect(page.locator('#chat-thread')).toHaveAttribute('aria-busy', 'false')
}

function bubbles(page: Page) {
  return page.getByRole('log', { name: 'Messages' }).getByTestId('chat-bubble')
}

function row(page: Page, conversation: string) {
  return page.locator(`[data-testid="conversation-row"][data-conversation-id="${conversation}"]`)
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

/** A value set on `window` survives only while the page is not reloaded. */
async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(window as unknown as { __sameDocument: boolean }).__sameDocument = true
  })
}

async function sameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true)
}

test.describe('story chat-polish: Discussions list with unread badges and read ticks', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 13: each row shows the unread count of their messages, and one or two ticks when the last message is mine', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openList(page)
    const first = row(page, FIRST)
    const badge = first.getByTestId('conversation-unread')
    await expect(badge).toContainText('3')
    await expect(badge.locator('.chat-sr')).toHaveText('3 messages non lus')
    await expect(first).toHaveAttribute('data-unread', '3')
    await expect(first.getByTestId('conversation-receipt')).toHaveCount(0)
    await expect(first.getByTestId('conversation-preview')).toHaveText('« Et votre famille ? »')
    const second = row(page, SECOND)
    await expect(second.getByTestId('conversation-unread')).toHaveCount(0)
    const tick = second.getByTestId('conversation-receipt')
    await expect(tick).toHaveAttribute('data-state', 'read')
    await expect(tick).toHaveAttribute('title', 'Lu')
    await expect(tick.locator('svg path')).toHaveCount(2)
    await expect(second.getByTestId('conversation-preview')).toHaveText('Vous : « Bonjour, baraka Allahu fik. »')
    // Newest activity first.
    await expect(page.getByTestId('conversation-row')).toHaveCount(2)
    await expect(page.getByTestId('conversation-row').first()).toHaveAttribute('data-conversation-id', FIRST)
    // The link names the unread count for screen readers too.
    await expect(first.getByRole('link')).toHaveAccessibleName('Accéder à la conversation avec Al-Hassan_BF, 3 messages non lus')
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('AC 14: delivered and read events refresh the list once per burst: preview, order, badge and ticks', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openList(page)
    await realtimeReady(page)
    const before = state.listCalls
    state.serial += 1
    state.messages.push(text(state.serial, SECOND, OTHER, 'Une nouvelle question.', 0))
    const refreshed = page.waitForResponse((response) => response.url().endsWith('/v1/conversations'))
    for (let index = 0; index < 3; index += 1) {
      await fire(page, 'message.delivered', { conversation_id: SECOND, message_id: id(state.serial), sender_id: OTHER })
    }
    await refreshed
    await expect(page.getByTestId('conversation-row').first()).toHaveAttribute('data-conversation-id', SECOND)
    await expect(row(page, SECOND).getByTestId('conversation-unread')).toContainText('1')
    await expect(row(page, SECOND).getByTestId('conversation-preview')).toHaveText('« Une nouvelle question. »')
    expect(state.listCalls - before).toBe(1)

    // He reads my last message in the first conversation... after I answer there.
    state.serial += 1
    state.messages.push(text(state.serial, FIRST, ME, 'Elle va bien, merci.', 0))
    const mine = id(state.serial)
    await fire(page, 'message.delivered', { conversation_id: FIRST, message_id: mine, sender_id: ME })
    await expect(row(page, FIRST).getByTestId('conversation-receipt')).toHaveAttribute('data-state', 'sent')
    await expect(row(page, FIRST).getByTestId('conversation-receipt')).toHaveAttribute('title', 'Envoyé')
    state.pointers[FIRST] = { ...state.pointers[FIRST], [HIM]: mine }
    await fire(page, 'conversation.read', { conversation_id: FIRST, account_id: HIM, message_id: mine })
    await expect(row(page, FIRST).getByTestId('conversation-receipt')).toHaveAttribute('data-state', 'read')
  })
})

test.describe('story chat-polish: read receipts and open at the latest message', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 6 / 8: my messages show « Envoyé » until he reads them, then « Lu », live and without a refetch', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await realtimeReady(page)
    const mine = bubbles(page).and(page.locator('[data-mine="true"]'))
    await expect(mine).toHaveCount(2)
    await expect(mine.nth(0).getByTestId('chat-receipt')).toHaveAttribute('data-state', 'read')
    await expect(mine.nth(0).getByTestId('chat-receipt').locator('.chat-sr')).toHaveText('Lu')
    await expect(mine.nth(1).getByTestId('chat-receipt')).toHaveAttribute('data-state', 'sent')
    await expect(mine.nth(1).getByTestId('chat-receipt').locator('.chat-sr')).toHaveText('Envoyé')
    await expect(mine.nth(1).getByTestId('chat-receipt').locator('svg path')).toHaveCount(1)
    // His messages carry no tick.
    await expect(bubbles(page).and(page.locator('[data-mine="false"]')).getByTestId('chat-receipt')).toHaveCount(0)
    await expectAccessible(page)

    let refetched = false
    page.on('request', (request) => {
      if (request.url().includes(`/v1/conversations/${FIRST}/messages`)) refetched = true
    })
    await fire(page, 'conversation.read', { conversation_id: FIRST, account_id: HIM, message_id: id(0x105) })
    await expect(mine.nth(1).getByTestId('chat-receipt')).toHaveAttribute('data-state', 'read')
    await expect(mine.nth(1).getByTestId('chat-receipt').locator('svg path')).toHaveCount(2)
    // A read event for another conversation, or my own pointer, changes no tick here.
    await fire(page, 'conversation.read', { conversation_id: SECOND, account_id: OTHER, message_id: id(0x999) })
    expect(refetched).toBe(false)
  })

  test('AC 4 / 7: the thread opens at the latest message with the composer in view, and marks it read', async ({ page, context, baseURL }) => {
    const state = api()
    for (let index = 0; index < 24; index += 1) state.messages.push(text(0x110 + index, FIRST, index % 2 ? ME : HIM, `Message d'historique ${index + 1} assez long pour prendre de la place à l'écran.`, 29 - index))
    await serveApi(context, baseURL ?? '', state)
    const marked = page.waitForRequest((request) => request.url().endsWith(`/v1/conversations/${FIRST}/read`) && request.method() === 'POST')
    await openThread(page)
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(page.getByLabel('Réponse réfléchie et posée')).toBeInViewport()
    await marked
    expect(state.reads).toEqual([{ conversation_id: FIRST, message_id: id(0x110 + 23) }])
    // The page does not post again for the same message.
    await page.mouse.wheel(0, 50)
    expect(state.reads).toHaveLength(1)
  })

  test('AC 5 / 7: scrolled up, a new message does not move the view; « Nouveaux messages » brings me back and marks it read', async ({ page, context, baseURL }) => {
    const state = api()
    for (let index = 0; index < 24; index += 1) state.messages.push(text(0x110 + index, FIRST, HIM, `Ligne ${index + 1} : un message assez long pour remplir l'écran du téléphone.`, 29 - index))
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await realtimeReady(page)
    await expect.poll(() => state.reads.length).toBe(1)
    // Read history: back to the first message.
    await bubbles(page).first().scrollIntoViewIfNeeded()
    await page.evaluate(() => {
      const box = document.getElementById('thread-scroll')
      if (box && box.scrollHeight > box.clientHeight) box.scrollTop = 0
      else window.scrollTo(0, 0)
    })
    await expect(bubbles(page).last()).not.toBeInViewport()
    state.serial += 1
    state.messages.push(text(state.serial, FIRST, HIM, 'Êtes-vous toujours là ?', 0))
    const fetched = page.waitForResponse((response) => response.url().includes(`/v1/conversations/${FIRST}/messages?after=`))
    await fire(page, 'message.delivered', { conversation_id: FIRST, message_id: id(state.serial), sender_id: HIM })
    await fetched
    const jump = page.getByRole('button', { name: 'Nouveaux messages' })
    await expect(jump).toBeInViewport()
    await expect(bubbles(page).first()).toBeInViewport()
    await expect(bubbles(page).last()).not.toBeInViewport()
    expect(state.reads).toHaveLength(1)
    await expectAccessible(page)
    await jump.click()
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(jump).toBeHidden()
    await expect.poll(() => state.reads.at(-1)).toEqual({ conversation_id: FIRST, message_id: id(state.serial) })

    // At the bottom, a new message keeps the view at the end and is read at once; my own send too.
    state.serial += 1
    state.messages.push(text(state.serial, FIRST, HIM, 'Je vous écoute.', 0))
    await fire(page, 'message.delivered', { conversation_id: FIRST, message_id: id(state.serial), sender_id: HIM })
    await expect(bubbles(page).last()).toContainText('Je vous écoute.')
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(jump).toBeHidden()
    await expect.poll(() => state.reads.at(-1)?.message_id).toBe(id(state.serial))
    await page.getByLabel('Réponse réfléchie et posée').fill('Oui, je suis là.')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(bubbles(page).last()).toContainText('Oui, je suis là.')
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(bubbles(page).last().getByTestId('chat-receipt')).toHaveAttribute('data-state', 'sent')
  })
})

test.describe('story chat-polish: full-screen Chat Photo', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  function withPhotos(state: Api): void {
    state.messages.push(
      { id: id(0x106), conversation_id: FIRST, sender_id: HIM, kind: 'photo', state: 'delivered', text: null, created_at: iso(20), media: { id: id(0xa01), kind: 'photo', width: 160, height: 120, blur_url: '/v1/media/get?token=blur-1' } },
      { id: id(0x107), conversation_id: FIRST, sender_id: ME, kind: 'photo', state: 'delivered', text: null, created_at: iso(10), media: { id: id(0xa02), kind: 'photo', width: 160, height: 120, blur_url: '/v1/media/get?token=blur-2' } },
    )
  }

  test('AC 1 / 2 / 3: the recipient and the sender open a Photo full screen, and close it with the button, Escape or the backdrop', async ({ page, context, baseURL }) => {
    await setLite(context, false)
    const state = api()
    withPhotos(state)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const theirs = page.getByRole('button', { name: /Photo de Al-Hassan_BF/ })
    await expect(theirs).toBeVisible()
    await expect(theirs.getByRole('img', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()
    const callsBefore = state.mediaCalls.length

    await theirs.click()
    const viewer = page.getByRole('dialog', { name: 'Photo de Al-Hassan_BF' })
    await expect(viewer).toBeVisible()
    await expect(viewer).toHaveAttribute('aria-modal', 'true')
    const image = viewer.getByRole('img', { name: 'Photo de Al-Hassan_BF' })
    await expect(image).toBeVisible()
    // Uncropped and fitted to the screen.
    const fit = await image.evaluate((node) => {
      const img = node as HTMLImageElement
      const box = img.getBoundingClientRect()
      return { ratio: box.width / box.height, natural: img.naturalWidth / img.naturalHeight, fits: box.right <= window.innerWidth && box.bottom <= window.innerHeight, fit: getComputedStyle(img).objectFit }
    })
    expect(fit.fits).toBe(true)
    expect(Math.abs(fit.ratio - fit.natural)).toBeLessThan(0.02)
    expect(fit.fit).toBe('contain')
    const close = viewer.getByRole('button', { name: 'Fermer la photo' })
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(close).toBeFocused()
    // The page behind does not scroll while the viewer is open.
    expect(await page.evaluate(() => document.documentElement.classList.contains('chat-viewer-open'))).toBe(true)
    await expectAccessible(page)
    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
    await expect(theirs).toBeFocused()

    // Enter on the focused Photo opens it again; the close button closes it.
    await page.keyboard.press('Enter')
    await expect(viewer).toBeVisible()
    await close.click()
    await expect(viewer).toBeHidden()
    await expect(theirs).toBeFocused()

    // The sender opens her own Photo; a tap on the backdrop closes it.
    const mine = page.getByRole('button', { name: /Votre photo/ })
    await mine.click()
    const own = page.getByRole('dialog', { name: 'Votre photo' })
    await expect(own).toBeVisible()
    await page.mouse.click(5, (page.viewportSize()?.height ?? 600) - 5)
    await expect(own).toBeHidden()
    await expect(mine).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.classList.contains('chat-viewer-open'))).toBe(false)
    // Opening the viewer fetched nothing: it shows the copy already downloaded through the media route.
    expect(state.mediaCalls.slice(callsBefore)).toEqual([])
    expect(state.mediaCalls.filter((call) => call.startsWith('access'))).toEqual([`access ${id(0x106)}`, `access ${id(0x107)}`])
    expect(state.mediaCalls.join(' ')).not.toContain('original')
  })

  test('AC 3: in Lite mode the Photo stays blurred and cannot open until « Afficher la photo »', async ({ page, context, baseURL }) => {
    await setLite(context, true)
    const state = api()
    withPhotos(state)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const photo = bubbles(page).and(page.locator(`[data-message-id="${id(0x106)}"]`)).getByTestId('chat-photo')
    await expect(photo.getByTestId('chat-photo-blur')).toBeVisible()
    await expect(photo.getByTestId('chat-photo-open')).toHaveCount(0)
    expect(state.mediaCalls.filter((call) => call.startsWith('access'))).toEqual([])
    await photo.getByRole('button', { name: 'Afficher la photo' }).click()
    await photo.getByTestId('chat-photo-open').click()
    await expect(page.getByRole('dialog', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()
    expect(state.mediaCalls.filter((call) => call.startsWith('access'))).toEqual([`access ${id(0x106)}`])
  })
})

test.describe('story chat-polish: split view from 768 px and in-page navigation', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 12 / 15: list on the left, thread on the right; switching threads keeps the page, the URL and the history', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the split view needs a wide window')
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openList(page)
    await expect(page.getByRole('heading', { level: 1, name: "Discussions Ta'aruf" })).toBeVisible()
    await expect(page.getByText("Sélectionnez une discussion pour l'afficher ici.")).toBeVisible()
    await expectAccessible(page)
    await markPage(page)

    const loaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${FIRST}/messages`))
    await row(page, FIRST).getByRole('link').click()
    await loaded
    await expect(page).toHaveURL(new RegExp(`/discussions/${FIRST}$`))
    await expect(page).toHaveTitle('AnKanu • Discussion')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Al-Hassan_BF, 29 ans')
    await expect(page.getByRole('heading', { level: 2, name: "Discussions Ta'aruf" })).toBeVisible()
    await expect(row(page, FIRST).getByRole('link')).toHaveAttribute('aria-current', 'page')
    await expect(bubbles(page)).toHaveCount(5)
    // Reading clears my badge in the list.
    await expect(row(page, FIRST).getByTestId('conversation-unread')).toHaveCount(0)
    await expect(page.getByLabel('Réponse réfléchie et posée')).toBeInViewport()
    // The back link is for phones; the list is right there.
    await expect(page.getByRole('link', { name: 'Retour aux discussions' })).toBeHidden()
    expect(await sameDocument(page)).toBe(true)
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)

    // A draft stays with its thread.
    await page.getByLabel('Réponse réfléchie et posée').fill('Brouillon pour Al-Hassan')
    await row(page, SECOND).getByRole('link').click()
    await expect(page).toHaveURL(new RegExp(`/discussions/${SECOND}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oumar_K, 31 ans')
    await expect(bubbles(page)).toHaveCount(2)
    await expect(page.getByLabel('Réponse réfléchie et posée')).toHaveValue('')
    await expect(row(page, SECOND).getByRole('link')).toHaveAttribute('aria-current', 'page')
    await expect(row(page, FIRST).getByRole('link')).not.toHaveAttribute('aria-current', 'page')

    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/discussions/${FIRST}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Al-Hassan_BF, 29 ans')
    await expect(page.getByLabel('Réponse réfléchie et posée')).toHaveValue('Brouillon pour Al-Hassan')
    await page.goBack()
    await expect(page).toHaveURL(/\/discussions$/)
    await expect(page.getByText("Sélectionnez une discussion pour l'afficher ici.")).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL(new RegExp(`/discussions/${FIRST}$`))
    await expect(bubbles(page)).toHaveCount(5)
    expect(await sameDocument(page)).toBe(true)

    // A deep link opens the same split view with the row marked.
    await openThread(page, SECOND)
    await expect(row(page, SECOND).getByRole('link')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oumar_K, 31 ans')
  })

  test('AC 12 / 15 on a phone: the list and the thread stay separate screens, moved between without a reload', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phone layout')
    await serveApi(context, baseURL ?? '', api())
    await openList(page)
    await markPage(page)
    await expect(page.getByText("Sélectionnez une discussion pour l'afficher ici.")).toBeHidden()
    await row(page, FIRST).getByRole('link').click()
    await expect(page).toHaveURL(new RegExp(`/discussions/${FIRST}$`))
    await expect(bubbles(page)).toHaveCount(5)
    await expect(page.getByTestId('conversation-row').first()).toBeHidden()
    await expect(page.getByLabel('Réponse réfléchie et posée')).toBeInViewport()
    await page.getByRole('link', { name: 'Retour aux discussions' }).click()
    await expect(page).toHaveURL(/\/discussions$/)
    await expect(page.getByTestId('conversation-row')).toHaveCount(2)
    await expect(row(page, FIRST).getByTestId('conversation-unread')).toHaveCount(0)
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/discussions/${FIRST}$`))
    await expect(bubbles(page)).toHaveCount(5)
    expect(await sameDocument(page)).toBe(true)
    await expectAccessible(page)
  })

  test('fits every factory width: list, split thread, open viewer', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await setLite(context, false)
    const state = api()
    state.messages.push({ id: id(0x106), conversation_id: FIRST, sender_id: HIM, kind: 'photo', state: 'delivered', text: null, created_at: iso(20), media: { id: id(0xa01), kind: 'photo', width: 160, height: 120, blur_url: '/v1/media/get?token=blur-1' } })
    await serveApi(context, baseURL ?? '', state)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openList(page)
      await expectNoHorizontalOverflow(page)
      await openThread(page)
      await expectNoHorizontalOverflow(page)
      await expect(page.getByLabel('Réponse réfléchie et posée')).toBeInViewport()
      await page.getByRole('button', { name: /Photo de Al-Hassan_BF/ }).click()
      await expect(page.getByRole('dialog', { name: 'Photo de Al-Hassan_BF' })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.keyboard.press('Escape')
    }
  })
})
