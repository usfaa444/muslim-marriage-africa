const SPECIMEN = 'CNIB_Sawadogo_Recto.jpg'
const LOADING_LINE =
  /<p class="font-body-sm text-body-sm text-on-surface-variant">Serveur certifié Scaleway[^<]*<\/p>\s*/
const SERVER_LINE =
  /<div class="shrink-0 flex items-center gap-2 text-on-surface-variant font-label-sm">[\s\S]*?Hébergement Scaleway CIL Certifié\s*<\/div>\s*/
const FOOTER_CLAUSE = 'Hébergement souverain certifié chiffré Scaleway Paris/Ouagadougou. '

const BEHAVIOR = `
<script>
  const SPECIMEN = ${JSON.stringify(SPECIMEN)}
  let idImage = ''
  let liveImage = ''
  function fileInput() {
    return document.querySelector('input[type="file"]')
  }
  function readFile(file) {
    return new Promise(function (resolve) {
      const reader = new FileReader()
      reader.onload = function () {
        const text = String(reader.result || '')
        const comma = text.indexOf(',')
        resolve(comma >= 0 ? text.slice(comma + 1) : '')
      }
      reader.onerror = function () { resolve('') }
      reader.readAsDataURL(file)
    })
  }
  function statusOf(body) {
    if (!body || typeof body.status !== 'string') {
      return 'none'
    }
    return body.status
  }
  function applyStatuses(idStatus, liveStatus) {
    if (idStatus === 'held' || liveStatus === 'held') {
      setScreenState('minorhold')
      return
    }
    if (idStatus === 'rejected' || liveStatus === 'rejected') {
      setScreenState('mismatch')
      return
    }
    if (idStatus === 'pending' && liveStatus === 'pending') {
      setScreenState('success')
      return
    }
    setScreenState('ready')
  }
  async function refresh() {
    let idBody = null
    let liveBody = null
    try {
      const idResponse = await fetch('/v1/verifications/id', { credentials: 'same-origin' })
      const liveResponse = await fetch('/v1/verifications/liveness', { credentials: 'same-origin' })
      if (idResponse.status === 200) {
        idBody = await idResponse.json()
      }
      if (liveResponse.status === 200) {
        liveBody = await liveResponse.json()
      }
    } catch (error) {
      setScreenState('ready')
      return
    }
    applyStatuses(statusOf(idBody), statusOf(liveBody))
  }
  async function postImage(path, image) {
    return fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: image })
    })
  }
  const documentInput = fileInput()
  if (documentInput) {
    documentInput.addEventListener('change', async function () {
      const file = documentInput.files && documentInput.files[0]
      if (!file) {
        return
      }
      idImage = await readFile(file)
      const nodes = document.querySelectorAll('p')
      for (let index = 0; index < nodes.length; index += 1) {
        if (nodes[index].textContent && nodes[index].textContent.indexOf(SPECIMEN) !== -1) {
          nodes[index].textContent = file.name
          break
        }
      }
    })
  }
  const face = document.querySelector('[data-icon="face"]')
  const viewport = face ? face.closest('.bg-primary') : null
  if (viewport) {
    const selfie = document.createElement('input')
    selfie.type = 'file'
    selfie.accept = 'image/jpeg,image/png'
    selfie.className = 'hidden'
    viewport.appendChild(selfie)
    viewport.addEventListener('click', function (event) {
      if (event.target === selfie) {
        return
      }
      selfie.click()
    })
    selfie.addEventListener('change', async function () {
      const file = selfie.files && selfie.files[0]
      if (!file) {
        return
      }
      liveImage = await readFile(file)
    })
  }
  const submit = document.getElementById('submit-btn')
  if (submit) {
    submit.addEventListener('click', async function () {
      if (submit.disabled || (!idImage && !liveImage)) {
        return
      }
      setScreenState('loading')
      try {
        if (idImage) {
          await postImage('/v1/verifications/id', idImage)
        }
        if (liveImage) {
          await postImage('/v1/verifications/liveness', liveImage)
        }
      } catch (error) {
        // A dropped response leaves the next refresh to show the stored row.
      }
      await refresh()
    })
  }
  const mismatch = document.getElementById('status-mismatch')
  const buttons = mismatch ? mismatch.querySelectorAll('button') : []
  for (let index = 0; index < buttons.length; index += 1) {
    buttons[index].addEventListener('click', function () {
      setScreenState('ready')
    })
  }
  void refresh()
</script>
`

/** Serves the ID and liveness screen. Hosting lines are removed. The Stitch file stays unchanged. */
export function idLivenessPageHtml(stitchHtml: string): string {
  const stripped = stitchHtml
    .replace(' (Scaleway Paris DC)', '')
    .replace(LOADING_LINE, '')
    .replace(FOOTER_CLAUSE, '')
    .replace(SERVER_LINE, '')
    .replace('Encrypting Scaleway Transfer', 'Encrypting transfer')
  const close = stripped.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('id liveness stitch is missing </body>')
  }
  return `${stripped.slice(0, close)}${BEHAVIOR}${stripped.slice(close)}`
}
