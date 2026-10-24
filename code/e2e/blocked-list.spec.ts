import type { BrowserContext, Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// « Membres bloqués » (Story 8.6 follow-up) at /settings/bloques, reached from Paramètres (screen 27). The page renders
// for the `web` stub session; these tests answer every browser call to /v1 themselves and record each DELETE.
const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

const HIM = '01990000-0000-7000-8000-0000000000e2'
const OTHER = '01990000-0000-7000-8000-0000000000e3'
const THIRD = '01990000-0000-7000-8000-0000000000e4'
// 1×1 PNG: stands in for the blurred derivative the API signs.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

type Item = { blocked_id: string; pseudonym: string; created_at: string; photo: { id: string; url: string } | null }

type Api = {
  items: Item[]
  deletes: string[]
  listStatus: number
  deleteFailure?: { status: number; body: unknown } | 'abort'
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

function error(code: string, message: string, status: number) {
  return json({ error: { code, message, details: null, request_id: 'r', retryable: false } }, status)
}

function state(): Api {
  return {
    items: [
      { blocked_id: HIM, pseudonym: 'Al-Hassan_BF', created_at: '2026-10-22T09:00:00.000Z', photo: { id: 'p1', url: '/v1/media/get?token=blur-1' } },
      { blocked_id: OTHER, pseudonym: 'Ousmane_Ouaga', created_at: '2026-10-20T09:00:00.000Z', photo: null },
    ],
    deletes: [],
    listStatus: 200,
  }
}

async function serveApi(context: BrowserContext, baseURL: string, api: Api): Promise<void> {
  await context.addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL }])
  for (const host of ['https://cdn.tailwindcss.com/**', 'https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**']) {
    const tailwind = host.includes('tailwind')
    await context.route(host, (route) =>
      route.fulfill({ status: 200, contentType: tailwind ? 'application/javascript' : 'text/css', body: tailwind ? 'window.tailwind = {}' : '' }),
    )
  }
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname === '/v1/blocks' && method === 'GET') {
      if (api.listStatus !== 200) {
        await route.fulfill(error('UNHANDLED', 'Request failed', api.listStatus))
        return
      }
      await route.fulfill(json({ count: api.items.length, items: api.items }))
      return
    }
    if (url.pathname.startsWith('/v1/blocks/') && method === 'DELETE') {
      const id = url.pathname.slice('/v1/blocks/'.length)
      api.deletes.push(id)
      if (api.deleteFailure) {
        const failure = api.deleteFailure
        delete api.deleteFailure
        if (failure === 'abort') await route.abort('failed')
        else await route.fulfill(json(failure.body, failure.status))
        return
      }
      api.items = api.items.filter((item) => item.blocked_id !== id)
      await route.fulfill(json({}))
      return
    }
    if (url.pathname === '/v1/media/get') {
      await route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
      return
    }
    if (url.pathname === '/v1/pin' && method === 'GET') {
      await route.fulfill(json({ enabled: false, locked: false }))
      return
    }
    await route.fulfill(error('NOT_FOUND', 'Not found', 404))
  })
}

async function openList(page: Page): Promise<void> {
  const loaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/v1/blocks')
  await page.goto('/settings/bloques')
  await loaded
  await expect(page.locator('#blocked-list-page')).toHaveAttribute('aria-busy', 'false')
}

