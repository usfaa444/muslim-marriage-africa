import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinGuardScript } from './pin-guard'
import { prepareV2, stripInlineHandlers } from './v2-document'

const DOT_PATTERN = `<style id="discover-grid-pattern">
.bg-dot-pattern {
  background-image: radial-gradient(rgba(201, 168, 108, 0.18) 1px, transparent 1px);
  background-size: 16px 16px;
}
#discover-empty[hidden],
#discover-error[hidden],
#discover-retry[hidden],
#discover-card-empty[hidden],
#discover-card-error[hidden],
#discover-card-retry[hidden],
#filters-modal[hidden],
#filters-error[hidden],
#filters-retry[hidden],
[data-reserved][hidden],
[data-missing][hidden],
[data-verified][hidden] { display: none !important; }
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
  var opener = event.target && event.target.closest ? event.target.closest('[data-open-filters]') : null
  if (opener) {
    event.preventDefault()
    openFilters()
    return
  }
  var view = event.target && event.target.closest ? event.target.closest('[data-discover-view]') : null
  if (!view) return
  var mode = view.getAttribute('data-discover-view')
  var card = document.getElementById('discover-card')
  var grid = document.getElementById('discover-grid')
  if (!card || !grid) return
  card.hidden = mode === 'grid'
  grid.hidden = mode !== 'grid'
  if (mode === 'grid') loadGrid()
  else syncCardStatus()
})
var account = document.body.getAttribute('data-discover-account') || ''
var memory = null
var memoryAt = 0
var pending = 0
var generation = 0
var lastItems = null
var lastError = ''
var catalogue = null
var cataloguePromise = null
var URL_TTL = 60000
var FILTER_KEYS = ['city', 'radius_km', 'marital_status', 'polygamy_intent', 'practice', 'madhhab', 'life_plans']
function filterParams() {
  var params = new URLSearchParams(window.location.search)
  var pairs = []
  FILTER_KEYS.forEach(function (key) {
    var value = params.get(key)
    if (value) pairs.push([key, value])
  })
  pairs.sort(function (left, right) { return left[0] < right[0] ? -1 : 1 })
  return pairs
}
function filterQuery() {
  return filterParams().map(function (pair) {
    return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1])
  }).join('&')
}
function cacheKey() {
  if (!account) return ''
  var extra = filterQuery()
  return 'ankanu_browse_grid_text:' + account + (extra ? ':' + extra : '')
}
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
  var key = cacheKey()
  if (!key) return null
  try {
    var raw = sessionStorage.getItem(key)
    if (!raw) return null
    var parsed = JSON.parse(raw)
    if (!parsed || parsed.account !== account || !Array.isArray(parsed.items)) return null
    return parsed.items
  } catch (error) {
    return null
  }
}
function writeCache(items) {
  var key = cacheKey()
  if (!key) return
  try {
    sessionStorage.setItem(key, JSON.stringify({ account: account, items: items.map(textRow) }))
  } catch (error) {}
}
function bookmarkError(message) {
  var node = document.getElementById('discover-bookmark-error')
  if (!node) {
    node = document.createElement('p')
    node.id = 'discover-bookmark-error'
    node.setAttribute('role', 'status')
    node.className = 'text-sm text-deep-navy/80 m-0 break-words'
    var host = document.getElementById('discover-grid') || document.body
    host.appendChild(node)
  }
  node.hidden = !message
  node.textContent = message || ''
}
function saveFavourite(targetId, button) {
  bookmarkError('')
  fetch('/v1/favourites', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target_id: targetId })
  }).then(function (response) {
    if (response.status === 200 || response.status === 201) {
      var icon = button.querySelector('[data-icon]')
      if (icon) {
        icon.textContent = 'bookmark'
        icon.setAttribute('data-icon', 'bookmark')
      }
      button.setAttribute('aria-pressed', 'true')
      return
    }
    return response.json().then(function (payload) {
      var message = payload && payload.error && payload.error.message ? payload.error.message : 'Request failed'
      bookmarkError(message)
    })
  }).catch(function () {
    bookmarkError('Request failed')
  })
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
  lastItems = items
  lastError = ''
  syncCardStatus()
  paintChips()
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
          saveFavourite(item.id, bookmark)
          return
        }
        window.location.assign('/profil/' + item.id)
      })
      article.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return
        var bookmark = event.target && event.target.closest ? event.target.closest('[data-bookmark]') : null
        if (bookmark) {
          event.preventDefault()
          saveFavourite(item.id, bookmark)
          return
        }
        window.location.assign('/profil/' + item.id)
      })
    }
    tiles.appendChild(node)
  })
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      deferred.forEach(function (entry) {
        var image = document.createElement('img')
        image.alt = ''
        image.className = 'absolute inset-0 h-full w-full object-cover'
        entry.photo.insertBefore(image, entry.photo.firstChild)
        image.src = entry.url
      })
    })
  })
}
function showError(message) {
  var tiles = document.getElementById('discover-tiles')
  var empty = document.getElementById('discover-empty')
  var error = document.getElementById('discover-error')
  var retry = document.getElementById('discover-retry')
  if (tiles) tiles.textContent = ''
  if (empty) empty.hidden = true
  if (error) {
    error.hidden = false
    error.textContent = message
  }
  if (retry) retry.hidden = false
  lastItems = null
  lastError = message
  syncCardStatus()
}
function loadGrid() {
  if (memory && Date.now() - memoryAt < URL_TTL) {
    paint(memory)
    return
  }
  memory = null
  var cached = readCache()
  if (cached) paint(cached)
  if (pending) return
  var ticket = ++generation
  pending = ticket
  var browseUrl = '/v1/browse?view=grid'
  var extra = filterQuery()
  if (extra) browseUrl += '&' + extra
  window.fetch(browseUrl, { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
    return response.json().then(function (body) {
      return { status: response.status, body: body }
    })
  }).then(function (result) {
    if (ticket !== generation) return
    pending = 0
    var body = result.body || {}
    var error = body.error
    if (error && error.code === 'PIN_REQUIRED') return
    if (result.status === 401) {
      window.location.assign('/auth')
      return
    }
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
    memoryAt = Date.now()
    writeCache(body.items)
    paint(body.items)
  }, function () {
    if (ticket !== generation) return
    pending = 0
    showError('Request failed')
  })
}
function bindRetry(node) {
  if (!node) return
  node.addEventListener('click', function () {
    memory = null
    memoryAt = 0
    pending = 0
    lastError = ''
    var error = document.getElementById('discover-error')
    var cardError = document.getElementById('discover-card-error')
    var cardRetry = document.getElementById('discover-card-retry')
    if (error) error.hidden = true
    if (cardError) cardError.hidden = true
    node.hidden = true
    if (cardRetry) cardRetry.hidden = true
    var gridRetry = document.getElementById('discover-retry')
    if (gridRetry) gridRetry.hidden = true
    loadGrid()
  })
}
bindRetry(document.getElementById('discover-retry'))
bindRetry(document.getElementById('discover-card-retry'))
function syncCardStatus() {
  var empty = document.getElementById('discover-card-empty')
  var error = document.getElementById('discover-card-error')
  var retry = document.getElementById('discover-card-retry')
  if (!filterParams().length) {
    if (empty) empty.hidden = true
    if (error) error.hidden = true
    if (retry) retry.hidden = true
    return
  }
  if (lastError) {
    if (empty) empty.hidden = true
    if (error) {
      error.hidden = false
      error.textContent = lastError
    }
    if (retry) retry.hidden = false
    return
  }
  if (empty) empty.hidden = !(lastItems && lastItems.length === 0)
  if (error) error.hidden = true
  if (retry) retry.hidden = true
}
function chipHosts() {
  var hosts = []
  document.querySelectorAll('[data-open-filters]').forEach(function (button) {
    var host = button.nextElementSibling
    if (!host || host.getAttribute('data-filter-chips') === null) {
      host = document.createElement('span')
      host.setAttribute('data-filter-chips', '')
      host.setAttribute('style', 'display:contents')
      button.insertAdjacentElement('afterend', host)
    }
    hosts.push(host)
  })
  return hosts
}
function optionLabel(key, value) {
  if (!catalogue || !Array.isArray(catalogue.filters)) return ''
  var match = ''
  catalogue.filters.forEach(function (filter) {
    if (!filter || filter.key !== key || !Array.isArray(filter.options)) return
    filter.options.forEach(function (option) {
      if (option && String(option.value) === value) match = option.label
    })
  })
  return match
}
function paintChips() {
  var hosts = chipHosts()
  var pairs = filterParams()
  hosts.forEach(function (host) { host.textContent = '' })
  if (!pairs.length || !catalogue) return
  var order = ['city', 'radius_km', 'practice', 'marital_status', 'madhhab', 'life_plans']
  order.forEach(function (key) {
    var found = null
    pairs.forEach(function (pair) { if (pair[0] === key) found = pair })
    if (!found || key === 'polygamy_intent') return
    var label = optionLabel(key, found[1])
    if (!label) return
    var text = label
    if (key === 'city') text = 'Ville : ' + label
    if (key === 'radius_km') text = 'Rayon : ' + found[1] + ' km'
    hosts.forEach(function (host) {
      var span = document.createElement('span')
      span.className = 'inline-flex items-center gap-1.5 bg-[#FBF8F1] border border-[#E2D4B8] px-3 py-1.5 rounded-lg text-xs text-deep-navy'
      if (key === 'practice') {
        span.className = 'inline-flex items-center gap-1 bg-[#FBF8F1] border border-[#E2D4B8] px-3 py-1.5 rounded-lg text-xs text-deep-navy font-medium'
        var icon = document.createElement('span')
        icon.className = 'material-symbols-outlined text-soft-gold text-sm'
        icon.setAttribute('data-icon', 'check')
        icon.textContent = 'check'
        var name = document.createElement('span')
        name.textContent = text
        span.appendChild(icon)
        span.appendChild(name)
      } else {
        span.textContent = text
      }
      host.appendChild(span)
    })
  })
}
function showFilterError(message) {
  var error = document.getElementById('filters-error')
  var retry = document.getElementById('filters-retry')
  var apply = document.getElementById('filters-apply')
  if (error) {
    error.hidden = false
    error.textContent = message
  }
  if (retry) retry.hidden = false
  if (apply) apply.disabled = true
}
function hideFilterError() {
  var error = document.getElementById('filters-error')
  var retry = document.getElementById('filters-retry')
  if (error) error.hidden = true
  if (retry) retry.hidden = true
}
function groupName(key) {
  if (key === 'city') return 'ville'
  if (key === 'radius_km') return 'distance'
  if (key === 'marital_status') return 'situation'
  if (key === 'practice') return 'pratique'
  if (key === 'life_plans') return 'echeance'
  return ''
}
function bindCatalogue(body) {
  if (!body || !Array.isArray(body.filters)) return false
  body.filters.forEach(function (filter) {
    if (!filter || typeof filter.key !== 'string' || !Array.isArray(filter.options)) return
    if (filter.key === 'madhhab') {
      var select = document.getElementById('madhhab-select')
      if (!select) return
      select.textContent = ''
      var blank = document.createElement('option')
      blank.value = ''
      blank.textContent = 'Indifférent'
      select.appendChild(blank)
      filter.options.forEach(function (option) {
        var node = document.createElement('option')
        node.value = option.value == null ? '' : String(option.value)
        node.textContent = option.label
        select.appendChild(node)
      })
      select.value = ''
      return
    }
    var name = groupName(filter.key)
    if (!name) return
    var inputs = document.querySelectorAll('#filters-modal input[name="' + name + '"]')
    filter.options.forEach(function (option, index) {
      var input = inputs[index]
      if (!input) return
      input.value = option.value == null ? '' : String(option.value)
      var title = input.parentElement ? input.parentElement.querySelector('.font-medium') : null
      var span = input.parentElement ? input.parentElement.querySelector('span') : null
      if (title) title.textContent = option.label
      else if (span) span.textContent = option.label
    })
  })
  return true
}
function ensureCatalogue() {
  if (catalogue) return Promise.resolve(true)
  if (cataloguePromise) return cataloguePromise
  cataloguePromise = window.fetch('/v1/filters', { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
    return response.json().then(function (body) {
      return { status: response.status, body: body }
    })
  }).then(function (result) {
    cataloguePromise = null
    var body = result.body || {}
    var error = body.error
    if (error && error.code === 'PIN_REQUIRED') return false
    if (result.status === 401) {
      window.location.assign('/auth')
      return false
    }
    if (result.status === 403 && error && error.details && error.details.reason === 'viewer_not_listable') {
      window.location.assign('/profile-edit')
      return false
    }
    if (result.status !== 200 || !bindCatalogue(body)) {
      showFilterError(error && error.message ? error.message : 'Request failed')
      return false
    }
    catalogue = body
    hideFilterError()
    var apply = document.getElementById('filters-apply')
    if (apply) apply.disabled = false
    paintChips()
    return true
  }, function () {
    cataloguePromise = null
    showFilterError('Request failed')
    return false
  })
  return cataloguePromise
}
function namedCity() {
  var picked = document.querySelector('#filters-modal input[name="ville"]:checked')
  return !!(picked && (picked.value === 'ouagadougou' || picked.value === 'bobo' || picked.value === 'koudougou'))
}
function syncRadius() {
  var named = namedCity()
  var inputs = document.querySelectorAll('#filters-modal input[name="distance"]')
  inputs.forEach(function (input) {
    input.disabled = !named
    if (!named) input.checked = false
  })
  if (named && !document.querySelector('#filters-modal input[name="distance"]:checked')) {
    var citywide = document.querySelector('#filters-modal input[name="distance"][value=""]')
    if (citywide) citywide.checked = true
  }
}
function clearFiltersForm() {
  document.querySelectorAll('#filters-modal input[type="radio"]').forEach(function (input) {
    input.checked = false
  })
  var select = document.getElementById('madhhab-select')
  if (select) select.value = ''
  syncRadius()
}
function applyUrlToForm() {
  clearFiltersForm()
  var params = new URLSearchParams(window.location.search)
  function check(name, value) {
    if (!value) return
    var input = document.querySelector('#filters-modal input[name="' + name + '"][value="' + value + '"]')
    if (input) input.checked = true
  }
  check('ville', params.get('city'))
  syncRadius()
  check('distance', params.get('radius_km'))
  check('situation', params.get('marital_status'))
  check('pratique', params.get('practice'))
  check('echeance', params.get('life_plans'))
  var select = document.getElementById('madhhab-select')
  if (select) select.value = params.get('madhhab') || ''
}
function checkedValue(name) {
  var node = document.querySelector('#filters-modal input[name="' + name + '"]:checked')
  return node && !node.disabled ? node.value : ''
}
function appliedQuery() {
  var pairs = []
  function add(key, value) {
    if (value) pairs.push([key, value])
  }
  add('city', checkedValue('ville'))
  add('radius_km', checkedValue('distance'))
  add('marital_status', checkedValue('situation'))
  if (document.body.getAttribute('data-viewer-gender') === 'sister' && checkedValue('situation') === 'married') {
    add('polygamy_intent', 'yes')
  }
  add('practice', checkedValue('pratique'))
  var select = document.getElementById('madhhab-select')
  add('madhhab', select ? select.value : '')
  add('life_plans', checkedValue('echeance'))
  pairs.sort(function (left, right) { return left[0] < right[0] ? -1 : 1 })
  return pairs.map(function (pair) {
    return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1])
  }).join('&')
}
function openFilters() {
  var modal = document.getElementById('filters-modal')
  if (!modal) return
  modal.hidden = false
  ensureCatalogue().then(function (ok) {
    if (ok) applyUrlToForm()
  })
}
function closeFilters() {
  var modal = document.getElementById('filters-modal')
  if (modal) modal.hidden = true
}
var canvas = document.getElementById('filters-canvas')
if (canvas) canvas.addEventListener('click', function (event) {
  if (event.target === canvas) closeFilters()
})
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeFilters()
})
var filtersForm = document.getElementById('filters-form')
if (filtersForm) {
  filtersForm.addEventListener('change', function () { syncRadius() })
  filtersForm.addEventListener('reset', function () {
    setTimeout(clearFiltersForm, 0)
  })
  filtersForm.addEventListener('submit', function (event) {
    event.preventDefault()
    var apply = document.getElementById('filters-apply')
    if (apply && apply.disabled) return
    var query = appliedQuery()
    window.location.assign(query ? '/decouvrir?' + query : '/decouvrir')
  })
}
var filtersRetry = document.getElementById('filters-retry')
if (filtersRetry) filtersRetry.addEventListener('click', function () {
  catalogue = null
  hideFilterError()
  ensureCatalogue().then(function (ok) {
    if (ok) applyUrlToForm()
  })
})
if (filterParams().length) {
  var homeCard = document.getElementById('discover-card')
  var homeGrid = document.getElementById('discover-grid')
  if (homeCard) homeCard.hidden = true
  if (homeGrid) homeGrid.hidden = false
  ensureCatalogue()
  loadGrid()
}
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

function removeSpanAt(html: string, start: number): string {
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

/** Drops the outer chip, not only the label nested inside it. */
function dropChipContaining(html: string, needle: string): string {
  const at = html.indexOf(needle)
  if (at < 0) {
    return html
  }
  let from = at
  while (from >= 0) {
    const start = html.lastIndexOf('<span', from)
    if (start < 0) {
      return html
    }
    const openEnd = html.indexOf('>', start)
    if (openEnd >= 0 && openEnd < at && html.slice(start, openEnd).includes('inline-flex')) {
      return removeSpanAt(html, start)
    }
    from = start - 1
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

const CARD_STATUS = `<div id="discover-card-status" class="max-w-2xl mx-auto w-full mt-2 min-w-0">
<p id="discover-card-empty" hidden class="text-sm text-deep-navy/80 m-0">Aucun profil pour ces filtres.</p>
<p id="discover-card-error" hidden class="text-sm text-deep-navy/80 m-0 break-words"></p>
<button id="discover-card-retry" hidden type="button" class="mt-3 inline-flex items-center border border-[#E2D4B8] text-deep-navy bg-cream rounded-lg px-4 py-2.5 text-sm font-medium min-h-[44px]">Réessayer</button>
</div>`

const FILTER_KEYS = ['city', 'radius_km', 'marital_status', 'polygamy_intent', 'practice', 'madhhab', 'life_plans']

function hasFilterSearch(search: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return FILTER_KEYS.some((key) => {
    const value = params.get(key)
    return value !== null && value.length > 0
  })
}

function markFiltersButton(html: string): string {
  const needle = 'Filtres</span>'
  let next = html
  let from = 0
  while (from < next.length) {
    const at = next.indexOf(needle, from)
    if (at < 0) {
      return next
    }
    const start = next.lastIndexOf('<button', at)
    if (start < 0) {
      return next
    }
    if (!next.slice(start, at).includes('data-open-filters')) {
      next = `${next.slice(0, start)}<button type="button" data-open-filters="true" style="min-height:44px" ${next.slice(start + '<button'.length)}`
    }
    from = at + needle.length
  }
  return next
}

function loadFiltersSource(): string {
  const beside = fileURLToPath(new URL('../../../design-stitch/ankanu-v2/14-filters/screen.html', import.meta.url))
  const candidates = [
    beside,
    resolve(process.cwd(), 'design-stitch/ankanu-v2/14-filters/screen.html'),
    resolve(process.cwd(), '../design-stitch/ankanu-v2/14-filters/screen.html'),
    resolve(process.cwd(), '../../design-stitch/ankanu-v2/14-filters/screen.html'),
    '/app/design-stitch/ankanu-v2/14-filters/screen.html',
  ]
  const found = candidates.find((path) => existsSync(path))
  if (!found) {
    throw new Error('code/design-stitch/ankanu-v2/14-filters/screen.html is not on disk')
  }
  return readFileSync(found, 'utf8')
}

function filterModal(source: string): string {
  const start = source.indexOf('<!-- Filter Modal Card Container -->')
  const end = source.indexOf('<!-- MEMBER BOTTOM')
  let card = start >= 0 && end > start ? source.slice(start, end) : ''
  card = stripInlineHandlers(card)
  card = card.replaceAll(' checked=""', '')
  card = card.replaceAll(' selected=""', '')
  card = card.replaceAll('name="distance"', 'name="distance" disabled=""')
  card = card.replace(
    'class="relative flex items-center justify-between p-3.5 border border-soft-gold bg-gold-soft/20 rounded-md cursor-pointer transition-colors duration-150"',
    'class="relative flex items-center justify-between p-3.5 border border-hairline bg-cream hover:border-soft-gold/60 rounded-md cursor-pointer transition-colors duration-150"',
  )
  card = card.replace(
    '<span class="font-body text-sm font-medium text-deep-navy">Ouagadougou</span>',
    '<span class="font-body text-sm text-deep-navy/85">Ouagadougou</span>',
  )
  card = card.replace(
    'class="flex items-center justify-center py-2.5 px-3 border border-soft-gold bg-gold-soft/20 rounded-md cursor-pointer text-center"',
    'class="flex items-center justify-center py-2.5 px-3 border border-hairline rounded-md cursor-pointer hover:border-soft-gold transition-colors duration-150 text-center"',
  )
  card = card.replace(
    '<span class="font-body text-sm text-deep-navy font-semibold">50 km</span>',
    '<span class="font-body text-sm text-deep-navy/80">50 km</span>',
  )
  card = card.replace(
    'class="inline-flex items-center px-4 py-2 rounded-full border border-soft-gold bg-gold-soft/20 cursor-pointer text-xs sm:text-sm font-medium text-deep-navy"',
    'class="inline-flex items-center px-4 py-2 rounded-full border border-hairline hover:border-soft-gold cursor-pointer text-xs sm:text-sm text-deep-navy/80"',
  )
  card = card.replace(
    'class="flex items-center justify-between sm:justify-center p-3 border border-soft-gold bg-gold-soft/20 rounded-md cursor-pointer text-center"',
    'class="flex items-center justify-between sm:justify-center p-3 border border-hairline hover:border-soft-gold rounded-md cursor-pointer text-center"',
  )
  card = card.replace(
    '<span class="font-body text-xs sm:text-sm font-medium text-deep-navy">Pratique assidue</span>',
    '<span class="font-body text-xs sm:text-sm text-deep-navy/85">Pratique assidue</span>',
  )
  card = card.replace(
    'class="flex items-center justify-between p-3.5 border border-soft-gold bg-gold-soft/20 rounded-md cursor-pointer transition-colors duration-150"',
    'class="flex items-center justify-between p-3.5 border border-hairline hover:border-soft-gold rounded-md cursor-pointer transition-colors duration-150"',
  )
  card = card.replace(
    '<option>Maliki (courant majoritaire burkinabè)</option>',
    '<option value="" selected="">Indifférent</option><option>Maliki (courant majoritaire burkinabè)</option>',
  )
  card = card.replace('<form class="space-y-8">', '<form id="filters-form" class="space-y-8">')
  card = card.replace(
    '<button class="w-full sm:w-auto px-6 py-3 text-sm font-medium text-deep-navy/70 hover:text-deep-navy transition-colors duration-150 text-center" type="reset">',
    '<button id="filters-reset" class="w-full sm:w-auto px-6 py-3 text-sm font-medium text-deep-navy/70 hover:text-deep-navy transition-colors duration-150 text-center" type="reset">',
  )
  card = card.replace(
    '<button class="w-full sm:w-auto px-8 py-3.5 bg-deep-navy text-on-navy rounded-md font-medium text-sm hover:bg-deep-navy/90 active:opacity-95 transition-all duration-150 shadow-sm flex items-center justify-center gap-2" type="submit">',
    '<button id="filters-apply" disabled class="w-full sm:w-auto px-8 py-3.5 bg-deep-navy text-on-navy rounded-md font-medium text-sm hover:bg-deep-navy/90 active:opacity-95 transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50" type="submit">',
  )
  card = card.replace(
    '<!-- Modal Actions -->',
    `<p id="filters-error" hidden class="text-sm text-deep-navy/80 m-0 break-words"></p>
