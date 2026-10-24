import type { Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'
import {
  api,
  bubbles,
  FIRST,
  fire,
  HIM,
  ME,
  openList,
  openThread,
  realtimeReady,
  row,
  SECOND,
  serveApi,
  STUB_SKIP,
  text,
} from './chat-polish-mock'
import { compiledTailwind, serveTailwind } from './real-css'

// Story chat-polish-2 (Faycal's « minor tweaks »): a collapsible list, fewer words, simple list cards, round icons,
// presence, profile links, a recorder of icons, a waveform that follows the note, and replies. The tests answer every
// /v1 call themselves (chat-polish-mock), like the other chat specs.

const REMOVED = [
  /Échanges concertés/i,
  /Pour les invitations envoyées en attente/,
  /Registre des échanges/,
  /Réponse réfléchie et posée/,
  /Étape : discussion/,
  /Étape/,
]

function composer(page: Page) {
  return page.getByRole('textbox', { name: 'Votre message' })
}

function rgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`
}

test.describe('story chat-polish-2: fewer words, simple cards, round icons', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 2 / 3: the removed texts are gone from the list and the thread; the composer is still named « Votre message »', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openList(page)
    for (const removed of REMOVED) await expect(page.locator('body'), String(removed)).not.toContainText(removed)
    await openThread(page)
    for (const removed of REMOVED) await expect(page.locator('body'), String(removed)).not.toContainText(removed)
    await expect(composer(page)).toBeVisible()
    // The label stays for screen readers only (a 1 px clip), so nothing reads « Votre message » on screen.
    const label = await page.locator('label[for="thread-input"]').boundingBox()
    expect(label?.width ?? 0).toBeLessThanOrEqual(1)
    await expectAccessible(page)
  })

  test('AC 4 / 5: a list card is a round photo, the name, the preview, the time and the badge; the whole card opens the thread', async ({ page, context, baseURL }, testInfo) => {
    await serveApi(context, baseURL ?? '', api())
    await serveTailwind(context, await compiledTailwind(page, '/discussions'))
    await openList(page)
    await expect(page.locator('#real-tailwind')).toBeAttached()
    const first = row(page, FIRST)
    await expect(first.getByRole('heading', { level: 2 })).toHaveText('Al-Hassan_BF, 29 ans')
    await expect(first).not.toContainText('Ouagadougou')
    await expect(first).not.toContainText('Identité vérifiée')
    await expect(first.getByRole('button')).toHaveCount(0)
    await expect(first.getByTestId('conversation-preview')).toHaveText('« Et votre famille ? »')
    await expect(first.locator('time')).toHaveText(/^\d{2}:\d{2}$/)
    const avatar = first.locator('.conv-avatar')
    const shape = await avatar.evaluate((node) => {
      const style = getComputedStyle(node)
      return { radius: Number.parseFloat(style.borderTopLeftRadius), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }
    })
    expect(shape.width).toBe(shape.height)
    expect(shape.radius).toBeGreaterThanOrEqual(shape.width / 2)
    // The unread badge is amber with navy text (7.9:1), and still says how many in words.
    const badge = first.getByTestId('conversation-unread')
    await expect(badge).toContainText('3 messages non lus')
    expect(await badge.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(rgb('#F59E0B'))
    expect(await badge.evaluate((node) => getComputedStyle(node).color)).toBe(rgb('#0B1D36'))
    // One link covers the card: a tap on the preview opens the thread.
    await expect(first.getByRole('link')).toHaveCount(1)
    await expect(first.getByRole('link')).toHaveAttribute('href', `/discussions/${FIRST}`)
    const loaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${FIRST}/messages`))
    await first.click()
    await loaded
    await expect(page).toHaveURL(new RegExp(`/discussions/${FIRST}$`))
    // From 768 px the split rows are the same round cards.
    if (testInfo.project.name === 'desktop') {
      const split = await row(page, SECOND).locator('.conv-avatar').evaluate((node) => Number.parseFloat(getComputedStyle(node).borderTopLeftRadius) >= node.getBoundingClientRect().width / 2)
      expect(split).toBe(true)
    }
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('AC 6: the bottom-nav badge is amber with navy text', async ({ page, context, baseURL }) => {
    const state = api()
    state.badges = { invitations: 2, discussions: 1 }
    await serveApi(context, baseURL ?? '', state)
    await page.goto('/discussions')
    const badge = page.locator('[data-nav-badge="invitations"]')
    await expect(badge).toBeVisible()
    expect(await badge.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(rgb('#F59E0B'))
    expect(await badge.evaluate((node) => getComputedStyle(node).color)).toBe(rgb('#0B1D36'))
  })

  test('AC 7: « Envoyer » is a round navy icon button of 44 px, named for screen readers', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openThread(page)
    const send = page.getByRole('button', { name: 'Envoyer', exact: true })
    await expect(send.locator('svg')).toHaveCount(1)
    const words = await send.getByText('Envoyer').boundingBox()
    expect(words?.width ?? 0).toBeLessThanOrEqual(1)
    const box = await send.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(await send.evaluate((node) => getComputedStyle(node).borderRadius)).toBe('9999px')
    expect(await send.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(rgb('#0B1D36'))
  })
})

