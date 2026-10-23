import type { BrowserContext, Page } from '@playwright/test'
import { expect, expectAccessible, expectNoHorizontalOverflow, test, WIDTHS } from './fixtures'

// Screen 18, Invite compose (Stories 4.1, 4.2). The page renders for the `web` stub session without an API call on
// the server; these tests answer every browser call to /v1 themselves. Stub cookies are a dev-build seam only.
const STUB_SKIP = 'A built image ignores stub cookies (Story 12.1); these run on the web-only dev server.'

const TARGET = '01990000-0000-7000-8000-000000000099'
const PATH = `/invitations/envoyer/${TARGET}`

type Quota = Record<string, unknown>

type Api = {
  profileStatus: number
  quota: Quota
  sendReply: { status: number; body: unknown }
  sends: Array<Record<string, unknown>>
}

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) }
}

const FREE: Quota = {
  capped: true,
  cap: 3,
  remaining: 3,
  resets_at: '2026-10-24T00:00:00.000Z',
  sender: { photo: true, profile_ready: true },
}

function profile() {
  return {
    profile: {
      id: TARGET,
      pseudonym: 'Aminata_BF',
      age: 29,
      city: 'ouagadougou',
      country: 'BF',
      profession: 'enseignement',
      marital_status: 'single',
      polygamy_intent: 'no',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: null,
    },
    verification: { phone: true, id: true, mahram: false },
    photo_blur: true,
    photos: [],
  }
}

function sent(quota: Quota) {
  return {
    status: 201,
    body: { invite: { id: '01990000-0000-7000-8000-0000000000a1', to_id: TARGET, state: 'pending', created_at: '2026-10-23T10:00:00.000Z' }, quota },
  }
}

async function serveApi(context: BrowserContext, baseURL: string, api: Api): Promise<void> {
  await context.addCookies([{ name: 'ankanu_session', value: 'web', url: baseURL }])
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname === `/v1/profiles/${TARGET}` && method === 'GET') {
      if (api.profileStatus === 404) {
        await route.fulfill(json({ error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible.", details: null, request_id: 'r', retryable: false } }, 404))
        return
      }
      await route.fulfill(json(profile()))
      return
    }
    if (url.pathname === '/v1/invites/quota' && method === 'GET') {
      await route.fulfill(json(api.quota))
      return
    }
    if (url.pathname === '/v1/invites' && method === 'POST') {
      api.sends.push(request.postDataJSON() as Record<string, unknown>)
      await route.fulfill(json(api.sendReply.body, api.sendReply.status))
      return
    }
    if (url.pathname === '/v1/pin' && method === 'GET') {
      await route.fulfill(json({ enabled: false, locked: false }))
      return
    }
    await route.fulfill(json({ error: { code: 'NOT_FOUND', message: 'Not found', details: null } }, 404))
  })
}

function newApi(overrides: Partial<Api> = {}): Api {
  return { profileStatus: 200, quota: FREE, sendReply: sent({ ...FREE, remaining: 2 }), sends: [], ...overrides }
}

async function openCompose(page: Page): Promise<void> {
  const quota = page.waitForResponse((response) => response.url().endsWith('/v1/invites/quota'))
  await page.goto(PATH)
  await quota
}

