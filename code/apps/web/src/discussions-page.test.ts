import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GET as getList } from '../app/discussions/route.js'
import { GET as getThread } from '../app/discussions/[id]/route.js'
import {
  CHAT_COPY,
  chatThreadHtml,
  discussionsHtml,
  PHOTO_MAX_BYTES,
  REALTIME_SCRIPT,
  SPLIT_MIN_PX,
  STAGE_LABEL,
  TEXT_MAX,
  VOICE_LANGUAGES,
  VOICE_MAX_BYTES,
  VOICE_MAX_MS,
} from './discussions-page.js'

function stitch(folder: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)), 'utf8')
}

const ID = '01990000-0000-7000-8000-0000000000c1'

/** Copy the product must never show a member on Chat: hold, scan, verification wait (AD-10, DESIGN.md chat-bubble). */
const HOLD_COPY = /En cours de vérification|en vérification|vérification en cours|modération|scan|retenu|en attente de|pending|held/i

/**
 * Stitch lines the product does not do, the quota of Story 5.11, and Stitch sample data. Read receipts (« Lu »,
 * « messages non lus ») left this list with story chat-polish; the Stitch `done_all` ligature stays out (the ticks are
 * inline SVG, so they show without the icon font on 2G). The camera and
 * microphone buttons and the Voice note bubble left this list with Stories 5.3 and 5.4; the Stitch sample title
 * « Note vocale de présentation sobre » stays out.
 */
const DROPPED = [
  'Wali notifié',
  'Accord mutuel validé',
  'Un wali peut lire cette conversation',
  'Demander la levée du flou',
  'Quota du jour',
  'Non lues',
  'Sans réponse',
  'done_all',
  'Note vocale de présentation sobre',
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
    expect(html).toContain(`id="discussions-title" class="font-display text-3xl md:text-4xl text-deep-navy font-normal tracking-tight">${CHAT_COPY.listTitle}</h1>`)
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

  it('AC 5.1-1: no hold badge, no scan wording, no dropped Stitch line', () => {
    // Stories 5.3, 5.4: a Photo or Voice note last message reads « Photo » / « Note vocale », never a URL.
    expect(html).toContain("quote.textContent = (last.mine ? COPY.you + ' : ' : '') + (last.kind === 'photo' ? COPY.photo : COPY.voice)")
    expect(visibleText(html)).not.toMatch(HOLD_COPY)
    expect(Object.values(CHAT_COPY).join(' ')).not.toMatch(HOLD_COPY)
    for (const banned of DROPPED) {
      expect(html, banned).not.toContain(banned)
    }
  })

  it('loads /v1/conversations, links each row to its thread, and refreshes on message.delivered', () => {
    expect(html).toContain("fetch('/v1/conversations', { credentials: 'same-origin' })")
    expect(html).toContain('link.href = "/discussions" + \'/\' + encodeURIComponent(item.id)')
    // A delivered event refreshes the list (story chat-polish: and catches the open thread up).
    expect(html).toContain("'message.delivered': onDelivered")
    expect(html).toContain('function onDelivered(payload) {\n  if (!payload) return\n  // Any conversation: the list shows the new preview, order and unread badge.\n  reloadSoon()')
    expect(html).toContain(REALTIME_SCRIPT)
    // QA F1, F5: the row link is named by its content (no aria-label); an unavailable member gets no link.
    expect(html).not.toContain("link.setAttribute('aria-label'")
    expect(html).toContain("if (!other.available) {")
    // QA D2: on phones the city has its own line and no « · » (from 768 px the split-view row hides the city).
    expect(html).toContain('.conv-city { width: 100%; display: inline-flex;')
    expect(html).toContain("line.appendChild(make('span', 'chat-city conv-city', city))")
    expect(html).not.toContain("'·'")
    // API text goes through textContent, never innerHTML.
    expect(html).not.toMatch(/\.innerHTML\s*=/)
  })
})

