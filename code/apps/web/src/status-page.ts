import { pinGuardScript } from './pin-guard'

const SIMULATOR = /<!-- Interactive UX State Simulator \(For review & canonical testing\) -->[\s\S]*?<!-- Main Editorial Container \(Folio Layout\) -->/

const PROCESSING = /<!-- PROCESSING STATE CONTENT -->[\s\S]*?<!-- PURGE ONLY \/ INACTIVE STATE -->/

const SIM_SCRIPT = /<!-- Vanilla State Simulation Logic -->[\s\S]*?<script>[\s\S]*?<\/script>\s*/

const WALI_PILL =
  /<div class="hidden sm:flex items-center gap-1\.5 px-3 py-1\.5 bg-staff-soft rounded-full text-staff border border-border-hairline">[\s\S]*?Wali notifié : Oumar O\.<\/span>\s*<\/div>\s*/

const WALI_BLOCK = /<div class="bg-surface-sand p-4 rounded-xl border border-border-hairline flex items-start gap-3\.5">[\s\S]*?data-icon="family_restroom"[\s\S]*?<\/div>\s*<\/div>\s*/

const RETRACT =
  /<div class="p-4 rounded-xl border border-border-strong bg-surface-sand\/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">[\s\S]*?Annuler la suppression et réactiver mon compte[\s\S]*?<\/div>\s*/

const STATUS_LINE =
  /<div class="flex items-center gap-1\.5">\s*<span class="w-2 h-2 rounded-full bg-success"><\/span>\s*<span>Statut du ticket : Traité par l'officier de conformité CIL<\/span>\s*<\/div>\s*/

const INCIDENT_COPY =
  /<p class="font-body text-body text-ink-primary">[\s\S]*?24h ouvrées[\s\S]*?<\/p>\s*<div class="font-meta text-meta text-ink-secondary pt-1 flex items-center gap-3">[\s\S]*?#INC-4492[\s\S]*?<\/div>\s*/

const CNIB =
  /<p class="font-meta text-meta text-ink-secondary">\s*Le scellement automatisé a rencontré une incohérence de signature sur les justificatifs CNIB\.[\s\S]*?<\/p>\s*/

const SIZE_LINE =
  /<span class="font-meta text-meta text-ink-secondary">Taille : 4\.8 Mo[\s\S]*?<\/span>\s*/

const PIN_LINE =
  /<div class="flex items-center gap-2 text-ink-secondary font-meta text-meta">[\s\S]*?code PIN sanctuaire[\s\S]*?<\/div>\s*/

