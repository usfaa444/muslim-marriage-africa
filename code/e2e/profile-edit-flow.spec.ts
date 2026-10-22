import type { BrowserContext, Page, Request } from '@playwright/test'
import { expect, expectAccessible, test } from './fixtures'

// /profile-edit and /pin render for the `web` stub session without an API call on the
// server, so these tests answer every browser call to /v1 themselves. They run the same
// way against the local web-only server and against a full stack (E2E_BASE_URL).

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

type Api = {
  profile: Record<string, unknown>
  pinEnabled: boolean
  saveRefusal: { status: number; body: unknown } | null
  profileReads: number
  saves: Array<Record<string, unknown>>
  pinSets: string[]
  unlocks: string[]
  /** Photo grants the stand-in API still honours. Any other token answers 403, like an expired grant. */
  liveTokens: Set<string>
  /** Token for the next profile reads, in order. The last one repeats. */
  tokens: string[]
}

function storedProfile(): Record<string, unknown> {
  return {
    dob: '1990-01-15',
    city: 'ouagadougou',
    country: 'BF',
    origin: 'Plateau-Central',
    education: 'licence',
    profession: 'enseignement',
    marital_status: null,
    polygamy_intent: null,
    madhhab: 'maliki',
    practice: 'assidue',
    life_plans: 'tf:6months\nUnion stable',
    bio_pending: null,
    bio_live: null,
    photo_blur: true,
    review_sla_hours: 24,
    completeness: { percent: 100, missing: [], ready: true },
    photo: null,
    photos: [],
  }
}

function newApi(overrides: Partial<Api> = {}): Api {
  return {
    profile: storedProfile(),
    pinEnabled: false,
    saveRefusal: null,
    profileReads: 0,
    saves: [],
    pinSets: [],
    unlocks: [],
    liveTokens: new Set(),
    tokens: [],
    ...overrides,
  }
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

async function serveApi(context: BrowserContext, baseURL: string, api: Api): Promise<void> {
  await context.addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL }])
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname === '/v1/me/profile' && method === 'GET') {
      api.profileReads += 1
      const token = api.tokens.length > 1 ? (api.tokens.shift() ?? '') : (api.tokens[0] ?? '')
      const photos = token
        ? [{ id: 'main', moderation_state: 'live', is_main: true, caption: null, url: `/v1/media/get?token=${token}` }]
        : []
      await route.fulfill(json({ ...api.profile, photos }))
      return
    }
    if (url.pathname === '/v1/me/profile' && method === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      api.saves.push(body)
      if (api.saveRefusal) {
        await route.fulfill(json(api.saveRefusal.body, api.saveRefusal.status))
        return
      }
      api.profile = { ...api.profile, ...body }
      await route.fulfill(json({ ...api.profile, photos: [] }))
      return
    }
    if (url.pathname === '/v1/media/get') {
      const token = url.searchParams.get('token') ?? ''
      if (api.liveTokens.has(token)) {
        await route.fulfill({ status: 200, contentType: 'image/png', body: PNG })
        return
      }
      await route.fulfill(json({ error: { code: 'FORBIDDEN', message: 'Accès au média refusé.', details: null } }, 403))
      return
    }
    if (url.pathname === '/v1/pin' && method === 'GET') {
      await route.fulfill(json({ enabled: api.pinEnabled, locked: false }))
      return
    }
    if (url.pathname === '/v1/pin' && method === 'PUT') {
      const pin = String((request.postDataJSON() as { pin?: unknown }).pin ?? '')
      api.pinSets.push(pin)
      if (!/^[0-9]{6}$/.test(pin)) {
        await route.fulfill(json({ error: { code: 'UNHANDLED', message: 'pin : six chiffres sont requis.', details: { field: 'pin' } } }, 400))
        return
      }
      api.pinEnabled = true
      await route.fulfill(json({ enabled: true }))
      return
    }
    if (url.pathname === '/v1/pin/unlock') {
      const pin = String((request.postDataJSON() as { pin?: unknown }).pin ?? '')
      api.unlocks.push(pin)
      await route.fulfill(json({ locked: false }))
      return
    }
    if (url.pathname === '/v1/pin/lock') {
      await route.fulfill(json({ locked: false }))
      return
    }
    await route.fulfill(json({ error: { code: 'NOT_FOUND', message: 'Not found', details: null } }, 404))
  })
}

