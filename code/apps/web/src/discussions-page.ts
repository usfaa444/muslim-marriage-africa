import { withAppShell } from './app-shell'
import { isInviteTargetId } from './invite-compose-page'
import { liteModeSource } from './lite-mode'
import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

/**
 * Screens 20 (Discussions list) and 21 (Chat thread), Stories 5.1 and 5.2, inside the shared app shell. Both pages
 * load their data in the browser, so the API decides every refusal. Realtime is Socket.IO on `/v1/realtime` (AD-15):
 * events carry ids only and the page fetches the text over HTTP. A page without realtime still loads and sends.
 *
 * Stories 5.3 and 5.4 bring back the Stitch camera and microphone buttons (« Joindre une photo sobre », « Enregistrer
 * une note vocale sobre ») and the Voice note bubble: a Chat Photo or a Voice note is delivered as soon as it is
 * stored. A Photo shows its server blur at once and its clear image after one signed fetch (on tap in Lite mode); a
 * Voice note plays on tap only (no autoplay, no transcript). Events still carry ids only; every media URL is signed
 * for the reader at read time, and expires within a minute.
 *
 * Dropped from the Stitch exports because the product does not do them (yet), or because they would be a read
 * receipt, a hold state or a quota this story does not ship: « Wali notifié », « Accord mutuel validé », « Un wali peut
 * lire cette conversation! », « Demander la levée du flou », « Quota du jour », the tabs « Non lues » and « Sans
 * réponse », « 1 non lu », « Lu », the « sécurisés » pill, and any GIF picker (FR-054 is NEXT).
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
  reportBlock: 'Signaler / Bloquer',
  reportMessage: 'Signaler ce message',
  photoButton: 'Joindre une photo sobre',
  voiceButton: 'Enregistrer une note vocale sobre',
  photo: 'Photo',
  photoPreparing: 'Préparation de la photo…',
  photoPreviewAlt: 'Aperçu de la photo à envoyer',
  photoSend: 'Envoyer la photo',
  photoSent: 'Photo envoyée',
  photoUnsupported: "Ce format de photo n'est pas pris en charge. Choisissez une photo JPEG ou PNG.",
  photoTooHeavy: 'Photo trop lourde (2 Mo au plus).',
  photoShow: 'Afficher la photo',
  photoAltMine: 'Votre photo',
  photoAltTheirs: 'Photo de {name}',
  photoUnavailable: 'Photo indisponible pour le moment.',
  voice: 'Note vocale',
  voicePlay: 'Écouter la note vocale',
  voicePause: 'Mettre en pause la note vocale',
  voiceUnavailable: 'Lecture impossible. Réessayez.',
  voiceRecording: 'Enregistrement en cours',
  voiceStop: "Arrêter l'enregistrement",
  voiceReady: 'Note vocale prête',
  voiceLanguage: 'Langue de la note',
  voiceSend: 'Envoyer la note vocale',
  voiceSent: 'Note vocale envoyée',
  voiceMaxReached: 'Durée maximale atteinte (2 minutes).',
  voiceShort: 'Note vocale trop courte (1 seconde au moins).',
  voiceTooHeavy: 'Note vocale trop lourde (1 Mo au plus).',
  micDenied: "Micro indisponible. Autorisez l'accès au micro pour enregistrer une note vocale.",
  voiceUnsupported: "L'enregistrement vocal n'est pas pris en charge par ce navigateur.",
  cancel: 'Annuler',
} as const

/** Voice note languages (FR-051). A hint for the background review only; it never changes delivery. */
export const VOICE_LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'mos', label: 'Mooré' },
  { code: 'dyu', label: 'Dioula' },
] as const

export const STAGE_LABEL: Record<string, string> = {
  invite: 'Étape : invitation',
  chat: 'Étape : discussion',
  meeting: 'Étape : rencontre',
  married: 'Étape : mariage',
}

