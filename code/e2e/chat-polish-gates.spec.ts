import type { BrowserContext, Page, Route } from '@playwright/test'
import type { Api } from './chat-polish-mock'
import { api, bubbles, fire, FIRST, HIM, id, iso, ME, openList, openThread, OTHER, PEOPLE, realtimeReady, row, SECOND, serveApi, setLite, STUB_SKIP, text, wheelThreadToTop } from './chat-polish-mock'
import { expect, expectAccessible, expectNoHorizontalOverflow, test } from './fixtures'

// Story chat-polish, QA gates (QA report F1 and F3): the guards behind « marked as read » (hidden tab, scrolled up),
// spoofed realtime events, the Block tick, failing read requests, keyboard use of the Photo viewer, the older-messages
// anchor, malformed links, touch targets and hostile content, all driven in a real browser. Started from the QA
// agent's adversarial spec (docs/qa-handoffs/chat-polish-evidence/qa-chat-polish.spec.ts.txt).

/** The page's delay before it tries a failed read again (READ_RETRY_MS in apps/web/src/discussions-page.ts). */
const READ_RETRY_MS = 2000

function withPhotos(state: Api): void {
  state.messages.push(
    { id: id(0x106), conversation_id: FIRST, sender_id: HIM, kind: 'photo', state: 'delivered', text: null, created_at: iso(20), media: { id: id(0xa01), kind: 'photo', width: 160, height: 120, blur_url: '/v1/media/get?token=blur-1' } },
    { id: id(0x107), conversation_id: FIRST, sender_id: ME, kind: 'photo', state: 'delivered', text: null, created_at: iso(10), media: { id: id(0xa02), kind: 'photo', width: 160, height: 120, blur_url: '/v1/media/get?token=blur-2' } },
  )
}

/** Lets a test hide and show the tab: Playwright pages always report « visible ». */
async function controlVisibility(context: BrowserContext, start: 'hidden' | 'visible'): Promise<void> {
  await context.addInitScript((initial: string) => {
    let value: string = initial
    Object.defineProperty(document, 'visibilityState', { get: () => value, configurable: true })
    ;(window as unknown as { __setVisibility: (next: string) => void }).__setVisibility = (next) => {
      value = next
      document.dispatchEvent(new Event('visibilitychange'))
    }
  }, start)
}

async function setVisibility(page: Page, value: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((next) => (window as unknown as { __setVisibility: (next: string) => void }).__setVisibility(next), value)
}

/** Each read POST the page starts, recorded the moment `fetch` is called, so « none was sent » needs no wait. */
async function recordReads(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const calls: string[] = []
    ;(window as unknown as { __readCalls: string[] }).__readCalls = calls
    const original = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.endsWith('/read') && init?.method === 'POST') calls.push(String((JSON.parse(String(init.body)) as { message_id: string }).message_id))
      return original(input, init)
    }
  })
}

async function readCalls(page: Page): Promise<string[]> {
  return page.evaluate(() => [...(window as unknown as { __readCalls: string[] }).__readCalls])
}

