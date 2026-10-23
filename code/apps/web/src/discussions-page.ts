import { withAppShell } from './app-shell'
import { isInviteTargetId } from './invite-compose-page'
import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

/**
 * Screens 20 (Discussions list) and 21 (Chat thread), Stories 5.1 and 5.2, inside the shared app shell. Both pages
 * load their data in the browser, so the API decides every refusal. Realtime is Socket.IO on `/v1/realtime` (AD-15):
 * events carry ids only and the page fetches the text over HTTP. A page without realtime still loads and sends.
 *
 * Dropped from the Stitch exports because the product does not do them (yet), or because they would be a read
 * receipt, a hold state or a quota this story does not ship: « Wali notifié », « Accord mutuel validé », « Un wali peut
 * lire cette conversation! », « Demander la levée du flou », « Signaler / Bloquer », « Quota du jour », the camera and
 * microphone buttons, the tabs « Non lues » and « Sans réponse », « 1 non lu », « Lu », and the « sécurisés » pill.
 * There is no pending, held or scan wording anywhere (AD-10, DESIGN.md chat-bubble).
 */

export const CHAT_COPY = {
  listEyebrow: 'Échanges concertés & bienséance',
  listTitle: "Discussions Ta'aruf",
  loading: 'Chargement…',
  loadError: 'Chargement impossible. Vérifiez votre connexion et réessayez.',
  retry: 'Réessayer',
  emptyTitle: 'Aucune discussion.',
  emptyBody: "Une discussion s'ouvre quand une invitation Ta'aruf est acceptée.",
  emptyLink: 'Voir mes invitations',
  verified: 'Identité vérifiée',
  open: 'Accéder à la conversation',
  openWithSuffix: 'avec',
  noMessage: "Aucun message pour l'instant.",
  you: 'Vous',
  unavailableName: 'Profil indisponible',
  pendingNote: "Pour les invitations envoyées en attente, le fil de discussion ne s'ouvre qu'après acceptation formelle de la sœur.",
  registryOne: 'Registre des échanges : 1 fil actif',
  registryMany: 'Registre des échanges : {n} fils actifs',
  back: 'Retour aux discussions',
  missing: "Cette discussion n'existe pas.",
  unavailable: "Ce profil n'est plus disponible.",
  closed: 'Cette discussion est fermée.',
  sessionExpired: 'Votre session a expiré. Reconnectez-vous : votre message est gardé pour cette discussion.',
  signInAgain: 'Se reconnecter',
  messagesLabel: 'Messages',
  older: 'Messages précédents',
  threadEmpty: "Aucun message pour l'instant. Commencez la discussion avec bienséance.",
  typing: '{name} écrit…',
  composeLabel: 'Réponse réfléchie et posée',
  placeholder: 'Rédigez votre message dans le respect des convenances...',
  send: 'Envoyer',
  sent: 'Message envoyé',
  sendError: 'Envoi impossible. Vérifiez votre connexion et réessayez.',
  ruleLead: "Règle d'or AnKanu :",
  rule: "Évitez d'échanger vos contacts personnels, gardez toute discussion sur la plateforme AnKanu afin de préserver votre sécurité.",
  today: "Aujourd'hui",
  yesterday: 'Hier',
  at: 'à',
  textUnavailable: 'Message indisponible.',
} as const

export const STAGE_LABEL: Record<string, string> = {
  invite: 'Étape : invitation',
  chat: 'Étape : discussion',
  meeting: 'Étape : rencontre',
  married: 'Étape : mariage',
}

export const TEXT_MAX = 2000
export const COUNTER_FROM = 1800
export const TYPING_EMIT_MS = 1500
export const TYPING_SHOW_MS = 4000
export const REALTIME_SCRIPT = '/v1/realtime/socket.io.min.js'
export const DISCUSSIONS_PATH = '/discussions'

const STYLE = `<style id="chat-style">
#discussions [hidden], #chat-thread [hidden] { display: none !important; }
#discussions, #discussions *, #chat-thread, #chat-thread * { min-width: 0; }
#discussions .chat-name, #chat-thread .chat-name, #chat-thread .chat-text { overflow-wrap: anywhere; }
#chat-thread .chat-text { white-space: pre-wrap; }
#chat-thread button[disabled], #chat-thread textarea[disabled] { opacity: 0.6; cursor: not-allowed; }
#discussions a:focus-visible, #discussions button:focus-visible, #chat-thread a:focus-visible, #chat-thread button:focus-visible, #chat-thread textarea:focus-visible { outline: 2px solid #7D5F27; outline-offset: 2px; }
.chat-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>`