function isProfileSave(request: Request): boolean {
  return request.method() === 'PUT' && new URL(request.url()).pathname === '/v1/me/profile'
}

async function openProfile(page: Page): Promise<void> {
  await page.goto('/profile-edit')
  await expect(page.getByLabel('Date de naissance')).toHaveValue('1990-01-15')
}

function pinCheckbox(page: Page) {
  return page.getByRole('checkbox', { name: "Activer le code PIN d'accès" })
}

function pinSwitch(page: Page) {
  // The Stitch switch is a visually hidden checkbox inside its own label; a member taps the label.
  return page.locator('label').filter({ has: pinCheckbox(page) })
}

// The Stitch screens style themselves with the Tailwind CDN. Where the CDN is blocked (a sandbox),
// they render unstyled, so the keypad and the small text buttons do not have their shipped sizes.
// Only then are those targets left out of axe; a styled run checks them.
async function accessibleAsShipped(page: Page, unstyledTargets: string[]): Promise<void> {
  const styled = await page.evaluate(() => 'tailwind' in window)
  await expectAccessible(page, styled ? [] : unstyledTargets)
}

const PROFILE_TARGETS = ['#profile-photo-rules']
const PIN_TARGETS = ['[data-key]', '#btn-clear', '#btn-backspace']

async function pressDigits(page: Page, digits: string): Promise<void> {
  for (const digit of digits) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
}

async function filledDots(page: Page): Promise<number> {
  return page.locator('.pin-dot').evaluateAll((dots) => dots.filter((dot) => getComputedStyle(dot).opacity === '1').length)
}

test.describe('profile edit and the PIN screen', () => {
  test('turning the PIN on saves unsaved edits, sets a six-digit PIN and returns to the profile', async ({ page, context, baseURL }) => {
    const api = newApi()
    await serveApi(context, baseURL ?? '', api)
    await openProfile(page)
    await accessibleAsShipped(page, PROFILE_TARGETS)

    await page.getByLabel("Origine / Région d'attache").fill('Kadiogo')
    const saved = page.waitForRequest(isProfileSave)
    await pinSwitch(page).click()
    expect((await saved).postDataJSON()).toMatchObject({ origin: 'Kadiogo', dob: '1990-01-15', madhhab: 'maliki' })
    await expect(page).toHaveURL(/\/pin\?next=%2Fprofile-edit$/)
    expect(api.saves).toHaveLength(1)

    await expect(page.locator('.pin-dot')).toHaveCount(6)
    await pressDigits(page, '1357')
    await expect.poll(() => filledDots(page)).toBe(4)
    await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
    await pressDigits(page, '9')
    await expect.poll(() => filledDots(page)).toBe(5)
    expect(api.pinSets).toEqual([])
    await accessibleAsShipped(page, PIN_TARGETS)

    await pressDigits(page, '0')
    await expect(page).toHaveURL(/\/profile-edit$/)
    expect(api.pinSets).toEqual(['135790'])
    await expect(page.getByLabel("Origine / Région d'attache")).toHaveValue('Kadiogo')
    await expect(pinCheckbox(page)).toBeChecked()
  })

  test('a refused save keeps the member on the profile with the error and the PIN off', async ({ page, context, baseURL, guards }) => {
    const api = newApi({
      saveRefusal: {
        status: 400,
        body: { error: { code: 'UNHANDLED', message: "dob : l'âge déclaré est inférieur au minimum.", details: { field: 'dob' }, retryable: false } },
      },
    })
    await serveApi(context, baseURL ?? '', api)
    await openProfile(page)
    await page.getByLabel("Origine / Région d'attache").fill('Kadiogo')
    const saved = page.waitForResponse((response) => isProfileSave(response.request()))
    await pinSwitch(page).click()
    expect((await saved).status()).toBe(400)

    await expect(page.getByText("dob : l'âge déclaré est inférieur au minimum.").first()).toBeVisible()
    // The browser logs the refused save; that is the case under test. The page shows the error
    // after the browser logged it, so the log is in by now.
    guards.consoleErrors.length = 0
    await expect(page).toHaveURL(/\/profile-edit$/)
    await expect(pinCheckbox(page)).not.toBeChecked()
    await expect(page.getByLabel("Origine / Région d'attache")).toHaveValue('Kadiogo')
    await accessibleAsShipped(page, PROFILE_TARGETS)
  })

  test('a PIN saved with four digits before the six-digit rule still unlocks with the unlock button', async ({ page, context, baseURL }) => {
    const api = newApi({ pinEnabled: true })
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/pin?next=%2Fprofile-edit')
    await accessibleAsShipped(page, PIN_TARGETS)
    await pressDigits(page, '1357')
    await expect.poll(() => filledDots(page)).toBe(4)
    expect(api.unlocks).toEqual([])
    await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
    await expect(page).toHaveURL(/\/profile-edit$/)
    expect(api.unlocks).toEqual(['1357'])
  })

  test('the PIN screen never returns to another origin', async ({ page, context, baseURL }) => {
    const api = newApi()
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/pin?next=%2F%2Fevil.example%2Fprofile-edit')
    await accessibleAsShipped(page, PIN_TARGETS)
    await pressDigits(page, '246813')
    await expect(page).toHaveURL(/\/onboarding$/)
  })
})

