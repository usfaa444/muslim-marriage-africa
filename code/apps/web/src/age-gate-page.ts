import { SIGNUP_DRAFT_KEY } from './auth-page'

const HOSTING_LINE =
  /<div class="flex items-center space-x-1\.5 justify-center md:justify-end">[\s\S]*?Loi 010-2004\/AN<\/span>\s*<\/div>\s*/

const BEHAVIOR = `
<script>
  const hint = document.querySelector('#stateEmpty span:last-of-type')
  const hintText = hint ? hint.textContent : ''
  function restoreHint() {
    if (hint) {
      hint.textContent = hintText
    }
  }
  document.getElementById('dobDay').addEventListener('change', restoreHint)
  document.getElementById('dobMonth').addEventListener('change', restoreHint)
  document.getElementById('dobYear').addEventListener('change', restoreHint)
  function showGateMessage(line) {
    restoreHint()
    if (hint) {
      hint.textContent = line
    }
    document.getElementById('stateEligible').classList.add('hidden')
    document.getElementById('stateUnderage').classList.add('hidden')
    document.getElementById('stateEmpty').classList.remove('hidden')
  }
  function showHeld() {
    document.getElementById('stateEmpty').classList.add('hidden')
    document.getElementById('stateEligible').classList.add('hidden')
    document.getElementById('stateUnderage').classList.remove('hidden')
    const submitBtn = document.getElementById('submitBtn')
    submitBtn.disabled = true
  }
  window.handleContinue = async function () {
    const submitBtn = document.getElementById('submitBtn')
    if (!submitBtn || submitBtn.disabled) {
      return
    }
    const draftRaw = sessionStorage.getItem(${JSON.stringify(SIGNUP_DRAFT_KEY)})
    let draft = null
    try {
      draft = draftRaw ? JSON.parse(draftRaw) : null
    } catch (error) {
      draft = null
    }
    if (!draft) {
      showGateMessage('La création a échoué.')
      return
    }
    const day = document.getElementById('dobDay').value
    const month = document.getElementById('dobMonth').value
    const year = document.getElementById('dobYear').value
    const readyLabel = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-current" data-icon="progress_activity" style="font-size: 20px;">progress_activity</span><span>Génération du jeton SMS sécurisé...</span>'
    try {
      const response = await fetch('/v1/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.assign({}, draft, { dob: year + '-' + month + '-' + day }))
      })
      const payload = await response.json().catch(function () { return null })
      if (response.ok && payload && payload.status === 'held') {
        sessionStorage.removeItem(${JSON.stringify(SIGNUP_DRAFT_KEY)})
        showHeld()
        return
      }
      if (response.ok) {
        sessionStorage.removeItem(${JSON.stringify(SIGNUP_DRAFT_KEY)})
        alert("Redirection vers la passerelle OTP SMS d'AnKanu Burkina Faso.")
        return
      }
      const message = payload && payload.error && payload.error.message
      showGateMessage(message || 'La création a échoué.')
      submitBtn.innerHTML = readyLabel
      submitBtn.disabled = false
    } catch (error) {
      showGateMessage('La création a échoué.')
      submitBtn.innerHTML = readyLabel
      submitBtn.disabled = false
    }
  }
</script>
`

/** Serves the age-gate screen. The hosting statute line is removed. Signup is posted from this screen. */
export function ageGatePageHtml(stitchHtml: string): string {
  const stripped = stitchHtml.replace(HOSTING_LINE, '')
  const close = stripped.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('age gate stitch is missing </body>')
  }
  return `${stripped.slice(0, close)}${BEHAVIOR}${stripped.slice(close)}`
}
