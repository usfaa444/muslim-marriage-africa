const HOSTING_CARD = ' et hébergement souverain en France (Scaleway)'
const SPECIMEN_EMAIL = ' value="mariam.sawadogo@famille.bf"'
const SPECIMEN_PASSWORD = ' value="Barakah2025!Honor"'
const OLD_COPYRIGHT =
  "© 2025 AnKanu. Plateforme d'engagement matrimonial honorable et conforme aux traditions burkinabè."
const NEW_COPYRIGHT = '© 2026 AnKanu. Tous droits réservés.'
const FOOTER_HOST =
  /<p class="font-caption text-\[11px\] text-ink-secondary\/70">[\s\S]*?Scaleway Paris DC\)\.[\s\S]*?<\/p>\s*/

const BEHAVIOR = `
<script>
  function showResetState(stateId) {
    if (typeof switchState === 'function') {
      switchState(stateId)
    }
  }
  async function requestPasswordReset(email) {
    const response = await fetch('/v1/password-resets', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
    if (response.status === 201) {
      showResetState('state-2')
    }
  }
  async function submitNewPassword(token, password, confirmation) {
    if (password !== confirmation) {
      return
    }
    const response = await fetch('/v1/password-resets/consume', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: token, password: password })
    })
    if (response.status === 200) {
      history.replaceState(null, '', location.pathname)
      showResetState('state-5')
      return
    }
    let code = ''
    try {
      const body = await response.json()
      code = body && body.error ? body.error.code : ''
    } catch (error) {
      code = ''
    }
    if (response.status === 400 && code === 'PASSWORD_RESET_INVALID') {
      showResetState('state-4')
    }
  }
  var requestForm = document.querySelector('#state-1 form')
  if (requestForm) {
    requestForm.addEventListener('submit', function (event) {
      event.preventDefault()
      var field = document.getElementById('email-field')
      void requestPasswordReset(field ? field.value : '')
    })
  }
  var passwordForm = document.querySelector('#state-3 form')
  if (passwordForm) {
    passwordForm.addEventListener('submit', function (event) {
      event.preventDefault()
      var next = document.getElementById('new-pass')
      var again = document.getElementById('confirm-pass')
      var token = new URLSearchParams(window.location.search).get('token') || ''
      void submitNewPassword(token, next ? next.value : '', again ? again.value : '')
    })
  }
  if (new URLSearchParams(window.location.search).get('token')) {
    showResetState('state-3')
  }
  window.requestPasswordReset = requestPasswordReset
  window.submitNewPassword = submitNewPassword
</script>
`

/** Serves the password-reset screen with the hosting lines removed and the forms posted. */
export function passwordResetPageHtml(stitchHtml: string): string {
  const stripped = stitchHtml
    .replaceAll(HOSTING_CARD, '')
    .replaceAll(OLD_COPYRIGHT, NEW_COPYRIGHT)
    .replace(FOOTER_HOST, '')
    .replaceAll(SPECIMEN_EMAIL, '')
    .replaceAll(SPECIMEN_PASSWORD, '')
    .replace('onsubmit="event.preventDefault(); switchState(\'state-2\');"', '')
    .replace('onsubmit="event.preventDefault(); switchState(\'state-5\');"', '')
  const close = stripped.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('password reset stitch is missing </body>')
  }
  return `${stripped.slice(0, close)}${BEHAVIOR}${stripped.slice(close)}`
}
