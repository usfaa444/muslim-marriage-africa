import { FOOTER_PRIVACY_HREF, RECEIPTS_DOM_EVENT } from './app-shell'

/**
 * Story chat-polish (Faycal, option B): the « Confirmations de lecture » switch in Paramètres, on by default. Off, the
 * other member never sees « Lu » for my reads and I see no « Lu » on my messages (WhatsApp rule); the server enforces it
 * (`/v1/chat/settings`). Also the « Confidentialité » link that left the footer with the app screens' chrome.
 */
export const RECEIPTS_COPY = {
  title: 'Confirmations de lecture',
  explain:
    'Désactivées, vos interlocuteurs ne voient pas quand vous avez lu leurs messages, et vous ne voyez pas non plus quand ils lisent les vôtres.',
  failed: 'Réglage non enregistré. Réessayez.',
  privacyTitle: 'Confidentialité',
  privacyExplain: 'Politique de confidentialité et mentions légales d’AnKanu.',
  privacyAction: 'Lire',
} as const

export const RECEIPTS_SETTINGS_PATH = '/v1/chat/settings'

const SWITCH_STYLE = `<style id="receipts-switch-style">
.ank-switch { position: relative; display: inline-flex; flex: none; width: 46px; height: 26px; padding: 0; border-radius: 9999px; border: 2px solid rgba(11, 29, 54, 0.62); background: #FFFFFF; cursor: pointer; transition: background-color 0.2s; }
.ank-switch::before { content: ""; position: absolute; left: 50%; top: 50%; width: 48px; height: 48px; transform: translate(-50%, -50%); }
.ank-switch-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 9999px; background: rgba(11, 29, 54, 0.62); transition: transform 0.2s; pointer-events: none; }
.ank-switch[aria-checked="true"] { background: #0B1D36; border-color: #0B1D36; }
.ank-switch[aria-checked="true"] .ank-switch-thumb { transform: translateX(20px); background: #F7F1E3; }
.ank-switch:focus-visible { outline: 2px solid #7D5F27; outline-offset: 3px; }
.ank-switch[disabled] { cursor: progress; opacity: 0.7; }
.ank-switch[aria-busy="true"] { cursor: progress; }
.ank-setting-link { display: inline-flex; align-items: center; min-height: 44px; min-width: 44px; }
</style>`

export function receiptsSettingsSection(): string {
  return `<!-- CONFIRMATIONS DE LECTURE (story chat-polish) --> <section data-receipts-settings class="bg-cream border border-hairline rounded-2xl p-6 md:p-7 shadow-none" style="background-color: rgb(251, 248, 241);"> <div class="flex items-start justify-between gap-6"> <div class="space-y-1.5 flex-1 min-w-0"> <div class="flex items-center gap-2"> <span class="material-symbols-outlined text-[#7D5F27] text-lg" data-icon="mark_chat_read" aria-hidden="true">mark_chat_read</span> <h2 id="receipts-title" class="text-base font-semibold text-deep-navy">${RECEIPTS_COPY.title}</h2> </div> <p id="receipts-explain" class="text-xs md:text-sm text-deep-navy/80 leading-relaxed">${RECEIPTS_COPY.explain}</p> <p id="receipts-error" role="alert" hidden class="text-xs md:text-sm text-[#9B2C2C]">${RECEIPTS_COPY.failed}</p> </div> <div class="pt-0.5"> <button id="read-receipts-toggle" type="button" role="switch" aria-checked="true" aria-labelledby="receipts-title" aria-describedby="receipts-explain" disabled class="ank-switch"><span class="ank-switch-thumb"></span></button> </div> </div> </section> `
}

export function privacySettingsSection(): string {
  return `<!-- CONFIDENTIALITÉ (the link the app footer carried, story chat-polish) --> <section data-privacy-settings class="bg-cream border border-hairline rounded-2xl p-6 md:p-7 shadow-none" style="background-color: rgb(251, 248, 241);"> <a class="group flex items-center justify-between gap-4 min-h-[44px] ank-setting-link" href="${FOOTER_PRIVACY_HREF}"> <div class="space-y-1"> <div class="flex items-center gap-2"> <span class="material-symbols-outlined text-[#7D5F27] text-lg" data-icon="policy" aria-hidden="true">policy</span> <h2 class="text-base font-semibold text-deep-navy group-hover:text-[#7D5F27] transition-colors">${RECEIPTS_COPY.privacyTitle}</h2> </div> <p class="text-xs md:text-sm text-deep-navy/80 leading-relaxed">${RECEIPTS_COPY.privacyExplain}</p> </div> <div class="flex items-center text-xs md:text-sm font-semibold text-[#7D5F27] whitespace-nowrap"> <span>${RECEIPTS_COPY.privacyAction}</span> <span class="material-symbols-outlined text-base ml-1" data-icon="arrow_forward" aria-hidden="true">arrow_forward</span> </div> </a> </section> `
}

export function receiptsSettingsStyle(): string {
  return SWITCH_STYLE
}

/** Reads the switch from the server, saves a change, and goes back to the stored value when a save fails. */
export function receiptsSettingsScript(): string {
  // The leading semicolon: this script is appended to the page's own, which may end without one.
  return `
    ;(function () {
      var toggle = document.getElementById('read-receipts-toggle')
      var error = document.getElementById('receipts-error')
      if (!toggle) return
      var saving = false
      var version = 0
      function paint(on) { toggle.setAttribute('aria-checked', on ? 'true' : 'false') }
      function load() {
        if (saving) return
        var asked = ++version
        fetch('${RECEIPTS_SETTINGS_PATH}', { credentials: 'same-origin' })
          .then(function (response) { return response.ok ? response.json() : null })
          .then(function (body) {
            // A read that a click overtook says nothing about the value now.
            if (saving || asked !== version || !body || typeof body.read_receipts !== 'boolean') return
            paint(body.read_receipts)
            toggle.disabled = false
          })
          .catch(function () {})
      }
      // A click saves what the member asks for, the opposite of what the switch shows, never a flip of the server's
      // value: a window left open on an old value cannot save the reverse of what it shows (Mac QA round 2).
      toggle.addEventListener('click', function () {
        if (saving || toggle.disabled) return
        var before = toggle.getAttribute('aria-checked') === 'true'
        var want = !before
        version += 1
        saving = true
        toggle.setAttribute('aria-busy', 'true')
        error.hidden = true
        paint(want)
        fetch('${RECEIPTS_SETTINGS_PATH}', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ read_receipts: want })
        })
          .then(function (response) { return response.ok ? response.json() : null })
          .then(function (body) {
            settled()
            if (body && typeof body.read_receipts === 'boolean') { paint(body.read_receipts); return }
            paint(before)
            error.hidden = false
          })
          .catch(function () { settled(); paint(before); error.hidden = false })
      })
      function settled() { saving = false; toggle.removeAttribute('aria-busy') }
      // Another window, or another device, changed it: follow live, and again whenever this window comes back.
      document.addEventListener('${RECEIPTS_DOM_EVENT}', load)
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') load() })
      window.addEventListener('focus', load)
      window.addEventListener('pageshow', function (event) { if (event.persisted) load() })
      load()
    })()
  `
}
