/** Browser behavior for the v2 signup and sign-in screens. No password is stored. */

export const COC_VERSION_ON_SCREEN = 'FR-089'
export const SIGNUP_DRAFT_KEY = 'ankanu.signup.v2'
export const SIGNUP_EMAIL_KEY = 'ankanu.signup.email'
export const SIGNUP_PHONE_KEY = 'ankanu.signup.phone'

const HELPERS = `
  var DRAFT = ${JSON.stringify(SIGNUP_DRAFT_KEY)}
  var EMAIL_KEY = ${JSON.stringify(SIGNUP_EMAIL_KEY)}
  var PHONE_KEY = ${JSON.stringify(SIGNUP_PHONE_KEY)}
  function readDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT)
      return raw ? JSON.parse(raw) : {}
    } catch (error) {
      return {}
    }
  }
  function writeDraft(patch) {
    var next = readDraft()
    Object.keys(patch).forEach(function (key) { next[key] = patch[key] })
    sessionStorage.setItem(DRAFT, JSON.stringify(next))
  }
  function clearDraft() {
    sessionStorage.removeItem(DRAFT)
    sessionStorage.removeItem('ankanu.signup')
    sessionStorage.removeItem(EMAIL_KEY)
    sessionStorage.removeItem(PHONE_KEY)
  }
  function errorMessage(payload) {
    if (payload && payload.error && typeof payload.error.message === 'string') {
      return payload.error.message
    }
    return ''
  }
  async function readJson(response) {
    try {
      return await response.json()
    } catch (error) {
      return null
    }
  }
  var STEP = {
    email: '/email-verification',
    phone: '/phone',
    otp: '/otp',
    identity: '/id-liveness',
    account: '/onboarding'
  }
  async function goToGate() {
    var response = await fetch('/v1/accounts/gate', { credentials: 'same-origin' })
    var payload = await readJson(response)
    var step = payload && payload.step
    window.location.assign(STEP[step] || '/onboarding')
  }
`

export function splashScript(): string {
  return `
    try { sessionStorage.removeItem(${JSON.stringify(SIGNUP_DRAFT_KEY)}) } catch (error) {}
    try { sessionStorage.removeItem('ankanu.signup') } catch (error) {}
  `
}

export function identityScript(): string {
  return `${HELPERS}
    var form = document.getElementById('ageGateForm')
    var first = document.getElementById('first-name')
    var last = document.getElementById('last-name')
    var button = document.getElementById('submitBtn')
    var draft = readDraft()
    if (first && draft.civil_given_name) first.value = draft.civil_given_name
    if (last && draft.civil_family_name) last.value = draft.civil_family_name
    if (draft.gender) {
      var picked = document.querySelector('input[name="gender"][value="' + (draft.gender === 'brother' ? 'frere' : 'soeur') + '"]')
      if (picked) picked.checked = true
    }
    function ready() {
      var gender = document.querySelector('input[name="gender"]:checked')
      return Boolean(first && first.value.trim() && last && last.value.trim() && gender)
    }
    function paint() {
      if (!button) return
      var on = ready()
      button.disabled = !on
      button.setAttribute('aria-disabled', on ? 'false' : 'true')
      button.classList.toggle('bg-deep-navy/40', !on)
      button.classList.toggle('opacity-50', !on)
      button.classList.toggle('cursor-not-allowed', !on)
      button.classList.toggle('bg-deep-navy', on)
      button.classList.toggle('cursor-pointer', on)
    }
    document.querySelectorAll('#ageGateForm input').forEach(function (input) {
      input.addEventListener('input', paint)
      input.addEventListener('change', paint)
    })
    paint()
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault()
        if (!ready()) return
        var gender = document.querySelector('input[name="gender"]:checked')
        writeDraft({
          civil_given_name: first.value.trim(),
          civil_family_name: last.value.trim(),
          gender: gender && gender.value === 'frere' ? 'brother' : 'sister'
        })
        window.location.assign('/signup/pseudonym')
      })
    }
  `
}

