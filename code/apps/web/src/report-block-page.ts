import { REPORT_DETAILS_MAX, REPORT_REASONS } from '@ankanu/kernel'
import { withAppShell } from './app-shell'
import { isInviteTargetId } from './invite-compose-page'
import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

/**
 * Screen 23, Report / Block (Stories 8.5, 8.6), inside the shared app shell. Opened from a Profile (`/signaler/<id>`)
 * or from a Chat thread (`/signaler/<id>?discussion=<conversation>` and `&message=<message>` for one message). The
 * page loads the member in the browser, so the API decides every refusal. The reasons come from the one shared list
 * in `@ankanu/kernel` (`REPORT_REASONS`), the same list the API validates.
 *
 * Kept from Stitch 23: the header, the intro, the nine reasons in order, « Précisions utiles pour les modérateurs », the
 * « Bloquer également ce profil » option (checked by default, as in the design), the submit and cancel actions.
 * Changed: no reason is preselected (a Report must be a choice), and the screenshot upload is left for a later story
 * (no evidence-upload pipeline for Reports exists yet). Added: « Bloquer sans signaler » so a Block never needs a
 * Report (Story 8.6), and the sent / blocked / unavailable / error states.
 */

export const REPORT_COPY = {
  backProfile: 'Retour au profil',
  backChat: 'Retour à la discussion',
  eyebrow: 'Sécurité & bienséance',
  title: 'Signaler ou bloquer ce profil',
  intro:
    "Afin de préserver la solennité de la démarche et la dignité des échanges, tout comportement non conforme fait l'objet d'un examen attentif par notre pôle de modération éthique.",
  concerned: 'Profil concerné :',
  messageConcerned: 'Le message choisi dans la discussion est joint à ce signalement.',
  reasonLegend: 'Motif du signalement',
  required: '(requis)',
  reasonHint: 'Sélectionnez le motif principal',
  detailsLabel: 'Précisions utiles pour les modérateurs',
  optional: '(facultatif)',
  detailsPlaceholder: "Mentionnez respectueusement les éléments observés afin d'orienter notre vérification...",
  blockAlso: 'Bloquer également ce profil',
  blockExplain:
    "En cochant cette option, ce membre ne pourra plus consulter votre fiche ni vous envoyer d'invitation ou de message. Cette action s'applique immédiatement et avec discrétion.",
  submit: 'Transmettre le signalement',
  cancelProfile: 'Annuler et retourner au profil',
  cancelChat: 'Annuler et retourner à la discussion',
  blockOnlyTitle: 'Bloquer sans signaler',
  blockOnlyExplain: "Ce membre ne pourra plus consulter votre fiche ni vous envoyer d'invitation ou de message.",
  blockOnly: 'Bloquer ce profil',
  reasonMissing: 'Choisissez un motif.',
  sending: 'Envoi en cours…',
  sentTitle: 'Signalement transmis',
  sentBody: "Un membre de l'équipe de modération l'examinera dans les {n} heures.",
  sentBodyNoHours: "Un membre de l'équipe de modération l'examinera.",
  blockedTitle: 'Profil bloqué',
  blockedBody: 'Ce membre ne peut plus consulter votre fiche ni vous contacter.',
  toDiscover: 'Retour à la découverte',
  toChats: 'Retour aux discussions',
  unavailable: "Ce profil n'est pas disponible.",
  unavailableName: 'Profil indisponible',
  loading: 'Chargement…',
  loadError: 'Chargement impossible. Vérifiez votre connexion et réessayez.',
  retry: 'Réessayer',
  sendError: 'Envoi impossible. Vérifiez votre connexion et réessayez.',
  sessionExpired: 'Votre session a expiré. Reconnectez-vous.',
  signInAgain: 'Se reconnecter',
  counter: '{n}/{max}',
} as const

export const REPORT_PATH = '/signaler'
export const DETAILS_COUNTER_FROM = 900

const CITY: Record<string, string> = {
  ouagadougou: 'Ouagadougou',
  bobo: 'Bobo-Dioulasso',
  koudougou: 'Koudougou',
  ouahigouya: 'Ouahigouya',
  banfora: 'Banfora',
  dedougou: 'Dédougou',
  fada: "Fada N'Gourma",
  autre: 'Autre localité',
}