test.describe('profile edit photos', () => {
  test('a photo whose signed URL expired is read again and shown without a reload', async ({ page, context, baseURL, guards }) => {
    const api = newApi({ tokens: ['expired', 'fresh'], liveTokens: new Set(['fresh']) })
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/profile-edit')
    const photo = page.getByRole('img', { name: 'Photo principale de profil' })
    await expect(photo).toHaveAttribute('src', '/v1/media/get?token=fresh')
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    expect(api.profileReads).toBe(2)
    // The expired grant answered 403 once before the repair; the browser logs that load.
    guards.consoleErrors.length = 0
    await accessibleAsShipped(page, PROFILE_TARGETS)
  })

  test('a page restored from the back/forward cache reads fresh photo grants', async ({ page, context, baseURL }) => {
    const api = newApi({ tokens: ['first', 'second'], liveTokens: new Set(['first', 'second']) })
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/profile-edit')
    const photo = page.getByRole('img', { name: 'Photo principale de profil' })
    await expect(photo).toHaveAttribute('src', '/v1/media/get?token=first')
    await page.getByLabel("Origine / Région d'attache").fill('Kadiogo')
    // Playwright's Chromium runs without the back/forward cache, so send the event a restore sends.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
    await expect(photo).toHaveAttribute('src', '/v1/media/get?token=second')
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    await expect(page.getByLabel("Origine / Région d'attache")).toHaveValue('Kadiogo')
    expect(api.profileReads).toBe(2)
    await accessibleAsShipped(page, PROFILE_TARGETS)
  })
})

test.describe('web image screens', () => {
  test.skip(!process.env.E2E_BASE_URL, 'The web-only dev server reads the repo; only a built image can miss a screen.')

  test('screens read from the image answer without a server error', async ({ context, baseURL }) => {
    // 52-ts-visit-signals is one of the screens the image did not copy. The staff stub reaches it with no
    // account. Only the server answer is checked: the API has no staff stub, so the page's own data call
    // answers 401. Review, discover and favourites need a member past the signup gate (see the handoff).
    await context.addCookies([{ name: 'ankanu_session', value: 'staff', url: baseURL ?? '' }])
    const response = await context.request.get('/staff/visit-signals', { maxRedirects: 0 })
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/html')
  })
})
