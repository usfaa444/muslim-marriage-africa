import { dropUntil, replaceUntil } from './design-artifact'
import { pinGuardScript } from './pin-guard'

const SPECIMEN = '+226 70 •• •• 84'
const SPECIMEN_MARKUP =
  '<span class="font-mono text-ink-primary font-semibold text-[13px] bg-surface-raised px-2 py-0.5 rounded border border-border-hairline">+226 70 •• •• 84</span>'
const PHONE_MARKUP =
  '<span id="otp-phone-mask" class="font-mono text-ink-primary font-semibold text-[13px] bg-surface-raised px-2 py-0.5 rounded border border-border-hairline">+226 70 •• •• 84</span><input id="otp-phone-input" hidden class="hidden font-mono text-ink-primary font-semibold text-[13px] bg-surface-raised px-2 py-0.5 rounded border border-border-strong w-40" type="tel" inputmode="tel" autocomplete="tel" aria-label="Numéro de téléphone" placeholder="+22670000000"/>'
const DEMO_MODIFY = `function openModifyNumberModal() {
      const newNum = prompt("Entrez le numéro de téléphone rectifié pour le Burkina Faso ou l'international :", "+226 70 00 00 00");
      if (newNum) {
        alert("Numéro enregistré avec succès. Un nouveau code à 6 chiffres a été ordonnancé.");
        setScreenState('sent');
      }
    }`
const ACTIVE_SUBMIT =
  'w-full h-12 rounded-full bg-indigo text-ink-on-indigo hover:bg-surface-indigo font-body-strong text-body-strong transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-none'
const DISABLED_SUBMIT =
  'w-full h-12 rounded-full bg-disabled text-ink-primary/60 font-body-strong text-body-strong transition-all duration-200 flex items-center justify-center gap-2 cursor-not-allowed'