test.describe('Invite compose (Stories 4.1, 4.2)', () => {
  test.skip(!!process.env.E2E_BASE_URL, STUB_SKIP)

  test('a Free member sees the remaining Invites, sends once, and the button locks', async ({ page, context, baseURL }) => {
    const api = newApi()
    await serveApi(context, baseURL ?? '', api)
    await openCompose(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText("Transmettre une invitation Ta'aruf")
    await expect(page.getByText("À l'attention de : Aminata_BF, 29 ans")).toBeVisible()
    await expect(page.getByText('Profil engagé & vérifié')).toBeVisible()
    await expect(page.getByText('Condition préalable : Photographie de profil conforme enregistrée.')).toBeVisible()
    await expect(page.getByText("Invitations restantes aujourd'hui : 3")).toBeVisible()
    await expect(page.getByTestId('invite-quota-pack')).toHaveText('Vous voulez des invitations illimitées ? Abonnez-vous !')
    await expect(page.getByTestId('invite-quota-pack')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour au profil de Aminata_BF' })).toHaveAttribute('href', `/profil/${TARGET}`)
    await expect(page.getByText('Message Flash')).toHaveCount(0)
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)

    const send = page.getByRole('button', { name: "Envoyer l'invitation Ta'aruf" })
    await expect(send).toBeEnabled()
    const posted = page.waitForResponse((response) => response.url().endsWith('/v1/invites') && response.request().method() === 'POST')
    await send.click()
    await posted
    await expect(page.getByRole('status')).toHaveText('Invitation envoyée.')
    await expect(page.getByRole('button', { name: 'Invitation envoyée' })).toBeDisabled()
    await expect(page.getByText("Invitations restantes aujourd'hui : 2")).toBeVisible()
    expect(api.sends).toEqual([{ to_id: TARGET }])
    await expectAccessible(page)
  })

  test('the quota wall shows the Ouaga reset time when the day is used up, and blocks the send', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', newApi({ quota: { ...FREE, remaining: 0 } }))
    await openCompose(page)
    await expect(page.getByRole('alert').filter({ hasText: 'Envoi refusé. Quota du jour atteint.' })).toBeVisible()
    await expect(page.getByText('Nouvelles invitations demain à partir de 00:00 (heure de Ouagadougou).')).toBeVisible()
    await expect(page.getByText('Avec Premium, invitations et messages illimités.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Découvrir Premium' })).toHaveAttribute('href', '/premium')
    await expect(page.getByRole('button', { name: "Envoyer l'invitation Ta'aruf" })).toBeDisabled()
    await expectAccessible(page)
    await expectNoHorizontalOverflow(page)
  })

  test('a QUOTA_EXCEEDED answer on send opens the quota wall', async ({ page, context, baseURL }) => {
    const api = newApi({
      sendReply: {
        status: 429,
        body: {
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'Envoi refusé. Quota du jour atteint.',
            details: { reason: 'invite_quota', cap: 3, remaining: 0, resets_at: '2026-10-24T00:00:00.000Z' },
            request_id: 'r',
            retryable: false,
          },
        },
      },
    })
    await serveApi(context, baseURL ?? '', api)
    await openCompose(page)
    await page.getByRole('button', { name: "Envoyer l'invitation Ta'aruf" }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Envoi refusé. Quota du jour atteint.' })).toBeVisible()
    await expect(page.getByRole('button', { name: "Envoyer l'invitation Ta'aruf" })).toBeDisabled()
    expect(api.sends).toHaveLength(1)
  })

  test('no Profile Photo: the prompt to add one is shown, and a refused send keeps it', async ({ page, context, baseURL }) => {
    const api = newApi({
      quota: { ...FREE, sender: { photo: false, profile_ready: true } },
      sendReply: {
        status: 403,
        body: {
          error: {
            code: 'FORBIDDEN',
            message: 'Ajoutez une photo de profil pour envoyer une invitation.',
            details: { reason: 'photo_required' },
            request_id: 'r',
            retryable: false,
          },
        },
      },
    })
    await serveApi(context, baseURL ?? '', api)
    await openCompose(page)
    await expect(page.getByText('Condition préalable : une photographie de profil est requise.')).toBeVisible()
    const add = page.getByRole('link', { name: 'Ajouter une photo' })
    await expect(add).toHaveAttribute('href', '/profile-edit')
    await page.getByRole('button', { name: "Envoyer l'invitation Ta'aruf" }).click()
    await expect(page.getByTestId('invite-error')).toHaveText('Ajoutez une photo de profil pour envoyer une invitation.')
    await expect(add).toBeFocused()
    await expectAccessible(page)
  })

  test('a Sister in free_unlimited sees unlimited Invites with no count and no pack offer', async ({ page, context, baseURL }) => {
    await serveApi(
      context,
      baseURL ?? '',
      newApi({ quota: { capped: false, sister_reach_mode: 'free_unlimited', sender: { photo: true, profile_ready: true } } }),
    )
    await openCompose(page)
    await expect(page.getByText('Invitations illimitées.', { exact: true })).toBeVisible()
    await expect(page.getByText("Invitations restantes aujourd'hui")).toHaveCount(0)
    await expect(page.getByTestId('invite-quota-pack')).toBeHidden()
    await expect(page.getByText('Vous voulez des invitations illimitées ? Abonnez-vous !')).toBeHidden()
    await expect(page.getByRole('link', { name: 'Découvrir Premium' })).toBeHidden()
  })

  test('an unavailable recipient shows one quiet message and no send button', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', newApi({ profileStatus: 404 }))
    await openCompose(page)
    await expect(page.getByRole('alert').filter({ hasText: "Ce profil n'est pas disponible." })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour à Découvrir' })).toHaveAttribute('href', '/decouvrir')
    await expect(page.getByRole('button', { name: "Envoyer l'invitation Ta'aruf" })).toBeHidden()
  })

  test('fits every required width with no horizontal scroll', async ({ page, context, baseURL }) => {
    await serveApi(context, baseURL ?? '', newApi())
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await openCompose(page)
      await expect(page.getByRole('button', { name: "Envoyer l'invitation Ta'aruf" })).toBeEnabled()
      await expectNoHorizontalOverflow(page)
    }
  })
})
