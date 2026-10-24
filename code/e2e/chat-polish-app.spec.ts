import type { Page } from '@playwright/test'
import { api, bubbles, fire, FIRST, HIM, id, ME, openList, openThread, realtimeReady, row, serveApi, STUB_SKIP, text, wheelThreadToTop } from './chat-polish-mock'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'
import { compiledTailwind, serveTailwind } from './real-css'

// Story chat-polish, second round (Faycal, 2026-10-24): the thread as a messaging app (only the messages scroll, the
// header and the composer stay put), « Confirmations de lecture » in Paramètres, no ticks under a Block (Mac QA D2), and
// live badges in the bottom nav. The mock API and the fake Socket.IO live in chat-polish-mock.ts.

function longThread() {
  const state = api()
  for (let index = 0; index < 24; index += 1) state.messages.push(text(0x110 + index, FIRST, index % 2 ? ME : HIM, `Message d'historique ${index + 1} assez long pour prendre de la place à l'écran.`, 29 - index))
  return state
}

async function documentScroll(page: Page): Promise<{ scrollHeight: number; innerHeight: number; scrollY: number }> {
  return page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight, scrollY: window.scrollY }))
}

async function expectPageStill(page: Page): Promise<void> {
  const { scrollHeight, innerHeight, scrollY } = await documentScroll(page)
  expect(scrollHeight, `document ${scrollHeight} > viewport ${innerHeight}`).toBeLessThanOrEqual(innerHeight)
  expect(scrollY).toBe(0)
}

function threadTitle(page: Page) {
  return page.locator('#thread-title')
}

function composer(page: Page) {
  return page.getByLabel('Réponse réfléchie et posée')
}

test.describe('story chat-polish: the thread is a messaging app, only the messages scroll (AC 23)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 23: the page never scrolls; after scrolling the messages up, who I talk to and the composer are still in view', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', longThread())
    await openThread(page)
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(threadTitle(page)).toBeInViewport()
    await expect(composer(page)).toBeInViewport()
    await expectPageStill(page)
    await wheelThreadToTop(page)
    await expect(bubbles(page).last()).not.toBeInViewport()
    await expect(threadTitle(page)).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Envoyer', exact: true })).toBeInViewport()
    await expect(page.getByRole('button', { name: /Photo|photo/ }).first()).toBeInViewport()
    await expectPageStill(page)
    // A wheel over the page itself moves nothing either.
    await page.mouse.move(5, 5)
    await page.mouse.wheel(0, 2000)
    await expectPageStill(page)
    await expectAccessible(page)
  })

  test('AC 23: at every factory width the thread fills the screen above the bottom nav, with nothing to scroll but the messages', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await serveApi(context, baseURL ?? '', longThread())
    for (const width of WIDTHS) {
      for (const height of [640, 900]) {
        await page.setViewportSize({ width, height })
        await openThread(page)
        await expect(bubbles(page).last()).toBeInViewport()
        await expect(threadTitle(page)).toBeInViewport()
        await expect(composer(page)).toBeInViewport()
        await expectPageStill(page)
        await expectNoHorizontalOverflow(page)
        // The composer ends above the bottom nav (split view) or at the bottom of the screen (a phone thread has no nav).
        const form = await page.locator('#thread-form').boundingBox()
        const navigation = page.getByRole('navigation', { name: 'Navigation principale' })
        const bottom = Math.round((form?.y ?? 0) + (form?.height ?? 0))
        if (width < 768) {
          await expect(navigation).toBeHidden()
          expect(bottom, `${width}x${height}`).toBeLessThanOrEqual(height)
        } else {
          const nav = await navigation.boundingBox()
          expect(bottom, `${width}x${height}`).toBeLessThanOrEqual(Math.round(nav?.y ?? 0))
        }
      }
    }
  })

  test('AC 23 / 25: the on-screen keyboard shrinks the screen: the composer and the latest message stay in view; a phone thread has no bottom nav', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the keyboard is a phone matter')
    await serveApi(context, baseURL ?? '', longThread())
    await openThread(page)
    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await expect(nav).toBeHidden()
    await composer(page).focus()
    // Stands in for the keyboard: the visible viewport loses most of its height.
    await page.setViewportSize({ width: 360, height: 380 })
    await expect(composer(page)).toBeInViewport()
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(threadTitle(page)).toBeInViewport()
    await expectPageStill(page)
    await page.setViewportSize({ width: 360, height: 780 })
    await bubbles(page).last().click()
    await expect(nav).toBeHidden()
    await expect(bubbles(page).last()).toBeInViewport()
    await expectPageStill(page)
    // « Retour aux discussions » leads back to the list, where the bottom nav is.
    await page.getByRole('link', { name: 'Retour aux discussions' }).click()
    await expect(nav).toBeVisible()
  })

  test('AC 23: on a phone the list still scrolls like a page; the fixed layout is for the thread', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phones only: the split view is fixed by design')
    await serveApi(context, baseURL ?? '', api())
    await openList(page)
    expect(await page.evaluate(() => document.documentElement.classList.contains('chat-fixed'))).toBe(false)
    await row(page, FIRST).getByRole('link').first().click()
    await expect(bubbles(page).last()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.classList.contains('chat-fixed'))).toBe(true)
  })
})

