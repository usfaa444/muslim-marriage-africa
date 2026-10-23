import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

/**
 * Screen 18, Invite compose (Stories 4.1, 4.2). The Message Flash composer and Ice Breakers on the Stitch screen are
 * Story 4.3 and do not ship here. The page loads the recipient and the live quota in the browser, then sends.
 */

export const INVITE_COPY = {
  subtitle: 'Votre démarche sera transmise dans la solennité et le respect des convenances.',
  loading: 'Chargement…',
  unavailable: "Ce profil n'est pas disponible.",
  backToDiscover: 'Retour à Découvrir',
  loadError: 'Chargement impossible. Vérifiez votre connexion et réessayez.',
  retry: 'Réessayer',
  recipientLabel: 'Destinataire',
  verified: 'Profil engagé &amp; vérifié',
  photoReserved: 'Photographie de convenance réservée — consultable mutuellement après acceptation réciproque.',
  photoOkTitle: 'Condition préalable : Photographie de profil conforme enregistrée.',
  photoOkBody: "Votre dossier respecte les standards de décence AnKanu. L'envoi de demande est permis.",
  photoOkBadge: 'Conforme',
  photoMissingTitle: 'Condition préalable : une photographie de profil est requise.',
  photoMissingBody: 'Ajoutez une photo de profil pour envoyer une invitation.',
  photoMissingLink: 'Ajouter une photo',
  profileMissingTitle: 'Condition préalable : profil incomplet.',
  profileMissingBody: 'Complétez votre profil pour envoyer une invitation.',
  profileMissingLink: 'Compléter mon profil',
  daily: 'Disponibilité journalière',
  unlimitedNote: 'Invitations illimitées pour les abonnements engagés.',
  pack: 'Vous voulez des invitations illimitées ? Abonnez-vous !',
  wallTitle: 'Envoi refusé. Quota du jour atteint.',
  wallPremium: 'Avec Premium, invitations et messages illimités.',
  wallCta: 'Découvrir Premium',
  send: "Envoyer l'invitation Ta'aruf",
  sent: 'Invitation envoyée.',
  sentButton: 'Invitation envoyée',
  alreadySent: 'Invitation déjà envoyée.',
  sendError: 'Envoi impossible. Vérifiez votre connexion et réessayez.',
  cancel: 'Annuler et revenir au profil',
} as const

/**
 * Fay, 2026-10-23: at the daily limit the only offer is the Premium subscription, never a pack of a few Invites or
 * messages. No Premium page exists yet; Epic 10 (Story 10.1, one pricing page) owns this route.
 */
export const PREMIUM_PATH = '/premium'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isInviteTargetId(value: string): boolean {
  return UUID.test(value)
}

const HIDDEN = `<style id="invite-hidden">
#invite-compose [hidden] { display: none !important; }
#invite-compose, #invite-compose * { min-width: 0; max-width: 100%; }
#invite-recipient-name, #invite-back-label { overflow-wrap: anywhere; }
#invite-send[disabled] { opacity: 0.6; cursor: not-allowed; }
</style>`