export function pseudonymScript(): string {
  return `${HELPERS}
    var form = document.querySelector('form')
    var pseudo = document.getElementById('pseudonym')
    var day = document.getElementById('birth_day')
    var month = document.getElementById('birth_month')
    var year = document.getElementById('birth_year')
    var notice = Array.from(document.querySelectorAll('p')).find(function (node) {
      return (node.textContent || '').indexOf('19 ans') !== -1
    })
    var draft = readDraft()
    if (!draft.civil_given_name || !draft.gender) {
      window.location.assign('/signup/identity')
    }
    if (pseudo && draft.pseudonym) pseudo.value = draft.pseudonym
    if (draft.dob && day && month && year) {
      var parts = String(draft.dob).split('-')
      year.value = parts[0] || ''
      month.value = parts[1] || ''
      day.value = parts[2] || ''
    }
    function dobValue() {
      if (!day || !month || !year || !day.value || !month.value || !year.value) return ''
      return year.value + '-' + month.value + '-' + day.value
    }
    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault()
        if (pseudo) pseudo.setCustomValidity('')
        if (notice) notice.classList.remove('text-[#9B2C2C]', 'font-semibold')
        var dob = dobValue()
        var response = await fetch('/v1/accounts/precheck', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pseudonym: pseudo ? pseudo.value.trim() : '', dob: dob })
        })
        var payload = await readJson(response)
        if (response.status === 400) {
          var field = payload && payload.error && payload.error.details && payload.error.details.field
          if (field === 'pseudonym' && pseudo) {
            pseudo.setCustomValidity(errorMessage(payload))
            pseudo.reportValidity()
          }
          if (field === 'dob' && notice) notice.classList.add('text-[#9B2C2C]', 'font-semibold')
          return
        }
        if (!response.ok || !payload) return
        if (payload.pseudonym_available !== true && pseudo) {
          pseudo.setCustomValidity('pseudonym')
          pseudo.reportValidity()
        }
        if (payload.age_eligible !== true && notice) {
          notice.classList.add('text-[#9B2C2C]', 'font-semibold')
        }
        if (payload.pseudonym_available === true && payload.age_eligible === true) {
          writeDraft({ pseudonym: pseudo.value.trim(), dob: dob })
          window.location.assign('/signup/account')
        }
      })
    }
  `
}

export function accountScript(siteKey: string, panel: 'signup' | 'login'): string {
  return `${HELPERS}
    var SITE_KEY = ${JSON.stringify(siteKey)}
    var PANEL = ${JSON.stringify(panel)}
    var widgets = {}
    window.onRecaptchaLoad = function () {
      if (!window.grecaptcha || !SITE_KEY) return
      var signup = document.getElementById('signup-recaptcha')
      var login = document.getElementById('login-recaptcha')
      if (signup) widgets.signup = window.grecaptcha.render(signup, { sitekey: SITE_KEY, callback: paintSignup })
      if (login) widgets.login = window.grecaptcha.render(login, { sitekey: SITE_KEY, callback: paintLogin })
    }
    function token(name) {
      if (!window.grecaptcha || widgets[name] === undefined) return ''
      return window.grecaptcha.getResponse(widgets[name]) || ''
    }
    function paintSignup() {
      var button = document.getElementById('signup-submit')
      var email = document.getElementById('signup-email')
      var password = document.getElementById('signup-password')
      var pledge = document.getElementById('signup-pledge')
      if (!button) return
      var on = Boolean(email && email.value && password && password.value.length >= 12 && pledge && pledge.checked && token('signup'))
      button.disabled = !on
      button.classList.toggle('opacity-50', !on)
      button.classList.toggle('cursor-not-allowed', !on)
    }
    function paintLogin() {
      var button = document.getElementById('login-submit')
      var email = document.getElementById('login-email')
      var password = document.getElementById('login-password')
      if (!button) return
      var on = Boolean(email && email.value && password && password.value && token('login'))
      button.disabled = !on
      button.classList.toggle('opacity-50', !on)
      button.classList.toggle('cursor-not-allowed', !on)
    }
    var signupTab = document.getElementById('tab-signup')
    var loginTab = document.getElementById('tab-login')
    if (signupTab) {
      signupTab.addEventListener('click', function () {
        if (PANEL === 'login') window.location.assign('/signup')
      })
    }
    if (loginTab) {
      loginTab.addEventListener('click', function () {
        if (PANEL === 'signup') window.location.assign('/auth')
      })
    }
    document.querySelectorAll('button[aria-label="Afficher ou masquer le mot de passe"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var input = button.parentElement && button.parentElement.querySelector('input')
        if (!input) return
        input.type = input.type === 'password' ? 'text' : 'password'
      })
    })
    var draft = readDraft()
    if (PANEL === 'signup' && (!draft.pseudonym || !draft.dob || !draft.civil_given_name || !draft.gender)) {
      window.location.assign('/signup')
    }
    ;['signup-email', 'signup-password', 'signup-pledge'].forEach(function (id) {
      var node = document.getElementById(id)
      if (node) node.addEventListener('input', paintSignup)
      if (node) node.addEventListener('change', paintSignup)
    })
    ;['login-email', 'login-password'].forEach(function (id) {
      var node = document.getElementById(id)
      if (node) node.addEventListener('input', paintLogin)
    })
    var signupForm = document.getElementById('signup-form')
    if (signupForm) {
      signupForm.addEventListener('submit', async function (event) {
        event.preventDefault()
        var email = document.getElementById('signup-email')
        var password = document.getElementById('signup-password')
        var button = document.getElementById('signup-submit')
        if (!email || !password || !button || button.disabled) return
        button.disabled = true
        var response = await fetch('/v1/accounts', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: email.value.trim(),
            password: password.value,
            pseudonym: draft.pseudonym,
            gender: draft.gender,
            pledge_accepted: true,
            civil_given_name: draft.civil_given_name,
            civil_family_name: draft.civil_family_name,
            recaptcha_token: token('signup'),
            coc_version: ${JSON.stringify(COC_VERSION_ON_SCREEN)},
            dob: draft.dob
          })
        })
        if (response.status === 201) {
          sessionStorage.setItem(EMAIL_KEY, email.value.trim())
          sessionStorage.removeItem(DRAFT)
          sessionStorage.removeItem('ankanu.signup')
          window.location.assign('/email-verification')
          return
        }
        button.disabled = false
        var payload = await readJson(response)
        var emailError = document.getElementById('email-error')
        if (emailError) {
          emailError.classList.remove('hidden')
          emailError.lastChild && (emailError.lastChild.textContent = ' ' + (errorMessage(payload) || 'Création refusée.'))
        }
      })
    }
    var loginForm = document.getElementById('login-form')
    if (loginForm) {
      loginForm.addEventListener('submit', async function (event) {
        event.preventDefault()
        var email = document.getElementById('login-email')
        var password = document.getElementById('login-password')
        var remember = document.getElementById('login-remember')
        var button = document.getElementById('login-submit')
        if (!email || !password || !button || button.disabled) return
        button.disabled = true
        var response = await fetch('/v1/sessions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            identifier: email.value.trim(),
            password: password.value,
            remember_me: Boolean(remember && remember.checked),
            recaptcha_token: token('login')
          })
        })
        if (response.status === 201) {
          await goToGate()
          return
        }
        button.disabled = false
      })
    }
  `
}

