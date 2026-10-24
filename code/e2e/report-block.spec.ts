import type { BrowserContext, Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Screen 23, Report / Block (Stories 8.5, 8.6), and its entries in the Chat thread (screen 21). The pages render for
// the `web` stub session without an API call on the server; these tests answer every browser call to /v1 themselves
// and record what the page posts. Stub cookies are a dev-build seam only. The Profile page entry (screen 15) is
// server-rendered from the API, so it is covered by the web unit test and the full-stack run.
const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

const ME = '01990000-0000-7000-8000-0000000000e1'
const HIM = '01990000-0000-7000-8000-0000000000e2'
const CONVERSATION = '01990000-0000-7000-8000-0000000000c1'
const HIS_MESSAGE = '01990000-0000-7000-8000-000000000002'
const MY_MESSAGE = '01990000-0000-7000-8000-000000000001'

const REASONS = [
  'Indécence ou tenue inappropriée',
  'Propos à caractère sexuel',
  "Usurpation d'identité",
  'Comptes multiples',
  'Harcèlement ou insistance déplacée',
  "Demande d'argent ou tentative d'escroquerie",
  'Propos haineux ou irrespectueux',
  'Usage non matrimonial',
  'Dissimulation ou fausse déclaration de situation matrimoniale',
]

type Api = {
  reports: Array<Record<string, unknown>>
  blocks: Array<Record<string, unknown>>
  profileStatus: number
  reportFailure?: { status: number; body: unknown }
  blocked: boolean
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

function error(code: string, message: string, status: number, retryable = false) {
  return json({ error: { code, message, details: null, request_id: 'r', retryable } }, status)
}

function state(): Api {
  return { reports: [], blocks: [], profileStatus: 200, blocked: false }
}

async function serveApi(context: BrowserContext, baseURL: string, api: Api): Promise<void> {
  await context.addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL }])
  // No CDN in the web-only run: Tailwind and the fonts are stubbed so they never log an error.
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
    if (url.pathname === '/v1/realtime/socket.io.min.js') {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.io = undefined' })
      return
    }
    if (url.pathname === `/v1/profiles/${HIM}` && method === 'GET') {
      if (api.profileStatus === 404 || api.blocked) {
        await route.fulfill(error('NOT_FOUND', "Ce profil n'est pas disponible.", 404))
        return
      }
      await route.fulfill(
        json({
          profile: { id: HIM, pseudonym: 'Al-Hassan_BF', age: 29, city: 'ouagadougou', country: 'BF', profession: null, marital_status: 'single', polygamy_intent: 'no', madhhab: null, practice: null, life_plans: null },
          verification: { phone: true, id: true, mahram: false },
          photo_blur: true,
          photos: [],
        }),
      )
      return
    }
    if (url.pathname === `/v1/conversations/${CONVERSATION}` && method === 'GET') {
      const other = api.blocked ? { available: false } : { available: true, age: 29, city: 'ouagadougou', verified: true, photo: null }
      await route.fulfill(json({ conversation: { id: CONVERSATION, stage: 'chat', other_id: HIM, pseudonym: 'Al-Hassan_BF', other, closed: api.blocked }, me: { id: ME } }))
      return
    }
    if (url.pathname === `/v1/conversations/${CONVERSATION}/messages` && method === 'GET') {
      const at = new Date(Date.now() - 10 * 60_000).toISOString()
      await route.fulfill(
        json({
          items: [
            { id: MY_MESSAGE, conversation_id: CONVERSATION, sender_id: ME, mine: true, kind: 'text', state: 'delivered', text: 'As-salāmu ʿalaykum.', created_at: at },
            { id: HIS_MESSAGE, conversation_id: CONVERSATION, sender_id: HIM, mine: false, kind: 'text', state: 'delivered', text: 'Envoyez-moi de l’argent pour le transport.', created_at: at },
          ],
          has_more: false,
        }),
      )
      return
    }
    if (url.pathname === '/v1/reports' && method === 'POST') {
      api.reports.push(request.postDataJSON() as Record<string, unknown>)
      if (api.reportFailure) {
        const failure = api.reportFailure
        delete api.reportFailure
        await route.fulfill(json(failure.body, failure.status))
        return
      }
      const body = request.postDataJSON() as { target_kind: string; reason: string; block?: boolean }
      if (body.block) api.blocked = true
      const now = new Date().toISOString()
      await route.fulfill(
        json(
          {
            report: { id: '01990000-0000-7000-8000-0000000000f1', target_kind: body.target_kind, reason: body.reason, sla_started_at: now },
            case: { id: '01990000-0000-7000-8000-0000000000f2', sla_started_at: now, sla_state: 'open' },
            blocked: !!body.block,
            sla_hours: 24,
          },
          201,
        ),
      )
      return
    }
    if (url.pathname === '/v1/blocks' && method === 'POST') {
      api.blocks.push(request.postDataJSON() as Record<string, unknown>)
      api.blocked = true
      await route.fulfill(json({ block: { blocked_id: HIM, created_at: new Date().toISOString() } }, 201))
      return
    }
    if (url.pathname === '/v1/pin' && method === 'GET') {
      await route.fulfill(json({ enabled: false, locked: false }))
      return
    }
    await route.fulfill(error('NOT_FOUND', 'Not found', 404))
  })
}