test.describe('story chat-polish: ticks follow the Block and « Confirmations de lecture » (AC 11, AC 19)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('Mac QA D2: under a Block the thread draws no tick at all on my messages', async ({ page, context, baseURL }) => {
    const state = api()
    state.receipts = 'blocked'
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await expect(page.locator('[data-mine="true"]')).toHaveCount(2)
    await expect(page.getByTestId('chat-receipt')).toHaveCount(0)
    await expect(page.locator('#thread')).not.toContainText(/Envoyé|\bLu\b/)
  })

  test('AC 19: with receipts off my messages show « Envoyé » only; turned back on, « Lu » comes back live', async ({ page, context, baseURL }) => {
    const state = api()
    state.receipts = 'off'
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await realtimeReady(page)
    const ticks = page.getByTestId('chat-receipt')
    await expect(ticks).toHaveCount(2)
    for (const tick of await ticks.all()) await expect(tick).toHaveAttribute('data-state', 'sent')
    // A read event cannot turn them « Lu » while receipts are off.
    await fire(page, 'conversation.read', { conversation_id: FIRST, account_id: HIM, message_id: id(0x102) })
    for (const tick of await ticks.all()) await expect(tick).toHaveAttribute('data-state', 'sent')
    const heads = state.headCalls
    state.receipts = 'on'
    await fire(page, 'chat.receipts', { account_id: HIM })
    await expect(ticks.first()).toHaveAttribute('data-state', 'read')
    expect(state.headCalls).toBe(heads + 1)
    // Blocked while open: the ticks go.
    state.receipts = 'blocked'
    await fire(page, 'chat.receipts', { account_id: HIM })
    await expect(ticks).toHaveCount(0)
  })
})

test.describe('story chat-polish: « Confirmations de lecture » in Paramètres (AC 18)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 18: the switch reads the stored value, saves a change, and goes back with a message when the save fails', async ({ page, context, baseURL }) => {
    const state = api()
    state.setting = false
    await serveApi(context, baseURL ?? '', state)
    await page.goto('/settings')
    const toggle = page.getByRole('switch', { name: 'Confirmations de lecture' })
    await expect(toggle).toBeEnabled()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect(toggle).toHaveAccessibleDescription(/ne voient pas quand vous avez lu/)
    const box = await toggle.evaluate((node) => {
      const hit = getComputedStyle(node, '::before')
      return { width: parseFloat(hit.width), height: parseFloat(hit.height) }
    })
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => state.settingPuts).toEqual([{ read_receipts: true }])
    // Mac QA round 2: wait for the save to settle (the switch stays focusable, busy while saving) before the next press.
    await expect(toggle).not.toHaveAttribute('aria-busy', 'true')
    await expect(toggle).toBeFocused()
    await toggle.press('Space')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect.poll(() => state.settingPuts.length).toBe(2)
    expect(state.setting).toBe(false)

    await page.route('**/v1/chat/settings', (route) => (route.request().method() === 'PUT' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.fallback()))
    await toggle.click()
    await expect(page.getByRole('alert').filter({ hasText: 'Réglage non enregistré. Réessayez.' })).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect(toggle).not.toHaveAttribute('aria-busy', 'true')
  })

  test('Mac QA round 2: a second Paramètres window follows a change live and on focus; a click saves what it shows the member asking for', async ({ page, context, baseURL }) => {
    const state = api()
    state.setting = true
    await serveApi(context, baseURL ?? '', state)
    await page.goto('/settings')
    const second = await context.newPage()
    await second.goto('/settings')
    await realtimeReady(second)
    const first = page.getByRole('switch', { name: 'Confirmations de lecture' })
    const stale = second.getByRole('switch', { name: 'Confirmations de lecture' })
    await expect(stale).toHaveAttribute('aria-checked', 'true')
    await first.click()
    await expect.poll(() => state.settingPuts).toEqual([{ read_receipts: false }])
    // The server tells every tab of mine (chat.receipts); the second window follows without a reload.
    await fire(second, 'chat.receipts', { account_id: ME })
    await expect(stale).toHaveAttribute('aria-checked', 'false')
    // Without an event (another device, a lost socket), coming back to the window reads it again.
    state.setting = true
    await second.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(stale).toHaveAttribute('aria-checked', 'true')
    // A window that shows « on » while the server says « off » saves « off », what the member asked for, never a flip of
    // the server's value.
    state.setting = false
    await expect(stale).toHaveAttribute('aria-checked', 'true')
    await stale.click()
    await expect.poll(() => state.settingPuts.length).toBe(2)
    expect(state.settingPuts[1]).toEqual({ read_receipts: false })
    await expect(stale).toHaveAttribute('aria-checked', 'false')
    await second.close()
  })

  test('QA R2-4: Paramètres passes axe as a whole page; the Lite and PIN switches are named switches', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', api())
    await page.goto('/settings')
    await expect(page.getByRole('switch', { name: 'Confirmations de lecture' })).toBeEnabled()
    await expect(page.getByRole('switch', { name: 'Mode Allégé (Basse consommation)' })).toBeVisible()
    await expect(page.getByRole('switch', { name: "Code secret PIN d'accès" })).toBeVisible()
    await expectAccessible(page)
  })
})

