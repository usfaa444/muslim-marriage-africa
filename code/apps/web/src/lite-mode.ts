/** Device Lite preference. Not an account field and not a network call. */

export const LITE_STORAGE_KEY = 'ankanu_lite'

/** Browser source. Page scripts include this string so they call the same functions. */
export const liteModeSource = `function liteStorage() {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch (error) {
    return null
  }
}
function liteConnection() {
  try {
    if (typeof navigator === 'undefined' || !navigator) return null
    return navigator.connection || null
  } catch (error) {
    return null
  }
}
function liteMemory() {
  try {
    if (typeof navigator === 'undefined' || !navigator) return null
    var value = navigator.deviceMemory
    return typeof value === 'number' ? value : null
  } catch (error) {
    return null
  }
}
function liteAutomatic() {
  var net = liteConnection()
  if (net && net.saveData === true) return true
  var type = net && net.effectiveType
  if (type === 'slow-2g' || type === '2g' || type === '3g') return true
  var memory = liteMemory()
  if (memory !== null && memory <= 1) return true
  return false
}
function liteEnabled() {
  var box = liteStorage()
  if (box) {
    try {
      var stored = box.getItem('${LITE_STORAGE_KEY}')
      if (stored === '1') return true
      if (stored === '0') return false
    } catch (error) {}
  }
  return liteAutomatic()
}
function setLite(on) {
  var box = liteStorage()
  if (!box) return false
  try {
    box.setItem('${LITE_STORAGE_KEY}', on ? '1' : '0')
    return true
  } catch (error) {
    return false
  }
}
`

type LiteApi = {
  liteEnabled: () => boolean
  setLite: (on: boolean) => boolean
}

let api: LiteApi | null = null

function liteApi(): LiteApi {
  if (!api) {
    api = new Function(`${liteModeSource} return { liteEnabled: liteEnabled, setLite: setLite };`)() as LiteApi
  }
  return api
}

export function liteEnabled(): boolean {
  return liteApi().liteEnabled()
}

export function setLite(on: boolean): boolean {
  return liteApi().setLite(on)
}
