import type { BrowserContext, Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Screen 19, Invite inbox (Stories 4.4, 4.5). The page renders for the `web` stub session without an API call on the
// server; these tests answer every browser call to /v1 themselves, and keep the invite states the way the API would.
// Stub cookies are a dev-build seam only.
const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

type State = 'pending' | 'accepted' | 'declined'

type Row = {
  id: string
  state: State
  created_at: string
  direction: 'received' | 'sent'
  other_id: string
  pseudonym: string
  conversation_id: string | null
  other: Record<string, unknown>
}

type Api = {
  rows: Row[]
  posts: string[]
  failNext?: { status: number; body: unknown }
  listStatus?: number
}

const AVAILABLE = (marital: string | null, polygamy: string | null, verified = true) => ({
  available: true,
  age: 34,
  city: 'bobo',
  marital_status: marital,
  polygamy_intent: polygamy,
  verified,
  photo: null,
})

function received(id: string, name: string, other: Record<string, unknown>, state: State = 'pending'): Row {
  return {
    id,
    state,
    created_at: '2026-10-12T10:00:00.000Z',
    direction: 'received',
    other_id: `01990000-0000-7000-8000-0000000001${id.slice(-2)}`,
    pseudonym: name,
    conversation_id: state === 'accepted' ? `01990000-0000-7000-8000-0000000002${id.slice(-2)}` : null,
    other,
  }
}

function sent(id: string, name: string, state: State): Row {
  return {
    id,
    state,
    created_at: '2026-10-08T10:00:00.000Z',
    direction: 'sent',
    other_id: `01990000-0000-7000-8000-0000000003${id.slice(-2)}`,
    pseudonym: name,
    conversation_id: state === 'accepted' ? `01990000-0000-7000-8000-0000000004${id.slice(-2)}` : null,
    other: { ...AVAILABLE('single', null), city: 'koudougou', age: 27 },
  }
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

function boxItems(api: Api, box: string): Row[] {
  if (box === 'sent') return api.rows.filter((row) => row.direction === 'sent')
  if (box === 'accepted') return api.rows.filter((row) => row.state === 'accepted')
  return api.rows.filter((row) => row.direction === 'received')
}

async function serveApi(context: BrowserContext, baseURL: string, api: Api): Promise<void> {
  await context.addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL }])
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname === '/v1/invites' && method === 'GET') {
      if (api.listStatus && api.listStatus !== 200) {
        await route.fulfill(json({ error: { code: 'UNHANDLED', message: 'Request failed', details: null, request_id: 'r', retryable: true } }, api.listStatus))
        return
      }
      const box = url.searchParams.get('box') ?? 'received'
      const items = boxItems(api, box)
      await route.fulfill(json({ box, count: items.length, items }))
      return
    }
    const action = /^\/v1\/invites\/([^/]+)\/(accept|decline)$/.exec(url.pathname)
    if (action && method === 'POST') {
      api.posts.push(`${action[2]} ${action[1]}`)
      if (api.failNext) {
        const fail = api.failNext
        delete api.failNext
        await route.fulfill(json(fail.body, fail.status))
        return
      }
      const row = api.rows.find((item) => item.id === action[1])
      if (!row) {
        await route.fulfill(json({ error: { code: 'NOT_FOUND', message: "Cette invitation n'existe pas.", details: null } }, 404))
        return
      }
      row.state = action[2] === 'accept' ? 'accepted' : 'declined'
      if (row.state === 'accepted') row.conversation_id = '01990000-0000-7000-8000-0000000009ff'
      const body = { invite: { id: row.id, state: row.state, created_at: row.created_at }, ...(row.state === 'accepted' ? { conversation: { id: row.conversation_id, stage: 'chat' } } : {}) }
      await route.fulfill(json(body))
      return
    }
    if (url.pathname === '/v1/pin' && method === 'GET') {
      await route.fulfill(json({ enabled: false, locked: false }))
      return
    }
    await route.fulfill(json({ error: { code: 'NOT_FOUND', message: 'Not found', details: null } }, 404))
  })
}

const BROTHER = '01990000-0000-7000-8000-0000000000a1'
const SECOND = '01990000-0000-7000-8000-0000000000a2'

