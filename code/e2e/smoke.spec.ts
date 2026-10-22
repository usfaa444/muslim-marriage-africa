import { WIDTHS, expect, expectAccessible, expectNoHorizontalOverflow, test } from './fixtures'

const PUBLIC_PAGES = ['/', '/auth', '/signup', '/password-reset'] as const

for (const path of PUBLIC_PAGES) {
  test.describe(`public page ${path}`, () => {
    test('renders without console errors and passes axe AA', async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.locator('body')).toBeVisible()
      await expect(page).toHaveTitle(/\S/)
      await expectAccessible(page)
    })

    test('fits every factory width', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await expectNoHorizontalOverflow(page)
      }
    })
  })
}

test('a signed-out visitor is sent from Discover to sign-in', async ({ page }) => {
  await page.goto('/decouvrir')
  await expect(page).toHaveURL(/\/auth$/)
})
