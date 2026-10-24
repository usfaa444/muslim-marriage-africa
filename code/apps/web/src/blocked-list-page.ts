import { withAppShell } from './app-shell'
import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

/**
 * « Membres bloqués » (Story 8.6 follow-up), reached from Paramètres (screen 27) at `/settings/bloques`. No Stitch
 * screen exists for it, so it reuses the screen 27 document, header, card style and app shell (Profil tab). It lists
 * the Blocks I placed (`GET /v1/blocks`): pseudonym and blurred photo only. « Débloquer » opens an inline confirmation
 * in the same row (no native dialog); « Confirmer le déblocage » sends `DELETE /v1/blocks/<id>`.
 */

export const BLOCKED_COPY = {
  back: 'Retour aux paramètres',
  eyebrow: 'Préférences & confidentialité',
  title: 'Membres bloqués',
  intro:
    'Les membres que vous avez bloqués ne voient pas votre fiche et ne peuvent pas vous contacter. Vous pouvez lever un blocage à tout moment.',
  loading: 'Chargement…',
  empty: "Vous n'avez bloqué aucun membre.",
  countOne: '1 membre bloqué',
  countMany: '{n} membres bloqués',
  blockedOn: 'Bloqué le {date}',
  unblock: 'Débloquer',
  unblockLabel: 'Débloquer {name}',
  confirmQuestion: 'Débloquer {name} ?',
  confirmExplain:
    'Ce membre pourra de nouveau voir votre fiche, vous envoyer une invitation et vous écrire dans une discussion existante.',
  confirm: 'Confirmer le déblocage',
  cancel: 'Annuler',
  sending: 'Envoi en cours…',
  done: 'Blocage levé pour {name}.',
  gone: "Ce blocage n'existe plus.",
  loadError: 'Chargement impossible. Vérifiez votre connexion et réessayez.',
  sendError: 'Envoi impossible. Vérifiez votre connexion et réessayez.',
  retry: 'Réessayer',
  sessionExpired: 'Votre session a expiré. Reconnectez-vous.',
  signInAgain: 'Se reconnecter',
  settingsTitle: 'Membres bloqués',
  settingsExplain: 'Consultez les membres que vous avez bloqués et levez un blocage si vous le souhaitez.',
  settingsAction: 'Gérer',
} as const

export const BLOCKED_PATH = '/settings/bloques'

const STYLE = `<style id="blocked-style">
#blocked-list-page [hidden] { display: none !important; }
#blocked-list-page, #blocked-list-page * { min-width: 0; }
#blocked-list-page .blocked-name { overflow-wrap: anywhere; }
#blocked-list-page a:focus-visible, #blocked-list-page button:focus-visible, #blocked-list-page [tabindex]:focus-visible { outline: 2px solid #7D5F27; outline-offset: 2px; }
#blocked-list-page button[disabled] { opacity: 0.6; cursor: not-allowed; }
.blocked-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>`

const quiet =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-md border border-hairline bg-cream text-sm font-medium text-deep-navy hover:border-deep-navy/30'
const primary =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-md bg-deep-navy text-cream text-sm font-medium border border-deep-navy hover:opacity-95'

const ROW_TEMPLATE = `<template id="blocked-row"><li data-blocked class="bg-cream border border-hairline rounded-2xl p-4 sm:p-5" style="background-color: rgb(251, 248, 241);">
<div class="flex items-center gap-4">
<div data-photo class="relative w-14 h-14 rounded-full bg-deep-navy/5 border border-hairline overflow-hidden shrink-0 flex items-center justify-center"><span data-placeholder class="material-symbols-outlined text-[#7D5F27] text-xl" aria-hidden="true">person</span></div>
<div class="flex-1">
<p data-name class="blocked-name text-base font-semibold text-deep-navy"></p>
<p data-date class="text-xs text-deep-navy/80 mt-0.5"></p>
</div>
<button data-unblock type="button" class="${quiet} shrink-0"><span data-unblock-text>${BLOCKED_COPY.unblock}</span></button>
</div>
<div data-confirm hidden class="mt-4 pt-4 border-t border-hairline/60">
<p data-question tabindex="-1" class="text-sm font-semibold text-deep-navy blocked-name"></p>
<p class="text-xs text-deep-navy/80 mt-1">${BLOCKED_COPY.confirmExplain}</p>
<p data-row-error role="alert" hidden class="mt-2 text-sm text-[#9B2C2C] break-words"></p>
<div class="mt-3 flex flex-col sm:flex-row gap-3">
<button data-confirm-yes type="button" class="${primary}">${BLOCKED_COPY.confirm}</button>
<button data-confirm-no type="button" class="${quiet}">${BLOCKED_COPY.cancel}</button>
</div>
</div>
</li></template>`

