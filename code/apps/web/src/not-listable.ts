/** Honest browse hold. Screen 12 card inside the shared app shell. No sample profile. */

import { withAppShell } from './app-shell'
import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

export const HOLD_NOTE = "Votre profil doit être validé avant de consulter d'autres profils."
export const PHOTO_TITLE = 'Photo en revue — pas encore publique.'
const ID_ABSENT = "La pièce d'identité est manquante."
const LIVE_ABSENT = "La photo de présence est manquante."
const ID_OPEN = "Pièce officielle d'identité"
const LIVE_OPEN = 'Photo de présence'
const PHOTO_ROW = 'Photographie de profil'
const BIO_ROW = 'Présentation & Bio'
const PROFILE_ROW = 'Profil'
const EN_REVUE = 'En revue'
const EN_COURS = "En cours d'évaluation"
const LINK_LABEL = 'fiche personnelle'
const PRIVACY =
  "Aucune photographie personnelle ni élément privé n'est indexé par les moteurs de recherche ni exposé sans consentement mutuel préalable et protocole d'introduction noble."

export type HoldReason = {
  code: string
  sla_hours?: number
  missing?: string[]
  state?: 'absent' | 'open'
}

export function readHoldReasons(details: unknown): HoldReason[] {
  if (typeof details !== 'object' || details === null) {
    return []
  }
  const reasons = (details as { reasons?: unknown }).reasons
  if (!Array.isArray(reasons)) {
    return []
  }
  const out: HoldReason[] = []
  for (const item of reasons) {
    if (typeof item !== 'object' || item === null) {
      continue
    }
    const code = (item as { code?: unknown }).code
    if (typeof code !== 'string' || code.length === 0 || code.length > 64) {
      continue
    }
    const reason: HoldReason = { code }
    const sla = (item as { sla_hours?: unknown }).sla_hours
    if (typeof sla === 'number' && Number.isInteger(sla) && sla > 0 && sla < 1000) {
      reason.sla_hours = sla
    }
    const state = (item as { state?: unknown }).state
    if (state === 'absent' || state === 'open') {
      reason.state = state
    }
    const missing = (item as { missing?: unknown }).missing
    if (Array.isArray(missing)) {
      reason.missing = missing
        .filter((name): name is string => typeof name === 'string' && name.length > 0 && name.length < 80)
        .slice(0, 8)
    }
    out.push(reason)
  }
  return out
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, badge: string): string {
  const chip = badge
    ? `<span class="inline-flex items-center text-xs font-medium text-soft-gold bg-cream px-2.5 py-0.5 rounded border border-hairline/60 shrink-0">${escapeHtml(badge)}</span>`
    : ''
  return `<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm py-1 min-w-0"><span class="font-body text-deep-navy/90 font-medium min-w-0 break-words">${escapeHtml(label)}</span>${chip}</div>`
}

function incompleteRow(missing: string[] | undefined): string {
  const names = (missing ?? []).filter((name) => name.length > 0).join(', ')
  const label = names ? `« Il manque : ${names} »` : LINK_LABEL
  return `<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm py-1 min-w-0"><span class="font-body text-deep-navy/90 font-medium min-w-0 break-words">${escapeHtml(label)}</span><a class="inline-flex items-center text-xs font-medium text-deep-navy underline min-h-[44px]" href="/profile-edit">${LINK_LABEL}</a></div>`
}

