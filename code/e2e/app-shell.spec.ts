import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Story discover-app-shell: one bottom nav (screen 53) on every member page. Story chat-polish (Faycal): « Header and
// footer will only be on the landing page »: member pages lose the site header and footer, signed-out pages keep them.
// Member pages here render for the `web` stub session, a dev-build seam only, so those run on the web-only server.
// /decouvrir needs a live session; its view toggle is covered in apps/web/src/app-shell-browser.test.ts.

const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'
const TARGET = '01990000-0000-7000-8000-000000000099'

// `wholePage: false`: /profile-edit carries axe findings inside its own content (Stitch buttons this story does not
// touch), so axe runs on the shared shell there and on the whole page elsewhere. /settings joined the whole-page pages
// once its Lite and PIN switches got names (story chat-polish, QA R2-4).
// `subScreen`: on a phone a thread is a sub-screen without the bottom nav (story chat-polish, AC 25); from 768 px it
// sits in the split view, with the nav.
const MEMBER_PAGES: ReadonlyArray<{ path: string; active: string; wholePage: boolean; subScreen?: boolean }> = [
  { path: '/settings', active: 'Profil', wholePage: true },
  { path: '/profile-edit', active: 'Profil', wholePage: false },
  { path: `/invitations/envoyer/${TARGET}`, active: 'Invitations', wholePage: true },
  { path: '/invitations', active: 'Invitations', wholePage: true },
  { path: '/discussions', active: 'Discussions', wholePage: true },
  { path: `/discussions/${TARGET}`, active: 'Discussions', wholePage: true, subScreen: true },
]

/** Zero serious or critical WCAG 2.2 AA violations inside the shared bottom nav. */
async function expectShellAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .include('#app-bottom-nav')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.flatMap((v) => v.nodes.map((node) => `${v.impact} ${v.id} at ${node.target.join(' ')}`))).toEqual([])
}

/** Signed-out pages: they keep the site header and footer. */
const PUBLIC_PAGES = ['/auth', '/signup/identity', '/signup/pseudonym', '/password-reset'] as const

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

/** After scrolling to the end, the end of the page's content sits above the fixed bottom nav. */
async function contentClearOfNav(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const end = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (!main) return null
    let bottom = 0
    for (const node of Array.from(main.querySelectorAll('*'))) {
      const rect = node.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0 && getComputedStyle(node).position !== 'fixed') bottom = Math.max(bottom, rect.bottom)
    }
    return bottom
  })
  const nav = await bottomNav(page).boundingBox()
  expect(end).not.toBeNull()
  expect(nav).not.toBeNull()
  expect(Math.round(end ?? 0)).toBeLessThanOrEqual(Math.round(nav?.y ?? 0))
}

for (const { path, active, wholePage, subScreen } of MEMBER_PAGES) {
  test.describe(`member page ${path}`, () => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

    test('has the bottom nav with its section current, and no site header or footer', async ({ page, baseURL }) => {
      await signInStub(page, baseURL)
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.locator('#app-header, #app-footer')).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'AnKanu, accueil' })).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: /Navigation (mobile|membre)/ })).toHaveCount(0)
      if (subScreen && (page.viewportSize()?.width ?? 0) < 768) {
        // A phone thread: no bottom nav, « Retour aux discussions » leads to the list where it is.
        await expect(page.locator('#app-bottom-nav')).toBeHidden()
        await expect(page.getByRole('link', { name: 'Retour aux discussions' })).toBeVisible()
        await page.setViewportSize({ width: 1024, height: 900 })
      }
      const nav = bottomNav(page)
      await expect(nav).toHaveCount(1)
      await expect(nav).toBeVisible()
      const links = nav.getByRole('link')
      // Each link's name is its label, then the badge's count for screen readers when there is one (story chat-polish).
      await expect(links).toHaveText(NAV_ITEMS.map(([label]) => new RegExp(label)))
      for (const [index, [, href]] of NAV_ITEMS.entries()) await expect(links.nth(index)).toHaveAttribute('href', href)
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
      await expect(nav.getByRole('link', { name: active })).toHaveAttribute('aria-current', 'page')
      for (const box of await links.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()))) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
      await contentClearOfNav(page)
      await expectShellAccessible(page)
      if (wholePage) await expectAccessible(page)
    })

    test('fits every factory width with the end of the page above the bar', async ({ page, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
      await signInStub(page, baseURL)
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await expectNoHorizontalOverflow(page)
        if (subScreen && width < 768) {
          await expect(page.locator('#app-bottom-nav')).toBeHidden()
          continue
        }
        await expect(bottomNav(page)).toBeVisible()
        await contentClearOfNav(page)
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

test.describe('links that moved with the footer', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('« Confidentialité » is one tap away in Paramètres', async ({ page, baseURL }) => {
    await signInStub(page, baseURL)
    await page.goto('/settings')
    const privacy = page.getByRole('link', { name: /Confidentialité/ })
    await expect(privacy).toHaveAttribute('href', '/#legal')
    const box = await privacy.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  })
})

for (const path of PUBLIC_PAGES) {
  test(`signed-out page ${path} has the header and footer but no bottom nav`, async ({ page }) => {
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