/** Browser helpers shared by both pages. ES5 only, like the other v2 page scripts. */
const COMMON = `var COPY = ${JSON.stringify(CHAT_COPY)}
var STAGE = ${JSON.stringify(STAGE_LABEL)}
var CITY = {
  ouagadougou: 'Ouagadougou',
  bobo: 'Bobo-Dioulasso',
  koudougou: 'Koudougou',
  ouahigouya: 'Ouahigouya',
  banfora: 'Banfora',
  dedougou: 'Dédougou',
  fada: "Fada N'Gourma",
  autre: 'Autre localité'
}
function el(id) { return document.getElementById(id) }
function show(id, on) { var node = el(id); if (node) node.hidden = !on }
function make(tag, className, text) {
  var node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined && text !== null) node.textContent = text
  return node
}
function icon(name, className) {
  var node = make('span', 'material-symbols-outlined ' + (className || ''), name)
  node.setAttribute('aria-hidden', 'true')
  return node
}
function readJson(response) {
  return response.json().catch(function () { return null }).then(function (payload) { return { status: response.status, payload: payload } })
}
function errorMessage(result, fallback) {
  var payload = result.payload
  if (result.status >= 500 || !payload || !payload.error || typeof payload.error.message !== 'string') return fallback
  return payload.error.message
}
function formatter(options) {
  try { return new Intl.DateTimeFormat('fr-FR', Object.assign({ timeZone: 'Africa/Ouagadougou' }, options)) } catch (error) { return null }
}
var DAY = formatter({ year: 'numeric', month: '2-digit', day: '2-digit' })
var TIME = formatter({ hour: '2-digit', minute: '2-digit' })
var DATE = formatter({ day: 'numeric', month: 'long' })
var DATE_YEAR = formatter({ day: 'numeric', month: 'long', year: 'numeric' })
var YEAR = formatter({ year: 'numeric' })
function dayKey(date) { return DAY ? DAY.format(date) : date.toISOString().slice(0, 10) }
function timeText(iso) { var date = new Date(iso); return TIME ? TIME.format(date) : '' }
function dayLabel(iso) {
  var date = new Date(iso)
  var now = new Date()
  if (dayKey(date) === dayKey(now)) return COPY.today
  if (dayKey(date) === dayKey(new Date(now.getTime() - 86400000))) return COPY.yesterday
  if (YEAR && DATE && DATE_YEAR) return YEAR.format(date) === YEAR.format(now) ? DATE.format(date) : DATE_YEAR.format(date)
  return dayKey(date)
}
function whenText(iso) { return dayLabel(iso) + ' ' + COPY.at + ' ' + timeText(iso) }
function nameLine(pseudonym, other) {
  var name = pseudonym || COPY.unavailableName
  return other && other.available && typeof other.age === 'number' ? name + ', ' + other.age + ' ans' : name
}
function cityText(other) { return other && other.available && other.city ? (CITY[other.city] || other.city) : '' }
function avatar(pseudonym, other, className) {
  var box = make('div', className + ' overflow-hidden border border-hairline shrink-0 bg-cream flex items-center justify-center text-deep-navy/80 font-display text-base')
  box.setAttribute('aria-hidden', 'true')
  if (other && other.available && other.photo && other.photo.url) {
    var img = make('img', 'w-full h-full object-cover')
    img.src = other.photo.url
    img.alt = ''
    img.loading = 'lazy'
    box.appendChild(img)
  } else {
    box.textContent = (pseudonym || '?').charAt(0).toUpperCase()
  }
  return box
}
function realtime(handlers) {
  var script = document.createElement('script')
  script.src = ${JSON.stringify(REALTIME_SCRIPT)}
  script.async = true
  script.onload = function () {
    if (typeof window.io !== 'function') return
    try {
      var socket = window.io({ path: '/v1/realtime', addTrailingSlash: false, withCredentials: true })
      Object.keys(handlers).forEach(function (name) { if (name !== 'ready') socket.on(name, handlers[name]) })
      if (handlers.ready) handlers.ready(socket)
    } catch (error) { /* No realtime: the page still loads and sends. */ }
  }
  script.onerror = function () { /* No realtime: the page still loads and sends. */ }
  document.head.appendChild(script)
}`

