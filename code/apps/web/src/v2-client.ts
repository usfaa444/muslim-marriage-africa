/** Browser behavior for the v2 signup and sign-in screens. No password is stored. */

/** Screen 12 Element 1. Narrow widths stack the chip under the label so it stays in the card. */
export const REPLACEMENT_REVIEW_ROW =
  '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm py-1"><div class="flex items-center gap-2.5"><span class="material-symbols-outlined text-deep-navy/50 text-lg" data-icon="photo_camera">photo_camera</span><span class="font-body text-deep-navy/90 font-medium">Photographie de profil</span></div><span class="inline-flex items-center text-xs font-medium text-soft-gold bg-cream px-2.5 py-0.5 rounded border border-hairline/60">En revue</span></div>'

export function replacementReviewMarkup(hours: number): string {
  return `${REPLACEMENT_REVIEW_ROW}<p class="text-xs text-deep-navy/50">Délai habituel de modération : ${hours} heures.</p>`
}

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
  function showLoginError(message) {
    var node = document.getElementById('login-error')
    if (!node) return
    node.classList.remove('hidden')
    var text = node.lastChild
    if (!text || text.nodeType === 1) {
      text = document.createTextNode('')
      node.appendChild(text)
    }
    text.textContent = ' ' + message
  }
  async function goToGate() {
    var moved = false
    try {
      var response = await fetch('/v1/accounts/gate', { credentials: 'same-origin' })
      var payload = await readJson(response)
      var step = payload && payload.step
      var path = STEP[step]
      if (response.ok && typeof path === 'string') {
        moved = true
        window.location.assign(path)
        return true
      }
    } catch (error) {}
    if (!moved) {
      try {
        await fetch('/v1/sessions/current', { method: 'DELETE', credentials: 'same-origin' })
      } catch (error) {}
    }
    return false
  }
  function bindSwitchAccount() {
    var link = document.getElementById('switch-account')
    if (!link) return
    link.addEventListener('click', function (event) {
      if (event && event.button !== undefined && event.button !== 0) return
      if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return
      if (event && event.preventDefault) event.preventDefault()
      var gone = false
      function go() {
        if (gone) return
        gone = true
        try { clearDraft() } catch (error) {}
        window.location.assign('/auth?leave=1')
      }
      try {
        var pending = fetch('/v1/sessions/current', { method: 'DELETE', credentials: 'same-origin', keepalive: true })
        if (pending && typeof pending.catch === 'function') pending.catch(function () {})
      } catch (error) {}
      go()
    })
  }
