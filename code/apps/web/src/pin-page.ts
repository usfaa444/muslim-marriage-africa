const FILLED_WELL =
  'w-4 h-4 rounded-full border-2 border-indigo bg-indigo transition-all duration-200'
const EMPTY_WELL =
  'w-4 h-4 rounded-full border-2 border-border-hairline bg-surface-sand transition-all duration-200'
const HOSTING_LINE =
  /\s*<span class="font-caption text-\[11px\] text-ink-secondary\/80 mt-1">\s*Hébergement souverain chiffré Scaleway[\s\S]*?<\/span>/

const BEHAVIOR = `
<script>
(function () {
  var next = '/'
  try {
    var raw = new URLSearchParams(window.location.search).get('next') || ''
    if (raw.charAt(0) === '/' && raw.charAt(1) !== '/' && raw.indexOf('\\\\') === -1) {
      var parsed = new URL(raw, window.location.origin)
      if (parsed.origin === window.location.origin) {
        next = raw
      }
    }
  } catch (error) {
    next = '/'
  }
  var digits = ''
  var busy = false
  function paint() {
    for (var i = 1; i <= 4; i += 1) {
      var dot = document.getElementById('dot-' + i)
      if (!dot) {
        continue
      }
      dot.className = i <= digits.length
        ? '${FILLED_WELL}'
        : '${EMPTY_WELL}'
    }
  }
  function showWarning() {
    var warning = document.getElementById('attempt-warning')
    if (warning) {
      warning.classList.remove('hidden')
    }
  }
  function showLockout() {
    var warning = document.getElementById('attempt-warning')
    var banner = document.getElementById('lockout-banner')
    var keypad = document.getElementById('keypad-container')
    if (warning) {
      warning.classList.add('hidden')
    }
    if (banner) {
      banner.classList.remove('hidden')
    }
    if (keypad) {
      keypad.classList.add('opacity-40', 'pointer-events-none')
    }
  }
  function clearDigits() {
    digits = ''
    paint()
    busy = false
  }
  function unlock() {
    busy = true
    fetch('/v1/pin/unlock', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: digits }),
    }).then(function (response) {
      return response.json().then(function (body) {
        var code = body && body.error && body.error.code
        if (response.ok && body && body.locked === false) {
          window.location.assign(next)
          return
        }
        clearDigits()
        if (code === 'PIN_LOCKED' || code === 'UNAUTHENTICATED') {
          showLockout()
          return
        }
        if (code === 'PIN_INVALID') {
          showWarning()
        }
      })
    }, clearDigits)
  }
  function endSession() {
    fetch('/v1/sessions/current', { method: 'DELETE', credentials: 'same-origin' }).then(function () {
      window.location.assign('/auth')
    }, function () {
      window.location.assign('/auth')
    })
  }
  function label(element) {
    return (element.textContent || '').replace(/\\s+/g, ' ').trim()
  }
  window.enterDigit = function (digit) {
    if (busy || digits.length >= 4 || !/^[0-9]$/.test(digit)) {
      return
    }
    digits += digit
    paint()
    if (digits.length === 4) {
      unlock()
    }
  }
  window.backspace = function () {
    if (busy || digits.length === 0) {
      return
    }
    digits = digits.slice(0, -1)
    paint()
  }
  window.triggerBiometrics = function () {}
  var buttons = document.querySelectorAll('button')
  for (var index = 0; index < buttons.length; index += 1) {
    var button = buttons[index]
    var text = label(button)
    if (text.indexOf('Mot de passe maître') !== -1) {
      button.addEventListener('click', function (event) {
        event.preventDefault()
        window.location.assign('/auth')
      })
    }
    if (text.indexOf('Se déconnecter du sanctuaire') !== -1) {
      button.addEventListener('click', function (event) {
        event.preventDefault()
        endSession()
      })
    }
  }
  var links = document.querySelectorAll('a')
  for (var linkIndex = 0; linkIndex < links.length; linkIndex += 1) {
    var link = links[linkIndex]
    if (label(link).indexOf('Code PIN oublié') !== -1) {
      link.addEventListener('click', function (event) {
        event.preventDefault()
        endSession()
      })
    }
  }
  fetch('/v1/pin', { credentials: 'same-origin' }).then(function (response) {
    return response.json().then(function (body) {
      if (response.ok && body && body.locked === false) {
        window.location.assign(next)
      }
    })
  }, function () {})
})()
</script>
`

/** Serves the lock screen. The demo toolbar, prefilled wells, hosting line, and demo script stay off the response. */
export function pinPageHtml(stitchHtml: string): string {
  const toolbar = stitchHtml.indexOf('<!-- Interactive Simulator Toolbar')
  const sanctuary = stitchHtml.indexOf('<!-- CENTRAL SANCTUARY CARD')
  if (toolbar < 0 || sanctuary < 0 || sanctuary <= toolbar) {
    throw new Error('pin stitch is missing the simulator markers')
  }
  let html = stitchHtml.slice(0, toolbar) + stitchHtml.slice(sanctuary)
  if (!html.includes(FILLED_WELL)) {
    throw new Error('pin stitch wells were not prefilled')
  }
  html = html.replaceAll(FILLED_WELL, EMPTY_WELL)
  if (!HOSTING_LINE.test(html)) {
    throw new Error('pin stitch hosting line was not removed')
  }
  html = html.replace(HOSTING_LINE, '')
  const script = html.indexOf('<!-- SCRIPT: REALISTIC PIN')
  const scriptEnd = script < 0 ? -1 : html.indexOf('</script>', script)
  if (script < 0 || scriptEnd < 0) {
    throw new Error('pin stitch demo script was not removed')
  }
  html = html.slice(0, script) + html.slice(scriptEnd + '</script>'.length)
  const close = html.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('pin stitch is missing </body>')
  }
  return `${html.slice(0, close)}${BEHAVIOR}${html.slice(close)}`
}