function inbox(): Api {
  return {
    rows: [
      received(BROTHER, 'Al-Hassan_BF', AVAILABLE('married', 'yes')),
      received(SECOND, 'Ibrahim_S', AVAILABLE('single', 'no', false)),
      sent('01990000-0000-7000-8000-0000000000b1', 'Mariam_K', 'pending'),
      sent('01990000-0000-7000-8000-0000000000b2', 'Fatoumata_O', 'accepted'),
      sent('01990000-0000-7000-8000-0000000000b3', 'Aissata_B', 'declined'),
    ],
    posts: [],
  }
}

async function openInbox(page: Page, hash = ''): Promise<void> {
  const lists = page.waitForResponse((response) => response.url().includes('/v1/invites?box=accepted'))
  await page.goto(`/invitations${hash}`)
  await lists
  await expect(page.locator('#invite-inbox')).toHaveAttribute('aria-busy', 'false')
}

function row(page: Page, name: string) {
  return page.getByTestId('invite-row').filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}`) }) })
}

test.describe('Invite inbox (Stories 4.4, 4.5)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('AC 4.4-1: received rows show marital status and polygamy intent before accept, inside the shared shell', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', inbox())
    await openInbox(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Invitations Ta'aruf")
    await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Invitations' })).toHaveAttribute('aria-current', 'page')
    const tabs = page.getByRole('tab')
    await expect(tabs).toHaveText([/Reçues\s*2/, /Envoyées\s*3/, /Acceptées\s*1/])
    await expect(page.getByRole('tab', { name: /Reçues/ })).toHaveAttribute('aria-selected', 'true')

    const first = row(page, 'Al-Hassan_BF')
    await expect(first.getByRole('heading')).toHaveText('Al-Hassan_BF, 34 ans')
    await expect(first.getByText('Identité vérifiée')).toBeVisible()
    await expect(first.getByText('Bobo-Dioulasso')).toBeVisible()
    const facts = first.getByTestId('invite-marital')
    await expect(facts).toContainText('Situation matrimoniale')
    await expect(facts).toContainText('Marié(e)')
    await expect(facts).toContainText('Déclaration de polygamie')
    await expect(facts).toContainText('Ouvert à la polygamie')
    await expect(facts).toContainText("Étape : Invitation Ta'aruf")
    await expect(first.getByRole('button', { name: 'Accepter la démarche' })).toBeVisible()
    await expect(first.getByRole('link', { name: 'Consulter le profil' })).toHaveAttribute('href', '/profil/01990000-0000-7000-8000-0000000001a1')
    await expect(first.getByRole('button', { name: 'Refuser discrètement' })).toHaveAttribute('data-variant', 'button-quiet')

    const second = row(page, 'Ibrahim_S')
    await expect(second.getByTestId('invite-marital')).toContainText('Célibataire')
    await expect(second.getByTestId('invite-marital')).toContainText('Projet monogame')
    await expect(second.getByText('Identité vérifiée')).toHaveCount(0)
    await expect(page.getByText("Mot d'introduction")).toHaveCount(0)
    for (const button of await page.getByTestId('invite-row').getByRole('button').all()) {
      const box = await button.boundingBox()
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    }
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('AC 4.4-2: Sent shows pending, accepted and declined, and a declined row carries no guilt copy, receipt or timer', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', inbox())
    await openInbox(page)
    await page.getByRole('tab', { name: /Envoyées/ }).click()
    await expect(page.getByRole('tab', { name: /Envoyées/ })).toHaveAttribute('aria-selected', 'true')
    const panel = page.getByRole('tabpanel', { name: /Envoyées/ })
    await expect(panel.getByTestId('invite-row')).toHaveCount(3)
    await expect(row(page, 'Mariam_K')).toContainText('En attente')
    await expect(row(page, 'Fatoumata_O')).toContainText('Acceptée')
    await expect(row(page, 'Fatoumata_O').getByRole('link', { name: 'Ouvrir la discussion' })).toHaveAttribute('href', '/discussions')
    const declined = row(page, 'Aissata_B')
    await expect(declined).toHaveAttribute('data-state', 'declined')
    // Name, age, city, the send date and the state. Nothing else: no lecture, no « she saw it », no countdown.
    await expect(declined).toHaveText(/^\s*AAissata_B, 27 ans\s*•\s*KoudougouEnvoyée le 8 octobre 2026\s*Déclinée\s*$/)
    await expect(row(page, 'Mariam_K')).toHaveText(/^\s*MMariam_K, 27 ans\s*•\s*KoudougouEnvoyée le 8 octobre 2026\s*En attente\s*$/)
    await expect(panel.getByRole('link', { name: 'Ouvrir la discussion' })).toHaveCount(1)
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('AC 4.5-1: accept posts once, then the row moves to Acceptées with the discussion link', async ({ page, context, baseURL }) => {
    const api = inbox()
    await serveApi(context, baseURL ?? '', api)
    await openInbox(page)
    const accept = row(page, 'Al-Hassan_BF').getByRole('button', { name: 'Accepter la démarche' })
    const posted = page.waitForResponse((response) => response.url().endsWith(`/v1/invites/${BROTHER}/accept`))
    await accept.dblclick()
    await posted
    await expect(page.getByRole('status')).toHaveText('Invitation acceptée. La discussion est ouverte.')
    expect(api.posts).toEqual([`accept ${BROTHER}`])
    await expect(page.getByRole('tab', { name: /Reçues/ })).toHaveText(/Reçues\s*1/)
    await expect(page.getByRole('tab', { name: /Acceptées/ })).toHaveText(/Acceptées\s*2/)
    await expect(row(page, 'Al-Hassan_BF')).toHaveCount(0)
    await page.getByRole('tab', { name: /Acceptées/ }).click()
    const accepted = page.getByRole('tabpanel', { name: /Acceptées/ })
    const moved = accepted.getByTestId('invite-row').filter({ hasText: 'Al-Hassan_BF' })
    await expect(moved).toContainText('Démarche confirmée')
    await expect(moved).toContainText('Reçue le 12 octobre 2026')
    await expect(moved.getByRole('link', { name: 'Ouvrir la discussion' })).toHaveAttribute('href', '/discussions')
    await expectAccessible(page)
  })

  test('AC 4.5-2: decline is quiet: one post, a short status, the row leaves Reçues, no confirmation or lecture', async ({ page, context, baseURL }) => {
    const api = inbox()
    await serveApi(context, baseURL ?? '', api)
    await openInbox(page)
    page.on('dialog', () => {
      throw new Error('decline must not open a dialog')
    })
    const posted = page.waitForResponse((response) => response.url().endsWith(`/v1/invites/${BROTHER}/decline`))
    await row(page, 'Al-Hassan_BF').getByRole('button', { name: 'Refuser discrètement' }).click()
    await posted
    await expect(page.getByRole('status')).toHaveText('Invitation refusée.')
    expect(api.posts).toEqual([`decline ${BROTHER}`])
    await expect(row(page, 'Al-Hassan_BF')).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /Reçues/ })).toHaveText(/Reçues\s*1/)
    await expect(page.getByText(/pourquoi|raison|expliquer/i)).toHaveCount(0)

    const last = page.waitForResponse((response) => response.url().endsWith(`/v1/invites/${SECOND}/decline`))
    await row(page, 'Ibrahim_S').getByRole('button', { name: 'Refuser discrètement' }).click()
    await last
    const receivedPanel = page.getByRole('tabpanel', { name: /Reçues/ })
    await expect(receivedPanel.getByText('Aucune invitation.')).toBeVisible()
    await expect(receivedPanel.getByText("Votre espace d'invitations s'actualise au fur et à mesure des présentations conformes.")).toBeVisible()
    await expectAccessible(page)
  })

  test('a sender who is no longer available shows only the quiet decline; a refused accept reloads with its message', async ({ page, context, baseURL }) => {
    const api = inbox()
    api.rows[1] = { ...(api.rows[1] as Row), other: { available: false } }
    await serveApi(context, baseURL ?? '', api)
    await openInbox(page)
    const gone = row(page, 'Ibrahim_S')
    await expect(gone).toContainText("Ce profil n'est plus disponible.")
    await expect(gone.getByRole('button')).toHaveText(['Refuser discrètement'])
    await expect(gone.getByTestId('invite-marital')).toHaveCount(0)

    api.failNext = { status: 404, body: { error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible.", details: null } } }
    await row(page, 'Al-Hassan_BF').getByRole('button', { name: 'Accepter la démarche' }).click()
    await expect(page.getByRole('status')).toHaveText("Ce profil n'est pas disponible.")
    await expectAccessible(page)
  })

  test('the tabs work from the keyboard, and accept is reachable without a mouse', async ({ page, context, baseURL }) => {
    const api = inbox()
    await serveApi(context, baseURL ?? '', api)
    await openInbox(page)
    await page.getByRole('tab', { name: /Reçues/ }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: /Envoyées/ })).toBeFocused()
    await expect(page.getByRole('tab', { name: /Envoyées/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(page.getByRole('tab', { name: /Acceptées/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Home')
    await expect(page.getByRole('tab', { name: /Reçues/ })).toHaveAttribute('aria-selected', 'true')
    const accept = row(page, 'Al-Hassan_BF').getByRole('button', { name: 'Accepter la démarche' })
    await accept.focus()
    const posted = page.waitForResponse((response) => response.url().endsWith(`/v1/invites/${BROTHER}/accept`))
    await page.keyboard.press('Enter')
    await posted
    await expect(page.getByRole('status')).toHaveText('Invitation acceptée. La discussion est ouverte.')
  })

  test('a load failure shows the retry, and the retry loads the inbox', async ({ page, context, baseURL, guards }) => {
    const api = { ...inbox(), listStatus: 500 }
    await serveApi(context, baseURL ?? '', api)
    await page.goto('/invitations')
    await expect(page.getByRole('alert')).toHaveText('Chargement impossible. Vérifiez votre connexion et réessayez.')
    // Expected: the 500 answers above are this test's own failure injection.
    guards.failedRequests.length = 0
    guards.consoleErrors.length = 0
    api.listStatus = 200
    const lists = page.waitForResponse((response) => response.url().includes('/v1/invites?box=accepted'))
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await lists
    await expect(row(page, 'Al-Hassan_BF')).toBeVisible()
  })

  test('when the city wraps under a long name, the « • » wraps with it on Envoyées and Acceptées', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'narrow widths are set by hand')
    const api = inbox()
    api.rows.push(sent('01990000-0000-7000-8000-0000000000b4', 'Mariam_Ouedraogo_Kabore', 'pending'))
    api.rows.push(sent('01990000-0000-7000-8000-0000000000b5', 'Fatoumata_Sawadogo_Zongo', 'accepted'))
    await serveApi(context, baseURL ?? '', api)
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await openInbox(page)
      for (const [tab, name] of [[/Envoyées/, 'Mariam_Ouedraogo_Kabore'], [/Acceptées/, 'Fatoumata_Sawadogo_Zongo']] as const) {
        await page.getByRole('tab', { name: tab }).click()
        const target = page.getByRole('tabpanel').locator('[data-testid="invite-row"]:visible').filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}`) }) })
        await expect(target).toBeVisible()
        const lines = await target.evaluate((node) => {
          const top = (el: Element) => Math.round(el.getBoundingClientRect().top)
          return Array.from(node.querySelectorAll('.inbox-sep-group')).map((group) => {
            const [sep, text] = Array.from(group.children)
            return { sep: top(sep!), text: top(text!), bullet: sep!.textContent }
          })
        })
        expect(lines.length).toBeGreaterThan(0)
        for (const line of lines) {
          expect(line.bullet).toBe('•')
          expect(line.sep).toBe(line.text)
        }
      }
      if (width === 390) {
        await page.getByRole('tab', { name: /Envoyées/ }).click()
        const sentRow = row(page, 'Mariam_Ouedraogo_Kabore')
        const wrapped = await sentRow.evaluate((node) => {
          const name = node.querySelector('h2')!.getBoundingClientRect()
          const group = node.querySelector('.inbox-sep-group')!.getBoundingClientRect()
          return group.top >= name.bottom - 1
        })
        expect(wrapped).toBe(true)
      }
      await expectNoHorizontalOverflow(page)
    }
    await expectAccessible(page)
  })

  test('fits every factory width on each tab', async ({ page, context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once')
    await serveApi(context, baseURL ?? '', inbox())
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openInbox(page)
      for (const name of [/Reçues/, /Envoyées/, /Acceptées/]) {
        await page.getByRole('tab', { name }).click()
        await expectNoHorizontalOverflow(page)
      }
    }
  })
})
