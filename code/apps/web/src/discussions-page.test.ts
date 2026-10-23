import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET as getList } from '../app/discussions/route.js'
import { GET as getThread } from '../app/discussions/[id]/route.js'
import { CHAT_COPY, chatThreadHtml, discussionsHtml, REALTIME_SCRIPT, STAGE_LABEL, TEXT_MAX } from './discussions-page.js'

function stitch(folder: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)), 'utf8')
}

const ID = '01990000-0000-7000-8000-0000000000c1'

/** Copy the product must never show a member on Chat: hold, scan, verification wait (AD-10, DESIGN.md chat-bubble). */
const HOLD_COPY = /En cours de vérification|en vérification|vérification en cours|modération|scan|retenu|en attente de|pending|held/i

/** Stitch lines the product does not do, read receipts, the quota of Story 5.11, and Stitch sample data. */
const DROPPED = [
  'Wali notifié',
  'Accord mutuel validé',
  'Un wali peut lire cette conversation',
  'Demander la levée du flou',
  'Signaler / Bloquer',
  'Quota du jour',
  'Non lues',
  'Sans réponse',
  'non lu',
  'done_all',
  'photo_camera',
  'Joindre une photo',
  'note vocale',
  'sécurisés sur AnKanu',
  'Al-Hassan_BF',
  'Ibrahim_S',
  'Oumar_K',
  'unsplash',
  'googleusercontent',
  'href="#"',
]

function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}

describe('screen 20 Discussions list (Stories 5.1, 5.2)', () => {
  const html = discussionsHtml(stitch('20-discussions-list'))

  it('renders the list inside the shared shell with the Stitch eyebrow, title and footer note', () => {
    expect(html).toContain("<title>AnKanu • Discussions Ta'aruf</title>")
    expect(html).toContain(`>${CHAT_COPY.listTitle}</h1>`)
    expect(html).toContain('Échanges concertés &amp; bienséance')
    expect(html).toContain('text-[#7D5F27] uppercase')
    expect(html).toContain(CHAT_COPY.pendingNote)
    expect(html).toContain('Registre des échanges : 0 fils actifs')
    expect(html).toContain('data-nav-item="discussions" aria-current="page"')
    expect(html.match(/id="app-header"/g)).toHaveLength(1)
    expect(html.match(/id="app-footer"/g)).toHaveLength(1)
    expect(html.match(/id="app-bottom-nav"/g)).toHaveLength(1)
    expect(html).toContain(CHAT_COPY.emptyTitle)
    expect(html).toContain('href="/invitations"')
    expect(html.indexOf('ankanu_pin_hidden_at')).toBeGreaterThan(-1)
  })

  it('AC 5.1-1: no hold badge, no scan wording, no read receipt, no dropped Stitch line', () => {
    expect(visibleText(html)).not.toMatch(HOLD_COPY)
    expect(Object.values(CHAT_COPY).join(' ')).not.toMatch(HOLD_COPY)
    for (const banned of DROPPED) {
      expect(html, banned).not.toContain(banned)
    }
  })

  it('loads /v1/conversations, links each row to its thread, and refreshes on message.delivered', () => {
    expect(html).toContain("fetch('/v1/conversations', { credentials: 'same-origin' })")
    expect(html).toContain('link.href = "/discussions" + \'/\' + encodeURIComponent(item.id)')
    expect(html).toContain("'message.delivered': reloadSoon")
    expect(html).toContain(REALTIME_SCRIPT)
    // QA F1, F5: the row link is named by its content (no aria-label); an unavailable member gets no link.
    expect(html).not.toContain("link.setAttribute('aria-label'")
    expect(html).toContain("if (!other.available) {")
    // API text goes through textContent, never innerHTML.
    expect(html).not.toMatch(/\.innerHTML\s*=/)
  })
})

