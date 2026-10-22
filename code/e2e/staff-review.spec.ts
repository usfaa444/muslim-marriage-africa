import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import type { APIRequestContext, Page, Route } from '@playwright/test'
import { totpCode } from '../apps/api/src/staff-totp'
import { WIDTHS, expect, expectAccessible, expectNoHorizontalOverflow, test } from './fixtures'

// Staff review console (spec-staff-review-console.md): random-pose selfie, the Moderator queue and case,
// evidence views, unblur with a reason, decisions, and the Operator's counts-only view.
//
// Web-only (no E2E_BASE_URL): the stub cookie `staff` renders /staff/revue and every /v1/staff/review call is
// answered by page.route with synthetic data, so the client script is driven in a real browser.
// A built image ignores stub cookies, so on a stack those tests skip and the full-stack test below runs instead:
// a real member signs up, verifies email and phone, sends a synthetic ID and a fake-camera selfie with the pose,
// then a fresh Moderator account (staff-cli) signs in with a real TOTP and decides in the console.
//   E2E_MODERATOR_EMAIL, E2E_MODERATOR_ONE_TIME_PASSWORD: a fresh Moderator from staff-cli (spent by the run)
//   E2E_OPERATOR_EMAIL, E2E_OPERATOR_ONE_TIME_PASSWORD: optional fresh Operator, for the counts-only check
//   E2E_COMPOSE_PROJECT: the compose project, to read the phone code and email link from the api log

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs') as {
  PNG: {
    new (options: { width: number; height: number }): { data: Buffer; width: number; height: number }
    sync: { write(png: { data: Buffer; width: number; height: number }): Buffer }
  }
}

/** A synthetic flat-colour PNG. Never a real photo. */
function syntheticPng(shade: number): Buffer {
  const png = new PNG({ width: 16, height: 16 })
  png.data.fill(shade)
  return PNG.sync.write(png)
}

/** A synthetic JPEG-signed blob (the API checks the signature, not the picture). */
function syntheticJpeg(tag: string): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`synthetic-${tag}-${Date.now()}`), Buffer.from([0xff, 0xd9])])
}