const STYLE = `<style id="report-style">
#report-block [hidden] { display: none !important; }
#report-block, #report-block * { min-width: 0; }
#report-block .report-name { overflow-wrap: anywhere; }
#report-block a:focus-visible, #report-block button:focus-visible, #report-block textarea:focus-visible, #report-block input:focus-visible { outline: 2px solid #7D5F27; outline-offset: 2px; }
#report-block .report-reason:has(input:checked) { border-color: #0B1D36; background-color: #FFFFFF; }
#report-block .report-reason:focus-within { border-color: #7D5F27; }
#report-block button[disabled] { opacity: 0.6; cursor: not-allowed; }
.report-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>`

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const quiet =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-md border border-hairline bg-cream text-sm font-medium text-deep-navy hover:border-deep-navy/30'

const SCRIPT = `var COPY = ${JSON.stringify(REPORT_COPY)}
var CITY = ${JSON.stringify(CITY)}
var ROOT = document.getElementById('report-block')
var TARGET = ROOT.getAttribute('data-target-id')
var CONVERSATION = ROOT.getAttribute('data-conversation-id') || ''
var MESSAGE = ROOT.getAttribute('data-message-id') || ''
var busy = false
function el(id) { return document.getElementById(id) }
function show(id, on) { var node = el(id); if (node) node.hidden = !on }
function readJson(response) {
  return response.json().catch(function () { return null }).then(function (payload) { return { status: response.status, payload: payload } })
}
function errorMessage(result, fallback) {
  var payload = result.payload
  if (result.status >= 500 || !payload || !payload.error || typeof payload.error.message !== 'string') return fallback
  return payload.error.message
}
function unavailable() { show('report-loading', false); show('report-unavailable', true) }
function paintTarget(name, city) {
  el('report-target-name').textContent = name
  el('report-target-city').textContent = city ? ' (' + city + ')' : ''
  show('report-loading', false)
  show('report-card', true)
}
function load() {
  show('report-load-error', false)
  show('report-loading', true)
  ROOT.setAttribute('aria-busy', 'true')
  var url = CONVERSATION ? '/v1/conversations/' + encodeURIComponent(CONVERSATION) : '/v1/profiles/' + encodeURIComponent(TARGET)
  return fetch(url, { credentials: 'same-origin' }).then(readJson).then(function (result) {
    ROOT.setAttribute('aria-busy', 'false')
    if (result.status === 404) { unavailable(); return }
    if (result.status === 401) { show('report-loading', false); el('report-load-error-text').textContent = COPY.sessionExpired; show('report-load-error', true); show('report-load-signin', true); return }
    if (result.status !== 200 || !result.payload) {
      show('report-loading', false)
      el('report-load-error-text').textContent = errorMessage(result, COPY.loadError)
      show('report-load-error', true)
      return
    }
    if (CONVERSATION) {
      var conversation = result.payload.conversation
      if (!conversation || conversation.other_id !== TARGET) { unavailable(); return }
      var other = conversation.other || {}
      paintTarget(conversation.pseudonym || COPY.unavailableName, other.available && other.city ? (CITY[other.city] || other.city) : '')
      return
    }
    var profile = result.payload.profile
    if (!profile) { unavailable(); return }
    paintTarget(profile.pseudonym, profile.city ? (CITY[profile.city] || profile.city) : '')
  }).catch(function () {
    ROOT.setAttribute('aria-busy', 'false')
    show('report-loading', false)
    el('report-load-error-text').textContent = COPY.loadError
    show('report-load-error', true)
  })
}
function chosenReason() {
  var picked = document.querySelector('input[name="report_reason"]:checked')
  return picked ? picked.value : ''
}
function setBusy(on) {
  busy = on
  el('report-submit').disabled = on
  el('report-block-only').disabled = on
  el('report-status').textContent = on ? COPY.sending : ''
}
function failWith(result) {
  if (result && result.status === 401) {
    var box = el('report-error')
    while (box.firstChild) box.removeChild(box.firstChild)
    box.appendChild(document.createTextNode(COPY.sessionExpired + ' '))
    var link = document.createElement('a')
    link.className = 'underline font-medium'
    link.href = '/auth'
    link.textContent = COPY.signInAgain
    box.appendChild(link)
  } else {
    el('report-error').textContent = result ? errorMessage(result, COPY.sendError) : COPY.sendError
  }
  show('report-error', true)
}
function done(title, lines) {
  el('report-done-title').textContent = title
  var body = el('report-done-body')
  while (body.firstChild) body.removeChild(body.firstChild)
  for (var index = 0; index < lines.length; index += 1) {
    var p = document.createElement('p')
    p.textContent = lines[index]
    body.appendChild(p)
  }
  show('report-card', false)
  show('report-done', true)
  var heading = el('report-done-title')
  heading.focus()
}
function submitReport() {
  if (busy) return
  show('report-error', false)
  var reason = chosenReason()
  if (!reason) {
    el('report-reason-error').textContent = COPY.reasonMissing
    show('report-reason-error', true)
    el('report-reasons').setAttribute('aria-invalid', 'true')
    var first = document.querySelector('input[name="report_reason"]')
    if (first) first.focus()
    return
  }
  show('report-reason-error', false)
  el('report-reasons').removeAttribute('aria-invalid')
  var block = el('report-block-toggle').checked
  var body = MESSAGE
    ? { target_kind: 'message', target_id: MESSAGE, reason: reason, block: block }
    : { target_kind: 'profile', target_id: TARGET, reason: reason, block: block }
  var details = el('report-details').value.trim()
  if (details) body.details = details
  setBusy(true)
  fetch('/v1/reports', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }).then(readJson).then(function (result) {
    setBusy(false)
    if (result.status !== 201 || !result.payload || !result.payload.report) { failWith(result); return }
    var hours = result.payload.sla_hours
    var lines = [typeof hours === 'number' ? COPY.sentBody.replace('{n}', String(hours)) : COPY.sentBodyNoHours]
    if (result.payload.blocked) lines.push(COPY.blockedBody)
    done(COPY.sentTitle, lines)
  }).catch(function () { setBusy(false); failWith(null) })
}
function blockOnly() {
  if (busy) return
  show('report-error', false)
  setBusy(true)
  fetch('/v1/blocks', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blocked_id: TARGET })
  }).then(readJson).then(function (result) {
    setBusy(false)
    if ((result.status !== 201 && result.status !== 200) || !result.payload || !result.payload.block) { failWith(result); return }
    done(COPY.blockedTitle, [COPY.blockedBody])
  }).catch(function () { setBusy(false); failWith(null) })
}
var details = el('report-details')
details.addEventListener('input', function () {
  var length = Array.from ? Array.from(details.value).length : details.value.length
  var counter = el('report-details-counter')
  counter.textContent = COPY.counter.replace('{n}', String(length)).replace('{max}', '${REPORT_DETAILS_MAX}')
  counter.hidden = length < ${DETAILS_COUNTER_FROM}
})
Array.prototype.forEach.call(document.querySelectorAll('input[name="report_reason"]'), function (input) {
  input.addEventListener('change', function () { show('report-reason-error', false); el('report-reasons').removeAttribute('aria-invalid') })
})
el('report-form').addEventListener('submit', function (event) { event.preventDefault(); submitReport() })
el('report-block-only').addEventListener('click', function (event) { event.preventDefault(); blockOnly() })
el('report-retry').addEventListener('click', function (event) { event.preventDefault(); load() })
load()`

