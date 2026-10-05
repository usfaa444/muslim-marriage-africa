import { pinGuardScript } from './pin-guard'

const WALI_CHIP =
  /<div class="flex items-center gap-1\.5 px-3 py-1\.5 rounded-full bg-surface-sand border border-border-hairline text-ink-secondary">\s*<span class="material-symbols-outlined text-primary text-base" data-icon="verified_user">verified_user<\/span>\s*<span class="font-meta text-meta font-medium tracking-tight">Wali notifié : Oumar O\.<\/span>\s*<\/div>\s*/

const EXPORT_BLURB =
  /<span class="font-meta text-meta text-ink-secondary">Génère une archive scellée contenant vos échanges, attestations et notes de bienséance\.<\/span>\s*/

const RADIATION =
  /<p class="font-meta text-meta text-ink-secondary mt-1">\s*La radiation de votre dossier[\s\S]*?<\/p>\s*/

const HOSTING_PARAGRAPH =
  /<p class="font-meta text-meta text-ink-on-indigo\/80 leading-relaxed">[\s\S]*?Scaleway \(Paris \/ Île-de-France\)[\s\S]*?<\/p>\s*/

const MODAL_ITEM =
  /<li class="flex items-start gap-2">\s*<span class="material-symbols-outlined text-base text-primary mt-0\.5" data-icon="check">check<\/span>\s*<span>[\s\S]*?<\/span>\s*<\/li>\s*/

const CONFIRM_ONCLICK =
  / onclick="alert\('Demande de scellage enregistrée\. Ticket CIL #BF-2025-0891 généré\. Le Wali Oumar O\. a été notifié\.'\); document\.getElementById\('modal-deletion'\)\.classList\.add\('hidden'\)"/

const BEHAVIOR = `
<script>
(function () {
  function buttons() {
    return document.querySelectorAll('button')
  }
  function labeled(text) {
    var nodes = buttons()
    for (var index = 0; index < nodes.length; index += 1) {
      if (nodes[index].textContent && nodes[index].textContent.indexOf(text) !== -1) {
        return nodes[index]
      }
    }
    return null
  }
  function go(ticket) {
    if (!ticket || typeof ticket.status_url !== 'string') {
      return
    }
    window.location.assign(window.location.origin + ticket.status_url)
  }
  var exporter = labeled('Exporter mon dossier civil')
  if (exporter) {
    exporter.addEventListener('click', function () {
      fetch('/v1/me/export', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      }).then(function (response) {
        if (response.status !== 200) {
          return null
        }
        return response.json()
      }).then(function (body) {
        if (body) {
          go(body.ticket)
        }
      })
    })
  }
  var confirm = labeled('Confirmer le scellage définitif')
  if (confirm) {
    confirm.addEventListener('click', function () {
      fetch('/v1/me/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      }).then(function (response) {
        if (response.status !== 200) {
          return null
        }
        return response.json()
      }).then(function (body) {
        if (!body) {
          return
        }
        var modal = document.getElementById('modal-deletion')
        if (modal) {
          modal.classList.add('hidden')
        }
        go(body.ticket)
      })
    })
  }
})()
</script>
`

/** Settings screen. Drops sentences the product does not do. The Stitch file stays unchanged. */
export function settingsPageHtml(stitchHtml: string): string {
  let html = stitchHtml.replace(WALI_CHIP, '')
  html = html.replace(EXPORT_BLURB, '')
  html = html.replace(RADIATION, '')
  html = html.replace(HOSTING_PARAGRAPH, '')
  html = html.replace(' Hébergement souverain chiffré Scaleway Paris / Ouagadougou.', '')
  html = html.replace(' vérifiable publiquement', '')
  html = html.replace(CONFIRM_ONCLICK, '')
  for (let pass = 0; pass < 3; pass += 1) {
    html = html.replace(MODAL_ITEM, '')
  }
  const forbidden = html.match(/Scaleway|Oumar|Île-de-France|fr-par|hébergée souverainement|48 heures|sous 48h/)
  if (forbidden) {
    throw new Error(`settings page still prints ${forbidden[0]}`)
  }
  if (!html.includes('Émission d’un ticket CIL de clôture.')) {
    throw new Error('settings page lost the CIL ticket bullet')
  }
  const close = html.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('settings stitch is missing </body>')
  }
  return `${html.slice(0, close)}${pinGuardScript()}${BEHAVIOR}${html.slice(close)}`
}
