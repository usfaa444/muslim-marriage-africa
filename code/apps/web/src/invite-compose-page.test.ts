import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/invitations/envoyer/[id]/route.js'
import { entryLocation, isInviteComposePath } from './entry-guard.js'
import { INVITE_COPY, inviteComposeHtml, isInviteTargetId } from './invite-compose-page.js'
import { profileDetailHtml, type ProfileDetailView } from './profile-detail.js'

const TARGET = '01990000-0000-7000-8000-000000000099'

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

function open(id: string, cookie?: string): Promise<Response> {
  const headers: Record<string, string> = cookie ? { cookie: `ankanu_session=${cookie}` } : {}
  return GET(new Request(`http://localhost/invitations/envoyer/${id}`, { headers }), {
    params: Promise.resolve({ id }),
  })
}

describe('screen 18 Invite compose (Stories 4.1, 4.2)', () => {
  const html = inviteComposeHtml(stitch('18-invite-compose-flash'), TARGET)

  it('renders the compose shell for one recipient without the Stitch samples or the Story 4.3 Flash composer', () => {
    expect(html).toContain(`data-invite-target="${TARGET}"`)
    expect(html).toContain("<title>AnKanu • Invitation Ta'aruf</title>")
    expect(html).toContain("Transmettre une invitation Ta'aruf")
    expect(html).toContain(INVITE_COPY.subtitle)
    expect(html).toContain(`href="/profil/${TARGET}"`)
    expect(html).toContain('href="/profile-edit"')
    expect(html).toContain('id="invite-send" disabled aria-disabled="true"')
    expect(html).toContain('id="invite-status" role="status" aria-live="polite"')
    expect(html).toContain('id="invite-quota-wall" hidden role="alert"')
    expect(html).toContain(INVITE_COPY.wallTitle)
    expect(html).toContain(INVITE_COPY.photoMissingBody)
    expect(html).toContain(INVITE_COPY.pack)
    expect(html).toContain(INVITE_COPY.wallPremium)
    expect(html).toContain('href="/premium"')
    expect(html.match(/href="\/premium"/g)).toHaveLength(1)
    expect(html).not.toMatch(/pack de|achet|acheter|recharge/i)
    expect(html).not.toContain('Al-Hassan_BF')
    expect(html).not.toContain('flash-message')
    expect(html).not.toContain('Message Flash')
    expect(html).not.toContain('Thématiques')
    expect(html).not.toContain('Aucune intelligence artificielle')
    expect(html).not.toContain('href="#"')
    expect(html).not.toContain('char-count')
  })

  it('loads the recipient and the live quota, then posts one Invite with a guard against double submit', () => {
    expect(html).toContain("fetch('/v1/profiles/' + encodeURIComponent(target)")
    expect(html).toContain("fetch('/v1/invites/quota'")
    expect(html).toContain("fetch('/v1/invites', {")
    expect(html).toContain('JSON.stringify({ to_id: target })')
    expect(html).toContain('if (sending || done || !target) return')
    expect(html).toContain("result.status === 429 && code === 'QUOTA_EXCEEDED'")
    expect(html).toContain("details.reason === 'photo_required'")
    expect(html).toContain("timeZone: 'Africa/Ouagadougou'")
    expect(html).toContain('Invitations illimitées.')
    expect(html).toContain('Invitations illimitées (Premium).')
    expect(html).toContain("Invitations restantes aujourd'hui : ")
    expect(html.indexOf('ankanu_pin_hidden_at')).toBeGreaterThan(-1)
  })

  it('only accepts a UUID-shaped recipient id', () => {
    expect(isInviteTargetId(TARGET)).toBe(true)
    expect(isInviteTargetId('abc')).toBe(false)
    expect(isInviteTargetId(`${TARGET}"><script>`)).toBe(false)
  })

  it('guards the route: signed out to /auth, staff and mahram refused, a bad id back to Discover, a member gets the page', async () => {
    expect(isInviteComposePath(`/invitations/envoyer/${TARGET}`)).toBe(true)
    expect(entryLocation(`/invitations/envoyer/${TARGET}`, 'anon')).toBe('/auth')
    expect(entryLocation(`/invitations/envoyer/${TARGET}`, 'account')).toBeNull()
    expect(entryLocation(`/invitations/envoyer/${TARGET}`, 'phone')).toBe('/phone')

    const anon = await open(TARGET)
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://localhost/auth')

    const staff = await open(TARGET, 'staff')
    expect(staff.status).toBe(403)
    const mahram = await open(TARGET, 'mahram')
    expect(mahram.status).toBe(403)

    const bad = await open('not-an-id', 'web')
    expect(bad.status).toBe(303)
    expect(bad.headers.get('location')).toBe('http://localhost/decouvrir')

    const member = await open(TARGET, 'web')
    expect(member.status).toBe(200)
    expect(member.headers.get('cache-control')).toBe('no-store')
    expect(await member.text()).toContain(`data-invite-target="${TARGET}"`)
  })

  it('turns the profile detail Invite button into a link to the compose screen', () => {
    const view: ProfileDetailView = {
      profile: {
        id: TARGET,
        pseudonym: 'Aminata_BF',
        age: 36,
        city: 'bobo',
        country: 'BF',
        profession: 'enseignement',
        marital_status: 'single',
        polygamy_intent: 'no',
        madhhab: 'shafii',
        practice: 'heure',
        life_plans: null,
      },
      verification: { phone: true, id: false, mahram: false },
      photo_blur: true,
      photos: [],
    }
    const detail = profileDetailHtml(stitch('15-profile-detail'), view)
    expect(detail).toContain(`data-invite-link class="w-full sm:w-auto flex-1 min-h-[44px]`)
    expect(detail).toContain(`href="/invitations/envoyer/${TARGET}"`)
    expect(detail).not.toMatch(/<button[^>]*>\s*<span[^>]*>send<\/span>/)
  })
})