export function emailScript(): string {
  return `${HELPERS}
    var shown = document.getElementById('currentEmail')
    var stored = ''
    try { stored = sessionStorage.getItem(EMAIL_KEY) || '' } catch (error) { stored = '' }
    if (shown && stored) shown.textContent = stored
    var editButton = document.getElementById('editEmailBtn')
    var editForm = document.getElementById('editEmailForm')
    if (editButton && editForm) {
      editButton.addEventListener('click', function () {
        editForm.classList.toggle('hidden')
      })
    }
    var save = editForm && editForm.querySelector('button')
    if (save) {
      save.addEventListener('click', function (event) {
        event.preventDefault()
      })
    }
    var params = new URLSearchParams(window.location.search)
    var token = params.get('token')
    if (token) {
      fetch('/v1/accounts/email-verifications/consume', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token })
      }).then(function (response) {
        if (response.status === 200) window.location.assign('/phone')
      })
    }
    var resend = document.getElementById('resendBtn')
    var banner = document.getElementById('resendSuccessBanner')
    if (resend) {
      resend.addEventListener('click', async function () {
        resend.disabled = true
        var response = await fetch('/v1/accounts/email-verifications', {
          method: 'POST',
          credentials: 'same-origin'
        })
        if (response.status === 201 && banner) banner.classList.remove('hidden')
        resend.disabled = false
      })
    }
  `
}

export function phoneScript(): string {
  return `${HELPERS}
    var input = document.getElementById('phone-input')
    if (input) input.value = ''
    var display = document.getElementById('phone-display')
    if (display) display.textContent = ''
    var otpStep = document.getElementById('step-otp')
    if (otpStep) otpStep.classList.add('hidden')
    var form = document.getElementById('phone-form')
    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault()
        var digits = (input && input.value || '').replace(/\\D/g, '')
        if (digits.length !== 8) return
        var phone = '+226' + digits
        var response = await fetch('/v1/verifications/otp', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'send', phone_e164: phone })
        })
        if (response.status === 201 || response.status === 200) {
          sessionStorage.setItem(PHONE_KEY, phone)
          window.location.assign('/otp')
        }
      })
    }
  `
}

