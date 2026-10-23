import { withAppShell } from './app-shell'
import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

/**
 * Screen 19, Invite inbox (Stories 4.4, 4.5), inside the shared app shell. The page loads the three boxes in the
 * browser, so the API decides every refusal. The Stitch « Mot d'introduction » block is Message Flash (Story 4.3) and
 * does not ship. Stitch lines that describe things the product does not do (Wali agreement sent, referent informed)
 * or that would be a read receipt or guilt copy on a declined row (« Examen en cours », « Processus clôturé avec
 * sérénité ») are dropped.
 */

export const INBOX_COPY = {
  title: "Invitations Ta'aruf",
  eyebrow: 'Espace de concertation',
  tabsLabel: 'Boîtes d’invitations',
  received: 'Reçues',
  sent: 'Envoyées',
  accepted: 'Acceptées',
  loading: 'Chargement…',
  loadError: 'Chargement impossible. Vérifiez votre connexion et réessayez.',
  retry: 'Réessayer',
  emptyTitle: 'Aucune invitation.',
  emptyBody: "Votre espace d'invitations s'actualise au fur et à mesure des présentations conformes.",
  verified: 'Identité vérifiée',
  marital: 'Situation matrimoniale',
  polygamy: 'Déclaration de polygamie',
  stageLabel: 'Statut actuel',
  stage: "Étape : Invitation Ta'aruf",
  accept: 'Accepter la démarche',
  viewProfile: 'Consulter le profil',
  decline: 'Refuser discrètement',
  unavailable: "Ce profil n'est plus disponible.",
  pending: 'En attente',
  acceptedPill: 'Acceptée',
  declined: 'Déclinée',
  confirmed: 'Démarche confirmée',
  openChat: 'Ouvrir la discussion',
  acceptedStatus: 'Invitation acceptée. La discussion est ouverte.',
  declinedStatus: 'Invitation refusée.',
  actionError: 'Action impossible. Vérifiez votre connexion et réessayez.',
  notProvided: 'Non renseignée',
} as const

export const MARITAL_LABEL: Record<string, string> = {
  single: 'Célibataire',
  married: 'Marié(e)',
  divorced: 'Divorcé(e)',
  widowed: 'Veuf(ve)',
}

export const POLYGAMY_LABEL: Record<string, string> = {
  no: 'Projet monogame',
  yes: 'Ouvert à la polygamie',
}

/** Chat has no screen before Epic 5; an accepted row opens the Discussions section. */
export const CHAT_PATH = '/discussions'

const STYLE = `<style id="invite-inbox-style">
#invite-inbox [hidden] { display: none !important; }
#invite-inbox, #invite-inbox * { min-width: 0; }
#invite-inbox .inbox-name { overflow-wrap: anywhere; }
#invite-inbox button[disabled] { opacity: 0.6; cursor: not-allowed; }
#invite-inbox [role="tab"]:focus-visible, #invite-inbox a:focus-visible, #invite-inbox button:focus-visible { outline: 2px solid #C9A86C; outline-offset: 2px; }
</style>`

const TAB_BASE = 'relative min-h-[44px] pb-3 px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2.5 text-sm border-b-2 whitespace-nowrap'
const TAB_ON = `${TAB_BASE} font-semibold text-deep-navy border-soft-gold`
const TAB_OFF = `${TAB_BASE} font-medium text-deep-navy/80 hover:text-deep-navy border-transparent`
const BADGE_BASE = 'px-2 py-0.5 rounded-full text-xs font-medium'
const BADGE_ON = `${BADGE_BASE} bg-deep-navy text-cream`
const BADGE_OFF = `${BADGE_BASE} bg-hairline/60 text-deep-navy`

