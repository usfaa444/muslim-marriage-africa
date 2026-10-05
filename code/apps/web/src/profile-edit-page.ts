import { pinGuardScript } from './pin-guard'

const HOSTING_LINE =
  /<(span|p|div)[^>]*>[^<]*(?:Scaleway|Île-de-France|fr-par|hébergée souverainement)[^<]*<\/\1>\s*/g

const REACTIVATE_LINE = 'Réactivation en un clic sans reprise du parcours initial — vérifications d\'identité préservées.'

export function profileEditBehavior(): string {
  return `
(function () {
  var state = 'Active'
  function byId(id) {
    return document.getElementById(id)
  }
  function drawer() {
    return byId('pauseDrawer')
  }
  function drawerOpen() {
    var node = drawer()
    return Boolean(node && !node.classList.contains('hidden'))
  }
  function hide(node) {
    if (node) {
      node.classList.add('hidden')
    }
  }
  function show(node) {
    if (node) {
      node.classList.remove('hidden')
    }
  }
  function buttonSpans(button) {
    return button ? button.querySelectorAll('span') : []
  }
  function paint() {
    var button = byId('togglePauseBtn')
    if (!button) {
      return
    }
    var spans = buttonSpans(button)
    var icon = spans[0]
    var label = spans[1]
    button.disabled = state === 'held'
    button.style.color = state === 'held' ? '#B5A894' : ''
    if (icon) {
      icon.textContent = state === 'deactivated' ? 'play_circle' : 'pause_circle'
    }
    if (label) {
      label.textContent = state === 'deactivated' ? 'Réactiver mon profil' : 'Configurer une pause'
    }
    if (state !== 'Active') {
      hide(drawer())
    }
  }
  function showSuccess(title, line) {
    hide(byId('alertError'))
    var box = byId('alertSuccess')
    if (!box) {
      return
    }
    var lines = box.querySelectorAll('p')
    if (lines[0]) {
      lines[0].textContent = title
    }
    if (lines[1]) {
      lines[1].textContent = line
    }
    show(box)
  }
  function showError(message) {
    hide(byId('alertSuccess'))
    var slot = byId('alertErrorMessage')
    if (slot) {
      slot.textContent = message || ''
    }
    show(byId('alertError'))
  }
  function saveIdle() {
    var button = byId('saveButton')
    var spinner = byId('saveSpinner')
    var text = byId('saveText')
    if (button) {
      button.disabled = false
    }
    hide(spinner)
    if (text) {
      text.textContent = 'Enregistrer les modifications'
    }
  }
  function saveBusy() {
    var button = byId('saveButton')
    var spinner = byId('saveSpinner')
    var text = byId('saveText')
    if (button) {
      button.disabled = true
    }
    show(spinner)
    if (text) {
      text.textContent = 'Examen de conformité...'
    }
  }
  function errorMessage(body) {
    return body && body.error && body.error.message ? body.error.message : ''
  }
  function readJson(response) {
    return response.json().then(function (body) {
      return { ok: response.ok, body: body }
    }, function () {
      return { ok: response.ok, body: null }
    })
  }
  function onToggle(event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (state === 'held') {
      return
    }
    if (state === 'deactivated') {
      var button = byId('togglePauseBtn')
      if (button) {
        button.disabled = true
      }
      fetch('/v1/me/reactivate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      }).then(readJson).then(function (result) {
        if (button) {
          button.disabled = false
        }
        if (result.ok && result.body && result.body.status === 'Active') {
          state = 'Active'
          paint()
          showSuccess('Profil réactivé', 'Votre compte est de nouveau actif.')
          return
        }
        showError(errorMessage(result.body))
      }, function () {
        if (button) {
          button.disabled = false
        }
        showError('')
      })
      return
    }
    var node = drawer()
    if (node) {
      node.classList.toggle('hidden')
    }
  }
  function onSave(event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (state !== 'Active' || !drawerOpen()) {
      return
    }
    var checked = document.querySelector('input[name="pause_reason"]:checked')
    var reason = checked ? checked.value : ''
    var field = drawer() ? drawer().querySelector('input[type="text"]') : null
    var note = field ? field.value : ''
    var payload = { reason: reason }
    if (note.trim()) {
      payload.note = note
    }
    saveBusy()
    fetch('/v1/me/deactivate', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(readJson).then(function (result) {
      saveIdle()
      if (result.ok && result.body && result.body.status === 'deactivated') {
        state = 'deactivated'
        paint()
        showSuccess('Pause enregistrée', ${JSON.stringify(REACTIVATE_LINE)})
        return
      }
      showError(errorMessage(result.body))
    }, function () {
      saveIdle()
      showError('')
    })
  }
  function onCancel(event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    hide(drawer())
  }
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = byId('togglePauseBtn')
    var save = byId('saveButton')
    if (toggle) {
      toggle.addEventListener('click', onToggle, true)
    }
    if (save) {
      save.addEventListener('click', onSave, true)
    }
    var buttons = document.querySelectorAll('button')
    for (var i = 0; i < buttons.length; i += 1) {
      if ((buttons[i].textContent || '').trim() === 'Annuler') {
        buttons[i].addEventListener('click', onCancel, true)
      }
    }
    fetch('/v1/me/deactivate', { credentials: 'same-origin' }).then(readJson).then(function (result) {
      if (result.ok && result.body && typeof result.body.status === 'string') {
        state = result.body.status
        paint()
        return
      }
      showError(errorMessage(result.body))
    }, function () {
      showError('')
    })
  })
})()
`
}

export function profileEditPageHtml(stitchHtml: string): string {
  const stripped = stitchHtml.replace(HOSTING_LINE, '')
  const close = stripped.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('profile edit screen has no body')
  }
  const behavior = `<script>${profileEditBehavior()}</script>`
  return `${stripped.slice(0, close)}${pinGuardScript()}${behavior}${stripped.slice(close)}`
}