async function openReport(page: Page, query = ''): Promise<void> {
  const target = query.includes('discussion=') ? `/v1/conversations/${CONVERSATION}` : `/v1/profiles/${HIM}`
  const loaded = page.waitForResponse((response) => response.url().endsWith(target))
  await page.goto(`/signaler/${HIM}${query}`)
  await loaded
  await expect(page.locator('#report-block')).toHaveAttribute('aria-busy', 'false')
}

test.describe('Report / Block (screen 23)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 8.5-1 and AC 4.4-3: a Profile Report with « misrepresented marital status », Block on, reaches the API and shows the 24 h SLA', async ({ page, context, baseURL }) => {
    const api = state()
    await serveApi(context, baseURL ?? '', api)
    await openReport(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Signaler ou bloquer ce profil' })).toBeVisible()
    await expect(page.getByText('Profil concerné : Al-Hassan_BF (Ouagadougou)')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour au profil' })).toHaveAttribute('href', `/profil/${HIM}`)
    const group = page.getByRole('group', { name: /Motif du signalement/ })
    await expect(group.getByRole('radio')).toHaveCount(9)
    for (const [index, label] of REASONS.entries()) {
      await expect(group.getByRole('radio').nth(index)).toHaveAccessibleName(label)
      await expect(group.getByRole('radio').nth(index)).not.toBeChecked()
    }
    await expect(page.getByRole('checkbox', { name: 'Bloquer également ce profil' })).toBeChecked()
    await expect(page.getByRole('checkbox')).toHaveAccessibleName('Bloquer également ce profil')
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)

    // Reason required: nothing is posted without one.
    await page.getByRole('button', { name: 'Transmettre le signalement' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Choisissez un motif.' })).toBeVisible()
    await expect(group.getByRole('radio').first()).toBeFocused()
    expect(api.reports).toEqual([])

    await page.getByRole('radio', { name: 'Dissimulation ou fausse déclaration de situation matrimoniale' }).check()
    await expect(page.getByText('Choisissez un motif.')).toBeHidden()
    await page.getByLabel(/Précisions utiles pour les modérateurs/).fill('  Se présente comme célibataire, ce qui est faux.  ')
    const posted = page.waitForResponse((response) => response.url().endsWith('/v1/reports'))
    await page.getByRole('button', { name: 'Transmettre le signalement' }).dblclick()
    await posted
    expect(api.reports).toEqual([
      { target_kind: 'profile', target_id: HIM, reason: 'misrepresented_marital_status', block: true, details: 'Se présente comme célibataire, ce qui est faux.' },
    ])
    await expect(page.getByRole('heading', { level: 1, name: 'Signalement transmis' })).toBeFocused()
    await expect(page.getByRole('status').filter({ hasText: "Un membre de l'équipe de modération l'examinera dans les 24 heures." })).toBeVisible()
    await expect(page.getByText('Ce membre ne peut plus consulter votre fiche ni vous contacter.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour à la découverte' })).toHaveAttribute('href', '/decouvrir')
    await expectAccessible(page)
  })

  test('AC 8.6: « Bloquer ce profil » blocks without a Report', async ({ page, context, baseURL }) => {
    const api = state()
    await serveApi(context, baseURL ?? '', api)
    await openReport(page)
    const posted = page.waitForResponse((response) => response.url().endsWith('/v1/blocks'))
    await page.getByRole('button', { name: 'Bloquer ce profil' }).click()
    await posted
    expect(api.blocks).toEqual([{ blocked_id: HIM }])
    expect(api.reports).toEqual([])
    await expect(page.getByRole('heading', { level: 1, name: 'Profil bloqué' })).toBeFocused()
    await expect(page.getByText('Ce membre ne peut plus consulter votre fiche ni vous contacter.')).toBeVisible()
    await expectAccessible(page)
  })

  test('keyboard only: pick a reason, untick Block, and send with the keyboard', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'keyboard path runs once')
    const api = state()
    await serveApi(context, baseURL ?? '', api)
    await openReport(page)
    await page.getByRole('radio').first().focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('radio', { name: 'Propos à caractère sexuel' })).toBeChecked()
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/Précisions utiles/)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('checkbox', { name: 'Bloquer également ce profil' })).toBeFocused()
    await page.keyboard.press('Space')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Transmettre le signalement' })).toBeFocused()
    const posted = page.waitForResponse((response) => response.url().endsWith('/v1/reports'))
    await page.keyboard.press('Enter')
    await posted
    expect(api.reports).toEqual([{ target_kind: 'profile', target_id: HIM, reason: 'sexual_content', block: false }])
    await expect(page.getByRole('heading', { level: 1, name: 'Signalement transmis' })).toBeFocused()
    await expect(page.getByText('Ce membre ne peut plus consulter votre fiche ni vous contacter.')).toHaveCount(0)
  })

  test('shows the API message on a rate limit, the sign-in link on 401, and « Ce profil n\'est pas disponible. » on 404', async ({ page, context, baseURL }) => {
    const api = state()
    api.reportFailure = { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Trop de signalements en peu de temps. Réessayez plus tard.', details: null, request_id: 'r', retryable: true } } }
    await serveApi(context, baseURL ?? '', api)
    await openReport(page)
    await page.getByRole('radio', { name: 'Usage non matrimonial' }).check()
    await page.getByRole('button', { name: 'Transmettre le signalement' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Trop de signalements en peu de temps. Réessayez plus tard.' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Usage non matrimonial' })).toBeChecked()
    api.reportFailure = { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.', details: null, request_id: 'r', retryable: false } } }
    await page.getByRole('button', { name: 'Transmettre le signalement' }).click()
    await expect(page.getByRole('alert').getByRole('link', { name: 'Se reconnecter' })).toHaveAttribute('href', '/auth')
    await expectAccessible(page)

    api.profileStatus = 404
    await openReport(page)
    await expect(page.getByRole('alert').filter({ hasText: "Ce profil n'est pas disponible." })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour à la découverte' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Transmettre le signalement' })).toBeHidden()
  })

  test('fits every factory width', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await serveApi(context, baseURL ?? '', state())
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openReport(page, `?discussion=${CONVERSATION}&message=${HIS_MESSAGE}`)
      await expectNoHorizontalOverflow(page)
    }
  })
})