export function holdCard(details: unknown): string {
  const reasons = readHoldReasons(details)
  let photo = false
  let review = false
  let capture = false
  let hours = 0
  const rows: string[] = []
  for (const item of reasons) {
    if (item.code === 'photo_review' || item.code === 'bio_review' || item.code === 'profile_review') {
      review = true
      if (item.sla_hours) {
        hours = item.sla_hours
      }
    }
    if (item.code === 'photo_review') {
      photo = true
      rows.push(row(PHOTO_ROW, EN_REVUE))
    } else if (item.code === 'bio_review') {
      rows.push(row(BIO_ROW, EN_REVUE))
    } else if (item.code === 'profile_review') {
      rows.push(row(PROFILE_ROW, EN_REVUE))
    } else if (item.code === 'id_document_pending') {
      capture = true
      rows.push(item.state === 'open' ? row(ID_OPEN, EN_COURS) : row(ID_ABSENT, ''))
    } else if (item.code === 'liveness_pending') {
      capture = true
      rows.push(item.state === 'open' ? row(LIVE_OPEN, EN_COURS) : row(LIVE_ABSENT, ''))
    } else if (item.code === 'profile_incomplete') {
      rows.push(incompleteRow(item.missing))
    }
  }
  const title = photo ? PHOTO_TITLE : HOLD_NOTE
  const tag = review ? EN_REVUE : capture ? EN_COURS : ''
  const sla = hours > 0 ? `Délai habituel de modération : ${hours} heures.` : ''
  return `<div class="w-full max-w-xl mx-auto min-w-0">
<div class="border border-hairline rounded-md p-8 md:p-11 shadow-none relative min-w-0" style="background-color: #FBF8F1;">
<div class="flex flex-col items-center text-center min-w-0">
<div class="w-14 h-14 rounded-full bg-cream border border-soft-gold/30 flex items-center justify-center mb-6">
<span class="material-symbols-outlined text-soft-gold text-2xl" data-icon="hourglass_top">hourglass_top</span>
</div>
<div id="discover-hold-tag" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream border border-hairline text-deep-navy text-xs font-semibold tracking-wide mb-4${tag ? '' : ' hidden'}"><span class="w-1.5 h-1.5 rounded-full bg-soft-gold"></span><span id="discover-hold-tag-text">${escapeHtml(tag)}</span></div>
<h1 id="discover-hold-title" class="font-display text-2xl md:text-3xl text-deep-navy font-normal mb-3 leading-snug break-words">${escapeHtml(title)}</h1>
<p id="discover-hold-note" class="font-body text-sm text-deep-navy/75 leading-relaxed max-w-md mx-auto mb-8 font-normal break-words${photo ? '' : ' hidden'}">${escapeHtml(HOLD_NOTE)}</p>
</div>
<div class="w-full h-px bg-hairline/80 my-2"></div>
<div id="discover-hold-list" class="py-6 space-y-4 min-w-0">${rows.join('')}</div>
<div class="mt-4 p-4 rounded bg-cream/70 border border-hairline/80 min-w-0">
<p class="font-body text-xs text-deep-navy/70 leading-relaxed font-normal break-words">${escapeHtml(PRIVACY)}</p>
</div>
<p id="discover-hold-sla" class="text-xs text-deep-navy/50 text-center mt-8 pt-2 break-words${sla ? '' : ' hidden'}">${escapeHtml(sla)}</p>
</div>
</div>`
}

/** The hold card alone. The page around it (header, footer, bottom nav) is the shared app shell. */
export function discoverHoldShell(): string {
  return `<div id="discover-hold" hidden class="w-full min-w-0 max-w-full"><main class="flex-grow flex items-center justify-center px-4 sm:px-6 py-12 md:py-20 min-w-0">${holdCard({ reasons: [] })}</main></div>`
}

export function notListablePage(reviewSource: string, details: unknown): string {
  const headEnd = reviewSource.indexOf('</head>')
  const head = headEnd < 0 ? '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>AnKanu</title>' : reviewSource.slice(0, headEnd)
  const body = `<body class="min-h-full flex flex-col bg-[#F7F1E3] text-deep-navy font-body antialiased selection:bg-gold-soft selection:text-deep-navy">
<main class="flex-grow flex items-center justify-center px-4 sm:px-6 py-12 md:py-20 min-w-0">${holdCard(details)}</main>
</body></html>`
  const page = prepareV2(withAppShell(`${head}</head>${body}`, { kind: 'member', active: 'decouvrir' }), '')
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}