export type ReportContext = { targetId: string; conversationId: string | null; messageId: string | null }

function reasonOption(code: string, label: string): string {
  return `<label class="report-reason relative flex items-center justify-between gap-3 min-h-[48px] p-3.5 rounded-md border border-hairline/80 bg-cream/50 hover:bg-cream hover:border-soft-gold cursor-pointer transition-colors duration-150">
<span class="flex items-center gap-3"><input class="h-4 w-4 shrink-0 text-deep-navy border-hairline focus:ring-soft-gold focus:ring-offset-0 bg-cream" name="report_reason" type="radio" value="${code}"><span class="text-sm text-deep-navy font-medium">${escapeHtml(label)}</span></span>
<span class="material-symbols-outlined text-[#7D5F27] text-lg shrink-0" aria-hidden="true">check_circle</span>
</label>`
}

function reportMain(context: ReportContext): string {
  const fromChat = context.conversationId !== null
  const back = fromChat ? `/discussions/${context.conversationId}` : `/profil/${context.targetId}`
  const backLabel = fromChat ? REPORT_COPY.backChat : REPORT_COPY.backProfile
  const cancelLabel = fromChat ? REPORT_COPY.cancelChat : REPORT_COPY.cancelProfile
  const after = fromChat ? '/discussions' : '/decouvrir'
  const afterLabel = fromChat ? REPORT_COPY.toChats : REPORT_COPY.toDiscover
  const reasons = REPORT_REASONS.map((item) => reasonOption(item.code, item.label)).join('\n')
  return `<main id="report-block" data-target-id="${context.targetId}" data-conversation-id="${context.conversationId ?? ''}" data-message-id="${context.messageId ?? ''}" aria-busy="true" class="flex-grow w-full max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 pb-20 md:pb-12 min-w-0">
<div class="mb-6">
<a href="${back}" class="inline-flex items-center gap-2 min-h-[44px] text-sm font-medium text-deep-navy/80 hover:text-deep-navy"><span class="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span><span>${backLabel}</span></a>
</div>
<p id="report-loading" class="text-sm text-deep-navy/80">${REPORT_COPY.loading}</p>
<div id="report-load-error" hidden class="rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
<p id="report-load-error-text" role="alert" class="text-sm text-deep-navy break-words">${REPORT_COPY.loadError}</p>
<button id="report-retry" type="button" class="${quiet}">${REPORT_COPY.retry}</button>
<a id="report-load-signin" hidden href="/auth" class="${quiet}">${REPORT_COPY.signInAgain}</a>
</div>
<div id="report-unavailable" hidden class="rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
<p role="alert" class="text-sm text-deep-navy">${REPORT_COPY.unavailable}</p>
<a href="${after}" class="${quiet}">${afterLabel}</a>
</div>
<section id="report-done" hidden class="bg-cream rounded-md border border-hairline p-6 md:p-10" style="background-color: rgb(251, 248, 241);">
<div class="flex items-center gap-3.5 mb-3">
<div class="w-10 h-10 rounded-full bg-cream border border-hairline flex items-center justify-center text-[#7D5F27] shrink-0"><span class="material-symbols-outlined text-xl" aria-hidden="true">verified_user</span></div>
<h1 id="report-done-title" tabindex="-1" class="font-display text-2xl md:text-3xl text-deep-navy font-normal leading-tight"></h1>
</div>
<div id="report-done-body" role="status" class="space-y-2 text-sm text-deep-navy/90 leading-relaxed"></div>
<a href="${after}" class="mt-6 ${quiet}">${afterLabel}</a>
</section>
<div id="report-card" hidden class="bg-cream rounded-md border border-hairline p-5 sm:p-6 md:p-10" style="background-color: rgb(251, 248, 241);">
<div class="border-b border-hairline/60 pb-7">
<div class="flex items-center gap-3.5 mb-3">
<div class="w-10 h-10 rounded-full bg-cream border border-hairline flex items-center justify-center text-[#7D5F27] shrink-0"><span class="material-symbols-outlined text-xl" aria-hidden="true">security</span></div>
<div>
<p class="text-[11px] font-semibold tracking-wider text-[#7D5F27] uppercase">${escapeHtml(REPORT_COPY.eyebrow)}</p>
<h1 class="font-display text-2xl md:text-3xl text-deep-navy font-normal mt-0.5 leading-tight">${REPORT_COPY.title}</h1>
</div>
</div>
<p class="text-sm text-deep-navy/80 leading-relaxed mt-3">${REPORT_COPY.intro}</p>
<p class="mt-4 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-cream border border-hairline text-xs text-deep-navy/90 max-w-full"><span class="material-symbols-outlined text-sm text-[#7D5F27]" aria-hidden="true">person</span><span class="report-name">${REPORT_COPY.concerned} <strong id="report-target-name" class="font-semibold text-deep-navy"></strong><span id="report-target-city"></span></span></p>
${context.messageId ? `<p id="report-message-note" class="mt-3 text-xs text-deep-navy/80">${REPORT_COPY.messageConcerned}</p>` : ''}
</div>
<form id="report-form" class="mt-8 space-y-8" novalidate>
<fieldset id="report-reasons" aria-describedby="report-reason-error">
<legend class="w-full mb-3.5 flex flex-wrap items-baseline justify-between gap-2"><span class="text-sm font-semibold tracking-wide text-deep-navy">${REPORT_COPY.reasonLegend} <span class="text-[#7D5F27] font-normal">${REPORT_COPY.required}</span></span><span class="text-xs text-deep-navy/80 italic">${REPORT_COPY.reasonHint}</span></legend>
<div class="grid grid-cols-1 gap-2.5">
${reasons}
</div>
<p id="report-reason-error" role="alert" hidden class="mt-2 text-sm text-[#9B2C2C]"></p>
</fieldset>
<div>
<div class="flex items-baseline justify-between gap-2 mb-1.5">
<label class="block text-sm font-semibold text-deep-navy" for="report-details">${REPORT_COPY.detailsLabel} <span class="text-deep-navy/80 font-normal">${REPORT_COPY.optional}</span></label>
<span id="report-details-counter" hidden class="text-xs text-deep-navy/80"></span>
</div>
<textarea id="report-details" maxlength="${REPORT_DETAILS_MAX}" rows="3" placeholder="${escapeHtml(REPORT_COPY.detailsPlaceholder)}" class="w-full bg-cream rounded-md border border-hairline p-3 text-sm text-deep-navy placeholder:text-deep-navy/60 focus:border-soft-gold focus:ring-1 focus:ring-soft-gold resize-none outline-none leading-relaxed"></textarea>
</div>
<div class="pt-4 border-t border-hairline/60">
<div class="p-4 rounded-md bg-cream border border-hairline flex items-start gap-3">
<label for="report-block-toggle" class="report-check -m-3 flex items-center justify-center w-[44px] h-[44px] shrink-0 cursor-pointer"><input id="report-block-toggle" checked type="checkbox" aria-describedby="report-block-explain" class="h-5 w-5 text-deep-navy border-hairline rounded focus:ring-soft-gold focus:ring-offset-0 bg-cream cursor-pointer"></label>
<div class="text-sm leading-relaxed">
<label class="font-semibold text-deep-navy cursor-pointer" for="report-block-toggle">${REPORT_COPY.blockAlso}</label>
<p id="report-block-explain" class="text-deep-navy/80 mt-1 text-xs">${REPORT_COPY.blockExplain}</p>
</div>
</div>
</div>
<p id="report-error" role="alert" hidden class="text-sm text-[#9B2C2C] break-words"></p>
<p id="report-status" role="status" aria-live="polite" class="report-sr"></p>
<div class="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
<button id="report-submit" type="submit" class="w-full sm:w-auto min-h-[44px] px-7 py-3 rounded-md bg-deep-navy text-cream font-medium text-sm tracking-wide hover:opacity-95 border border-deep-navy inline-flex items-center justify-center gap-2"><span class="material-symbols-outlined text-base text-soft-gold" aria-hidden="true">send</span><span>${REPORT_COPY.submit}</span></button>
<a href="${back}" class="inline-flex items-center min-h-[44px] text-sm font-medium text-deep-navy/80 hover:text-deep-navy underline underline-offset-4 decoration-hairline">${cancelLabel}</a>
</div>
</form>
<div class="mt-8 pt-6 border-t border-hairline/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div class="text-sm">
<h2 class="font-semibold text-deep-navy">${REPORT_COPY.blockOnlyTitle}</h2>
<p class="text-xs text-deep-navy/80 mt-1">${REPORT_COPY.blockOnlyExplain}</p>
</div>
<button id="report-block-only" type="button" class="w-full sm:w-auto shrink-0 ${quiet}"><span class="material-symbols-outlined text-base text-[#9B2C2C] mr-1.5" aria-hidden="true">block</span><span>${REPORT_COPY.blockOnly}</span></button>
</div>
</div>
</main>`
}