`

export function splashScript(): string {
  return `
    var start = document.querySelector('a.continue')
    if (start) {
      start.addEventListener('click', function (event) {
        if (event && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return
        try { sessionStorage.removeItem(${JSON.stringify(SIGNUP_DRAFT_KEY)}) } catch (error) {}
        try { sessionStorage.removeItem('ankanu.signup') } catch (error) {}
      })
    }
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
    function resetCaptcha(name) {
      if (!window.grecaptcha || widgets[name] === undefined) return
      window.grecaptcha.reset(widgets[name])
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
        var moved = false
        try {
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
            moved = true
            sessionStorage.setItem(EMAIL_KEY, email.value.trim())
            sessionStorage.removeItem(DRAFT)
            sessionStorage.removeItem('ankanu.signup')
            window.location.assign('/email-verification')
            return
          }
          var payload = await readJson(response)
          var emailError = document.getElementById('email-error')
          if (emailError) {
            emailError.classList.remove('hidden')
            emailError.lastChild && (emailError.lastChild.textContent = ' ' + (errorMessage(payload) || 'Création refusée.'))
          }
        } finally {
          if (!moved) {
            resetCaptcha('signup')
            button.disabled = false
            paintSignup()
          }
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
        var moved = false
        try {
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
            if (await goToGate()) {
              moved = true
              return
            }
            showLoginError("La session n'a pas été conservée.")
            return
          }
          var payload = await readJson(response)
          showLoginError(errorMessage(payload) || 'Connexion refusée.')
        } catch (error) {
          showLoginError('La connexion a échoué.')
        } finally {
          if (!moved) {
            resetCaptcha('login')
            password.value = ''
            paintLogin()
          }
        }
      })
    }
  `
}

export function emailScript(copy: { invalidTitle: string; invalidFallback: string }): string {
  return `${HELPERS}
    bindSwitchAccount()
    var COPY = ${JSON.stringify(copy)}
    var shown = document.getElementById('currentEmail')
    if (shown) shown.textContent = ''
    var params = new URLSearchParams(window.location.search)
    var token = (params.get('token') || '').trim()
    function showLine(message) {
      var line = document.getElementById('email-link-error')
      var lineText = document.getElementById('email-link-error-text')
      if (lineText) lineText.textContent = message
      if (line) line.classList.remove('hidden')
    }
    function showLinkFailure(message, signedIn) {
      if (shown) shown.textContent = ''
      var heading = document.querySelector('h1')
      var text = message || COPY.invalidFallback
      if (heading) heading.textContent = COPY.invalidTitle
      var intro = document.getElementById('email-intro')
      if (intro) intro.textContent = text
      showLine(text)
      var btnText = document.getElementById('btnText')
      var resend = document.getElementById('resendBtn')
      if (signedIn) {
        if (btnText) btnText.textContent = 'Renvoyer un lien'
        return
      }
      var editBtn = document.getElementById('editEmailBtn')
      if (editBtn) editBtn.classList.add('hidden')
      if (resend && resend.parentNode) {
        var link = document.createElement('a')
        link.href = '/auth'
        link.id = 'email-signin'
        link.className = resend.className
        link.textContent = 'Se connecter'
        resend.parentNode.replaceChild(link, resend)
      }
    }
    if (token) {
      fetch('/v1/accounts/email-verifications/consume', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token })
      }).then(async function (response) {
        if (response.status === 200) {
          window.location.assign('/phone')
          return
        }
        var payload = await readJson(response)
        var session = await fetch('/v1/accounts/email-verifications', { credentials: 'same-origin' })
        showLinkFailure(errorMessage(payload), session.status === 200)
      }).catch(function () {
        showLinkFailure('', false)
      })
    } else {
      fetch('/v1/accounts/email-verifications', { credentials: 'same-origin' }).then(async function (response) {
        if (response.status !== 200) return
        var payload = await readJson(response)
        if (shown && payload && typeof payload.email === 'string') shown.textContent = payload.email
      }).catch(function () {})
    }
    var editBtn = document.getElementById('editEmailBtn')
    var editForm = document.getElementById('editEmailForm')
    var newEmail = document.getElementById('newEmailInput')
    var changeError = document.getElementById('email-change-error')
    var banner = document.getElementById('resendSuccessBanner')
    if (editBtn && editForm) {
      editBtn.addEventListener('click', function () {
        var opening = editForm.classList.contains('hidden')
        editForm.classList.toggle('hidden', !opening)
        if (opening && newEmail && shown) {
          newEmail.value = (shown.textContent || '').trim()
          newEmail.focus()
        }
      })
    }
    var save = editForm ? editForm.querySelector('button') : null
    if (save) {
      save.addEventListener('click', async function () {
        if (!newEmail) return
        var response = await fetch('/v1/accounts/email', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: newEmail.value.trim() })
        })
        var payload = await readJson(response)
        if (response.status === 200 && payload && typeof payload.email === 'string') {
          if (shown) shown.textContent = payload.email
          editForm.classList.add('hidden')
          if (changeError) {
            changeError.classList.add('hidden')
            changeError.textContent = ''
          }
          if (banner) banner.classList.remove('hidden')
          return
        }
        if (changeError) {
          changeError.classList.remove('hidden')
          changeError.textContent = errorMessage(payload) || 'email : une adresse inutilisée est requise.'
        }
      })
    }
    var resend = document.getElementById('resendBtn')
    if (resend) {
      resend.addEventListener('click', async function () {
        resend.disabled = true
        var response = await fetch('/v1/accounts/email-verifications', {
          method: 'POST',
          credentials: 'same-origin'
        })
        var payload = await readJson(response)
        if (response.status === 201 && banner) {
          banner.classList.remove('hidden')
          var line = document.getElementById('email-link-error')
          if (line) line.classList.add('hidden')
        } else if (response.status !== 200) {
          showLine(errorMessage(payload) || "L'envoi du lien a échoué.")
        }
        resend.disabled = false
      })
    }
  `
}

export function phoneScript(): string {
  return `${HELPERS}
    bindSwitchAccount()
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
    bindSwitchAccount()
    var phoneDisplay = document.getElementById('phone-display')
    if (phoneDisplay) phoneDisplay.textContent = ''
    fetch('/v1/verifications/otp', { credentials: 'same-origin' }).then(readJson).then(function (payload) {
      if (!phoneDisplay || !payload) return
      if ((payload.status === 'pending' || payload.status === 'granted') && typeof payload.phone_masked === 'string') {
        phoneDisplay.textContent = payload.phone_masked
      }
    }).catch(function () {})
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
    bindSwitchAccount()
    var title = document.getElementById('doc-title')
    if (title) {
      title.textContent = ''
      title.classList.add('hidden')
    }
    function hideNode(node) {
      if (!node) return
      node.classList.add('hidden')
      if (node.style) node.style.display = 'none'
    }
    function showNode(node) {
      if (!node) return
      node.classList.remove('hidden')
      if (node.style) node.style.display = ''
    }
    document.querySelectorAll('div').forEach(function (node) {
      if ((node.textContent || '').indexOf('Document conforme') !== -1 && !node.querySelector('div')) {
        node.setAttribute('data-id-badge', '1')
        hideNode(node)
      }
    })
    var idFile = document.createElement('input')
    idFile.type = 'file'
    idFile.accept = 'image/jpeg,image/png'
    idFile.className = 'hidden'
    document.body.appendChild(idFile)
    var chosenId = null
    var idSent = false
    var chosenLive = null
    var liveSent = false
    var busy = false
    var capturing = false
    function showName(name) {
      if (!title) return
      title.textContent = name
      title.classList.remove('hidden')
    }
    function showBadge() {
      showNode(document.querySelector('[data-id-badge]'))
    }
    function hideBadge() {
      hideNode(document.querySelector('[data-id-badge]'))
    }
    function capturePassed(row) {
      return !!(row && (row.status === 'pending' || row.status === 'granted'))
    }
    function showCaptureError(message) {
      var node = document.getElementById('id-error')
      var text = document.getElementById('id-error-text')
      if (text) text.textContent = message
      if (node) node.classList.remove('hidden')
    }
    function clearCaptureError() {
      var node = document.getElementById('id-error')
      var text = document.getElementById('id-error-text')
      if (text) text.textContent = ''
      if (node) node.classList.add('hidden')
    }
    function missingMessage(idOk, liveOk) {
      if (!idOk && !liveOk) return "La pièce d'identité et la photo de présence sont manquantes."
      if (!idOk) return "La pièce d'identité est manquante."
      return "La photo de présence est manquante."
    }
    async function postImage(path, file) {
      try {
        var bytes = await file.arrayBuffer()
        var binary = ''
        var view = new Uint8Array(bytes)
        for (var i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i])
        var response = await fetch(path, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ image: btoa(binary) })
        })
        var payload = await readJson(response)
        if (response.status === 201) return { ok: true, message: '' }
        return { ok: false, message: errorMessage(payload) || "L'envoi a échoué." }
      } catch (error) {
        return { ok: false, message: "La connexion a échoué." }
      }
    }
    function missingStatus(status) {
      return status === 'none' || !status
    }
    async function readCapture(path) {
      var response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' })
      var payload = await readJson(response)
      if (!response.ok) return { ok: false, passed: false, status: '', message: errorMessage(payload) || "La connexion a échoué." }
      var status = payload && payload.status
      return { ok: true, passed: capturePassed(payload), status: status || 'none', message: '' }
    }
    async function gatePath() {
      var gate = await fetch('/v1/accounts/gate', { credentials: 'same-origin', cache: 'no-store' })
      var gateBody = await readJson(gate)
      var step = gateBody && gateBody.step
      var path = STEP[step]
      if (!gate.ok || typeof path !== 'string') {
        return { ok: false, path: '', message: errorMessage(gateBody) || "La connexion a échoué." }
      }
      return { ok: true, path: path, message: '' }
    }
    document.querySelectorAll('button').forEach(function (button) {
      if ((button.textContent || '').indexOf('Remplacer') !== -1) {
        button.addEventListener('click', function () {
          if (busy) return
          idFile.click()
        })
      }
    })
    idFile.addEventListener('change', function () {
      if (busy) {
        idFile.value = ''
        return
      }
      var file = idFile.files && idFile.files[0]
      if (!file) return
      chosenId = file
      idSent = false
      showName(file.name)
      hideBadge()
      clearCaptureError()
    })
    var camera = document.getElementById('trigger-cam-btn')
    if (camera) {
      camera.addEventListener('click', async function () {
        if (busy || capturing) return
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showCaptureError("La caméra est indisponible.")
          return
        }
        capturing = true
        var stream = null
        var video = null
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
          video = document.createElement('video')
          video.className = 'hidden'
          video.muted = true
          video.playsInline = true
          video.setAttribute('playsinline', '')
          video.srcObject = stream
          document.body.appendChild(video)
          await video.play()
          var canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 480
          var context = canvas.getContext('2d')
          if (context) context.drawImage(video, 0, 0)
          var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.92) })
          if (!blob) {
            showCaptureError("La capture a échoué.")
            return
          }
          chosenLive = new File([blob], 'liveness.jpg', { type: 'image/jpeg' })
          liveSent = false
          if (!busy) clearCaptureError()
        } catch (error) {
          var name = error && error.name
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
            showCaptureError("La caméra a été refusée.")
          } else {
            showCaptureError("La capture a échoué.")
          }
        } finally {
          if (stream) stream.getTracks().forEach(function (track) { track.stop() })
          if (video && video.remove) video.remove()
          capturing = false
        }
      })
    }
    document.querySelectorAll('button').forEach(function (button) {
      if ((button.textContent || '').indexOf('Confirmer et transmettre') !== -1) {
        button.addEventListener('click', async function (event) {
          if (event && event.preventDefault) event.preventDefault()
          if (busy) return
          busy = true
          button.disabled = true
          clearCaptureError()
          var leaving = false
          try {
            if (chosenId && !idSent) {
              var postedId = await postImage('/v1/verifications/id', chosenId)
              if (!postedId.ok) {
                showCaptureError(postedId.message)
                return
              }
              idSent = true
            }
            if (chosenLive && !liveSent) {
              var postedLive = await postImage('/v1/verifications/liveness', chosenLive)
              if (!postedLive.ok) {
                showCaptureError(postedLive.message)
                return
              }
              liveSent = true
            }
            var idRow = await readCapture('/v1/verifications/id')
            if (!idRow.ok) {
              showCaptureError(idRow.message)
              return
            }
            var liveRow = await readCapture('/v1/verifications/liveness')
            if (!liveRow.ok) {
              showCaptureError(liveRow.message)
              return
            }
            if (idRow.passed) {
              showName(chosenId ? chosenId.name : 'Pièce enregistrée')
              showBadge()
            }
            if (missingStatus(idRow.status) || missingStatus(liveRow.status)) {
              showCaptureError(missingMessage(!missingStatus(idRow.status), !missingStatus(liveRow.status)))
              return
            }
            if (!idRow.passed || !liveRow.passed) {
              var retry = await gatePath()
              if (!retry.ok) {
                showCaptureError(retry.message)
                return
              }
              if (retry.path === '/id-liveness') {
                showCaptureError('Reprenez la capture.')
                return
              }
              leaving = true
              window.location.assign(retry.path)
              return
            }
            var next = await gatePath()
            if (!next.ok || next.path === '/id-liveness') {
              showCaptureError(next.message || 'Reprenez la capture.')
              return
            }
            leaving = true
            window.location.assign(next.path)
          } catch (error) {
            showCaptureError("La connexion a échoué.")
          } finally {
            if (!leaving) {
              busy = false
              button.disabled = false
            }
          }
        })
      }
    })
    Promise.all([
      fetch('/v1/verifications/id', { credentials: 'same-origin', cache: 'no-store' }).then(readJson),
      fetch('/v1/verifications/liveness', { credentials: 'same-origin', cache: 'no-store' }).then(readJson)
    ]).then(function (rows) {
      if (capturePassed(rows[0]) && !chosenId) {
        showName('Pièce enregistrée')
        showBadge()
      }
    }).catch(function () {})
  `
}

export function resetScript(copy: {
  invalidTitle: string
  invalidText: string
  invalidForm: string
  doneTitle: string
  doneText: string
  doneForm: string
  mismatch: string
}): string {
  return `${HELPERS}
    var COPY = ${JSON.stringify(copy)}
    document.querySelectorAll('a').forEach(function (link) {
      if ((link.textContent || '').indexOf('Retour à la connexion') !== -1 && link.getAttribute('href') === '#') {
        link.setAttribute('href', '/auth')
      }
    })
    document.querySelectorAll('button[aria-label="Afficher ou masquer le mot de passe"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var input = button.parentElement && button.parentElement.querySelector('input')
        if (!input) return
        input.type = input.type === 'password' ? 'text' : 'password'
      })
    })
    function showState(title, text, formHtml) {
      var heading = document.querySelector('h1')
      if (heading) heading.textContent = title
      var intro = heading && heading.parentElement ? heading.parentElement.querySelector('p') : null
      if (intro) intro.textContent = text
      var form = document.querySelector('form')
      if (form) form.innerHTML = formHtml
    }
    var enter = document.getElementById('reset-enter')
    if (enter) {
      enter.addEventListener('click', function (event) {
        event.preventDefault()
        goToGate()
      })
    }
    var form = document.querySelector('form')
    var resetBusy = false
    if (form) form.addEventListener('submit', async function (event) {
      event.preventDefault()
      if (resetBusy) return
      var email = document.getElementById('email')
      if (email) {
        if (!email.value.trim()) return
        await fetch('/v1/password-resets', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.value.trim() })
        })
        return
      }
      var password = document.getElementById('reset-password')
      var confirm = document.getElementById('reset-confirm')
      var error = document.getElementById('reset-error')
      if (!password || !confirm) return
      var token = new URLSearchParams(window.location.search).get('token') || ''
      if (password.value !== confirm.value) {
        if (error) {
          error.classList.remove('hidden')
          error.textContent = COPY.mismatch
        }
        return
      }
      if (!token) return
      resetBusy = true
      try {
        var response = await fetch('/v1/password-resets/consume', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: token, password: password.value })
        })
        var payload = await readJson(response)
        if (response.status === 200) {
          window.history.replaceState(null, '', '/password-reset')
          showState(COPY.doneTitle, COPY.doneText, COPY.doneForm)
          var next = document.getElementById('reset-enter')
          if (next) {
            next.addEventListener('click', function (click) {
              click.preventDefault()
              goToGate()
            })
          }
          return
        }
        var code = payload && payload.error && payload.error.code
        if (code === 'PASSWORD_RESET_INVALID') {
          showState(COPY.invalidTitle, COPY.invalidText, COPY.invalidForm)
          return
        }
        resetBusy = false
        if (error) {
          error.classList.remove('hidden')
          error.textContent = errorMessage(payload)
        }
      } catch (failure) {
        resetBusy = false
      }
    })
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
        var next = params.get('next') || ''
        if (next.charAt(0) !== '/' || next.charAt(1) === '/' || next.charAt(1) === '\\\\') next = '/onboarding'
        window.location.assign(next)
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
          var response = await fetch('/v1/me/delete', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ confirm: true })
          })
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

