import { prepareV2 } from './v2-document'

export type VisitSignalCard = {
  account_id: string
  pseudonym: string
  gender: 'sister' | 'brother'
  age: number | null
  city: string | null
  member_since: string
  id_verified: boolean
  profiles_viewed_24h: number
  invites_sent_24h: number
  over_threshold_at: string
}

export type VisitSignalPaint = {
  threshold: number
  window_hours: number
  generated_at: string
  count: number
  rows: VisitSignalCard[]
}

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

const HIDDEN = `<style id="visit-signals-fit">
#visit-root, #visit-list, #visit-dossier, #visit-list article { min-width: 0; max-width: 100%; }
#visit-stamp, #visit-list h2, #visit-list p, #visit-dossier p, #visit-dossier span { overflow-wrap: anywhere; }
#visit-empty[hidden], #visit-error[hidden], #visit-dossier[hidden], #visit-list[hidden], #visit-count[hidden] { display: none !important; }
</style>`

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function part(date: Date, type: Intl.DateTimeFormatPartTypes, options: Intl.DateTimeFormatOptions): string {
  return (
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Ouagadougou', ...options })
      .formatToParts(date)
      .find((item) => item.type === type)?.value ?? ''
  ).replaceAll('\u202f', '').replaceAll('\u00a0', '')
}

