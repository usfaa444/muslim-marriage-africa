import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { api, bubbles, fire, FIRST, HIM, id, ME, openList, openThread, realtimeReady, row, serveApi, STUB_SKIP, text, wheelThreadToTop } from './chat-polish-mock'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

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
        // The composer ends above the bottom nav.
        const form = await page.locator('#thread-form').boundingBox()
        const nav = await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox()
        expect(Math.round((form?.y ?? 0) + (form?.height ?? 0)), `${width}x${height}`).toBeLessThanOrEqual(Math.round(nav?.y ?? 0))
      }
    }
  })

  test('AC 23: the on-screen keyboard shrinks the screen: the composer and the latest message stay in view, the bottom nav steps aside', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the keyboard is a phone matter')
    await serveApi(context, baseURL ?? '', longThread())
    await openThread(page)
    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await composer(page).focus()
    await expect(nav).toBeHidden()
    // Stands in for the keyboard: the visible viewport loses most of its height.
    await page.setViewportSize({ width: 360, height: 380 })
    await expect(composer(page)).toBeInViewport()
    await expect(bubbles(page).last()).toBeInViewport()
    await expect(threadTitle(page)).toBeInViewport()
    await expectPageStill(page)
    await page.setViewportSize({ width: 360, height: 780 })
    await bubbles(page).last().click()
    await expect(nav).toBeVisible()
    await expect(bubbles(page).last()).toBeInViewport()
    await expectPageStill(page)
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
    await toggle.press('Space')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect.poll(() => state.settingPuts.length).toBe(2)
    expect(state.setting).toBe(false)

    await page.route('**/v1/chat/settings', (route) => (route.request().method() === 'PUT' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.fallback()))
    await toggle.click()
    await expect(page.getByRole('alert').filter({ hasText: 'Réglage non enregistré. Réessayez.' })).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    // Paramètres carries Stitch findings this story does not touch (app-shell.spec.ts): axe runs on the new section.
    const { violations } = await new AxeBuilder({ page }).include('[data-receipts-settings]').include('[data-privacy-settings]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([])
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

  test('AC 22: on the Discussions page its own socket keeps the badges right (one socket), and reading clears the count', async ({ page, context, baseURL }) => {
    const state = api()
    // The mock counts conversations with unread messages from the read pointers, as the API does.
    state.badges = { invitations: 0, discussions: null }
    await serveApi(context, baseURL ?? '', state)
    await openThread(page)
    await realtimeReady(page)
    const discussions = navLink(page, 'Discussions')
    // Opening the thread reads it: the page tells the badges, which reload and clear.
    await expect.poll(() => state.reads.length).toBe(1)
    await expect(discussions).toHaveAccessibleName('Discussions')
    state.badges = { invitations: 1, discussions: 0 }
    await fire(page, 'invite.changed', { invite_id: id(0x778) })
    await expect(navLink(page, 'Invitations')).toHaveAccessibleName('Invitations 1 invitation en attente')
    expect(await page.evaluate(() => (window as unknown as { __fake: { sockets: unknown[] } }).__fake.sockets.length)).toBe(1)
  })
})
