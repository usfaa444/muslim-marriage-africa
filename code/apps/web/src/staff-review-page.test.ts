import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LIVENESS_POSES } from '../../api/src/liveness-pose.js'
import { ID_REJECT_REASONS, LIVENESS_REJECT_REASONS } from '../../api/src/staff-review.js'
import {
  CITY,
  COUNTRY,
  EDUCATION,
  LIFE_PLAN_TIMEFRAME,
  MADHHAB,
  MARITAL_STATUS,
  POLYGAMY_INTENT,
  PRACTICE,
  PROFESSION,
} from '../../api/src/profile-fields.js'
import { STAFF_BADGE_TEXT } from './staff-pages.js'
import {
  ID_REASON_LABEL,
  PROFILE_VALUES,
  STATUS_LABEL,
  LIVENESS_REASON_LABEL,
  REVIEW_TITLE,
  VISIBILITY_LABEL,
  staffReviewHtml,
  staffReviewScript,
} from './staff-review-page.js'
import { staffReviewResponse } from './v2-serve.js'

const stitch52 = readFileSync(
  fileURLToPath(new URL('../../../design-stitch/ankanu-v2/52-ts-visit-signals/screen.html', import.meta.url)),
  'utf8',
)

const MEMBER_NAV = ['Découvrir', 'Discussions', 'href="/profil"', 'href="/decouvrir"', 'href="/invitations"', 'data-shell="member"']
const originalFetch = globalThis.fetch

function apiAnswers(status: number, body: unknown): string[] {
  const calls: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  return calls
}

function request(cookie?: string): Request {
  return new Request('http://127.0.0.1/staff/revue', cookie ? { headers: { cookie } } : {})
}

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.unstubAllEnvs()
})

