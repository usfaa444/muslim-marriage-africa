import type { BrowserContext, Page, Request } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test } from './fixtures'

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
  /** Answers for the next unlock attempts, in order. Then every unlock is accepted. */
  unlockRefusals: Array<{ status: number; body: unknown }>
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
    unlockRefusals: [],
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
      const refusal = api.unlockRefusals.shift()
      if (refusal) {
        await route.fulfill(json(refusal.body, refusal.status))
        return
      }
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

// The Stitch screens style themselves with the Tailwind CDN they load. Contrast and target sizes
// only mean something on the styled page, so the accessibility check refuses an unstyled one
// (a machine that cannot reach the CDN must serve it locally; see the QA handoff).
async function expectStyled(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => 'tailwind' in window), {
      message: 'The Tailwind CDN did not load, so the Stitch screen is unstyled and cannot be checked as shipped.',
    })
    .toBe(true)
}

type PreExisting = { selector: string; count: number; what: string }

// Known pre-existing issues, QA report fix-profile-edit-flow round 1, finding 4: Stitch text and icons
// on /profile-edit below 4.5:1 on cream (axe color-contrast, serious). This story did not add or change
// them; they are routed to a separate fix. Each selector must match exactly `count` elements, so an
// exclusion cannot grow to hide a new element, and none may cover an element this story touches.
const PROFILE_EDIT_PRE_EXISTING: PreExisting[] = [
  { selector: 'p.text-xs.text-deep-navy\\/60.mt-1', count: 8, what: 'section subtitles, text-deep-navy/60 (4.34:1)' },
  { selector: 'span.text-\\[11px\\].text-deep-navy\\/60', count: 1, what: '« Condition formelle préalable » (4.34:1)' },
  { selector: 'p.text-\\[11px\\].text-deep-navy\\/60', count: 1, what: '« Mentionnez vos perspectives de vie commune… » (4.34:1)' },
  { selector: 'span[data-icon="lock"]', count: 1, what: 'lock icon beside « Sécurité sur l\'appareil », text-deep-navy/60' },
  { selector: 'span[data-icon="check_circle"]', count: 1, what: 'gold check icon in the madhhab block, text-soft-gold' },
  { selector: 'span.material-symbols-outlined.text-\\[13px\\].text-soft-gold', count: 1, what: 'gold cake icon beside the age' },
  { selector: 'span.material-symbols-outlined.text-deep-navy\\/40', count: 1, what: 'calendar icon in the date field, text-deep-navy/40' },
  { selector: '#profile-meter-banner span[data-icon="info"]', count: 1, what: 'gold info icon of the « Il manque » banner, text-soft-gold' },
]

// What this story added or changed on /profile-edit. Every one of them is checked by axe.
const PROFILE_EDIT_OWN = ['#profile-pin', '#profile-pin-status', '#profile-photo-blur', '#profile-photo-file', '#profile-photo-grid', '#profile-save-status']

async function expectAccessibleAsShipped(page: Page, preExisting: PreExisting[] = [], own: string[] = []): Promise<void> {
  await expectStyled(page)
  for (const known of preExisting) {
    await expect(page.locator(known.selector), known.what).toHaveCount(known.count)
  }
  for (const selector of own) {
    const covered = await page.locator(selector).evaluateAll(
      (nodes, selectors) => nodes.some((node) => selectors.some((known) => node.closest(known) !== null)),
      preExisting.map((known) => known.selector),
    )
    expect(covered, `${selector} must not sit inside a pre-existing exclusion`).toBe(false)
  }
  await expectAccessible(
    page,
    preExisting.map((known) => known.selector),
  )
}

function pinStatus(page: Page) {
  return page.getByRole('status')
}