const LIST_SCRIPT = `${COMMON}
var data = []
function row(item) {
  var other = item.other || {}
  // An unavailable member shows no name details and no way into the thread (QA F5).
  var pseudonym = other.available ? item.pseudonym : null
  var li = make('li', 'p-5 md:p-6 rounded-md bg-[#FAF6EC] border border-hairline')
  li.setAttribute('data-testid', 'conversation-row')
  li.setAttribute('data-conversation-id', item.id)
  var wrap = make('div', 'flex flex-col md:flex-row md:items-center justify-between gap-4')
  var main = make('div', 'flex-1 space-y-3')
  var head = make('div', 'flex items-center gap-3.5')
  head.appendChild(avatar(pseudonym, other, 'w-12 h-12 md:w-14 md:h-14 rounded-lg'))
  var who = make('div', 'flex-1')
  var line = make('div', 'flex flex-wrap items-center gap-x-2 gap-y-1')
  line.appendChild(make('h2', 'chat-name font-display text-lg md:text-xl text-deep-navy font-medium', nameLine(pseudonym, other)))
  var city = cityText(other)
  if (city) {
    // On phones the city always takes its own line with no « · » (QA D2: a wrapped line started with a lone dot);
    // from md up it sits after the name, behind the dot.
    var group = make('span', 'chat-city w-full md:w-auto inline-flex items-center gap-x-2 whitespace-nowrap text-xs text-deep-navy/80 font-medium')
    var dot = make('span', 'hidden md:inline', '·')
    dot.setAttribute('aria-hidden', 'true')
    group.appendChild(dot)
    group.appendChild(make('span', '', city))
    line.appendChild(group)
  }
  who.appendChild(line)
  if (other.available && other.verified) {
    var pills = make('div', 'flex flex-wrap items-center gap-1.5 pt-1')
    var pill = make('span', 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-deep-navy/5 text-deep-navy border border-hairline/60')
    pill.appendChild(icon('verified_user', 'text-[13px] text-[#7D5F27]'))
    pill.appendChild(document.createTextNode(COPY.verified))
    pills.appendChild(pill)
    who.appendChild(pills)
  }
  head.appendChild(who)
  main.appendChild(head)
  var last = item.last_message
  var quote = make('blockquote', 'chat-name text-xs md:text-sm text-deep-navy font-normal leading-relaxed pl-3 border-l-2 italic ' + (last ? 'border-soft-gold' : 'border-hairline'))
  quote.setAttribute('data-testid', 'conversation-preview')
  if (last) {
    var text = last.preview === null || last.preview === undefined ? COPY.textUnavailable : last.preview
    quote.textContent = (last.mine ? COPY.you + ' : ' : '') + '« ' + text + ' »'
  } else {
    quote.textContent = COPY.noMessage
  }
  main.appendChild(quote)
  if (last) {
    var meta = make('p', 'flex items-center gap-1 text-xs text-deep-navy/80')
    meta.appendChild(icon('schedule', 'text-[15px]'))
    meta.appendChild(make('span', '', whenText(last.created_at)))
    main.appendChild(meta)
  }
  wrap.appendChild(main)
  if (!other.available) {
    li.setAttribute('data-unavailable', 'true')
    li.appendChild(wrap)
    return li
  }
  var link = make('a', 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-md bg-deep-navy text-cream hover:bg-deep-navy/90 text-xs md:text-sm font-medium transition-colors shrink-0 self-start md:self-center')
  link.href = ${JSON.stringify(DISCUSSIONS_PATH)} + '/' + encodeURIComponent(item.id)
  // The name comes from the content (visible label + screen-reader suffix), so it always starts with the visible
  // words and the icon ligature (aria-hidden) never takes part in it (QA F1, WCAG 2.5.3).
  var label = make('span', '', COPY.open)
  label.appendChild(make('span', 'chat-sr', ' ' + COPY.openWithSuffix + ' ' + (pseudonym || '')))
  link.appendChild(label)
  link.appendChild(icon('arrow_forward', 'text-sm text-gold-soft'))
  wrap.appendChild(link)
  li.appendChild(wrap)
  return li
}
function paint() {
  var list = el('discussions-list')
  while (list.firstChild) list.removeChild(list.firstChild)
  for (var index = 0; index < data.length; index += 1) list.appendChild(row(data[index]))
  show('discussions-list', data.length > 0)
  show('discussions-empty', data.length === 0)
  el('discussions-count').textContent = data.length === 1 ? COPY.registryOne : COPY.registryMany.replace('{n}', String(data.length))
}
function load() {
  var root = el('discussions')
  root.setAttribute('aria-busy', 'true')
  show('discussions-load-error', false)
  return fetch('/v1/conversations', { credentials: 'same-origin' }).then(readJson).then(function (result) {
    root.setAttribute('aria-busy', 'false')
    show('discussions-loading', false)
    if (result.status !== 200 || !result.payload || !Array.isArray(result.payload.items)) {
      el('discussions-load-error-text').textContent = errorMessage(result, COPY.loadError)
      show('discussions-load-error', true)
      return
    }
    data = result.payload.items
    paint()
  }).catch(function () {
    root.setAttribute('aria-busy', 'false')
    show('discussions-loading', false)
    el('discussions-load-error-text').textContent = COPY.loadError
    show('discussions-load-error', true)
  })
}
var reloadTimer = null
function reloadSoon() {
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(function () { reloadTimer = null; load() }, 300)
}
el('discussions-retry').addEventListener('click', function (event) { event.preventDefault(); show('discussions-loading', true); load() })
load().then(function () { realtime({ 'message.delivered': reloadSoon }) })`