// The full-stack member capture uses Chromium's synthetic camera (a generated test pattern), never a real face.
test.use({
  launchOptions: {
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
  permissions: ['camera'],
})

const STUB_SKIP = 'A built image ignores stub cookies; the full-stack review test covers this signed in.'
const MEMBER = '01990000-0000-7000-8000-00000000c0de'
const ID_RECORD = '01990000-0000-7000-8000-0000000000d1'
const LIVE_RECORD = '01990000-0000-7000-8000-0000000000d2'
const PHOTO = '01990000-0000-7000-8000-0000000000f1'

function queueBody(role: 'moderator' | 'operator') {
  const counts = { waiting: 1, sla_breach: 1, premium: 0 }
  if (role === 'operator') return { role, sla_hours: 24, counts }
  return {
    role,
    sla_hours: 24,
    counts,
    rows: [
      {
        account_id: MEMBER,
        pseudonym: 'Aminata_test',
        priority: 'free',
        since: '2026-10-20T08:00:00.000Z',
        sla_breach: true,
        pending: { profile: true, bio: true, photos: 1, id_document: true, liveness: true },
      },
    ],
  }
}

function caseBody(state: { idStatus: string; liveStatus: string }) {
  return {
    account_id: MEMBER,
    pseudonym: 'Aminata_test',
    account_status: 'Active',
    gender: 'sister',
    dob: '1995-03-02',
    age: 31,
    priority: 'free',
    profile: {
      city: 'ouagadougou',
      country: 'BF',
      origin: null,
      marital_status: 'single',
      polygamy_intent: 'no',
      education: null,
      profession: null,
      madhhab: null,
      practice: null,
      life_plans: null,
      bio_live: null,
      bio_pending: 'Une présentation sobre.',
      visibility: null,
      review_queued_at: '2026-10-20T08:00:00.000Z',
      review_passed_at: null,
    },
    profile_review: { queued: true, profile_required: true, bio_required: true, photo_ids: [PHOTO] },
    photos: [{ asset_id: PHOTO, moderation_state: 'pending', is_main: true, blur_url: '/v1/media/blur-stub.png' }],
    id_document: { record_id: ID_RECORD, status: state.idStatus, captured_at: '2026-10-20T08:01:00.000Z', evidence_url: `/v1/staff/review/evidence/${ID_RECORD}` },
    liveness: {
      record_id: LIVE_RECORD,
      status: state.liveStatus,
      captured_at: '2026-10-20T08:02:00.000Z',
      evidence_url: `/v1/staff/review/evidence/${LIVE_RECORD}`,
      pose: 'thumbs_up',
      pose_label: 'Levez le pouce',
    },
    history: [
      { kind: 'liveness', record_id: '01990000-0000-7000-8000-0000000000d0', status: 'superseded', reason: null, captured_at: '2026-10-20T07:58:00.000Z', decided_at: null },
    ],
  }
}

type Posted = { path: string; body: Record<string, unknown> }

/** Answers every console call with synthetic data and records what the page sends. */
async function stubConsole(page: Page, role: 'moderator' | 'operator', options: { staleDecision?: boolean } = {}) {
  const posted: Posted[] = []
  const state = { idStatus: 'pending', liveStatus: 'pending' }
  const png = (shade: number) => (route: Route) =>
    route.fulfill({ status: 200, contentType: 'image/png', headers: { 'cache-control': 'no-store' }, body: syntheticPng(shade) })
  await page.route('**/v1/staff/review/queue', (route) => route.fulfill({ json: queueBody(role) }))
  await page.route(`**/v1/staff/review/cases/${MEMBER}`, (route) => route.fulfill({ json: caseBody(state) }))
  await page.route('**/v1/staff/review/evidence/*', png(90))
  await page.route('**/v1/media/blur-stub.png', png(200))
  await page.route('**/v1/staff/review/photo?token=*', png(120))
  await page.route('**/v1/staff/review/photos/unblur', async (route) => {
    posted.push({ path: 'unblur', body: route.request().postDataJSON() as Record<string, unknown> })
    await route.fulfill({ status: 201, json: { url: '/v1/staff/review/photo?token=stub', expires_at: '2026-10-22T08:01:00.000Z' } })
  })
  await page.route('**/v1/staff/review/decisions', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    posted.push({ path: 'decisions', body })
    if (options.staleDecision) {
      // Another Moderator decided this ID first: the server keeps their decision and refuses this one.
      state.idStatus = 'granted'
      await route.fulfill({
        status: 409,
        json: { error: { code: 'REVIEW_STALE', message: 'La file a changé. Rechargez avant de décider.', details: null, retryable: false } },
      })
      return
    }
    const status = body.decision === 'approve' ? 'granted' : body.decision === 'reject' ? 'rejected' : 'held'
    if (body.kind === 'id_document') state.idStatus = status
    else state.liveStatus = status
    await route.fulfill({ status: 200, json: { kind: body.kind, record_id: body.record_id, status, visibility: null, account_status: 'Active' } })
  })
  await page.route('**/v1/staff/cases', async (route) => {
    posted.push({ path: 'cases', body: route.request().postDataJSON() as Record<string, unknown> })
    await route.fulfill({ status: 200, json: { visibility: null } })
  })
  return posted
}

async function asStaffStub(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([{ name: 'ankanu_session', value: 'staff', url: baseURL ?? '' }])
}