export const TEXT_MAX = 2000
export const COUNTER_FROM = 1800
/** Client limits, the same as the API's (Stories 5.3, 5.4). The Photo is re-encoded in the browser before upload. */
export const PHOTO_MAX_BYTES = 2_097_152
export const PHOTO_MAX_EDGE = 1600
export const PHOTO_QUALITY = 0.82
export const VOICE_MAX_MS = 120_000
export const VOICE_MIN_MS = 1_000
export const VOICE_MAX_BYTES = 1_048_576
export const VOICE_BITS_PER_SECOND = 32_000
export const TYPING_EMIT_MS = 1500
export const TYPING_SHOW_MS = 4000
export const REALTIME_SCRIPT = '/v1/realtime/socket.io.min.js'
export const DISCUSSIONS_PATH = '/discussions'
/** Screen 23 (Stories 8.5, 8.6): « Signaler / Bloquer » in the thread header, « Signaler ce message » under theirs. */
export const REPORT_PATH = '/signaler'

const STYLE = `<style id="chat-style">
#discussions [hidden], #chat-thread [hidden] { display: none !important; }
#discussions, #discussions *, #chat-thread, #chat-thread * { min-width: 0; }
#discussions .chat-name, #chat-thread .chat-name, #chat-thread .chat-text { overflow-wrap: anywhere; }
#chat-thread .chat-text { white-space: pre-wrap; }
#chat-thread button[disabled], #chat-thread textarea[disabled], #chat-thread select[disabled] { opacity: 0.6; cursor: not-allowed; }
#chat-thread .chat-photo { width: min(260px, calc(100vw - 112px)); max-height: 360px; }
#chat-thread .chat-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
#chat-thread .chat-voice { width: min(300px, calc(100vw - 112px)); }
#chat-thread .chat-target { min-width: 44px; min-height: 44px; }
#chat-thread .chat-play { width: 44px; height: 44px; }
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
  if (last && (last.kind === 'photo' || last.kind === 'voice')) {
    quote.textContent = (last.mine ? COPY.you + ' : ' : '') + (last.kind === 'photo' ? COPY.photo : COPY.voice)
  } else if (last) {
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
${liteModeSource}
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
var photoButton = el('thread-photo')
var voiceButton = el('thread-voice')
var photoInput = el('thread-photo-input')
/** Downloaded media by message id (object URLs), so a re-render or a replay never fetches twice. */
var mediaCache = {}
var playing = null
function two(n) { return (n < 10 ? '0' : '') + n }
function clock(ms) { var total = Math.max(0, Math.round((ms || 0) / 1000)); return Math.floor(total / 60) + ':' + two(total % 60) }
function mediaBase(item) { return '/v1/conversations/' + encodeURIComponent(ID) + '/messages/' + encodeURIComponent(item.id) + '/media' }
/** One signed URL for this reader (60 s), fetched now, kept as an object URL. Never waits on anything but the network. */
function mediaBlob(item) {
  if (mediaCache[item.id]) return Promise.resolve(mediaCache[item.id])
  return fetch(mediaBase(item), { credentials: 'same-origin' }).then(readJson).then(function (result) {
    if (result.status !== 200 || !result.payload || typeof result.payload.url !== 'string') throw new Error('media')
    return fetch(result.payload.url, { credentials: 'same-origin' })
  }).then(function (response) {
    if (!response.ok) throw new Error('media')
    return response.blob()
  }).then(function (blob) {
    var url = URL.createObjectURL(blob)
    mediaCache[item.id] = url
    return url
  })
}
function photoNode(item) {
  var media = item.media || {}
  var box = make('div', 'chat-photo relative overflow-hidden rounded-xl bg-[#E2D4B8]/50 border border-hairline')
  box.setAttribute('data-testid', 'chat-photo')
  if (media.width && media.height) box.style.aspectRatio = media.width + ' / ' + media.height
  else box.style.aspectRatio = '4 / 3'
  var name = item.mine ? COPY.photoAltMine : COPY.photoAltTheirs.replace('{name}', (conversation && conversation.pseudonym) || '')
  var preview = null
  if (media.blur_url) {
    preview = make('img', '')
    preview.src = media.blur_url
    preview.alt = ''
    preview.setAttribute('data-testid', 'chat-photo-blur')
    box.appendChild(preview)
  }
  var cover = make('div', 'absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center')
  var show = make('button', 'chat-target inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-md bg-white/90 border border-hairline text-xs font-semibold text-deep-navy hover:bg-white')
  show.type = 'button'
  show.appendChild(icon('visibility', 'text-base'))
  show.appendChild(make('span', '', COPY.photoShow))
  var note = make('p', 'text-[11px] font-medium text-deep-navy bg-white/90 rounded px-1.5 py-0.5')
  note.hidden = true
  cover.appendChild(show)
  cover.appendChild(note)
  box.appendChild(cover)
  function reveal() {
    show.disabled = true
    show.setAttribute('aria-busy', 'true')
    note.hidden = true
    mediaBlob(item).then(function (url) {
      var clear = make('img', 'absolute inset-0')
      clear.alt = name
      clear.src = url
      clear.setAttribute('data-testid', 'chat-photo-clear')
      if (preview) preview.remove()
      cover.remove()
      box.appendChild(clear)
    }).catch(function () {
      show.disabled = false
      show.removeAttribute('aria-busy')
      note.textContent = COPY.photoUnavailable
      note.hidden = false
    })
  }
  show.addEventListener('click', function (event) { event.preventDefault(); reveal() })
  // Lite mode (2G/3G, data saver, 1 GB devices) waits for a tap; otherwise the clear image loads at once.
  if (mediaCache[item.id] || !liteEnabled()) setTimeout(reveal, 0)
  return box
}
function voiceNode(item) {
  var media = item.media || {}
  var duration = media.duration_ms || 0
  var card = make('div', 'chat-voice flex flex-col gap-2')
  card.setAttribute('data-testid', 'chat-voice')
  var head = make('div', 'flex items-center justify-between gap-2 text-xs pb-1.5 border-b ' + (item.mine ? 'border-cream/20' : 'border-hairline/60'))
  var title = make('span', 'inline-flex items-center gap-2 font-medium min-w-0')
  title.appendChild(icon('graphic_eq', 'text-base shrink-0 ' + (item.mine ? 'text-[#C9A86C]' : 'text-[#7D5F27]')))
  title.appendChild(make('span', 'truncate', COPY.voice))
  head.appendChild(title)
  var time = make('span', 'shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded ' + (item.mine ? 'bg-cream/15' : 'bg-[#E2D4B8]/40'), clock(duration))
  time.setAttribute('data-testid', 'chat-voice-time')
  head.appendChild(time)
  card.appendChild(head)
  var row = make('div', 'flex items-center gap-2.5')
  var play = make('button', 'chat-play w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ' + (item.mine ? 'bg-cream text-deep-navy' : 'bg-deep-navy text-cream'))
  play.type = 'button'
  play.setAttribute('data-testid', 'chat-voice-play')
  var glyph = icon('play_arrow', 'text-xl leading-none')
  play.appendChild(glyph)
  // The name is visually hidden text, not aria-label, so it never disagrees with the icon's ligature text.
  var playName = make('span', 'chat-sr', COPY.voicePlay)
  play.appendChild(playName)
  row.appendChild(play)
  var bars = make('div', 'flex-1 flex items-center gap-[3px] h-7 overflow-hidden')
  bars.setAttribute('aria-hidden', 'true')
  var heights = [2, 4, 5, 3, 6, 5, 7, 4, 6, 5, 3, 5, 2, 4, 5, 3, 4, 2]
  for (var index = 0; index < heights.length; index += 1) {
    var bar = make('span', 'w-[3px] rounded-full shrink-0 ' + (item.mine ? 'bg-cream/60' : 'bg-deep-navy/50'))
    bar.style.height = (heights[index] * 4) + 'px'
    bars.appendChild(bar)
  }
  row.appendChild(bars)
  card.appendChild(row)
  var note = make('p', 'text-[11px]')
  note.hidden = true
  card.appendChild(note)
  var audio = null
  function setPlaying(on) {
    glyph.textContent = on ? 'pause' : 'play_arrow'
    playName.textContent = on ? COPY.voicePause : COPY.voicePlay
  }
  function stop() { if (audio) audio.pause() }
  play.addEventListener('click', function (event) {
    event.preventDefault()
    if (audio && !audio.paused) { audio.pause(); return }
    if (playing && playing !== stop) playing()
    play.disabled = true
    play.setAttribute('aria-busy', 'true')
    note.hidden = true
    mediaBlob(item).then(function (url) {
      if (!audio) {
        audio = new Audio()
        audio.preload = 'none'
        audio.src = url
        audio.addEventListener('timeupdate', function () { time.textContent = clock(audio.currentTime * 1000) + ' / ' + clock(duration) })
        audio.addEventListener('pause', function () { setPlaying(false) })
        audio.addEventListener('ended', function () { setPlaying(false); time.textContent = clock(duration) })
        audio.addEventListener('play', function () { setPlaying(true) })
      }
      playing = stop
      play.disabled = false
      play.removeAttribute('aria-busy')
      return audio.play()
    }).catch(function () {
      play.disabled = false
      play.removeAttribute('aria-busy')
      setPlaying(false)
      note.textContent = COPY.voiceUnavailable
      note.hidden = false
    })
  })
  return card
}
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
  if (item.kind === 'photo' && item.media) {
    bubble.className = (mine ? 'bg-deep-navy rounded-2xl rounded-tr-sm' : 'bg-cream border border-hairline rounded-2xl rounded-tl-sm') + ' p-1.5 shadow-sm'
    bubble.appendChild(photoNode(item))
  } else if (item.kind === 'voice' && item.media) {
    bubble.className = (mine ? 'bg-deep-navy text-cream rounded-2xl rounded-tr-sm' : 'bg-cream text-deep-navy border border-hairline rounded-2xl rounded-tl-sm') + ' p-3 sm:p-3.5 shadow-sm'
    bubble.appendChild(voiceNode(item))
  } else {
    bubble.appendChild(make('p', 'chat-text text-sm leading-relaxed', item.text === null || item.text === undefined ? COPY.textUnavailable : item.text))
  }
  wrap.appendChild(bubble)
  var meta = make('p', 'mt-1 px-1 text-[11px] text-deep-navy/80')
  var time = make('time', '', timeText(item.created_at))
  time.setAttribute('datetime', item.created_at)
  meta.appendChild(time)
  if (!mine && conversation && conversation.other_id) {
    meta.className = 'mt-0.5 px-1 flex items-center gap-1 text-[11px] text-deep-navy/80'
    var flag = make('a', 'inline-flex shrink-0 items-center justify-center w-[44px] h-[44px] rounded-md text-deep-navy/80 hover:text-deep-navy hover:bg-cream')
    flag.href = ${JSON.stringify(REPORT_PATH)} + '/' + encodeURIComponent(conversation.other_id) + '?discussion=' + encodeURIComponent(ID) + '&message=' + encodeURIComponent(item.id)
    flag.setAttribute('data-testid', 'report-message')
    flag.appendChild(icon('flag', 'text-[16px]'))
    flag.appendChild(make('span', 'chat-sr', COPY.reportMessage))
    meta.appendChild(flag)
  }
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
  var report = el('thread-report')
  report.href = ${JSON.stringify(REPORT_PATH)} + '/' + encodeURIComponent(conversation.other_id) + '?discussion=' + encodeURIComponent(ID)
  report.hidden = !conversation.other_id
  var unavailable = !other.available
  var closed = !!conversation.closed
  show('thread-unavailable', unavailable)
  show('thread-closed', closed && !unavailable)
  input.disabled = unavailable || closed
  photoButton.disabled = input.disabled
  voiceButton.disabled = input.disabled
  if (input.disabled) closePanel()
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
      refused(result)
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
function refused(result) {
  var reason = result.payload && result.payload.error && result.payload.error.details && result.payload.error.details.reason
  if (result.status === 409 && reason === 'conversation_closed') { conversation.closed = true; header() }
  if (result.status === 409 && reason === 'other_unavailable') { conversation.other = { available: false }; header() }
  el('thread-error').textContent = errorMessage(result, COPY.sendError)
  show('thread-error', true)
}
function mediaError(text) {
  el('thread-error').textContent = text
  show('thread-error', true)
}
// ---- Photo and Voice note composer (Stories 5.3, 5.4) ----
var pending = null
var recorder = null
var recordStream = null
var recordChunks = []
var recordStarted = 0
var recordTimer = null
var recordCancelled = false
function panel() { return el('thread-media') }
function closePanel() {
  if (recorder && recorder.state !== 'inactive') { recordCancelled = true; try { recorder.stop() } catch (error) {} }
  stopStream()
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
  if (pending && pending.preview) URL.revokeObjectURL(pending.preview)
  pending = null
  var box = panel()
  while (box.firstChild) box.removeChild(box.firstChild)
  box.hidden = true
}
function stopStream() {
  if (recordStream) { recordStream.getTracks().forEach(function (track) { track.stop() }); recordStream = null }
}
function panelButton(label, primary) {
  var button = make('button', 'chat-target inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-semibold ' + (primary ? 'bg-deep-navy text-cream hover:bg-deep-navy/90' : 'border border-hairline bg-cream text-deep-navy hover:border-deep-navy/30'), label)
  button.type = 'button'
  return button
}
function openPanel(label) {
  closePanel()
  var box = panel()
  box.setAttribute('aria-label', label)
  box.hidden = false
  return box
}
function readBase64(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader()
    reader.onload = function () { var value = String(reader.result || ''); resolve(value.slice(value.indexOf(',') + 1)) }
    reader.onerror = function () { reject(reader.error) }
    reader.readAsDataURL(blob)
  })
}
/** Re-encode in the browser: longest edge ${PHOTO_MAX_EDGE} px, JPEG. Drops EXIF (position) and cuts the upload on 2G/3G. */
function compressPhoto(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file)
    var image = new Image()
    image.onload = function () {
      URL.revokeObjectURL(url)
      var attempts = [[${PHOTO_MAX_EDGE}, ${PHOTO_QUALITY}], [1280, 0.7], [960, 0.6]]
      function attempt(index) {
        var edge = attempts[index][0]
        var scale = Math.min(1, edge / Math.max(image.naturalWidth || 1, image.naturalHeight || 1))
        var canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale))
        canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale))
        var context = canvas.getContext('2d')
        if (!context || !canvas.toBlob) { reject(new Error('unsupported')); return }
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('unsupported')); return }
          if (blob.size > ${PHOTO_MAX_BYTES} && index + 1 < attempts.length) { attempt(index + 1); return }
          if (blob.size > ${PHOTO_MAX_BYTES}) { reject(new Error('heavy')); return }
          resolve(blob)
        }, 'image/jpeg', attempts[index][1])
      }
      attempt(0)
    }
    image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('unsupported')) }
    image.src = url
  })
}
function postMedia(body, sentText, button) {
  if (busy) return
  busy = true
  button.disabled = true
  updateSend()
  show('thread-error', false)
  el('thread-status').textContent = ''
  fetch('/v1/conversations/' + encodeURIComponent(ID) + '/messages', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }).then(readJson).then(function (result) {
    busy = false
    button.disabled = false
    if (result.status === 201 && result.payload && result.payload.message) {
      closePanel()
      appendItems([result.payload.message])
      el('thread-status').textContent = sentText
      input.focus()
    } else if (result.status === 401) {
      sessionExpired()
    } else {
      refused(result)
    }
    updateSend()
  }).catch(function () {
    busy = false
    button.disabled = false
    mediaError(COPY.sendError)
    updateSend()
  })
}
function choosePhoto(file) {
  if (!file) return
  show('thread-error', false)
  var box = openPanel(COPY.photo)
  var status = make('p', 'text-sm text-deep-navy', COPY.photoPreparing)
  status.setAttribute('role', 'status')
  box.appendChild(status)
  compressPhoto(file).then(function (blob) {
    if (!pending && !box.hidden && box.contains(status)) {
      var preview = URL.createObjectURL(blob)
      pending = { blob: blob, preview: preview }
      box.removeChild(status)
      var row = make('div', 'flex flex-wrap items-center gap-3')
      var thumb = make('img', 'w-20 h-20 rounded-lg object-cover border border-hairline')
      thumb.src = preview
      thumb.alt = COPY.photoPreviewAlt
      row.appendChild(thumb)
      var actions = make('div', 'flex flex-wrap items-center gap-2')
      var sendPhoto = panelButton(COPY.photoSend, true)
      sendPhoto.setAttribute('data-testid', 'photo-send')
      var cancel = panelButton(COPY.cancel, false)
      actions.appendChild(sendPhoto)
      actions.appendChild(cancel)
      row.appendChild(actions)
      box.appendChild(row)
      sendPhoto.focus()
      cancel.addEventListener('click', function (event) { event.preventDefault(); closePanel(); photoButton.focus() })
      sendPhoto.addEventListener('click', function (event) {
        event.preventDefault()
        if (!pending) return
        var current = pending
        readBase64(current.blob).then(function (image) {
          if (pending !== current) return
          postMedia({ kind: 'photo', image: image }, COPY.photoSent, sendPhoto)
        }).catch(function () { mediaError(COPY.photoUnsupported) })
      })
    }
  }).catch(function (error) {
    closePanel()
    mediaError(error && error.message === 'heavy' ? COPY.photoTooHeavy : COPY.photoUnsupported)
  })
}
function recorderMime() {
  var list = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm']
  for (var index = 0; index < list.length; index += 1) {
    try { if (window.MediaRecorder.isTypeSupported(list[index])) return list[index] } catch (error) {}
  }
  return ''
}
function startRecording() {
  show('thread-error', false)
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof window.MediaRecorder !== 'function') {
    mediaError(COPY.voiceUnsupported)
    return
  }
  voiceButton.disabled = true
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    voiceButton.disabled = input.disabled
    var box = openPanel(COPY.voice)
    recordStream = stream
    var mime = recorderMime()
    var options = { audioBitsPerSecond: ${VOICE_BITS_PER_SECOND} }
    if (mime) options.mimeType = mime
    try { recorder = new window.MediaRecorder(stream, options) } catch (error) { closePanel(); mediaError(COPY.voiceUnsupported); return }
    recordChunks = []
    recordCancelled = false
    var line = make('div', 'flex flex-wrap items-center gap-3')
    var dot = make('span', 'inline-block w-2.5 h-2.5 rounded-full bg-[#9B2C2C]')
    dot.setAttribute('aria-hidden', 'true')
    line.appendChild(dot)
    line.appendChild(make('span', 'text-sm font-medium text-deep-navy', COPY.voiceRecording))
    var timer = make('span', 'text-sm tabular-nums text-deep-navy', '0:00 / ' + clock(${VOICE_MAX_MS}))
    timer.setAttribute('data-testid', 'voice-timer')
    line.appendChild(timer)
    var stopButton = panelButton(COPY.voiceStop, true)
    stopButton.setAttribute('data-testid', 'voice-stop')
    var cancel = panelButton(COPY.cancel, false)
    line.appendChild(stopButton)
    line.appendChild(cancel)
    box.appendChild(line)
    var limit = make('p', 'text-[11px] text-deep-navy/80')
    limit.setAttribute('role', 'status')
    box.appendChild(limit)
    recorder.ondataavailable = function (event) { if (event.data && event.data.size) recordChunks.push(event.data) }
    recorder.onstop = function () {
      if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
      stopStream()
      if (recordCancelled) return
      var ms = Math.min(${VOICE_MAX_MS}, Date.now() - recordStarted)
      var blob = new Blob(recordChunks, { type: (recorder && recorder.mimeType) || mime || 'audio/webm' })
      recorder = null
      recorded(blob, ms, limit.textContent)
    }
    recordStarted = Date.now()
    recorder.start(1000)
    stopButton.focus()
    recordTimer = setInterval(function () {
      var elapsed = Date.now() - recordStarted
      timer.textContent = clock(Math.min(elapsed, ${VOICE_MAX_MS})) + ' / ' + clock(${VOICE_MAX_MS})
      if (elapsed >= ${VOICE_MAX_MS} && recorder && recorder.state === 'recording') {
        limit.textContent = COPY.voiceMaxReached
        recorder.stop()
      }
    }, 250)
    stopButton.addEventListener('click', function (event) { event.preventDefault(); if (recorder && recorder.state === 'recording') recorder.stop() })
    cancel.addEventListener('click', function (event) { event.preventDefault(); closePanel(); voiceButton.focus() })
  }).catch(function () {
    voiceButton.disabled = input.disabled
    mediaError(COPY.micDenied)
  })
}
function recorded(blob, ms, note) {
  var box = openPanel(COPY.voice)
  if (ms < ${VOICE_MIN_MS}) { closePanel(); mediaError(COPY.voiceShort); voiceButton.focus(); return }
  if (blob.size > ${VOICE_MAX_BYTES}) { closePanel(); mediaError(COPY.voiceTooHeavy); voiceButton.focus(); return }
  pending = { blob: blob, ms: ms }
  var line = make('div', 'flex flex-wrap items-center gap-3')
  line.appendChild(icon('graphic_eq', 'text-base text-[#7D5F27]'))
  var ready = make('p', 'text-sm font-medium text-deep-navy', COPY.voiceReady + ' : ' + clock(ms))
  ready.setAttribute('role', 'status')
  ready.setAttribute('data-testid', 'voice-ready')
  line.appendChild(ready)
  box.appendChild(line)
  if (note) box.appendChild(make('p', 'text-[11px] text-deep-navy/80', note))
  var controls = make('div', 'flex flex-wrap items-end gap-2')
  var field = make('div', 'flex flex-col gap-1')
  var label = make('label', 'text-[11px] font-medium text-deep-navy', COPY.voiceLanguage)
  label.setAttribute('for', 'thread-voice-language')
  var select = make('select', 'chat-target min-h-[44px] rounded-lg border border-hairline bg-white px-3 text-sm text-deep-navy')
  select.id = 'thread-voice-language'
  var languages = ${JSON.stringify(VOICE_LANGUAGES)}
  languages.forEach(function (language) {
    var option = make('option', '', language.label)
    option.value = language.code
    select.appendChild(option)
  })
  field.appendChild(label)
  field.appendChild(select)
  controls.appendChild(field)
  var sendVoice = panelButton(COPY.voiceSend, true)
  sendVoice.setAttribute('data-testid', 'voice-send')
  var cancel = panelButton(COPY.cancel, false)
  controls.appendChild(sendVoice)
  controls.appendChild(cancel)
  box.appendChild(controls)
  sendVoice.focus()
  cancel.addEventListener('click', function (event) { event.preventDefault(); closePanel(); voiceButton.focus() })
  sendVoice.addEventListener('click', function (event) {
    event.preventDefault()
    if (!pending) return
    var current = pending
    readBase64(current.blob).then(function (audio) {
      if (pending !== current) return
      postMedia({ kind: 'voice', audio: audio, duration_ms: Math.max(${VOICE_MIN_MS}, Math.round(current.ms)), language: select.value }, COPY.voiceSent, sendVoice)
    }).catch(function () { mediaError(COPY.sendError) })
  })
}
photoButton.addEventListener('click', function (event) { event.preventDefault(); if (!photoButton.disabled) photoInput.click() })
photoInput.addEventListener('change', function () {
  var file = photoInput.files && photoInput.files[0]
  photoInput.value = ''
  choosePhoto(file)
})
voiceButton.addEventListener('click', function (event) { event.preventDefault(); if (!voiceButton.disabled) startRecording() })
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
<div class="flex items-center gap-2 flex-wrap">
<span id="thread-stage" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gold-soft/40 text-deep-navy border border-soft-gold/40"></span>
<a id="thread-report" hidden href="${REPORT_PATH}" class="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-md border border-transparent hover:border-hairline hover:bg-cream text-xs text-deep-navy/80 hover:text-deep-navy"><span class="material-symbols-outlined text-base leading-none text-red-700/80" aria-hidden="true">shield</span><span>${CHAT_COPY.reportBlock}</span></a>
</div>
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
<div id="thread-media" hidden role="group" data-testid="thread-media" class="flex flex-col gap-2 rounded-xl border border-hairline bg-[#FAF7F0] p-3"></div>
<div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-2.5 rounded-xl border border-hairline bg-white p-2 focus-within:border-soft-gold">
<div class="flex items-center gap-1 self-start sm:self-end shrink-0">
<button id="thread-photo" type="button" title="${CHAT_COPY.photoButton}" class="chat-target inline-flex items-center justify-center w-11 h-11 rounded-md text-deep-navy/80 hover:text-deep-navy hover:bg-cream"><span class="material-symbols-outlined text-xl leading-none" aria-hidden="true">photo_camera</span><span class="chat-sr">${CHAT_COPY.photoButton}</span></button>
<button id="thread-voice" type="button" title="${CHAT_COPY.voiceButton}" class="chat-target inline-flex items-center justify-center w-11 h-11 rounded-md text-deep-navy/80 hover:text-deep-navy hover:bg-cream"><span class="material-symbols-outlined text-xl leading-none" aria-hidden="true">mic</span><span class="chat-sr">${CHAT_COPY.voiceButton}</span></button>
<input id="thread-photo-input" type="file" accept="image/*" hidden/>
</div>
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
