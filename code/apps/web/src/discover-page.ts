import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

const DOT_PATTERN = `<style id="discover-grid-pattern">
.bg-dot-pattern {
  background-image: radial-gradient(rgba(201, 168, 108, 0.18) 1px, transparent 1px);
  background-size: 16px 16px;
}
</style>`

const TILE = `<template id="discover-tile">
<article data-tile tabindex="0" style="min-width:0;max-width:100%;overflow-wrap:anywhere" class="bg-[#FBF8F1] border border-hairline/80 rounded-lg p-5 sm:p-6 flex flex-col gap-4 hover:border-soft-gold transition-colors duration-200 cursor-pointer group min-w-0 max-w-full">
<div class="min-w-0">
<div data-photo class="h-52 sm:h-56 rounded-md bg-[#0B1D36] bg-dot-pattern relative overflow-hidden flex flex-col items-center justify-center p-4 text-center mb-3.5 border border-hairline/30">
<div data-reserved class="relative z-10 flex flex-col items-center">
<span class="material-symbols-outlined text-soft-gold text-2xl mb-1.5" data-icon="visibility_off">visibility_off</span>
<span class="font-display italic text-cream text-base tracking-wide">Photographie réservée</span>
<span class="text-xs text-cream/70 font-normal mt-0.5">Visible à l'acceptation mutuelle</span>
</div>
<div data-missing hidden class="relative z-10 flex flex-col items-center">
<span class="material-symbols-outlined text-soft-gold text-2xl mb-1.5" data-icon="lock">lock</span>
<span class="font-display italic text-cream text-base tracking-wide">Photographie non publiée</span>
<span class="text-xs text-cream/70 font-normal mt-0.5">Choix de discrétion personnelle</span>
</div>
</div>
<div class="flex items-start justify-between gap-2 mb-1 min-w-0">
<div class="flex items-center gap-2 flex-wrap min-w-0">
<h2 data-name class="font-display text-lg sm:text-xl font-semibold text-deep-navy min-w-0 break-words"></h2>
<span data-verified hidden class="bg-gold-soft/20 border border-soft-gold text-deep-navy text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded">VÉRIFIÉ</span>
</div>
<button data-bookmark type="button" aria-label="Enregistrer en toute discrétion" class="p-1 text-deep-navy/40 hover:text-soft-gold transition-colors focus:outline-none shrink-0" title="Enregistrer">
<span class="material-symbols-outlined text-xl" data-icon="bookmark_border">bookmark_border</span>
</button>
</div>
<p data-city class="text-xs text-deep-navy/70 break-words"></p>
</div>
<div data-chips class="flex flex-wrap gap-1.5 text-xs pt-2 border-t border-hairline/40 min-w-0"></div>
</article>
</template>`

const GRID_STATUS = `<p id="discover-empty" hidden class="text-sm text-deep-navy/80 m-0">Aucun profil pour ces filtres.</p>
<p id="discover-error" hidden class="text-sm text-deep-navy/80 m-0 break-words"></p>
<button id="discover-retry" hidden type="button" class="mt-3 inline-flex items-center border border-[#E2D4B8] text-deep-navy bg-cream rounded-lg px-4 py-2.5 text-sm font-medium">Réessayer</button>`