<button id="filters-retry" hidden type="button" class="inline-flex items-center border border-[#E2D4B8] text-deep-navy bg-cream rounded-lg px-4 py-2.5 text-sm font-medium min-h-[44px]">Réessayer</button>
<!-- Modal Actions -->`,
  )
  return `<div id="filters-modal" hidden class="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-cream">
<style>
#filters-modal label:has(input:checked) { border-color: #C9A86C; background-color: rgba(230, 213, 168, 0.2); }
#filters-modal label:has(input:disabled) { opacity: 0.45; cursor: not-allowed; }
#filters-modal label, #filters-modal button, #filters-modal select { min-height: 44px; }
</style>
<main id="filters-canvas" class="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 md:py-12 flex flex-col items-center justify-center min-h-full min-w-0">${card}</main>
</div>`
}

function stripCard(html: string): string {
  const start = html.indexOf('<!-- 3. FOCUSED PROFILE CARD -->')
  const end = html.indexOf('<!-- 4. UNDER-CARD')
  let next = start >= 0 && end > start ? html.slice(0, start) + CARD_STATUS + html.slice(end) : html
  next = dropChipContaining(next, 'Ville : Ouagadougou')
  next = dropChipContaining(next, "Tranche d'âge")
  next = dropChipContaining(next, 'Pratique assidue')
  next = markFiltersButton(next)
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
    const sectionEnd = close + '</section>'.length
    next =
      html.slice(0, open + 1) +
      `<div id="discover-tiles" class="contents"></div>` +
      html.slice(close, sectionEnd) +
      GRID_STATUS +
      html.slice(sectionEnd)
  }
  next = dropChipContaining(next, 'Ville : Ouagadougou')
  next = dropChipContaining(next, "Tranche d'âge")
  next = dropChipContaining(next, 'Pratique assidue')
  next = markFiltersButton(next)
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
export function discoverHtml(
  card: string,
  grid: string,
  accountId: string | null = null,
  gender: '' | 'sister' | 'brother' = '',
  search = '',
): string {
  const account =
    accountId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)
      ? accountId
      : ''
  const viewer = gender === 'sister' || gender === 'brother' ? gender : ''
  const filtered = hasFilterSearch(search)
  const headEnd = card.indexOf('</head>')
  const head = headEnd < 0 ? card : card.slice(0, headEnd)
  const document = `${head}${DOT_PATTERN}</head>
<body data-discover-account="${account}" data-viewer-gender="${viewer}" class="min-h-full bg-cream text-deep-navy font-body flex flex-col antialiased selection:bg-gold-soft selection:text-deep-navy pb-20 md:pb-8">
<div id="discover-card"${filtered ? ' hidden' : ''} style="min-width:0;max-width:100%">${innerBody(stripCard(card))}</div>
<div id="discover-grid"${filtered ? '' : ' hidden'} style="min-width:0;max-width:100%">${innerBody(stripGrid(grid))}${TILE}</div>
${filterModal(loadFiltersSource())}
</body></html>`
  const page = prepareV2(document, SCRIPT)
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}
