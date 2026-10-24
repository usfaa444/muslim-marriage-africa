import type { BrowserContext, Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'
import { expect } from './fixtures'

// Shared mock for the chat-polish specs (story chat-polish and its QA gates): like chat.spec.ts, the tests answer every
// /v1 call themselves (the web-only dev server has no API) and replace the Socket.IO client with a fake a test drives.
// Stub cookies are a dev-build seam.
export const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

export const ME = '01990000-0000-7000-8000-0000000000e1'
export const HIM = '01990000-0000-7000-8000-0000000000e2'
export const OTHER = '01990000-0000-7000-8000-0000000000e3'
export const FIRST = '01990000-0000-7000-8000-0000000000c1'
export const SECOND = '01990000-0000-7000-8000-0000000000c2'

export type Item = {
  id: string
  conversation_id: string
  sender_id: string
  kind: 'text' | 'photo'
  state: 'delivered'
  text: string | null
  created_at: string
  media?: Record<string, unknown>
}

export type Api = {
  messages: Item[]
  /** Read pointers by conversation and account. */
  pointers: Record<string, Record<string, string>>
  reads: Array<{ conversation_id: string; message_id: string }>
  listCalls: number
  mediaCalls: string[]
  serial: number
  /** Who is on the other side of each conversation; a test may replace a pseudonym (hostile content). */
  people: Record<string, Person>
}

export type Person = { other_id: string; pseudonym: string; age: number; city: string }

export const PEOPLE: Record<string, Person> = {
  [FIRST]: { other_id: HIM, pseudonym: 'Al-Hassan_BF', age: 29, city: 'ouagadougou' },
  [SECOND]: { other_id: OTHER, pseudonym: 'Oumar_K', age: 31, city: 'koudougou' },
}

export function crc32(bytes: Buffer): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

export function png(width: number, height: number, rgb: [number, number, number]): Buffer {
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

export const BLUR = png(8, 6, [190, 175, 150])
export const CLEAR = png(160, 120, [40, 90, 140])

export const FAKE_IO = `(function () {
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

export function id(serial: number): string {
  return `01990000-0000-7000-8000-${serial.toString(16).padStart(12, '0')}`
}

export function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

export function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

export function text(serial: number, conversation: string, sender: string, body: string, minutesAgo: number): Item {
  return { id: id(serial), conversation_id: conversation, sender_id: sender, kind: 'text', state: 'delivered', text: body, created_at: iso(minutesAgo) }
}

/** First: two of mine then three of his I have not read. Second: my last message, read by him. */
export function api(): Api {
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
    people: { ...PEOPLE },
  }
}

export function inThread(state: Api, conversation: string): Item[] {
  return state.messages.filter((item) => item.conversation_id === conversation).sort((a, b) => a.id.localeCompare(b.id))
}

export function listItems(state: Api) {
  return Object.entries(state.people)
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

export async function serveApi(context: BrowserContext, baseURL: string, state: Api): Promise<void> {
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
    const person = thread ? state.people[thread[1] ?? ''] : undefined
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
        const before = url.searchParams.get('before')
        const all = inThread(state, conversation)
        // A page of 30, newest last: the latest page, the page before a message, or everything after one.
        const older = before ? all.filter((item) => item.id < before) : all
        const items = after ? all.filter((item) => item.id > after) : older.slice(-30)
        await route.fulfill(json({ items: items.map((item) => ({ ...item, mine: item.sender_id === ME })), has_more: !after && older.length > 30 }))
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

export async function fire(page: Page, name: string, payload: unknown): Promise<void> {
  await page.evaluate(([event, body]) => (window as unknown as { __fake: { fire(name: string, payload: unknown): void } }).__fake.fire(event as string, body), [name, payload] as const)
}

export async function realtimeReady(page: Page): Promise<void> {
  await page.waitForFunction(() => ((window as unknown as { __fake?: { sockets: unknown[] } }).__fake?.sockets.length ?? 0) === 1)
}

export async function openList(page: Page): Promise<void> {
  const listed = page.waitForResponse((response) => response.url().endsWith('/v1/conversations'))
  await page.goto('/discussions')
  await listed
  await expect(page.locator('#discussions')).toHaveAttribute('aria-busy', 'false')
}

export async function openThread(page: Page, conversation = FIRST): Promise<void> {
  const loaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${conversation}/messages`))
  await page.goto(`/discussions/${conversation}`)
  await loaded
  await expect(page.locator('#chat-thread')).toHaveAttribute('aria-busy', 'false')
}

export function bubbles(page: Page) {
  return page.getByRole('log', { name: 'Messages' }).getByTestId('chat-bubble')
}

export function row(page: Page, conversation: string) {
  return page.locator(`[data-testid="conversation-row"][data-conversation-id="${conversation}"]`)
}

/** Lite off unless a test asks for it (the CI machine is not a 2G phone). */
export async function setLite(context: BrowserContext, on: boolean): Promise<void> {
  await context.addInitScript((value) => {
    try {
      localStorage.setItem('ankanu_lite', value)
    } catch {
      // No storage: the page falls back to its automatic rule.
    }
  }, on ? '1' : '0')
}

/** A value set on `window` survives only while the page is not reloaded. */
export async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(window as unknown as { __sameDocument: boolean }).__sameDocument = true
  })
}

export async function sameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true)
}
