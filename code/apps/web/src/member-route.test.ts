import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GET as getDecouvrir } from '../app/decouvrir/route.js'
import { GET as getDiscussions } from '../app/discussions/route.js'
import { GET as getInvitations } from '../app/invitations/route.js'
import { GET as getProfil } from '../app/profil/route.js'
import {
  MEMBER_PATHS,
  memberRouteResponse,
  memberRouteResult,
  sessionKind,
  type MemberPath,
} from './member-route.js'

const STAFF = 'ankanu_session=staff'
const MAHRAM = 'ankanu_session=mahram'

function bodyText(response: Response): Promise<string> {
  return response.text()
}

describe('member routes', () => {
  it('reads only the session kind', () => {
    expect(sessionKind(null)).toBeNull()
    expect(sessionKind('other=1')).toBeNull()
    expect(sessionKind('ankanu_session=staff')).toBe('staff')
    expect(sessionKind('theme=sand; ankanu_session=web')).toBe('web')
    expect(sessionKind('ankanu_session=capacitor')).toBe('capacitor')
    expect(sessionKind('ankanu_session=nope')).toBeNull()
    expect(sessionKind('ankanu_session=%')).toBeNull()
    expect(sessionKind('ankanu_session=%20staff')).toBe('staff')
    expect(sessionKind('ankanu_session=web; ankanu_session=staff')).toBe('staff')
  })

  it('refuses a staff cookie on every member path', async () => {
    for (const path of MEMBER_PATHS) {
      const result = memberRouteResult(STAFF, path)
      expect(result.status).toBe(403)
      expect(result.body.error.code).toBe('FORBIDDEN')
      expect(result.body.error.message).toBe("Cette session d'équipe ne peut pas ouvrir un espace membre.")
      expect(result.body.error.details).toBeNull()
      expect(result.body.error.retryable).toBe(false)
      expect(result.body.error.request_id.length).toBeGreaterThan(0)

      const response = memberRouteResponse(STAFF, path)
      expect(response.status).toBe(403)
      expect(response.headers.get('content-type')).toContain('application/json')
      const text = await bodyText(response)
      const parsed = JSON.parse(text) as typeof result.body
      expect(parsed.error.code).toBe('FORBIDDEN')
      expect(parsed.error.message).toBe(result.body.error.message)
      expect(parsed.error.details).toBeNull()
      expect(parsed.error.retryable).toBe(false)
      expect(parsed.error.request_id.length).toBeGreaterThan(0)
      expect(text).not.toContain('dating')
    }
  })

  it('refuses a mahram cookie on browse, invite, and discussion paths', () => {
    for (const path of ['/decouvrir', '/invitations', '/discussions'] as const) {
      const result = memberRouteResult(MAHRAM, path)
      expect(result.status).toBe(403)
      expect(result.body.error.code).toBe('FORBIDDEN')
      expect(result.body.error.message).toBe('Une session mahram ne peut pas ouvrir cet espace.')
    }
  })

  it('serves the envelope from each route handler', async () => {
    const routes = [
      ['/decouvrir', getDecouvrir],
      ['/invitations', getInvitations],
      ['/discussions', getDiscussions],
      ['/profil', getProfil],
    ] as const
    for (const [path, get] of routes) {
      const staff = await get(new Request(`http://localhost${path}`, { headers: { cookie: STAFF } }))
      expect(staff.status).toBe(403)
      expect(staff.headers.get('content-type')).toContain('application/json')
      const body = (await staff.json()) as { error: { code: string } }
      expect(body.error.code).toBe('FORBIDDEN')
    }
    const mahram = await getDecouvrir(new Request('http://localhost/decouvrir', { headers: { cookie: MAHRAM } }))
    expect(mahram.status).toBe(403)
    expect(mahram.headers.get('content-type')).toContain('application/json')
    const web = await getInvitations(new Request('http://localhost/invitations', { headers: { cookie: 'ankanu_session=web' } }))
    expect(web.status).toBe(401)
    expect(web.headers.get('content-type')).toContain('application/json')
  })

  it('does not open a member screen for any other session', () => {
    const cases: Array<{ cookie: string | null; path: MemberPath }> = [
      { cookie: null, path: '/decouvrir' },
      { cookie: 'ankanu_session=web', path: '/invitations' },
      { cookie: 'ankanu_session=capacitor', path: '/discussions' },
      { cookie: MAHRAM, path: '/profil' },
    ]
    for (const item of cases) {
      const result = memberRouteResult(item.cookie, item.path)
      expect(result.status).toBe(401)
      expect(result.body.error.code).toBe('UNAUTHENTICATED')
      expect(result.body.error.message).toBe('Session non authentifiée.')
    }
  })
})

describe('web boundaries', () => {
  it('does not import module domain', () => {
    const files = [
      'app/page.tsx',
      'app/layout.tsx',
      'app/splash/page.tsx',
      'src/landing.tsx',
      'src/splash.tsx',
      'src/member-route.ts',
      'src/chrome.tsx',
      'src/components.tsx',
    ]
    for (const file of files) {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      expect(text).not.toContain('modules/')
      expect(text.toLowerCase()).not.toContain('dating')
      expect(text.toLowerCase()).not.toContain('rencontre romantique')
    }
  })
})