test.describe('story chat-polish: live badges in the bottom nav (AC 21, AC 22)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  function navLink(page: Page, label: string) {
    return page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: new RegExp(`^${label}`) })
  }

  test('AC 21 / 22: on another screen (Paramètres) the badges count, update live once per burst, cap at 99+ and hide at 0', async ({ page, context, baseURL }) => {
    const state = api()
    state.badges = { invitations: 2, discussions: 3 }
    await serveApi(context, baseURL ?? '', state)
    await page.goto('/settings')
    await realtimeReady(page)
    const invitations = navLink(page, 'Invitations')
    const discussions = navLink(page, 'Discussions')
    await expect(invitations).toHaveAccessibleName('Invitations 2 invitations en attente')
    await expect(discussions).toHaveAccessibleName('Discussions 3 discussions non lues')
    await expect(invitations.locator('[data-nav-badge]')).toHaveText(/^2/)
    await expect(navLink(page, 'Découvrir').locator('[data-nav-badge]')).toHaveCount(0)

    // A message arrives while I am on Paramètres: one request for a burst of three events.
    const before = state.badgeCalls
    state.badges = { invitations: 2, discussions: 4 }
    await fire(page, 'message.delivered', { conversation_id: FIRST, message_id: id(0x900), sender_id: HIM })
    await fire(page, 'message.delivered', { conversation_id: FIRST, message_id: id(0x901), sender_id: HIM })
    await fire(page, 'conversation.read', { conversation_id: FIRST, account_id: ME, message_id: id(0x901) })
    await expect(discussions).toHaveAccessibleName('Discussions 4 discussions non lues')
    expect(state.badgeCalls).toBe(before + 1)

    state.badges = { invitations: 150, discussions: 0 }
    await fire(page, 'invite.changed', { invite_id: id(0x777) })
    await expect(invitations).toHaveAccessibleName('Invitations plus de 99 invitations en attente')
    await expect(invitations.locator('[data-nav-badge]')).toHaveText(/^99\+/)
    await expect(discussions).toHaveAccessibleName('Discussions')
    await expect(discussions.locator('[data-nav-badge]')).toBeHidden()
    const pill = await invitations.locator('[data-nav-badge]').boundingBox()
    const link = await invitations.boundingBox()
    expect((pill?.x ?? 0) + (pill?.width ?? 0)).toBeLessThanOrEqual((link?.x ?? 0) + (link?.width ?? 0))
    await expectNoHorizontalOverflow(page)
  })

  test('AC 22: on the Discussions page its own socket keeps the badges right (one socket), and reading clears the count', async ({ page, context, baseURL }, testInfo) => {
    const state = api()
    // The mock counts conversations with unread messages from the read pointers, as the API does.
    state.badges = { invitations: 0, discussions: null }
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await realtimeReady(page)
    const discussions = navLink(page, 'Discussions')
    // Opening the thread reads it: the page tells the badges, which reload and clear.
    await expect.poll(() => state.reads.length).toBe(1)
    // A phone thread is a sub-screen without the nav (AC 25): back on the list, same page and socket, the nav shows.
    if (testInfo.project.name === 'mobile') await page.getByRole('link', { name: 'Retour aux discussions' }).click()
    await expect(discussions).toHaveAccessibleName('Discussions')
    state.badges = { invitations: 1, discussions: 0 }
    await fire(page, 'invite.changed', { invite_id: id(0x778) })
    await expect(navLink(page, 'Invitations')).toHaveAccessibleName('Invitations 1 invitation en attente')
    expect(await page.evaluate(() => (window as unknown as { __fake: { sockets: unknown[] } }).__fake.sockets.length)).toBe(1)
  })

  // QA R2-2: one event at a time, away from Discussions, so that each listener is proved on its own.
  const ONE_EVENT: Array<[string, Record<string, string>, 'Discussions' | 'Invitations', string]> = [
    ['message.delivered', { conversation_id: FIRST, message_id: id(0x910), sender_id: HIM }, 'Discussions', 'Discussions 1 discussion non lue'],
    ['conversation.read', { conversation_id: FIRST, account_id: ME, message_id: id(0x910) }, 'Discussions', 'Discussions 1 discussion non lue'],
    ['invite.changed', { invite_id: id(0x911) }, 'Invitations', 'Invitations 1 invitation en attente'],
  ]
  for (const [event, payload, section, name] of ONE_EVENT) {
    test(`QA R2-2: a single ${event} on Paramètres updates the « ${section} » badge`, async ({ page, context, baseURL }) => {
      const state = api()
      state.badges = { invitations: 0, discussions: 0 }
      await serveApi(context, baseURL ?? '', state)
      // Découvrir needs a live session on the server (app-shell.spec.ts), so the web-only run uses Paramètres: another
      // screen than Discussions, with the same nav script.
      await page.goto('/settings')
      await realtimeReady(page)
      const link = navLink(page, section)
      await expect(link).toHaveAccessibleName(section)
      await expect.poll(() => state.badgeCalls).toBeGreaterThan(0)
      const before = state.badgeCalls
      state.badges = section === 'Discussions' ? { invitations: 0, discussions: 1 } : { invitations: 1, discussions: 0 }
      await fire(page, event, payload)
      await expect(link).toHaveAccessibleName(name)
      await expect(link.locator('[data-nav-badge]')).toHaveText('1')
      expect(state.badgeCalls).toBe(before + 1)
    })
  }
})