const SCRIPT = `var COPY = ${JSON.stringify(BLOCKED_COPY)}
var ROOT = document.getElementById('blocked-list-page')
var busy = false
function el(id) { return document.getElementById(id) }
function show(id, on) { var node = el(id); if (node) node.hidden = !on }
function fill(text, values) {
  return text.replace(/\\{(\\w+)\\}/g, function (all, key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : all })
}
function readJson(response) {
  return response.json().catch(function () { return null }).then(function (payload) { return { status: response.status, payload: payload } })
}
function errorMessage(result, fallback) {
  var payload = result.payload
  if (result.status >= 500 || !payload || !payload.error || typeof payload.error.message !== 'string') return fallback
  return payload.error.message
}
function dateLabel(iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Ouagadougou' })
  } catch (error) {
    return iso.slice(0, 10)
  }
}
function setCount(count) {
  var node = el('blocked-count')
  node.textContent = count === 1 ? COPY.countOne : fill(COPY.countMany, { n: String(count) })
  node.hidden = count === 0
  show('blocked-empty', count === 0)
}
function sessionExpired(box) {
  while (box.firstChild) box.removeChild(box.firstChild)
  box.appendChild(document.createTextNode(COPY.sessionExpired + ' '))
  var link = document.createElement('a')
  link.className = 'underline font-medium'
  link.href = '/auth'
  link.textContent = COPY.signInAgain
  box.appendChild(link)
}
function announce(text) {
  var status = el('blocked-status')
  status.textContent = text
  status.hidden = !text
}
function closeAll() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-confirm]'), function (node) { node.hidden = true })
  Array.prototype.forEach.call(document.querySelectorAll('[data-unblock]'), function (node) { node.setAttribute('aria-expanded', 'false') })
}
function row(item) {
  var node = el('blocked-row').content.cloneNode(true)
  var li = node.querySelector('[data-blocked]')
  var name = item.pseudonym
  li.setAttribute('data-target', item.blocked_id)
  node.querySelector('[data-name]').textContent = name
  node.querySelector('[data-date]').textContent = fill(COPY.blockedOn, { date: dateLabel(item.created_at) })
  if (item.photo && item.photo.url) {
    var image = document.createElement('img')
    image.alt = ''
    image.className = 'absolute inset-0 h-full w-full object-cover'
    image.src = item.photo.url
    var holder = node.querySelector('[data-photo]')
    holder.insertBefore(image, holder.firstChild)
    node.querySelector('[data-placeholder]').hidden = true
  }
  var open = node.querySelector('[data-unblock]')
  var panel = node.querySelector('[data-confirm]')
  var question = node.querySelector('[data-question]')
  var yes = node.querySelector('[data-confirm-yes]')
  var no = node.querySelector('[data-confirm-no]')
  var rowError = node.querySelector('[data-row-error]')
  var panelId = 'blocked-confirm-' + item.blocked_id
  panel.id = panelId
  open.setAttribute('aria-label', fill(COPY.unblockLabel, { name: name }))
  open.setAttribute('aria-expanded', 'false')
  open.setAttribute('aria-controls', panelId)
  question.textContent = fill(COPY.confirmQuestion, { name: name })
  open.addEventListener('click', function () {
    if (busy) return
    closeAll()
    announce('')
    rowError.hidden = true
    panel.hidden = false
    open.setAttribute('aria-expanded', 'true')
    question.focus()
  })
  no.addEventListener('click', function () {
    if (busy) return
    panel.hidden = true
    open.setAttribute('aria-expanded', 'false')
    open.focus()
  })
  yes.addEventListener('click', function () {
    if (busy) return
    busy = true
    yes.disabled = true
    no.disabled = true
    rowError.hidden = true
    el('blocked-sending').textContent = COPY.sending
    fetch('/v1/blocks/' + encodeURIComponent(item.blocked_id), { method: 'DELETE', credentials: 'same-origin' })
      .then(readJson)
      .then(function (result) {
        busy = false
        yes.disabled = false
        no.disabled = false
        el('blocked-sending').textContent = ''
        if (result.status === 200 || result.status === 404) {
          li.parentNode.removeChild(li)
          setCount(el('blocked-list').children.length)
          announce(result.status === 200 ? fill(COPY.done, { name: name }) : COPY.gone)
          el('blocked-title').focus()
          return
        }
        if (result.status === 401) sessionExpired(rowError)
        else rowError.textContent = errorMessage(result, COPY.sendError)
        rowError.hidden = false
      })
      .catch(function () {
        busy = false
        yes.disabled = false
        no.disabled = false
        el('blocked-sending').textContent = ''
        rowError.textContent = COPY.sendError
        rowError.hidden = false
      })
  })
  return node
}
function load() {
  show('blocked-load-error', false)
  show('blocked-load-signin', false)
  show('blocked-loading', true)
  ROOT.setAttribute('aria-busy', 'true')
  return fetch('/v1/blocks', { credentials: 'same-origin', cache: 'no-store' }).then(readJson).then(function (result) {
    ROOT.setAttribute('aria-busy', 'false')
    show('blocked-loading', false)
    if (result.status !== 200 || !result.payload || !Array.isArray(result.payload.items)) {
      el('blocked-load-error-text').textContent = result.status === 401 ? COPY.sessionExpired : errorMessage(result, COPY.loadError)
      show('blocked-load-signin', result.status === 401)
      show('blocked-retry', result.status !== 401)
      show('blocked-load-error', true)
      return
    }
    var list = el('blocked-list')
    while (list.firstChild) list.removeChild(list.firstChild)
    result.payload.items.forEach(function (item) { list.appendChild(row(item)) })
    setCount(result.payload.items.length)
  }).catch(function () {
    ROOT.setAttribute('aria-busy', 'false')
    show('blocked-loading', false)
    el('blocked-load-error-text').textContent = COPY.loadError
    show('blocked-retry', true)
    show('blocked-load-error', true)
  })
}
el('blocked-retry').addEventListener('click', function (event) { event.preventDefault(); load() })
load()`