const SEND_FAILED = "L'envoi du code a échoué."
const VERIFY_FAILED = 'Code invalide ou expiré'
const PHONE_FAILED = 'phone_e164 : un numéro E.164 est requis.'

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
  const SEND_FAILED = ${JSON.stringify(SEND_FAILED)}
  const VERIFY_FAILED = ${JSON.stringify(VERIFY_FAILED)}
  const PHONE_FAILED = ${JSON.stringify(PHONE_FAILED)}
  const ACTIVE_SUBMIT = ${JSON.stringify(ACTIVE_SUBMIT)}
  const DISABLED_SUBMIT = ${JSON.stringify(DISABLED_SUBMIT)}
  let phone = ''
  let busy = false
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
  function phoneInput() {
    return document.getElementById('otp-phone-input')
  }
  function phoneMask() {
    return document.getElementById('otp-phone-mask')
  }
  function setFieldHidden(node, hidden) {
    if (!node) {
      return
    }
    if (hidden) {
      node.classList.add('hidden')
      if (typeof node.setAttribute === 'function') {
        node.setAttribute('hidden', '')
      }
      return
    }
    node.classList.remove('hidden')
    if (typeof node.removeAttribute === 'function') {
      node.removeAttribute('hidden')
    }
  }
  function showMask(value) {
    const mask = phoneMask()
    const input = phoneInput()
    if (mask) {
      mask.textContent = maskPhone(value)
    }
    setFieldHidden(mask, false)
    setFieldHidden(input, true)
  }
  function showBannerError(message) {
    const banner = document.getElementById('error-banner')
    const success = document.getElementById('success-banner')
    if (success) {
      success.classList.add('hidden')
    }
    if (!banner) {
      return
    }
    banner.classList.remove('hidden')
    const title = banner.querySelector('p')
    if (title) {
      title.textContent = message
    }
  }
  function readCode() {
    return Array.from(document.querySelectorAll('#otp-inputs-wrapper input')).map(function (input) {
      return input.value || ''
    }).join('')
  }
  function lockGranted() {
    verified = true
    window.otpGranted = true
    const success = document.getElementById('success-banner')
    const error = document.getElementById('error-banner')
    if (error && error.classList) {
      error.classList.add('hidden')
    }
    if (success && success.classList) {
      success.classList.remove('hidden')
    }
    const label = document.getElementById('submit-btn-text')
    if (label) {
      label.textContent = 'Confirmer le code scellé'
    }
    const submit = document.getElementById('submit-btn')
    if (submit) {
      submit.disabled = true
      submit.className = DISABLED_SUBMIT
    }
    const resend = document.getElementById('resend-action')
    if (resend) {
      resend.disabled = true
      if (resend.classList && typeof resend.className === 'string') {
        resend.className = 'text-disabled font-body-strong cursor-not-allowed transition-colors'
      }
    }
    const boxes = document.querySelectorAll('#otp-inputs-wrapper input')
    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index]
      box.readOnly = true
      if (box.classList && typeof box.classList.remove === 'function') {
        box.classList.remove('border-danger')
      }
    }
    hideModifyNumber()
    if (typeof stopOtpCooldown === 'function') {
      stopOtpCooldown()
    }
  }
  function hideModifyNumber() {
    const buttons = document.querySelectorAll('button')
    for (let index = 0; index < buttons.length; index += 1) {
      const button = buttons[index]
      if (button.textContent && button.textContent.indexOf('Modifier le numéro') !== -1) {
        button.disabled = true
        button.setAttribute('hidden', '')
        if (button.classList && typeof button.classList.add === 'function') {
          button.classList.add('hidden')
        }
      }
    }
  }
  function enableVerify() {
    const submit = document.getElementById('submit-btn')
    if (!submit || readCode().length !== 6) {
      return
    }
    submit.disabled = false
    submit.className = ACTIVE_SUBMIT
  }
  async function errorMessage(response, fallback) {
    try {
      const payload = await response.json()
      if (payload && payload.error && payload.error.message) {
        return payload.error.message
      }
    } catch (error) {
      return fallback
    }
    return fallback
  }
  async function postOtp(body) {
    return fetch('/v1/verifications/otp', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  }
  async function sendPhone(nextPhone) {
    if (verified) {
      return
    }
    const normalized = normalizePhone(nextPhone)
    if (!normalized) {
      showBannerError(PHONE_FAILED)
      return
    }
    if (busy) {
      return
    }
    busy = true
    try {
      let response
      try {
        response = await postOtp({ action: 'send', phone_e164: normalized })
      } catch (error) {
        showBannerError(SEND_FAILED)
        return
      }
      if (response.status === 200) {
        if (phone) {
          showMask(phone)
        }
        return
      }
      if (response.status !== 201) {
        showBannerError(await errorMessage(response, SEND_FAILED))
        if (typeof startCooldown === 'function' && response.status === 429) {
          startCooldown(60)
        }
        return
      }
      phone = normalized
      showMask(normalized)
      if (typeof setScreenState === 'function') {
        setScreenState('sent')
      }
      if (typeof startCooldown === 'function') {
        startCooldown(60)
      }
    } finally {
      busy = false
    }
  }
  window.handleFormSubmit = async function (event) {
    event.preventDefault()
    if (verified || busy) {
      return
    }
    const code = readCode()
    if (code.length !== 6) {
      return
    }
    busy = true
    try {
      let response
      try {
        response = await postOtp({ action: 'verify', code: code })
      } catch (error) {
        showBannerError(VERIFY_FAILED)
        enableVerify()
        return
      }
      if (response.status === 200) {
        let payload = null
        try {
          payload = typeof response.json === 'function' ? await response.json() : null
        } catch (error) {
          payload = null
        }
        if (payload && payload.status === 'granted') {
          lockGranted()
          return
        }
      }
      showBannerError(await errorMessage(response, VERIFY_FAILED))
      if (typeof setScreenState === 'function') {
        setScreenState('error')
      }
      if (typeof startCooldown === 'function') {
        startCooldown(60)
      }
      enableVerify()
    } finally {
      busy = false
    }
  }
  window.triggerResend = function () {
    if (verified) {
      return
    }
    if (!phone) {
      window.openModifyNumberModal()
      return
    }
    void sendPhone(phone)
  }
  window.openModifyNumberModal = function () {
    if (verified) {
      return
    }
    const input = phoneInput()
    const mask = phoneMask()
    if (!input || !mask) {
      return
    }
    if (input.classList.contains('hidden')) {
      input.value = phone
      setFieldHidden(input, false)
      setFieldHidden(mask, true)
      if (typeof input.focus === 'function') {
        input.focus()
      }
      return
    }
    const next = input.value
    if (!normalizePhone(next)) {
      setFieldHidden(input, true)
      setFieldHidden(mask, false)
      return
    }
    void sendPhone(next)
  }
  const phoneField = phoneInput()
  if (phoneField) {
    phoneField.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault()
        window.openModifyNumberModal()
      }
    })
  }