/** Calls the page's own triggers for « mark as read »: the window regains focus and the tab reports visible. */
async function nudge(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

async function scrollThreadToEnd(page: Page): Promise<void> {
  await page.evaluate(() => {
    const box = document.getElementById('thread-scroll')
    if (box && box.scrollHeight > box.clientHeight) box.scrollTop = box.scrollHeight
    else window.scrollTo(0, document.documentElement.scrollHeight)
  })
}

function receipts(page: Page) {
  return bubbles(page).getByTestId('chat-receipt')
}

async function receiptStates(page: Page): Promise<Array<string | null>> {
  return receipts(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-state')))
}

test.describe('story chat-polish QA gates: when a thread counts as read (AC 7)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 7: a hidden tab marks nothing read, even when nudged; the tab coming back marks the latest message once', async ({ page, context, baseURL }) => {
    await controlVisibility(context, 'hidden')
    await recordReads(context)
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(bubbles(page).last()).toContainText('Et votre famille ?')
    await nudge(page)
    expect(await readCalls(page)).toEqual([])
    await setVisibility(page, 'visible')
    await expect.poll(() => state.reads).toEqual([{ conversation_id: FIRST, message_id: id(0x105) }])
    await nudge(page)
    expect(await readCalls(page)).toEqual([id(0x105)])
  })

  test('AC 7: scrolled up, a new message is not marked read, even when the tab regains focus; scrolling back down marks it', async ({ page, context, baseURL }) => {
    await recordReads(context)
    const state = api()
    for (let index = 0; index < 24; index += 1) state.messages.push(text(0x110 + index, FIRST, HIM, `Ligne ${index + 1} : un message assez long pour remplir l'écran du téléphone.`, 29 - index))
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await realtimeReady(page)
    await expect.poll(() => state.reads.length).toBe(1)
    await wheelThreadToTop(page)
    await expect(bubbles(page).last()).not.toBeInViewport()
    state.serial += 1
    state.messages.push(text(state.serial, FIRST, HIM, 'Êtes-vous toujours là ?', 0))
    const fetched = page.waitForResponse((response) => response.url().includes(`/v1/conversations/${FIRST}/messages?after=`))
    await fire(page, 'message.delivered', { conversation_id: FIRST, message_id: id(state.serial), sender_id: HIM })
    await fetched
    await expect(page.getByRole('button', { name: 'Nouveaux messages' })).toBeInViewport()
    await nudge(page)
    expect(await readCalls(page)).toEqual([id(0x110 + 23)])
    await scrollThreadToEnd(page)
    await expect.poll(() => state.reads.at(-1)?.message_id).toBe(id(state.serial))
    expect(await readCalls(page)).toEqual([id(0x110 + 23), id(state.serial)])
  })
})

test.describe('story chat-polish QA gates: open at the latest message when the layout settles late (CI race)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 4: a stylesheet that lands 1.5 s after opening (the Tailwind CDN on CI) still leaves the latest message and the composer in view', async ({ page, context, baseURL }) => {
    // Stands in for the CDN, which this sandbox cannot reach and CI loads late: it reshapes every bubble after the
    // page's first-second follow-up is over.
    const late = '[data-testid="chat-bubble"] { margin-bottom: 3rem; padding-top: 1rem; }'
    await context.route(/^https:\/\/cdn\.tailwindcss\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: `window.tailwind = { config: {} }; setTimeout(function () { var s = document.createElement('style'); s.id = 'late-style'; s.textContent = ${JSON.stringify(late)}; document.head.appendChild(s) }, 1500)` }),
    )
    const state = api()
    for (let index = 0; index < 24; index += 1) state.messages.push(text(0x110 + index, FIRST, index % 2 ? ME : HIM, `Message d'historique ${index + 1} assez long pour prendre de la place à l'écran.`, 29 - index))
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(page.locator('#late-style')).toBeAttached({ timeout: 5000 })
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(page.getByLabel('Réponse réfléchie et posée')).toBeInViewport()
  })
})

test.describe('story chat-polish QA gates: ticks and the list', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 8: read events for another conversation, for my own pointer or with a broken payload leave my ticks alone', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openThread(page)
    await realtimeReady(page)
    // He has read my first message, not my second.
    await expect.poll(() => receiptStates(page)).toEqual(['read', 'sent'])
    await fire(page, 'conversation.read', { conversation_id: SECOND, account_id: OTHER, message_id: id(0x105) })
    await fire(page, 'conversation.read', { conversation_id: FIRST, account_id: ME, message_id: id(0x105) })
    await fire(page, 'conversation.read', null)
    await fire(page, 'conversation.read', { conversation_id: FIRST })
    await fire(page, 'conversation.read', { conversation_id: FIRST, account_id: HIM, message_id: 42 })
    // The events are handled synchronously, so the ticks are already final here.
    expect(await receiptStates(page)).toEqual(['read', 'sent'])
    await fire(page, 'conversation.read', { conversation_id: FIRST, account_id: HIM, message_id: id(0x102) })
    await expect.poll(() => receiptStates(page)).toEqual(['read', 'read'])
    await expect(receipts(page).last()).toHaveAttribute('title', 'Lu')
  })

  test('AC 11 / 13: under a Block (read: null) my last message shows no tick at all; 150 unread messages show « 99+ »', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await page.route('**/v1/conversations', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      const items = blockedList(state)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: items.length, items }) })
    })
    await openList(page)
    const blocked = row(page, FIRST)
    await expect(blocked.getByTestId('conversation-preview')).toHaveText('Vous : « Comment allez-vous ? »')
    await expect(blocked.getByTestId('conversation-receipt')).toHaveCount(0)
    await expect(blocked).not.toContainText(/\bLu\b|Envoyé/)
    const badge = row(page, SECOND).getByTestId('conversation-unread')
    await expect(badge).toContainText('99+')
    await expect(badge.locator('.chat-sr')).toHaveText('150 messages non lus')
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })
})