const THREAD_SCRIPT = `${COMMON}
var ID = document.getElementById('chat-thread').getAttribute('data-conversation-id')
var me = null
var conversation = null
var messages = []
var known = {}
var hasMore = false
var busy = false
var socket = null
var lastEmit = 0
var typingTimer = null
var catching = false
var input = el('thread-input')
var sendButton = el('thread-send')
function messageNode(item) {
  var mine = item.mine
  var wrap = make('div', 'flex flex-col max-w-[88%] sm:max-w-[78%] md:max-w-[70%] ' + (mine ? 'items-end self-end' : 'items-start self-start'))
  wrap.setAttribute('data-testid', 'chat-bubble')
  wrap.setAttribute('data-message-id', item.id)
  wrap.setAttribute('data-mine', mine ? 'true' : 'false')
  var bubble = make('div', mine
    ? 'bg-deep-navy text-cream rounded-2xl rounded-tr-sm px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-sm'
    : 'bg-cream text-deep-navy border border-hairline rounded-2xl rounded-tl-sm px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-sm')
  bubble.appendChild(make('span', 'chat-sr', (mine ? COPY.you : (conversation && conversation.pseudonym) || '') + ' : '))
  bubble.appendChild(make('p', 'chat-text text-sm leading-relaxed', item.text === null || item.text === undefined ? COPY.textUnavailable : item.text))
  wrap.appendChild(bubble)
  var meta = make('p', 'mt-1 px-1 text-[11px] text-deep-navy/80')
  var time = make('time', '', timeText(item.created_at))
  time.setAttribute('datetime', item.created_at)
  meta.appendChild(time)
  wrap.appendChild(meta)
  return wrap
}
function separator(label) {
  var row = make('div', 'flex items-center justify-center my-1')
  row.setAttribute('data-testid', 'chat-day')
  var left = make('div', 'border-t border-hairline flex-1 max-w-[60px] sm:max-w-[100px]')
  left.setAttribute('aria-hidden', 'true')
  var right = make('div', 'border-t border-hairline flex-1 max-w-[60px] sm:max-w-[100px]')
  right.setAttribute('aria-hidden', 'true')
  row.appendChild(left)
  row.appendChild(make('span', 'px-3 text-[11px] font-medium uppercase tracking-wider text-deep-navy/80', label))
  row.appendChild(right)
  return row
}
function renderAll() {
  var log = el('thread-messages')
  log.setAttribute('aria-live', 'off')
  while (log.firstChild) log.removeChild(log.firstChild)
  var previous = null
  for (var index = 0; index < messages.length; index += 1) {
    var item = messages[index]
    var label = dayLabel(item.created_at)
    if (label !== previous) { log.appendChild(separator(label)); previous = label }
    log.appendChild(messageNode(item))
  }
  show('thread-older', hasMore)
  show('thread-empty', messages.length === 0)
  setTimeout(function () { log.setAttribute('aria-live', 'polite') }, 0)
}
function appendItems(items) {
  var log = el('thread-messages')
  for (var index = 0; index < items.length; index += 1) {
    var item = items[index]
    if (known[item.id]) continue
    known[item.id] = true
    var before = messages.length ? dayLabel(messages[messages.length - 1].created_at) : null
    var label = dayLabel(item.created_at)
    messages.push(item)
    if (label !== before) log.appendChild(separator(label))
    var node = messageNode(item)
    log.appendChild(node)
    if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest' })
  }
  show('thread-empty', messages.length === 0)
}
function header() {
  var other = conversation.other || {}
  var slot = el('thread-avatar')
  while (slot.firstChild) slot.removeChild(slot.firstChild)
  slot.appendChild(avatar(conversation.pseudonym, other, 'w-12 h-12 sm:w-14 sm:h-14 rounded-full'))
  el('thread-title').textContent = nameLine(conversation.pseudonym, other)
  show('thread-verified', !!(other.available && other.verified))
  var city = cityText(other)
  el('thread-city-text').textContent = city
  show('thread-city', !!city)
  el('thread-stage').textContent = STAGE[conversation.stage] || STAGE.chat
  var unavailable = !other.available
  var closed = !!conversation.closed
  show('thread-unavailable', unavailable)
  show('thread-closed', closed && !unavailable)
  input.disabled = unavailable || closed
  updateSend()
}
var DRAFT_KEY = 'ankanu_chat_draft:' + ID
function saveDraft(text) { try { sessionStorage.setItem(DRAFT_KEY, text) } catch (error) { /* no storage: the text stays in the box */ } }
function takeDraft() {
  try { var text = sessionStorage.getItem(DRAFT_KEY); sessionStorage.removeItem(DRAFT_KEY); return text || '' } catch (error) { return '' }
}
function sessionExpired() {
  var box = el('thread-error')
  while (box.firstChild) box.removeChild(box.firstChild)
  box.appendChild(document.createTextNode(COPY.sessionExpired + ' '))
  var link = make('a', 'underline font-medium', COPY.signInAgain)
  link.href = '/auth'
  box.appendChild(link)
  show('thread-error', true)
}
function updateSend() {
  var length = Array.from ? Array.from(input.value.trim()).length : input.value.trim().length
  sendButton.disabled = busy || input.disabled || length === 0
  var counter = el('thread-counter')
  var raw = Array.from ? Array.from(input.value).length : input.value.length
  counter.textContent = raw + '/${TEXT_MAX}'
  counter.hidden = raw < ${COUNTER_FROM}
}
function fail(id, text) { el(id + '-text').textContent = text; show(id, true) }
function load() {
  var root = el('chat-thread')
  root.setAttribute('aria-busy', 'true')
  show('thread-load-error', false)
  show('thread-signin', false)
  show('thread-loading', true)
  var base = '/v1/conversations/' + encodeURIComponent(ID)
  return Promise.all([
    fetch(base, { credentials: 'same-origin' }).then(readJson),
    fetch(base + '/messages', { credentials: 'same-origin' }).then(readJson)
  ]).then(function (results) {
    root.setAttribute('aria-busy', 'false')
    show('thread-loading', false)
    var head = results[0]
    var page = results[1]
    if (head.status === 404 || page.status === 404) { takeDraft(); show('thread-missing', true); return false }
    if (head.status === 401 || page.status === 401) { el('thread-load-error-text').textContent = COPY.sessionExpired; show('thread-load-error', true); show('thread-signin', true); return false }
    if (head.status !== 200 || page.status !== 200 || !head.payload || !page.payload || !Array.isArray(page.payload.items)) {
      fail('thread-load-error', errorMessage(head.status !== 200 ? head : page, COPY.loadError))
      return false
    }
    conversation = head.payload.conversation
    me = head.payload.me && head.payload.me.id
    var draft = takeDraft()
    if (draft && !input.value) input.value = draft
    messages = []
    known = {}
    for (var index = 0; index < page.payload.items.length; index += 1) {
      messages.push(page.payload.items[index])
      known[page.payload.items[index].id] = true
    }
    hasMore = !!page.payload.has_more
    header()
    renderAll()
    show('thread', true)
    var last = el('thread-messages').lastChild
    if (last && last.scrollIntoView) last.scrollIntoView({ block: 'nearest' })
    return true
  }).catch(function () {
    root.setAttribute('aria-busy', 'false')
    show('thread-loading', false)
    fail('thread-load-error', COPY.loadError)
    return false
  })
}
function loadOlder() {
  if (!messages.length) return
  var button = el('thread-older')
  button.disabled = true
  fetch('/v1/conversations/' + encodeURIComponent(ID) + '/messages?before=' + encodeURIComponent(messages[0].id), { credentials: 'same-origin' })
    .then(readJson)
    .then(function (result) {
      button.disabled = false
      if (result.status !== 200 || !result.payload || !Array.isArray(result.payload.items)) return
      var older = result.payload.items.filter(function (item) { return !known[item.id] })
      for (var index = 0; index < older.length; index += 1) known[older[index].id] = true
      messages = older.concat(messages)
      hasMore = !!result.payload.has_more
      renderAll()
    })
    .catch(function () { button.disabled = false })
}
function catchUp() {
  if (catching || !conversation) return
  catching = true
  var after = messages.length ? messages[messages.length - 1].id : ''
  fetch('/v1/conversations/' + encodeURIComponent(ID) + '/messages' + (after ? '?after=' + encodeURIComponent(after) : ''), { credentials: 'same-origin' })
    .then(readJson)
    .then(function (result) {
      catching = false
      if (result.status !== 200 || !result.payload || !Array.isArray(result.payload.items)) return
      appendItems(result.payload.items)
      if (result.payload.has_more && after) catchUp()
    })
    .catch(function () { catching = false })
}
function hideTyping() {
  el('thread-typing').textContent = ''
  if (typingTimer) { clearTimeout(typingTimer); typingTimer = null }
}
function onTyping(payload) {
  if (!payload || payload.conversation_id !== ID || payload.account_id === me) return
  el('thread-typing').textContent = COPY.typing.replace('{name}', (conversation && conversation.pseudonym) || '')
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(hideTyping, ${TYPING_SHOW_MS})
}
function onDelivered(payload) {
  if (!payload || payload.conversation_id !== ID || known[payload.message_id]) return
  if (payload.sender_id !== me) hideTyping()
  catchUp()
}
function emitTyping() {
  if (!socket || !socket.connected || input.disabled) return
  var now = Date.now()
  if (now - lastEmit < ${TYPING_EMIT_MS}) return
  lastEmit = now
  socket.emit('conversation.typing', { conversation_id: ID })
}
function send() {
  var text = input.value.trim()
  if (busy || !text || input.disabled) return
  busy = true
  updateSend()
  show('thread-error', false)
  el('thread-status').textContent = ''
  fetch('/v1/conversations/' + encodeURIComponent(ID) + '/messages', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'text', text: text })
  }).then(readJson).then(function (result) {
    busy = false
    if (result.status === 201 && result.payload && result.payload.message) {
      appendItems([result.payload.message])
      input.value = ''
      el('thread-status').textContent = COPY.sent
    } else if (result.status === 401) {
      // Session expired mid-thread (QA F4): keep the text here and for the next visit, offer the sign-in.
      saveDraft(text)
      sessionExpired()
    } else {
      var reason = result.payload && result.payload.error && result.payload.error.details && result.payload.error.details.reason
      if (result.status === 409 && reason === 'conversation_closed') { conversation.closed = true; header() }
      if (result.status === 409 && reason === 'other_unavailable') { conversation.other = { available: false }; header() }
      el('thread-error').textContent = errorMessage(result, COPY.sendError)
      show('thread-error', true)
    }
    updateSend()
    input.focus()
  }).catch(function () {
    busy = false
    el('thread-error').textContent = COPY.sendError
    show('thread-error', true)
    updateSend()
  })
}
el('thread-form').addEventListener('submit', function (event) { event.preventDefault(); send() })
input.addEventListener('input', function () { updateSend(); emitTyping() })
input.addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send() }
})
el('thread-older').addEventListener('click', function (event) { event.preventDefault(); loadOlder() })
el('thread-retry').addEventListener('click', function (event) { event.preventDefault(); load() })
updateSend()
load().then(function (ok) {
  if (!ok) return
  realtime({
    ready: function (connected) { socket = connected },
    connect: function () { catchUp() },
    'message.delivered': onDelivered,
    'conversation.typing': onTyping
  })
})`

