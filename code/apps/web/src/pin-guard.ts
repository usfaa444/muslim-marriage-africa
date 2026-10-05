/**
 * Shared-device lock check for signed-in HTML pages.
 * Inject this script before the page script so the page script stays last.
 * A page without localStorage (unit sandboxes) skips the guard.
 */
export function pinGuardScript(): string {
  return `<script>
(function () {
  if (typeof localStorage === 'undefined') {
    return
  }
  var KEY = 'ankanu_pin_hidden_at'
  var locking = false
  var lockWait = Promise.resolve()
  function goPin() {
    var next = window.location.pathname + window.location.search
    window.location.assign('/pin?next=' + encodeURIComponent(next))
  }
  if (typeof window.fetch === 'function' && window.__ankanuPinFetch !== true) {
    var original = window.fetch
    window.__ankanuPinFetch = true
    window.fetch = function () {
      return original.apply(this, arguments).then(function (response) {
        var clone = response.clone()
        clone.json().then(function (body) {
          if (body && body.error && body.error.code === 'PIN_REQUIRED') {
            goPin()
          }
        }, function () {})
        return response
      })
    }
  }
  function finishLock(started) {
    if (localStorage.getItem(KEY) === started) {
      localStorage.removeItem(KEY)
    }
    locking = false
  }
  function lockIfStale() {
    if (locking) {
      return lockWait
    }
    var raw = localStorage.getItem(KEY)
    if (!raw) {
      return lockWait
    }
    var then = Number(raw)
    if (!Number.isFinite(then) || Date.now() - then <= 60000) {
      return lockWait
    }
    locking = true
    var started = raw
    if (typeof window.fetch !== 'function') {
      finishLock(started)
      return lockWait
    }
    lockWait = window.fetch('/v1/pin/lock', { method: 'POST', credentials: 'same-origin' }).then(function () {
      finishLock(started)
    }, function () {
      finishLock(started)
    })
    return lockWait
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      localStorage.setItem(KEY, String(Date.now()))
      return
    }
    if (document.visibilityState === 'visible') {
      lockIfStale()
    }
  })
  window.addEventListener('pageshow', lockIfStale)
  window.addEventListener('load', function () {
    lockIfStale().then(function () {
      if (typeof window.fetch !== 'function') {
        return
      }
      window.fetch('/v1/pin', { credentials: 'same-origin' }).then(function (response) {
        return response.json()
      }).then(function (body) {
        if (body && body.locked === true) {
          goPin()
        }
      }, function () {})
    })
  })
})()
</script>
`
}