function blockedMain(): string {
  return `<main id="blocked-list-page" aria-busy="true" class="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 pb-20 md:pb-12 min-w-0">
<div class="mb-6">
<a href="/settings" class="inline-flex items-center gap-2 min-h-[44px] text-sm font-medium text-deep-navy/80 hover:text-deep-navy"><span class="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span><span>${BLOCKED_COPY.back}</span></a>
</div>
<div class="mb-8 space-y-2">
<p class="text-[11px] font-bold tracking-[0.2em] uppercase text-[#7D5F27]">${BLOCKED_COPY.eyebrow.replace('&', '&amp;')}</p>
<h1 id="blocked-title" tabindex="-1" class="font-display text-3xl md:text-4xl text-deep-navy font-normal tracking-tight">${BLOCKED_COPY.title}</h1>
<p class="text-sm md:text-base text-deep-navy/80 font-normal max-w-xl">${BLOCKED_COPY.intro}</p>
<p id="blocked-count" hidden class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-deep-navy text-cream"></p>
</div>
<p id="blocked-status" role="status" hidden class="mb-4 rounded-md border border-hairline bg-cream px-4 py-3 text-sm text-deep-navy break-words"></p>
<p id="blocked-sending" role="status" aria-live="polite" class="blocked-sr"></p>
<p id="blocked-loading" class="text-sm text-deep-navy/80">${BLOCKED_COPY.loading}</p>
<div id="blocked-load-error" hidden class="rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
<p id="blocked-load-error-text" role="alert" class="text-sm text-deep-navy break-words">${BLOCKED_COPY.loadError}</p>
<button id="blocked-retry" type="button" class="${quiet}">${BLOCKED_COPY.retry}</button>
<a id="blocked-load-signin" hidden href="/auth" class="${quiet}">${BLOCKED_COPY.signInAgain}</a>
</div>
<p id="blocked-empty" hidden class="bg-cream border border-hairline rounded-2xl p-6 text-sm text-deep-navy/90" style="background-color: rgb(251, 248, 241);">${BLOCKED_COPY.empty}</p>
<ul id="blocked-list" class="space-y-4" aria-labelledby="blocked-title"></ul>
${ROW_TEMPLATE}
</main>`
}

/** `/settings/bloques`, built on the screen 27 document so the head, header and footer match Paramètres. */
export function blockedListHtml(stitch: string): string {
  let html = stitch
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>AnKanu • Membres bloqués</title>')
  html = html.replace(/<main\b[\s\S]*<\/main>/, blockedMain())
  html = html.includes('</head>') ? html.replace('</head>', `${STYLE}</head>`) : `${STYLE}${html}`
  const built = prepareV2(withAppShell(html, { kind: 'member', active: 'profil' }), SCRIPT)
  const guard = pinGuardScript()
  return built.includes('</body>') ? built.replace('</body>', `${guard}</body>`) : `${built}${guard}`
}

/** The Paramètres card that leads here, in the screen 27 link-card style (« Formules & Packs »). */
export function blockedSettingsSection(): string {
  return `<!-- MEMBRES BLOQUÉS (Story 8.6) --> <section data-blocked-settings class="bg-cream border border-hairline rounded-2xl p-6 md:p-7 shadow-none" style="background-color: rgb(251, 248, 241);"> <a class="group flex items-center justify-between gap-4 min-h-[44px]" href="${BLOCKED_PATH}"> <div class="space-y-1"> <div class="flex items-center gap-2"> <span class="material-symbols-outlined text-[#7D5F27] text-lg" data-icon="block" aria-hidden="true">block</span> <h2 class="text-base font-semibold text-deep-navy group-hover:text-[#7D5F27] transition-colors">${BLOCKED_COPY.settingsTitle}</h2> </div> <p class="text-xs md:text-sm text-deep-navy/80 leading-relaxed">${BLOCKED_COPY.settingsExplain}</p> </div> <div class="flex items-center text-xs md:text-sm font-semibold text-[#7D5F27] group-hover:translate-x-1 transition-transform whitespace-nowrap"> <span>${BLOCKED_COPY.settingsAction}</span> <span class="material-symbols-outlined text-base ml-1" data-icon="arrow_forward" aria-hidden="true">arrow_forward</span> </div> </a> </section> `
}