export function reviewScript(): string {
  return `
    fetch('/v1/me/profile', { credentials: 'same-origin' }).then(function (response) {
      return response.json().then(function (body) {
        var photo = body && body.photo
        var pending = photo && photo.moderation_state === 'pending'
        if (!response.ok || !pending) {
          window.location.replace('/profile-edit')
        }
      }, function () {
        window.location.replace('/profile-edit')
      })
    }).catch(function () {
      window.location.replace('/profile-edit')
    })
  `
}

export function profileScript(): string {
  return `
    var pauseMap = { ramadan: 'ramadan', examens: 'exams', voyage: 'travel', deuil: 'mourning' }
    var maritalToUi = { single: 'celibataire', married: 'marie', divorced: 'divorce', widowed: 'veuf' }
    var uiToMarital = { celibataire: 'single', marie: 'married', divorce: 'divorced', veuf: 'widowed' }
    var polyToUi = { no: 'non', yes: 'oui' }
    var uiToPoly = { non: 'no', oui: 'yes' }
    var timeframes = { immediate: 1, '6months': 1, '1year': 1, serene: 1 }
    var selectedMarital = 'flex items-center justify-center p-3 rounded-md border border-deep-navy bg-deep-navy text-cream cursor-pointer text-xs font-medium text-center'
    var idleMarital = 'flex items-center justify-center p-3 rounded-md border border-hairline bg-cream text-deep-navy hover:border-soft-gold cursor-pointer text-xs font-medium text-center'

    function checkedValue(name) {
      var picked = document.querySelector('input[name="' + name + '"]:checked')
      return picked ? picked.value : ''
    }

    function setRadio(name, value) {
      document.querySelectorAll('input[name="' + name + '"]').forEach(function (input) {
        input.checked = value !== '' && input.value === value
      })
    }

    function paintMarital() {
      document.querySelectorAll('input[name="marital_status"]').forEach(function (input) {
        var label = input.closest('label')
        if (!label) return
        label.className = input.checked ? selectedMarital : idleMarital
      })
    }

    function readSelect(id) {
      var el = document.getElementById(id)
      if (!el) return null
      var value = (el.value || '').trim()
      return value.length ? value : null
    }

    function writeSelect(id, value) {
      var el = document.getElementById(id)
      if (el) el.value = value || ''
    }

    function lifePlansValue() {
      var token = checkedValue('marriage_timeframe')
      var area = document.getElementById('intentions')
      var text = area ? area.value.trim() : ''
      if (token && timeframes[token]) {
        return text ? 'tf:' + token + '\\n' + text : 'tf:' + token
      }
      return text
    }

    function applyLifePlans(value, keepEdits) {
      var raw = value || ''
      var token = ''
      var text = raw
      if (raw.indexOf('tf:') === 0) {
        var nl = raw.indexOf('\\n')
        var head = nl === -1 ? raw : raw.slice(0, nl)
        token = head.slice(3)
        text = nl === -1 ? '' : raw.slice(nl + 1)
      }
      if (!keepEdits || !touched.marriage_timeframe) setRadio('marriage_timeframe', timeframes[token] ? token : '')
      var area = document.getElementById('intentions')
      if (area && (!keepEdits || !touched.intentions)) area.value = text
    }

    function paintAge(dob) {
      var el = document.getElementById('profile-age')
      if (!el) return
      var parts = (dob || '').split('-')
      if (parts.length !== 3) {
        el.textContent = ''
        return
      }
      var born = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
      var today = new Date()
      var age = today.getUTCFullYear() - born.getUTCFullYear()
      var monthGap = today.getUTCMonth() - born.getUTCMonth()
      if (monthGap < 0 || (monthGap === 0 && today.getUTCDate() < born.getUTCDate())) age -= 1
      el.textContent = age >= 0 && !isNaN(born.getTime()) ? age + ' ans' : ''
    }

    var touched = {}
    var profileLoaded = false

    function markTouched(event) {
      var el = event && event.target
      if (!el) return
      var key = el.id || el.name
      if (key) touched[key] = true
    }

    function paintMeter(completeness) {
      if (!completeness) return
      var percent = document.getElementById('profile-meter-percent')
      var fill = document.getElementById('profile-meter-fill')
      var missing = document.getElementById('profile-meter-missing')
      var note = document.getElementById('profile-meter-note')
      var banner = document.getElementById('profile-meter-banner')
      var block = document.getElementById('madhhab-block')
      var names = Array.isArray(completeness.missing) ? completeness.missing : []
      var ready = completeness.ready === true
      var gap = names.length > 0
      if (percent) percent.textContent = (completeness.percent || 0) + '% complété'
      if (fill) {
        fill.style.width = (completeness.percent || 0) + '%'
        fill.style.backgroundColor = ready ? '#C9A86C' : ''
      }
      if (banner) banner.classList.toggle('hidden', !gap)
      if (missing) missing.textContent = gap ? '« Il manque : ' + names.join(', ') + ' »' : ''
      var madhhabMissing = names.indexOf('madhhab') !== -1
      if (note) note.classList.toggle('hidden', !madhhabMissing)
      if (block) {
        block.className = madhhabMissing
          ? 'p-4 rounded-md border-2 border-soft-gold/70 bg-cream space-y-3'
          : 'p-4 rounded-md border border-hairline bg-cream space-y-3'
      }
    }

    function showStatus(text) {
      var el = document.getElementById('profile-save-status')
      if (!el) return
      el.textContent = text || ''
      el.classList.toggle('hidden', !text)
    }

    function applyProfile(body, keepEdits) {
      if (!body) return
      function open(key) {
        return !keepEdits || !touched[key]
      }
      var dob = document.getElementById('dob')
      if (dob && open('dob')) dob.value = body.dob || ''
      paintAge(dob ? dob.value : '')
      var origin = document.getElementById('origin')
      if (origin && open('origin')) origin.value = body.origin || ''
      if (open('country_residence')) writeSelect('country_residence', body.country)
      if (open('city_residence')) writeSelect('city_residence', body.city)
      if (open('education')) writeSelect('education', body.education)
      if (open('job')) writeSelect('job', body.profession)
      if (open('marital_status')) setRadio('marital_status', maritalToUi[body.marital_status] || '')
      paintMarital()
      if (open('polygyny_intent')) setRadio('polygyny_intent', polyToUi[body.polygamy_intent] || '')
      if (open('madhhab')) setRadio('madhhab', body.madhhab || '')
      if (open('religious_practice')) setRadio('religious_practice', body.practice || '')
      applyLifePlans(body.life_plans || '', keepEdits)
      var bio = document.getElementById('bio')
      if (bio && open('bio')) bio.value = body.bio_pending || body.bio_live || ''
      paintPhoto(body)
      paintMeter(body.completeness)
    }

    function paintPhoto(body) {
      var note = document.getElementById('profile-photo-note')
      var slot = document.getElementById('profile-photo-review')
      if (note && body && body.photo && body.photo.moderation_state === 'pending' && body.photo.caption) {
        note.textContent = body.photo.caption
      }
      if (!slot) return
      var live = body && body.photo && body.photo.moderation_state === 'live'
      var waiting = body && body.pending_photo && body.pending_photo.moderation_state === 'pending'
      if (!live || !waiting) {
        slot.innerHTML = ''
        slot.classList.add('hidden')
        return
      }
      var hours = body.review_sla_hours
      var line = ''
      if (typeof hours === 'number' && hours >= 1 && Math.floor(hours) === hours) {
        line = '<p class="text-xs text-deep-navy/50">Délai habituel de modération : ' + hours + ' heures.</p>'
      }
      slot.innerHTML = ${JSON.stringify(REPLACEMENT_REVIEW_ROW)} + line
      slot.classList.remove('hidden')
    }

    function payload() {
      var dob = document.getElementById('dob')
      var origin = document.getElementById('origin')
      var bio = document.getElementById('bio')
      var plans = lifePlansValue()
      return {
        dob: dob ? dob.value : '',
        city: readSelect('city_residence'),
        country: readSelect('country_residence'),
        origin: origin && origin.value.trim() ? origin.value.trim() : null,
        marital_status: uiToMarital[checkedValue('marital_status')] || null,
        polygamy_intent: uiToPoly[checkedValue('polygyny_intent')] || null,
        education: readSelect('education'),
        profession: readSelect('job'),
        madhhab: checkedValue('madhhab') || null,
        practice: checkedValue('religious_practice') || null,
        life_plans: plans || null,
        bio_pending: bio && bio.value.trim() ? bio.value.trim() : null
      }
    }

    document.querySelectorAll('input[name="marital_status"]').forEach(function (input) {
      input.addEventListener('change', paintMarital)
    })
    var dobInput = document.getElementById('dob')
    if (dobInput) dobInput.addEventListener('change', function () { paintAge(dobInput.value) })
    var form = document.querySelector('form')
    if (form) {
      form.addEventListener('input', markTouched)
      form.addEventListener('change', markTouched)
    }

    fetch('/v1/me/profile', { credentials: 'same-origin' }).then(function (response) {
      return response.json().then(function (body) {
        return { ok: response.ok, body: body }
      }, function () {
        return { ok: false, body: null }
      })
    }).then(function (result) {
      if (!result.ok || !result.body || typeof result.body.dob !== 'string') return
      applyProfile(result.body, true)
      profileLoaded = true
    }).catch(function () {})

    var photoFile = document.getElementById('profile-photo-file')
    if (photoFile) {
      photoFile.addEventListener('change', function () {
        var file = photoFile.files && photoFile.files[0]
        if (!file) return
        var reader = new FileReader()
        reader.onerror = function () {
          photoFile.value = ''
          showStatus('Envoi de la photo impossible.')
        }
        reader.onload = function () {
          var text = String(reader.result || '')
          var comma = text.indexOf(',')
          var image = comma === -1 ? text : text.slice(comma + 1)
          fetch('/v1/media', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kind: 'profile_photo', image: image })
          }).then(function (response) {
            return response.json().then(function (body) {
              return { ok: response.ok, body: body }
            }, function () {
              return { ok: false, body: null }
            })
          }).then(function (result) {
            photoFile.value = ''
            if (!result.ok || !result.body || result.body.moderation_state !== 'pending') {
              var message = result.body && result.body.error && result.body.error.message
              showStatus(message || 'Envoi de la photo impossible.')
              return
            }
            return fetch('/v1/me/profile', { credentials: 'same-origin' }).then(function (profileResponse) {
              return profileResponse.json().then(function (profile) {
                return { ok: profileResponse.ok, body: profile }
              }, function () {
                return { ok: false, body: null }
              })
            }).then(function (read) {
              var photo = read.ok && read.body && read.body.photo
              if (photo && photo.moderation_state === 'pending') {
                window.location.href = '/profile-review'
                return
              }
              if (photo && photo.moderation_state === 'live') {
                applyProfile(read.body, true)
              }
            })
          }).catch(function () {
            photoFile.value = ''
            showStatus('Envoi de la photo impossible.')
          })
        }
        try {
          reader.readAsDataURL(file)
        } catch (readError) {
          photoFile.value = ''
          showStatus('Envoi de la photo impossible.')
        }
      })
    }

    document.querySelectorAll('button').forEach(function (button) {
      var label = button.textContent || ''
      if (label.indexOf('Mettre à jour la photo') !== -1) {
        button.addEventListener('click', function () {
          if (photoFile) photoFile.click()
        })
      }
      if (label.indexOf('Mettre en pause') !== -1) {
        button.addEventListener('click', function () {
          var picked = document.querySelector('input[name="pause_reason"]:checked')
          var reason = picked ? pauseMap[picked.value] : ''
          if (!reason) return
          fetch('/v1/me/deactivate', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ reason: reason })
          })
        })
      }
      if (label.indexOf('Enregistrer les modifications') === -1) return
      button.addEventListener('click', function () {
        if (!profileLoaded) return
        showStatus('')
        fetch('/v1/me/profile', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload())
        }).then(function (response) {
          return response.json().then(function (body) {
            return { ok: response.ok, body: body }
          })
        }).then(function (result) {
          if (!result.ok) {
            var message = result.body && result.body.error && result.body.error.message
            showStatus(message || 'Enregistrement impossible.')
            return
          }
          applyProfile(result.body)
          showStatus('Enregistré.')
        }).catch(function () {
          showStatus('Enregistrement impossible.')
        })
      })
    })

    var pinInput = document.querySelector('input[type="checkbox"]')
    var pinEnabled = false
    fetch('/v1/pin', { credentials: 'same-origin' }).then(function (response) {
      return response.json()
    }).then(function (body) {
      pinEnabled = !!(body && body.enabled)
      if (pinInput) pinInput.checked = pinEnabled
    }).catch(function () {})
    if (pinInput) {
      pinInput.addEventListener('change', function () {
        if (pinInput.checked && !pinEnabled) {
          window.location.href = '/pin'
          return
        }
        pinInput.checked = pinEnabled
      })
    }
  `
}

export function recaptchaTag(siteKey: string): string {
  if (!siteKey) {
    return ''
  }
  return '<script src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit" async defer></script>'
}
