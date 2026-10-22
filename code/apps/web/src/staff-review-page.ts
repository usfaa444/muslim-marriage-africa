import { POSE_LABEL, poseSvg } from './liveness-pose-ui'
import { staffPage, type StaffIdentity } from './staff-pages'

/**
 * `/staff/revue`: the staff review console (Stories 2.8, 3.3, 2.6, 12.1; Stitch 41 queue and 42 case file).
 * Queue on the left and the case on the right from 768 px, stacked below. Evidence is loaded only when the
 * Moderator asks, from the no-store staff endpoint, into memory (an object URL), never into client storage.
 */

export const REVIEW_TITLE = 'Revue des inscriptions'

export const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  granted: 'Approuvé',
  rejected: 'Refusé',
  held: "Retenu (contrôle d'âge)",
}

export const ID_REASON_LABEL: Record<string, string> = {
  unreadable: 'Illisible',
  not_an_id: "Pas une pièce d'identité",
  mismatch: 'Nom ou visage différent',
  expired: 'Pièce expirée',
}

export const LIVENESS_REASON_LABEL: Record<string, string> = {
  pose_not_done: 'Geste demandé non fait',
  not_same_person: 'Pas la même personne que la pièce ou les photos',
  photo_of_photo: "Photo d'une photo ou d'un écran",
  unclear: 'Selfie pas assez net',
}

/** Sent as the `reason` text of the existing profile review decision (Story 3.3) when something is refused. */
export const PROFILE_BLOCK_REASONS = [
  'Photo non conforme aux règles',
  'Présentation (bio) non conforme',
  'Informations du profil inappropriées',
] as const

/** The profile's `visibility` in the staff's words. */
export const VISIBILITY_LABEL: Record<string, string> = {
  public: 'publiée',
  unpublished: 'non publiée',
  held: "retenue (contrôle d'âge)",
  emergency_hidden: "masquée d'urgence",
}

export const FIELD_LABEL: Record<string, string> = {
  city: 'Ville',
  country: 'Pays',
  origin: 'Origine',
  marital_status: 'Situation matrimoniale',
  polygamy_intent: 'Polygamie',
  education: 'Études',
  profession: 'Profession',
  madhhab: 'Madhhab',
  practice: 'Pratique',
  life_plans: 'Projets de vie',
  bio_live: 'Présentation publiée',
  bio_pending: 'Présentation en attente',
}

const PANE = 'bg-cream border border-hairline rounded-md min-w-0'
const CARD_BG = 'background-color: rgb(251, 248, 241);'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

const FIT = `<style id="staff-review-fit">
#review-root, #review-root section, #review-queue, #review-case, #review-case * { min-width: 0; }
#review-case p, #review-case dd, #review-case li, #review-queue li { overflow-wrap: anywhere; }
#review-case img { max-width: 100%; }
[hidden] { display: none !important; }
.review-blur { filter: blur(18px); transform: scale(1.08); }
</style>`

