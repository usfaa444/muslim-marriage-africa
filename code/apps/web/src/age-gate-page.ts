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
  let accountHeld = false
  let requestOpen = false
  function applyHeldControl() {
    document.getElementById('stateEmpty').classList.add('hidden')
    document.getElementById('stateEligible').classList.add('hidden')
    document.getElementById('stateUnderage').classList.remove('hidden')
    const submitBtn = document.getElementById('submitBtn')
    submitBtn.disabled = true
    submitBtn.className = 'w-full min-h-[48px] rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 bg-disabled text-ink-secondary cursor-not-allowed font-body-strong text-body px-6 select-none'
    const label = document.getElementById('btnLabelText')
    if (label) {
      label.textContent = 'Continuer vers la vérification (SMS / OTP)'
    }
  }
  function lockPendingControl() {
    const submitBtn = document.getElementById('submitBtn')
    if (!submitBtn) {
      return
    }
    submitBtn.disabled = true
    const label = document.getElementById('btnLabelText')
    if (label) {
      label.textContent = 'Génération du jeton SMS sécurisé...'
    }
  }
  function onDateChange() {
    restoreHint()
    if (accountHeld) {
      applyHeldControl()
      return
    }
    if (requestOpen) {
      lockPendingControl()
    }
  }
  document.getElementById('dobDay').addEventListener('change', onDateChange)
  document.getElementById('dobMonth').addEventListener('change', onDateChange)
  document.getElementById('dobYear').addEventListener('change', onDateChange)
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
    accountHeld = true
    applyHeldControl()
  }
  function restoreFailedSubmit(message, label, previousText, submitBtn, previousClass) {
    if (accountHeld) {
      applyHeldControl()
      return
    }
    showGateMessage(message)
    if (label) {
      label.textContent = previousText
    }
    submitBtn.className = previousClass
    submitBtn.disabled = false
  }
  window.handleContinue = async function () {
    if (requestOpen || accountHeld) {
      if (accountHeld) {
        applyHeldControl()
      } else {
        lockPendingControl()
      }
      return
    }
    const submitBtn = document.getElementById('submitBtn')
    if (!submitBtn || submitBtn.disabled) {
      return
    }
    requestOpen = true
    const draftRaw = sessionStorage.getItem(${JSON.stringify(SIGNUP_DRAFT_KEY)})
    let draft = null
    try {
      draft = draftRaw ? JSON.parse(draftRaw) : null
    } catch (error) {
      draft = null
    }
    if (!draft) {
      showGateMessage('La création a échoué.')
      requestOpen = false
      return
    }
    const day = document.getElementById('dobDay').value
    const month = document.getElementById('dobMonth').value
    const year = document.getElementById('dobYear').value
    const label = document.getElementById('btnLabelText')
    const previousText = label ? label.textContent : ''
    const previousClass = submitBtn.className
    submitBtn.disabled = true
    if (label) {
      label.textContent = 'Génération du jeton SMS sécurisé...'
    }
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
      if (accountHeld) {
        applyHeldControl()
        return
      }
      if (response.ok) {
        sessionStorage.removeItem(${JSON.stringify(SIGNUP_DRAFT_KEY)})
        alert("Redirection vers la passerelle OTP SMS d'AnKanu Burkina Faso.")
        return
      }
      const message = payload && payload.error && payload.error.message
      restoreFailedSubmit(message || 'La création a échoué.', label, previousText, submitBtn, previousClass)
    } catch (error) {
      restoreFailedSubmit('La création a échoué.', label, previousText, submitBtn, previousClass)
    } finally {
      if (!accountHeld) {
        requestOpen = false
      }
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