/** FIRST under a Block with my message last (`read: null`); SECOND with 150 unread messages of his. */
function blockedList(state: Api) {
  const person = (conversation: string) => state.people[conversation] ?? PEOPLE[FIRST]!
  const item = (conversation: string, unread: number, last: { id: string; mine: boolean; preview: string; read: boolean | null }) => ({
    id: conversation,
    invite_id: conversation.replace('c', 'd'),
    stage: 'chat',
    other_id: person(conversation).other_id,
    pseudonym: person(conversation).pseudonym,
    other: { available: true, age: person(conversation).age, city: person(conversation).city, verified: true, photo: null },
    unread,
    last_message: { id: last.id, mine: last.mine, kind: 'text', preview: last.preview, created_at: iso(5), read: last.read },
  })
  return [
    item(FIRST, 0, { id: id(0x102), mine: true, preview: 'Comment allez-vous ?', read: null }),
    item(SECOND, 150, { id: id(0x0f1), mine: false, preview: 'Bonjour.', read: false }),
  ]
}

test.describe('story chat-polish QA gates: a read request that fails (QA F3)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  const CASES = [
    { name: 'one 500, then success: retried once and stored', failures: 1, fail: (route: Route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }), calls: 2, stored: 1 },
    { name: 'always 500: one retry, then nothing', failures: 99, fail: (route: Route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }), calls: 2, stored: 0 },
    { name: 'network failure: one retry, then nothing', failures: 99, fail: (route: Route) => route.abort('failed'), calls: 2, stored: 0 },
    { name: '403: final, no retry', failures: 99, fail: (route: Route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Accès refusé.', details: null } }) }), calls: 1, stored: 0 },
  ]

  for (const scenario of CASES) {
    test(`F3: ${scenario.name}; the thread stays usable and shows no error`, async ({ page, context, baseURL }) => {
      const state = api()
      await serveApi(context, baseURL ?? '', state)
      let calls = 0
      await page.route('**/v1/conversations/*/read', async (route) => {
        calls += 1
        if (calls <= scenario.failures) await scenario.fail(route)
        else await route.fallback()
      })
      await openThread(page)
      await expect.poll(() => calls, { timeout: READ_RETRY_MS + 3000 }).toBe(scenario.calls)
      // Proving that no further request follows takes a wait longer than the retry delay.
      await page.waitForTimeout(READ_RETRY_MS + 500)
      expect(calls).toBe(scenario.calls)
      expect(state.reads).toHaveLength(scenario.stored)
      await expect(page.locator('#thread-error')).toBeHidden()
      await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0)
      await page.getByLabel('Réponse réfléchie et posée').fill('Toujours là')
      await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
      await expect(bubbles(page).last()).toContainText('Toujours là')
    })
  }
})