export function staffReviewHtml(stitch: string, identity: StaffIdentity | null): string {
  const roles = identity ? identity.roles.map((role) => (role === 'moderator' ? 'Modérateur' : role === 'operator' ? 'Opérateur' : role)).join(', ') : ''
  const who = identity
    ? `<p class="font-body text-sm text-deep-navy/75 mt-1 break-words" id="staff-identity">${escapeHtml(roles)} • ${escapeHtml(identity.email)}</p>`
    : ''
  const body = `<main class="flex-1 w-full" id="review-root">
<div class="max-w-7xl mx-auto px-4 md:px-12 py-8" data-testid="staff-content">
<div class="pb-6 border-b border-hairline/80 mb-6 flex flex-col gap-3">
<a class="inline-flex items-center gap-1 min-h-[44px] self-start text-xs font-medium text-deep-navy/80 hover:text-deep-navy underline underline-offset-4 decoration-hairline" href="/staff"><span class="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>Retour à la console</a>
<h1 class="font-display text-3xl md:text-4xl text-deep-navy font-normal">${REVIEW_TITLE}</h1>
${who}
<p class="text-sm text-deep-navy" data-testid="review-counts" id="review-counts" aria-live="polite">Chargement de la file…</p>
</div>
<p class="hidden mb-4 p-3 rounded-md border border-[#9B2C2C]/40 bg-[#9B2C2C]/5 text-sm text-[#9B2C2C] font-medium" id="review-error" role="alert"></p>
<p class="hidden mb-4 p-3 rounded-md border border-soft-gold/60 bg-soft-gold/10 text-sm text-deep-navy font-medium" id="review-done" role="status"></p>
<div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start" data-testid="staff-panes">
<section aria-label="Liste des fiches à examiner" class="md:col-span-5 flex flex-col gap-3 min-w-0" data-pane="queue">
<div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-deep-navy/75 px-1">
<span>File d'examen</span><span class="normal-case tracking-normal font-normal">Premium d'abord, puis les plus anciens</span>
</div>
<ul class="flex flex-col gap-3" data-testid="review-queue" id="review-queue"></ul>
<p class="hidden text-sm text-deep-navy/75 p-4 border border-hairline rounded-md" id="review-empty">Aucun dossier en attente.</p>
<p class="hidden text-sm text-deep-navy/75 p-4 border border-hairline rounded-md" data-testid="review-operator" id="review-operator">Les dossiers, les pièces et les décisions sont réservés aux modérateurs. Vous voyez les compteurs de la file.</p>
</section>
<section aria-label="Détails du dossier sélectionné" class="md:col-span-7 ${PANE} p-5 md:p-8 flex flex-col gap-6" data-pane="case" id="review-case-pane" style="${CARD_BG}">
<div id="review-placeholder">
<p class="text-xs font-mono uppercase tracking-wider text-deep-navy/75">Dossier d'inscription</p>
<h2 class="font-display text-2xl text-deep-navy" tabindex="-1">Instruction du dossier</h2>
<p class="text-sm text-deep-navy/70">Sélectionnez une fiche dans la file.</p>
</div>
<div class="hidden flex flex-col gap-6" data-testid="review-case" id="review-case"></div>
</section>
</div>
</div>
</main>
${FIT}`
  const pictos: Record<string, string> = {}
  for (const pose of Object.keys(POSE_LABEL)) {
    pictos[pose] = poseSvg(pose)
  }
  const config = {
    status: STATUS_LABEL,
    idReasons: ID_REASON_LABEL,
    liveReasons: LIVENESS_REASON_LABEL,
    profileReasons: PROFILE_BLOCK_REASONS,
    fields: FIELD_LABEL,
    visibility: VISIBILITY_LABEL,
    poses: POSE_LABEL,
    pictos,
  }
  return staffPage(stitch, `AnKanu — ${REVIEW_TITLE}`, body, `<script>${staffReviewScript(config)}</script>`)
}

