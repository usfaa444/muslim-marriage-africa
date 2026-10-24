import type { BrowserContext, Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Screens 20 and 21, Discussions and Chat thread (Stories 5.1, 5.2). The pages render for the `web` stub session
// without an API call on the server; these tests answer every browser call to /v1 themselves, keep the messages the
// way the API would, and replace the Socket.IO client script with a small fake so a test can push `message.delivered`
// and `conversation.typing` events and read what the page emits. Stub cookies are a dev-build seam only.
const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

const ME = '01990000-0000-7000-8000-0000000000e1'
const HIM = '01990000-0000-7000-8000-0000000000e2'
const OTHER = '01990000-0000-7000-8000-0000000000e3'
const CONVERSATION = '01990000-0000-7000-8000-0000000000c1'
const SECOND = '01990000-0000-7000-8000-0000000000c2'

/** Copy a member must never see on Chat (AD-10, DESIGN.md chat-bubble). */
// Story chat-polish brought read receipts (« Lu », « messages non lus ») on purpose; hold and scan copy stays banned.
const HOLD_COPY = /En cours de vérification|vérification|modération|scan|retenu|en attente de/i

type Message = { id: string; conversation_id: string; sender_id: string; mine?: boolean; kind: 'text'; state: 'delivered'; text: string; created_at: string }

type Api = {
  conversations: Array<Record<string, unknown>>
  messages: Message[]
  posts: Array<{ kind: unknown; text: unknown }>
  available: boolean
  closed?: boolean
  listStatus?: number
  threadStatus?: number
  failNextPost?: { status: number; body: unknown }
  postDelayMs?: number
  /** Added to every mocked /v1 answer: requests a route fulfils never reach the CDP network throttle. */
  latencyMs?: number
  serial: number
  /** Story chat-polish: every POST …/read the page sent. */
  reads: Array<{ conversation_id: string; message_id: string }>
}

const OTHER_AVAILABLE = {
  available: true,
  age: 29,
  city: 'ouagadougou',
  verified: true,
  photo: null,
}

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

function messageId(serial: number): string {
  return `01990000-0000-7000-8000-${serial.toString(16).padStart(12, '0')}`
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

function api(): Api {
  return {
    conversations: [
      {
        id: CONVERSATION,
        invite_id: '01990000-0000-7000-8000-0000000000d1',
        stage: 'chat',
        other_id: HIM,
        pseudonym: 'Al-Hassan_BF',
        other: OTHER_AVAILABLE,
        last_message: { id: messageId(2), mine: false, kind: 'text', preview: "J'ai bien pris note de votre projet de foyer.", created_at: iso(25) },
      },
      {
        id: SECOND,
        invite_id: '01990000-0000-7000-8000-0000000000d2',
        stage: 'chat',
        other_id: OTHER,
        pseudonym: 'Oumar_K',
        other: { ...OTHER_AVAILABLE, age: 31, city: 'koudougou', verified: false },
        last_message: null,
      },
    ],
    messages: [
      { id: messageId(1), conversation_id: CONVERSATION, sender_id: ME, kind: 'text', state: 'delivered', text: 'As-salāmu ʿalaykum.', created_at: iso(60 * 26) },
      { id: messageId(2), conversation_id: CONVERSATION, sender_id: HIM, kind: 'text', state: 'delivered', text: "J'ai bien pris note de votre projet de foyer.", created_at: iso(25) },
    ],
    posts: [],
    available: true,
    serial: 10,
    reads: [],
  }
}

/** The fake Socket.IO client: `window.io()` returns a socket a test drives with `window.__fake.fire(name, payload)`. */
const FAKE_IO = `(function () {
  var fake = { sockets: [], emitted: [] }
  window.__fake = fake
  fake.fire = function (name, payload) { fake.sockets.forEach(function (socket) { (socket.handlers[name] || []).forEach(function (fn) { fn(payload) }) }) }
  window.io = function (options) {
    var socket = { options: options, handlers: {}, connected: true }
    socket.on = function (name, fn) { (socket.handlers[name] = socket.handlers[name] || []).push(fn); return socket }
    socket.emit = function (name, payload) { fake.emitted.push({ name: name, payload: payload, at: Date.now() }) }
    socket.disconnect = function () { socket.connected = false }
    fake.sockets.push(socket)
    setTimeout(function () { fake.fire('connect') }, 0)
    return socket
  }
})()`

function view(api: Api, message: Message): Message {
  return { ...message, mine: message.sender_id === ME }
}

async function serveApi(context: BrowserContext, baseURL: string, state: Api): Promise<void> {
  await context.addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL }])
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (state.latencyMs) await new Promise((resolve) => setTimeout(resolve, state.latencyMs))
    if (url.pathname === '/v1/realtime/socket.io.min.js') {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE_IO })
      return
    }
    if (url.pathname === '/v1/conversations' && method === 'GET') {
      if (state.listStatus && state.listStatus !== 200) {
        await route.fulfill(json({ error: { code: 'UNHANDLED', message: 'Request failed', details: null, request_id: 'r', retryable: true } }, state.listStatus))
        return
      }
      await route.fulfill(json({ count: state.conversations.length, items: state.conversations }))
      return
    }
    const read = /^\/v1\/conversations\/([^/]+)\/read$/.exec(url.pathname)
    if (read && method === 'POST') {
      const body = request.postDataJSON() as { message_id: string }
      state.reads.push({ conversation_id: read[1] ?? '', message_id: body.message_id })
      await route.fulfill(json({ read: { message_id: body.message_id } }))
      return
    }
    const thread = /^\/v1\/conversations\/([^/]+)(\/messages)?$/.exec(url.pathname)
    if (thread) {
      const conversation = state.conversations.find((item) => item.id === thread[1])
      if (!conversation) {
        await route.fulfill(json({ error: { code: 'NOT_FOUND', message: "Cette discussion n'existe pas.", details: null, request_id: 'r', retryable: false } }, 404))
        return
      }
      if (state.threadStatus && state.threadStatus !== 200 && method === 'GET') {
        const error =
          state.threadStatus === 401
            ? { code: 'UNAUTHENTICATED', message: 'Authentification requise.', details: null, request_id: 'r', retryable: false }
            : { code: 'UNHANDLED', message: 'Request failed', details: null, request_id: 'r', retryable: true }
        await route.fulfill(json({ error }, state.threadStatus))
        return
      }
      if (!thread[2] && method === 'GET') {
        const other = state.available ? conversation['other'] : { available: false }
        await route.fulfill(json({ conversation: { id: conversation['id'], stage: 'chat', other_id: conversation['other_id'], pseudonym: conversation['pseudonym'], other, closed: !!state.closed }, me: { id: ME } }))
        return
      }
      if (thread[2] && method === 'GET') {
        const all = state.messages.filter((item) => item.conversation_id === thread[1])
        const after = url.searchParams.get('after')
        const items = after ? all.filter((item) => item.id > after) : all
        await route.fulfill(json({ items: items.map((item) => view(state, item)), has_more: false }))
        return
      }
      if (thread[2] && method === 'POST') {
        const body = request.postDataJSON() as { kind: unknown; text: unknown }
        state.posts.push(body)
        if (state.postDelayMs) await new Promise((resolve) => setTimeout(resolve, state.postDelayMs))
        if (state.failNextPost) {
          const fail = state.failNextPost
          delete state.failNextPost
          await route.fulfill(json(fail.body, fail.status))
          return
        }
        state.serial += 1
        const message: Message = { id: messageId(state.serial), conversation_id: thread[1] ?? '', sender_id: ME, kind: 'text', state: 'delivered', text: String(body.text).trim(), created_at: new Date().toISOString() }
        state.messages.push(message)
        await route.fulfill(json({ message: view(state, message) }, 201))
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

async function openList(page: Page): Promise<void> {
  const listed = page.waitForResponse((response) => response.url().endsWith('/v1/conversations'))
  await page.goto('/discussions')
  await listed
  await expect(page.locator('#discussions')).toHaveAttribute('aria-busy', 'false')
}

async function openThread(page: Page, id = CONVERSATION): Promise<void> {
  const loaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${id}/messages`))
  await page.goto(`/discussions/${id}`)
  await loaded
  await expect(page.locator('#chat-thread')).toHaveAttribute('aria-busy', 'false')
}

function bubbles(page: Page) {
  return page.getByRole('log', { name: 'Messages' }).getByTestId('chat-bubble')
}

test.describe('Discussions list (screen 20)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 5.1-1: lists each Chat with the other member, the last message and a link, with no hold badge', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openList(page)
    await expect(page.getByRole('heading', { level: 1, name: "Discussions Ta'aruf" })).toBeVisible()
    const rows = page.getByTestId('conversation-row')
    await expect(rows).toHaveCount(2)
    const first = rows.first()
    await expect(first.getByRole('heading', { level: 2 })).toHaveText('Al-Hassan_BF, 29 ans')
    // chat-polish-2 (Faycal): the card shows what matters for the chat only; city and « Identité vérifiée » live on the profile.
    await expect(first).not.toContainText('Ouagadougou')
    await expect(first).not.toContainText('Identité vérifiée')
    await expect(first.getByTestId('conversation-preview')).toHaveText("« J'ai bien pris note de votre projet de foyer. »")
    await expect(first.locator('time')).toHaveText(/^\d{2}:\d{2}$/)
    await expect(first.getByRole('link', { name: 'Accéder à la conversation avec Al-Hassan_BF' })).toHaveAttribute('href', `/discussions/${CONVERSATION}`)
    const second = rows.nth(1)
    await expect(second.getByTestId('conversation-preview')).toHaveText("Aucun message pour l'instant.")
    await expect(second).not.toContainText('Identité vérifiée')
    await expect(page.getByText(/Registre des échanges/)).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText(HOLD_COPY)
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('QA F5: a row for a member who is no longer available says « Profil indisponible » and has no link', async ({ page, context, baseURL }) => {
    const state = api()
    state.conversations[0] = { ...state.conversations[0], other: { available: false } }
    await serveApi(context, baseURL ?? '', state)
    await openList(page)
    const gone = page.getByTestId('conversation-row').first()
    await expect(gone.getByRole('heading', { level: 2 })).toHaveText('Profil indisponible')
    await expect(gone).not.toContainText('Al-Hassan_BF')
    await expect(gone.getByRole('link')).toHaveCount(0)
    await expect(page.getByTestId('conversation-row').nth(1).getByRole('link', { name: 'Accéder à la conversation avec Oumar_K' })).toBeVisible()
    await expectAccessible(page)
  })

  test('QA F1: the row link is named by its visible words, with no aria-label and the icon kept out of the name', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openList(page)
    const link = page.getByTestId('conversation-row').first().getByRole('link')
    await expect(link).toHaveAccessibleName('Accéder à la conversation avec Al-Hassan_BF')
    await expect(link).not.toHaveAttribute('aria-label', /.*/)
    // Without the icon font the ligature is visible text; the rule must still hold (axe label-content-name-mismatch).
    await page.addStyleTag({ content: '.material-symbols-outlined { font-family: serif !important; }' })
    await expectAccessible(page)
  })

  test('shows the empty state with a way to the invitations, and a retry after a load error', async ({ page, context, baseURL }) => {
    const state = api()
    state.conversations = []
    state.listStatus = 503
    await serveApi(context, baseURL ?? '', state)
    await openList(page)
    await expect(page.getByRole('alert')).toHaveText('Chargement impossible. Vérifiez votre connexion et réessayez.')
    state.listStatus = 200
    const again = page.waitForResponse((response) => response.url().endsWith('/v1/conversations'))
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await again
    await expect(page.getByText('Aucune discussion.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voir mes invitations' })).toHaveAttribute('href', '/invitations')
    await expectAccessible(page)
  })

  test('a delivered event refreshes the list (ids only, the preview comes from the API)', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openList(page)
    await page.waitForFunction(() => (window as unknown as { __fake?: { sockets: unknown[] } }).__fake?.sockets.length === 1)
    ;(state.conversations[1] as { last_message: unknown }).last_message = { id: messageId(20), mine: false, kind: 'text', preview: 'Baraka Allahu fikoum.', created_at: new Date().toISOString() }
    const refreshed = page.waitForResponse((response) => response.url().endsWith('/v1/conversations'))
    await page.evaluate((id) => (window as unknown as { __fake: { fire(name: string, payload: unknown): void } }).__fake.fire('message.delivered', { conversation_id: id, message_id: 'x', sender_id: 'y' }), SECOND)
    await refreshed
    await expect(page.getByTestId('conversation-row').nth(1).getByTestId('conversation-preview')).toHaveText('« Baraka Allahu fikoum. »')
  })

  test('fits every factory width', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await serveApi(context, baseURL ?? '', api())
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openList(page)
      await expectNoHorizontalOverflow(page)
    }
  })
})

test.describe('Chat thread (screen 21)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 5.1-1: the thread opens within 4 s with delivered bubbles, day separators, and no scan or hold copy', async ({ page, context, baseURL }, testInfo) => {
    // Pin the two messages to yesterday noon and earlier today (Ouagadougou is UTC), so the day
    // separators read « Hier » / « Aujourd'hui » at any time of day, including just after midnight.
    const fixture = api()
    const todayStart = new Date().setUTCHours(0, 0, 0, 0)
    const [first, second] = fixture.messages
    if (first) first.created_at = new Date(todayStart - 12 * 3_600_000).toISOString()
    if (second) second.created_at = new Date(Math.max(todayStart, Date.now() - 25 * 60_000)).toISOString()
    await serveApi(context, baseURL ?? '', fixture)
    // Warm the dev server's first compile so the timing below measures the page, not the bundler.
    await openThread(page)
    const started = Date.now()
    await openThread(page)
    await expect(bubbles(page)).toHaveCount(2)
    expect(Date.now() - started).toBeLessThan(4000)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Al-Hassan_BF, 29 ans')
    await expect(page.getByRole('img', { name: 'Identité vérifiée' })).toBeVisible()
    await expect(page.getByText(/Étape/)).toHaveCount(0)
    // Story chat-polish: from 768 px the list sits beside the thread, so the back link is for phones only.
    if (testInfo.project.name === 'mobile') await expect(page.getByRole('link', { name: 'Retour aux discussions' })).toHaveAttribute('href', '/discussions')
    else await expect(page.getByTestId('conversation-row')).toHaveCount(2)
    await expect(bubbles(page).first()).toHaveAttribute('data-mine', 'true')
    await expect(bubbles(page).nth(1)).toHaveAttribute('data-mine', 'false')
    await expect(bubbles(page).nth(1)).toContainText("J'ai bien pris note de votre projet de foyer.")
    await expect(page.getByTestId('chat-day')).toHaveText(['Hier', "Aujourd'hui"])
    // The meta line is the time only.
    await expect(bubbles(page).nth(1).locator('time')).toHaveText(/^\d{2}:\d{2}$/)
    await expect(page.locator('main')).not.toContainText(HOLD_COPY)
    // Story chat-polish (Mac QA round 3): a phone thread shows a short placeholder, the split view the full one.
    await expect(page.getByLabel('Votre message')).toHaveAttribute('placeholder', testInfo.project.name === 'mobile' ? 'Votre message…' : 'Rédigez votre message dans le respect des convenances...')
    await expect(page.getByText("Règle d'or AnKanu :")).toBeVisible()
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('AC 5.2-1: send posts kind text once, the bubble appears as delivered at once, and the box clears', async ({ page, context, baseURL }) => {
    const state = api()
    state.postDelayMs = 300
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const input = page.getByLabel('Votre message')
    const send = page.getByRole('button', { name: 'Envoyer' })
    await expect(send).toBeDisabled()
    await input.fill('  Wa alaykum salam. Qu’Allah bénisse cette démarche.  ')
    await expect(send).toBeEnabled()
    const posted = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${CONVERSATION}/messages`) && response.request().method() === 'POST')
    await send.dblclick()
    await posted
    expect(state.posts).toEqual([{ kind: 'text', text: 'Wa alaykum salam. Qu’Allah bénisse cette démarche.' }])
    await expect(bubbles(page)).toHaveCount(3)
    await expect(bubbles(page).last()).toHaveAttribute('data-mine', 'true')
    await expect(bubbles(page).last()).toContainText('Wa alaykum salam. Qu’Allah bénisse cette démarche.')
    await expect(bubbles(page).last()).not.toContainText(HOLD_COPY)
    await expect(input).toHaveValue('')
    await expect(page.locator('#thread-status')).toHaveText('Message envoyé')
    // Ctrl+Enter sends too.
    await input.fill('Deuxième message')
    await input.press('Control+Enter')
    await expect(bubbles(page)).toHaveCount(4)
    expect(state.posts).toHaveLength(2)
    await expectAccessible(page)
  })

  test('a refused send keeps the text and shows the API message; a network failure shows the connection message', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const input = page.getByLabel('Votre message')
    state.failNextPost = { status: 409, body: { error: { code: 'UNHANDLED', message: 'Cette discussion est fermée.', details: { reason: 'conversation_closed' }, request_id: 'r', retryable: false } } }
    await input.fill('Encore là ?')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByRole('alert')).toHaveText('Cette discussion est fermée.')
    await expect(input).toHaveValue('Encore là ?')
    await expect(bubbles(page)).toHaveCount(2)
    // The 409 closes the composer as well (QA F3).
    await expect(input).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
    await expectAccessible(page)
  })

  test('QA F3: a paused or ended conversation says so up front and the composer is disabled before any send', async ({ page, context, baseURL }) => {
    const state = api()
    state.closed = true
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(page.locator('#thread-closed')).toHaveText('Cette discussion est fermée.')
    await expect(page.locator('#thread-closed')).toBeVisible()
    await expect(bubbles(page)).toHaveCount(2)
    await expect(page.getByLabel('Votre message')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
    expect(state.posts).toHaveLength(0)
    await expectAccessible(page)
  })

  test('QA F4: a session that expires mid-thread offers « Se reconnecter » and keeps the draft for the next visit', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const input = page.getByLabel('Votre message')
    state.failNextPost = { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.', details: null, request_id: 'r', retryable: false } } }
    await input.fill('Mon message gardé')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Votre session a expiré. Reconnectez-vous : votre message est gardé pour cette discussion.')
    await expect(alert.getByRole('link', { name: 'Se reconnecter' })).toHaveAttribute('href', '/auth')
    await expect(input).toHaveValue('Mon message gardé')
    await expectAccessible(page)

    // A thread load that finds the session gone offers the same way back.
    state.threadStatus = 401
    await openThread(page)
    await expect(page.locator('#thread-load-error-text')).toHaveText('Votre session a expiré. Reconnectez-vous : votre message est gardé pour cette discussion.')
    await expect(page.getByRole('link', { name: 'Se reconnecter' })).toHaveAttribute('href', '/auth')

    // Signed in again, the same thread gives the draft back once.
    state.threadStatus = 200
    await openThread(page)
    await expect(input).toHaveValue('Mon message gardé')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(bubbles(page)).toHaveCount(3)
    await openThread(page)
    await expect(input).toHaveValue('')
  })

  test('AC 5.2-1 realtime: a delivered event fetches only the new message and shows it in the log', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await page.waitForFunction(() => (window as unknown as { __fake?: { sockets: unknown[] } }).__fake?.sockets.length === 1)
    state.serial += 1
    const id = messageId(state.serial)
    state.messages.push({ id, conversation_id: CONVERSATION, sender_id: HIM, kind: 'text', state: 'delivered', text: 'Baraka Allahu fikoum.', created_at: new Date().toISOString() })
    const fetched = page.waitForResponse((response) => response.url().includes(`/messages?after=${messageId(2)}`))
    await page.evaluate(
      (payload) => (window as unknown as { __fake: { fire(name: string, payload: unknown): void } }).__fake.fire('message.delivered', payload),
      { conversation_id: CONVERSATION, message_id: id, sender_id: HIM },
    )
    await fetched
    await expect(bubbles(page)).toHaveCount(3)
    await expect(bubbles(page).last()).toContainText('Baraka Allahu fikoum.')
    await expect(bubbles(page).last()).toHaveAttribute('data-mine', 'false')
    // An event for another conversation changes nothing.
    await page.evaluate(
      (payload) => (window as unknown as { __fake: { fire(name: string, payload: unknown): void } }).__fake.fire('message.delivered', payload),
      { conversation_id: SECOND, message_id: messageId(99), sender_id: OTHER },
    )
    await expect(bubbles(page)).toHaveCount(3)
  })

  test('AC 5.1-2: typing shows « <pseudonyme> écrit… » and clears, and the page emits typing at most every 1.5 s', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openThread(page)
    await page.waitForFunction(() => (window as unknown as { __fake?: { sockets: unknown[] } }).__fake?.sockets.length === 1)
    await page.evaluate(
      (payload) => (window as unknown as { __fake: { fire(name: string, payload: unknown): void } }).__fake.fire('conversation.typing', payload),
      { conversation_id: CONVERSATION, account_id: HIM },
    )
    const typing = page.locator('#thread-typing')
    await expect(typing).toHaveText('Al-Hassan_BF écrit…')
    await expect(typing).toHaveAttribute('role', 'status')
    await expect(typing).toHaveText('', { timeout: 6000 })
    // My own echo is never shown as typing.
    await page.evaluate(
      (payload) => (window as unknown as { __fake: { fire(name: string, payload: unknown): void } }).__fake.fire('conversation.typing', payload),
      { conversation_id: CONVERSATION, account_id: ME },
    )
    await expect(typing).toHaveText('')

    const input = page.getByLabel('Votre message')
    await input.pressSequentially('Bonjour', { delay: 50 })
    const emitted = await page.evaluate(() => (window as unknown as { __fake: { emitted: Array<{ name: string; payload: unknown }> } }).__fake.emitted)
    expect(emitted.length).toBeGreaterThanOrEqual(1)
    expect(emitted.length).toBeLessThanOrEqual(2)
    expect(emitted[0]).toMatchObject({ name: 'conversation.typing', payload: { conversation_id: CONVERSATION } })
  })

  test('a conversation that is not mine says it does not exist; an unavailable member disables the composer', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    const missing = '01990000-0000-7000-8000-0000000000ff'
    await openThread(page, missing)
    await expect(page.getByRole('alert')).toHaveText("Cette discussion n'existe pas.")
    await expect(page.locator('#thread-missing').getByRole('link', { name: 'Retour aux discussions' })).toHaveAttribute('href', '/discussions')
    await expectAccessible(page)

    state.available = false
    await openThread(page)
    await expect(page.getByText("Ce profil n'est plus disponible.")).toBeVisible()
    await expect(page.getByLabel('Votre message')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  })

  test('a malformed thread id goes back to the list', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await page.goto('/discussions/pas-un-identifiant')
    await expect(page).toHaveURL(/\/discussions$/)
  })

  test('AC 5.1-1 / NFR-005 on a throttled 3G profile: the thread opens within 4 s and a send acknowledges within 2 s (first-party payload)', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'throttled run on the phone profile')
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    // First-party cost only: the Tailwind Play CDN script and Google Fonts that every v2 page loads from its Stitch
    // head are answered with stubs here (this sandbox cannot reach them). Their weight on 3G is a site-wide known issue
    // listed in the QA handoff, not part of this story's thread payload.
    for (const host of ['https://cdn.tailwindcss.com/**', 'https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**']) {
      // The Tailwind stub still defines the global, since each page's inline `tailwind.config = …` assigns to it.
      const tailwind = host.includes('tailwind')
      await context.route(host, (route) => route.fulfill({ status: 200, contentType: tailwind ? 'application/javascript' : 'text/css', body: tailwind ? 'window.tailwind = {}' : '' }))
    }
    await openThread(page)
    const cdp = await context.newCDPSession(page)
    // Chrome DevTools « Fast 3G »: 562.5 ms RTT, 1.44 Mbit/s down, 675 kbit/s up.
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: (1.44 * 1024 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 })
    // The mocked API answers are fulfilled by the test, outside the throttle: give each one the same 3G round trip
    // plus a server allowance, so the page pays for its HTML and its two parallel reads (and one POST on send).
    state.latencyMs = 562.5 + 150
    const started = Date.now()
    await openThread(page)
    await expect(bubbles(page)).toHaveCount(2)
    const openMs = Date.now() - started
    testInfo.annotations.push({ type: 'timing', description: `thread open on Fast 3G: ${openMs} ms` })
    expect(openMs).toBeLessThan(4000)
    await page.getByLabel('Votre message').fill('Sur réseau lent.')
    const sendStarted = Date.now()
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(bubbles(page)).toHaveCount(3)
    const ackMs = Date.now() - sendStarted
    testInfo.annotations.push({ type: 'timing', description: `send ack on Fast 3G: ${ackMs} ms` })
    expect(ackMs).toBeLessThan(2000)
  })

  test('fits every factory width', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await serveApi(context, baseURL ?? '', api())
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openThread(page)
      await expectNoHorizontalOverflow(page)
    }
  })
})
