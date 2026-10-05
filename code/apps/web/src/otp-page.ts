const SPECIMEN = '+226 70 •• •• 84'
const PROMPT = "Entrez le numéro de téléphone rectifié pour le Burkina Faso ou l'international :"
const PROMPT_VALUE = '+226 70 00 00 00'
const SAVED = 'Numéro enregistré avec succès. Un nouveau code à 6 chiffres a été ordonnancé.'

export function maskE164(phone: string): string {
  const digits = phone.startsWith('+') ? phone.slice(1) : phone
  if (digits.startsWith('226') && digits.length === 11) {
    const national = digits.slice(3)
    return `+226 ${national.slice(0, 2)} •• •• ${national.slice(-2)}`
  }
  const last = digits.slice(-2)
  const head = digits.slice(0, Math.min(3, Math.max(0, digits.length - 2)))
  return `+${head} •• •• ${last}`
}

const BEHAVIOR = `
<script>
  const SPECIMEN = ${JSON.stringify(SPECIMEN)}
  let phone = ''
  let phoneNode = null
  let verified = false
  function normalizePhone(value) {
    return String(value || '').replace(/[\\s.\\-()]/g, '')
  }
  function maskPhone(value) {
    const digits = value.charAt(0) === '+' ? value.slice(1) : value
    if (digits.indexOf('226') === 0 && digits.length === 11) {
      const national = digits.slice(3)
      return '+226 ' + national.slice(0, 2) + ' •• •• ' + national.slice(-2)
    }
    const last = digits.slice(-2)
    const headLength = Math.min(3, Math.max(0, digits.length - 2))
    return '+' + digits.slice(0, headLength) + ' •• •• ' + last
  }
  function applyMask(value) {
    if (!phoneNode) {
      const nodes = document.querySelectorAll('span')
      for (let index = 0; index < nodes.length; index += 1) {
        if (nodes[index].textContent && nodes[index].textContent.indexOf(SPECIMEN) !== -1) {
          phoneNode = nodes[index]
          break
        }
      }
    }
    if (phoneNode) {
      phoneNode.textContent = maskPhone(value)
    }
  }
  function readCode() {
    return Array.from(document.querySelectorAll('#otp-inputs-wrapper input')).map(function (input) {
      return input.value || ''
    }).join('')
  }
  async function postOtp(body) {
    return fetch('/v1/verifications/otp', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  }
  async function sendPhone(nextPhone, announce) {
    const normalized = normalizePhone(nextPhone)
    let response
    try {
      response = await postOtp({ action: 'send', phone_e164: normalized })
    } catch (error) {
      return
    }
    if (response.status === 200) {
      return
    }
    if (response.status !== 201) {
      if (typeof startCooldown === 'function' && response.status === 429) {
        startCooldown(60)
      }
      return
    }
    phone = normalized
    applyMask(normalized)
    if (announce) {
      alert(${JSON.stringify(SAVED)})
    }
    if (typeof setScreenState === 'function') {
      setScreenState('sent')
    }
    if (typeof startCooldown === 'function') {
      startCooldown(60)
    }
  }
  window.handleFormSubmit = async function (event) {
    event.preventDefault()
    if (verified) {
      return
    }
    const code = readCode()
    if (code.length !== 6) {
      return
    }
    let response
    try {
      response = await postOtp({ action: 'verify', code: code })
    } catch (error) {
      return
    }
    if (response.status === 200 && typeof setScreenState === 'function') {
      verified = true
      setScreenState('success')
      return
    }
    if (typeof setScreenState === 'function') {
      setScreenState('error')
    }
    if (typeof startCooldown === 'function') {
      startCooldown(60)
    }
  }
  window.triggerResend = function () {
    if (!phone) {
      window.openModifyNumberModal()
      return
    }
    void sendPhone(phone, false)
  }
  window.openModifyNumberModal = function () {
    const next = prompt(${JSON.stringify(PROMPT)}, ${JSON.stringify(PROMPT_VALUE)})
    if (!next) {
      return
    }
    void sendPhone(next, true)
  }
</script>
`

/** Serves the downloaded OTP screen. The Stitch file stays unchanged. Behavior is injected. */
export function otpPageHtml(stitchHtml: string): string {
  const close = stitchHtml.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('otp stitch is missing </body>')
  }
  return `${stitchHtml.slice(0, close)}${BEHAVIOR}${stitchHtml.slice(close)}`
}