export function staffReviewScript(config: unknown): string {
  return `(function () {
  var C = ${scriptJson(config)}
  var selected = null
  var currentCase = null
  var objectUrls = []
  function el(id) { return document.getElementById(id) }
  function make(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined && text !== null) node.textContent = text
    return node
  }
  function call(method, path, body) {
    return fetch(path, {
      method: method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store'
    }).then(function (response) {
      return response.json().catch(function () { return null }).then(function (json) {
        return { status: response.status, body: json }
      })
    })
  }
  function message(result) {
    return (result && result.body && result.body.error && result.body.error.message) || 'La requête a échoué.'
  }
  function showError(text) {
    var box = el('review-error')
    box.textContent = text || ''
    box.classList.toggle('hidden', !text)
  }
  function showDone(text) {
    var box = el('review-done')
    box.textContent = text || ''
    box.classList.toggle('hidden', !text)
  }
  function signedOut(result) {
    if (result.status === 401) { window.location.assign('/staff/connexion'); return true }
    return false
  }
  function day(iso) {
    if (!iso) return ''
    try {
      return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Ouagadougou' }).format(new Date(iso))
    } catch (error) { return iso }
  }
  function seen(visibility) {
    return C.visibility[visibility] || (visibility ? visibility : 'non publiée')
  }
  function chip(text, strong) {
    return make('span', 'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ' + (strong ? 'bg-deep-navy text-cream border-deep-navy' : 'bg-cream text-deep-navy border-hairline'), text)
  }
  function revokeUrls() {
    objectUrls.forEach(function (url) { try { URL.revokeObjectURL(url) } catch (error) {} })
    objectUrls = []
  }
  function counts(view) {
    var c = view.counts
    el('review-counts').textContent = 'En attente : ' + c.waiting + ' • Hors délai (' + view.sla_hours + ' h) : ' + c.sla_breach + ' • Premium : ' + c.premium
  }
  function renderQueue(view) {
    counts(view)
    var list = el('review-queue')
    list.textContent = ''
    if (view.role !== 'moderator') {
      el('review-operator').classList.remove('hidden')
      el('review-empty').classList.add('hidden')
      return
    }
    el('review-empty').classList.toggle('hidden', view.rows.length > 0)
    view.rows.forEach(function (row) {
      var item = make('li', '')
      var button = make('button', 'w-full text-left bg-cream border rounded-md p-4 min-h-[44px] flex flex-col gap-2 hover:border-soft-gold/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold ' + (selected === row.account_id ? 'border-deep-navy' : 'border-hairline'))
      button.type = 'button'
      button.style.backgroundColor = 'rgb(251, 248, 241)'
      button.setAttribute('data-account', row.account_id)
      button.setAttribute('aria-pressed', selected === row.account_id ? 'true' : 'false')
      var top = make('span', 'flex flex-wrap items-center justify-between gap-2')
      top.appendChild(make('span', 'text-base font-semibold text-deep-navy break-all', row.pseudonym || row.account_id))
      var tags = make('span', 'flex flex-wrap gap-1')
      tags.appendChild(chip(row.priority === 'premium' ? 'Premium' : 'Gratuit', row.priority === 'premium'))
      if (row.sla_breach) tags.appendChild(make('span', 'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-[#9B2C2C]/50 text-[#9B2C2C] bg-[#9B2C2C]/5', 'Hors délai'))
      top.appendChild(tags)
      button.appendChild(top)
      var pending = make('span', 'flex flex-wrap gap-1')
      if (row.pending.profile) pending.appendChild(chip('Profil'))
      if (row.pending.bio) pending.appendChild(chip('Présentation'))
      if (row.pending.photos > 0) pending.appendChild(chip('Photos : ' + row.pending.photos))
      if (row.pending.id_document) pending.appendChild(chip("Pièce d'identité"))
      if (row.pending.liveness) pending.appendChild(chip('Selfie'))
      button.appendChild(pending)
      button.appendChild(make('span', 'text-xs text-deep-navy/75', 'En attente depuis le ' + day(row.since)))
      button.addEventListener('click', function () { openCase(row.account_id, true) })
      item.appendChild(button)
      list.appendChild(item)
    })
  }
  function loadQueue() {
    return call('GET', '/v1/staff/review/queue').then(function (result) {
      if (signedOut(result)) return
      if (result.status !== 200 || !result.body) { showError(message(result)); return }
      renderQueue(result.body)
    }, function () { showError('La connexion a échoué.') })
  }
  function section(title, testid) {
    var box = make('section', 'flex flex-col gap-3 border-t border-hairline/70 pt-5')
    box.setAttribute('aria-label', title)
    if (testid) box.setAttribute('data-testid', testid)
    box.appendChild(make('h3', 'font-display text-xl text-deep-navy', title))
    return box
  }
  function definition(rows) {
    var list = make('dl', 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm')
    rows.forEach(function (pair) {
      var wrap = make('div', 'min-w-0')
      wrap.appendChild(make('dt', 'text-[11px] uppercase tracking-wider text-deep-navy/70 font-semibold', pair[0]))
      wrap.appendChild(make('dd', 'text-deep-navy', pair[1] === null || pair[1] === undefined || pair[1] === '' ? '—' : String(pair[1])))
      list.appendChild(wrap)
    })
    return list
  }
  function loadImage(path, img, holder, button) {
    showError('')
    button.disabled = true
    return fetch(path, { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return null }).then(function (body) {
          button.disabled = false
          if (response.status === 401) { window.location.assign('/staff/connexion'); return }
          showError(message({ body: body }))
        })
      }
      return response.blob().then(function (blob) {
        var url = URL.createObjectURL(blob)
        objectUrls.push(url)
        img.src = url
        holder.classList.remove('hidden')
        button.classList.add('hidden')
      })
    }, function () { button.disabled = false; showError('La connexion a échoué.') })
  }
  function evidenceBlock(card, title, alt, showLabel) {
    var box = make('div', 'flex flex-col gap-2')
    var meta = make('p', 'flex flex-wrap items-center gap-2 text-xs text-deep-navy/80')
    meta.appendChild(chip(C.status[card.status] || card.status, card.status === 'pending'))
    meta.appendChild(make('span', '', 'Envoyée le ' + day(card.captured_at)))
    box.appendChild(meta)
    var holder = make('div', 'hidden relative w-full max-w-md bg-deep-navy/5 border border-hairline rounded overflow-hidden')
    var img = make('img', 'block w-full h-auto')
    img.alt = alt
    holder.appendChild(img)
    var show = make('button', 'self-start min-h-[44px] px-4 rounded-md border border-deep-navy text-deep-navy text-sm font-medium hover:bg-deep-navy hover:text-cream', showLabel)
    show.type = 'button'
    show.addEventListener('click', function () { loadImage(card.evidence_url, img, holder, show) })
    box.appendChild(show)
    box.appendChild(holder)
    box.appendChild(make('p', 'text-[11px] text-deep-navy/70', 'Chaque consultation est consignée au registre d\\'audit.'))
    return box
  }
  var uid = 0
  function decisionForm(kind, card, reasons) {
    uid += 1
    var form = make('form', 'flex flex-col gap-3 p-4 border border-hairline rounded-md')
    form.noValidate = true
    form.setAttribute('data-testid', 'decision-' + kind)
    var legend = make('fieldset', 'flex flex-col gap-2')
    legend.appendChild(make('legend', 'text-sm font-semibold text-deep-navy mb-1', kind === 'id_document' ? "Décision sur la pièce d'identité" : 'Décision sur le selfie'))
    var choices = [['approve', 'Approuver'], ['reject', 'Refuser et demander une nouvelle prise'], ['suspected_minor', 'Mineure présumée (mise en attente)']]
    choices.forEach(function (choice) {
      var label = make('label', 'flex items-center gap-2 min-h-[44px] text-sm text-deep-navy cursor-pointer')
      var input = make('input', 'w-5 h-5')
      input.type = 'radio'
      input.name = 'decision-' + uid
      input.value = choice[0]
      label.appendChild(input)
      label.appendChild(make('span', '', choice[1]))
      legend.appendChild(label)
    })
    form.appendChild(legend)
    var reasonWrap = make('div', 'hidden flex flex-col gap-1')
    var reasonId = 'reason-' + uid
    var reasonLabel = make('label', 'text-xs font-semibold uppercase tracking-wider text-deep-navy/80', 'Motif du refus')
    reasonLabel.htmlFor = reasonId
    var select = make('select', 'w-full min-h-[44px] px-3 rounded-md bg-cream border border-hairline text-sm text-deep-navy')
    select.id = reasonId
    select.appendChild(make('option', '', 'Choisissez un motif'))
    select.options[0].value = ''
    Object.keys(reasons).forEach(function (key) {
      var option = make('option', '', reasons[key])
      option.value = key
      select.appendChild(option)
    })
    reasonWrap.appendChild(reasonLabel)
    reasonWrap.appendChild(select)
    form.appendChild(reasonWrap)
    var noteId = 'note-' + uid
    var noteLabel = make('label', 'text-xs font-semibold uppercase tracking-wider text-deep-navy/80', 'Note interne (facultative)')
    noteLabel.htmlFor = noteId
    var note = make('textarea', 'w-full px-3 py-2 rounded-md bg-cream border border-hairline text-sm text-deep-navy')
    note.id = noteId
    note.rows = 2
    note.maxLength = 500
    form.appendChild(noteLabel)
    form.appendChild(note)
    var submit = make('button', 'min-h-[48px] px-6 rounded-md bg-deep-navy text-cream font-medium text-sm', 'Enregistrer la décision')
    submit.type = 'submit'
    form.appendChild(submit)
    form.addEventListener('change', function () {
      var picked = form.querySelector('input[type=radio]:checked')
      reasonWrap.classList.toggle('hidden', !picked || picked.value !== 'reject')
    })
    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var picked = form.querySelector('input[type=radio]:checked')
      if (!picked) { showError('Choisissez une décision.'); return }
      if (picked.value === 'reject' && !select.value) { showError('Choisissez un motif de refus.'); select.focus(); return }
      var body = { kind: kind, account_id: currentCase.account_id, record_id: card.record_id, decision: picked.value }
      if (picked.value === 'reject') body.reason = select.value
      if (note.value.trim()) body.note = note.value.trim()
      submit.disabled = true
      showError('')
      call('POST', '/v1/staff/review/decisions', body).then(function (result) {
        submit.disabled = false
        if (signedOut(result)) return
        if (result.status !== 200) {
          showError(message(result))
          if (result.status === 409) refresh()
          return
        }
        showDone('Décision enregistrée : ' + (C.status[result.body.status] || result.body.status) + '. Visibilité du profil : ' + seen(result.body.visibility) + '.')
        refresh()
      }, function () { submit.disabled = false; showError('La connexion a échoué.') })
    })
    return form
  }
  function photoBlock(photo) {
    uid += 1
    var box = make('div', 'flex flex-col gap-2 p-3 border border-hairline rounded-md')
    box.setAttribute('data-testid', 'review-photo')
    var frame = make('div', 'relative w-full aspect-square max-w-[16rem] overflow-hidden rounded bg-deep-navy/5 border border-hairline')
    var img = make('img', 'review-blur absolute inset-0 w-full h-full object-cover')
    img.alt = 'Photo du profil (floutée)'
    img.src = photo.blur_url
    frame.appendChild(img)
    box.appendChild(frame)
    box.appendChild(make('p', 'text-xs text-deep-navy/80', (photo.moderation_state === 'pending' ? 'En revue' : 'Publiée') + (photo.is_main ? ' • Principale' : '')))
    var reasonId = 'unblur-' + uid
    var label = make('label', 'text-xs font-semibold text-deep-navy', 'Motif pour déflouter (consigné à l\\'audit)')
    label.htmlFor = reasonId
    var input = make('input', 'w-full min-h-[44px] px-3 rounded bg-cream border border-hairline text-sm text-deep-navy')
    input.id = reasonId
    input.type = 'text'
    input.maxLength = 300
    input.placeholder = 'Ex. comparer avec le selfie et la pièce'
    var button = make('button', 'self-start min-h-[44px] px-4 rounded-md bg-deep-navy text-cream text-sm font-medium disabled:opacity-40', 'Déflouter')
    button.type = 'button'
    button.disabled = true
    input.addEventListener('input', function () { button.disabled = input.value.trim().length < 10 })
    button.addEventListener('click', function () {
      button.disabled = true
      call('POST', '/v1/staff/review/photos/unblur', { account_id: currentCase.account_id, asset_id: photo.asset_id, reason: input.value.trim() }).then(function (result) {
        if (signedOut(result)) return
        if (result.status !== 201 || !result.body) { button.disabled = false; showError(message(result)); return }
        var shown = make('button', 'hidden', '')
        loadImage(result.body.url, img, frame, shown).then(function () {
          img.classList.remove('review-blur')
          img.alt = 'Photo du profil (défloutée pour la revue)'
          input.disabled = true
          button.textContent = 'Défloutée (consigné)'
        })
      }, function () { button.disabled = false; showError('La connexion a échoué.') })
    })
    box.appendChild(label)
    box.appendChild(input)
    box.appendChild(button)
    return box
  }
  function choiceRow(name, title, legendText) {
    uid += 1
    var group = make('fieldset', 'flex flex-col gap-1')
    group.appendChild(make('legend', 'text-sm font-semibold text-deep-navy', legendText))
    ;[['allow', 'Accepter'], ['block', 'Refuser']].forEach(function (choice) {
      var label = make('label', 'flex items-center gap-2 min-h-[44px] text-sm cursor-pointer')
      var input = make('input', 'w-5 h-5')
      input.type = 'radio'
      input.name = name + '-' + uid
      input.value = choice[0]
      input.setAttribute('data-target', name)
      label.appendChild(input)
      label.appendChild(make('span', '', choice[1]))
      group.appendChild(label)
    })
    return group
  }
  function profileForm(view) {
    var review = view.profile_review
    var form = make('form', 'flex flex-col gap-3 p-4 border border-hairline rounded-md')
    form.noValidate = true
    form.setAttribute('data-testid', 'decision-profile')
    if (review.profile_required) form.appendChild(choiceRow('profile', 'profile', 'Fiche du profil'))
    if (review.bio_required) form.appendChild(choiceRow('bio', 'bio', 'Présentation en attente'))
    review.photo_ids.forEach(function (id, index) { form.appendChild(choiceRow('photo:' + id, id, 'Photo en revue ' + (index + 1))) })
    uid += 1
    var reasonId = 'profile-reason-' + uid
    var label = make('label', 'text-xs font-semibold uppercase tracking-wider text-deep-navy/80', 'Motif si un élément est refusé')
    label.htmlFor = reasonId
    var select = make('select', 'w-full min-h-[44px] px-3 rounded-md bg-cream border border-hairline text-sm text-deep-navy')
    select.id = reasonId
    select.appendChild(make('option', '', 'Aucun refus'))
    select.options[0].value = ''
    C.profileReasons.forEach(function (text) { var option = make('option', '', text); option.value = text; select.appendChild(option) })
    form.appendChild(label)
    form.appendChild(select)
    var submit = make('button', 'min-h-[48px] px-6 rounded-md bg-deep-navy text-cream font-medium text-sm', 'Enregistrer la revue du profil')
    submit.type = 'submit'
    form.appendChild(submit)
    form.addEventListener('submit', function (event) {
      event.preventDefault()
      function picked(name) {
        var node = form.querySelector('input[data-target="' + name + '"]:checked')
        return node ? node.value : null
      }
      var body = { kind: 'profile_review', account_id: view.account_id, photos: [] }
      var missing = false
      if (review.profile_required) { body.profile = picked('profile'); missing = missing || !body.profile }
      if (review.bio_required) { body.bio = picked('bio'); missing = missing || !body.bio }
      review.photo_ids.forEach(function (id) {
        var decision = picked('photo:' + id)
        missing = missing || !decision
        body.photos.push({ asset_id: id, decision: decision })
      })
      if (missing) { showError('Décidez chaque élément du profil.'); return }
      var refused = body.profile === 'block' || body.bio === 'block' || body.photos.some(function (photo) { return photo.decision === 'block' })
      if (refused && !select.value) { showError('Choisissez un motif de refus.'); select.focus(); return }
      if (refused) body.reason = select.value
      submit.disabled = true
      showError('')
      call('POST', '/v1/staff/cases', body).then(function (result) {
        submit.disabled = false
        if (signedOut(result)) return
        if (result.status !== 200) {
          showError(message(result))
          if (result.status === 409) refresh()
          return
        }
        showDone('Revue du profil enregistrée. Visibilité du profil : ' + seen(result.body.visibility) + '.')
        refresh()
      }, function () { submit.disabled = false; showError('La connexion a échoué.') })
    })
    return form
  }
  function renderCase(view) {
    revokeUrls()
    currentCase = view
    var box = el('review-case')
    box.textContent = ''
    el('review-placeholder').classList.add('hidden')
    box.classList.remove('hidden')
    var head = make('div', 'flex flex-col gap-2')
    head.appendChild(make('p', 'text-xs font-mono uppercase tracking-wider text-deep-navy/75', "Dossier d'inscription"))
    var title = make('h2', 'font-display text-2xl md:text-3xl text-deep-navy break-all', view.pseudonym)
    title.tabIndex = -1
    title.id = 'review-case-title'
    head.appendChild(title)
    var tags = make('p', 'flex flex-wrap gap-2')
    tags.appendChild(chip(view.priority === 'premium' ? 'Premium' : 'Gratuit', view.priority === 'premium'))
    tags.appendChild(chip(view.age === null ? 'Âge inconnu' : view.age + ' ans'))
    tags.appendChild(chip(view.gender === 'sister' ? 'Sœur' : view.gender === 'brother' ? 'Frère' : view.gender))
    tags.appendChild(chip('Compte : ' + (view.account_status === 'Active' ? 'actif' : view.account_status === 'held' ? "retenu (contrôle d'âge)" : view.account_status)))
    tags.appendChild(chip('Visibilité : ' + seen(view.profile.visibility)))
    head.appendChild(tags)
    head.appendChild(make('p', 'text-xs text-deep-navy/75', 'Date de naissance déclarée : ' + view.dob))
    box.appendChild(head)

    var id = section("Pièce d'identité", 'case-id')
    if (view.id_document) {
      id.appendChild(evidenceBlock(view.id_document, "Pièce d'identité", "Pièce d'identité envoyée par le membre", 'Afficher la pièce'))
      if (view.id_document.status === 'pending') id.appendChild(decisionForm('id_document', view.id_document, C.idReasons))
    } else {
      id.appendChild(make('p', 'text-sm text-deep-navy/75', 'Aucune pièce envoyée.'))
    }
    box.appendChild(id)

    var live = section('Selfie avec geste', 'case-liveness')
    if (view.liveness) {
      var pose = make('div', 'flex items-center gap-3 p-3 rounded-md border border-soft-gold/60 bg-soft-gold/10')
      var picto = make('span', 'w-14 h-14 shrink-0 rounded-md bg-cream border border-hairline flex items-center justify-center')
      picto.innerHTML = C.pictos[view.liveness.pose] || ''
      pose.appendChild(picto)
      var words = make('div', 'min-w-0')
      words.appendChild(make('p', 'text-[11px] font-semibold uppercase tracking-wider text-deep-navy/75', 'Geste demandé'))
      var poseName = make('p', 'text-sm font-semibold text-deep-navy', view.liveness.pose_label || C.poses[view.liveness.pose] || 'Aucun geste enregistré')
      poseName.setAttribute('data-testid', 'case-pose')
      words.appendChild(poseName)
      pose.appendChild(words)
      live.appendChild(pose)
      live.appendChild(evidenceBlock(view.liveness, 'Selfie', 'Selfie envoyé par le membre', 'Afficher le selfie'))
      live.appendChild(make('p', 'text-xs text-deep-navy/80', 'Vérifiez que le geste est fait et que la personne est la même que sur la pièce et les photos.'))
      if (view.liveness.status === 'pending') live.appendChild(decisionForm('liveness', view.liveness, C.liveReasons))
    } else {
      live.appendChild(make('p', 'text-sm text-deep-navy/75', 'Aucun selfie envoyé.'))
    }
    box.appendChild(live)

    var photos = section('Photos du profil', 'case-photos')
    if (view.photos.length === 0) photos.appendChild(make('p', 'text-sm text-deep-navy/75', 'Aucune photo.'))
    var grid = make('div', 'grid grid-cols-1 sm:grid-cols-2 gap-3')
    view.photos.forEach(function (photo) { grid.appendChild(photoBlock(photo)) })
    photos.appendChild(grid)
    box.appendChild(photos)

    var profile = section('Profil', 'case-profile')
    profile.appendChild(definition(Object.keys(C.fields).map(function (key) { return [C.fields[key], view.profile[key]] })))
    if (view.profile_review.queued && (view.profile_review.profile_required || view.profile_review.bio_required || view.profile_review.photo_ids.length > 0)) {
      profile.appendChild(profileForm(view))
    } else {
      profile.appendChild(make('p', 'text-sm text-deep-navy/75', view.profile.review_passed_at ? 'Profil approuvé le ' + day(view.profile.review_passed_at) + '.' : 'Aucune revue de profil en attente.'))
    }
    box.appendChild(profile)

    var history = section('Décisions antérieures', 'case-history')
    if (view.history.length === 0) history.appendChild(make('p', 'text-sm text-deep-navy/75', 'Aucune décision antérieure.'))
    var list = make('ul', 'flex flex-col gap-2 text-sm')
    view.history.forEach(function (row) {
      var reasons = row.kind === 'id_document' ? C.idReasons : C.liveReasons
      var text = (row.kind === 'id_document' ? "Pièce d'identité" : 'Selfie') + ' du ' + day(row.captured_at) + ' : ' + (C.status[row.status] || row.status)
      if (row.reason) text += ' — ' + (reasons[row.reason] || (row.reason === 'suspected_minor' ? 'Mineure présumée' : row.reason))
      if (row.decided_at) text += ' (décidé le ' + day(row.decided_at) + ')'
      list.appendChild(make('li', 'p-2 border border-hairline rounded', text))
    })
    history.appendChild(list)
    box.appendChild(history)
  }
  /** Leaves nothing of a closed case in the page: no evidence, no forms. */
  function closeCase() {
    currentCase = null
    revokeUrls()
    var box = el('review-case')
    box.textContent = ''
    box.classList.add('hidden')
    el('review-placeholder').classList.remove('hidden')
  }
  function openCase(accountId, focus) {
    selected = accountId
    showError('')
    return call('GET', '/v1/staff/review/cases/' + encodeURIComponent(accountId)).then(function (result) {
      if (signedOut(result)) return
      if (result.status !== 200 || !result.body) {
        showError(message(result))
        closeCase()
        return
      }
      renderCase(result.body)
      document.querySelectorAll('#review-queue button').forEach(function (button) {
        var on = button.getAttribute('data-account') === accountId
        button.setAttribute('aria-pressed', on ? 'true' : 'false')
        button.classList.toggle('border-deep-navy', on)
        button.classList.toggle('border-hairline', !on)
      })
      if (focus) {
        var title = el('review-case-title')
        if (title) { title.focus(); if (title.scrollIntoView) title.scrollIntoView({ block: 'start' }) }
      }
    }, function () { showError('La connexion a échoué.') })
  }
  function refresh() {
    loadQueue().then(function () {
      if (!selected) return
      var still = document.querySelector('#review-queue button[data-account="' + selected + '"]')
      if (still) return openCase(selected, false)
      selected = null
      closeCase()
    })
  }
  window.addEventListener('pagehide', revokeUrls)
  loadQueue()
})()`
}
