import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/profil/[id]/route.js'
import { profileDetailHtml, type ProfileDetailView } from './profile-detail.js'

function stitch(): string {
  return readFileSync(
    fileURLToPath(new URL('../../../design-stitch/ankanu-v2/15-profile-detail/screen.html', import.meta.url)),
    'utf8',
  )
}

function view(patch: Partial<ProfileDetailView> = {}): ProfileDetailView {
  return {
    profile: {
      id: '01990000-0000-7000-8000-000000000099',
      pseudonym: 'Aminata_BF',
      age: 36,
      city: 'bobo',
      country: 'BF',
      profession: 'enseignement',
      marital_status: 'single',
      polygamy_intent: 'no',
      madhhab: 'shafii',
      practice: 'heure',
      life_plans: 'tf:6months\nUnion stable',
      ...patch.profile,
    },
    verification: { phone: true, id: false, mahram: false, ...patch.verification },
    photo_blur: patch.photo_blur ?? true,
    photos: patch.photos ?? [
      { id: '01990000-0000-7000-8000-000000000101', is_main: true, url: '/v1/media/get?token=main' },
    ],
  }
}

describe('screen 15 public profile', () => {
  it('shows only the earned phone level and the API values', () => {
    const html = profileDetailHtml(stitch(), view())
    expect(html).toContain('Aminata_BF, 36 ans')
    expect(html).toContain('Téléphone vérifié')
    expect(html).toContain('Sécurisé garantie')
    expect(html).toContain('Bobo-Dioulasso, 🇧🇫 Burkina Faso')
    expect(html).toContain('Enseignant / Chercheur')
    expect(html).toContain('Célibataire')
    expect(html).toContain('>Non<')
    expect(html).toContain("Shafi'i")
    expect(html).toContain("Prières à l'heure")
    expect(html).toContain('« Union stable »')
    expect(html).toContain('flex flex-wrap')
    expect(html).toContain('w-12 h-12')
    expect(html).not.toContain('overflow-x-auto')
    expect(html).toContain('/v1/pin')
    expect(html).toContain('href="/decouvrir"')
    expect(html).toContain('/v1/media/get?token=main')
    expect(html).toContain("Demander l'accès à la photographie")
    expect(html).not.toContain('Identité vérifiée')
    expect(html).not.toContain('Tuteur (Wali) associé')
    expect(html).not.toContain('Vérifié')
    expect(html).not.toContain('Al-Hassan_BF')
    expect(html).not.toContain('RÉF. BF-7049')
    expect(html).not.toContain('Secteur 15')
    expect(html).not.toContain('googleusercontent')
    expect(html).not.toContain('Ingénieur en télécommunications')
    expect(html).not.toContain('Projet monogame exclusif')
    expect(html).not.toContain('Célibataire (jamais marié)')
    expect(html).not.toContain('à venir')
    expect(html).toContain('grid-cols-1 min-[768px]:grid-cols-3')
  })

  it('shows the identity chip and the wali row only when those levels are true', () => {
    const earned = profileDetailHtml(stitch(), view({ verification: { phone: true, id: true, mahram: true } }))
    expect(earned).toContain('Identité vérifiée')
    expect(earned).toContain('CNIB &amp; Preuve de vie')
    expect(earned).toContain('Tuteur (Wali) associé')
    expect(earned).toContain('Vérifié')
    const none = profileDetailHtml(stitch(), view({ verification: { phone: false, id: false, mahram: false } }))
    expect(none).not.toContain("Niveaux d'authentification stricts")
    expect(none).not.toContain('Téléphone vérifié')
  })

  it('omits null rows and the lock when the photograph is clear', () => {
    const html = profileDetailHtml(
      stitch(),
      view({
        profile: {
          id: '01990000-0000-7000-8000-000000000099',
          pseudonym: 'Aminata_BF',
          age: null,
          city: null,
          country: null,
          profession: null,
          marital_status: null,
          polygamy_intent: null,
          madhhab: null,
          practice: null,
          life_plans: null,
        },
        photo_blur: false,
        photos: [
          { id: 'a', is_main: true, url: '/v1/media/get?token=clear' },
          { id: 'b', is_main: false, url: '/v1/media/get?token=second' },
        ],
      }),
    )
    expect(html).toContain('Aminata_BF')
    expect(html).not.toContain(' ans')
    expect(html).not.toContain('Situation matrimoniale')
    expect(html).not.toContain('Pratique éthique')
    expect(html).not.toContain('Intention de mariage')
    expect(html).not.toContain('Photographie réservée')
    expect(html).not.toContain('Demander l')
    expect(html).not.toContain('blur-2xl')
    expect(html).toContain('data-photo-src="/v1/media/get?token=second"')
    expect(html).toContain('profile-hero')
  })

  it('sends stubs and anonymous visitors the same way as other member paths', async () => {
    const anon = await GET(new Request('http://127.0.0.1/profil/0199'), {
      params: Promise.resolve({ id: '0199' }),
    })
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://127.0.0.1/auth')

    const staff = await GET(new Request('http://127.0.0.1/profil/0199', { headers: { cookie: 'ankanu_session=staff' } }), {
      params: Promise.resolve({ id: '0199' }),
    })
    expect(staff.status).toBe(403)
    expect(await staff.json()).toMatchObject({
      error: { code: 'FORBIDDEN', message: "Cette session d'équipe ne peut pas ouvrir un espace membre." },
    })

    const mahram = await GET(new Request('http://127.0.0.1/profil/0199', { headers: { cookie: 'ankanu_session=mahram' } }), {
      params: Promise.resolve({ id: '0199' }),
    })
    expect(mahram.status).toBe(403)
    expect(await mahram.json()).toMatchObject({
      error: { code: 'FORBIDDEN', message: 'Une session mahram ne peut pas ouvrir cet espace.' },
    })

    const web = await GET(new Request('http://127.0.0.1/profil/0199', { headers: { cookie: 'ankanu_session=web' } }), {
      params: Promise.resolve({ id: '0199' }),
    })
    expect(web.status).toBe(401)
    expect(await web.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('sends a locked sister to the PIN page', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/v1/accounts/gate')) {
        return new Response(JSON.stringify({ step: 'account' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({
          error: {
            code: 'PIN_REQUIRED',
            message: 'Code PIN requis.',
            details: null,
            request_id: 'pin-test',
            retryable: false,
          },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      )
    }) as typeof fetch
    try {
      const response = await GET(
        new Request('http://127.0.0.1/profil/01990000-0000-7000-8000-000000000099', {
          headers: { cookie: 'ankanu_session=01990000-0000-7000-8000-000000000010' },
        }),
        { params: Promise.resolve({ id: '01990000-0000-7000-8000-000000000099' }) },
      )
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toBe(
        'http://127.0.0.1/pin?next=%2Fprofil%2F01990000-0000-7000-8000-000000000099',
      )
    } finally {
      globalThis.fetch = original
    }
  })
})
