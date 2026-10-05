/** Optional Mooré / Dioula files. This story passes none. Story 10.1 can pass pack-card files later. */
export type AudioPromptFiles = {
  mos?: string
  dyu?: string
}

export type AudioLocale = keyof AudioPromptFiles

/** Play only when that locale has a file. Otherwise the pictograms stay. */
export function audioPromptAction(
  files: AudioPromptFiles,
  locale: AudioLocale,
): 'play' | 'pictogram' {
  return files[locale] ? 'play' : 'pictogram'
}

export function insertBeforeBody(html: string, addition: string): string {
  const close = html.lastIndexOf('</body>')
  if (close < 0) {
    throw new Error('stitch is missing </body>')
  }
  return `${html.slice(0, close)}${addition}${html.slice(close)}`
}

/** Speaker plus mos/dyu controls. No request, no storage, no autoplay. */
export function audioPromptScript(files: AudioPromptFiles = {}): string {
  const payload = {
    mos: files.mos ?? null,
    dyu: files.dyu ?? null,
  }
  return `
<script>
(function () {
  const files = ${JSON.stringify(payload)}
  let active = null
  const previousToggle = typeof toggleAudio === 'function' ? toggleAudio : null
  function stopActive() {
    if (!active) {
      return
    }
    try {
      active.pause()
    } catch (error) {
      // A failed element has nothing to pause.
    }
    active = null
  }
  function start(locale) {
    const src = files[locale]
    if (!src) {
      return false
    }
    stopActive()
    const audio = new Audio(src)
    active = audio
    audio.addEventListener('error', function () {
      stopActive()
      if (typeof resetAudioUI === 'function') {
        resetAudioUI()
      }
    })
    const pending = audio.play()
    if (pending && pending.catch) {
      pending.catch(function () {
        stopActive()
        if (typeof resetAudioUI === 'function') {
          resetAudioUI()
        }
      })
    }
    return true
  }
  function handleLocale(locale, lang) {
    if (!files[locale]) {
      return
    }
    if (previousToggle && lang) {
      previousToggle(lang)
    }
    if (!start(locale) && typeof resetAudioUI === 'function') {
      resetAudioUI()
    }
  }
  toggleAudio = function (lang) {
    const locale = lang === 'moore' ? 'mos' : lang === 'dioula' ? 'dyu' : ''
    if (!locale) {
      return
    }
    handleLocale(locale, lang)
  }
  function localeFrom(button) {
    const text = button.textContent || ''
    if (text.indexOf('(mos)') !== -1 || text.indexOf('Mooré') !== -1) {
      return 'mos'
    }
    if (text.indexOf('(dyu)') !== -1 || text.indexOf('Dioula') !== -1) {
      return 'dyu'
    }
    return ''
  }
  function fit(button) {
    button.style.minHeight = '44px'
    button.style.minWidth = '44px'
  }
  function bind(button) {
    fit(button)
    const onclick = button.getAttribute ? button.getAttribute('onclick') || '' : ''
    if (onclick.indexOf('toggleAudio') !== -1) {
      return
    }
    button.addEventListener('click', function (event) {
      if (event && event.preventDefault) {
        event.preventDefault()
      }
      const locale = localeFrom(button)
      if (!locale) {
        return
      }
      handleLocale(locale, null)
    })
  }
  function roots() {
    const found = []
    const guidance = document.getElementById('audio-guidance-title')
    if (guidance && guidance.closest) {
      const aside = guidance.closest('aside')
      if (aside) {
        found.push(aside)
      }
    }
    const guide = document.getElementById('audio-guide-heading')
    if (guide && guide.closest) {
      const section = guide.closest('section')
      if (section) {
        found.push(section)
      }
    }
    return found
  }
  const areas = roots()
  for (let index = 0; index < areas.length; index += 1) {
    const buttons = areas[index].querySelectorAll('button')
    for (let cursor = 0; cursor < buttons.length; cursor += 1) {
      bind(buttons[cursor])
    }
    const icons = areas[index].querySelectorAll('.material-symbols-outlined')
    for (let cursor = 0; cursor < icons.length; cursor += 1) {
      const icon = icons[cursor]
      if (!icon.textContent || icon.textContent.indexOf('volume_up') === -1) {
        continue
      }
      const parent = icon.parentElement
      if (parent && String(parent.className || '').indexOf('w-9') !== -1) {
        parent.style.minWidth = '44px'
        parent.style.minHeight = '44px'
      }
    }
  }
  const forms = document.getElementsByTagName('form')
  for (let index = 0; index < forms.length; index += 1) {
    forms[index].addEventListener('submit', function (event) {
      if (event && event.preventDefault) {
        event.preventDefault()
      }
    })
  }
})()
</script>
`
}
