import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// The server entry guard decides who gets the sign-in form. The browser never reads
// /v1/accounts/gate while showing it, so a signed-out visitor logs no 401.
function watchGateReads(page: Page): string[] {
  const reads: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/v1/accounts/gate') reads.push(`${request.method()} ${request.url()}`)
  })
  return reads
}

for (const path of ['/auth', '/decouvrir'] as const) {
  test(`a signed-out visitor opening ${path} gets the sign-in form with no browser gate read`, async ({ page }) => {
    const reads = watchGateReads(page)
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/auth$/)
    await expect(page.locator('#login-form')).toBeVisible()
    // Absence check: give a late request the time to show up.
    await page.waitForLoadState('networkidle')
    expect(reads).toEqual([])
  })
}

test('a sign-in page restored from the back-forward cache reloads so the server guard decides', async ({ page }) => {
  const reads = watchGateReads(page)
  await page.goto('/auth')
  await expect(page.locator('#login-form')).toBeVisible()
  await page.evaluate(() => {
    ;(window as unknown as { restoredDocument: boolean }).restoredDocument = true
  })
  // Playwright's Chromium runs without the back-forward cache, so send the event a restore sends.
  const reloaded = page.waitForEvent('load')
  await page.evaluate(() => {
    setTimeout(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })), 0)
  })
  await reloaded
  await expect(page).toHaveURL(/\/auth$/)
  expect(await page.evaluate(() => (window as unknown as { restoredDocument?: boolean }).restoredDocument)).toBeUndefined()
  await expect(page.locator('#login-form')).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(reads).toEqual([])
})