// A navigation is over when the new page has loaded. Leaving it earlier aborts its stylesheet and
// font downloads, which the guards count as failed requests (QA round 2, finding 16).
async function expectArrived(page: Page, url: string | RegExp, message?: string): Promise<void> {
  await expect(page, message).toHaveURL(url)
  await page.waitForLoadState('load')
}

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
    await expectAccessibleAsShipped(page, PROFILE_EDIT_PRE_EXISTING, PROFILE_EDIT_OWN)

    await page.getByLabel("Origine / Région d'attache").fill('Kadiogo')
    const saved = page.waitForRequest(isProfileSave)
    await pinSwitch(page).click()
    expect((await saved).postDataJSON()).toMatchObject({ origin: 'Kadiogo', dob: '1990-01-15', madhhab: 'maliki' })
    await expectArrived(page, /\/pin\?next=%2Fprofile-edit$/)
    expect(api.saves).toHaveLength(1)

    await expect(page.locator('.pin-dot')).toHaveCount(6)
    await pressDigits(page, '1357')
    await expect.poll(() => filledDots(page)).toBe(4)
    // A new PIN needs six digits; the Stitch status hint says so and nothing is sent.
    await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
    await expect(pinStatus(page)).toHaveText('pin : six chiffres sont requis.')
    await expectAccessibleAsShipped(page)
    await pressDigits(page, '9')
    await expect.poll(() => filledDots(page)).toBe(5)
    await expect(pinStatus(page)).toHaveText('Chiffrement et vérification locale sécurisée')
    expect(api.pinSets).toEqual([])
    await expectAccessibleAsShipped(page)

    await pressDigits(page, '0')
    await expectArrived(page, /\/profile-edit$/)
    expect(api.pinSets).toEqual(['135790'])
    await expect(page.getByLabel("Origine / Région d'attache")).toHaveValue('Kadiogo')
    await expect(pinCheckbox(page)).toBeChecked()
  })

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`a refused save keeps the member on the profile, PIN off, with the reason on screen beside the switch at ${viewport.width} px`, async ({ page, context, baseURL, guards }) => {
      const message = 'marital_status : la situation matrimoniale est requise.'
      const api = newApi({
        saveRefusal: {
          status: 400,
          body: { error: { code: 'UNHANDLED', message, details: { field: 'marital_status' }, retryable: false } },
        },
      })
      await page.setViewportSize(viewport)
      await serveApi(context, baseURL ?? '', api)
      await openProfile(page)
      await page.getByLabel("Origine / Région d'attache").fill('Kadiogo')
      const saved = page.waitForResponse((response) => isProfileSave(response.request()))
      await pinSwitch(page).click()
      expect((await saved).status()).toBe(400)

      // Announced (role="alert") and in sight of the switch the member just tapped.
      const reason = page.getByRole('alert').filter({ hasText: message })
      await expect(reason).toBeVisible()
      await expect(reason).toBeInViewport()
      await expect(pinSwitch(page)).toBeInViewport()
      // The browser logs the refused save; that is the case under test. The page shows the error
      // after the browser logged it, so the log is in by now.
      guards.consoleErrors.length = 0
      await expect(page).toHaveURL(/\/profile-edit$/)
      await expect(pinCheckbox(page)).not.toBeChecked()
      await expect(page.getByLabel("Origine / Région d'attache")).toHaveValue('Kadiogo')
      await expectNoHorizontalOverflow(page)
      await expectAccessibleAsShipped(page, PROFILE_EDIT_PRE_EXISTING, PROFILE_EDIT_OWN)
    })
  }

  test('a PIN saved with four digits before the six-digit rule still unlocks with the unlock button', async ({ page, context, baseURL }) => {
    const api = newApi({ pinEnabled: true })
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/pin?next=%2Fprofile-edit')
    await expectAccessibleAsShipped(page)
    await pressDigits(page, '1357')
    await expect.poll(() => filledDots(page)).toBe(4)
    expect(api.unlocks).toEqual([])
    await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
    await expectArrived(page, /\/profile-edit$/)
    expect(api.unlocks).toEqual(['1357'])
  })

  test('a wrong PIN and the lockout are said on the PIN screen', async ({ page, context, baseURL, guards }) => {
    const api = newApi({
      pinEnabled: true,
      unlockRefusals: [
        { status: 400, body: { error: { code: 'PIN_INVALID', message: 'Code incorrect.', details: { attempts_left: 1 }, retryable: false } } },
        { status: 401, body: { error: { code: 'PIN_LOCKED', message: 'Session verrouillée.', details: null, retryable: false } } },
      ],
    })
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/pin?next=%2Fprofile-edit')
    await pressDigits(page, '13579')
    await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
    await expect(pinStatus(page)).toHaveText('pin : quatre ou six chiffres sont requis.')
    expect(api.unlocks).toEqual([])

    await pressDigits(page, '1')
    await expect(pinStatus(page)).toHaveText('Code incorrect.')
    await expect.poll(() => filledDots(page)).toBe(0)
    await pressDigits(page, '135791')
    await expect(pinStatus(page)).toHaveText('Session verrouillée.')
    expect(api.unlocks).toEqual(['135791', '135791'])
    await expect(page).toHaveURL(/\/pin\?next=%2Fprofile-edit$/)
    // The browser logs the two refused unlocks; they are the case under test.
    guards.consoleErrors.length = 0
    await expect(page.getByRole('link', { name: "S'identifier à nouveau" })).toHaveAttribute('href', '/auth')
    await expectAccessibleAsShipped(page)
    await expectNoHorizontalOverflow(page)
  })

  for (const viewport of [
    { width: 360, height: 780 },
    { width: 1280, height: 800 },
  ]) {
    test(`the PIN screen brings what it says into view at ${viewport.width}x${viewport.height}`, async ({ page, context, baseURL, guards }) => {
      const api = newApi({
        unlockRefusals: [
          { status: 400, body: { error: { code: 'PIN_INVALID', message: 'Code incorrect.', details: { attempts_left: 1 }, retryable: false } } },
          { status: 401, body: { error: { code: 'PIN_LOCKED', message: 'Session verrouillée.', details: null, retryable: false } } },
        ],
      })
      await page.setViewportSize(viewport)
      await serveApi(context, baseURL ?? '', api)
      const status = pinStatus(page)
      // The member looks at the keypad; the status line is the last line of the card (QA round 2, finding 17).
      const fromTheTop = () => page.evaluate(() => window.scrollTo(0, 0))

      await page.goto('/pin?next=%2Fprofile-edit')
      await pressDigits(page, '1357')
      await page.getByRole('button', { name: "Déverrouiller l'espace" }).click()
      await expect(status).toHaveText('pin : six chiffres sont requis.')
      await expect(status).toBeInViewport({ ratio: 1 })

      api.pinEnabled = true
      await page.goto('/pin?next=%2Fprofile-edit')
      await fromTheTop()
      await pressDigits(page, '135791')
      await expect(status).toHaveText('Code incorrect.')
      await expect(status).toBeInViewport({ ratio: 1 })

      await fromTheTop()
      await pressDigits(page, '135791')
      await expect(status).toHaveText('Session verrouillée.')
      await expect(status).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('link', { name: "S'identifier à nouveau" })).toBeInViewport({ ratio: 1 })
      // The browser logs the two refused unlocks; they are the case under test.
      guards.consoleErrors.length = 0
      await expectNoHorizontalOverflow(page)
    })
  }

  test('the PIN screen never returns to another origin', async ({ page, context, baseURL }) => {
    const api = newApi()
    await serveApi(context, baseURL ?? '', api)
    const origin = new URL(baseURL ?? '').origin
    // Protocol-relative, backslash, and the tab, LF and CR that the URL parser deletes (QA round 1, finding 2).
    for (const next of [
      '%2F%2Fevil.example%2Fprofile-edit',
      '%2F%5Cevil.example',
      '%2F%09%2Fevil.example%2Fx',
      '%2F%0A%2Fevil.example%2Fx',
      '%2F%0D%2Fevil.example%2Fx',
      '%2F%09%5Cevil.example',
      '%2F.%2F%2Fevil.example',
      'javascript%3Aalert(1)',
    ]) {
      await page.goto(`/pin?next=${next}`)
      await pressDigits(page, '246813')
      await expectArrived(page, `${origin}/onboarding`, next)
    }
    await page.goto('/pin?next=%2F%2Fevil.example%2Fprofile-edit')
    await expectAccessibleAsShipped(page)
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
    await expectAccessibleAsShipped(page, PROFILE_EDIT_PRE_EXISTING, PROFILE_EDIT_OWN)
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
    await expectAccessibleAsShipped(page, PROFILE_EDIT_PRE_EXISTING, PROFILE_EDIT_OWN)
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