function capital(value: string): string {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function officialStamp(iso: string): string {
  const date = new Date(iso)
  const day = part(date, 'day', { day: 'numeric' })
  const month = capital(part(date, 'month', { month: 'long' }))
  const year = part(date, 'year', { year: 'numeric' })
  const hour = part(date, 'hour', { hour: '2-digit', hourCycle: 'h23' })
  const minute = part(date, 'minute', { minute: '2-digit' })
  const second = part(date, 'second', { second: '2-digit' })
  return `${day} ${month} ${year} • ${hour}:${minute}:${second} GMT (Ouagadougou)`
}

export function memberSinceLabel(iso: string): string {
  const date = new Date(iso)
  const month = capital(part(date, 'month', { month: 'long' }))
  const year = part(date, 'year', { year: 'numeric' })
  return `Membre depuis ${month} ${year}`
}

export function elapsedLabel(generatedIso: string, overIso: string): string {
  const ms = Math.max(0, new Date(generatedIso).getTime() - new Date(overIso).getTime())
  const total = Math.floor(ms / 60000)
  if (total < 60) {
    return `${total} min`
  }
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${hours}h ${minutes}min`
}

export function caseCountLabel(count: number): string {
  return count > 1 ? `${count} cas actifs` : `${count} cas actif`
}

export function cityLabel(city: string | null): string | null {
  if (!city) {
    return null
  }
  return CITY[city] ?? city
}

function genderLetter(gender: VisitSignalCard['gender']): 'F' | 'M' {
  return gender === 'sister' ? 'F' : 'M'
}

function memberLine(card: VisitSignalCard): string {
  const since = memberSinceLabel(card.member_since)
  const city = cityLabel(card.city)
  return city ? `${since} • ${city}` : since
}

function targetLine(card: VisitSignalCard): string {
  const letter = genderLetter(card.gender)
  if (card.age === null) {
    return `${card.pseudonym} (${letter})`
  }
  return `${card.pseudonym} (${letter} / ${card.age} ans)`
}

function emptySentence(threshold: number, windowHours: number): string {
  return `Aucun membre n'a consulté plus de ${threshold} fiches en ${windowHours}h sans envoyer d'invitation.`
}

function cardHtml(card: VisitSignalCard, selected: boolean, paint: VisitSignalPaint): string {
  const verified = card.id_verified
    ? `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-deep-navy/5 text-deep-navy border border-hairline/80 font-medium"><span class="material-symbols-outlined text-xs text-soft-gold" style="font-variation-settings: 'FILL' 1;">verified</span>Identité vérifiée</span>`
    : ''
  const badge = selected
    ? `<div class="absolute -top-2.5 right-4 bg-deep-navy text-cream text-[10px] uppercase font-semibold px-2 py-0.5 rounded tracking-wider">En cours d'examen</div>`
    : ''
  const action = selected
    ? `<button class="inline-flex items-center gap-1 text-deep-navy font-semibold hover:text-soft-gold transition-colors min-h-[44px]" type="button" data-select="${escapeHtml(card.account_id)}"><span>Fiche active</span><span class="material-symbols-outlined text-sm">arrow_forward</span></button>`
    : `<button class="text-deep-navy hover:text-soft-gold font-medium underline underline-offset-4 decoration-soft-gold transition-colors min-h-[44px]" type="button" data-select="${escapeHtml(card.account_id)}">Examiner la fiche</button>`
  const shell = selected
    ? 'rounded-md border-2 border-deep-navy p-5 shadow-sm relative transition-all min-w-0'
    : 'bg-cream rounded-md border border-hairline p-5 hover:border-deep-navy/40 transition-colors min-w-0'
  const elapsedIcon = selected
    ? '<span class="material-symbols-outlined text-sm text-soft-gold">crisis_alert</span>'
    : '<span class="material-symbols-outlined text-sm text-deep-navy/40">schedule</span>'
  const elapsedBorder = selected ? 'border-hairline/70' : 'border-hairline/60'
  return `<article data-visit-card data-account="${escapeHtml(card.account_id)}" class="${shell}" style="background-color: #FBF8F1;">${badge}<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"><div class="min-w-0"><div class="flex items-center gap-2.5 flex-wrap min-w-0"><h2 class="font-display text-lg font-semibold text-deep-navy break-words">${escapeHtml(card.pseudonym)}</h2>${verified}</div><p class="text-xs text-deep-navy/60 font-mono mt-0.5 break-words">${escapeHtml(memberLine(card))}</p></div><div class="flex items-center gap-6 flex-wrap min-w-0"><div class="text-left sm:text-right"><div class="text-[11px] uppercase tracking-wider text-deep-navy/60 font-semibold">Consultations 24h</div><div class="font-headline text-xl font-bold text-deep-navy flex items-center sm:justify-end gap-1 flex-wrap"><span>${card.profiles_viewed_24h} fiches</span><span class="text-xs font-normal text-soft-gold font-body">(+${card.profiles_viewed_24h - paint.threshold}/seuil)</span></div></div><div class="text-left sm:text-right border-l border-hairline/80 pl-4"><div class="text-[11px] uppercase tracking-wider text-deep-navy/60 font-semibold">Invitations Ta'aruf</div><div class="font-headline text-xl font-medium text-deep-navy/50">${card.invites_sent_24h} transmise</div></div></div></div><div class="mt-4 pt-3 border-t ${elapsedBorder} flex items-center justify-between gap-3 text-xs flex-wrap"><span class="text-deep-navy/70 flex items-center gap-1.5">${elapsedIcon}Dépassement enregistré il y a ${escapeHtml(elapsedLabel(paint.generated_at, card.over_threshold_at))}</span>${action}</div></article>`
}

function dossierHtml(card: VisitSignalCard, paint: VisitSignalPaint): string {
  return `<section id="visit-dossier" class="lg:col-span-5 space-y-5 min-w-0"><div class="rounded-md border border-hairline p-6 shadow-sm min-w-0" style="background-color: #FBF8F1;"><div class="flex items-center justify-between border-b border-hairline/70 pb-4 mb-4"><div><span class="text-[10px] font-mono uppercase tracking-wider text-deep-navy/60">Dossier d'Arbitrage</span><h2 class="font-headline text-xl font-semibold text-deep-navy">Instruction du dossier</h2></div></div><div class="bg-deep-navy/5 rounded-md p-4 space-y-3 mb-5 border border-hairline/50"><div class="flex justify-between gap-3 text-xs flex-wrap"><span class="text-deep-navy/70">Membre ciblé :</span><span class="font-semibold text-deep-navy break-words">${escapeHtml(targetLine(card))}</span></div><div class="flex justify-between gap-3 text-xs flex-wrap"><span class="text-deep-navy/70">Ratio Consultations / Invitations :</span><span class="font-semibold font-mono text-deep-navy">${card.profiles_viewed_24h} / ${card.invites_sent_24h} (24h)</span></div></div><div class="border-l-2 border-soft-gold pl-3 py-1 mb-5"><p class="text-xs font-semibold text-deep-navy">Seuil de bienveillance configuré :</p><p class="text-xs text-deep-navy/70 mt-0.5">${paint.threshold} fiches consultées en ${paint.window_hours}h consécutives sans ouverture de démarche Ta'aruf.</p></div><div class="space-y-2"><h3 class="text-xs font-semibold uppercase tracking-wider text-deep-navy">Qualification déontologique</h3><div class="p-3 bg-cream rounded border border-hairline/80 text-xs text-deep-navy/80 leading-relaxed space-y-2"><p><strong class="text-deep-navy">Constat :</strong> Comportement d'exploration exhaustive ou risque de catalogage contraire à la sincérité du Ta'aruf.</p><p>La consultation en rafale dénature la démarche noble en créant une impression de choix illimité et de superficialité, portant atteinte à la sacralité du projet d'union.</p></div></div></div></section>`
}

function mainHtml(paint: VisitSignalPaint | null): string {
  const threshold = paint?.threshold ?? 50
  const windowHours = paint?.window_hours ?? 24
  const rows = paint?.rows ?? []
  const count = paint?.count ?? 0
  const selected = rows[0]
  const cards = paint ? rows.map((row, index) => cardHtml(row, index === 0, paint)).join('') : ''
  const emptyHidden = paint && rows.length === 0 ? '' : ' hidden'
  const listHidden = paint && rows.length > 0 ? '' : ' hidden'
  const countHidden = paint ? '' : ' hidden'
  const countText = paint ? caseCountLabel(count) : ''
  const sentence = paint ? emptySentence(threshold, windowHours) : ''
  const dossier = selected && paint ? dossierHtml(selected, paint) : `<section id="visit-dossier" hidden class="lg:col-span-5"></section>`
  return `<main class="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-8 min-w-0">
<div class="mb-8 border-b border-hairline/60 pb-6">
<div class="flex items-start justify-between flex-wrap gap-4">
<div class="min-w-0">
<div class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soft-gold mb-2">
<span class="material-symbols-outlined text-base">visibility_lock</span>
Trust &amp; Safety Déontologique
</div>
<h1 class="font-headline text-2xl md:text-3xl font-medium text-deep-navy break-words">Surveillance T&amp;S • Détection de Consultation Intensive</h1>
<p id="visit-intro" class="mt-2 max-w-3xl text-sm leading-relaxed text-deep-navy/80">Contrôle sobre des comportements atypiques de consultation sans intention d'engagement. Signalement automatique des profils dépassant le seuil de bienveillance de ${threshold} profils consultés en ${windowHours}h sans aucune transmission d'invitation Ta'aruf.</p>
</div>
<div class="p-3 bg-cream rounded-md border border-hairline/80 max-w-xs self-start text-xs min-w-0">
<div class="flex items-center gap-2 text-deep-navy font-semibold mb-1">
<span class="material-symbols-outlined text-sm text-soft-gold">rule</span>
Cadre de vigilance éthique
</div>
<p class="text-deep-navy/70 leading-snug">Le mariage honorable exclut le catalogage récréatif. L'arbitre veille au respect mutuel de la dignité et de la retenue.</p>
</div>
</div>
</div>
<div id="visit-root">
<div id="visit-error" hidden class="mb-4 rounded-md border border-hairline bg-cream p-4" role="alert">
<p id="visit-error-text" class="text-sm text-deep-navy break-words"></p>
<button id="visit-retry" class="mt-3 inline-flex items-center border border-hairline text-deep-navy bg-cream rounded-md px-4 py-2.5 text-sm font-medium min-h-[44px]" type="button">Réessayer</button>
</div>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-w-0">
<section class="lg:col-span-7 space-y-4 min-w-0">
<div class="flex items-center justify-between gap-3 bg-deep-navy/5 px-4 py-3 rounded-md border border-hairline/70 flex-wrap">
<div class="flex items-center gap-2">
<span class="w-2.5 h-2.5 rounded-full bg-soft-gold animate-pulse"></span>
<span class="text-xs font-semibold uppercase tracking-wide text-deep-navy">Cas sous seuil de bienveillance</span>
</div>
<span id="visit-count"${countHidden} class="px-2 py-0.5 rounded text-xs font-semibold bg-deep-navy text-cream">${escapeHtml(countText)}</span>
</div>
<div class="bg-cream border border-hairline rounded-md p-3.5 flex items-start gap-3">
<span class="material-symbols-outlined text-soft-gold text-lg mt-0.5 shrink-0">shield_lock</span>
<p class="text-xs text-deep-navy/80 leading-relaxed"><strong class="font-semibold text-deep-navy">Règle d'or de retenue AnKanu :</strong> Aucun profil public de visiteurs n'est jamais accessible aux membres (inviolabilité stricte de la pudeur et du recueillement). Les métriques ci-dessous sont réservées à l'arbitrage déontologique.</p>
</div>
<div id="visit-list"${listHidden} class="space-y-3 min-w-0">${cards}</div>
<div id="visit-empty"${emptyHidden} class="text-center py-16 px-4 border border-dashed border-hairline rounded-md">
<p class="font-display text-base text-deep-navy/80 break-words">${escapeHtml(sentence)}</p>
<button id="visit-refresh" class="mt-4 inline-flex items-center justify-center border border-hairline text-deep-navy bg-cream rounded-md px-4 py-2.5 text-sm font-medium min-h-[44px]" type="button">Actualiser</button>
</div>
</section>
${dossier}
</div>
</div>
</main>`
}

const SCRIPT = `
function visitEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
var VISIT_CITY = { ouagadougou: 'Ouagadougou', bobo: 'Bobo-Dioulasso', koudougou: 'Koudougou', ouahigouya: 'Ouahigouya', banfora: 'Banfora', dedougou: 'Dédougou', fada: "Fada N'Gourma", autre: 'Autre localité' }
function visitPart(date, type, options) {
  var format = new Intl.DateTimeFormat('fr-FR', Object.assign({ timeZone: 'Africa/Ouagadougou' }, options))
  var found = format.formatToParts(date).find(function (item) { return item.type === type })
  return (found ? found.value : '').replace(/\\u202f/g, '').replace(/\\u00a0/g, '')
}
function visitCapital(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : '' }
function visitStamp(iso) {
  var date = new Date(iso)
  return visitPart(date, 'day', { day: 'numeric' }) + ' ' + visitCapital(visitPart(date, 'month', { month: 'long' })) + ' ' + visitPart(date, 'year', { year: 'numeric' }) + ' • ' + visitPart(date, 'hour', { hour: '2-digit', hourCycle: 'h23' }) + ':' + visitPart(date, 'minute', { minute: '2-digit' }) + ':' + visitPart(date, 'second', { second: '2-digit' }) + ' GMT (Ouagadougou)'
}
function visitSince(iso) {
  var date = new Date(iso)
  return 'Membre depuis ' + visitCapital(visitPart(date, 'month', { month: 'long' })) + ' ' + visitPart(date, 'year', { year: 'numeric' })
}
function visitElapsed(generated, over) {
  var total = Math.floor(Math.max(0, new Date(generated).getTime() - new Date(over).getTime()) / 60000)
  if (total < 60) return total + ' min'
  return Math.floor(total / 60) + 'h ' + (total % 60) + 'min'
}
function visitCases(count) { return count > 1 ? count + ' cas actifs' : count + ' cas actif' }
function visitFrench(code) {
  if (code === 'UNAUTHENTICATED') return 'Authentification requise.'
  if (code === 'FORBIDDEN') return 'Accès réservé au personnel de modération.'
  return 'Les signaux de visite sont indisponibles.'
}
function visitPaint(body) {
  var root = document.getElementById('visit-root')
  if (!root || !body) return
  var rows = Array.isArray(body.rows) ? body.rows : []
  var threshold = body.threshold
  var hours = body.window_hours
  var selected = rows[0] ? rows[0].account_id : ''
  root.innerHTML = visitMain(body, selected)
  var stamp = document.getElementById('visit-stamp')
  if (stamp) stamp.textContent = visitStamp(body.generated_at)
  bindVisit(body)
}
function visitMain(body, selectedId) {
  var rows = body.rows || []
  var cards = rows.map(function (row) { return visitCard(row, body, row.account_id === selectedId) }).join('')
  var dossier = ''
  var chosen = rows.find(function (row) { return row.account_id === selectedId }) || rows[0]
  if (chosen) dossier = visitDossier(chosen, body)
  else dossier = '<section id="visit-dossier" hidden class="lg:col-span-5"></section>'
  var empty = rows.length ? ' hidden' : ''
  var list = rows.length ? '' : ' hidden'
  return '<div id="visit-error" hidden class="mb-4 rounded-md border border-hairline bg-cream p-4" role="alert"><p id="visit-error-text" class="text-sm text-deep-navy break-words"></p><button id="visit-retry" class="mt-3 inline-flex items-center border border-hairline text-deep-navy bg-cream rounded-md px-4 py-2.5 text-sm font-medium min-h-[44px]" type="button">Réessayer</button></div><div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-w-0"><section class="lg:col-span-7 space-y-4 min-w-0"><div class="flex items-center justify-between gap-3 bg-deep-navy/5 px-4 py-3 rounded-md border border-hairline/70 flex-wrap"><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-soft-gold animate-pulse"></span><span class="text-xs font-semibold uppercase tracking-wide text-deep-navy">Cas sous seuil de bienveillance</span></div><span id="visit-count" class="px-2 py-0.5 rounded text-xs font-semibold bg-deep-navy text-cream">' + visitEscape(visitCases(body.count)) + '</span></div><div class="bg-cream border border-hairline rounded-md p-3.5 flex items-start gap-3"><span class="material-symbols-outlined text-soft-gold text-lg mt-0.5 shrink-0">shield_lock</span><p class="text-xs text-deep-navy/80 leading-relaxed"><strong class="font-semibold text-deep-navy">Règle d\\'or de retenue AnKanu :</strong> Aucun profil public de visiteurs n\\'est jamais accessible aux membres (inviolabilité stricte de la pudeur et du recueillement). Les métriques ci-dessous sont réservées à l\\'arbitrage déontologique.</p></div><div id="visit-list"' + list + ' class="space-y-3 min-w-0">' + cards + '</div><div id="visit-empty"' + empty + ' class="text-center py-16 px-4 border border-dashed border-hairline rounded-md"><p class="font-display text-base text-deep-navy/80 break-words">Aucun membre n\\'a consulté plus de ' + visitEscape(String(body.threshold)) + ' fiches en ' + visitEscape(String(body.window_hours)) + 'h sans envoyer d\\'invitation.</p><button id="visit-refresh" class="mt-4 inline-flex items-center justify-center border border-hairline text-deep-navy bg-cream rounded-md px-4 py-2.5 text-sm font-medium min-h-[44px]" type="button">Actualiser</button></div></section>' + dossier + '</div>'
}
function visitCard(row, body, selected) {
  var city = row.city ? (VISIT_CITY[row.city] || row.city) : ''
  var since = visitSince(row.member_since) + (city ? ' • ' + city : '')
  var verified = row.id_verified ? '<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-deep-navy/5 text-deep-navy border border-hairline/80 font-medium"><span class="material-symbols-outlined text-xs text-soft-gold" style="font-variation-settings: \\'FILL\\' 1;">verified</span>Identité vérifiée</span>' : ''
  var badge = selected ? '<div class="absolute -top-2.5 right-4 bg-deep-navy text-cream text-[10px] uppercase font-semibold px-2 py-0.5 rounded tracking-wider">En cours d\\'examen</div>' : ''
  var action = selected
    ? '<button class="inline-flex items-center gap-1 text-deep-navy font-semibold hover:text-soft-gold transition-colors min-h-[44px]" type="button" data-select="' + visitEscape(row.account_id) + '"><span>Fiche active</span><span class="material-symbols-outlined text-sm">arrow_forward</span></button>'
    : '<button class="text-deep-navy hover:text-soft-gold font-medium underline underline-offset-4 decoration-soft-gold transition-colors min-h-[44px]" type="button" data-select="' + visitEscape(row.account_id) + '">Examiner la fiche</button>'
  var shell = selected ? 'rounded-md border-2 border-deep-navy p-5 shadow-sm relative transition-all min-w-0' : 'bg-cream rounded-md border border-hairline p-5 hover:border-deep-navy/40 transition-colors min-w-0'
  var elapsedIcon = selected ? '<span class="material-symbols-outlined text-sm text-soft-gold">crisis_alert</span>' : '<span class="material-symbols-outlined text-sm text-deep-navy/40">schedule</span>'
  var elapsedBorder = selected ? 'border-hairline/70' : 'border-hairline/60'
  return '<article data-visit-card data-account="' + visitEscape(row.account_id) + '" class="' + shell + '" style="background-color: #FBF8F1;">' + badge + '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"><div class="min-w-0"><div class="flex items-center gap-2.5 flex-wrap min-w-0"><h2 class="font-display text-lg font-semibold text-deep-navy break-words">' + visitEscape(row.pseudonym) + '</h2>' + verified + '</div><p class="text-xs text-deep-navy/60 font-mono mt-0.5 break-words">' + visitEscape(since) + '</p></div><div class="flex items-center gap-6 flex-wrap min-w-0"><div class="text-left sm:text-right"><div class="text-[11px] uppercase tracking-wider text-deep-navy/60 font-semibold">Consultations 24h</div><div class="font-headline text-xl font-bold text-deep-navy flex items-center sm:justify-end gap-1 flex-wrap"><span>' + row.profiles_viewed_24h + ' fiches</span><span class="text-xs font-normal text-soft-gold font-body">(+' + (row.profiles_viewed_24h - body.threshold) + '/seuil)</span></div></div><div class="text-left sm:text-right border-l border-hairline/80 pl-4"><div class="text-[11px] uppercase tracking-wider text-deep-navy/60 font-semibold">Invitations Ta\\'aruf</div><div class="font-headline text-xl font-medium text-deep-navy/50">' + row.invites_sent_24h + ' transmise</div></div></div></div><div class="mt-4 pt-3 border-t ' + elapsedBorder + ' flex items-center justify-between gap-3 text-xs flex-wrap"><span class="text-deep-navy/70 flex items-center gap-1.5">' + elapsedIcon + 'Dépassement enregistré il y a ' + visitEscape(visitElapsed(body.generated_at, row.over_threshold_at)) + '</span>' + action + '</div></article>'
}
function visitDossier(row, body) {
  var letter = row.gender === 'sister' ? 'F' : 'M'
  var who = row.age === null || row.age === undefined ? row.pseudonym + ' (' + letter + ')' : row.pseudonym + ' (' + letter + ' / ' + row.age + ' ans)'
  return '<section id="visit-dossier" class="lg:col-span-5 space-y-5 min-w-0"><div class="rounded-md border border-hairline p-6 shadow-sm min-w-0" style="background-color: #FBF8F1;"><div class="flex items-center justify-between border-b border-hairline/70 pb-4 mb-4"><div><span class="text-[10px] font-mono uppercase tracking-wider text-deep-navy/60">Dossier d\\'Arbitrage</span><h2 class="font-headline text-xl font-semibold text-deep-navy">Instruction du dossier</h2></div></div><div class="bg-deep-navy/5 rounded-md p-4 space-y-3 mb-5 border border-hairline/50"><div class="flex justify-between gap-3 text-xs flex-wrap"><span class="text-deep-navy/70">Membre ciblé :</span><span class="font-semibold text-deep-navy break-words">' + visitEscape(who) + '</span></div><div class="flex justify-between gap-3 text-xs flex-wrap"><span class="text-deep-navy/70">Ratio Consultations / Invitations :</span><span class="font-semibold font-mono text-deep-navy">' + row.profiles_viewed_24h + ' / ' + row.invites_sent_24h + ' (24h)</span></div></div><div class="border-l-2 border-soft-gold pl-3 py-1 mb-5"><p class="text-xs font-semibold text-deep-navy">Seuil de bienveillance configuré :</p><p class="text-xs text-deep-navy/70 mt-0.5">' + body.threshold + ' fiches consultées en ' + body.window_hours + 'h consécutives sans ouverture de démarche Ta\\'aruf.</p></div><div class="space-y-2"><h3 class="text-xs font-semibold uppercase tracking-wider text-deep-navy">Qualification déontologique</h3><div class="p-3 bg-cream rounded border border-hairline/80 text-xs text-deep-navy/80 leading-relaxed space-y-2"><p><strong class="text-deep-navy">Constat :</strong> Comportement d\\'exploration exhaustive ou risque de catalogage contraire à la sincérité du Ta\\'aruf.</p><p>La consultation en rafale dénature la démarche noble en créant une impression de choix illimité et de superficialité, portant atteinte à la sacralité du projet d\\'union.</p></div></div></div></section>'
}
var visitToken = 0
function bindLoads() {
  var refresh = document.getElementById('visit-refresh')
  var retry = document.getElementById('visit-retry')
  if (refresh) refresh.onclick = loadVisits
  if (retry) retry.onclick = loadVisits
}
function bindVisit(body) {
  document.querySelectorAll('[data-select]').forEach(function (button) {
    button.onclick = function () {
      var root = document.getElementById('visit-root')
      if (!root) return
      root.innerHTML = visitMain(body, button.getAttribute('data-select') || '')
      var stamp = document.getElementById('visit-stamp')
      if (stamp && body.generated_at) stamp.textContent = visitStamp(body.generated_at)
      bindVisit(body)
    }
  })
  bindLoads()
}
function showVisitError(message) {
  var error = document.getElementById('visit-error')
  var text = document.getElementById('visit-error-text')
  var list = document.getElementById('visit-list')
  var empty = document.getElementById('visit-empty')
  var dossier = document.getElementById('visit-dossier')
  var count = document.getElementById('visit-count')
  if (text) text.textContent = message
  if (error) error.hidden = false
  if (list) list.hidden = true
  if (empty) empty.hidden = true
  if (dossier) dossier.hidden = true
  if (count) {
    count.hidden = true
    count.textContent = ''
  }
  var retry = document.getElementById('visit-retry')
  if (retry) retry.onclick = loadVisits
}
function loadVisits() {
  var token = ++visitToken
  return fetch('/v1/staff/signals/visits', { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
    return response.json().then(function (payload) {
      return { ok: response.ok, status: response.status, payload: payload }
    })
  }).then(function (result) {
    if (token !== visitToken) return
    var code = result.payload && result.payload.error && result.payload.error.code
    if (result.status === 401 || code === 'UNAUTHENTICATED') {
      window.location.assign('/auth')
      return
    }
    if (result.status === 403 || code === 'FORBIDDEN') {
      window.location.assign('/decouvrir')
      return
    }
    if (!result.ok) {
      showVisitError(visitFrench(code))
      return
    }
    var intro = document.getElementById('visit-intro')
    if (intro) intro.textContent = "Contrôle sobre des comportements atypiques de consultation sans intention d'engagement. Signalement automatique des profils dépassant le seuil de bienveillance de " + result.payload.threshold + " profils consultés en " + result.payload.window_hours + "h sans aucune transmission d'invitation Ta'aruf."
    visitPaint(result.payload)
  }).catch(function () {
    if (token !== visitToken) return
    showVisitError(visitFrench('UNHANDLED'))
  })
}
if (document.body.getAttribute('data-visit-signals') === 'live') {
  bindLoads()
  loadVisits()
}
`

function chrome(stitch: string, stamp: string, paint: VisitSignalPaint | null): string {
  let html = stitch
  html = html.replace(/<a\b[^>]*>[\s\S]*?Retour à la console de modération[\s\S]*?<\/a>/, '')
  html = html.replace(
    'class="flex items-center gap-2 text-deep-navy/60 font-mono text-[11px]"',
    'class="ml-auto flex items-center gap-2 text-deep-navy/60 font-mono text-[11px]"',
  )
  html = html.replace(
    /Horodatage officiel :[^<]*/,
    `Horodatage officiel : <span id="visit-stamp">${escapeHtml(stamp)}</span>`,
  )
  const mainAt = html.indexOf('<main')
  const mainEnd = html.indexOf('</main>')
  if (mainAt >= 0 && mainEnd > mainAt) {
    html = `${html.slice(0, mainAt)}${mainHtml(paint)}${html.slice(mainEnd + '</main>'.length)}`
  }
  return html
}

/** Screen 52. `paint === null` loads `GET /v1/staff/signals/visits`. A paint value does not fetch. */
export function visitSignalsHtml(stitch: string, paint: VisitSignalPaint | null = null): string {
  const stamp = paint ? officialStamp(paint.generated_at) : ''
  let html = chrome(stitch, stamp, paint)
  html = html.replace('<body class="bg-cream', `<body data-visit-signals="${paint ? 'static' : 'live'}" class="bg-cream`)
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${HIDDEN}</head>`)
  }
  return prepareV2(html, paint ? '' : SCRIPT)
}