export function otpScript(): string {
  return `${HELPERS}
    var boxes = Array.from(document.querySelectorAll('.otp-digit'))
    boxes.forEach(function (input, index) {
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\\D/g, '').slice(0, 1)
        if (input.value && boxes[index + 1]) boxes[index + 1].focus()
      })
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Backspace' && !input.value && boxes[index - 1]) boxes[index - 1].focus()
      })
    })
    function code() {
      return boxes.map(function (input) { return input.value }).join('')
    }
    var form = document.getElementById('otp-form')
    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault()
        if (code().length !== 6) return
        var response = await fetch('/v1/verifications/otp', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'verify', code: code() })
        })
        var payload = await readJson(response)
        if (response.ok && payload && payload.status === 'granted') {
          window.location.assign('/id-liveness')
        }
      })
    }
    var resend = document.getElementById('resend-btn')
    if (resend) {
      resend.addEventListener('click', async function () {
        var phone = ''
        try { phone = sessionStorage.getItem(PHONE_KEY) || '' } catch (error) { phone = '' }
        if (!phone) {
          window.location.assign('/phone')
          return
        }
        await fetch('/v1/verifications/otp', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'send', phone_e164: phone })
        })
      })
    }
    document.querySelectorAll('a').forEach(function (link) {
      if ((link.textContent || '').indexOf('Modifier le numéro') !== -1) {
        link.setAttribute('href', '/phone')
      }
    })
  `
}

export function idScript(): string {
  return `${HELPERS}
    var title = document.getElementById('doc-title')
    if (title) {
      title.textContent = ''
      title.classList.add('hidden')
    }
    document.querySelectorAll('div').forEach(function (node) {
      if ((node.textContent || '').indexOf('Document conforme') !== -1 && node.children.length < 4) {
        node.classList.add('hidden')
        node.setAttribute('data-id-badge', '1')
      }
    })
    var idFile = document.createElement('input')
    idFile.type = 'file'
    idFile.accept = 'image/jpeg,image/png'
    idFile.className = 'hidden'
    document.body.appendChild(idFile)
    var idDone = false
    var liveDone = false
    function showId(name) {
      idDone = true
      if (title) {
        title.textContent = name
        title.classList.remove('hidden')
      }
      var badge = document.querySelector('[data-id-badge]')
      if (badge) badge.classList.remove('hidden')
    }
    function maybeEnter() {
      if (idDone && liveDone) window.location.assign('/onboarding')
    }
    async function postImage(path, file) {
      var bytes = await file.arrayBuffer()
      var binary = ''
      var view = new Uint8Array(bytes)
      for (var i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i])
      var response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: btoa(binary) })
      })
      return response.status === 201
    }
    document.querySelectorAll('button').forEach(function (button) {
      if ((button.textContent || '').indexOf('Remplacer') !== -1) {
        button.addEventListener('click', function () { idFile.click() })
      }
    })
    idFile.addEventListener('change', async function () {
      var file = idFile.files && idFile.files[0]
      if (!file) return
      if (await postImage('/v1/verifications/id', file)) showId(file.name)
      maybeEnter()
    })
    var camera = document.getElementById('trigger-cam-btn')
    if (camera) {
      camera.addEventListener('click', async function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return
        var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        var video = document.createElement('video')
        video.srcObject = stream
        await video.play()
        var canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        var context = canvas.getContext('2d')
        if (context) context.drawImage(video, 0, 0)
        stream.getTracks().forEach(function (track) { track.stop() })
        var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.92) })
        if (!blob) return
        var file = new File([blob], 'liveness.jpg', { type: 'image/jpeg' })
        if (await postImage('/v1/verifications/liveness', file)) liveDone = true
        maybeEnter()
      })
    }
    document.querySelectorAll('button').forEach(function (button) {
      if ((button.textContent || '').indexOf('Confirmer et transmettre') !== -1) {
        button.addEventListener('click', function (event) {
          event.preventDefault()
          maybeEnter()
        })
      }
    })
    Promise.all([
      fetch('/v1/verifications/id', { credentials: 'same-origin' }).then(readJson),
      fetch('/v1/verifications/liveness', { credentials: 'same-origin' }).then(readJson)
    ]).then(function (rows) {
      var idRow = rows[0]
      var liveRow = rows[1]
      if (idRow && (idRow.status === 'pending' || idRow.status === 'granted')) showId('Pièce enregistrée')
      if (liveRow && (liveRow.status === 'pending' || liveRow.status === 'granted')) liveDone = true
    })
  `
}

