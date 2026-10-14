import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

export type ProfileDetailPhoto = {
  id: string
  is_main: boolean
  url: string
}

export type ProfileDetailView = {
  profile: {
    id: string
    pseudonym: string
    age: number | null
    city: string | null
    country: string | null
    profession: string | null
    marital_status: string | null
    polygamy_intent: string | null
    madhhab: string | null
    practice: string | null
    life_plans: string | null
  }
  verification: {
    phone: boolean
    id: boolean
    mahram: boolean
  }
  photo_blur: boolean
  photos: ProfileDetailPhoto[]
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

const COUNTRY: Record<string, string> = {
  BF: '🇧🇫 Burkina Faso',
  CI: "🇨🇮 Côte d'Ivoire",
  ML: '🇲🇱 Mali',
  SN: '🇸🇳 Sénégal',
  NE: '🇳🇪 Niger',
  TG: '🇹🇬 Togo',
  BJ: '🇧🇯 Bénin',
  GN: '🇬🇳 Guinée',
  FR: '🇫🇷 France',
  CA: '🇨🇦 Canada',
  OTHER: 'Autre pays',
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

const MARITAL: Record<string, string> = {
  single: 'Célibataire',
  married: 'Marié(e)',
  divorced: 'Divorcé(e)',
  widowed: 'Veuf(ve)',
}

const POLYGAMY: Record<string, string> = {
  no: 'Non',
  yes: 'Oui',
}

const MADHHAB: Record<string, string> = {
  maliki: 'Maliki',
  hanafi: 'Hanafi',
  shafii: "Shafi'i",
  hanbali: 'Hanbali',
  apprentissage: 'En apprentissage / Sans attachement strict',
}

const PRACTICE: Record<string, string> = {
  assidue: 'Pratique assidue',
  heure: "Prières à l'heure",
  cheminement: 'En cheminement',
}

const TIMEFRAME: Record<string, string> = {
  immediate: 'Immédiatement (brefs délais)',
  '6months': "D'ici 6 mois",
  '1year': "D'ici un an",
  serene: "Plus d'un an / Selon cheminement",
}

const THUMB_SIZE = 'relative min-w-0 w-12 h-12 min-[768px]:w-20 min-[768px]:h-20 rounded-md overflow-hidden'
const BOOKMARK_SCRIPT = `document.querySelectorAll('[data-bookmark]').forEach(function (button) {
  button.addEventListener('click', function () {
    var target = button.getAttribute('data-target-id')
    if (!target) return
    var status = document.getElementById('profile-bookmark-status')
    if (!status) {
      status = document.createElement('p')
      status.id = 'profile-bookmark-status'
      status.setAttribute('role', 'status')
      status.className = 'text-sm text-deep-navy/80 break-words mt-2'
      button.insertAdjacentElement('afterend', status)
    }
    status.textContent = ''
    fetch('/v1/favourites', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target_id: target })
    }).then(function (response) {
      if (response.status === 200 || response.status === 201) {
        button.setAttribute('aria-pressed', 'true')
        return
      }
      return response.json().then(function (payload) {
        status.textContent = payload && payload.error && payload.error.message ? payload.error.message : 'Request failed'
      })
    }).catch(function () {
      status.textContent = 'Request failed'
    })
  })
})
document.querySelectorAll('[data-photo-src]').forEach(function (button) {
  button.addEventListener('click', function () {
    var hero = document.getElementById('profile-hero')
    var src = button.getAttribute('data-photo-src')
    if (hero && src) hero.setAttribute('src', src)
    document.querySelectorAll('[data-photo-src]').forEach(function (item) {
      item.className = item === button
        ? '${THUMB_SIZE} border-2 border-soft-gold bg-deep-navy/5 group cursor-pointer focus:outline-none'
        : '${THUMB_SIZE} border border-hairline/80 hover:border-soft-gold bg-deep-navy/5 group cursor-pointer transition-colors focus:outline-none'
    })
  })
})`

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function label(map: Record<string, string>, value: string | null): string | null {
  if (value === null || value.trim().length === 0) {
    return null
  }
  return map[value] ?? value
}

function intentionText(value: string | null): string | null {
  if (value === null || value.trim().length === 0) {
    return null
  }
  if (!value.startsWith('tf:')) {
    return value
  }
  const lineEnd = value.indexOf('\n')
  const head = lineEnd === -1 ? value.slice(3) : value.slice(3, lineEnd)
  const body = lineEnd === -1 ? '' : value.slice(lineEnd + 1).trim()
  if (body.length > 0) {
    return body
  }
  return TIMEFRAME[head] ?? null
}

function replaceDivInner(html: string, openTag: string, inner: string): string {
  const at = html.indexOf(openTag)
  if (at < 0) {
    return html
  }
  const openEnd = html.indexOf('>', at)
  if (openEnd < 0) {
    return html
  }
  let depth = 0
  for (let index = at; index < html.length; index += 1) {
    if (html.startsWith('<div', index)) {
      depth += 1
    } else if (html.startsWith('</div>', index)) {
      depth -= 1
      if (depth === 0) {
        return html.slice(0, openEnd + 1) + inner + html.slice(index)
      }
    }
  }
  return html
}

function endOfDiv(html: string, start: number): number {
  let depth = 0
  for (let index = start; index < html.length; index += 1) {
    if (html.startsWith('<div', index)) {
      depth += 1
    } else if (html.startsWith('</div>', index)) {
      depth -= 1
      if (depth === 0) {
        return index + 6
      }
    }
  }
  return -1
}

/** Removes the first `open` element whose body contains `mustContain`. */
function dropOpening(html: string, open: string, mustContain: string): string {
  let from = 0
  while (from < html.length) {
    const at = html.indexOf(open, from)
    if (at < 0) {
      return html
    }
    const end = endOfDiv(html, at)
    if (end < 0) {
      return html
    }
    if (html.slice(at, end).includes(mustContain)) {
      return html.slice(0, at) + html.slice(end)
    }
    from = end
  }
  return html
}

function placeLine(view: ProfileDetailView): string {
  const city = label(CITY, view.profile.city)
  const country = label(COUNTRY, view.profile.country)
  const profession = label(PROFESSION, view.profile.profession)
  const place = [city, country].filter((item): item is string => item !== null).join(', ')
  if (place && profession) {
    return escapeHtml(place) + ' <span class="text-soft-gold mx-1.5">•</span> ' + escapeHtml(profession)
  }
  return escapeHtml(place || profession || '')
}

function photoTag(url: string, alt: string, className: string, id?: string): string {
  const safeUrl = escapeHtml(url)
  const safeAlt = escapeHtml(alt)
  const identity = id ? ' id="' + id + '"' : ''
  return '<img' + identity + ' alt="' + safeAlt + '" class="' + className + '" src="' + safeUrl + '"/>'
}

function thumb(photo: ProfileDetailPhoto, index: number, blurred: boolean, current: boolean): string {
  const filter = blurred ? ' filter blur-xl scale-125 opacity-70' : ''
  const border = current
    ? 'border-2 border-soft-gold'
    : 'border border-hairline/80 hover:border-soft-gold transition-colors'
  const lock = blurred
    ? '<div class="absolute inset-0 bg-deep-navy/30 backdrop-blur-[2px] flex items-center justify-center"><span class="material-symbols-outlined text-gold-soft text-base" data-icon="lock">lock</span></div>'
    : ''
  const image = photoTag(photo.url, 'Photographie ' + String(index + 1), 'w-full h-full object-cover' + filter)
  const currentLabel = current ? ' (actuelle)' : ''
  return (
    '<button aria-label="Afficher la photographie ' +
    String(index + 1) +
    currentLabel +
    '" class="' + THUMB_SIZE + ' ' +
    border +
    ' bg-deep-navy/5 group cursor-pointer focus:outline-none" data-photo-src="' +
    escapeHtml(photo.url) +
    '" type="button">' +
    image +
    lock +
    '</button>'
  )
}

function applyPhotos(html: string, view: ProfileDetailView): string {
  const blurred = view.photo_blur !== false
  const main = view.photos.find((photo) => photo.is_main) ?? view.photos[0]
  let next = html
  if (!main) {
    next = next.replace(/<img\b[^>]*class="w-full h-full object-cover[^"]*"[^>]*>/i, '')
  } else {
    const filter = blurred ? ' filter blur-2xl scale-110 opacity-70' : ''
    next = next.replace(
      /<img\b[^>]*class="w-full h-full object-cover[^"]*"[^>]*>/i,
      photoTag(main.url, 'Photographie de profil', 'w-full h-full object-cover' + filter, 'profile-hero'),
    )
  }
  if (!blurred) {
    next = dropOpening(
      next,
      '<div class="absolute inset-0 bg-deep-navy/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-cream">',
      'Photographie réservée',
    )
    next = next.replace(
      /<button class="font-medium text-deep-navy hover:text-soft-gold[\s\S]*?Demander l'accès à la photographie[\s\S]*?<\/button>/,
      '',
    )
  }
  const thumbs = view.photos.map((photo, index) => thumb(photo, index, blurred, photo === main)).join('')
  const open = '<div class="px-5 py-3.5 bg-cream/60 border-t border-hairline/50 overflow-x-auto flex gap-3 pb-3 pt-3">'
  const wrapped =
    '<div class="px-5 py-3.5 bg-cream/60 border-t border-hairline/50 flex flex-wrap gap-2 min-[768px]:gap-3 pb-3 pt-3 min-w-0 max-w-full">'
  return replaceDivInner(next, open, thumbs).replace(open, wrapped)
}

function applyFields(html: string, view: ProfileDetailView): string {
  let next = html
  const marital = label(MARITAL, view.profile.marital_status)
  const polygamy = label(POLYGAMY, view.profile.polygamy_intent)
  const fact = '<div class="border-l-2 border-soft-gold pl-3">'
  if (!marital) {
    next = dropOpening(next, fact, 'Situation matrimoniale')
  } else {
    next = next.replace('Célibataire (jamais marié)', escapeHtml(marital))
  }
  if (!polygamy) {
    next = dropOpening(next, fact, 'Déclaration de polygamie')
  } else {
    next = next.replace('Projet monogame exclusif', escapeHtml(polygamy))
  }
  if (!marital && !polygamy) {
    next = dropOpening(next, '<div class="mb-8 p-5 rounded border border-hairline/80 bg-cream/40">', "Statut civil &amp; Engagement d'union")
  }

  const card = '<div class="p-3 rounded border border-hairline/70 bg-cream text-center">'
  const madhhab = label(MADHHAB, view.profile.madhhab)
  const practice = label(PRACTICE, view.profile.practice)
  const city = label(CITY, view.profile.city)
  if (!madhhab) {
    next = dropOpening(next, card, '>Madhhab<')
  } else {
    next = next.replace('>Maliki<', '>' + escapeHtml(madhhab) + '<')
  }
  if (!practice) {
    next = dropOpening(next, card, '>Pratique<')
  } else {
    next = next.replace('>Assidue<', '>' + escapeHtml(practice) + '<')
  }
  if (!city) {
    next = dropOpening(next, card, '>Résidence<')
  } else {
    const residence = next.indexOf('>Résidence<')
    const sample = next.indexOf('>Ouagadougou<', residence)
    if (sample >= 0) {
      next = next.slice(0, sample) + '>' + escapeHtml(city) + '<' + next.slice(sample + '>Ouagadougou<'.length)
    }
  }
  if (!madhhab && !practice && !city) {
    next = dropOpening(next, '<div class="mb-8">', 'Pratique éthique &amp; Ancrage')
  }

  const intention = intentionText(view.profile.life_plans)
  if (!intention) {
    next = dropOpening(
      next,
      '<div class="mb-10 p-6 rounded bg-cream border-l-4 border-soft-gold border-y border-r border-hairline/70">',
      'Intention de mariage',
    )
  } else {
    next = next.replace(
      /<blockquote class="font-display italic text-base sm:text-lg text-deep-navy leading-relaxed">[\s\S]*?<\/blockquote>/,
      '<blockquote class="font-display italic text-base sm:text-lg text-deep-navy leading-relaxed">' +
        '« ' +
        escapeHtml(intention) +
        ' »</blockquote>',
    )
  }
  return next
}

function applyLevels(html: string, view: ProfileDetailView): string {
  let next = html
  const level = '<div class="p-3.5 rounded border border-hairline/80 bg-cream/60 flex items-start gap-3">'
  if (!view.verification.phone) {
    next = dropOpening(next, level, 'Téléphone vérifié')
  }
  if (!view.verification.id) {
    next = dropOpening(next, level, 'Identité vérifiée')
    next = next.replace(
      /<span class="inline-flex items-center text-\[11px\] font-semibold tracking-wider text-soft-gold uppercase px-2 py-0\.5 rounded border border-soft-gold\/30 bg-gold-soft\/10">\s*Vérifié\s*<\/span>/,
      '',
    )
  }
  if (!view.verification.mahram) {
    next = dropOpening(next, level, 'Tuteur (Wali) associé')
  }
  if (!view.verification.phone && !view.verification.id && !view.verification.mahram) {
    next = dropOpening(next, '<div class="mb-8">', "Niveaux d'authentification stricts")
  }
  return next
}

/** Screen 15 filled from one public-profile read. Sample Stitch copy never stays. */
export function profileDetailHtml(stitch: string, view: ProfileDetailView): string {
  const name = escapeHtml(view.profile.pseudonym)
  const age = view.profile.age === null ? '' : ', ' + String(view.profile.age) + ' ans'
  let html = stitch
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>AnKanu • ' + name + '</title>')
  html = html.replace(
    'class="flex items-start justify-between border-b border-hairline/60 pb-6 mb-8 gap-4">\n<div>',
    'class="flex flex-wrap items-start justify-between border-b border-hairline/60 pb-6 mb-8 gap-4 min-w-0">\n<div class="min-w-0 max-w-full flex-1 basis-0">',
  )
  html = html.replace(
    'class="flex items-center gap-3"',
    'class="flex flex-wrap items-center gap-3 min-w-0"',
  )
  html = html.replace(
    'class="bg-[#FBF8F1] border border-hairline/70 rounded-md p-6 sm:p-10 shadow-[0_2px_16px_-8px_rgba(11,29,54,0.06)]"',
    'class="bg-[#FBF8F1] border border-hairline/70 rounded-md p-6 sm:p-10 shadow-[0_2px_16px_-8px_rgba(11,29,54,0.06)] min-w-0"',
  )
  html = html.replace('href="#"', 'href="/decouvrir"')
  html = html.replace('<span class="text-xs font-mono tracking-wider text-deep-navy/50">RÉF. BF-7049</span>', '')
  html = html.replace(
    /<h1 class="font-display text-2xl sm:text-3xl font-medium tracking-tight text-deep-navy">\s*Al-Hassan_BF, 29 ans\s*<\/h1>/,
    '<h1 class="font-display text-2xl sm:text-3xl font-medium tracking-tight text-deep-navy min-w-0 break-words">' +
      name +
      age +
      '</h1>',
  )
  html = html.replace(
    /<p class="mt-1\.5 text-sm sm:text-base text-deep-navy\/80 font-normal">[\s\S]*?<\/p>/,
    '<p class="mt-1.5 text-sm sm:text-base text-deep-navy/80 font-normal min-w-0 break-words">' + placeLine(view) + '</p>',
  )
  html = html.replace('class="grid grid-cols-3 gap-3"', 'class="grid grid-cols-1 min-[768px]:grid-cols-3 gap-3 min-w-0"')
  html = applyLevels(html, view)
  html = applyFields(html, view)
  html = applyPhotos(html, view)
  html = html.replace(
    'aria-label="Mémoriser discrètement ce profil"',
    `data-bookmark="true" data-target-id="${escapeHtml(view.profile.id)}" aria-label="Mémoriser discrètement ce profil"`,
  )
  const page = prepareV2(html, BOOKMARK_SCRIPT)
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}