test.describe('story chat-polish: a phone thread gives the messages most of the screen, with real CSS (AC 25, QA R2-1)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  async function measure(page: Page) {
    return page.evaluate(() => {
      const box = document.getElementById('thread-scroll') as HTMLElement
      return { box: box.clientHeight, inner: window.innerHeight }
    })
  }

  async function expectTargets(page: Page) {
    for (const target of [
      page.getByRole('link', { name: 'Retour aux discussions' }),
      page.getByRole('link', { name: 'Signaler / Bloquer' }),
      page.getByRole('button', { name: 'Joindre une photo sobre' }),
      page.getByRole('button', { name: 'Enregistrer une note vocale sobre' }),
      page.getByRole('button', { name: 'Envoyer', exact: true }),
    ]) {
      await expect(target).toBeVisible()
      const box = await target.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  }

  for (const [width, height] of [[360, 640], [390, 800]] as const) {
    test(`AC 25: at ${width}x${height} the messages get at least 60 % of the screen; with the keyboard up they still get half`, async ({ page, context, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile', 'phone screens')
      const state = longThread()
      await serveApi(context, baseURL ?? '', state)
      await serveTailwind(context, await compiledTailwind(page, `/discussions/${FIRST}`))
      await page.setViewportSize({ width, height })
      await openThread(page)
      await expect(page.locator('#real-tailwind')).toBeAttached()
      await expect(bubbles(page).last()).toBeInViewport()
      const open = await measure(page)
      expect(open.box / open.inner, `messages ${open.box} px of ${open.inner}`).toBeGreaterThanOrEqual(0.6)
      await expect(threadTitle(page)).toBeInViewport()
      await expect(composer(page)).toBeInViewport()
      await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeHidden()
      await expectPageStill(page)
      await expectNoHorizontalOverflow(page)
      await expectTargets(page)
      await expectAccessible(page)

      // The keyboard takes about 300 px.
      await composer(page).focus()
      await page.setViewportSize({ width, height: height - 300 })
      await expect(bubbles(page).last()).toBeInViewport()
      await expect(threadTitle(page)).toBeInViewport()
      await expect(composer(page)).toBeInViewport()
      const typing = await measure(page)
      expect(typing.box / typing.inner, `messages ${typing.box} px of ${typing.inner} with the keyboard`).toBeGreaterThanOrEqual(0.5)
      await expectPageStill(page)

      // One line to start; it grows with the text up to about five lines, then scrolls, and the view stays at the end.
      const field = composer(page)
      const one = (await field.boundingBox())?.height ?? 0
      expect(one).toBeLessThanOrEqual(48)
      await field.fill('Une ligne\nDeux lignes\nTrois lignes')
      await expect.poll(async () => (await field.boundingBox())?.height ?? 0).toBeGreaterThan(one + 30)
      await field.fill(Array.from({ length: 12 }, (_, index) => `Ligne ${index + 1}`).join('\n'))
      await expect.poll(async () => (await field.boundingBox())?.height ?? 0).toBeLessThanOrEqual(133)
      expect(await field.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true)
      await expect(bubbles(page).last()).toBeInViewport()
      await expect(threadTitle(page)).toBeInViewport()
      await expectPageStill(page)
      await field.fill('')
      await expect.poll(async () => (await field.boundingBox())?.height ?? 0).toBeLessThanOrEqual(48)
    })
  }
})
