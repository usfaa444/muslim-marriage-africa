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
  presenceTitle: 'Statut en ligne et dernière connexion',
  presenceExplain:
    'Désactivé, vos interlocuteurs ne voient pas quand vous êtes en ligne ni quand vous l’étiez pour la dernière fois, et vous ne voyez pas non plus les leurs.',
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

type SwitchSection = { key: string; icon: string; title: string; explain: string; toggleId: string; prefix: string }

function switchSection(spec: SwitchSection): string {
  const { key, icon, title, explain, toggleId, prefix } = spec
  return `<section data-${key}-settings class="bg-cream border border-hairline rounded-2xl p-6 md:p-7 shadow-none" style="background-color: rgb(251, 248, 241);"> <div class="flex items-start justify-between gap-6"> <div class="space-y-1.5 flex-1 min-w-0"> <div class="flex items-center gap-2"> <span class="material-symbols-outlined text-[#7D5F27] text-lg" data-icon="${icon}" aria-hidden="true">${icon}</span> <h2 id="${prefix}-title" class="text-base font-semibold text-deep-navy">${title}</h2> </div> <p id="${prefix}-explain" class="text-xs md:text-sm text-deep-navy/80 leading-relaxed">${explain}</p> <p id="${prefix}-error" role="alert" hidden class="text-xs md:text-sm text-[#9B2C2C]">${RECEIPTS_COPY.failed}</p> </div> <div class="pt-0.5"> <button id="${toggleId}" type="button" role="switch" aria-checked="true" aria-labelledby="${prefix}-title" aria-describedby="${prefix}-explain" disabled class="ank-switch"><span class="ank-switch-thumb"></span></button> </div> </div> </section> `
}

export function receiptsSettingsSection(): string {
  return `<!-- CONFIRMATIONS DE LECTURE (story chat-polish) --> ${switchSection({ key: 'receipts', icon: 'mark_chat_read', title: RECEIPTS_COPY.title, explain: RECEIPTS_COPY.explain, toggleId: 'read-receipts-toggle', prefix: 'receipts' })}`
}

/** Story chat-polish-2 (Faycal): « Statut en ligne et dernière connexion », reciprocal like WhatsApp, on by default. */
export function presenceSettingsSection(): string {
  return `<!-- STATUT EN LIGNE (story chat-polish-2) --> ${switchSection({ key: 'presence', icon: 'radio_button_checked', title: RECEIPTS_COPY.presenceTitle, explain: RECEIPTS_COPY.presenceExplain, toggleId: 'presence-toggle', prefix: 'presence' })}`
}

export function privacySettingsSection(): string {
  return `<!-- CONFIDENTIALITÉ (the link the app footer carried, story chat-polish) --> <section data-privacy-settings class="bg-cream border border-hairline rounded-2xl p-6 md:p-7 shadow-none" style="background-color: rgb(251, 248, 241);"> <a class="group flex items-center justify-between gap-4 min-h-[44px] ank-setting-link" href="${FOOTER_PRIVACY_HREF}"> <div class="space-y-1"> <div class="flex items-center gap-2"> <span class="material-symbols-outlined text-[#7D5F27] text-lg" data-icon="policy" aria-hidden="true">policy</span> <h2 class="text-base font-semibold text-deep-navy group-hover:text-[#7D5F27] transition-colors">${RECEIPTS_COPY.privacyTitle}</h2> </div> <p class="text-xs md:text-sm text-deep-navy/80 leading-relaxed">${RECEIPTS_COPY.privacyExplain}</p> </div> <div class="flex items-center text-xs md:text-sm font-semibold text-[#7D5F27] whitespace-nowrap"> <span>${RECEIPTS_COPY.privacyAction}</span> <span class="material-symbols-outlined text-base ml-1" data-icon="arrow_forward" aria-hidden="true">arrow_forward</span> </div> </a> </section> `
}

export function receiptsSettingsStyle(): string {
  return SWITCH_STYLE
}

/** Reads the switch from the server, saves a change, and goes back to the stored value when a save fails. */
export function receiptsSettingsScript(): string {
  // The leading semicolon: this script is appended to the page's own, which may end without one. One read paints both
  // switches; each switch saves only its own field of `/v1/chat/settings`, so one never overwrites the other.
  return `
    ;(function () {
      var switches = []
      function wire(toggleId, errorId, field) {
        var toggle = document.getElementById(toggleId)
        var error = document.getElementById(errorId)
        if (!toggle) return
        var entry = { toggle: toggle, field: field, saving: false, version: 0 }
        switches.push(entry)
        function paint(on) { toggle.setAttribute('aria-checked', on ? 'true' : 'false') }
        entry.paint = paint
        // A click saves what the member asks for, the opposite of what the switch shows, never a flip of the server's
        // value: a window left open on an old value cannot save the reverse of what it shows (Mac QA round 2).
        toggle.addEventListener('click', function () {
          if (entry.saving || toggle.disabled) return
          var before = toggle.getAttribute('aria-checked') === 'true'
          var want = !before
          var change = {}
          change[field] = want
          entry.version += 1
          entry.saving = true
          toggle.setAttribute('aria-busy', 'true')
          error.hidden = true
          paint(want)
          fetch('${RECEIPTS_SETTINGS_PATH}', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(change)
          })
            .then(function (response) { return response.ok ? response.json() : null })
            .then(function (body) {
              settled()
              if (body && typeof body[field] === 'boolean') { paint(body[field]); return }
              paint(before)
              error.hidden = false
            })
            .catch(function () { settled(); paint(before); error.hidden = false })
        })
        function settled() { entry.saving = false; toggle.removeAttribute('aria-busy') }
      }
      function load() {
        var asked = switches.map(function (entry) { entry.version += 1; return entry.version })
        if (switches.every(function (entry) { return entry.saving })) return
        fetch('${RECEIPTS_SETTINGS_PATH}', { credentials: 'same-origin' })
          .then(function (response) { return response.ok ? response.json() : null })
          .then(function (body) {
            if (!body) return
            switches.forEach(function (entry, index) {
              // A read that a click overtook says nothing about the value now.
              if (entry.saving || asked[index] !== entry.version || typeof body[entry.field] !== 'boolean') return
              entry.paint(body[entry.field])
              entry.toggle.disabled = false
            })
          })
          .catch(function () {})
      }
      wire('read-receipts-toggle', 'receipts-error', 'read_receipts')
      wire('presence-toggle', 'presence-error', 'presence')
      if (!switches.length) return
      // Another window, or another device, changed it: follow live, and again whenever this window comes back.
      document.addEventListener('${RECEIPTS_DOM_EVENT}', load)
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') load() })
      window.addEventListener('focus', load)
      window.addEventListener('pageshow', function (event) { if (event.persisted) load() })
      load()
    })()
  `
}