describe('screen 21 Chat thread (Stories 5.1, 5.2)', () => {
  const html = chatThreadHtml(stitch('21-chat-thread'), ID)

  it('renders the thread shell with the back link, a log region, the labelled composer and the golden rule', () => {
    expect(html).toContain('<title>AnKanu • Discussion</title>')
    expect(html).toContain(`data-conversation-id="${ID}"`)
    expect(html).toContain(`>${CHAT_COPY.back}</span>`)
    expect(html).toContain('href="/discussions"')
    expect(html).toContain('id="thread-messages" role="log" aria-live="polite" aria-label="Messages"')
    expect(html).toContain('id="thread-typing" role="status" aria-live="polite"')
    expect(html).toContain(`<label for="thread-input" class="font-medium text-deep-navy">${CHAT_COPY.composeLabel}</label>`)
    expect(html).toContain(`placeholder="${CHAT_COPY.placeholder}"`)
    expect(html).toContain(`<span>${CHAT_COPY.send}</span>`)
    expect(html).toContain(CHAT_COPY.rule)
    expect(html).toContain('data-nav-item="discussions" aria-current="page"')
    expect(STAGE_LABEL['chat']).toBe('Étape : discussion')
    expect(TEXT_MAX).toBe(2000)
  })

  it('AC 5.1-1 / 5.1-3: the bubble is delivered as soon as it exists; no pending, hold or scan copy anywhere', () => {
    expect(visibleText(html)).not.toMatch(HOLD_COPY)
    for (const banned of DROPPED) {
      expect(html, banned).not.toContain(banned)
    }
    // The meta line under a bubble is the time only (DESIGN.md chat-bubble).
    expect(html).toContain("var time = make('time', '', timeText(item.created_at))")
  })

  it('AC 5.2-1 / 5.1-2: posts kind text once, fetches the text after a delivered event, and shows and emits typing', () => {
    expect(html).toContain("body: JSON.stringify({ kind: 'text', text: text })")
    expect(html).toContain('if (busy || !text || input.disabled) return')
    expect(html).toContain("'?after=' + encodeURIComponent(after)")
    expect(html).toContain("'message.delivered': onDelivered")
    expect(html).toContain("'conversation.typing': onTyping")
    expect(html).toContain("socket.emit('conversation.typing', { conversation_id: ID })")
    expect(html).toContain('if (now - lastEmit < 1500) return')
    expect(html).toContain('typingTimer = setTimeout(hideTyping, 4000)')
    // QA F3, F4: a closed conversation disables the composer; an expired session keeps the draft and offers sign-in.
    expect(html).toContain(`<p id="thread-closed" hidden`)
    expect(html).toContain(CHAT_COPY.closed)
    expect(html).toContain('input.disabled = unavailable || closed')
    expect(html).toContain("var DRAFT_KEY = 'ankanu_chat_draft:' + ID")
    expect(html).toContain(`<a id="thread-signin" hidden href="/auth"`)
    expect(html).not.toMatch(/\.innerHTML\s*=/)
  })

  it('refuses to build a page for an id that is not a UUID', () => {
    expect(() => chatThreadHtml(stitch('21-chat-thread'), '"><script>alert(1)</script>')).toThrow()
  })
})

describe('Discussions routes', () => {
  function request(path: string, cookie?: string): Request {
    return new Request(`http://localhost${path}`, { headers: cookie ? { cookie: `ankanu_session=${cookie}` } : {} })
  }
  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  it('renders both pages for the member dev stub and refuses staff and mahram stubs with JSON', async () => {
    const list = await getList(request('/discussions', 'web'))
    expect(list.status).toBe(200)
    expect(list.headers.get('content-type')).toContain('text/html')
    expect(list.headers.get('cache-control')).toBe('no-store')
    const thread = await getThread(request(`/discussions/${ID}`, 'capacitor'), params(ID))
    expect(thread.status).toBe(200)
    expect(await thread.text()).toContain(`data-conversation-id="${ID}"`)
    for (const cookie of ['staff', 'mahram']) {
      for (const response of [await getList(request('/discussions', cookie)), await getThread(request(`/discussions/${ID}`, cookie), params(ID))]) {
        expect(response.status).toBe(403)
        expect(response.headers.get('content-type')).toContain('application/json')
      }
    }
  })

  it('sends a malformed thread id back to the list, and a signed-out visitor to sign-in', async () => {
    const bad = await getThread(request('/discussions/not-a-uuid', 'web'), params('not-a-uuid'))
    expect(bad.status).toBe(303)
    expect(bad.headers.get('location')).toBe('http://localhost/discussions')
    for (const anon of [await getThread(request(`/discussions/${ID}`), params(ID)), await getList(request('/discussions'))]) {
      expect(anon.status).toBe(303)
      expect(anon.headers.get('location')).toBe('http://localhost/auth')
    }
  })
})