const SCRIPT = `var COPY = ${JSON.stringify(INBOX_COPY)}
var MARITAL = ${JSON.stringify(MARITAL_LABEL)}
var POLYGAMY = ${JSON.stringify(POLYGAMY_LABEL)}
var CHAT_PATH = ${JSON.stringify(CHAT_PATH)}
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
var TABS = ['recues', 'envoyees', 'acceptees']
var data = { received: [], sent: [], accepted: [] }
var busy = {}
function el(id) { return document.getElementById(id) }
function show(id, on) { var node = el(id); if (node) node.hidden = !on }
function make(tag, className, text) {
  var node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined && text !== null) node.textContent = text
  return node
}
function dateText(iso) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Ouagadougou', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
  } catch (error) { return '' }
}
function nameLine(item) {
  var name = item.pseudonym || ''
  var other = item.other || {}
  return other.available && typeof other.age === 'number' ? name + ', ' + other.age + ' ans' : name
}
function cityText(item) {
  var other = item.other || {}
  return other.available && other.city ? (CITY[other.city] || other.city) : ''
}
function avatar(item, size) {
  var box = make('div', size + ' rounded-xl bg-cream border border-hairline shrink-0 overflow-hidden flex items-center justify-center text-deep-navy/80 font-display text-base')
  box.setAttribute('aria-hidden', 'true')
  var other = item.other || {}
  if (other.available && other.photo && other.photo.url) {
    var img = make('img', 'w-full h-full object-cover')
    img.src = other.photo.url
    img.alt = ''
    img.loading = 'lazy'
    box.appendChild(img)
  } else {
    box.textContent = (item.pseudonym || '?').charAt(0).toUpperCase()
  }
  return box
}
function verifiedPill() {
  var pill = make('span', 'inline-flex items-center gap-1 text-[11px] font-medium tracking-wide px-2 py-0.5 rounded bg-cream border border-hairline text-deep-navy/80')
  var icon = make('span', 'material-symbols-outlined text-[14px] text-deep-navy/70', 'verified_user')
  icon.setAttribute('aria-hidden', 'true')
  pill.appendChild(icon)
  pill.appendChild(document.createTextNode(' ' + COPY.verified))
  return pill
}
function fact(label, value) {
  var cell = make('div')
  cell.appendChild(make('span', 'block text-deep-navy/80 font-normal', label))
  cell.appendChild(make('span', 'font-medium text-deep-navy mt-0.5 block', value))
  return cell
}
var primary = 'w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 rounded-md bg-deep-navy text-cream text-xs font-semibold tracking-wide hover:bg-deep-navy/90 transition-colors'
var secondary = 'w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-md border border-soft-gold/40 bg-cream/70 text-deep-navy text-xs font-medium hover:border-soft-gold transition-colors'
var quiet = 'w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-md bg-transparent text-deep-navy/80 hover:text-deep-navy underline-offset-4 hover:underline text-xs font-medium transition-colors'
function receivedRow(item) {
  var other = item.other || {}
  var row = make('li', 'bg-[#FBF8F0] border border-hairline/80 rounded-md p-5 md:p-8')
  row.setAttribute('data-testid', 'invite-row')
  row.setAttribute('data-invite-id', item.id)
  var wrap = make('div', 'flex flex-col md:flex-row md:items-start justify-between gap-6')
  var main = make('div', 'space-y-4 flex-1')
  var head = make('div', 'flex items-center gap-4')
  head.appendChild(avatar(item, 'w-14 h-14'))
  var who = make('div')
  var titleLine = make('div', 'flex flex-wrap items-center gap-2.5 mb-1.5')
  titleLine.appendChild(make('h2', 'inbox-name font-display text-xl md:text-2xl text-deep-navy font-medium', nameLine(item)))
  if (other.available && other.verified) titleLine.appendChild(verifiedPill())
  who.appendChild(titleLine)
  var city = cityText(item)
  if (city) who.appendChild(make('p', 'text-xs md:text-sm text-deep-navy/80', city))
  head.appendChild(who)
  main.appendChild(head)
  if (other.available) {
    var facts = make('div', 'grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 pb-1 border-y border-hairline/40 text-xs')
    facts.setAttribute('data-testid', 'invite-marital')
    facts.appendChild(fact(COPY.marital, other.marital_status ? (MARITAL[other.marital_status] || other.marital_status) : COPY.notProvided))
    facts.appendChild(fact(COPY.polygamy, other.polygamy_intent ? (POLYGAMY[other.polygamy_intent] || other.polygamy_intent) : COPY.notProvided))
    var stage = fact(COPY.stageLabel, COPY.stage)
    main.appendChild(facts)
    facts.appendChild(stage)
  } else {
    main.appendChild(make('p', 'text-sm text-deep-navy', COPY.unavailable))
  }
  var error = make('p', 'text-sm text-deep-navy break-words')
  error.setAttribute('role', 'alert')
  error.hidden = true
  main.appendChild(error)
  wrap.appendChild(main)
  var actions = make('div', 'flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 md:w-[220px]')
  var buttons = []
  if (other.available) {
    var accept = make('button', primary)
    accept.type = 'button'
    var icon = make('span', 'material-symbols-outlined text-sm text-gold-soft', 'handshake')
    icon.setAttribute('aria-hidden', 'true')
    accept.appendChild(icon)
    accept.appendChild(make('span', '', COPY.accept))
    accept.addEventListener('click', function () { decide(item, 'accept', buttons, error) })
    actions.appendChild(accept)
    buttons.push(accept)
    var view = make('a', secondary)
    view.href = '/profil/' + encodeURIComponent(item.other_id)
    var eye = make('span', 'material-symbols-outlined text-sm text-deep-navy/70', 'visibility')
    eye.setAttribute('aria-hidden', 'true')
    view.appendChild(eye)
    view.appendChild(make('span', '', COPY.viewProfile))
    actions.appendChild(view)
  }
  var decline = make('button', quiet, COPY.decline)
  decline.type = 'button'
  decline.setAttribute('data-variant', 'button-quiet')
  decline.addEventListener('click', function () { decide(item, 'decline', buttons, error) })
  actions.appendChild(decline)
  buttons.push(decline)
  wrap.appendChild(actions)
  row.appendChild(wrap)
  return row
}
function pill(state) {
  if (state === 'accepted') {
    var done = make('span', 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cream text-deep-navy border border-hairline')
    var check = make('span', 'material-symbols-outlined text-[14px] text-deep-navy/70', 'check_circle')
    check.setAttribute('aria-hidden', 'true')
    done.appendChild(check)
    done.appendChild(document.createTextNode(COPY.acceptedPill))
    return done
  }
  if (state === 'declined') {
    return make('span', 'inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-hairline/30 text-deep-navy/80 border border-hairline/60', COPY.declined)
  }
  var wait = make('span', 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gold-soft/30 text-deep-navy border border-soft-gold/30')
  var dot = make('span', 'inline-block w-1.5 h-1.5 rounded-full bg-soft-gold')
  dot.setAttribute('aria-hidden', 'true')
  wait.appendChild(dot)
  wait.appendChild(document.createTextNode(COPY.pending))
  return wait
}
function chatLink() {
  var link = make('a', 'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-md bg-deep-navy text-cream text-xs font-medium hover:bg-deep-navy/90 transition-colors')
  link.href = CHAT_PATH
  var icon = make('span', 'material-symbols-outlined text-sm text-gold-soft', 'chat')
  icon.setAttribute('aria-hidden', 'true')
  link.appendChild(icon)
  link.appendChild(make('span', '', COPY.openChat))
  return link
}
function sentRow(item) {
  var row = make('li', 'bg-[#FBF8F0] border border-hairline/80 rounded-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-4')
  row.setAttribute('data-testid', 'invite-row')
  row.setAttribute('data-invite-id', item.id)
  row.setAttribute('data-state', item.state)
  var left = make('div', 'flex items-center gap-4')
  left.appendChild(avatar(item, 'w-10 h-10'))
  var who = make('div')
  var line = make('div', 'flex flex-wrap items-center gap-x-2')
  line.appendChild(make('h2', 'inbox-name font-medium text-deep-navy text-sm', nameLine(item)))
  var city = cityText(item)
  if (city) {
    var sep = make('span', 'text-deep-navy/60', '•')
    sep.setAttribute('aria-hidden', 'true')
    line.appendChild(sep)
    line.appendChild(make('span', 'text-xs text-deep-navy/80', city))
  }
  who.appendChild(line)
  who.appendChild(make('p', 'text-xs text-deep-navy/80 mt-0.5', 'Envoyée le ' + dateText(item.created_at)))
  left.appendChild(who)
  row.appendChild(left)
  var right = make('div', 'flex flex-wrap items-center gap-3')
  right.appendChild(pill(item.state))
  if (item.state === 'accepted') right.appendChild(chatLink())
  row.appendChild(right)
  return row
}
function acceptedRow(item) {
  var row = make('li', 'bg-[#FBF8F0] border border-hairline/80 rounded-md p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5')
  row.setAttribute('data-testid', 'invite-row')
  row.setAttribute('data-invite-id', item.id)
  var left = make('div', 'flex items-center gap-4')
  left.appendChild(avatar(item, 'w-12 h-12'))
  var who = make('div', 'space-y-1.5')
  var line = make('div', 'flex flex-wrap items-center gap-2.5')
  line.appendChild(make('h2', 'inbox-name font-display text-xl text-deep-navy font-medium', nameLine(item)))
  var badge = make('span', 'inline-flex items-center gap-1 text-[11px] font-medium tracking-wide px-2 py-0.5 rounded bg-cream border border-hairline text-deep-navy/80')
  var icon = make('span', 'material-symbols-outlined text-[14px] text-deep-navy/70', 'verified_user')
  icon.setAttribute('aria-hidden', 'true')
  badge.appendChild(icon)
  badge.appendChild(document.createTextNode(' ' + COPY.confirmed))
  line.appendChild(badge)
  who.appendChild(line)
  var city = cityText(item)
  var detail = (item.direction === 'received' ? 'Reçue le ' : 'Envoyée le ') + dateText(item.created_at)
  who.appendChild(make('p', 'text-xs md:text-sm text-deep-navy/80', city ? city + ' • ' + detail : detail))
  left.appendChild(who)
  row.appendChild(left)
  var right = make('div', 'shrink-0')
  right.appendChild(chatLink())
  row.appendChild(right)
  return row
}
function fill(listId, items, render) {
  var list = el(listId)
  if (!list) return
  while (list.firstChild) list.removeChild(list.firstChild)
  for (var index = 0; index < items.length; index += 1) list.appendChild(render(items[index]))
}
function paint() {
  var pending = data.received.filter(function (item) { return item.state === 'pending' })
  var counts = { recues: pending.length, envoyees: data.sent.length, acceptees: data.accepted.length }
  for (var index = 0; index < TABS.length; index += 1) {
    var name = TABS[index]
    var badge = el('count-' + name)
    if (badge) badge.textContent = String(counts[name])
    show('empty-' + name, counts[name] === 0)
  }
  fill('list-recues', pending, receivedRow)
  fill('list-envoyees', data.sent, sentRow)
  fill('list-acceptees', data.accepted, acceptedRow)
}
function readJson(response) {
  return response.json().catch(function () { return null }).then(function (payload) { return { status: response.status, payload: payload } })
}
function errorMessage(result, fallback) {
  var payload = result.payload
  if (result.status >= 500 || !payload || !payload.error || typeof payload.error.message !== 'string') return fallback
  return payload.error.message
}
function load() {
  var root = el('invite-inbox')
  show('inbox-loading', true)
  show('inbox-load-error', false)
  show('inbox-panels', false)
  if (root) root.setAttribute('aria-busy', 'true')
  return Promise.all(['received', 'sent', 'accepted'].map(function (box) {
    return fetch('/v1/invites?box=' + box, { credentials: 'same-origin' }).then(readJson)
  })).then(function (results) {
    if (root) root.setAttribute('aria-busy', 'false')
    for (var index = 0; index < results.length; index += 1) {
      var result = results[index]
      if (result.status !== 200 || !result.payload || !Array.isArray(result.payload.items)) {
        show('inbox-loading', false)
        el('inbox-load-error-text').textContent = errorMessage(result, COPY.loadError)
        show('inbox-load-error', true)
        return false
      }
    }
    data.received = results[0].payload.items
    data.sent = results[1].payload.items
    data.accepted = results[2].payload.items
    paint()
    show('inbox-loading', false)
    show('inbox-panels', true)
    return true
  }).catch(function () {
    if (root) root.setAttribute('aria-busy', 'false')
    show('inbox-loading', false)
    el('inbox-load-error-text').textContent = COPY.loadError
    show('inbox-load-error', true)
    return false
  })
}
function setButtons(buttons, on) {
  for (var index = 0; index < buttons.length; index += 1) {
    buttons[index].disabled = !on
    buttons[index].setAttribute('aria-disabled', on ? 'false' : 'true')
  }
}
function decide(item, action, buttons, error) {
  if (busy[item.id]) return
  busy[item.id] = true
  setButtons(buttons, false)
  error.hidden = true
  el('inbox-status').textContent = ''
  fetch('/v1/invites/' + encodeURIComponent(item.id) + '/' + action, { method: 'POST', credentials: 'same-origin' })
    .then(readJson)
    .then(function (result) {
      busy[item.id] = false
      if (result.status === 200) {
        return load().then(function () {
          el('inbox-status').textContent = action === 'accept' ? COPY.acceptedStatus : COPY.declinedStatus
          var tab = el('tab-recues')
          if (tab) tab.focus()
        })
      }
      if (result.status === 404 || result.status === 409) {
        var message = errorMessage(result, COPY.actionError)
        return load().then(function () { el('inbox-status').textContent = message })
      }
      error.textContent = errorMessage(result, COPY.actionError)
      error.hidden = false
      setButtons(buttons, true)
    })
    .catch(function () {
      busy[item.id] = false
      error.textContent = COPY.actionError
      error.hidden = false
      setButtons(buttons, true)
    })
}
function select(name, focus) {
  for (var index = 0; index < TABS.length; index += 1) {
    var current = TABS[index]
    var tab = el('tab-' + current)
    var on = current === name
    tab.setAttribute('aria-selected', on ? 'true' : 'false')
    tab.tabIndex = on ? 0 : -1
    tab.className = on ? TAB_ON : TAB_OFF
    var badge = el('count-' + current)
    if (badge) badge.className = on ? BADGE_ON : BADGE_OFF
    show('panel-' + current, on)
    if (on && focus) tab.focus()
  }
}
var TAB_ON = ${JSON.stringify(TAB_ON)}
var TAB_OFF = ${JSON.stringify(TAB_OFF)}
var BADGE_ON = ${JSON.stringify(BADGE_ON)}
var BADGE_OFF = ${JSON.stringify(BADGE_OFF)}
for (var t = 0; t < TABS.length; t += 1) {
  (function (name, position) {
    var tab = el('tab-' + name)
    if (!tab) return
    tab.addEventListener('click', function () { select(name, false) })
    tab.addEventListener('keydown', function (event) {
      var next = null
      if (event.key === 'ArrowRight') next = TABS[(position + 1) % TABS.length]
      if (event.key === 'ArrowLeft') next = TABS[(position + TABS.length - 1) % TABS.length]
      if (event.key === 'Home') next = TABS[0]
      if (event.key === 'End') next = TABS[TABS.length - 1]
      if (next) { event.preventDefault(); select(next, true) }
    })
  })(TABS[t], t)
}
var retry = el('inbox-retry')
if (retry) retry.addEventListener('click', function (event) { event.preventDefault(); load() })
var initial = (window.location.hash || '').replace('#', '')
select(TABS.indexOf(initial) >= 0 ? initial : 'recues', false)
setTimeout(load, 0)`

