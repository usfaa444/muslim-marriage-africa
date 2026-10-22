import type { Page } from '@playwright/test'
import { totpCode } from '../apps/api/src/staff-totp'
import { WIDTHS, expect, expectAccessible, expectNoHorizontalOverflow, test } from './fixtures'

// Story 12.1: staff shell, staff sign-in and the staff/member separation.
// The stub cookie value `staff` renders the staff pages without an API on the web-only dev server only.
// A built image ignores stub cookies, so on a stack (E2E_BASE_URL) those tests skip and the signed-in flow
// below checks the same things with a real staff session.
// The full first sign-in needs a stack (E2E_BASE_URL) and a fresh account from the server command:
//   node apps/api/dist/staff-cli.js create --email <e> --role moderator
// then E2E_STAFF_EMAIL=<e> E2E_STAFF_ONE_TIME_PASSWORD=<printed password>. The run spends that password.

async function asStaffStub(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([{ name: 'ankanu_session', value: 'staff', url: baseURL ?? '' }])
}

async function expectNoMemberNav(page: Page) {
  await expect(page.getByRole('navigation')).toHaveCount(0)
  for (const name of ['Découvrir', 'Invitations', 'Discussions', 'Profil']) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0)
  }
}

const STUB_SKIP = 'A built image ignores stub cookies; the full-stack sign-in test covers this signed in.'

/** The brand in the header and the page title share a left edge. */
async function expectHeaderAligned(page: Page, width: number) {
  const brand = await page.getByRole('link', { name: 'AnKanu', exact: true }).boundingBox()
  const title = await page.getByRole('heading', { level: 1 }).boundingBox()
  if (!brand || !title) throw new Error('brand and title must render')
  expect(Math.abs(brand.x - title.x), `${width}: header and content aligned`).toBeLessThan(2)
}

async function expectPanes(page: Page) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByTestId('staff-only-badge')).toBeVisible()
    const { queue, pane } = await paneBoxes(page)
    if (width >= 768) {
      expect(pane.x, `${width}: case beside the queue`).toBeGreaterThanOrEqual(queue.x + queue.width)
      expect(Math.abs(pane.y - queue.y), `${width}: panes share a top`).toBeLessThan(2)
    } else {
      expect(pane.y, `${width}: case below the queue`).toBeGreaterThanOrEqual(queue.y + queue.height)
    }
    await expectHeaderAligned(page, width)
    await expectNoHorizontalOverflow(page)
  }
}

async function paneBoxes(page: Page) {
  const queue = await page.getByRole('region', { name: 'Liste des fiches à examiner' }).boundingBox()
  const pane = await page.getByRole('region', { name: 'Détails du dossier sélectionné' }).boundingBox()
  if (!queue || !pane) throw new Error('both panes must render')
  return { queue, pane }
}

test.describe('staff shell', () => {
  test('the staff home shows the badge, no member nav, and passes axe', async ({ page, baseURL }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    const response = await page.goto('/staff')
    expect(response?.status()).toBe(200)
    await expect(page.getByTestId('staff-only-badge')).toBeVisible()
    await expect(page.getByTestId('staff-only-badge')).toHaveText('Réservé Staff / Confidentiel')
    await expect(page.getByRole('heading', { level: 1, name: 'Console de modération' })).toBeVisible()
    await expectNoMemberNav(page)
    await expectAccessible(page)
  })

  test('two panes from 768 px, the queue above the case below, no horizontal scroll', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    await page.goto('/staff')
    await expectPanes(page)
  })

  test('the visit-signals page carries the badge and no member nav at every width', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/staff/visit-signals')
      await expect(page.getByTestId('staff-only-badge')).toBeVisible()
      await expectNoMemberNav(page)
      await expectNoHorizontalOverflow(page)
    }
  })

  test('the staff sign-in page is labelled, badged and fits every width', async ({ page }, testInfo) => {
    await page.goto('/staff/connexion')
    await expect(page.getByTestId('staff-only-badge')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion staff' })).toBeVisible()
    await expect(page.getByLabel(/^Adresse email/)).toBeVisible()
    await expect(page.getByLabel(/^Mot de passe/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
    await expectNoMemberNav(page)
    await expectAccessible(page)
    if (testInfo.project.name !== 'desktop') return
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await expectNoHorizontalOverflow(page)
    }
  })

  test('a leftover member session cookie does not send the staff sign-in to /pin or the member flow', async ({ page, baseURL }) => {
    // A session id the API does not know (web-only: no API at all). The page renders its first step.
    await page.context().addCookies([{ name: 'ankanu_session', value: '01990000-0000-7000-8000-0000000000aa', url: baseURL ?? '' }])
    const response = await page.goto('/staff/connexion')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/staff\/connexion$/)
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  })

  test('a member stub cookie is sent away from the staff home', async ({ page, baseURL }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await page.context().addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL ?? '' }])
    const response = await page.request.get('/staff', { maxRedirects: 0 })
    expect(response.status()).toBe(303)
    expect(response.headers()['location']).toMatch(/\/decouvrir$/)
  })
})

