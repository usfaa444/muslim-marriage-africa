/** Token already printed on the pledge checkbox the member accepts. */
export const COC_VERSION_ON_SCREEN = 'FR-089'

/** Holds the Auth fields until the age-gate submit posts them with dob. */
export const SIGNUP_DRAFT_KEY = 'ankanu.signup'

const SUBMIT = `
<script>
  let submitting = false
  function passwordMeetsPublishedRules(value) {
    const length = Array.from(value).length
    return length >= 12 && length <= 128 && value.trim().length > 0
  }
  function validateSubmissionState() {
    const pledge = document.getElementById('pledge-check').checked
    const human = document.getElementById('human-verify').checked
    const email = document.getElementById('email').value.trim()
    const pseudonym = document.getElementById('pseudonym').value.trim()
    const password = document.getElementById('password').value
    const button = document.getElementById('btn-submit-signup')
    const ready = !submitting && pledge && human && email && pseudonym && passwordMeetsPublishedRules(password)
    if (ready) {
      button.disabled = false
      button.className = "w-full h-12 px-6 rounded-xl font-body-strong text-body transition-colors duration-200 flex items-center justify-center space-x-2 bg-indigo hover:bg-indigo-deep text-ink-on-indigo cursor-pointer"
    } else {
      button.disabled = true
      button.className = "w-full h-12 px-6 rounded-xl font-body-strong text-body transition-colors duration-200 flex items-center justify-center space-x-2 bg-disabled text-ink-primary/60 cursor-not-allowed"
    }
  }
  function showSignupLine(line) {
    let slot = document.getElementById('signup-result')
    if (!slot) {
      slot = document.createElement('p')
      slot.id = 'signup-result'
      slot.className = 'text-caption font-caption text-ink-primary'
      document.getElementById('signup-form').appendChild(slot)
    }
    slot.textContent = line
  }
  document.getElementById('email').addEventListener('input', validateSubmissionState)
  document.getElementById('pseudonym').addEventListener('input', validateSubmissionState)
  document.getElementById('signup-form').addEventListener('submit', async function (event) {
    event.preventDefault()
    if (submitting) {
      return
    }
    submitting = true
    const button = document.getElementById('btn-submit-signup')
    button.disabled = true
    const selected = document.querySelector('input[name="gender_role"]:checked')
    const gender = selected && selected.value === 'frere' ? 'brother' : 'sister'
    try {
      sessionStorage.setItem(${JSON.stringify(SIGNUP_DRAFT_KEY)}, JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        pseudonym: document.getElementById('pseudonym').value,
        gender: gender,
        pledge_accepted: document.getElementById('pledge-check').checked === true,
        human_verified: document.getElementById('human-verify').checked === true,
        coc_version: ${JSON.stringify(COC_VERSION_ON_SCREEN)}
      }))
      location.assign('/age-gate')
    } catch (error) {
      showSignupLine('La création a échoué.')
      submitting = false
      validateSubmissionState()
    }
  })
  function backForwardLoad(event) {
    if (event.persisted) {
      return true
    }
    try {
      const entries = performance.getEntriesByType('navigation')
      return !!(entries[0] && entries[0].type === 'back_forward')
    } catch (error) {
      return false
    }
  }
  function restoreSignupDraft() {
    const raw = sessionStorage.getItem(${JSON.stringify(SIGNUP_DRAFT_KEY)})
    if (!raw) {
      return
    }
    let draft = null
    try {
      draft = JSON.parse(raw)
    } catch (error) {
      draft = null
    }
    if (!draft) {
      return
    }
    const email = document.getElementById('email')
    const password = document.getElementById('password')
    const pseudonym = document.getElementById('pseudonym')
    const pledge = document.getElementById('pledge-check')
    const human = document.getElementById('human-verify')
    if (email && typeof draft.email === 'string') {
      email.value = draft.email
    }
    if (password && typeof draft.password === 'string') {
      password.value = draft.password
    }
    if (pseudonym && typeof draft.pseudonym === 'string') {
      pseudonym.value = draft.pseudonym
    }
    if (pledge) {
      pledge.checked = draft.pledge_accepted === true
    }
    if (human) {
      human.checked = draft.human_verified === true
    }
    const sister = document.querySelector('input[name="gender_role"][value="soeur"]')
    const brother = document.querySelector('input[name="gender_role"][value="frere"]')
    if (draft.gender === 'brother' && brother) {
      brother.checked = true
    }
    if (draft.gender === 'sister' && sister) {
      sister.checked = true
    }
  }
  window.addEventListener('pageshow', function (event) {
    if (!backForwardLoad(event)) {
      return
    }
    submitting = false
    restoreSignupDraft()
    validateSubmissionState()
  })
  let loginSubmitting = false
  function showLoginLine(line) {
    let slot = document.getElementById('login-result')
    if (!slot) {
      slot = document.createElement('p')
      slot.id = 'login-result'
      slot.className = 'text-caption font-caption text-ink-primary'
      document.getElementById('login-form').appendChild(slot)
    }
    slot.textContent = line
  }
  const loginButton = document.querySelector('#login-form button')
  const loginForm = document.getElementById('login-form')
  async function submitLogin() {
    if (loginSubmitting || !loginButton) {
      return
    }
    loginSubmitting = true
    loginButton.disabled = true
    const remember = document.querySelector('#login-form input[type="checkbox"]')
    let line = 'Session ouverte.'
    try {
      const response = await fetch('/v1/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: document.getElementById('login-ident').value,
          password: document.getElementById('login-pass').value,
          remember_me: remember ? remember.checked === true : false
        })
      })
      const payload = await response.json().catch(function () { return null })
      if (!response.ok) {
        line = (payload && payload.error && payload.error.message) || 'La connexion a échoué.'
      }
    } catch (error) {
      line = 'La connexion a échoué.'
    }
    showLoginLine(line)
    loginSubmitting = false
    loginButton.disabled = false
  }
  if (loginButton) {
    loginButton.addEventListener('click', function () {
      void submitLogin()
    })
  }
  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault()
      void submitLogin()
    })
  }
  function loginOnEnter(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submitLogin()
    }
  }
  const loginIdent = document.getElementById('login-ident')
  const loginPass = document.getElementById('login-pass')
  if (loginIdent) {
    loginIdent.addEventListener('keydown', loginOnEnter)
  }
  if (loginPass) {
    loginPass.addEventListener('keydown', loginOnEnter)
  }
  const google = Array.from(document.querySelectorAll('button')).find(function (button) {
    return button.textContent && button.textContent.indexOf('Continuer via Google') !== -1
  })
  if (google) {
    google.addEventListener('click', function (event) {
      event.preventDefault()
    })
  }
  function applyAuthModeFromQuery() {
    let mode = ''
    try {
      mode = new URL(location.href).searchParams.get('mode') || ''
    } catch (error) {
      mode = ''
    }
    if (mode !== 'login' && mode !== 'signup') {
      mode = 'signup'
    }
    if (typeof switchAuthMode === 'function') {
      switchAuthMode(mode)
      if (document.documentElement) {
        document.documentElement.setAttribute('data-auth-mode', mode)
      }
    }
  }
  applyAuthModeFromQuery()
</script>
`

/** Serves the downloaded Auth screen. Signup stores the fields and opens the age gate. Login posts the session. Google stays visual. */
export function authPageHtml(stitchHtml: string): string {
  const close = stitchHtml.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('auth stitch is missing </body>')
  }
  return `${stitchHtml.slice(0, close)}${SUBMIT}${stitchHtml.slice(close)}`
}