export function resetScript(): string {
  return `${HELPERS}
    document.querySelectorAll('a').forEach(function (link) {
      if ((link.textContent || '').indexOf('Retour à la connexion') !== -1) {
        link.setAttribute('href', '/auth')
      }
    })
    var form = document.querySelector('form')
    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault()
        var email = document.getElementById('email')
        if (!email || !email.value.trim()) return
        await fetch('/v1/password-resets', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.value.trim() })
        })
      })
    }
  `
}

export function pinScript(): string {
  return `
    var digits = ''
    var slots = Array.from(document.querySelectorAll('.pin-dot'))
    function paint() {
      slots.forEach(function (dot, index) {
        dot.style.opacity = index < digits.length ? '1' : '0'
      })
    }
    async function finish(pin) {
      var status = await fetch('/v1/pin', { credentials: 'same-origin' })
      var body = await status.json().catch(function () { return null })
      var response
      if (body && body.enabled === false) {
        response = await fetch('/v1/pin', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pin: pin })
        })
      } else {
        response = await fetch('/v1/pin/unlock', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pin: pin })
        })
      }
      if (response.ok) {
        var params = new URLSearchParams(window.location.search)
        window.location.assign(params.get('next') || '/onboarding')
      } else {
        digits = ''
        paint()
      }
    }
    document.querySelectorAll('[data-key]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (digits.length >= 4) return
        digits += button.getAttribute('data-key') || ''
        paint()
        if (digits.length === 4) finish(digits)
      })
    })
    var back = document.getElementById('btn-backspace')
    if (back) back.addEventListener('click', function () { digits = digits.slice(0, -1); paint() })
    var clear = document.getElementById('btn-clear')
    if (clear) clear.addEventListener('click', function () { digits = ''; paint() })
  `
}

export function settingsScript(): string {
  return `
    document.querySelectorAll('button').forEach(function (button) {
      var label = button.textContent || ''
      if (label.indexOf('Télécharger') !== -1) {
        button.addEventListener('click', async function () {
          var response = await fetch('/v1/me/export', { method: 'POST', credentials: 'same-origin' })
          var payload = await response.json().catch(function () { return null })
          var url = payload && payload.ticket && payload.ticket.status_url
          if (response.ok && url) window.location.assign(url)
        })
      }
      if (label.indexOf('Supprimer') !== -1) {
        button.addEventListener('click', async function () {
          var response = await fetch('/v1/me/delete', { method: 'POST', credentials: 'same-origin' })
          var payload = await response.json().catch(function () { return null })
          var url = payload && payload.ticket && payload.ticket.status_url
          if (response.ok && url) window.location.assign(url)
        })
      }
    })
  `
}

export function statusScript(): string {
  return `
    var link = document.getElementById('tracking-url')
    if (link) link.value = ''
    var clock = document.getElementById('countdownClock')
    if (clock) clock.textContent = ''
    fetch('/v1/me/export-status', { credentials: 'same-origin' }).then(function (response) {
      return response.json()
    }).then(function (payload) {
      var tickets = payload && payload.tickets
      if (!Array.isArray(tickets)) return
      var id = window.location.pathname.split('/').filter(Boolean).pop()
      var ticket = tickets.find(function (item) { return item.id === id })
      if (!ticket) return
      if (link) link.value = ticket.status_url || window.location.href
      if (clock && ticket.due_at) {
        var remain = new Date(ticket.due_at).getTime() - Date.now()
        if (remain > 0) {
          var hours = Math.floor(remain / 3600000)
          var minutes = Math.floor((remain % 3600000) / 60000)
          var seconds = Math.floor((remain % 60000) / 1000)
          clock.textContent = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
        }
      }
    }).catch(function () {})
    var copy = document.getElementById('copyBtn')
    if (copy && link && navigator.clipboard) {
      copy.addEventListener('click', function () {
        if (link.value) navigator.clipboard.writeText(link.value)
      })
    }
  `
}

export function profileScript(): string {
  return `
    var map = { ramadan: 'ramadan', examens: 'exams', voyage: 'travel', deuil: 'mourning' }
    document.querySelectorAll('button').forEach(function (button) {
      if ((button.textContent || '').indexOf('Mettre en pause') === -1) return
      button.addEventListener('click', function () {
        var picked = document.querySelector('input[name="pause_reason"]:checked')
        var reason = picked ? map[picked.value] : ''
        if (!reason) return
        fetch('/v1/me/deactivate', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: reason })
        })
      })
    })
  `
}

export function recaptchaTag(siteKey: string): string {
  if (!siteKey) {
    return ''
  }
  return '<script src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit" async defer></script>'
}
