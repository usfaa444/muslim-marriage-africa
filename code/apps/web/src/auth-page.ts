/** Token already printed on the pledge checkbox the member accepts. */
export const COC_VERSION_ON_SCREEN = 'FR-089'

const SUBMIT = `
<script>
  function passwordMeetsPublishedRules(value) {
    const length = Array.from(value).length
    return length >= 12 && length <= 128 && value.trim().length > 0
  }
  function validateSubmissionState() {
    const pledge = document.getElementById('pledge-check').checked
    const email = document.getElementById('email').value.trim()
    const pseudonym = document.getElementById('pseudonym').value.trim()
    const password = document.getElementById('password').value
    const button = document.getElementById('btn-submit-signup')
    const ready = pledge && email && pseudonym && passwordMeetsPublishedRules(password)
    if (ready) {
      button.disabled = false
      button.className = "w-full h-12 px-6 rounded-xl font-body-strong text-body transition-colors duration-200 flex items-center justify-center space-x-2 bg-indigo hover:bg-indigo-deep text-ink-on-indigo cursor-pointer"
    } else {
      button.disabled = true
      button.className = "w-full h-12 px-6 rounded-xl font-body-strong text-body transition-colors duration-200 flex items-center justify-center space-x-2 bg-disabled text-ink-primary/60 cursor-not-allowed"
    }
  }
  document.getElementById('email').addEventListener('input', validateSubmissionState)
  document.getElementById('pseudonym').addEventListener('input', validateSubmissionState)
  document.getElementById('signup-form').addEventListener('submit', async function (event) {
    event.preventDefault()
    const selected = document.querySelector('input[name="gender_role"]:checked')
    const gender = selected && selected.value === 'frere' ? 'brother' : 'sister'
    const response = await fetch('/v1/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        pseudonym: document.getElementById('pseudonym').value,
        gender: gender,
        pledge_accepted: document.getElementById('pledge-check').checked === true,
        coc_version: ${JSON.stringify(COC_VERSION_ON_SCREEN)}
      })
    })
    const payload = await response.json().catch(function () { return null })
    let line = 'Compte créé. Il n\\'est pas listé publiquement.'
    if (!response.ok) {
      const field = payload && payload.error && payload.error.details && (payload.error.details.field || (payload.error.details.fields || []).join(', '))
      line = (payload && payload.error && payload.error.message) || (field ? String(field) : 'La création a échoué.')
    }
    let slot = document.getElementById('signup-result')
    if (!slot) {
      slot = document.createElement('p')
      slot.id = 'signup-result'
      slot.className = 'text-caption font-caption text-ink-primary'
      document.getElementById('signup-form').appendChild(slot)
    }
    slot.textContent = line
  })
  const google = Array.from(document.querySelectorAll('button')).find(function (button) {
    return button.textContent && button.textContent.indexOf('Continuer via Google') !== -1
  })
  if (google) {
    google.addEventListener('click', function (event) {
      event.preventDefault()
    })
  }
</script>
`

/** Serves the downloaded Auth screen and posts signup only. Captcha, Google, and the 19+ note stay visual. */
export function authPageHtml(stitchHtml: string): string {
  const close = stitchHtml.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('auth stitch is missing </body>')
  }
  return `${stitchHtml.slice(0, close)}${SUBMIT}${stitchHtml.slice(close)}`
}
