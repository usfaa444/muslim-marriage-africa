import { dropUntil, replaceUntil } from './design-artifact'
import { pinGuardScript } from './pin-guard'

const SPECIMEN = 'tahir.sawadogo@courrier.bf'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const BEHAVIOR = `
<script>
  function applyAccountEmail(email) {
    if (!email) {
      return
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      if (node.nodeValue && node.nodeValue.indexOf(${JSON.stringify(SPECIMEN)}) !== -1) {
        node.nodeValue = node.nodeValue.split(${JSON.stringify(SPECIMEN)}).join(email)
      }
      node = walker.nextNode()
    }
  }
  function readAccountEmail(response) {
    const raw = response.headers.get('x-account-email')
    if (!raw) {
      return
    }
    let email = raw
    try {
      email = decodeURIComponent(raw)
    } catch (error) {
      email = raw
    }
    applyAccountEmail(email)
  }
  function setResendBusy(busy) {
    const button = document.getElementById('resend-action-btn')
    const label = document.getElementById('resend-label')
    const icon = document.getElementById('resend-icon')
    const expired = document.querySelector('#state-expired button')
    if (button) {
      button.disabled = busy
    }
    if (expired) {
      expired.disabled = busy
    }
    if (label) {
      label.textContent = busy ? 'Envoi en cours...' : "Renvoyer un nouveau lien d'activation"
    }
    if (icon) {
      icon.textContent = busy ? 'hourglass_top' : 'send'
    }
  }
  async function issueLink() {
    setResendBusy(true)
    try {
      const response = await fetch('/v1/accounts/email-verifications', {
        method: 'POST',
        credentials: 'same-origin'
      })
      readAccountEmail(response)
      if (response.status === 201 && typeof setState === 'function') {
        setState('waiting')
      }
      if (response.status === 200 && typeof setState === 'function') {
        setState('success')
      }
    } catch (error) {
      return
    } finally {
      setResendBusy(false)
    }
  }
  async function consumeToken(token) {
    setResendBusy(true)
    try {
      const response = await fetch('/v1/accounts/email-verifications/consume', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token })
      })
      readAccountEmail(response)
      if (typeof setState !== 'function') {
        return
      }
      if (response.status === 200) {
        history.replaceState(null, '', location.pathname)
        setState('success')
        return
      }
      setState('expired')
    } catch (error) {
      return
    } finally {
      setResendBusy(false)
    }
  }
  window.triggerResend = function () {
    void issueLink()
  }
  document.querySelectorAll('a').forEach(function (link) {
    if (link.textContent && link.textContent.indexOf("Modifier l'adresse") !== -1) {
      link.addEventListener('click', function (event) {
        event.preventDefault()
      })
    }
  })
  const token = new URLSearchParams(window.location.search).get('token')
  if (token) {
    void consumeToken(token)
  }
</script>
`

const PANEL_STATE = `function setState(stateName) {
      ['waiting', 'expired', 'success'].forEach(function (name) {
        const el = document.getElementById('state-' + name);
        if (!el) {
          return;
        }
        if (name === stateName) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      });
    }

    `

/** Serves the downloaded email screen. Pass account.email to replace the specimen before first paint. */
export function emailVerificationPageHtml(stitchHtml: string, email: string | null): string {
  const withoutTabs = dropUntil(
    stitchHtml,
    '<!-- Simulation State Selector (Interactive test bench for review of states) -->',
    '<!-- Dynamic State Containers -->',
    'email state switcher',
  )
  const withoutDemoState = replaceUntil(
    withoutTabs,
    'function setState(stateName)',
    'function triggerResend',
    PANEL_STATE,
    'email state function',
  )
  const stripped = replaceUntil(
    withoutDemoState,
    'function triggerResend',
    '</script>',
    'function triggerResend() {}\n\n  ',
    'email demo resend',
  )
  if (stripped.includes('btn-tab-') || stripped.includes('Simuler')) {
    throw new Error('email stitch state switcher was not removed')
  }
  const replaced = email === null ? stripped : stripped.split(SPECIMEN).join(escapeHtml(email))
  const close = replaced.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('email verification stitch is missing </body>')
  }
  return `${replaced.slice(0, close)}${pinGuardScript()}${BEHAVIOR}${replaced.slice(close)}`
}