const quiet =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-md border border-hairline bg-cream text-sm font-medium text-deep-navy hover:border-deep-navy/30'

function listMain(): string {
  return `<main id="discussions" aria-busy="true" class="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-10 pb-16 min-w-0">
<div class="mb-8 text-center md:text-left">
<p class="inline-flex items-center gap-2 mb-3"><span class="h-1.5 w-1.5 rounded-full bg-soft-gold" aria-hidden="true"></span><span class="text-[11px] font-semibold tracking-[0.2em] text-[#7D5F27] uppercase">${CHAT_COPY.listEyebrow.replace('&', '&amp;')}</span></p>
<h1 class="font-display text-3xl md:text-4xl text-deep-navy font-normal tracking-tight">${CHAT_COPY.listTitle}</h1>
</div>
<p id="discussions-loading" class="text-sm text-deep-navy/80">${CHAT_COPY.loading}</p>
<div id="discussions-load-error" hidden class="rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
<p id="discussions-load-error-text" role="alert" class="text-sm text-deep-navy break-words">${CHAT_COPY.loadError}</p>
<button id="discussions-retry" type="button" class="${quiet}">${CHAT_COPY.retry}</button>
</div>
<div id="discussions-empty" hidden class="text-center py-16 px-4 border border-dashed border-hairline rounded-md">
<span class="material-symbols-outlined text-3xl text-deep-navy/60 mb-3" aria-hidden="true">forum</span>
<p class="font-display text-base text-deep-navy">${CHAT_COPY.emptyTitle}</p>
<p class="text-xs text-deep-navy/80 mt-1 max-w-sm mx-auto">${CHAT_COPY.emptyBody}</p>
<a href="/invitations" class="mt-4 ${quiet}">${CHAT_COPY.emptyLink}</a>
</div>
<ul id="discussions-list" hidden class="space-y-4"></ul>
<div class="mt-10 pt-6 border-t border-hairline/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-deep-navy/80">
<p>${CHAT_COPY.pendingNote}</p>
<p id="discussions-count" class="italic text-[11px] shrink-0">${CHAT_COPY.registryMany.replace('{n}', '0')}</p>
</div>
</main>`
}