test.describe('staff first sign-in on a full stack', () => {
  const email = process.env.E2E_STAFF_EMAIL
  const oneTime = process.env.E2E_STAFF_ONE_TIME_PASSWORD

  test('new password, QR enrollment, a wrong then a valid code, then no member chrome', async ({ page, guards }, testInfo) => {
    test.skip(
      !process.env.E2E_BASE_URL || !email || !oneTime,
      'Needs a stack and a fresh staff account (E2E_STAFF_EMAIL, E2E_STAFF_ONE_TIME_PASSWORD).',
    )
    test.skip(testInfo.project.name !== 'desktop', 'the one-time password is spent once')
    // Headless Chromium cannot tick reCAPTCHA: open the session as the panel would, with the test token.
    const opened = await page.request.post('/v1/staff/sessions', {
      data: { email, password: oneTime, recaptcha_token: 'test-ok' },
    })
    expect(opened.status()).toBe(201)
    expect(await opened.json()).toMatchObject({ kind: 'staff', mfa_state: 'password_change' })

    // MFA-pending: member pages go to the staff home, which goes back to the sign-in.
    await page.goto('/decouvrir')
    await expect(page).toHaveURL(/\/staff\/connexion$/)
    await expect(page.getByRole('heading', { name: 'Choisissez un nouveau mot de passe' })).toBeVisible()
    await page.getByLabel('Nouveau mot de passe').fill('phrase staff e2e tres longue')
    await page.getByRole('button', { name: 'Continuer' }).click()

    await expect(page.getByRole('heading', { name: "Configurer l'application d'authentification" })).toBeVisible()
    await expect(page.getByRole('img', { name: /Code QR/ })).toBeVisible()
    const key = (await page.locator('#staff-key').textContent())?.replace(/\s/g, '') ?? ''
    expect(key).toMatch(/^[A-Z2-7]{32}$/)

    const valid = new Set([-1, 0, 1].map((offset) => totpCode(key, new Date(), offset)))
    const wrong = ['000000', '111111', '222222'].find((item) => !valid.has(item)) ?? '333333'
    const refused = page.waitForResponse((response) => response.url().endsWith('/v1/staff/sessions/mfa'))
    await page.getByLabel('Code à six chiffres').first().fill(wrong)
    await page.getByRole('button', { name: 'Confirmer le code' }).first().click()
    expect((await refused).status()).toBe(401)
    await expect(page.getByRole('alert')).toHaveText('Code incorrect.')
    await expect(page.getByRole('heading', { name: "Configurer l'application d'authentification" })).toBeVisible()
    // The browser logs the expected 401.
    guards.consoleErrors.splice(0)

    // Pasted the way the apps show it, with a space in the middle.
    const valid6 = totpCode(key, new Date())
    await page.getByLabel('Code à six chiffres').first().fill(`${valid6.slice(0, 3)} ${valid6.slice(3)}`)
    await expect(page.getByLabel('Code à six chiffres').first()).toHaveValue(`${valid6.slice(0, 3)} ${valid6.slice(3)}`)
    await page.getByRole('button', { name: 'Confirmer le code' }).first().click()
    await expect(page).toHaveURL(/\/staff$/)
    await expect(page.getByTestId('staff-only-badge')).toBeVisible()
    await expect(page.locator('#staff-identity')).toContainText(email ?? '')
    await expectNoMemberNav(page)
    await expectAccessible(page)
    await expectPanes(page)
    await page.setViewportSize({ width: 1440, height: 900 })

    await page.getByRole('link', { name: /Signaux de visite/ }).click()
    await expect(page).toHaveURL(/\/staff\/visit-signals$/)
    await expect(page.getByTestId('staff-only-badge')).toBeVisible()
    await expectNoMemberNav(page)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await expectNoHorizontalOverflow(page)
    }
    await page.goto('/staff')

    for (const path of ['/decouvrir', '/auth', '/profile-edit']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/staff$/)
    }
    const member = await page.request.get('/v1/me/profile')
    expect(member.status()).toBe(403)
    expect(await member.json()).toMatchObject({ error: { details: { reason: 'staff_session' } } })
    guards.consoleErrors.splice(0)

    await page.getByRole('link', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/staff\/connexion$/)
    await page.goto('/staff')
    await expect(page).toHaveURL(/\/staff\/connexion$/)
  })
})