function behavior(ticketId: string): string {
  return `
<script>
(function () {
  var ticketId = ${JSON.stringify(ticketId)}
  function byId(id) {
    return document.getElementById(id)
  }
  function hide(id) {
    var node = byId(id)
    if (node) {
      node.classList.add('hidden')
    }
  }
  function show(id) {
    var node = byId(id)
    if (node) {
      node.classList.remove('hidden')
    }
  }
  function text(id, value) {
    var node = byId(id)
    if (node) {
      node.textContent = value
    }
  }
  function missing() {
    window.location.replace('/privacy/status')
  }
  function remaining(iso) {
    var due = Date.parse(iso)
    if (!Number.isFinite(due)) {
      return 'Non demandé'
    }
    var minutes = Math.floor((due - Date.now()) / 60000)
    if (minutes <= 0) {
      return '0 min'
    }
    var days = Math.floor(minutes / 1440)
    var hours = Math.floor((minutes - days * 1440) / 60)
    var mins = minutes - days * 1440 - hours * 60
    if (days > 0) {
      return days + ' j ' + hours + ' h'
    }
    if (hours > 0) {
      return hours + ' h ' + mins + ' min'
    }
    return mins + ' min'
  }
  function ouaga(iso) {
    var date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Ouagadougou',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).format(date)
  }
  function paint(body, ticket) {
    var url = window.location.origin + ticket.status_url
    text('ticket-ref', 'Ticket n° ' + ticket.id)
    text('status-url-text', url)
    text('export-filename', 'ankanu-export-' + ticket.id + '.json')
    var copy = byId('copy-status-url')
    if (copy) {
      copy.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url)
        }
      })
    }
    hide('content-ready')
    hide('content-purging')
    hide('content-incident')
    hide('incident-banner')
    var download = byId('export-download')
    if (download) {
      download.classList.add('hidden')
    }
    if (ticket.status === 'stalled') {
      show('content-incident')
      show('incident-banner')
      text('global-badge-text', 'File opérateur assermentée active')
    } else if (ticket.kind === 'erase') {
      show('content-purging')
      if (ticket.status === 'scheduled') {
        text('global-badge-text', 'Effacement programmé sous 30 jours')
      }
    } else {
      show('content-ready')
      if (ticket.status === 'ready') {
        text('global-badge-text', 'Archive scellée & prête')
        if (download) {
          download.classList.remove('hidden')
          download.addEventListener('click', function () {
            fetch('/v1/me/export', { credentials: 'same-origin' }).then(function (response) {
              if (!response.ok) {
                return
              }
              return response.blob().then(function (blob) {
                var link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = 'ankanu-export-' + ticket.id + '.json'
                link.click()
              })
            })
          })
        }
      }
    }
    if (body.account_status === 'pending_deletion') {
      show('clock-closure')
    } else {
      hide('clock-closure')
    }
    var erase = null
    var readyExport = null
    var tickets = body.tickets || []
    for (var index = 0; index < tickets.length; index += 1) {
      var item = tickets[index]
      if (item.kind === 'erase' && !erase) {
        erase = item
      }
      if (item.kind === 'export' && item.status === 'ready' && !readyExport) {
        readyExport = item
      }
    }
    text('clock-erase-left', erase ? remaining(erase.due_at) : 'Non demandé')
    text('clock-erase-when', erase ? ouaga(erase.due_at) : '')
    text('clock-export-state', readyExport ? 'Exécuté' : 'Non demandé')
    text('clock-export-when', readyExport ? ouaga(readyExport.due_at) : '')
  }
  fetch('/v1/me/export-status', { credentials: 'same-origin' }).then(function (response) {
    if (response.status !== 200) {
      missing()
      return null
    }
    return response.json()
  }).then(function (body) {
    if (!body || !Array.isArray(body.tickets)) {
      return
    }
    var ticket = null
    for (var index = 0; index < body.tickets.length; index += 1) {
      if (body.tickets[index].id === ticketId) {
        ticket = body.tickets[index]
      }
    }
    if (!ticket) {
      missing()
      return
    }
    paint(body, ticket)
  })
})()
</script>
`
}

const CLOCK_ROWS = `<!-- Metric 2 -->
<div class="p-4 rounded-xl bg-surface-sand border border-border-hairline space-y-2" id="clock-erase">
<div class="flex items-center justify-between">
<span class="font-caption text-caption text-ink-secondary">[ASSUMPTION] Effacement du compte</span>
<span class="px-2 py-0.5 rounded text-xs font-meta bg-gold-soft text-ink-primary font-semibold">30 jours</span>
</div>
<p class="font-heading text-heading text-ink-primary" id="clock-erase-left">Non demandé</p>
<p class="font-meta text-meta text-ink-secondary" id="clock-erase-when"></p>
</div>
<!-- Metric 3 -->
<div class="p-4 rounded-xl bg-surface-sand border border-border-hairline space-y-2" id="clock-export">
<div class="flex items-center justify-between">
<span class="font-caption text-caption text-ink-secondary">[ASSUMPTION] Export des données</span>
<span class="px-2 py-0.5 rounded text-xs font-meta bg-gold-soft text-ink-primary font-semibold">72 heures</span>
</div>
<p class="font-heading text-heading text-ink-primary" id="clock-export-state">Non demandé</p>
<p class="font-meta text-meta text-ink-secondary" id="clock-export-when"></p>
</div>
`

