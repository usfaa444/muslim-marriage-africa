import { afterEach, describe, expect, it } from 'vitest'
import { LITE_STORAGE_KEY, liteEnabled, setLite } from './lite-mode.js'

type Memory = {
  saveData?: boolean
  effectiveType?: string
  deviceMemory?: number
}

const store = new Map<string, string>()
const memory: Memory = {}

const localStorageMock = {
  getItem(key: string) {
    return store.has(key) ? store.get(key)! : null
  },
  setItem(key: string, value: string) {
    store.set(key, value)
  },
}

function install() {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      get connection() {
        if (memory.saveData === undefined && memory.effectiveType === undefined) return undefined
        return { saveData: memory.saveData, effectiveType: memory.effectiveType }
      },
      get deviceMemory() {
        return memory.deviceMemory
      },
    },
  })
}

afterEach(() => {
  store.clear()
  delete memory.saveData
  delete memory.effectiveType
  delete memory.deviceMemory
})

describe('lite mode device preference', () => {
  it('stays off when the key and the network hints are missing', () => {
    install()
    expect(liteEnabled()).toBe(false)
    expect(store.has(LITE_STORAGE_KEY)).toBe(false)
  })

  it('turns on for saveData, slow effective types, or 1GB-class memory', () => {
    install()
    memory.saveData = true
    expect(liteEnabled()).toBe(true)
    memory.saveData = false
    memory.effectiveType = '4g'
    expect(liteEnabled()).toBe(false)
    for (const type of ['slow-2g', '2g', '3g']) {
      memory.effectiveType = type
      expect(liteEnabled()).toBe(true)
    }
    delete memory.effectiveType
    memory.deviceMemory = 1
    expect(liteEnabled()).toBe(true)
    memory.deviceMemory = 0.5
    expect(liteEnabled()).toBe(true)
    memory.deviceMemory = 2
    expect(liteEnabled()).toBe(false)
    expect(store.has(LITE_STORAGE_KEY)).toBe(false)
  })

  it('lets a stored value beat the automatic default and keeps a failed write', () => {
    install()
    memory.saveData = true
    expect(setLite(false)).toBe(true)
    expect(store.get(LITE_STORAGE_KEY)).toBe('0')
    expect(liteEnabled()).toBe(false)
    memory.saveData = false
    memory.deviceMemory = 8
    expect(setLite(true)).toBe(true)
    expect(liteEnabled()).toBe(true)
    const throwing = {
      getItem: localStorageMock.getItem,
      setItem() {
        throw new Error('full')
      },
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: throwing })
    expect(setLite(false)).toBe(false)
    expect(store.get(LITE_STORAGE_KEY)).toBe('1')
    expect(liteEnabled()).toBe(true)
  })
})
