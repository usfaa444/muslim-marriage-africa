import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'
import { withAppShell } from './app-shell'

export type FavouriteCard = {
  target_id: string
  pseudonym: string
  age: number
  city: string | null
  profession: string | null
  madhhab: string | null
  practice: string | null
  marital_status: string | null
  polygamy_intent: string | null
  verified: boolean
  photo: { id: string; url: string } | null
  bio: string | null
}

const PROFESSION: Record<string, string> = {
  finance: 'Cadre analyste financier',
  enseignement: 'Enseignant / Chercheur',
  ingenierie: 'Ingénieur / Technique',
  administration: 'Fonction publique / Administration',
  commerce: 'Commerce / Entrepreneuriat',
  sante: 'Santé / Médical',
  autre: 'Autre...',
}

const HIDDEN = `<style id="favourites-hidden">
#favourites-empty[hidden],
#favourites-aside[hidden],
#favourites-count[hidden],
#favourites-error[hidden],
#favourites-retry[hidden],
[data-verified][hidden],
[data-bio][hidden],
[data-place][hidden],
[data-lock][hidden] { display: none !important; }
#favourites-list article, #favourites-list a, #favourites-list button, [data-name] { min-width: 0; max-width: 100%; }
[data-name] { overflow-wrap: anywhere; }
</style>`

const SCRIPT = `var PROFESSIONS = {
  finance: 'Cadre analyste financier',
  enseignement: 'Enseignant / Chercheur',
  ingenierie: 'Ingénieur / Technique',
  administration: 'Fonction publique / Administration',
  commerce: 'Commerce / Entrepreneuriat',
  sante: 'Santé / Médical',
  autre: 'Autre...'
}
function countLabel(count) {
  return count === 1 ? '1 profil enregistré' : String(count) + ' profils enregistrés'
}
function jobLabel(value) {
  if (!value) return ''
  return PROFESSIONS[value] || value
}
function placeText(item) {
  var job = jobLabel(item.profession)
  if (item.city && job) return item.city + ' • ' + job
  return item.city || job || ''
}
function chip(text) {
  var span = document.createElement('span')
  span.className = 'px-2.5 py-1 rounded bg-cream border border-hairline text-xs font-medium text-deep-navy break-words'
  span.textContent = text
  return span
}
function showError(message) {
  var error = document.getElementById('favourites-error')
  var retry = document.getElementById('favourites-retry')
  if (error) {
    error.hidden = false
    error.textContent = message
  }
  if (retry) retry.hidden = false
}
function paint(body) {
  var list = document.getElementById('favourites-list')
  var empty = document.getElementById('favourites-empty')
  var aside = document.getElementById('favourites-aside')
  var count = document.getElementById('favourites-count')
  var error = document.getElementById('favourites-error')
  var retry = document.getElementById('favourites-retry')
  var template = document.getElementById('favourites-card')
  if (!list || !template) return
  if (error) error.hidden = true
  if (retry) retry.hidden = true
  list.textContent = ''
  var items = body && Array.isArray(body.items) ? body.items : []
  if (items.length === 0) {
    if (empty) empty.hidden = false
    if (aside) aside.hidden = true
    if (count) count.hidden = true
    return
  }
  if (empty) empty.hidden = true
  if (aside) aside.hidden = false
  if (count) {
    count.hidden = false
    count.textContent = countLabel(typeof body.count === 'number' ? body.count : items.length)
  }
  items.forEach(function (item) {
    var node = template.content.cloneNode(true)
    var article = node.querySelector('[data-favourite]')
    var name = node.querySelector('[data-name]')
    var verified = node.querySelector('[data-verified]')
    var place = node.querySelector('[data-place]')
    var chips = node.querySelector('[data-chips]')
    var bio = node.querySelector('[data-bio]')
    var lock = node.querySelector('[data-lock]')
    var photo = node.querySelector('[data-photo]')
    if (article) article.setAttribute('data-target', item.target_id)
    if (name) name.textContent = item.pseudonym + ', ' + String(item.age) + ' ans'
    if (verified) verified.hidden = item.verified !== true
    var line = placeText(item)
    if (place) {
      if (line) place.textContent = line
      else place.hidden = true
    }
    if (item.madhhab && chips) chips.appendChild(chip('Madhhab : ' + item.madhhab))
    ;[item.practice, item.marital_status, item.polygamy_intent].forEach(function (value) {
      if (value && chips) chips.appendChild(chip(value))
    })
    if (bio) {
      if (item.bio) bio.textContent = '« ' + item.bio + ' »'
      else bio.hidden = true
    }
    var url = item.photo && item.photo.url ? item.photo.url : ''
    if (url && photo) {
      if (lock) lock.hidden = true
      var image = document.createElement('img')
      image.alt = ''
      image.className = 'absolute inset-0 h-full w-full object-cover'
      image.src = url
      photo.insertBefore(image, photo.firstChild)
    }
    var open = node.querySelector('[data-open]')
    var remove = node.querySelector('[data-remove]')
    if (open) {
      open.addEventListener('click', function () {
        window.location.assign('/profil/' + item.target_id)
      })
    }
    if (remove) {
      remove.addEventListener('click', function () {
        if (remove.disabled) return
        remove.disabled = true
        fetch('/v1/favourites/' + encodeURIComponent(item.target_id), {
          method: 'DELETE',
          credentials: 'same-origin'
        }).then(function (response) {
          if (response.status === 200) return load()
          return response.json().then(function (payload) {
            var message = payload && payload.error && payload.error.message ? payload.error.message : 'Request failed'
            showError(message)
          })
        }).catch(function () {
          showError('Request failed')
        }).then(function () {
          remove.disabled = false
        })
      })
    }
    list.appendChild(node)
  })
}
function load() {
  var section = document.getElementById('favourites-list')
  if (section) section.setAttribute('aria-busy', 'true')
  return fetch('/v1/favourites', { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
    return response.json().then(function (payload) {
      return { ok: response.ok, payload: payload }
    })
  }).then(function (result) {
    if (!result.ok) {
      var message = result.payload && result.payload.error && result.payload.error.message ? result.payload.error.message : 'Request failed'
      showError(message)
      return
    }
    paint(result.payload)
  }).catch(function () {
    showError('Request failed')
  }).then(function () {
    if (section) section.removeAttribute('aria-busy')
  })
}
var retry = document.getElementById('favourites-retry')
if (retry) retry.addEventListener('click', load)
if (document.body.getAttribute('data-favourites') === 'live') load()
`

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function jobLabel(value: string | null): string {
  if (!value) {
    return ''
  }
  return PROFESSION[value] ?? value
}