const SCRIPT = `var CITY = {
  ouagadougou: 'Ouagadougou',
  bobo: 'Bobo-Dioulasso',
  koudougou: 'Koudougou',
  ouahigouya: 'Ouahigouya',
  banfora: 'Banfora',
  dedougou: 'Dédougou',
  fada: "Fada N'Gourma",
  autre: 'Autre localité'
}
var COPY = ${JSON.stringify({
  sent: INVITE_COPY.sent,
  sentButton: INVITE_COPY.sentButton,
  alreadySent: INVITE_COPY.alreadySent,
  sendError: INVITE_COPY.sendError,
  loadError: INVITE_COPY.loadError,
})}
var target = document.body.getAttribute('data-invite-target') || ''
var sending = false
var done = false
function el(id) { return document.getElementById(id) }
function show(id, on) { var node = el(id); if (node) node.hidden = !on }
function text(id, value) { var node = el(id); if (node) node.textContent = value }
function plural(count) { return count === 1 ? ' invitation disponible' : ' invitations disponibles' }
function resetText(iso) {
  var time = '00:00'
  try {
    time = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Ouagadougou', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  } catch (error) {}
  return 'Nouvelles invitations demain à partir de ' + time + ' (heure de Ouagadougou).'
}
function setSendable(on) {
  var button = el('invite-send')
  if (!button) return
  button.disabled = !on
  button.setAttribute('aria-disabled', on ? 'false' : 'true')
}
function wall(resetsAt) {
  show('invite-quota', false)
  show('invite-quota-wall', true)
  text('invite-wall-reset', resetText(resetsAt))
  setSendable(false)
}
function paintQuota(quota) {
  show('invite-quota-wall', false)
  show('invite-quota', true)
  if (quota && quota.capped === true) {
    if (quota.remaining <= 0) {
      wall(quota.resets_at)
      return false
    }
    text('invite-quota-line', "Invitations libres restantes aujourd'hui : " + quota.remaining + plural(quota.remaining))
    text('invite-quota-pill', "Invitations restantes aujourd'hui : " + quota.remaining)
    show('invite-quota-pill', true)
    show('invite-quota-note', true)
    show('invite-quota-pack', true)
    return true
  }
  text('invite-quota-line', quota && quota.unlimited === true ? 'Invitations illimitées (Premium).' : 'Invitations illimitées.')
  show('invite-quota-pill', false)
  show('invite-quota-note', false)
  show('invite-quota-pack', false)
  return true
}
function paintReadiness(sender) {
  var photo = !!(sender && sender.photo)
  var ready = !!(sender && sender.profile_ready)
  show('invite-photo-ok', photo)
  show('invite-photo-missing', !photo)
  show('invite-profile-missing', photo && !ready)
}
function paintRecipient(body) {
  var profile = body.profile || {}
  var name = String(profile.pseudonym || '')
  var age = typeof profile.age === 'number' ? ', ' + profile.age + ' ans' : ''
  text('invite-recipient-name', name + age)
  var city = profile.city ? (CITY[profile.city] || profile.city) : ''
  text('invite-recipient-city', city)
  show('invite-recipient-city-wrap', city !== '')
  show('invite-recipient-verified', !!(body.verification && body.verification.id))
  text('invite-back-label', 'Retour au profil de ' + name)
}
function unavailable() {
  show('invite-loading', false)
  show('invite-form', false)
  show('invite-load-error', false)
  show('invite-unavailable', true)
}
function loadFailed(message) {
  show('invite-loading', false)
  show('invite-form', false)
  show('invite-load-error', true)
  text('invite-load-error-text', message || COPY.loadError)
}
function errorMessage(payload, fallback) {
  return payload && payload.error && typeof payload.error.message === 'string' ? payload.error.message : fallback
}
function readJson(response) {
  return response.json().catch(function () { return null }).then(function (payload) { return { status: response.status, payload: payload } })
}
function load() {
  show('invite-loading', true)
  show('invite-load-error', false)
  var section = el('invite-compose')
  if (section) section.setAttribute('aria-busy', 'true')
  Promise.all([
    fetch('/v1/profiles/' + encodeURIComponent(target), { credentials: 'same-origin' }).then(readJson),
    fetch('/v1/invites/quota', { credentials: 'same-origin' }).then(readJson)
  ]).then(function (results) {
    if (section) section.setAttribute('aria-busy', 'false')
    var profile = results[0]
    var quota = results[1]
    if (profile.status === 404) { unavailable(); return }
    if (profile.status !== 200 || !profile.payload || !profile.payload.profile) { loadFailed(errorMessage(profile.payload, COPY.loadError)); return }
    if (quota.status !== 200 || !quota.payload) { loadFailed(errorMessage(quota.payload, COPY.loadError)); return }
    paintRecipient(profile.payload)
    paintReadiness(quota.payload.sender)
    var open = paintQuota(quota.payload)
    show('invite-loading', false)
    show('invite-form', true)
    setSendable(open && !done)
  }).catch(function () {
    if (section) section.setAttribute('aria-busy', 'false')
    loadFailed(COPY.loadError)
  })
}
function sendInvite() {
  if (sending || done || !target) return
  sending = true
  setSendable(false)
  show('invite-error', false)
  text('invite-status', '')
  fetch('/v1/invites', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to_id: target })
  }).then(readJson).then(function (result) {
    sending = false
    var payload = result.payload
    if (result.status === 201 || result.status === 200) {
      done = true
      if (payload && payload.quota) paintQuota(payload.quota)
      text('invite-status', result.status === 201 ? COPY.sent : COPY.alreadySent)
      text('invite-send-label', COPY.sentButton)
      setSendable(false)
      return
    }
    var details = payload && payload.error && payload.error.details ? payload.error.details : {}
    var code = payload && payload.error ? payload.error.code : ''
    if (result.status === 429 && code === 'QUOTA_EXCEEDED') {
      wall(details.resets_at)
      return
    }
    if (result.status === 404) { unavailable(); return }
    if (result.status === 403 && details.reason === 'photo_required') {
      paintReadiness({ photo: false, profile_ready: true })
      text('invite-error', errorMessage(payload, COPY.sendError))
      show('invite-error', true)
      var link = el('invite-photo-link')
      if (link) link.focus()
      return
    }
    if (result.status === 403 && details.reason === 'profile_incomplete') {
      paintReadiness({ photo: true, profile_ready: false })
      text('invite-error', errorMessage(payload, COPY.sendError))
      show('invite-error', true)
      return
    }
    text('invite-error', errorMessage(payload, COPY.sendError))
    show('invite-error', true)
    setSendable(true)
  }).catch(function () {
    sending = false
    text('invite-error', COPY.sendError)
    show('invite-error', true)
    setSendable(true)
  })
}
var sendButton = el('invite-send')
if (sendButton) sendButton.addEventListener('click', function (event) { event.preventDefault(); sendInvite() })
var retryButton = el('invite-retry')
if (retryButton) retryButton.addEventListener('click', function (event) { event.preventDefault(); load() })
setTimeout(load, 0)`

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function composeSection(profileHref: string): string {
  const card = 'rounded-md border border-hairline/70 bg-[#FBF8F1] p-5 md:p-6 shadow-[0_1px_3px_rgba(11,29,54,0.03)]'
  const condition = 'rounded-md border border-hairline/70 bg-hairline/20 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3'
  const quiet = 'inline-flex items-center justify-center min-h-[44px] px-4 rounded-md border border-hairline bg-cream text-sm font-medium text-deep-navy hover:border-deep-navy/30'
  return `<section class="space-y-6" id="invite-compose" aria-busy="true">
<p id="invite-loading" class="text-sm text-deep-navy/80">${INVITE_COPY.loading}</p>
<div id="invite-unavailable" hidden role="alert" class="${condition}">
<p class="text-sm text-deep-navy">${INVITE_COPY.unavailable}</p>
<a class="${quiet}" href="/decouvrir">${INVITE_COPY.backToDiscover}</a>
</div>
<div id="invite-load-error" hidden class="${condition}">
<p id="invite-load-error-text" role="alert" class="text-sm text-deep-navy break-words">${INVITE_COPY.loadError}</p>
<button id="invite-retry" type="button" class="${quiet}">${INVITE_COPY.retry}</button>
</div>
<div id="invite-form" hidden class="space-y-6">
<!-- RECIPIENT RECAP CARD -->
<div class="${card}">
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div class="space-y-1">
<span class="text-xs uppercase tracking-wider text-deep-navy/70 font-semibold block">${INVITE_COPY.recipientLabel}</span>
<div class="flex items-center gap-2.5">
<span class="material-symbols-outlined text-deep-navy/60 text-xl" data-icon="person" aria-hidden="true">person</span>
<p class="font-display text-xl text-deep-navy">À l'attention de : <span id="invite-recipient-name"></span><span id="invite-recipient-city-wrap" hidden> <span class="text-deep-navy/60 font-body text-base font-normal" aria-hidden="true">•</span> <span id="invite-recipient-city" class="font-body text-sm text-deep-navy/80"></span></span></p>
</div>
</div>
<div id="invite-recipient-verified" hidden class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-hairline/25 border border-hairline/50 text-xs text-deep-navy/80 self-start sm:self-center">
<span class="material-symbols-outlined text-soft-gold text-sm" data-icon="verified_user" aria-hidden="true">verified_user</span>
<span>${INVITE_COPY.verified}</span>
</div>
</div>
<div class="mt-4 pt-3.5 border-t border-hairline/40 flex items-start gap-2.5 text-xs text-deep-navy/80">
<span class="material-symbols-outlined text-deep-navy/60 text-base flex-shrink-0 mt-0.5" data-icon="lock" aria-hidden="true">lock</span>
<p>${INVITE_COPY.photoReserved}</p>
</div>
</div>
<!-- PHOTO REQUIREMENT STATUS -->
<div id="invite-photo-ok" hidden class="${condition}">
<div class="flex items-center gap-3">
<div class="w-7 h-7 rounded-full bg-cream border border-soft-gold/60 flex items-center justify-center flex-shrink-0">
<span class="material-symbols-outlined text-soft-gold text-base" data-icon="check" aria-hidden="true">check</span>
</div>
<div>
<p class="text-xs md:text-sm font-medium text-deep-navy">${INVITE_COPY.photoOkTitle}</p>
<p class="text-[11px] text-deep-navy/80">${INVITE_COPY.photoOkBody}</p>
</div>
</div>
<span class="text-xs font-medium text-deep-navy/80">${INVITE_COPY.photoOkBadge}</span>
</div>
<div id="invite-photo-missing" hidden class="${condition}">
<div class="flex items-center gap-3">
<div class="w-7 h-7 rounded-full bg-cream border border-deep-navy/40 flex items-center justify-center flex-shrink-0">
<span class="material-symbols-outlined text-deep-navy text-base" data-icon="add_a_photo" aria-hidden="true">add_a_photo</span>
</div>
<div>
<p class="text-xs md:text-sm font-medium text-deep-navy">${INVITE_COPY.photoMissingTitle}</p>
<p class="text-[11px] text-deep-navy/80">${INVITE_COPY.photoMissingBody}</p>
</div>
</div>
<a id="invite-photo-link" class="${quiet}" href="/profile-edit">${INVITE_COPY.photoMissingLink}</a>
</div>
<div id="invite-profile-missing" hidden class="${condition}">
<div>
<p class="text-xs md:text-sm font-medium text-deep-navy">${INVITE_COPY.profileMissingTitle}</p>
<p class="text-[11px] text-deep-navy/80">${INVITE_COPY.profileMissingBody}</p>
</div>
<a class="${quiet}" href="/profile-edit">${INVITE_COPY.profileMissingLink}</a>
</div>
<!-- MAHRAM & INTEGRITY BANNER -->
<div class="rounded-md border border-hairline/70 bg-cream p-4 md:p-5 flex items-start gap-3.5">
<span class="material-symbols-outlined text-soft-gold text-xl flex-shrink-0 mt-0.5" data-icon="family_restroom" aria-hidden="true">family_restroom</span>
<div class="space-y-1">
<h2 class="text-xs uppercase tracking-wider text-deep-navy font-semibold">Protocole &amp; Rôle du Tuteur (Wali)</h2>
<p class="text-xs text-deep-navy/80 leading-relaxed">En cas d'accord mutuel pour commencer la conversation, les correspondances ultérieures sont conduites en lien ou avec notification au tuteur légal (Wali / Mahram), si l'un d'entre vous l'a inclus à la conversation.</p>
</div>
</div>
<!-- QUOTA -->
<div id="invite-quota" class="rounded-md border border-hairline/70 bg-hairline/20 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div class="space-y-1">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-deep-navy/60 text-base" data-icon="hourglass_empty" aria-hidden="true">hourglass_empty</span>
<h2 class="text-xs font-semibold text-deep-navy uppercase tracking-wide">${INVITE_COPY.daily}</h2>
</div>
<p id="invite-quota-line" class="text-xs text-deep-navy/80"></p>
<p id="invite-quota-pack" data-testid="invite-quota-pack" hidden class="text-sm text-deep-navy">${INVITE_COPY.pack}</p>
</div>
<div class="flex-shrink-0 text-left sm:text-right">
<div id="invite-quota-pill" hidden class="inline-block px-3 py-1 rounded bg-cream border border-hairline text-deep-navy font-mono text-xs font-semibold"></div>
<span id="invite-quota-note" hidden class="block text-[11px] text-deep-navy/80 mt-1">${INVITE_COPY.unlimitedNote}</span>
</div>
</div>
<div id="invite-quota-wall" hidden role="alert" class="rounded-md border border-deep-navy/30 bg-hairline/30 p-4 md:p-5 space-y-1.5">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-deep-navy text-base" data-icon="hourglass_disabled" aria-hidden="true">hourglass_disabled</span>
<h2 class="text-sm font-semibold text-deep-navy">${INVITE_COPY.wallTitle}</h2>
</div>
<p id="invite-wall-reset" class="text-xs text-deep-navy/80"></p>
<p class="text-sm text-deep-navy">${INVITE_COPY.wallPremium}</p>
<a data-testid="invite-premium-link" class="${quiet}" href="${PREMIUM_PATH}">${INVITE_COPY.wallCta}</a>
</div>
<!-- PRIMARY ACTIONS BLOCK -->
<div class="pt-4 flex flex-col items-center gap-4">
<button id="invite-send" disabled aria-disabled="true" class="w-full sm:w-auto sm:min-w-[280px] min-h-[44px] px-8 py-3.5 rounded-md bg-deep-navy text-cream hover:bg-deep-navy/90 text-sm font-medium tracking-wide flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99]" type="button">
<span id="invite-send-label">${INVITE_COPY.send}</span>
<span class="material-symbols-outlined text-soft-gold text-lg" data-icon="arrow_forward" aria-hidden="true">arrow_forward</span>
</button>
<p id="invite-status" role="status" aria-live="polite" class="text-sm text-deep-navy font-medium"></p>
<p id="invite-error" data-testid="invite-error" hidden role="alert" class="text-sm text-deep-navy break-words text-center"></p>
<a class="inline-flex items-center min-h-[44px] text-xs text-deep-navy/80 hover:text-deep-navy underline underline-offset-4 decoration-hairline transition-colors" href="${profileHref}">${INVITE_COPY.cancel}</a>
</div>
</div>
</section>`
}

