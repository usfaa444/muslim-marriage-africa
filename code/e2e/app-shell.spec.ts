import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Story discover-app-shell: one app header, one app footer and one bottom nav (screen 53) on every in-app page.
// Member pages here render for the `web` stub session, a dev-build seam only, so those run on the web-only server.
// /decouvrir needs a live session; its view toggle is covered in apps/web/src/app-shell-browser.test.ts.

const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'
const TARGET = '01990000-0000-7000-8000-000000000099'

// `wholePage: false`: /settings and /profile-edit carry axe findings inside their own content (Stitch toggles and
// buttons this story does not touch), so axe runs on the shared shell there and on the whole page elsewhere.
const MEMBER_PAGES = [
  { path: '/settings', active: 'Profil', wholePage: false },
  { path: '/profile-edit', active: 'Profil', wholePage: false },
  { path: `/invitations/envoyer/${TARGET}`, active: 'Invitations', wholePage: true },
  { path: '/invitations', active: 'Invitations', wholePage: true },
] as const

/** Zero serious or critical WCAG 2.2 AA violations inside the shared header, footer and bottom nav. */
async function expectShellAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .include('#app-header')
    .include('#app-footer')
    .include('#app-bottom-nav')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.flatMap((v) => v.nodes.map((node) => `${v.impact} ${v.id} at ${node.target.join(' ')}`))).toEqual([])
}

const GATED_PAGES = ['/auth', '/signup/identity', '/signup/pseudonym', '/password-reset'] as const

const NAV_ITEMS = [
  ['Découvrir', '/decouvrir'],
  ['Invitations', '/invitations'],
  ['Discussions', '/discussions'],
  ['Profil', '/profil'],
] as const

function bottomNav(page: Page) {
  return page.getByRole('navigation', { name: 'Navigation principale' })
}

async function signInStub(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL ?? 'http://localhost:3100' }])
}

/** After scrolling to the end, the footer's last line sits above the fixed bottom nav. */
async function footerClearOfNav(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const footer = await page.getByRole('contentinfo').boundingBox()
  const nav = await bottomNav(page).boundingBox()
  expect(footer).not.toBeNull()
  expect(nav).not.toBeNull()
  expect((footer?.y ?? 0) + (footer?.height ?? 0)).toBeLessThanOrEqual(nav?.y ?? 0)
}

for (const { path, active, wholePage } of MEMBER_PAGES) {
  test.describe(`member page ${path}`, () => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

    test('has the one header, footer and bottom nav, with its section current', async ({ page, baseURL }) => {
      await signInStub(page, baseURL)
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('banner')).toHaveCount(1)
      await expect(page.getByRole('banner').getByRole('link', { name: 'AnKanu, accueil' })).toHaveAttribute('href', '/decouvrir')
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Confidentialité' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: /Navigation (mobile|membre)/ })).toHaveCount(0)
      const nav = bottomNav(page)
      await expect(nav).toHaveCount(1)
      await expect(nav).toBeVisible()
      const links = nav.getByRole('link')
      await expect(links).toHaveText(NAV_ITEMS.map(([label]) => label))
      for (const [index, [, href]] of NAV_ITEMS.entries()) await expect(links.nth(index)).toHaveAttribute('href', href)
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
      await expect(nav.getByRole('link', { name: active })).toHaveAttribute('aria-current', 'page')
      for (const box of await links.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()))) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
      await footerClearOfNav(page)
      await expectShellAccessible(page)
      if (wholePage) await expectAccessible(page)
    })

    test('fits every factory width with the footer above the bar', async ({ page, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
      await signInStub(page, baseURL)
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await expect(bottomNav(page)).toBeVisible()
        await expectNoHorizontalOverflow(page)
        await footerClearOfNav(page)
      }
    })
  })
}

test.describe('bottom nav navigation', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('each item opens its section, from the keyboard too', async ({ page, baseURL, guards }) => {
    await signInStub(page, baseURL)
    for (const [label, href] of NAV_ITEMS) {
      await page.goto('/settings')
      // The stub session has no screen behind these routes on the web-only server; the URL is what the nav owns.
      await Promise.all([page.waitForURL((url) => url.pathname === href), bottomNav(page).getByRole('link', { name: label }).click()])
    }
    await page.goto('/settings')
    const first = bottomNav(page).getByRole('link', { name: 'Découvrir' })
    for (let step = 0; step < 200; step += 1) {
      await page.keyboard.press('Tab')
      if (await first.evaluate((node) => node === document.activeElement)) break
    }
    await expect(first).toBeFocused()
    await Promise.all([page.waitForURL((url) => url.pathname === '/decouvrir'), page.keyboard.press('Enter')])
    // Expected: the stub session gets the member-route 401 envelope on these routes; each navigation logs it once.
    expect(guards.consoleErrors.every((line) => /status of 401 .*localhost:3100\/(decouvrir|invitations|discussions|profil)$/.test(line))).toBe(true)
    guards.consoleErrors.length = 0
  })
})

for (const path of GATED_PAGES) {
  test(`gated page ${path} has the header and footer but no bottom nav`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('banner')).toHaveCount(1)
    await expect(page.getByRole('banner').getByText('AnKanu', { exact: true })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link')).toHaveCount(0)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)
    await expect(bottomNav(page)).toHaveCount(0)
    await expect(page.locator('[data-app-shell="bottom-nav"]')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await expectAccessible(page)
  })
}

test('the landing page keeps its own header and footer', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-app-shell]')).toHaveCount(0)
  await expect(page.locator('footer#legal')).toBeVisible()
  await expect(bottomNav(page)).toHaveCount(0)
  await expectAccessible(page)
})