function placeText(item: FavouriteCard): string {
  const job = jobLabel(item.profession)
  if (item.city && job) {
    return `${item.city} • ${job}`
  }
  return item.city || job
}

function countLabel(count: number): string {
  return count === 1 ? '1 profil enregistré' : `${count} profils enregistrés`
}

function chipHtml(text: string): string {
  return `<span class="px-2.5 py-1 rounded bg-cream border border-hairline text-xs font-medium text-deep-navy break-words">${escapeHtml(text)}</span>`
}

const CARD_TEMPLATE = `<template id="favourites-card"><article data-favourite data-target="" class="bg-white/60 border border-hairline rounded-md p-6 md:p-8 transition-shadow hover:shadow-sm min-w-0 max-w-full"><div class="flex flex-col md:flex-row gap-6 items-start min-w-0"><div data-photo class="relative w-full md:w-44 h-48 md:h-44 rounded-md bg-deep-navy/5 border border-hairline flex flex-col items-center justify-center p-4 text-center shrink-0 overflow-hidden"><div data-lock class="flex flex-col items-center"><div class="w-12 h-12 rounded-full bg-cream border border-hairline flex items-center justify-center mb-2.5 text-deep-navy shadow-inner"><span class="material-symbols-outlined text-soft-gold text-2xl" data-icon="lock">lock</span></div><p class="font-display text-sm text-deep-navy font-medium">Photographie réservée</p><p class="text-[11px] text-deep-navy/60 mt-1 leading-snug">Accessible sous accord mutuel des tuteurs</p></div></div><div class="flex-grow w-full min-w-0 space-y-4"><div class="flex items-center gap-2 flex-wrap min-w-0"><h2 data-name class="font-display text-2xl text-deep-navy tracking-tight font-normal min-w-0 max-w-full" style="overflow-wrap:anywhere"></h2><span data-verified hidden class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-deep-navy/10 text-deep-navy border border-hairline"><span class="material-symbols-outlined text-[13px] text-soft-gold" data-icon="verified_user">verified_user</span>Profil vérifié</span></div><p data-place class="text-xs md:text-sm text-deep-navy/70 mt-1 flex items-center gap-1.5 break-words"></p><div data-chips class="flex flex-wrap gap-2 pt-1 min-w-0"></div><blockquote data-bio hidden class="text-sm italic text-deep-navy/85 border-l-2 border-soft-gold pl-3 py-1 font-display break-words"></blockquote><div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-hairline/60"><button data-open class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-deep-navy text-cream text-xs md:text-sm font-medium hover:bg-deep-navy/90 active:scale-[0.99] transition-all min-h-[44px]" type="button"><span>Consulter la fiche détaillée</span><span class="material-symbols-outlined text-base" data-icon="arrow_forward">arrow_forward</span></button><button data-remove class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-deep-navy/60 hover:text-deep-navy transition-colors min-h-[44px]" type="button"><span class="material-symbols-outlined text-base text-soft-gold" data-icon="bookmark_remove">bookmark_remove</span><span>Retirer de ma sélection</span></button></div></div></div></article></template>`

