import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/invitations/route.js'
import { INVITE_COPY, inviteComposeHtml } from './invite-compose-page.js'
import { CHAT_PATH, INBOX_COPY, inviteInboxHtml, MARITAL_LABEL, POLYGAMY_LABEL } from './invite-inbox-page.js'

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

function open(cookie?: string): Promise<Response> {
  const headers: Record<string, string> = cookie ? { cookie: `ankanu_session=${cookie}` } : {}
  return GET(new Request('http://localhost/invitations', { headers }))
}

describe('screen 19 Invite inbox (Stories 4.4, 4.5)', () => {
  const html = inviteInboxHtml(stitch('19-invite-inbox'))

  it('renders the three tabs inside the shared shell, without the Stitch sample rows or dishonest lines', () => {
    expect(html).toContain("<title>AnKanu • Invitations Ta'aruf</title>")
    expect(html).toContain(`>${INBOX_COPY.title}</h1>`)
    expect(html).toContain(INBOX_COPY.eyebrow)
    // Stitch 19 sets the eyebrow in gold; #7D5F27 is the project's gold that passes AA on cream (soft gold #C9A86C does not).
    expect(html).toContain(`text-[#7D5F27] uppercase">${INBOX_COPY.eyebrow}</p>`)
    expect(html).toContain('role="tablist"')
    for (const [name, label] of [
      ['recues', 'Reçues'],
      ['envoyees', 'Envoyées'],
      ['acceptees', 'Acceptées'],
    ] as const) {
      expect(html).toContain(`role="tab" id="tab-${name}" aria-controls="panel-${name}"`)
      expect(html).toContain(`role="tabpanel" id="panel-${name}" aria-labelledby="tab-${name}"`)
      expect(html).toContain(`<span>${label}</span>`)
    }
    expect(html).toContain('data-nav-item="invitations" aria-current="page"')
    expect(html.match(/id="app-header"/g)).toHaveLength(1)
    expect(html.match(/id="app-footer"/g)).toHaveLength(1)
    expect(html.match(/id="app-bottom-nav"/g)).toHaveLength(1)
    expect(html).toContain('id="inbox-status" role="status" aria-live="polite"')
    expect(html).toContain(INBOX_COPY.emptyTitle)
    expect(html).toContain(INBOX_COPY.emptyBody)
    // Stitch samples and lines the product does not do, or that read as a receipt or guilt copy.
    for (const banned of [
      'Al-Hassan_BF',
      'Mariam_K',
      'Aïssata_B',
      'unsplash',
      "Mot d'introduction",
      'Examen en cours',
      'Processus clôturé',
      'Accord formel du Wali',
      'Référent informé',
      'switchTab',
      'href="#"',
    ]) {
      expect(html, banned).not.toContain(banned)
    }
  })

  it('shows marital status and polygamy intent on received rows, and decline is the quiet button', () => {
    expect(INBOX_COPY.marital).toBe('Situation matrimoniale')
    expect(INBOX_COPY.polygamy).toBe('Déclaration de polygamie')
    expect(MARITAL_LABEL).toEqual({ single: 'Célibataire', married: 'Marié(e)', divorced: 'Divorcé(e)', widowed: 'Veuf(ve)' })
    expect(POLYGAMY_LABEL).toEqual({ no: 'Projet monogame', yes: 'Ouvert à la polygamie' })
    expect(html).toContain('facts.appendChild(fact(COPY.marital')
    expect(html).toContain('facts.appendChild(fact(COPY.polygamy')
    expect(html).toContain("decline.setAttribute('data-variant', 'button-quiet')")
    expect(html).toContain('"decline":"Refuser discrètement"')
    expect(html).toContain('"accept":"Accepter la démarche"')
    // Received rows are the pending ones only: a declined invite never comes back to her with a question.
    expect(html).toContain("data.received.filter(function (item) { return item.state === 'pending' })")
  })

  it('loads the three boxes, posts accept or decline once per row, and links accepted rows to the discussions', () => {
    expect(html).toContain("fetch('/v1/invites?box=' + box")
    expect(html).toContain("['received', 'sent', 'accepted']")
    expect(html).toContain("fetch('/v1/invites/' + encodeURIComponent(item.id) + '/' + action, { method: 'POST'")
    expect(html).toContain('if (busy[item.id]) return')
    expect(html).toContain('setButtons(buttons, false)')
    expect(CHAT_PATH).toBe('/discussions')
    expect(html).toContain("timeZone: 'Africa/Ouagadougou'")
    expect(html.indexOf('ankanu_pin_hidden_at')).toBeGreaterThan(-1)
    // Text from the API goes through textContent, never innerHTML.
    expect(html).not.toMatch(/\.innerHTML\s*=/)
  })

  it('keeps sent rows to a date and a state: no read receipt, timer or guilt line', () => {
    expect(INBOX_COPY.pending).toBe('En attente')
    expect(INBOX_COPY.acceptedPill).toBe('Acceptée')
    expect(INBOX_COPY.declined).toBe('Déclinée')
    expect(html).toContain("'Envoyée le ' + dateText(item.created_at)")
    // The « • » before the city or date is grouped with that text, never left alone at a line end.
    expect(html).toContain('inbox-sep-group inline-flex items-center gap-x-2 whitespace-nowrap')
    expect(html).not.toContain("' • '")
    expect(html).not.toMatch(/\b(lu|vue|consultée) (le|à)\b/i)
    expect(html).not.toMatch(/read_at|seen_at|decided_at|sister_accepted_at/)
  })

  it('guards the route: signed out to /auth, staff and mahram refused, a member gets the page', async () => {
    const anon = await open()
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://localhost/auth')
    for (const kind of ['staff', 'mahram']) {
      const refused = await open(kind)
      expect(refused.status).toBe(403)
      expect(refused.headers.get('content-type')).toContain('application/json')
    }
    for (const kind of ['web', 'capacitor']) {
      const page = await open(kind)
      expect(page.status).toBe(200)
      expect(page.headers.get('cache-control')).toBe('no-store')
      expect(await page.text()).toContain('id="invite-inbox"')
    }
  })
})

describe('Invite compose answers the two new refusals (Story 4.5)', () => {
  const html = inviteComposeHtml(stitch('18-invite-compose-flash'), '01990000-0000-7000-8000-000000000099')

  it('keeps the send closed after a decline, and points to the inbox when she already invited him', () => {
    expect(html).toContain("result.status === 403 && details.reason === 'invite_declined'")
    expect(html).toContain("result.status === 409 && details.reason === 'invite_received'")
    expect(html).toContain(`<a id="invite-inbox-link" hidden`)
    expect(html).toContain(`href="/invitations">${INVITE_COPY.inboxLink}</a>`)
  })
})