test.describe('story chat-polish QA gates: Photo viewer, older messages, links, targets, hostile content', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 2: keyboard only: Space opens the Photo, Tab and Shift+Tab stay on « Fermer la photo », Enter closes, focus returns, reopening works', async ({ page, context, baseURL }) => {
    await setLite(context, false)
    const state = api()
    withPhotos(state)
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const photo = page.getByRole('button', { name: /Photo de Al-Hassan_BF/ })
    const dialog = page.getByRole('dialog', { name: 'Photo de Al-Hassan_BF' })
    const close = page.getByRole('button', { name: 'Fermer la photo' })
    await photo.focus()
    await page.keyboard.press('Space')
    await expect(dialog).toBeVisible()
    await expect(close).toBeFocused()
    for (let step = 0; step < 3; step += 1) await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(photo).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(photo).toBeFocused()
  })

  test('AC 5: « Messages précédents » keeps the message being read in place', async ({ page, context, baseURL }) => {
    const state = api()
    for (let index = 0; index < 70; index += 1) state.messages.push(text(0x200 + index, FIRST, index % 3 ? HIM : ME, `Ancien message numéro ${index}`, 2000 - index))
    await serveApi(context, baseURL ?? '', state)
    // The phone project scrolls the page; the desktop project scrolls the thread pane of the split view.
    const width = page.viewportSize()?.width ?? 0
    await openThread(page)
    const older = page.getByRole('button', { name: 'Messages précédents' })
    // The member scrolls up to the start of the loaded page (Mac QA D1: only a member's scroll unpins the view).
    await wheelThreadToTop(page)
    await expect(older).toBeInViewport()
    const anchorId = (await bubbles(page).first().getAttribute('data-message-id')) ?? ''
    const anchor = page.locator(`[data-testid="chat-bubble"][data-message-id="${anchorId}"]`)
    const before = (await anchor.boundingBox())?.y ?? Number.NaN
    const loaded = page.waitForResponse((response) => response.url().includes('/messages?before='))
    await older.click()
    await loaded
    // 30 older messages now sit above the anchor; it must not have moved by more than a line.
    await expect(bubbles(page)).toHaveCount(60)
    const after = (await anchor.boundingBox())?.y ?? Number.NaN
    expect(Math.abs(after - before), `anchor moved from ${before} to ${after} at ${width} px`).toBeLessThan(120)
  })

  test('AC 15: a malformed thread link lands on the list; an unknown thread says it does not exist', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await page.goto('/discussions/not-a-uuid')
    await expect(page).toHaveURL(/\/discussions$/)
    await expect(page.getByTestId('conversation-row')).toHaveCount(2)
    await page.goto('/discussions/01990000-0000-7000-8000-0000000000ff')
    await expect(page.locator('#thread-missing')).toBeVisible()
    await expect(page.locator('#thread-missing')).toContainText("Cette discussion n'existe pas.")
    await expectAccessible(page)
  })

  test('AC 16: Photo, send, « Fermer la photo » and (split view) the row link are at least 44 x 44', async ({ page, context, baseURL }) => {
    await setLite(context, false)
    const state = api()
    withPhotos(state)
    await serveApi(context, baseURL ?? '', state)
    const width = page.viewportSize()?.width ?? 0
    await openThread(page)
    const photo = page.getByRole('button', { name: /Photo de Al-Hassan_BF/ })
    const targets = [photo, page.getByRole('button', { name: 'Envoyer', exact: true })]
    if (width >= 768) {
      await expect(row(page, FIRST).getByRole('link')).toBeVisible()
      targets.push(row(page, FIRST).getByRole('link'))
    }
    for (const target of targets) {
      const box = await target.boundingBox()
      expect(box?.width ?? 0, `${String(target)} at ${width} px`).toBeGreaterThanOrEqual(44)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    await photo.click()
    const close = await page.getByRole('button', { name: 'Fermer la photo' }).boundingBox()
    expect(close?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(close?.height ?? 0).toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('AC 16: markup in a pseudonym or a message stays text, a long unbroken string does not overflow, Arabic renders', async ({ page, context, baseURL }) => {
    const state = api()
    const hostile = '<img src=x onerror="window.__xss=1">Z'
    state.people = { ...state.people, [FIRST]: { ...PEOPLE[FIRST]!, pseudonym: hostile } }
    state.messages.push(
      text(0x110, FIRST, HIM, '<script>window.__xss=2</script><img src=x onerror="window.__xss=3"> \'"; DROP TABLE message;--', 5),
      text(0x111, FIRST, HIM, 'A'.repeat(900), 4),
      text(0x112, FIRST, ME, 'مرحبا بكم، السلام عليكم ورحمة الله', 3),
    )
    await serveApi(context, baseURL ?? '', state)
    // At the project's own width: 360 px on the phone project, the split view on desktop (the list row too).
    await openThread(page)
    await expect(bubbles(page).last()).toContainText('السلام عليكم')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(hostile)
    await expect(page.getByText('DROP TABLE message;--')).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
    await expectNoHorizontalOverflow(page)
  })
})
