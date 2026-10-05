import { dropUntil } from './design-artifact'

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

function dropSimulatedLink(html: string): string {
  const label = "Simuler l'ouverture du lien reçu"
  const labelAt = html.indexOf(label)
  const buttonAt = labelAt < 0 ? -1 : html.lastIndexOf('<button', labelAt)
  const buttonEnd = labelAt < 0 ? -1 : html.indexOf('</button>', labelAt)
  if (buttonAt < 0 || buttonEnd < 0) {
    throw new Error('password reset stitch is missing the simulated link button')
  }
  return html.slice(0, buttonAt) + html.slice(buttonEnd + '</button>'.length)
}

/** Serves the password-reset screen with the hosting lines and the review switcher removed. */
export function passwordResetPageHtml(stitchHtml: string): string {
  const withoutTabs = dropUntil(
    stitchHtml,
    '<!-- Interactive State Selector Bar (Specification Walkthrough FR-008) -->',
    '<!-- Main Canvas -->',
    'password reset state switcher',
  )
  const stripped = dropSimulatedLink(withoutTabs)
    .replaceAll(HOSTING_CARD, '')
    .replaceAll(OLD_COPYRIGHT, NEW_COPYRIGHT)
    .replace(FOOTER_HOST, '')
    .replaceAll(SPECIMEN_EMAIL, '')
    .replaceAll(SPECIMEN_PASSWORD, '')
    .replace('onsubmit="event.preventDefault(); switchState(\'state-2\');"', '')
    .replace('onsubmit="event.preventDefault(); switchState(\'state-5\');"', '')
  if (
    stripped.includes('tab-state-') ||
    stripped.includes('Simuler') ||
    stripped.includes("switchState('state-2')") ||
    stripped.includes("switchState('state-3')") ||
    stripped.includes("switchState('state-5')")
  ) {
    throw new Error('password reset stitch state switcher was not removed')
  }
  const close = stripped.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('password reset stitch is missing </body>')
  }
  return `${stripped.slice(0, close)}${BEHAVIOR}${stripped.slice(close)}`
}