async function expectPanes(page: Page) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByTestId('staff-only-badge')).toBeVisible()
    const queue = await page.getByRole('region', { name: 'Liste des fiches à examiner' }).boundingBox()
    const pane = await page.getByRole('region', { name: 'Détails du dossier sélectionné' }).boundingBox()
    if (!queue || !pane) throw new Error('both panes must render')
    if (width >= 768) {
      expect(pane.x, `${width}: case beside the queue`).toBeGreaterThanOrEqual(queue.x + queue.width)
    } else {
      expect(pane.y, `${width}: case below the queue`).toBeGreaterThanOrEqual(queue.y + queue.height)
    }
    await expectNoHorizontalOverflow(page)
  }
}

test.describe('staff review console (web-only, synthetic data)', () => {
  test('a Moderator opens a case, views evidence, unblurs with a reason and decides', async ({ page, baseURL }, testInfo) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    const posted = await stubConsole(page, 'moderator')
    const response = await page.goto('/staff/revue')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-control']).toBe('no-store')
    await expect(page.getByRole('heading', { level: 1, name: 'Revue des inscriptions' })).toBeVisible()
    await expect(page.getByTestId('staff-only-badge')).toHaveText('Réservé Staff / Confidentiel')
    await expect(page.getByTestId('review-counts')).toHaveText('En attente : 1 • Hors délai (24 h) : 1 • Premium : 0')
    await expect(page.getByRole('navigation')).toHaveCount(0)

    const row = page.getByRole('button', { name: /Aminata_test/ })
    await expect(row).toContainText('Hors délai')
    await expect(row).toContainText("Pièce d'identité")
    await row.click()
    await expect(row).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 2, name: 'Aminata_test' })).toBeFocused()
    await expect(page.getByTestId('case-pose')).toHaveText('Levez le pouce')
    await expectAccessible(page)

    // Evidence is fetched only on demand and shown from memory.
    const evidence = page.waitForResponse((r) => r.url().endsWith(`/evidence/${ID_RECORD}`))
    await page.getByRole('button', { name: 'Afficher la pièce' }).click()
    await evidence
    await expect(page.getByRole('img', { name: "Pièce d'identité envoyée par le membre" })).toHaveAttribute('src', /^blob:/)
    await page.getByRole('button', { name: 'Afficher le selfie' }).click()
    await expect(page.getByRole('img', { name: 'Selfie envoyé par le membre' })).toHaveAttribute('src', /^blob:/)

    // Unblur needs a reason of at least 10 characters.
    const photo = page.getByTestId('review-photo')
    await expect(photo.getByRole('img', { name: 'Photo du profil (floutée)' })).toHaveClass(/review-blur/)
    const unblur = photo.getByRole('button', { name: 'Déflouter' })
    await expect(unblur).toBeDisabled()
    await photo.getByLabel(/Motif pour déflouter/).fill('trop')
    await expect(unblur).toBeDisabled()
    await photo.getByLabel(/Motif pour déflouter/).fill('Comparer avec le selfie')
    await unblur.click()
    await expect(photo.getByRole('img', { name: 'Photo du profil (défloutée pour la revue)' })).not.toHaveClass(/review-blur/)
    expect(posted.find((item) => item.path === 'unblur')?.body).toEqual({ account_id: MEMBER, asset_id: PHOTO, reason: 'Comparer avec le selfie' })

    // A refusal needs a reason from the list.
    const idForm = page.getByTestId('decision-id_document')
    await idForm.getByLabel('Refuser et demander une nouvelle prise').check()
    await idForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
    await expect(page.getByRole('alert')).toHaveText('Choisissez un motif de refus.')
    await idForm.getByLabel('Motif du refus').selectOption({ label: 'Illisible' })
    await idForm.getByLabel('Note interne (facultative)').fill('Reflet sur la pièce')
    await idForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Décision enregistrée' })).toHaveText(/Refusé/)
    expect(posted.find((item) => item.path === 'decisions')?.body).toEqual({
      kind: 'id_document',
      account_id: MEMBER,
      record_id: ID_RECORD,
      decision: 'reject',
      reason: 'unreadable',
      note: 'Reflet sur la pièce',
    })
    // The decided ID has no form any more; the selfie is approved next.
    await expect(page.getByTestId('decision-id_document')).toHaveCount(0)
    const liveForm = page.getByTestId('decision-liveness')
    await liveForm.getByLabel('Approuver').check()
    await liveForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
    await expect(page.getByTestId('decision-liveness')).toHaveCount(0)
    expect(posted.filter((item) => item.path === 'decisions').at(-1)?.body).toMatchObject({ kind: 'liveness', decision: 'approve' })

    // Profile review: every element decided, a reason when one is refused.
    const profile = page.getByTestId('decision-profile')
    await profile.getByRole('group', { name: 'Fiche du profil' }).getByLabel('Accepter').check()
    await profile.getByRole('group', { name: 'Présentation en attente' }).getByLabel('Refuser').check()
    await profile.getByRole('button', { name: 'Enregistrer la revue du profil' }).click()
    await expect(page.getByRole('alert')).toHaveText('Décidez chaque élément du profil.')
    await profile.getByRole('group', { name: 'Photo en revue 1' }).getByLabel('Accepter').check()
    await profile.getByRole('button', { name: 'Enregistrer la revue du profil' }).click()
    await expect(page.getByRole('alert')).toHaveText('Choisissez un motif de refus.')
    await profile.getByLabel('Motif si un élément est refusé').selectOption('Présentation (bio) non conforme')
    await profile.getByRole('button', { name: 'Enregistrer la revue du profil' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Revue du profil enregistrée' })).toBeVisible()
    expect(posted.find((item) => item.path === 'cases')?.body).toEqual({
      kind: 'profile_review',
      account_id: MEMBER,
      photos: [{ asset_id: PHOTO, decision: 'allow' }],
      profile: 'allow',
      bio: 'block',
      reason: 'Présentation (bio) non conforme',
    })

    // Nothing from the case is kept in client storage.
    const stored = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))
    expect(stored).toEqual({ local: 0, session: 0 })
    await expectAccessible(page)
    if (testInfo.project.name === 'desktop') await expectPanes(page)
  })

  test('a stale decision says so in an alert, in view, and reloads the case (QA round 1, F1)', async ({ page, baseURL, guards }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    await stubConsole(page, 'moderator', { staleDecision: true })
    await page.goto('/staff/revue')
    await page.getByRole('button', { name: /Aminata_test/ }).click()
    const idForm = page.getByTestId('decision-id_document')
    await idForm.getByLabel('Approuver').check()
    const reloaded = page.waitForResponse((r) => r.url().endsWith(`/v1/staff/review/cases/${MEMBER}`))
    await idForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
    await reloaded
    const alert = page.getByRole('alert')
    await expect(alert).toHaveText(/Ce dossier a changé depuis son ouverture/)
    await expect(alert).toContainText("Votre décision n'a pas été enregistrée")
    await expect(alert).toBeInViewport()
    // The case shows its current state: the ID was decided by someone else, so it has no form any more.
    await expect(page.getByTestId('case-id')).toContainText('Approuvé')
    await expect(page.getByTestId('decision-id_document')).toHaveCount(0)
    await expect(page.getByTestId('decision-liveness')).toBeVisible()
    // The browser logs the expected 409.
    guards.consoleErrors.splice(0)
  })

  test('the case shows French values and labels replaced captures (QA round 1, F2 and F3)', async ({ page, baseURL }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    await stubConsole(page, 'moderator')
    await page.goto('/staff/revue')
    await page.getByRole('button', { name: /Aminata_test/ }).click()
    const profile = page.getByTestId('case-profile')
    await expect(profile).toContainText('Célibataire')
    await expect(profile).toContainText('Ouagadougou')
    await expect(profile).not.toContainText('single')
    const history = page.getByTestId('case-history')
    await expect(history).toContainText('Remplacée par une nouvelle prise (non examinée)')
    await expect(history).not.toContainText('En attente')
  })

  test('a queue that fails to load says so in French (QA round 1, F8)', async ({ page, baseURL, guards }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    await page.route('**/v1/staff/review/queue', (route) =>
      route.fulfill({ status: 500, json: { error: { code: 'UNHANDLED', message: 'Request failed', details: null, retryable: false } } }),
    )
    await page.goto('/staff/revue')
    await expect(page.getByRole('alert')).toHaveText("La file n'a pas pu être chargée. Réessayez dans un instant.")
    // The expected 500 is logged by the browser and recorded by the guard.
    guards.consoleErrors.splice(0)
    guards.failedRequests.splice(0)
  })

  test('an Operator sees the counts only, with no case list', async ({ page, baseURL }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    await stubConsole(page, 'operator')
    await page.goto('/staff/revue')
    await expect(page.getByTestId('review-counts')).toHaveText('En attente : 1 • Hors délai (24 h) : 1 • Premium : 0')
    await expect(page.getByTestId('review-operator')).toBeVisible()
    await expect(page.getByTestId('review-queue').getByRole('button')).toHaveCount(0)
    await expectAccessible(page)
  })

  test('the staff home links to the console', async ({ page, baseURL }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await asStaffStub(page, baseURL)
    await stubConsole(page, 'moderator')
    await page.goto('/staff')
    await page.getByTestId('staff-review-link').click()
    await expect(page).toHaveURL(/\/staff\/revue$/)
  })

  test('a signed-out visitor is sent to the staff sign-in', async ({ page }) => {
    const anon = await page.request.get('/staff/revue', { maxRedirects: 0 })
    expect(anon.status()).toBe(303)
    expect(anon.headers()['location']).toMatch(/\/staff\/connexion$/)
  })

  test('a member stub cookie is sent away from the console', async ({ page, baseURL }) => {
    test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)
    await page.context().addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL ?? '' }])
    const member = await page.request.get('/staff/revue', { maxRedirects: 0 })
    expect(member.status()).toBe(303)
    expect(member.headers()['location']).toMatch(/\/decouvrir$/)
  })
})