test.describe('Report / Block from the Chat thread (screen 21)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 8.5-1 from Chat: « Signaler ce message » on his bubble sends a message Report with the message id', async ({ page, context, baseURL }) => {
    const api = state()
    await serveApi(context, baseURL ?? '', api)
    const loaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${CONVERSATION}/messages`))
    await page.goto(`/discussions/${CONVERSATION}`)
    await loaded
    await expect(page.locator('#chat-thread')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByRole('link', { name: 'Signaler / Bloquer' })).toHaveAttribute('href', `/signaler/${HIM}?discussion=${CONVERSATION}`)
    const bubbles = page.getByRole('log', { name: 'Messages' }).getByTestId('chat-bubble')
    await expect(bubbles.nth(0).getByRole('link', { name: 'Signaler ce message' })).toHaveCount(0)
    const flag = bubbles.nth(1).getByRole('link', { name: 'Signaler ce message' })
    await expect(flag).toHaveAttribute('href', `/signaler/${HIM}?discussion=${CONVERSATION}&message=${HIS_MESSAGE}`)
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)

    const opened = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${CONVERSATION}`))
    await flag.click()
    await opened
    await expect(page.getByText('Le message choisi dans la discussion est joint à ce signalement.')).toBeVisible()
    await expect(page.getByText('Profil concerné : Al-Hassan_BF (Ouagadougou)')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour à la discussion' })).toHaveAttribute('href', `/discussions/${CONVERSATION}`)
    await page.getByRole('radio', { name: "Demande d'argent ou tentative d'escroquerie" }).check()
    const posted = page.waitForResponse((response) => response.url().endsWith('/v1/reports'))
    await page.getByRole('button', { name: 'Transmettre le signalement' }).click()
    await posted
    expect(api.reports).toEqual([{ target_kind: 'message', target_id: HIS_MESSAGE, reason: 'money_scam', block: true }])
    await expect(page.getByRole('link', { name: 'Retour aux discussions' })).toHaveAttribute('href', '/discussions')
    await expectAccessible(page)

    // AC 8.6-2: back in the thread after the Block, it is closed: profile unavailable, composer disabled.
    const reloaded = page.waitForResponse((response) => response.url().endsWith(`/v1/conversations/${CONVERSATION}/messages`))
    await page.goto(`/discussions/${CONVERSATION}`)
    await reloaded
    await expect(page.getByText("Ce profil n'est plus disponible.")).toBeVisible()
    await expect(page.getByLabel('Votre message')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  })
})
