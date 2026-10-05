import { authNow } from './auth-clock.js'

const MAX_ENTRIES = 4096
const PRUNE_AFTER_MS = 60_000

type PinEntry = {
  unlocked: boolean
  fails: number
  lastTouch: number
}

const entries = new Map<string, PinEntry>()

/** Drops the in-process map. A missing entry is locked when a PIN exists. */
export function resetPinEntries(): void {
  entries.clear()
}

function prune(nowMs: number): void {
  if (entries.size < MAX_ENTRIES) {
    return
  }
  const cutoff = nowMs - PRUNE_AFTER_MS
  for (const [id, entry] of entries) {
    if (entry.lastTouch <= cutoff) {
      entries.delete(id)
    }
  }
}

function write(id: string, unlocked: boolean, fails: number, nowMs: number): void {
  prune(nowMs)
  entries.set(id, { unlocked, fails, lastTouch: nowMs })
}

export function readPinEntry(id: string): { unlocked: boolean; fails: number } | undefined {
  const entry = entries.get(id)
  if (!entry) {
    return undefined
  }
  return { unlocked: entry.unlocked, fails: entry.fails }
}

export function notePinUnlocked(id: string, now = authNow()): void {
  write(id, true, 0, now.getTime())
}

export function notePinLocked(id: string, fails: number, now = authNow()): void {
  write(id, false, fails, now.getTime())
}

export function forgetPinEntry(id: string): void {
  entries.delete(id)
}