// ---- Full stack ----

function apiLog(): string {
  const project = process.env.E2E_COMPOSE_PROJECT
  if (!project) throw new Error('E2E_COMPOSE_PROJECT names the stack whose api log holds the codes')
  return execFileSync('docker', ['compose', '-p', project, 'logs', 'api', '--no-log-prefix'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/** The newest match in the api log that appears after `before` lines. */
async function fromLog(pattern: RegExp, before: number): Promise<string> {
  let found = ''
  await expect
    .poll(
      () => {
        const lines = apiLog().split('\n').slice(before)
        const hits = lines.map((line) => pattern.exec(line)?.[1]).filter((hit): hit is string => !!hit)
        found = hits.at(-1) ?? ''
        return found
      },
      { timeout: 15_000 },
    )
    .not.toBe('')
  return found
}

/** Complete lines so far (the log ends with a newline, so the last split item is empty). */
function logLength(): number {
  return apiLog().split('\n').length - 1
}

/**
 * Sign-in posts share one per-IP budget (rl_auth_per_min, 10 by default) with every other test hitting the
 * stack from this machine. On 429 the limiter needs 60 quiet seconds, so wait that long once and retry.
 */
async function authPost(request: APIRequestContext, path: string, data: Record<string, unknown>) {
  const first = await request.post(path, { data })
  if (first.status() !== 429) return first
  await new Promise((resolve) => setTimeout(resolve, 61_000))
  return request.post(path, { data })
}

/** A fresh staff account from staff-cli: new password, enrollment and a real TOTP code, all through the API. */
async function signInStaff(request: APIRequestContext, email: string, oneTime: string) {
  const opened = await authPost(request, '/v1/staff/sessions', { email, password: oneTime, recaptcha_token: 'test-ok' })
  expect(opened.status(), 'staff sign-in').toBe(201)
  expect(await opened.json()).toMatchObject({ mfa_state: 'password_change' })
  const changed = await authPost(request, '/v1/staff/sessions/password', { new_password: `phrase revue e2e ${Date.now()}` })
  expect(changed.status()).toBe(200)
  const enrollment = await request.get('/v1/staff/sessions/enrollment')
  expect(enrollment.status()).toBe(200)
  const secret = ((await enrollment.json()) as { secret: string }).secret.replace(/\s/g, '')
  const verified = await authPost(request, '/v1/staff/sessions/mfa', { code: totpCode(secret, new Date()) })
  expect(verified.status(), 'staff MFA').toBe(200)
}

test.describe('staff review console on a full stack', () => {
  test('capture to publish: random pose, a refused then approved selfie, unblur with a reason, profile review, and an Operator sees counts only', async ({ page, browser, guards }, testInfo) => {
    const email = process.env.E2E_MODERATOR_EMAIL
    const oneTime = process.env.E2E_MODERATOR_ONE_TIME_PASSWORD
    test.skip(
      !process.env.E2E_BASE_URL || !email || !oneTime || !process.env.E2E_COMPOSE_PROJECT,
      'Needs a stack, its compose project and a fresh Moderator (E2E_MODERATOR_EMAIL, E2E_MODERATOR_ONE_TIME_PASSWORD).',
    )
    test.skip(testInfo.project.name !== 'desktop', 'the one-time password is spent once')
    test.setTimeout(420_000)
    const stamp = Date.now()
    const memberEmail = `revue-${stamp}@example.bf`
    const password = 'phrase membre e2e revue'

    // 1. A real member: account, session, email link and phone code from the api log.
    let mark = logLength()
    const created = await authPost(page.request, '/v1/accounts', {
      email: memberEmail,
      password,
      pseudonym: `Revue_${String(stamp).slice(-8)}`,
      gender: 'sister',
      pledge_accepted: true,
      civil_given_name: 'Awa',
      civil_family_name: 'Test',
      recaptcha_token: 'test-ok',
      coc_version: 'FR-089',
      dob: '1995-03-02',
    })
    expect(created.status(), await created.text()).toBe(201)
    const memberId = ((await created.json()) as { id: string }).id
    const signed = await authPost(page.request, '/v1/sessions', { identifier: memberEmail, password, remember_me: false, recaptcha_token: 'test-ok' })
    expect(signed.status()).toBe(201)
    const issued = await page.request.post('/v1/accounts/email-verifications')
    expect([201, 200, 204, 429]).toContain(issued.status())
    const link = await fromLog(new RegExp(`email ${memberEmail.replace(/[.]/g, '\\.')} AnKanu (\\S+)`), mark)
    const consumed = await page.request.post('/v1/accounts/email-verifications/consume', { data: { token: new URL(link).searchParams.get('token') } })
    expect(consumed.status()).toBe(200)
    mark = logLength()
    const phone = `+2267${String(stamp).slice(-7)}`
    expect((await page.request.post('/v1/verifications/otp', { data: { action: 'send', phone_e164: phone } })).status()).toBe(201)
    const code = await fromLog(/^otp (\d{6})$/, mark)
    expect((await page.request.post('/v1/verifications/otp', { data: { action: 'verify', code } })).status()).toBe(200)
    // Profile fields and one synthetic profile photo, both waiting for the profile review.
    const saved = await page.request.put('/v1/me/profile', { data: { dob: '1995-03-02', city: 'ouagadougou', bio_pending: 'Une présentation sobre.' } })
    expect(saved.status()).toBe(200)
    const photo = await page.request.post('/v1/media', { data: { kind: 'profile_photo', image: syntheticPng(180).toString('base64') } })
    expect(photo.status()).toBe(201)

    // 2. The ID and the random-pose selfie through the member page, with the synthetic camera.
    await page.goto('/id-liveness')
    await expect(page).toHaveURL(/\/id-liveness$/)
    await expect(page.getByTestId('pose-card')).toBeVisible()
    const poseLabel = (await page.getByTestId('pose-label').textContent())?.trim() ?? ''
    expect(poseLabel.length).toBeGreaterThan(5)
    await page.locator('input[type=file]').first().setInputFiles({ name: 'piece.jpg', mimeType: 'image/jpeg', buffer: syntheticJpeg('id') })
    await page.locator('#trigger-cam-btn').click()
    await expect(page.locator('#pose-countdown')).toBeVisible()
    await expect(page.locator('#pose-countdown')).toBeHidden({ timeout: 15_000 })
    const live = page.waitForResponse((r) => r.url().endsWith('/v1/verifications/liveness') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /Confirmer et transmettre/ }).click()
    expect((await live).status()).toBe(201)
    await expect(page).not.toHaveURL(/\/id-liveness$/, { timeout: 15_000 })

    // 3. A fresh Moderator, signed in for real, decides in the console.
    const staffContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? '', locale: 'fr-FR', timezoneId: 'Africa/Ouagadougou' })
    const staff = await staffContext.newPage()
    staff.on('pageerror', (error) => guards.consoleErrors.push(error.message))
    await signInStaff(staff.request, email ?? '', oneTime ?? '')
    await staff.goto('/staff/revue')
    await expect(staff.getByTestId('staff-only-badge')).toBeVisible()
    const row = staff.locator(`#review-queue button[data-account="${memberId}"]`)
    await expect(row).toBeVisible()
    await row.click()
    await expect(staff.getByTestId('case-pose')).toHaveText(poseLabel)
    await staff.getByRole('button', { name: 'Afficher le selfie' }).click()
    await expect(staff.getByRole('img', { name: 'Selfie envoyé par le membre' })).toHaveAttribute('src', /^blob:/)
    await expectAccessible(staff)
    for (const width of [360, 1440]) {
      await staff.setViewportSize({ width, height: 900 })
      await expectNoHorizontalOverflow(staff)
    }

    // The selfie is refused for the pose: the member sees why, gets a new pose and retakes.
    const firstLive = staff.getByTestId('decision-liveness')
    await firstLive.getByLabel('Refuser et demander une nouvelle prise').check()
    await firstLive.getByLabel('Motif du refus').selectOption('pose_not_done')
    await firstLive.getByRole('button', { name: 'Enregistrer la décision' }).click()
    await expect(staff.getByRole('status').filter({ hasText: 'Décision enregistrée' })).toContainText('Refusé')
    expect(await (await page.request.get('/v1/verifications/liveness')).json()).toMatchObject({ status: 'rejected', reason: 'pose_not_done' })

    await page.goto('/id-liveness')
    await expect(page).toHaveURL(/\/id-liveness$/)
    await expect(page.getByTestId('live-reject')).toContainText("le geste demandé n'apparaît pas sur le selfie")
    await expect(page.getByTestId('pose-card')).toBeVisible()
    const retakeLabel = (await page.getByTestId('pose-label').textContent())?.trim() ?? ''
    expect(retakeLabel.length).toBeGreaterThan(5)
    await page.locator('#trigger-cam-btn').click()
    await expect(page.locator('#pose-countdown')).toBeVisible()
    await expect(page.locator('#pose-countdown')).toBeHidden({ timeout: 15_000 })
    const retake = page.waitForResponse((r) => r.url().endsWith('/v1/verifications/liveness') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /Confirmer et transmettre/ }).click()
    expect((await retake).status()).toBe(201)
    await expect(page).not.toHaveURL(/\/id-liveness$/, { timeout: 15_000 })

    // The Moderator now sees the new selfie with its own pose, the refusal in the history, and approves both.
    await staff.reload()
    await staff.locator(`#review-queue button[data-account="${memberId}"]`).click()
    await expect(staff.getByTestId('case-pose')).toHaveText(retakeLabel)
    await expect(staff.getByTestId('case-history')).toContainText('Geste demandé non fait')
    // A second decision on the same ID (here sent straight to the API while the page still shows the form) wins;
    // the page's late decision is refused, said so in an alert, and the case reloads (QA round 1, F1).
    const opened = (await (await staff.request.get(`/v1/staff/review/cases/${memberId}`)).json()) as { id_document: { record_id: string } }
    const first = await staff.request.post('/v1/staff/review/decisions', {
      data: { kind: 'id_document', account_id: memberId, record_id: opened.id_document.record_id, decision: 'approve' },
    })
    expect(first.status()).toBe(200)
    const idForm = staff.getByTestId('decision-id_document')
    await idForm.getByLabel('Approuver').check()
    await idForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
    await expect(staff.getByRole('alert')).toContainText('Ce dossier a changé depuis son ouverture')
    await expect(staff.getByRole('alert')).toBeInViewport()
    await expect(staff.getByTestId('decision-id_document')).toHaveCount(0)
    await expect(staff.getByTestId('case-id')).toContainText('Approuvé')
    const liveForm = staff.getByTestId('decision-liveness')
    await liveForm.getByLabel('Approuver').check()
    await liveForm.getByRole('button', { name: 'Enregistrer la décision' }).click()
    await expect(staff.getByTestId('decision-liveness')).toHaveCount(0)

    // ID and selfie granted, profile review still open: she stays hidden.
    await expect(staff.getByTestId('review-case')).toContainText('Visibilité : non publiée')

    // The photo is blurred until the Moderator gives a reason; then the profile review publishes her.
    const reviewPhoto = staff.getByTestId('review-photo')
    await expect(reviewPhoto.getByRole('img', { name: 'Photo du profil (floutée)' })).toHaveClass(/review-blur/)
    await reviewPhoto.getByLabel(/Motif pour déflouter/).fill('Comparer avec le selfie et la pièce')
    await reviewPhoto.getByRole('button', { name: 'Déflouter' }).click()
    await expect(reviewPhoto.getByRole('img', { name: 'Photo du profil (défloutée pour la revue)' })).toHaveAttribute('src', /^blob:/)
    const profileForm = staff.getByTestId('decision-profile')
    for (const group of await profileForm.getByRole('group').all()) {
      await group.getByLabel('Accepter').check()
    }
    await profileForm.getByRole('button', { name: 'Enregistrer la revue du profil' }).click()
    await expect(staff.getByRole('status').filter({ hasText: 'Revue du profil enregistrée' })).toContainText('Visibilité du profil : publiée')

    const idRow = await page.request.get('/v1/verifications/id')
    expect(await idRow.json()).toMatchObject({ status: 'granted' })
    const liveRow = await page.request.get('/v1/verifications/liveness')
    expect(await liveRow.json()).toMatchObject({ status: 'granted' })

    // The member cannot read the staff console API.
    expect((await page.request.get('/v1/staff/review/queue')).status()).toBe(403)
    guards.consoleErrors.splice(0)

    // 4. Optional: a fresh Operator sees the counts only, and is refused the case and the evidence.
    const opEmail = process.env.E2E_OPERATOR_EMAIL
    const opOneTime = process.env.E2E_OPERATOR_ONE_TIME_PASSWORD
    if (opEmail && opOneTime) {
      const opContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? '', locale: 'fr-FR' })
      const operator = await opContext.newPage()
      await signInStaff(operator.request, opEmail, opOneTime)
      await operator.goto('/staff/revue')
      await expect(operator.getByTestId('review-operator')).toBeVisible()
      await expect(operator.getByTestId('review-queue').getByRole('button')).toHaveCount(0)
      expect((await operator.request.get(`/v1/staff/review/cases/${memberId}`)).status()).toBe(403)
      await opContext.close()
    }
    await staffContext.close()
  })
})