function cardHtml(item: FavouriteCard): string {
  const chips = [
    item.madhhab ? chipHtml(`Madhhab : ${item.madhhab}`) : '',
    item.practice ? chipHtml(item.practice) : '',
    item.marital_status ? chipHtml(item.marital_status) : '',
    item.polygamy_intent ? chipHtml(item.polygamy_intent) : '',
  ].join('')
  const place = placeText(item)
  const photo = item.photo
    ? `<img alt="" class="absolute inset-0 h-full w-full object-cover" src="${escapeHtml(item.photo.url)}">`
    : ''
  const lock = item.photo
    ? ''
    : `<div data-lock class="flex flex-col items-center"><div class="w-12 h-12 rounded-full bg-cream border border-hairline flex items-center justify-center mb-2.5 text-deep-navy shadow-inner"><span class="material-symbols-outlined text-soft-gold text-2xl" data-icon="lock">lock</span></div><p class="font-display text-sm text-deep-navy font-medium">Photographie réservée</p><p class="text-[11px] text-deep-navy/60 mt-1 leading-snug">Accessible sous accord mutuel des tuteurs</p></div>`
  const verified = item.verified
    ? `<span data-verified class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-deep-navy/10 text-deep-navy border border-hairline"><span class="material-symbols-outlined text-[13px] text-soft-gold" data-icon="verified_user">verified_user</span>Profil vérifié</span>`
    : ''
  const bio = item.bio
    ? `<blockquote data-bio class="text-sm italic text-deep-navy/85 border-l-2 border-soft-gold pl-3 py-1 font-display break-words">« ${escapeHtml(item.bio)} »</blockquote>`
    : ''
  return `<article data-favourite data-target="${escapeHtml(item.target_id)}" class="bg-white/60 border border-hairline rounded-md p-6 md:p-8 transition-shadow hover:shadow-sm min-w-0 max-w-full"><div class="flex flex-col md:flex-row gap-6 items-start min-w-0"><div data-photo class="relative w-full md:w-44 h-48 md:h-44 rounded-md bg-deep-navy/5 border border-hairline flex flex-col items-center justify-center p-4 text-center shrink-0 overflow-hidden">${photo}${lock}</div><div class="flex-grow w-full min-w-0 space-y-4"><div class="flex items-center gap-2 flex-wrap min-w-0"><h2 data-name class="font-display text-2xl text-deep-navy tracking-tight font-normal min-w-0 max-w-full" style="overflow-wrap:anywhere">${escapeHtml(item.pseudonym)}, ${item.age} ans</h2>${verified}</div>${place ? `<p data-place class="text-xs md:text-sm text-deep-navy/70 mt-1 break-words">${escapeHtml(place)}</p>` : ''}<div data-chips class="flex flex-wrap gap-2 pt-1 min-w-0">${chips}</div>${bio}<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-hairline/60"><a data-open class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-deep-navy text-cream text-xs md:text-sm font-medium hover:bg-deep-navy/90 min-h-[44px]" href="/profil/${escapeHtml(item.target_id)}"><span>Consulter la fiche détaillée</span><span class="material-symbols-outlined text-base" data-icon="arrow_forward">arrow_forward</span></a><button data-remove class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-deep-navy/60 hover:text-deep-navy transition-colors min-h-[44px]" type="button"><span class="material-symbols-outlined text-base text-soft-gold" data-icon="bookmark_remove">bookmark_remove</span><span>Retirer de ma sélection</span></button></div></div></div></article>`
}