/** Text paints before any thumbnail request. Photo URLs stay out of sessionStorage. */
const SCRIPT = `document.addEventListener('click', function (event) {
  var view = event.target && event.target.closest ? event.target.closest('[data-discover-view]') : null
  if (!view) return
  var mode = view.getAttribute('data-discover-view')
  var card = document.getElementById('discover-card')
  var grid = document.getElementById('discover-grid')
  if (!card || !grid) return
  card.hidden = mode === 'grid'
  grid.hidden = mode !== 'grid'
  if (mode === 'grid') loadGrid()
})
var CACHE = 'ankanu_browse_grid_text'
var memory = null
var pending = null
function textRow(item) {
  return {
    id: item.id,
    pseudonym: item.pseudonym,
    age: item.age,
    city: item.city,
    marital_status: item.marital_status,
    polygamy_intent: item.polygamy_intent,
    madhhab: item.madhhab,
    practice: item.practice,
    verified: item.verified === true,
    photo_blur: item.photo_blur === true,
    has_photo: !!(item.photo && item.photo.url)
  }
}
function readCache() {
  try {
    var raw = sessionStorage.getItem(CACHE)
    if (!raw) return null
    var parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}
function writeCache(items) {
  try {
    sessionStorage.setItem(CACHE, JSON.stringify(items.map(textRow)))
  } catch (error) {}
}
function chip(text) {
  var span = document.createElement('span')
  span.className = 'px-2.5 py-1 rounded bg-cream border border-hairline text-deep-navy break-words'
  span.textContent = text
  return span
}
function paint(items) {
  var tiles = document.getElementById('discover-tiles')
  var empty = document.getElementById('discover-empty')
  var template = document.getElementById('discover-tile')
  if (!tiles || !template) return
  tiles.textContent = ''
  if (empty) empty.hidden = items.length !== 0
  var deferred = []
  items.forEach(function (item) {
    var node = template.content.cloneNode(true)
    var article = node.querySelector('[data-tile]')
    var name = node.querySelector('[data-name]')
    var verified = node.querySelector('[data-verified]')
    var city = node.querySelector('[data-city]')
    var chips = node.querySelector('[data-chips]')
    var photo = node.querySelector('[data-photo]')
    var reserved = node.querySelector('[data-reserved]')
    var missing = node.querySelector('[data-missing]')
    if (name) name.textContent = item.pseudonym + ', ' + String(item.age) + ' ans'
    if (verified) verified.hidden = item.verified !== true
    if (city) {
      if (item.city) city.textContent = item.city
      else city.hidden = true
    }
    ;[item.marital_status, item.polygamy_intent, item.madhhab, item.practice].forEach(function (value) {
      if (value && chips) chips.appendChild(chip(value))
    })
    var url = item.photo && item.photo.url ? item.photo.url : ''
    var knownPhoto = item.has_photo === true || url.length > 0
    if (!knownPhoto) {
      if (reserved) reserved.hidden = true
      if (missing) missing.hidden = false
      if (photo) photo.className = 'h-52 sm:h-56 rounded-md bg-[#0B1D36] relative overflow-hidden flex flex-col items-center justify-center p-4 text-center mb-3.5 border border-dashed border-hairline/50'
    } else if (item.photo_blur === true) {
      if (reserved) reserved.hidden = false
      if (missing) missing.hidden = true
    } else if (reserved && missing) {
      reserved.hidden = true
      missing.hidden = true
    }
    if (url && photo) deferred.push({ photo: photo, url: url })
    if (article) {
      article.addEventListener('click', function (event) {
        var bookmark = event.target && event.target.closest ? event.target.closest('[data-bookmark]') : null
        if (bookmark) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        window.location.assign('/profil/' + item.id)
      })
      article.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') window.location.assign('/profil/' + item.id)
      })
    }
    tiles.appendChild(node)
  })
  requestAnimationFrame(function () {
    deferred.forEach(function (entry) {
      var image = document.createElement('img')
      image.alt = ''
      image.className = 'absolute inset-0 h-full w-full object-cover'
      entry.photo.insertBefore(image, entry.photo.firstChild)
      image.src = entry.url
    })
  })
}
function showError(message) {
  var error = document.getElementById('discover-error')
  var retry = document.getElementById('discover-retry')
  if (error) {
    error.hidden = false
    error.textContent = message
  }
  if (retry) retry.hidden = false
}
function loadGrid() {
  if (memory) {
    paint(memory)
    return
  }
  var cached = readCache()
  if (cached) paint(cached)
  if (pending) return
  pending = window.fetch('/v1/browse?view=grid', { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
    return response.json().then(function (body) {
      return { status: response.status, body: body }
    })
  }).then(function (result) {
    pending = null
    var body = result.body || {}
    var error = body.error
    if (result.status === 401) {
      window.location.assign('/auth')
      return
    }
    if (error && error.code === 'PIN_REQUIRED') return
    if (result.status === 403 && error && error.details && error.details.reason === 'viewer_not_listable') {
      window.location.assign('/profile-edit')
      return
    }
    if (result.status !== 200 || !Array.isArray(body.items)) {
      showError(error && error.message ? error.message : 'Request failed')
      return
    }
    var errorNode = document.getElementById('discover-error')
    var retry = document.getElementById('discover-retry')
    if (errorNode) errorNode.hidden = true
    if (retry) retry.hidden = true
    memory = body.items
    writeCache(body.items)
    paint(body.items)
  }, function () {
    pending = null
    showError('Request failed')
  })
}
var retry = document.getElementById('discover-retry')
if (retry) retry.addEventListener('click', function () {
  memory = null
  pending = null
  var error = document.getElementById('discover-error')
  if (error) error.hidden = true
  retry.hidden = true
  loadGrid()
})
`