describe('staff review console page', () => {
  it('renders the staff shell with the badge, two labelled panes and no member nav', () => {
    const html = staffReviewHtml(stitch52, { email: 'mod<x>@example.bf', roles: ['moderator'] })
    expect(html).toContain(STAFF_BADGE_TEXT)
    expect(html).toContain(`<h1 class="font-display text-3xl md:text-4xl text-deep-navy font-normal">${REVIEW_TITLE}</h1>`)
    expect(html).toContain('aria-label="Liste des fiches à examiner"')
    expect(html).toContain('aria-label="Détails du dossier sélectionné"')
    expect(html).toContain('md:grid-cols-12')
    expect(html).toContain('Modérateur • mod&lt;x&gt;@example.bf')
    expect(html).not.toContain('mod<x>')
    for (const fragment of MEMBER_NAV) {
      expect(html, fragment).not.toContain(fragment)
    }
    expect(html).not.toMatch(/\son[a-z]+=/i)
    expect(html).toContain("fetch(path, {")
    expect(html).toContain('/v1/staff/review/queue')
  })

  it('ships a client script that parses, never writes evidence to storage and never uses innerHTML for data', () => {
    const script = staffReviewScript({ status: {}, idReasons: {}, liveReasons: {}, profileReasons: [], fields: {}, visibility: {}, poses: {}, pictos: {} })
    expect(() => new Function(script)).not.toThrow()
    expect(script).not.toMatch(/localStorage|sessionStorage|indexedDB|caches\./)
    // The only innerHTML is the server-built pictogram from a fixed map, keyed by the pose id.
    expect(script.match(/innerHTML/g)).toEqual(['innerHTML'])
    expect(script).toContain("picto.innerHTML = C.pictos[view.liveness.pose] || ''")
    expect(script).toContain("cache: 'no-store'")
  })

  it('names every profile visibility the database allows in French', () => {
    const migration = readFileSync(fileURLToPath(new URL('../../api/drizzle/0005_profile.sql', import.meta.url)), 'utf8')
    const allowed = /"visibility" in \(([^)]*)\)/.exec(migration)?.[1]?.match(/'[^']+'/g)?.map((v) => v.slice(1, -1)) ?? []
    expect(allowed.length).toBeGreaterThan(0)
    expect(Object.keys(VISIBILITY_LABEL).sort()).toEqual([...allowed].sort())
  })

  it('names every stored profile token in French, as the member profile does (QA round 1, F2)', () => {
    const lists: Record<string, readonly string[]> = {
      city: CITY,
      country: COUNTRY,
      education: EDUCATION,
      madhhab: MADHHAB,
      marital_status: MARITAL_STATUS,
      polygamy_intent: POLYGAMY_INTENT,
      practice: PRACTICE,
      profession: PROFESSION,
    }
    expect(Object.keys(PROFILE_VALUES).sort()).toEqual(Object.keys(lists).sort())
    for (const [field, tokens] of Object.entries(lists)) {
      expect(Object.keys(PROFILE_VALUES[field] ?? {}).sort(), field).toEqual([...tokens].sort())
    }
    expect(PROFILE_VALUES.marital_status?.single).toBe('Célibataire')
    expect(PROFILE_VALUES.polygamy_intent?.no).toBe('Non')
    const html = staffReviewHtml(stitch52, null)
    for (const token of LIFE_PLAN_TIMEFRAME) {
      expect(html, token).toContain(`"${token}":`)
    }
    expect(STATUS_LABEL.superseded).toBe('Remplacée par une nouvelle prise (non examinée)')
  })

  it('escapes the config so a label can never close the script', () => {
    const script = staffReviewScript({ status: { x: '</script><script>alert(1)</script>' } })
    expect(script).not.toContain('</script>')
  })

  it('offers exactly the API reason lists, in French', () => {
    expect(Object.keys(ID_REASON_LABEL)).toEqual([...ID_REJECT_REASONS])
    expect(Object.keys(LIVENESS_REASON_LABEL)).toEqual([...LIVENESS_REJECT_REASONS])
    const html = staffReviewHtml(stitch52, null)
    for (const pose of LIVENESS_POSES) {
      expect(html, pose).toContain(`"${pose}":"\\u003csvg`)
    }
  })

  it('checks the staff session with the API before rendering, and never trusts a stub cookie in production', async () => {
    expect((await staffReviewResponse(request())).headers.get('location')).toContain('/staff/connexion')
    expect((await staffReviewResponse(request('ankanu_session=web'))).headers.get('location')).toContain('/decouvrir')

    const cookie = 'ankanu_session=01990000-0000-7000-8000-000000000003'
    const calls = apiAnswers(200, { kind: 'staff', mfa_state: 'done', roles: ['operator'], email: 'op@example.bf' })
    const done = await staffReviewResponse(request(cookie))
    expect(done.status).toBe(200)
    expect(done.headers.get('cache-control')).toBe('no-store')
    expect(await done.text()).toContain('Opérateur • op@example.bf')
    expect(calls[0]).toContain('/v1/staff/sessions/current')

    apiAnswers(200, { kind: 'staff', mfa_state: 'verify', roles: ['moderator'], email: 'm@example.bf' })
    expect((await staffReviewResponse(request(cookie))).headers.get('location')).toContain('/staff/connexion')
    apiAnswers(403, { error: { code: 'FORBIDDEN', details: { reason: 'staff_mfa_pending' } } })
    expect((await staffReviewResponse(request(cookie))).headers.get('location')).toContain('/staff/connexion')
    apiAnswers(403, { error: { code: 'FORBIDDEN', details: null } })
    expect((await staffReviewResponse(request(cookie))).headers.get('location')).toContain('/decouvrir')
    apiAnswers(401, { error: { code: 'UNAUTHENTICATED' } })
    expect((await staffReviewResponse(request(cookie))).headers.get('location')).toContain('/staff/connexion')

    vi.stubEnv('NODE_ENV', 'production')
    const probes = apiAnswers(401, { error: { code: 'UNAUTHENTICATED' } })
    expect((await staffReviewResponse(request('ankanu_session=staff'))).headers.get('location')).toContain('/staff/connexion')
    expect(probes.length).toBeGreaterThan(0)
  })
})