test.describe('story chat-polish-2: collapse the list in the split view', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 1: the toggle hides the list, the thread takes the width, and the choice survives a reload', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the split view starts at 768 px')
    await serveApi(context, baseURL ?? '', api())
    await openThread(page)
    const toggle = page.getByRole('button', { name: 'Liste des discussions' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toHaveAttribute('aria-controls', 'discussions')
    const before = (await page.locator('#chat-thread').boundingBox())?.width ?? 0
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByTestId('conversation-row').first()).toBeHidden()
    await expect.poll(async () => (await page.locator('#chat-thread').boundingBox())?.width ?? 0).toBeGreaterThan(before + 200)
    await expect(toggle).toBeFocused()
    await page.reload()
    await expect(page.locator('#chat-thread')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByRole('button', { name: 'Liste des discussions' })).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByTestId('conversation-row').first()).toBeHidden()
    await expectAccessible(page)
    // Open again, by keyboard.
    await page.getByRole('button', { name: 'Liste des discussions' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Liste des discussions' })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('conversation-row').first()).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('conversation-row').first()).toBeVisible()
  })

  test('AC 1: on a phone there is no toggle (the list is its own screen), even after collapsing on a wide screen', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phone screens')
    await context.addInitScript(() => {
      try {
        localStorage.setItem('ankanu_chat_list_collapsed', '1')
      } catch {
        // No storage: nothing to remember.
      }
    })
    await serveApi(context, baseURL ?? '', api())
    await openList(page)
    await expect(page.getByTestId('conversation-row').first()).toBeVisible()
    await openThread(page)
    await expect(page.getByRole('button', { name: 'Liste des discussions' })).toBeHidden()
  })

  test('AC 1: without storage the toggle still works for the visit', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the split view starts at 768 px')
    await context.addInitScript(() => {
      // Storage refused for this key only (a private window, a blocked site): the toggle must not care.
      const get = Storage.prototype.getItem
      const set = Storage.prototype.setItem
      Storage.prototype.getItem = function (key: string) { if (key === 'ankanu_chat_list_collapsed') throw new Error('blocked'); return get.call(this, key) }
      Storage.prototype.setItem = function (key: string, value: string) { if (key === 'ankanu_chat_list_collapsed') throw new Error('blocked'); set.call(this, key, value) }
    })
    await serveApi(context, baseURL ?? '', api())
    await openThread(page)
    const toggle = page.getByRole('button', { name: 'Liste des discussions' })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('story chat-polish-2: who I talk to (presence, profile links)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 8: « En ligne » next to the city, then « Vu pour la dernière fois hier à … » when the head says so, live', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await realtimeReady(page)
    const presence = page.getByTestId('thread-presence')
    await expect(presence).toHaveText('En ligne')
    await expect(presence).toHaveAttribute('data-state', 'online')
    const now = new Date()
    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 21, 5))
    state.presence = { online: false, last_seen_at: yesterday.toISOString() }
    const calls = state.headCalls
    const head = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${FIRST}`))
    await fire(page, 'presence.changed', { account_id: HIM })
    await head
    expect(state.headCalls).toBe(calls + 1)
    await expect(presence).toHaveText('Vu pour la dernière fois hier à 21:05')
    // Another member's presence never reloads this thread.
    await fire(page, 'presence.changed', { account_id: '01990000-0000-7000-8000-0000000000e9' })
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 300)))
    expect(state.headCalls).toBe(calls + 1)
    // Hidden (either side switched it off, or a Block): nothing at all, not « hors ligne ».
    state.presence = null
    const again = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${FIRST}`))
    await fire(page, 'chat.receipts', { account_id: ME })
    await again
    await expect(presence).toBeHidden()
    await expect(page.locator('#thread-presence-sep')).toBeHidden()
    await expectAccessible(page)
  })

  test('AC 8: an older « Vu » shows its date; a member never seen shows nothing', async ({ page, context, baseURL }) => {
    const state = api()
    state.presence = { online: false, last_seen_at: '2026-03-02T08:30:00.000Z' }
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(page.getByTestId('thread-presence')).toHaveText(/^Vu pour la dernière fois le .+ à 08:30$/)
    state.presence = { online: false, last_seen_at: null }
    await openThread(page, SECOND)
    await expect(page.getByTestId('thread-presence')).toBeHidden()
  })

  test('AC 10: the name opens the member’s profile, by keyboard too; the photo link is not a second tab stop', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await openThread(page)
    const name = page.getByRole('heading', { level: 1 }).getByRole('link', { name: 'Al-Hassan_BF, 29 ans' })
    await expect(name).toHaveAttribute('href', `/profil/${HIM}`)
    const photo = page.locator('#thread-avatar-link')
    await expect(photo).toHaveAttribute('href', `/profil/${HIM}`)
    await expect(photo).toHaveAttribute('tabindex', '-1')
    await expect(photo).toHaveAttribute('aria-hidden', 'true')
    await page.route(`**/profil/${HIM}`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html lang="fr"><title>Profil</title><main><h1>Profil</h1></main></html>' }))
    await name.focus()
    const going = page.waitForURL(new RegExp(`/profil/${HIM}$`))
    await page.keyboard.press('Enter')
    await going
  })

  test('AC 10: an unavailable member has no profile link and no presence', async ({ page, context, baseURL }) => {
    const state = api()
    state.people[FIRST] = { ...state.people[FIRST]!, available: false }
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(page.locator('#thread-profile')).not.toHaveAttribute('href', /.*/)
    await expect(page.locator('#thread-avatar-link')).not.toHaveAttribute('href', /.*/)
    await expect(page.getByTestId('thread-presence')).toBeHidden()
  })
})

