import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { REPORT_REASONS } from '@ankanu/kernel'
import { describe, expect, it } from 'vitest'
import { GET } from '../app/signaler/[id]/route.js'
import { isReportPath } from './entry-guard.js'
import { REPORT_COPY, reportBlockHtml, reportContext } from './report-block-page.js'

function stitch(): string {
  return readFileSync(fileURLToPath(new URL('../../../design-stitch/ankanu-v2/23-report-block/screen.html', import.meta.url)), 'utf8')
}

const MEMBER = '01990000-0000-7000-8000-0000000000a1'
const CONVERSATION = '01990000-0000-7000-8000-0000000000c1'
const MESSAGE = '01990000-0000-7000-8000-0000000000d1'

function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}

describe('screen 23 Report / Block (Stories 8.5, 8.6)', () => {
  const html = reportBlockHtml(stitch(), { targetId: MEMBER, conversationId: null, messageId: null })

  it('renders the Stitch header, intro and actions inside the shared member shell', () => {
    expect(html).toContain('<title>AnKanu • Signaler ou bloquer</title>')
    expect(html).toContain(`>${REPORT_COPY.title}</h1>`)
    expect(html).toContain('Sécurité &amp; bienséance')
    expect(html).toContain(REPORT_COPY.intro)
    expect(html).toContain(`<span>${REPORT_COPY.backProfile}</span>`)
    expect(html).toContain(`href="/profil/${MEMBER}"`)
    expect(html).toContain(REPORT_COPY.cancelProfile)
    expect(html).toContain(`<span>${REPORT_COPY.submit}</span>`)
    expect(html).toContain(REPORT_COPY.detailsLabel)
    expect(html).toContain(`placeholder="${REPORT_COPY.detailsPlaceholder}"`)
    expect(html).toContain('maxlength="1000"')
    expect(html).toContain('data-nav-item="decouvrir" aria-current="page"')
    // Story chat-polish: app screens have no site header or footer, only the bottom nav.
    expect(html).not.toContain('id="app-header"')
    expect(html.match(/id="app-bottom-nav"/g)).toHaveLength(1)
    expect(html.indexOf('ankanu_pin_hidden_at')).toBeGreaterThan(-1)
  })

  it('AC 4.4-3 / 8.5: the nine reasons come from the one shared list, in Stitch order, with none preselected', () => {
    const values = [...html.matchAll(/name="report_reason" type="radio" value="([a-z_]+)"/g)].map((match) => match[1])
    expect(values).toEqual(REPORT_REASONS.map((item) => item.code))
    for (const item of REPORT_REASONS) {
      expect(visibleText(html)).toContain(item.label)
    }
    expect(visibleText(html)).toContain('Dissimulation ou fausse déclaration de situation matrimoniale')
    expect(html).not.toMatch(/<input checked[^>]*name="report_reason"/)
    expect(html).toContain('<fieldset id="report-reasons"')
    expect(html).toContain(`${REPORT_COPY.reasonLegend} <span`)
    expect(html).toContain('min-h-[48px]')
  })

  it('AC 8.6: « Bloquer également ce profil » is on by default, and « Bloquer sans signaler » blocks without a Report', () => {
    expect(html).toContain('<input id="report-block-toggle" checked type="checkbox" aria-describedby="report-block-explain"')
    expect(html).toContain(`<label class="font-semibold text-deep-navy cursor-pointer" for="report-block-toggle">${REPORT_COPY.blockAlso}</label>`)
    expect(html).toContain(REPORT_COPY.blockExplain)
    expect(html).toContain(`<h2 class="font-semibold text-deep-navy">${REPORT_COPY.blockOnlyTitle}</h2>`)
    expect(html).toContain(`<span>${REPORT_COPY.blockOnly}</span>`)
    expect(html).toContain("fetch('/v1/blocks'")
    expect(html).toContain('JSON.stringify({ blocked_id: TARGET })')
  })

  it('posts a Profile Report, or a message Report with the message id, and shows the sent state with the SLA hours', () => {
    expect(html).toContain("fetch('/v1/reports'")
    expect(html).toContain("{ target_kind: 'message', target_id: MESSAGE, reason: reason, block: block }")
    expect(html).toContain("{ target_kind: 'profile', target_id: TARGET, reason: reason, block: block }")
    expect(html).toContain("COPY.sentBody.replace('{n}', String(hours))")
    expect(REPORT_COPY.sentBody).toBe("Un membre de l'équipe de modération l'examinera dans les {n} heures.")
    expect(html).toContain('<div id="report-done-body" role="status"')
    expect(html).toContain('id="report-done-title" tabindex="-1"')
    expect(html).toContain('<p id="report-reason-error" role="alert" hidden')
    expect(html).toContain('<p id="report-error" role="alert" hidden')
    // API text goes through textContent, never innerHTML.
    expect(html).not.toMatch(/\.innerHTML\s*=/)
  })

  it('does not ship the screenshot upload or the Stitch sample member', () => {
    expect(html).not.toContain("Pièce justificative")
    expect(html).not.toContain('type="file"')
    expect(html).not.toContain('Al-Hassan_BF')
    expect(html).not.toContain('href="#"')
  })

  it('from a Chat thread: back to the thread, Discussions active, and the message note', () => {
    const chat = reportBlockHtml(stitch(), { targetId: MEMBER, conversationId: CONVERSATION, messageId: MESSAGE })
    expect(chat).toContain(`data-conversation-id="${CONVERSATION}" data-message-id="${MESSAGE}"`)
    expect(chat).toContain(`href="/discussions/${CONVERSATION}"`)
    expect(chat).toContain(REPORT_COPY.backChat)
    expect(chat).toContain(REPORT_COPY.cancelChat)
    expect(chat).toContain(REPORT_COPY.messageConcerned)
    expect(chat).toContain('data-nav-item="discussions" aria-current="page"')
    expect(chat).toContain("'/v1/conversations/' + encodeURIComponent(CONVERSATION)")
    expect(chat).toContain('conversation.other_id !== TARGET')
  })

  it('reads only UUID query values, and a message only with its conversation', () => {
    expect(reportContext(MEMBER, new URLSearchParams(`discussion=${CONVERSATION}&message=${MESSAGE}`))).toEqual({
      targetId: MEMBER,
      conversationId: CONVERSATION,
      messageId: MESSAGE,
    })
    expect(reportContext(MEMBER, new URLSearchParams(`message=${MESSAGE}`))).toEqual({ targetId: MEMBER, conversationId: null, messageId: null })
    expect(reportContext(MEMBER, new URLSearchParams('discussion="><script>'))).toEqual({ targetId: MEMBER, conversationId: null, messageId: null })
    expect(() => reportBlockHtml(stitch(), { targetId: '"><script>', conversationId: null, messageId: null })).toThrow()
    expect(() => reportBlockHtml(stitch(), { targetId: MEMBER, conversationId: null, messageId: MESSAGE })).toThrow()
  })
})