function threadMain(id: string): string {
  return `<main id="chat-thread" data-conversation-id="${id}" aria-busy="true" class="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 flex flex-col gap-4 min-w-0">
<div class="w-full flex items-center">
<a href="${DISCUSSIONS_PATH}" class="inline-flex items-center gap-2 min-h-[44px] text-sm text-deep-navy/80 hover:text-deep-navy font-medium"><span class="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span><span>${CHAT_COPY.back}</span></a>
</div>
<p id="thread-loading" class="text-sm text-deep-navy/80">${CHAT_COPY.loading}</p>
<div id="thread-missing" hidden class="rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
<p role="alert" class="text-sm text-deep-navy">${CHAT_COPY.missing}</p>
<a href="${DISCUSSIONS_PATH}" class="${quiet}">${CHAT_COPY.back}</a>
</div>
<div id="thread-load-error" hidden class="rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
<p id="thread-load-error-text" role="alert" class="text-sm text-deep-navy break-words">${CHAT_COPY.loadError}</p>
<button id="thread-retry" type="button" class="${quiet}">${CHAT_COPY.retry}</button>
<a id="thread-signin" hidden href="/auth" class="${quiet}">${CHAT_COPY.signInAgain}</a>
</div>
<section id="thread" hidden aria-labelledby="thread-title" class="bg-white/90 rounded-xl sm:rounded-2xl border border-hairline shadow-sm flex flex-col overflow-hidden">
<div class="px-3.5 sm:px-6 py-3.5 sm:py-4 border-b border-hairline/70 flex flex-wrap items-center justify-between gap-3 bg-white">
<div class="flex items-center gap-3 sm:gap-4 min-w-0">
<div id="thread-avatar"></div>
<div class="min-w-0 flex-1">
<div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
<h1 id="thread-title" class="chat-name font-display text-base sm:text-lg md:text-xl font-bold text-deep-navy"></h1>
<span id="thread-verified" hidden role="img" aria-label="${CHAT_COPY.verified}" title="${CHAT_COPY.verified}" class="inline-flex items-center px-1.5 py-0.5 rounded-full bg-soft-gold/20 border border-soft-gold/40"><span class="material-symbols-outlined text-[13px] text-[#7D5F27]" aria-hidden="true">verified</span></span>
</div>
<p id="thread-city" hidden class="flex items-center gap-0.5 mt-1 text-xs text-deep-navy/80"><span class="material-symbols-outlined text-xs text-[#7D5F27]" aria-hidden="true">location_on</span><span id="thread-city-text"></span></p>
</div>
</div>
<span id="thread-stage" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gold-soft/40 text-deep-navy border border-soft-gold/40"></span>
</div>
<p id="thread-unavailable" hidden class="px-3.5 sm:px-6 py-2.5 bg-cream border-b border-hairline text-sm text-deep-navy">${CHAT_COPY.unavailable}</p>
<p id="thread-closed" hidden class="px-3.5 sm:px-6 py-2.5 bg-cream border-b border-hairline text-sm text-deep-navy">${CHAT_COPY.closed}</p>
<div class="px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-3.5 sm:gap-5 bg-[#FAF7F0]/60 min-h-[320px]">
<button id="thread-older" type="button" hidden class="self-center ${quiet}">${CHAT_COPY.older}</button>
<p id="thread-empty" hidden class="text-center text-sm text-deep-navy/80 py-8">${CHAT_COPY.threadEmpty}</p>
<div id="thread-messages" role="log" aria-live="polite" aria-label="${CHAT_COPY.messagesLabel}" class="flex flex-col gap-3.5 sm:gap-5"></div>
<p id="thread-typing" role="status" aria-live="polite" class="min-h-[1.25rem] text-xs italic text-deep-navy/80"></p>
</div>
<form id="thread-form" class="p-3 sm:p-4 md:p-5 bg-white border-t border-hairline flex flex-col gap-2.5" novalidate>
<div class="flex items-center justify-between gap-2 text-[11px] px-1">
<label for="thread-input" class="font-medium text-deep-navy">${CHAT_COPY.composeLabel}</label>
<span id="thread-counter" hidden class="text-deep-navy/80">0/${TEXT_MAX}</span>
</div>
<div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-2.5 rounded-xl border border-hairline bg-white p-2 focus-within:border-soft-gold">
<textarea id="thread-input" rows="2" placeholder="${CHAT_COPY.placeholder}" class="flex-1 w-full border-0 focus:ring-0 p-1.5 text-sm text-deep-navy placeholder-[#0B1D36]/60 resize-none bg-transparent"></textarea>
<button id="thread-send" type="submit" class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-lg bg-deep-navy hover:bg-deep-navy/90 text-cream text-sm font-semibold"><span>${CHAT_COPY.send}</span><span class="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span></button>
</div>
<p id="thread-error" role="alert" hidden class="text-sm text-[#9B2C2C] break-words px-1"></p>
<p id="thread-status" role="status" aria-live="polite" class="chat-sr"></p>
<p class="text-[11px] text-deep-navy/80 leading-normal px-1"><strong class="font-semibold text-deep-navy">${CHAT_COPY.ruleLead}</strong> ${CHAT_COPY.rule}</p>
</form>
</section>
</main>`
}

function page(stitch: string, title: string, main: string, script: string): string {
  let html = stitch
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>AnKanu • ${title}</title>`)
  html = html.replace(/<main\b[\s\S]*<\/main>/, main)
  html = html.includes('</head>') ? html.replace('</head>', `${STYLE}</head>`) : `${STYLE}${html}`
  const built = prepareV2(withAppShell(html, { kind: 'member', active: 'discussions' }), script)
  const guard = pinGuardScript()
  return built.includes('</body>') ? built.replace('</body>', `${guard}</body>`) : `${built}${guard}`
}

/** `/discussions` from screen 20: its head (fonts, Tailwind tokens) and a main the script fills. */
export function discussionsHtml(stitch: string): string {
  return page(stitch, CHAT_COPY.listTitle, listMain(), LIST_SCRIPT)
}

/** `/discussions/<id>` from screen 21. The id is a UUID (checked by the route), so it is safe in the attribute. */
export function chatThreadHtml(stitch: string, id: string): string {
  if (!isConversationId(id)) {
    throw new Error('chatThreadHtml needs a conversation id')
  }
  return page(stitch, 'Discussion', threadMain(id), THREAD_SCRIPT)
}

export function isConversationId(value: string): boolean {
  return isInviteTargetId(value)
}