/** Delete and export status screen for one ticket. The Stitch file stays unchanged. */
export function statusPageHtml(stitchHtml: string, ticketId: string): string {
  let html = stitchHtml.replace(SIMULATOR, '<!-- Main Editorial Container (Folio Layout) -->')
  html = html.replace(PROCESSING, '<!-- PURGE ONLY / INACTIVE STATE -->')
  html = html.replace(SIM_SCRIPT, '')
  html = html.replace(WALI_PILL, '')
  html = html.replace(WALI_BLOCK, '')
  html = html.replace(RETRACT, '')
  html = html.replace(STATUS_LINE, '')
  html = html.replace(INCIDENT_COPY, '')
  html = html.replace(CNIB, '')
  html = html.replace(SIZE_LINE, '')
  html = html.replace(PIN_LINE, '')
  html = html.replace(' (accès réservé au titulaire &amp; wali)', ' (accès réservé au titulaire)')
  html = html.replace(' Hébergement souverain chiffré Scaleway Paris / Ouagadougou.', '')
  html = html.replace(
    '<span class="font-heading text-heading text-primary font-semibold tracking-wide">Ticket n° CIL-BF-2025-0894</span>',
    '<span class="font-heading text-heading text-primary font-semibold tracking-wide" id="ticket-ref">Ticket n°</span>',
  )
  html = html.replace(
    '<span class="font-meta text-meta text-ink-primary font-mono select-all">https://ankanu.com/privacy/status/req-894-bf</span>',
    '<span class="font-meta text-meta text-ink-primary font-mono select-all" id="status-url-text"></span>',
  )
  html = html.replace(
    'onclick="navigator.clipboard.writeText(\'https://ankanu.com/privacy/status/req-894-bf\'); alert(\'Lien souverain copié dans le presse-papiers.\');"',
    'id="copy-status-url"',
  )
  html = html.replace(
    '<span class="font-body-strong text-body-strong text-ink-primary block">ankanu_export_folio_20250894.zip</span>',
    '<span class="font-body-strong text-body-strong text-ink-primary block" id="export-filename"></span>',
  )
  html = html.replace(
    '<button class="w-full sm:w-auto px-7 py-3 min-h-[48px] bg-indigo hover:bg-primary text-ink-on-indigo rounded-full font-body-strong text-body-strong inline-flex items-center justify-center gap-2.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2" type="button">',
    '<button class="w-full sm:w-auto px-7 py-3 min-h-[48px] bg-indigo hover:bg-primary text-ink-on-indigo rounded-full font-body-strong text-body-strong inline-flex items-center justify-center gap-2.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2" id="export-download" type="button">',
  )
  html = html.replace('<div class="space-y-4" id="content-ready">', '<div class="hidden space-y-4" id="content-ready">')
  html = html.replace(
    '<!-- Metric 1 -->\n<div class="p-4 rounded-xl bg-surface-sand border border-border-hairline space-y-2">',
    '<!-- Metric 1 -->\n<div class="hidden p-4 rounded-xl bg-surface-sand border border-border-hairline space-y-2" id="clock-closure">',
  )
  const clocks = html.indexOf('<!-- Metric 2 -->')
  const clocksSection = clocks < 0 ? -1 : html.indexOf('</section>', clocks)
  const clocksClose = clocksSection < 0 ? -1 : html.lastIndexOf('</div>', clocksSection)
  if (clocks < 0 || clocksClose < 0) {
    throw new Error('status page could not find clock rows 2 to 4')
  }
  html = `${html.slice(0, clocks)}${CLOCK_ROWS}${html.slice(clocksClose)}`
  const forbidden = html.match(
    /Scaleway|Oumar|Île-de-France|fr-par|hébergée souverainement|btn-state-|content-processing|SLA 48h|168 heures|31h 14m|moins de 4 minutes|24h ouvrées|Simulateur d'états|#INC-4492|ankanu\.com/,
  )
  if (forbidden) {
    throw new Error(`status page still prints ${forbidden[0]}`)
  }
  const close = html.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('status stitch is missing </body>')
  }
  return `${html.slice(0, close)}${pinGuardScript()}${behavior(ticketId)}${html.slice(close)}`
}