describe('Report / Block route', () => {
  function request(path: string, cookie?: string): Request {
    return new Request(`http://localhost${path}`, { headers: cookie ? { cookie: `ankanu_session=${cookie}` } : {} })
  }
  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  it('is an account page: signed out goes to sign-in, a malformed id to Discover, staff and mahram stubs are refused', async () => {
    expect(isReportPath(`/signaler/${MEMBER}`)).toBe(true)
    const page = await GET(request(`/signaler/${MEMBER}?discussion=${CONVERSATION}`, 'web'), params(MEMBER))
    expect(page.status).toBe(200)
    expect(page.headers.get('cache-control')).toBe('no-store')
    expect(await page.text()).toContain(`data-conversation-id="${CONVERSATION}"`)
    const bad = await GET(request('/signaler/not-a-uuid', 'web'), params('not-a-uuid'))
    expect(bad.status).toBe(303)
    expect(bad.headers.get('location')).toBe('http://localhost/decouvrir')
    const anon = await GET(request(`/signaler/${MEMBER}`), params(MEMBER))
    expect(anon.status).toBe(303)
    expect(anon.headers.get('location')).toBe('http://localhost/auth')
    for (const cookie of ['staff', 'mahram']) {
      const refused = await GET(request(`/signaler/${MEMBER}`, cookie), params(MEMBER))
      expect(refused.status).toBe(403)
    }
  })
})