test.describe('story chat-polish-2: « Statut en ligne et dernière connexion » in Paramètres', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 9: a second switch, read with the receipts in one request, saves only its own field', async ({ page, context, baseURL }) => {
    const state = api()
    state.presenceSetting = true
    await serveApi(context, baseURL ?? '', state)
    let reads = 0
    page.on('request', (request) => {
      if (request.url().endsWith('/v1/chat/settings') && request.method() === 'GET') reads += 1
    })
    await page.goto('/settings')
    const presence = page.getByRole('switch', { name: 'Statut en ligne et dernière connexion' })
    const receipts = page.getByRole('switch', { name: 'Confirmations de lecture' })
    await expect(presence).toBeEnabled()
    await expect(receipts).toBeEnabled()
    expect(reads).toBe(1)
    await expect(presence).toHaveAttribute('aria-checked', 'true')
    await expect(presence).toHaveAccessibleDescription(/vous ne voyez pas non plus les leurs/)
    await presence.click()
    await expect.poll(() => state.settingPuts).toEqual([{ presence: false }])
    await expect(presence).toHaveAttribute('aria-checked', 'false')
    await expect(receipts).toHaveAttribute('aria-checked', 'true')
    expect(state.presenceSetting).toBe(false)
    expect(state.setting).toBe(true)
    await page.keyboard.press('Space')
    await expect.poll(() => state.settingPuts.length).toBe(2)
    expect(state.settingPuts[1]).toEqual({ presence: true })
    await expectAccessible(page)
  })

  test('AC 9: a refused save puts the switch back and says so', async ({ page, context, baseURL }) => {
    const state = api()
    await serveApi(context, baseURL ?? '', state)
    await page.route(/\/v1\/chat\/settings$/, (route) => (route.request().method() === 'PUT' ? route.fulfill({ status: 500, body: '{}' }) : route.fallback()))
    await page.goto('/settings')
    const presence = page.getByRole('switch', { name: 'Statut en ligne et dernière connexion' })
    await expect(presence).toBeEnabled()
    await presence.click()
    await expect(page.locator('#presence-error')).toBeVisible()
    await expect(presence).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('story chat-polish-2: replies (arrow, swipe, quoted card)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  const LONG = 'Notre famille souhaite vous rencontrer après la prière du vendredi, in shā’ Allāh, avec mon père et mon oncle, si cela vous convient et convient aussi à votre famille. Nous pourrions nous retrouver chez mon oncle, près de la grande mosquée, et parler ensemble du projet de foyer, des études, du travail et de la ville où nous aimerions vivre, avec la bénédiction de nos parents.'

  function longState() {
    const state = api()
    state.messages.push(text(0x106, FIRST, HIM, LONG, 20))
    return state
  }

  function theirs(page: Page) {
    return page.locator(`[data-testid="chat-bubble"][data-message-id="01990000-0000-7000-8000-000000000106"]`)
  }

  test('AC 18 / 19: the arrow sits right of their bubble and left of mine; it opens a two-line preview; the sent reply quotes it', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'a mouse and a keyboard; phones swipe (below)')
    const state = longState()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const bubble = theirs(page)
    await bubble.hover()
    const reply = bubble.getByRole('button', { name: 'Répondre' })
    await expect(reply).toBeVisible()
    const arrow = await reply.boundingBox()
    const body = await bubble.locator('.chat-bubble-body').boundingBox()
    if (!arrow || !body) throw new Error('no boxes')
    expect(arrow.x).toBeGreaterThanOrEqual(body.x + body.width - 1)
    expect(arrow.width).toBeGreaterThanOrEqual(44)
    const mine = bubbles(page).first()
    await mine.hover()
    const myArrow = await mine.getByRole('button', { name: 'Répondre' }).boundingBox()
    const myBody = await mine.locator('.chat-bubble-body').boundingBox()
    if (!myArrow || !myBody) throw new Error('no boxes')
    expect(myArrow.x + myArrow.width).toBeLessThanOrEqual(myBody.x + 1)

    await bubble.hover()
    await reply.click()
    const preview = page.getByTestId('thread-reply')
    await expect(preview).toBeVisible()
    await expect(preview.locator('#thread-reply-name')).toHaveText('Réponse à Al-Hassan_BF')
    await expect(composer(page)).toBeFocused()
    await expect(composer(page)).toHaveAccessibleDescription(/Réponse à Al-Hassan_BF/)
    // Two lines at most, then « … » (the browser clamps; the start of the text is what shows).
    const clamp = await preview.locator('.chat-quote-text').evaluate((node) => {
      const style = getComputedStyle(node)
      return { height: node.getBoundingClientRect().height, line: Number.parseFloat(style.lineHeight), clipped: node.scrollHeight > node.clientHeight + 1 }
    })
    expect(clamp.height).toBeLessThanOrEqual(clamp.line * 2 + 1)
    expect(clamp.clipped).toBe(true)
    await expectAccessible(page)

    await composer(page).fill('Avec plaisir, in shā’ Allāh.')
    const posted = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/messages'))
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
    expect((await posted).status()).toBe(201)
    expect(state.sent[0]).toEqual({ kind: 'text', text: 'Avec plaisir, in shā’ Allāh.', reply_to_message_id: '01990000-0000-7000-8000-000000000106' })
    await expect(preview).toBeHidden()
    const sent = bubbles(page).last()
    const quote = sent.getByTestId('chat-quote')
    await expect(quote).toHaveAccessibleName(new RegExp('^Message cité de Al-Hassan_BF : Notre famille souhaite'))
    const card = await quote.locator('.chat-quote-text').evaluate((node) => node.getBoundingClientRect().height <= Number.parseFloat(getComputedStyle(node).lineHeight) * 2 + 1 && node.scrollHeight > node.clientHeight + 1)
    expect(card).toBe(true)
    // A tap on the card goes to the quoted message and highlights it.
    await quote.click()
    await expect(bubble).toHaveAttribute('data-flash', 'true')
    await expect(bubble).toBeInViewport()
    await expect(bubble).toBeFocused()
    await expect(bubble).not.toHaveAttribute('data-flash', 'true', { timeout: 4000 })
  })

  test('AC 18 keyboard: Tab reaches « Répondre », Enter starts the reply, Escape and the cross cancel it', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'keyboard path')
    const state = longState()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const reply = theirs(page).getByRole('button', { name: 'Répondre' })
    await theirs(page).getByTestId('report-message').focus()
    await page.keyboard.press('Shift+Tab')
    await expect(reply).toBeFocused()
    expect(await reply.evaluate((node) => getComputedStyle(node).opacity)).toBe('1')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('thread-reply')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('thread-reply')).toBeHidden()
    await expect(composer(page)).not.toHaveAttribute('aria-describedby', /.*/)
    await reply.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Annuler la réponse' }).click()
    await expect(page.getByTestId('thread-reply')).toBeHidden()
    await expect(composer(page)).toBeFocused()
    // Cancelled: the next message is a plain one.
    await composer(page).fill('Message simple')
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
    await expect.poll(() => state.sent.length).toBe(1)
    expect(state.sent[0]).toEqual({ kind: 'text', text: 'Message simple' })
  })

  async function swipe(page: Page, target: ReturnType<Page['locator']>, dx: number, dy = 0): Promise<void> {
    const box = await target.locator('.chat-bubble-body').boundingBox()
    if (!box) throw new Error('no bubble box')
    const x = box.x + 20
    const y = box.y + box.height / 2
    const init = { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }
    const body = target.locator('.chat-bubble-body')
    await body.dispatchEvent('pointerdown', { ...init, clientX: x, clientY: y })
    for (let step = 1; step <= 6; step += 1) {
      await body.dispatchEvent('pointermove', { ...init, clientX: x + (dx * step) / 6, clientY: y + (dy * step) / 6 })
    }
    await body.dispatchEvent('pointerup', { ...init, clientX: x + dx, clientY: y + dy })
  }

  test('AC 19 swipe: a swipe right past 60 px on a bubble starts the reply; a short one, a vertical one or a closed thread do not', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'touch screens')
    const state = longState()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    // The arrow takes no room on a touch screen: the bubble keeps its width.
    await expect(theirs(page).getByRole('button', { name: 'Répondre' })).toHaveCSS('position', 'absolute')
    await swipe(page, theirs(page), 40)
    await expect(page.getByTestId('thread-reply')).toBeHidden()
    await swipe(page, theirs(page), 20, 120)
    await expect(page.getByTestId('thread-reply')).toBeHidden()
    await swipe(page, theirs(page), 80)
    await expect(page.getByTestId('thread-reply')).toBeVisible()
    await expect(page.locator('#thread-reply-name')).toHaveText('Réponse à Al-Hassan_BF')
    // The bubble springs back.
    await expect(theirs(page).locator('.chat-bubble-row')).toHaveAttribute('style', /transform: ;|^$/)
    // My own message: « Réponse à Vous ».
    await swipe(page, bubbles(page).first(), 80)
    await expect(page.locator('#thread-reply-name')).toHaveText('Réponse à Vous')
    await expectNoHorizontalOverflow(page)
  })

  test('AC 21 / 23: a closed conversation offers no reply; a quoted message that is unavailable says so', async ({ page, context, baseURL }) => {
    const state = longState()
    state.messages.push({ ...text(0x107, FIRST, HIM, 'Réponse à un message disparu', 10), reply_to_message_id: '01990000-0000-7000-8000-00000000dead' })
    state.closed = true
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(page.locator('[data-testid="chat-reply"]:visible')).toHaveCount(0)
    await expect(theirs(page).getByRole('button', { name: 'Répondre' })).toBeHidden()
    const gone = bubbles(page).last().getByTestId('chat-quote')
    await expect(gone).toHaveText('Message indisponible')
    await expect(gone).toHaveAttribute('data-available', 'false')
    await expect(gone.getByRole('button')).toHaveCount(0)
    await expectAccessible(page)
  })

  test('AC 22: a quoted message older than the loaded page is fetched, then shown and highlighted', async ({ page, context, baseURL }) => {
    const state = api()
    for (let index = 0; index < 40; index += 1) state.messages.push(text(0x200 + index, FIRST, index % 2 ? ME : HIM, `Message ${index}`, 19 - index * 0.1))
    // Message 0x200 is outside the latest page of 30; the newest one answers it.
    state.messages.push({ ...text(0x2ff, FIRST, ME, 'Je reviens sur ceci', 1), reply_to_message_id: '01990000-0000-7000-8000-000000000200' })
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    const target = page.locator('[data-testid="chat-bubble"][data-message-id="01990000-0000-7000-8000-000000000200"]')
    await expect(target).toHaveCount(0)
    const quote = bubbles(page).last().getByTestId('chat-quote')
    await expect(quote).toHaveAccessibleName('Message cité de Al-Hassan_BF : Message 0')
    await quote.click()
    await expect(target).toHaveAttribute('data-flash', 'true')
    await expect(target).toBeInViewport()
  })

  test('AC 21: a reply whose target is gone (404) keeps the text, drops the reply and says why', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'one width is enough')
    const state = longState()
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await theirs(page).hover()
    await theirs(page).getByRole('button', { name: 'Répondre' }).click()
    state.messages = state.messages.filter((item) => item.id !== '01990000-0000-7000-8000-000000000106')
    await composer(page).fill('Toujours là ?')
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Ce message est introuvable.' })).toBeVisible()
    await expect(page.getByTestId('thread-reply')).toBeHidden()
    await expect(composer(page)).toHaveValue('Toujours là ?')
  })

  test('fits every factory width with a quoted card, an open reply preview, presence and the list toggle', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    const state = longState()
    state.messages.push({ ...text(0x107, FIRST, ME, 'Oui, bien sûr.', 5), reply_to_message_id: '01990000-0000-7000-8000-000000000106' })
    await serveApi(context, baseURL ?? '', state)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      await openThread(page)
      await theirs(page).getByRole('button', { name: 'Répondre' }).focus()
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('thread-reply')).toBeVisible()
      await expect(bubbles(page).last().getByTestId('chat-quote')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }
  })
})