/** `/signaler/<id>` from screen 23. Every id is a UUID (checked by the route), so it is safe in the attributes. */
export function reportBlockHtml(stitch: string, context: ReportContext): string {
  if (!isReportId(context.targetId) || (context.conversationId !== null && !isReportId(context.conversationId))) {
    throw new Error('reportBlockHtml needs UUID ids')
  }
  if (context.messageId !== null && (!isReportId(context.messageId) || context.conversationId === null)) {
    throw new Error('a message Report needs its conversation')
  }
  let html = stitch
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>AnKanu • Signaler ou bloquer</title>`)
  html = html.replace(/<main\b[\s\S]*<\/main>/, reportMain(context))
  html = html.includes('</head>') ? html.replace('</head>', `${STYLE}</head>`) : `${STYLE}${html}`
  const active = context.conversationId !== null ? 'discussions' : 'decouvrir'
  const built = prepareV2(withAppShell(html, { kind: 'member', active }), SCRIPT)
  const guard = pinGuardScript()
  return built.includes('</body>') ? built.replace('</body>', `${guard}</body>`) : `${built}${guard}`
}

export function isReportId(value: string): boolean {
  return isInviteTargetId(value)
}

/** Reads `discussion` and `message` from the query; a malformed or orphan value is dropped, never echoed. */
export function reportContext(targetId: string, search: URLSearchParams): ReportContext {
  const discussion = search.get('discussion')
  const conversationId = discussion && isReportId(discussion) ? discussion.toLowerCase() : null
  const message = search.get('message')
  const messageId = conversationId && message && isReportId(message) ? message.toLowerCase() : null
  return { targetId: targetId.toLowerCase(), conversationId, messageId }
}