function shell(stitch: string, cards: FavouriteCard[] | null): string {
  let html = stitch
  html = html.replace(
    /<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-deep-navy text-cream">[\s\S]*?<\/span>/,
    `<span id="favourites-count"${cards && cards.length > 0 ? '' : ' hidden'} class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-deep-navy text-cream">${cards && cards.length > 0 ? escapeHtml(countLabel(cards.length)) : ''}</span>`,
  )
  const sectionAt = html.indexOf('<section aria-label="Liste des profils enregistrés"')
  const sectionEnd = sectionAt < 0 ? -1 : html.indexOf('</section>', sectionAt)
  const list =
    cards === null
      ? ''
      : cards.map((item) => cardHtml(item)).join('')
  const emptyHidden = cards === null || cards.length > 0 ? ' hidden' : ''
  const body = `<div id="favourites-list" class="space-y-6 min-w-0">${list}</div>
<div id="favourites-empty"${emptyHidden} class="space-y-4">
<p class="text-sm md:text-base text-deep-navy/80">Aucun favori.</p>
<a class="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-hairline bg-white/50 text-xs font-medium text-deep-navy hover:bg-white transition-colors min-h-[44px]" href="/decouvrir"><span class="material-symbols-outlined text-sm text-soft-gold" data-icon="explore">explore</span><span>Découvrir</span></a>
</div>
<p id="favourites-error" hidden class="text-sm text-deep-navy/80 break-words" role="status"></p>
<button id="favourites-retry" hidden type="button" class="mt-3 inline-flex items-center border border-hairline text-deep-navy bg-cream rounded-md px-4 py-2.5 text-sm font-medium min-h-[44px]">Réessayer</button>
${CARD_TEMPLATE}`
  if (sectionAt >= 0 && sectionEnd > sectionAt) {
    const openEnd = html.indexOf('>', sectionAt)
    html = `${html.slice(0, openEnd + 1)}${body}${html.slice(sectionEnd)}`
  }
  html = html.replace('<aside class="mt-12', '<aside id="favourites-aside" class="mt-12')
  if (cards === null || cards.length === 0) {
    html = html.replace('id="favourites-aside"', 'id="favourites-aside" hidden')
  }
  html = html.replace('href="#"', 'href="/profil"')
  html = html.replace('href="#"', 'href="/decouvrir"')
  html = html.replace(
    'class="flex-grow w-full max-w-4xl mx-auto px-6 py-10 md:py-14"',
    'class="flex-grow w-full max-w-4xl mx-auto px-6 py-10 md:py-14 min-w-0"',
  )
  return html
}

/** Screen 17. `cards === null` loads `GET /v1/favourites`. An array paints that list and does not fetch. */
export function favouritesHtml(stitch: string, cards: FavouriteCard[] | null = null): string {
  const live = cards === null
  const document = shell(stitch, cards).replace(
    '<body class="bg-cream',
    `<body data-favourites="${live ? 'live' : 'static'}" class="bg-cream`,
  )
  const head = document.includes('</head>')
    ? document.replace('</head>', `${HIDDEN}</head>`)
    : `${HIDDEN}${document}`
  const page = prepareV2(withAppShell(head, { kind: 'member', active: 'decouvrir' }), live ? SCRIPT : '')
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}