</script>
`

/** Serves the downloaded OTP screen. The Stitch file stays unchanged. The review switcher stays off the response. */
export function otpPageHtml(stitchHtml: string): string {
  if (!stitchHtml.includes(SPECIMEN_MARKUP) || !stitchHtml.includes(DEMO_MODIFY)) {
    throw new Error('otp stitch is missing the phone chip or the demo number dialog')
  }
  const withoutSwitcher = dropUntil(
    stitchHtml,
    '<!-- AUDIT INTERACTIVE STATE DEMONSTRATOR BAR (Reviewer Tooling) -->',
    '<!-- CENTRAL SOLEMN VERIFICATION CARD -->',
    'otp state switcher',
  )
  const withoutDemo = replaceUntil(
    withoutSwitcher,
    'function handleFormSubmit(e)',
    'function triggerResend()',
    'function handleFormSubmit(event) { event.preventDefault(); }\n\n    ',
    'otp demo submit',
  )
  const withoutResend = replaceUntil(
    withoutDemo,
    'function triggerResend()',
    'function openModifyNumberModal()',
    'function triggerResend() {}\n\n    ',
    'otp demo resend',
  )
  const withoutTabs = dropUntil(
    withoutResend,
    '// Reset tab button styles',
    'errorBanner.classList.add',
    'otp state tab styles',
  )
  const withoutSpecimen = withoutTabs.replace(SPECIMEN_MARKUP, PHONE_MARKUP).replace(DEMO_MODIFY, 'function openModifyNumberModal() {}')
  const withoutDemoSuccess = replaceUntil(
    withoutSpecimen,
    "} else if (state === 'success') {",
    '  </script>',
    `} else if (state === 'success') {
        successBanner.classList.remove('hidden');
        submitBtn.disabled = true;
        submitBtn.className = ${JSON.stringify(DISABLED_SUBMIT)};
      }
    }
`,
    'otp demo success',
  )
  const prepared = replaceUntil(
    withoutDemoSuccess,
    'function startCooldown(seconds) {',
    'startCooldown(58);',
    `function stopOtpCooldown() {
      clearInterval(timerInterval);
      timerInterval = null;
      if (resendAction) {
        resendAction.disabled = true;
        resendAction.className = "text-disabled font-body-strong cursor-not-allowed transition-colors";
      }
      if (cooldownLabel) {
        cooldownLabel.textContent = "Délai de réexpédition écoulé";
      }
    }
    window.stopOtpCooldown = stopOtpCooldown;

    function startCooldown(seconds) {
      clearInterval(timerInterval);
      cooldownSeconds = seconds;
      resendAction.disabled = true;
      resendAction.className = "text-disabled font-body-strong cursor-not-allowed transition-colors";

      timerInterval = setInterval(() => {
        cooldownSeconds--;
        if (cooldownSeconds > 0) {
          timerCounter.textContent = cooldownSeconds;
          cooldownLabel.innerHTML = \`Renvoyer le code par SMS (<span id="timer-counter">\${cooldownSeconds}</span>s)\`;
        } else {
          clearInterval(timerInterval);
          cooldownLabel.textContent = "Délai de réexpédition écoulé";
          if (window.otpGranted) {
            resendAction.disabled = true;
            resendAction.className = "text-disabled font-body-strong cursor-not-allowed transition-colors";
          } else {
            resendAction.disabled = false;
            resendAction.className = "text-primary hover:text-secondary underline font-body-strong cursor-pointer transition-colors";
          }
        }
      }, 1000);
    }

    `,
    'otp cooldown stop',
  )
  const completionLine = "const code = otpInputs.map(input => input.value).join('');"
  if (!prepared.includes(completionLine)) {
    throw new Error('otp completion check is missing')
  }
  const locked = prepared.replace(
    completionLine,
    `if (window.otpGranted) {
        submitBtn.disabled = true;
        submitBtn.className = ${JSON.stringify(DISABLED_SUBMIT)};
        return;
      }
      ${completionLine}`,
  )
  if (locked.includes('btn-state-') || locked.includes("code === '123456'")) {
    throw new Error('otp stitch state switcher was not removed')
  }
  if (locked.includes("Accéder à l'étape Wali") || locked.includes("['8', '4', '0', '1', '9', '2']")) {
    throw new Error('otp stitch success demo was not removed')
  }
  if (!locked.includes('window.stopOtpCooldown') || !locked.includes('window.otpGranted')) {
    throw new Error('otp grant lock was not added')
  }
  if (/\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/.test(locked)) {
    throw new Error('otp stitch still contains a native dialog')
  }
  const close = locked.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('otp stitch is missing </body>')
  }
  const html = `${locked.slice(0, close)}${pinGuardScript()}${BEHAVIOR}${locked.slice(close)}`
  if (/\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/.test(html)) {
    throw new Error('otp page still contains a native dialog')
  }
  return html
}