function tab(name: string, label: string, selected: boolean): string {
  return `<button type="button" role="tab" id="tab-${name}" aria-controls="panel-${name}" aria-selected="${selected}" tabindex="${selected ? 0 : -1}" class="${selected ? TAB_ON : TAB_OFF}">
<span>${label}</span>
<span id="count-${name}" class="${selected ? BADGE_ON : BADGE_OFF}">0</span>
</button>`
}

function panel(name: string, listClass: string): string {
  return `<section role="tabpanel" id="panel-${name}" aria-labelledby="tab-${name}" tabindex="0"${name === 'recues' ? '' : ' hidden'}>
<ul id="list-${name}" class="${listClass}"></ul>
<div id="empty-${name}" hidden class="text-center py-16 px-4 border border-dashed border-hairline rounded-md">
<span class="material-symbols-outlined text-3xl text-deep-navy/60 mb-3" data-icon="mail" aria-hidden="true">mail</span>
<p class="font-display text-base text-deep-navy">${INBOX_COPY.emptyTitle}</p>
<p class="text-xs text-deep-navy/80 mt-1 max-w-sm mx-auto">${INBOX_COPY.emptyBody}</p>
</div>
</section>`
}

function inboxMain(): string {
  const quiet =
    'inline-flex items-center justify-center min-h-[44px] px-4 rounded-md border border-hairline bg-cream text-sm font-medium text-deep-navy hover:border-deep-navy/30'
  return `<main id="invite-inbox" aria-busy="true" class="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-10 md:py-14 min-w-0">
<div class="mb-8 max-w-2xl">
<p class="mb-2 text-xs font-semibold tracking-widest text-deep-navy/80 uppercase">${INBOX_COPY.eyebrow}</p>
<h1 class="font-display text-3xl md:text-4xl text-deep-navy font-normal tracking-tight">${INBOX_COPY.title}</h1>
</div>
<div role="tablist" aria-label="${INBOX_COPY.tabsLabel}" class="flex items-end border-b border-hairline mb-6 gap-1 sm:gap-4 overflow-x-auto">
${tab('recues', INBOX_COPY.received, true)}
${tab('envoyees', INBOX_COPY.sent, false)}
${tab('acceptees', INBOX_COPY.accepted, false)}
</div>
<p id="inbox-status" role="status" aria-live="polite" class="text-sm text-deep-navy font-medium mb-4 empty:hidden"></p>
<p id="inbox-loading" class="text-sm text-deep-navy/80">${INBOX_COPY.loading}</p>
<div id="inbox-load-error" hidden class="rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
<p id="inbox-load-error-text" role="alert" class="text-sm text-deep-navy break-words">${INBOX_COPY.loadError}</p>
<button id="inbox-retry" type="button" class="${quiet}">${INBOX_COPY.retry}</button>
</div>
<div id="inbox-panels" hidden>
${panel('recues', 'space-y-6')}
${panel('envoyees', 'space-y-4')}
${panel('acceptees', 'space-y-4')}
</div>
</main>`
}

/** `/invitations` from screen 19: its head (fonts, Tailwind tokens) and a main the script fills. */
export function inviteInboxHtml(stitch: string): string {
  let html = stitch
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>AnKanu • ${INBOX_COPY.title}</title>`)
  html = html.replace(/<main\b[\s\S]*<\/main>/, inboxMain())
  html = html.replace(/<!-- Light interactions for tabs -->/, '')
  html = html.includes('</head>') ? html.replace('</head>', `${STYLE}</head>`) : `${STYLE}${html}`
  const page = prepareV2(withAppShell(html, { kind: 'member', active: 'invitations' }), SCRIPT)
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}