describe('screen 21 Chat thread (Stories 5.1, 5.2)', () => {
  const html = chatThreadHtml(stitch('21-chat-thread'), ID)

  it('renders the thread shell with the back link, a log region, the labelled composer and the golden rule', () => {
    expect(html).toContain('<title>AnKanu • Discussion</title>')
    expect(html).toContain(`<div id="chat-thread" data-conversation-id="${ID}"`)
    expect(html).toContain(`<main id="chat-app" data-view="thread" data-conversation-id="${ID}"`)
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

  it('Stories 8.5, 8.6: the header links « Signaler / Bloquer » and each of their bubbles « Signaler ce message » to screen 23', () => {
    expect(html).toContain(`<span>${CHAT_COPY.reportBlock}</span></a>`)
    expect(html).toContain('id="thread-report" hidden href="/signaler"')
    expect(html).toContain('report.href = "/signaler" + \'/\' + encodeURIComponent(conversation.other_id) + \'?discussion=\' + encodeURIComponent(ID)')
    expect(html).toContain("'&message=' + encodeURIComponent(item.id)")
    // Only the other member's messages can be reported; the link is named by its content, 44 px square.
    expect(html).toContain('if (!mine && conversation && conversation.other_id) {')
    expect(html).toContain("flag.appendChild(make('span', 'chat-sr', COPY.reportMessage))")
    expect(html).toContain('w-[44px] h-[44px]')
    expect(CHAT_COPY.reportMessage).toBe('Signaler ce message')
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
    expect(html).toContain("function draftKey(id) { return 'ankanu_chat_draft:' + id }")
    expect(html).toContain(`<a id="thread-signin" hidden href="/auth"`)
    expect(html).not.toMatch(/\.innerHTML\s*=/)
  })

  it('QA F2: Retour, Signaler / Bloquer, Signaler ce message and Envoyer carry a 44 x 44 hit area that holds without the CDN', () => {
    expect(html).toContain('#chat-thread .chat-hit:not([hidden]) { display: inline-flex; align-items: center; min-width: 44px; min-height: 44px; }')
    expect(html).toContain('<a id="thread-back" href="/discussions" class="chat-hit ')
    expect(html).toContain('<a id="thread-report" hidden href="/signaler" class="chat-hit ')
    expect(html).toContain('<button id="thread-send" type="submit" class="chat-hit ')
    expect(html).toContain("var flag = make('a', 'chat-hit ")
  })

  it('Stories 5.3, 5.4: the Stitch camera and microphone buttons open the Photo picker and the recorder; no GIF picker', () => {
    expect(html).toContain(`id="thread-photo" type="button" title="${CHAT_COPY.photoButton}"`)
    expect(html).toContain(`aria-hidden="true">photo_camera</span><span class="chat-sr">${CHAT_COPY.photoButton}</span></button>`)
    expect(html).toContain(`id="thread-voice" type="button" title="${CHAT_COPY.voiceButton}"`)
    expect(html).toContain(`aria-hidden="true">mic</span><span class="chat-sr">${CHAT_COPY.voiceButton}</span></button>`)
    expect(html).toContain('w-11 h-11')
    expect(html).toContain('<input id="thread-photo-input" type="file" accept="image/*" hidden/>')
    expect(CHAT_COPY.photoButton).toBe('Joindre une photo sobre')
    expect(CHAT_COPY.voiceButton).toBe('Enregistrer une note vocale sobre')
    // A closed or unavailable thread disables both buttons with the composer.
    expect(html).toContain('photoButton.disabled = input.disabled')
    expect(html).toContain('voiceButton.disabled = input.disabled')
    expect(html).not.toMatch(/\bgif\b|giphy|tenor/i)
  })

  it('Story 5.3: the Photo is re-encoded in the browser (1600 px, JPEG, 2 Mo at most) and posted as kind photo', () => {
    expect(html).toContain('var attempts = [[1600, 0.82], [1280, 0.7], [960, 0.6]]')
    expect(html).toContain("}, 'image/jpeg', attempts[index][1])")
    expect(html).toContain(`if (blob.size > ${PHOTO_MAX_BYTES}) { reject(new Error('heavy')); return }`)
    expect(html).toContain("postMedia({ kind: 'photo', image: image }, COPY.photoSent, sendPhoto)")
    expect(PHOTO_MAX_BYTES).toBe(2_097_152)
  })

  it('Story 5.3: a Photo bubble shows the server blur at once and loads the clear image from a fresh signed URL (on tap in Lite)', () => {
    expect(html).toContain('preview.src = media.blur_url')
    expect(html).toContain("'/messages/' + encodeURIComponent(item.id) + '/media'")
    expect(html).toContain('if (mediaCache[item.id] || !liteEnabled()) setTimeout(function () { reveal(true) }, 0)')
    expect(html).toContain('show.appendChild(make(\'span\', \'\', COPY.photoShow))')
    // No signed URL is ever taken from a realtime event: the event handler only catches up over HTTP.
    expect(html).toContain('function onDelivered(payload) {')
  })

  it('Story 5.4: the recorder caps the note at 2 minutes and 1 Mo, asks for a language, and posts kind voice; playback is on tap only', () => {
    expect(html).toContain("navigator.mediaDevices.getUserMedia({ audio: true })")
    expect(html).toContain(`if (elapsed >= ${VOICE_MAX_MS} && recorder && recorder.state === 'recording') {`)
    expect(html).toContain(`if (blob.size > ${VOICE_MAX_BYTES}) { closePanel(); mediaError(COPY.voiceTooHeavy)`)
    expect(html).toContain("postMedia({ kind: 'voice', audio: audio, duration_ms:")
    expect(VOICE_LANGUAGES.map((item) => item.label)).toEqual(['Français', 'Mooré', 'Dioula'])
    // No autoplay: the audio element is created on the first tap with preload none; no transcript anywhere.
    expect(html).toContain("audio.preload = 'none'")
    expect(html).not.toMatch(/autoplay/i)
    expect(Object.values(CHAT_COPY).join(' ')).not.toMatch(/transcri/i)
    expect(VOICE_MAX_MS).toBe(120_000)
  })

  it('refuses to build a page for an id that is not a UUID', () => {
    expect(() => chatThreadHtml(stitch('21-chat-thread'), '"><script>alert(1)</script>')).toThrow()
  })
})

describe('story chat-polish: one page for both routes, split view, read receipts, Photo viewer', () => {
  const list = discussionsHtml(stitch('20-discussions-list'))
  const thread = chatThreadHtml(stitch('21-chat-thread'), ID)
  /** The page's own script (the pin guard and the shell come with their own). */
  const script = /<script>(var COPY = [\s\S]*?)<\/script>/.exec(list)?.[1] ?? ''

  it('AC 12: both routes serve the list and the thread; the split view starts at 768 px', () => {
    expect(SPLIT_MIN_PX).toBe(768)
    for (const html of [list, thread]) {
      expect(html).toContain('<section id="discussions" aria-labelledby="discussions-title"')
      expect(html).toContain('<div id="chat-thread" data-conversation-id=')
      expect(html).toContain('@media (min-width: 768px) {')
      expect(html).toContain("window.matchMedia('(min-width: 768px)')")
      expect(html).toContain(CHAT_COPY.pickThread)
      expect(html.match(/<main\b/g)).toHaveLength(1)
    }
    expect(list).toContain('<main id="chat-app" data-view="list" data-conversation-id=""')
    expect(list).toContain(`<h1 id="discussions-title"`)
    // On the thread route the thread's name is the h1; the script steps the list title down in split view only.
    expect(thread).toContain(`<h2 id="discussions-title"`)
    expect(thread).toContain("var want = isSplit() && ID ? 'H2' : 'H1'")
  })

  it('AC 15: moving between threads uses pushState and popstate, never a reload, and drops answers for an old thread', () => {
    expect(list).toContain("history.pushState({ chat: id }, '', \"/discussions\" + '/' + id)")
    expect(list).toContain("window.addEventListener('popstate', function () { routeFromLocation() })")
    expect(list).toContain('openThread(link.getAttribute(\'data-conversation-id\'), true)')
    expect(list).toContain('if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return')
    expect(list).toContain('if (started !== gen) return false')
    expect(list).toContain('if (ID) drafts[ID] = input.value')
    expect(list).toContain('closePanel()\n  if (playing)')
    expect(script).toContain('function openThread(id, push) {')
    expect(script).not.toMatch(/location\.(reload|assign|replace)\(|location\.href\s*=/)
  })

  it('AC 6 / 8: my bubbles carry one tick « Envoyé » or two ticks « Lu » (shape and text, not colour alone), updated from conversation.read', () => {
    expect(CHAT_COPY.receiptSent).toBe('Envoyé')
    expect(CHAT_COPY.receiptRead).toBe('Lu')
    expect(list).toContain("box.appendChild(svgIcon(read ? ['M1 6.5 4.5 10 11.5 2', 'M7.5 9.5 8 10 15 2'] : ['M3 6.5 6.5 10 13.5 2'], 18, 12))")
    expect(list).toContain("box.appendChild(make('span', 'chat-sr', read ? COPY.receiptRead : COPY.receiptSent))")
    expect(list).toContain("if (mine) meta.appendChild(receipt(isRead(item), 'chat-receipt'))")
    expect(list).toContain("'conversation.read': onRead")
    expect(list).toContain('readOther = payload.message_id\n    refreshReceipts()')
  })

  it('AC 7: the page marks read only when visible and at the latest message, with the latest message id', () => {
    expect(list).toContain("if (document.visibilityState === 'hidden') return\n  if (!nearBottom()) return")
    expect(list).toContain("fetch('/v1/conversations/' + encodeURIComponent(conversationId) + '/read', {")
    expect(list).toContain('body: JSON.stringify({ message_id: latest.id })')
  })

  it('AC 13 / 14: rows show an unread badge (99+ cap, screen-reader count) and ticks for my last message; refreshes are debounced', () => {
    expect(CHAT_COPY.unreadOne).toBe('1 message non lu')
    expect(CHAT_COPY.unreadMany).toBe('{n} messages non lus')
    expect(list).toContain("var count = make('span', '', unread > 99 ? '99+' : String(unread))")
    expect(list).toContain("badge.appendChild(make('span', 'chat-sr', unreadText(unread)))")
    expect(list).toContain("if (last && last.mine && other.available && (last.read === true || last.read === false)) previewLine.appendChild(receipt(last.read, 'conversation-receipt'))")
    expect(list).toContain('reloadTimer = setTimeout(function () { reloadTimer = null; loadList() }, 300)')
    expect(list).toContain('if (!listVisible()) return')
  })

  it('AC 1 / 2 / 3: a revealed Photo opens an accessible full-screen viewer with the copy already downloaded', () => {
    expect(list).toContain('<div id="photo-viewer" hidden role="dialog" aria-modal="true" aria-labelledby="photo-viewer-title"')
    expect(list).toContain(`<span class="chat-sr">${CHAT_COPY.photoClose}</span></button>`)
    expect(list).toContain("open.addEventListener('click', function (event) { event.preventDefault(); openViewer(url, name, open) })")
    expect(list).toContain("if (event.key === 'Escape' || event.key === 'Esc') { event.preventDefault(); closeViewer(); return }")
    expect(list).toContain("if (event.key === 'Tab') { event.preventDefault(); el('photo-viewer-close').focus() }")
    expect(list).toContain('if (opener && document.body.contains(opener)) opener.focus()')
    // The viewer only exists after the reveal, so Lite mode still waits for « Afficher la photo ».
    expect(list).toContain('if (mediaCache[item.id] || !liteEnabled()) setTimeout(function () { reveal(true) }, 0)')
    expect(script).not.toMatch(/original/)
  })

  it('AC 4 / 5: the thread opens at the latest message and only follows new ones while pinned; « Nouveaux messages » otherwise', () => {
    expect(list).toContain('settleAtEnd()\n    markSeen()')
    expect(list).toContain("if (mineAdded || follow) { scrollToEnd(); markSeen() }\n  else if (theirsAdded) show('thread-jump', true)")
    expect(list).toContain(`<span>${CHAT_COPY.newMessages}</span></button>`)
    expect(list).toContain('#thread-form { scroll-margin-bottom:')
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