test.describe('Membres bloqués (Story 8.6 follow-up)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('from Paramètres: lists pseudonym and blurred photo, asks to confirm, then unblocks one member', async ({ page, context, baseURL }) => {
    const api = state()
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/settings')
    const entry = page.getByRole('link', { name: /Membres bloqués/ })
    await expect(entry).toHaveAttribute('href', '/settings/bloques')
    const loaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/v1/blocks')
    await entry.click()
    await loaded
    await expect(page).toHaveURL(/\/settings\/bloques$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Membres bloqués' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour aux paramètres' })).toHaveAttribute('href', '/settings')
    await expect(page.getByText('2 membres bloqués')).toBeVisible()
    const rows = page.getByRole('list', { name: 'Membres bloqués' }).getByRole('listitem')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toContainText('Al-Hassan_BF')
    await expect(rows.nth(0)).toContainText('Bloqué le 22 octobre 2026')
    await expect(rows.nth(0).locator('img')).toHaveAttribute('src', '/v1/media/get?token=blur-1')
    await expect(rows.nth(0).locator('img')).toHaveAttribute('alt', '')
    await expect(rows.nth(1).locator('img')).toHaveCount(0)
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)

    // Cancel: nothing is sent, focus returns to the button.
    const unblock = page.getByRole('button', { name: 'Débloquer Al-Hassan_BF' })
    await unblock.click()
    await expect(unblock).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText('Débloquer Al-Hassan_BF ?')).toBeFocused()
    await expect(rows.nth(0).getByText('Ce membre pourra de nouveau voir votre fiche, vous envoyer une invitation et vous écrire dans une discussion existante.')).toBeVisible()
    await expect(rows.nth(1).getByRole('button', { name: 'Confirmer le déblocage' })).toBeHidden()
    await expectAccessible(page)
    await page.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByRole('button', { name: 'Confirmer le déblocage' })).toBeHidden()
    await expect(unblock).toBeFocused()
    expect(api.deletes).toEqual([])

    // Confirm: one DELETE for that member only.
    await unblock.click()
    const deleted = page.waitForResponse((response) => response.request().method() === 'DELETE')
    await page.getByRole('button', { name: 'Confirmer le déblocage' }).dblclick()
    await deleted
    expect(api.deletes).toEqual([HIM])
    await expect(page.getByRole('status').filter({ hasText: 'Blocage levé pour Al-Hassan_BF.' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Membres bloqués' })).toBeFocused()
    await expect(rows).toHaveCount(1)
    await expect(page.getByText('1 membre bloqué')).toBeVisible()
    await expectAccessible(page)

    // Reload: the list comes from the API again.
    await openList(page)
    await expect(rows).toHaveCount(1)
    await expect(rows.nth(0)).toContainText('Ousmane_Ouaga')
  })

  test('shows the empty state, a load error with retry, the sign-in link on 401, and drops a Block already lifted', async ({ page, context, baseURL }) => {
    const api = state()
    api.listStatus = 500
    await serveApi(context, baseURL ?? '', api)
    await openList(page)
    await expect(page.getByRole('alert').filter({ hasText: 'Chargement impossible. Vérifiez votre connexion et réessayez.' })).toBeVisible()
    api.listStatus = 200
    const again = page.waitForResponse((response) => new URL(response.url()).pathname === '/v1/blocks')
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await again
    await expect(page.getByRole('listitem')).toHaveCount(2)

    api.deleteFailure = { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.', details: null, request_id: 'r', retryable: false } } }
    await page.getByRole('button', { name: 'Débloquer Ousmane_Ouaga' }).click()
    await page.getByRole('button', { name: 'Confirmer le déblocage' }).click()
    await expect(page.getByRole('alert').getByRole('link', { name: 'Se reconnecter' })).toHaveAttribute('href', '/auth')
    await expect(page.getByRole('listitem')).toHaveCount(2)
    await expectAccessible(page)

    api.deleteFailure = { status: 404, body: { error: { code: 'NOT_FOUND', message: "Ce blocage n'existe pas.", details: null, request_id: 'r', retryable: false } } }
    await page.getByRole('button', { name: 'Confirmer le déblocage' }).click()
    await expect(page.getByRole('status').filter({ hasText: "Ce blocage n'existe plus." })).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(1)

    api.items = []
    await openList(page)
    await expect(page.getByText("Vous n'avez bloqué aucun membre.")).toBeVisible()
    await expect(page.locator('#blocked-count')).toBeHidden()
    await expectAccessible(page)
  })

  test('QA round 2: hostile, long and Arabic pseudonyms render as text and fit; the date is in Ouagadougou time', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    const api = state()
    api.items = [
      { blocked_id: HIM, pseudonym: '<img src=x onerror=window.__xss=1>', created_at: '2026-10-22T09:00:00.000Z', photo: { id: 'p1', url: '/v1/media/get?token=blur-1' } },
      { blocked_id: OTHER, pseudonym: 'Aïssatou_Ouédraogo_très_très_longue_pseudonyme_0123456789', created_at: '2026-10-21T23:30:00.000Z', photo: null },
      { blocked_id: THIRD, pseudonym: 'عبد_الله', created_at: '2026-10-20T09:00:00.000Z', photo: null },
    ]
    await serveApi(context, baseURL ?? '', api)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openList(page)
      await expect(page.getByRole('listitem')).toHaveCount(3)
      expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
      await expect(page.locator('img[src="x"]')).toHaveCount(0)
      await expectNoHorizontalOverflow(page)
    }
    await expect(page.getByRole('listitem').nth(0)).toContainText('<img src=x onerror=window.__xss=1>')
    await page.getByRole('listitem').nth(1).getByRole('button', { name: /^Débloquer/ }).click()
    await expectNoHorizontalOverflow(page)
    await expect(page.getByRole('listitem').nth(1)).toContainText('Bloqué le 21 octobre 2026')
    await expect(page.getByRole('listitem').nth(2)).toContainText('عبد_الله')
    await expectAccessible(page)
  })

  test('QA round 2: a failed DELETE (network, 500) keeps the row and says why; the retry works; signed out goes to sign-in', async ({ page, context, baseURL, guards }) => {
    const api = state()
    await serveApi(context, baseURL ?? '', api)
    await openList(page)
    const row = page.getByRole('listitem').nth(1)
    await row.getByRole('button', { name: 'Débloquer Ousmane_Ouaga' }).click()
    api.deleteFailure = 'abort'
    await row.getByRole('button', { name: 'Confirmer le déblocage' }).click()
    await expect(row.getByRole('alert')).toHaveText('Envoi impossible. Vérifiez votre connexion et réessayez.')
    await expect(page.getByRole('listitem')).toHaveCount(2)
    api.deleteFailure = { status: 500, body: { error: { code: 'UNHANDLED', message: 'Request failed', details: null, request_id: 'r', retryable: true } } }
    await row.getByRole('button', { name: 'Confirmer le déblocage' }).click()
    await expect(row.getByRole('alert')).toHaveText('Envoi impossible. Vérifiez votre connexion et réessayez.')
    await expect(page.getByRole('listitem')).toHaveCount(2)
    await expectAccessible(page)
    await row.getByRole('button', { name: 'Confirmer le déblocage' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(1)
    expect(api.deletes).toEqual([OTHER, OTHER, OTHER])
    // The aborted request and the 500 are expected here; nothing else may fail.
    expect(guards.failedRequests.filter((line) => !line.includes(`/v1/blocks/${OTHER}`))).toEqual([])
    guards.failedRequests.length = 0
    guards.consoleErrors = guards.consoleErrors.filter((line) => !line.includes(`/v1/blocks/${OTHER}`))
    await context.clearCookies()
    await page.goto('/settings/bloques')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('keyboard only: open the confirmation and unblock with the keyboard', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'keyboard path runs once')
    const api = state()
    await serveApi(context, baseURL ?? '', api)
    await openList(page)
    const unblock = page.getByRole('button', { name: 'Débloquer Al-Hassan_BF' })
    await unblock.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Débloquer Al-Hassan_BF ?')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Confirmer le déblocage' })).toBeFocused()
    const deleted = page.waitForResponse((response) => response.request().method() === 'DELETE')
    await page.keyboard.press('Enter')
    await deleted
    expect(api.deletes).toEqual([HIM])
    await expect(page.getByRole('heading', { level: 1, name: 'Membres bloqués' })).toBeFocused()
  })

  test('fits every factory width, with the confirmation open', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await serveApi(context, baseURL ?? '', state())
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openList(page)
      await page.getByRole('button', { name: 'Débloquer Al-Hassan_BF' }).click()
      await expectNoHorizontalOverflow(page)
    }
  })
})