function innerBody(html: string): string {
  const open = html.search(/<body\b[^>]*>/i)
  if (open < 0) {
    return html
  }
  const start = html.indexOf('>', open)
  const end = html.lastIndexOf('</body>')
  if (start < 0 || end < start) {
    return html
  }
  return html.slice(start + 1, end)
}

function dropSpanContaining(html: string, needle: string): string {
  const at = html.indexOf(needle)
  if (at < 0) {
    return html
  }
  const start = html.lastIndexOf('<span', at)
  if (start < 0) {
    return html
  }
  let depth = 0
  const token = /<\/?span\b[^>]*>/gi
  token.lastIndex = start
  let match = token.exec(html)
  while (match) {
    if (match[0].startsWith('</')) {
      depth -= 1
      if (depth === 0) {
        return html.slice(0, start) + html.slice(match.index + match[0].length)
      }
    } else {
      depth += 1
    }
    match = token.exec(html)
  }
  return html
}

function markToggle(html: string, label: string, view: 'card' | 'grid'): string {
  const needle = `aria-label="${label}"`
  const at = html.indexOf(needle)
  if (at < 0) {
    return html
  }
  return `${html.slice(0, at)}data-discover-view="${view}" ${html.slice(at)}`
}

function replaceHrefs(html: string, hrefs: string[]): string {
  let next = html
  for (const href of hrefs) {
    const at = next.indexOf('href="#"')
    if (at < 0) {
      return next
    }
    next = `${next.slice(0, at)}href="${href}"${next.slice(at + 'href="#"'.length)}`
  }
  return next
}

const MEMBER_HREFS = ['/decouvrir', '/invitations', '/discussions', '/profil']

function stripCard(html: string): string {
  const start = html.indexOf('<!-- 3. FOCUSED PROFILE CARD -->')
  const end = html.indexOf('<!-- 4. UNDER-CARD')
  let next = start >= 0 && end > start ? html.slice(0, start) + html.slice(end) : html
  next = dropSpanContaining(next, 'Ville : Ouagadougou')
  next = dropSpanContaining(next, "Tranche d'âge")
  next = dropSpanContaining(next, 'Pratique assidue')
  next = markToggle(next, 'Affichage unitaire soigné', 'card')
  next = markToggle(next, 'Grille panoramique', 'grid')
  next = next.replace(
    'class="flex-1 max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-8 w-full flex flex-col"',
    'class="flex-1 max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-8 w-full flex flex-col min-w-0"',
  )
  return replaceHrefs(next, MEMBER_HREFS)
}

function stripGrid(html: string): string {
  const label = 'aria-label="Profils en découverte"'
  const at = html.indexOf(label)
  const open = at < 0 ? -1 : html.indexOf('>', at)
  const close = open < 0 ? -1 : html.indexOf('</section>', open)
  let next = html
  if (open >= 0 && close > open) {
    next =
      html.slice(0, open + 1) +
      `<div id="discover-tiles" class="contents"></div>${GRID_STATUS}` +
      html.slice(close)
  }
  next = dropSpanContaining(next, 'Ville : Ouagadougou')
  next = dropSpanContaining(next, "Tranche d'âge")
  next = dropSpanContaining(next, 'Pratique assidue')
  next = markToggle(next, 'Affichage unitaire', 'card')
  next = markToggle(next, 'Grille panoramique', 'grid')
  next = next.replace(
    'class="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-6 pb-8"',
    'class="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-6 pb-8 min-w-0"',
  )
  next = next.replace(
    'class="font-display text-2xl sm:text-3xl text-deep-navy font-normal tracking-tight"',
    'class="font-display text-2xl sm:text-3xl text-deep-navy font-normal tracking-tight break-words"',
  )
  return replaceHrefs(next, ['/decouvrir', ...MEMBER_HREFS, ...MEMBER_HREFS])
}

/** Card chrome from screen 57, grid from grid.html. Sample profiles never stay. */
export function discoverHtml(card: string, grid: string): string {
  const headEnd = card.indexOf('</head>')
  const head = headEnd < 0 ? card : card.slice(0, headEnd)
  const document = `${head}${DOT_PATTERN}</head>
<body class="min-h-full bg-cream text-deep-navy font-body flex flex-col antialiased selection:bg-gold-soft selection:text-deep-navy pb-20 md:pb-8">
<div id="discover-card" style="min-width:0;max-width:100%">${innerBody(stripCard(card))}</div>
<div id="discover-grid" hidden style="min-width:0;max-width:100%">${innerBody(stripGrid(grid))}${TILE}</div>
</body></html>`
  const page = prepareV2(document, SCRIPT)
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}