export const NOT_LISTABLE_CLIENT = `
function paintHold(node, show) {
  if (!node) return
  node.hidden = !show
  if (show) node.classList.remove('hidden')
  else node.classList.add('hidden')
}
function showNotListable(message, details) {
  clearBrowseCache()
  cardMemory = null
  memory = null
  cardMemoryAt = 0
  memoryAt = 0
  var cardPane = document.getElementById('discover-card')
  var gridPane = document.getElementById('discover-grid')
  var modal = document.getElementById('filters-modal')
  var discoverMain = document.getElementById('discover-main')
  if (discoverMain) discoverMain.hidden = true
  if (cardPane) cardPane.hidden = true
  if (gridPane) gridPane.hidden = true
  if (modal) modal.hidden = true
  var hold = document.getElementById('discover-hold')
  if (!hold) return
  hold.hidden = false
  var reasons = details && Array.isArray(details.reasons) ? details.reasons : []
  var list = document.getElementById('discover-hold-list')
  var title = document.getElementById('discover-hold-title')
  var note = document.getElementById('discover-hold-note')
  var sla = document.getElementById('discover-hold-sla')
  if (note) note.textContent = ${JSON.stringify(HOLD_NOTE)}
  if (list) list.textContent = ''
  var photo = false
  var review = false
  var capture = false
  var hours = 0
  for (var index = 0; index < reasons.length; index += 1) {
    var item = reasons[index]
    if (!item || typeof item.code !== 'string') continue
    if (item.code === 'photo_review') photo = true
    if (item.code === 'photo_review' || item.code === 'bio_review' || item.code === 'profile_review') {
      review = true
      if (typeof item.sla_hours === 'number' && item.sla_hours > 0) hours = item.sla_hours
    }
    if (item.code === 'id_document_pending' || item.code === 'liveness_pending') capture = true
    var row = holdReasonRow(item)
    if (row && list) list.appendChild(row)
  }
  if (title) title.textContent = photo ? ${JSON.stringify(PHOTO_TITLE)} : ${JSON.stringify(HOLD_NOTE)}
  paintHold(note, photo)
  var tag = document.getElementById('discover-hold-tag')
  var tagText = document.getElementById('discover-hold-tag-text')
  if (tagText) tagText.textContent = review ? ${JSON.stringify(EN_REVUE)} : ${JSON.stringify(EN_COURS)}
  paintHold(tag, review || capture)
  if (sla) sla.textContent = hours > 0 ? 'Délai habituel de modération : ' + hours + ' heures.' : ''
  paintHold(sla, hours > 0)
}
function holdReasonRow(item) {
  var code = item.code
  var label = ''
  var badge = ''
  var link = false
  if (code === 'photo_review') { label = ${JSON.stringify(PHOTO_ROW)}; badge = ${JSON.stringify(EN_REVUE)} }
  else if (code === 'bio_review') { label = ${JSON.stringify(BIO_ROW)}; badge = ${JSON.stringify(EN_REVUE)} }
  else if (code === 'profile_review') { label = ${JSON.stringify(PROFILE_ROW)}; badge = ${JSON.stringify(EN_REVUE)} }
  else if (code === 'id_document_pending') {
    if (item.state === 'open') { label = ${JSON.stringify(ID_OPEN)}; badge = ${JSON.stringify(EN_COURS)} }
    else label = ${JSON.stringify(ID_ABSENT)}
  }
  else if (code === 'liveness_pending') {
    if (item.state === 'open') { label = ${JSON.stringify(LIVE_OPEN)}; badge = ${JSON.stringify(EN_COURS)} }
    else label = ${JSON.stringify(LIVE_ABSENT)}
  }
  else if (code === 'profile_incomplete') {
    link = true
    var names = []
    if (Array.isArray(item.missing)) {
      for (var i = 0; i < item.missing.length; i += 1) {
        if (typeof item.missing[i] === 'string' && item.missing[i]) names.push(item.missing[i])
      }
    }
    label = names.length ? '« Il manque : ' + names.join(', ') + ' »' : ${JSON.stringify(LINK_LABEL)}
  }
  else return null
  var row = document.createElement('div')
  row.className = 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm py-1 min-w-0'
  var text = document.createElement('span')
  text.className = 'font-body text-deep-navy/90 font-medium min-w-0 break-words'
  text.textContent = label
  row.appendChild(text)
  if (badge) {
    var chip = document.createElement('span')
    chip.className = 'inline-flex items-center text-xs font-medium text-soft-gold bg-cream px-2.5 py-0.5 rounded border border-hairline/60 shrink-0'
    chip.textContent = badge
    row.appendChild(chip)
  }
  if (link) {
    var anchor = document.createElement('a')
    anchor.href = '/profile-edit'
    anchor.className = 'inline-flex items-center text-xs font-medium text-deep-navy underline min-h-[44px]'
    anchor.textContent = ${JSON.stringify(LINK_LABEL)}
    row.appendChild(anchor)
  }
  return row
}
`