/** Screen 18 for one recipient id. The caller has already checked the id shape. */
export function inviteComposeHtml(stitch: string, targetId: string): string {
  const id = escapeHtml(targetId)
  const profileHref = `/profil/${id}`
  let html = stitch
  html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>AnKanu • Invitation Ta'aruf</title>")
  html = html.replace('<body class="bg-cream', `<body data-invite-target="${id}" class="bg-cream`)
  html = html.replace(
    /<a class="inline-flex items-center gap-2 text-sm text-deep-navy\/70[^"]*" href="#">\s*<span class="material-symbols-outlined text-lg" data-icon="arrow_back">arrow_back<\/span>\s*<span class="">Retour au profil de Al-Hassan_BF<\/span>\s*<\/a>/,
    `<a class="inline-flex items-center gap-2 min-h-[44px] text-sm text-deep-navy/80 hover:text-deep-navy transition-colors font-medium" href="${profileHref}">
<span class="material-symbols-outlined text-lg" data-icon="arrow_back" aria-hidden="true">arrow_back</span>
<span id="invite-back-label">Retour au profil</span>
</a>`,
  )
  html = html.replace(
    /<p class="mt-2 text-deep-navy\/70 text-sm md:text-base leading-relaxed max-w-2xl">[\s\S]*?<\/p>/,
    `<p class="mt-2 text-deep-navy/80 text-sm md:text-base leading-relaxed max-w-2xl">${INVITE_COPY.subtitle}</p>`,
  )
  html = html.replace(/<section class="space-y-6">[\s\S]*<\/section>/, composeSection(profileHref))
  html = html.replace('class="flex-grow w-full max-w-4xl mx-auto px-6 md:px-8 pt-8 pb-28"', 'class="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-28 min-w-0"')
  html = html.includes('</head>') ? html.replace('</head>', `${HIDDEN}</head>`) : `${HIDDEN}${html}`
  const page = prepareV2(html, SCRIPT)
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}
