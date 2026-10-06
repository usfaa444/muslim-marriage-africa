import { dropUntil, replaceUntil } from './design-artifact'
import { pinGuardScript } from './pin-guard'

const SPECIMEN = '+226 70 •• •• 84'
const SPECIMEN_MARKUP =
  '<span class="font-mono text-ink-primary font-semibold text-[13px] bg-surface-raised px-2 py-0.5 rounded border border-border-hairline">+226 70 •• •• 84</span>'
const PHONE_MARKUP =
  '<span id="otp-phone-mask" hidden class="hidden font-mono text-ink-primary font-semibold text-[13px] bg-surface-raised px-2 py-0.5 rounded border border-border-hairline"></span>'
const PHONE_LABEL = "Entrez le numéro de téléphone pour le Burkina Faso ou l'international :"
const SEND_LABEL = 'Envoyer le code par SMS'
const CONFIRM_LABEL = 'Confirmer le code scellé'
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
  const SEND_FAILED = ${JSON.stringify(SEND_FAILED)}
  const VERIFY_FAILED = ${JSON.stringify(VERIFY_FAILED)}
  const PHONE_FAILED = ${JSON.stringify(PHONE_FAILED)}
  const ACTIVE_SUBMIT = ${JSON.stringify(ACTIVE_SUBMIT)}
  const DISABLED_SUBMIT = ${JSON.stringify(DISABLED_SUBMIT)}
  const SEND_LABEL = ${JSON.stringify(SEND_LABEL)}
  const CONFIRM_LABEL = ${JSON.stringify(CONFIRM_LABEL)}
  const E164 = /^\\+[1-9]\\d{1,14}$/
  const OTP_TTL_MS = 600000
  const OTP_RESEND_MS = 60000
  let phone = ''
  let busy = false
  let verified = false
  let acted = false
  let mode = 'phone'
  window.otpPhoneEntry = true
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
  function hideById(id, hidden) {
    setFieldHidden(document.getElementById(id), hidden)
  }
  function setBoxesLocked(locked) {
    const boxes = document.querySelectorAll('#otp-inputs-wrapper input')
    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index]
      box.readOnly = locked
      if (locked && box.classList && typeof box.classList.remove === 'function') {
        box.classList.remove('border-danger')
      }
    }
  }
  function setSubmit(label, enabled) {
    const text = document.getElementById('submit-btn-text')
    const submit = document.getElementById('submit-btn')
    if (text) {
      text.textContent = label
    }
    if (!submit) {
      return
    }
    submit.disabled = !enabled
    submit.className = enabled ? ACTIVE_SUBMIT : DISABLED_SUBMIT
  }
  function showPhoneEntry() {
    mode = 'phone'
    window.otpPhoneEntry = true
    window.otpVerifyLocked = false
    hideById('otp-phone-label', false)
    hideById('otp-phone-input', false)
    hideById('otp-sent-copy', true)
    hideById('otp-sent-row', true)
    hideById('otp-phone-mask', true)
    hideById('status-detail', true)
    hideById('otp-code-block', true)
    hideById('otp-resend-row', true)
    const success = document.getElementById('success-banner')
    if (success && success.classList) {
      success.classList.add('hidden')
    }
    setBoxesLocked(true)
    setSubmit(SEND_LABEL, true)
  }
  function showCodeEntry(masked, resendSeconds) {
    mode = 'code'
    window.otpPhoneEntry = false
    window.otpVerifyLocked = false
    hideById('otp-phone-label', true)
    hideById('otp-phone-input', true)
    hideById('otp-sent-copy', false)
    hideById('otp-sent-row', false)
    const mask = phoneMask()
    if (mask && masked) {
      mask.textContent = masked
    }
    hideById('otp-phone-mask', false)
    hideById('status-detail', false)
    hideById('otp-sent-time', true)
    hideById('otp-code-block', false)
    hideById('otp-resend-row', false)
    const error = document.getElementById('error-banner')
    const success = document.getElementById('success-banner')
    if (error && error.classList) {
      error.classList.add('hidden')
    }
    if (success && success.classList) {
      success.classList.add('hidden')
    }
    setBoxesLocked(false)
    const freshBoxes = document.querySelectorAll('#otp-inputs-wrapper input')
    for (let index = 0; index < freshBoxes.length; index += 1) {
      freshBoxes[index].value = ''
    }
    setSubmit(CONFIRM_LABEL, false)
    if (resendSeconds > 0 && typeof startCooldown === 'function') {
      startCooldown(resendSeconds)
      return
    }
    const resend = document.getElementById('resend-action')
    const cooldownLabel = document.getElementById('cooldown-label')
    if (cooldownLabel) {
      cooldownLabel.textContent = 'Délai de réexpédition écoulé'
    }
    if (resend && !verified) {
      resend.disabled = false
      resend.className = 'text-primary hover:text-secondary underline font-body-strong cursor-pointer transition-colors'
    }
  }
  function showExpired(masked) {
    showCodeEntry(masked, 0)
    mode = 'expired'
    window.otpVerifyLocked = true
    setBoxesLocked(true)
    setSubmit(CONFIRM_LABEL, false)
    const boxes = document.querySelectorAll('#otp-inputs-wrapper input')
    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index]
      if (box.classList && typeof box.classList.add === 'function') {
        box.classList.add('border-danger')
      }
    }
    showBannerError(VERIFY_FAILED)
  }
  function resendSecondsFromExpires(iso) {
    const expires = Date.parse(iso || '')
    if (!Number.isFinite(expires)) {
      return 0
    }
    const left = OTP_RESEND_MS - (Date.now() - (expires - OTP_TTL_MS))
    if (left <= 0) {
      return 0
    }
    return Math.ceil(left / 1000)
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
    mode = 'granted'
    window.otpGranted = true
    window.otpPhoneEntry = false
    window.otpVerifyLocked = false
    hideById('otp-phone-label', true)
    hideById('otp-phone-input', true)
    const success = document.getElementById('success-banner')
    const error = document.getElementById('error-banner')
    if (error && error.classList) {
      error.classList.add('hidden')
    }
    if (success && success.classList) {
      success.classList.remove('hidden')
    }
    setSubmit(CONFIRM_LABEL, false)
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
  function goLogin() {
    if (window.location && typeof window.location.assign === 'function') {
      window.location.assign('/auth?mode=login')
    }
  }
  async function postOtp(body) {
    return fetch('/v1/verifications/otp', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  }
  async function readOtp() {
    return fetch('/v1/verifications/otp', { method: 'GET', credentials: 'same-origin', cache: 'no-store' })
  }
  function keepPhoneEntry(message) {
    showPhoneEntry()
    showBannerError(message)
    setSubmit(SEND_LABEL, true)
  }
  async function sendPhone(nextPhone) {
    if (verified) {
      return
    }
    const normalized = normalizePhone(nextPhone)
    if (!E164.test(normalized)) {
      keepPhoneEntry(PHONE_FAILED)
      return
    }
    if (busy) {
      return
    }
    busy = true
    setSubmit(mode === 'phone' ? SEND_LABEL : CONFIRM_LABEL, false)
    try {
      let response
      try {
        response = await postOtp({ action: 'send', phone_e164: normalized })
      } catch (error) {
        keepPhoneEntry(SEND_FAILED)
        return
      }
      if (response.status === 401) {
        goLogin()
        return
      }
      if (response.status === 200) {
        acted = true
        let payload = null
        try {
          payload = typeof response.json === 'function' ? await response.json() : null
        } catch (error) {
          payload = null
        }
        let follow = null
        try {
          const again = await readOtp()
          if (again && again.status === 200 && typeof again.json === 'function') {
            follow = await again.json()
          }
        } catch (error) {
          follow = null
        }
        if (follow && follow.status === 'granted') {
          showCodeEntry(follow.phone_masked || (phone ? maskPhone(phone) : ''), 0)
          lockGranted()
          return
        }
        const masked = phone ? maskPhone(phone) : (follow && follow.phone_masked) || ''
        const seconds = resendSecondsFromExpires((follow && follow.expires_at) || (payload && payload.expires_at))
        if (mode === 'code' && phone) {
          const mask = phoneMask()
          if (mask && masked) {
            mask.textContent = masked
          }
          enableVerify()
          return
        }
        showCodeEntry(masked, seconds)
        return
      }
      if (response.status !== 201) {
        keepPhoneEntry(await errorMessage(response, SEND_FAILED))
        return
      }
      acted = true
      phone = normalized
      showCodeEntry(maskPhone(normalized), 60)
    } finally {
      busy = false
      if (mode === 'phone' && !verified) {
        setSubmit(SEND_LABEL, true)
      }
    }
  }
  window.handleFormSubmit = async function (event) {
    event.preventDefault()
    if (verified || busy) {
      return
    }
    if (mode === 'phone') {
      const input = phoneInput()
      void sendPhone(input ? input.value : '')
      return
    }
    if (mode !== 'code') {
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
      if (response.status === 401) {
        goLogin()
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
          acted = true
          lockGranted()
          return
        }
      }
      showBannerError(await errorMessage(response, VERIFY_FAILED))
      const boxes = document.querySelectorAll('#otp-inputs-wrapper input')
      for (let index = 0; index < boxes.length; index += 1) {
        const box = boxes[index]
        if (box.classList && typeof box.classList.add === 'function') {
          box.classList.add('border-danger')
        }
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
      input.value = phone || '+226'
      hideById('otp-phone-label', false)
      setFieldHidden(input, false)
      setFieldHidden(mask, true)
      if (typeof input.focus === 'function') {
        input.focus()
      }
      return
    }
    void sendPhone(input.value)
  }
  const phoneField = phoneInput()
  if (phoneField) {
    phoneField.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault()
        void sendPhone(phoneField.value)
      }
    })
  }
  async function boot() {
    let response
    try {
      response = await readOtp()
    } catch (error) {
      return
    }
    if (acted || verified) {
      return
    }
    if (response.status === 401) {
      goLogin()
      return
    }
    if (!response || response.status !== 200 || typeof response.json !== 'function') {
      return
    }
    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      return
    }
    if (acted || verified || !payload || payload.status === 'none') {
      return
    }
    if (payload.status === 'granted') {
      showCodeEntry(payload.phone_masked || '', 0)
      lockGranted()
      return
    }
    if (payload.status === 'pending') {
      const expires = Date.parse(payload.expires_at || '')
      if (!Number.isFinite(expires) || expires <= Date.now()) {
        showExpired(payload.phone_masked || '')
        return
      }
      showCodeEntry(payload.phone_masked || '', resendSecondsFromExpires(payload.expires_at))
    }
  }
  void boot()
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
  const quiet = prepared.replace('startCooldown(58);', '')
  const completionLine = "const code = otpInputs.map(input => input.value).join('');"
  if (!quiet.includes(completionLine)) {
    throw new Error('otp completion check is missing')
  }
  const locked = quiet.replace(
    completionLine,
    `if (window.otpGranted || window.otpVerifyLocked) {
        submitBtn.disabled = true;
        submitBtn.className = ${JSON.stringify(DISABLED_SUBMIT)};
        return;
      }
      if (window.otpPhoneEntry) {
        submitBtn.disabled = false;
        submitBtn.className = ${JSON.stringify(ACTIVE_SUBMIT)};
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
  const painted = paintPhoneFirst(locked)
  const close = painted.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('otp stitch is missing </body>')
  }
  const html = `${painted.slice(0, close)}${pinGuardScript()}${BEHAVIOR}${painted.slice(close)}`
  if (/\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/.test(html)) {
    throw new Error('otp page still contains a native dialog')
  }
  if (html.includes(SPECIMEN) || html.includes("Aujourd'hui, 14:32:08 UTC")) {
    throw new Error('otp page still shows a specimen mask or timestamp')
  }
  if (!html.includes('id="otp-code-block" hidden') || !html.includes('value="+226"') || !html.includes(SEND_LABEL)) {
    throw new Error('otp first paint is not phone entry')
  }
  return html
}

function paintPhoneFirst(html: string): string {
  return replaceEach(html, [
    [
      '<p class="font-body text-body text-ink-secondary leading-relaxed">',
      '<p id="otp-sent-copy" hidden class="hidden font-body text-body text-ink-secondary leading-relaxed">',
      'otp sent copy',
    ],
    [
      '<div class="rounded-lg p-3 border border-border-hairline bg-surface-sand transition-all duration-200" id="status-container">\n<div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-meta font-meta">',
      `<div class="rounded-lg p-3 border border-border-hairline bg-surface-sand transition-all duration-200" id="status-container">\n<label id="otp-phone-label" class="block text-center font-meta text-meta text-ink-secondary mb-2" for="otp-phone-input">${PHONE_LABEL}</label>\n<input id="otp-phone-input" class="font-mono text-ink-primary font-semibold text-[13px] bg-surface-raised px-2 py-0.5 rounded border border-border-strong w-full max-w-xs" type="tel" inputmode="tel" autocomplete="tel" aria-label="Numéro de téléphone" value="+226"/>\n<div id="otp-sent-row" hidden class="hidden flex flex-col sm:flex-row items-center justify-between gap-2 text-meta font-meta">`,
      'otp phone slot',
    ],
    [
      '<div class="mt-2 pt-2 border-t border-border-hairline text-caption font-caption text-ink-secondary flex items-center justify-between" id="status-detail">',
      '<div id="status-detail" hidden class="hidden mt-2 pt-2 border-t border-border-hairline text-caption font-caption text-ink-secondary flex items-center justify-between">',
      'otp status detail',
    ],
    [
      '<span>Horodatage : <time id="dispatch-timestamp">Aujourd\'hui, 14:32:08 UTC</time></span>',
      '<span id="otp-sent-time" hidden class="hidden">Horodatage : <time id="dispatch-timestamp"></time></span>',
      'otp specimen time',
    ],
    [
      '<div class="space-y-2">\n<label class="block text-center font-meta text-meta text-ink-secondary" for="otp-0">',
      '<div id="otp-code-block" hidden class="hidden space-y-2">\n<label class="block text-center font-meta text-meta text-ink-secondary" for="otp-0">',
      'otp code block',
    ],
    [
      '<div class="pt-2 flex flex-col sm:flex-row items-center justify-between text-meta font-meta gap-3 border-t border-border-hairline">',
      '<div id="otp-resend-row" hidden class="hidden pt-2 flex flex-col sm:flex-row items-center justify-between text-meta font-meta gap-3 border-t border-border-hairline">',
      'otp resend row',
    ],
    [
      '<button class="w-full h-12 rounded-full bg-disabled text-ink-primary/60 font-body-strong text-body-strong transition-all duration-200 flex items-center justify-center gap-2 cursor-not-allowed" disabled="" id="submit-btn" type="submit">\n<span class="material-symbols-outlined text-[20px]">lock</span>\n<span id="submit-btn-text">Confirmer le code scellé</span>',
      `<button class="${ACTIVE_SUBMIT}" id="submit-btn" type="submit">\n<span class="material-symbols-outlined text-[20px]">lock</span>\n<span id="submit-btn-text">${SEND_LABEL}</span>`,
      'otp send button',
    ],
  ])
}

function replaceEach(html: string, pairs: Array<[string, string, string]>): string {
  return pairs.reduce((current, [from, to, label]) => {
    if (!current.includes(from)) {
      throw new Error(`${label} is missing`)
    }
    return current.replace(from, to)
  }, html)
}
