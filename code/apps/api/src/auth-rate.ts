const WINDOW_MS = 60_000
const MAX_BUCKETS = 4096

const buckets = new Map<string, number[]>()

export function resetAuthRateWindow(): void {
  buckets.clear()
}

function pruneExpired(nowMs: number): void {
  if (buckets.size < MAX_BUCKETS) {
    return
  }
  const cutoff = nowMs - WINDOW_MS
  for (const [ip, stamps] of buckets) {
    if (!stamps.some((stamp) => stamp > cutoff)) {
      buckets.delete(ip)
    }
  }
}

/**
 * Counts this call. Allows it only while the IP's hits in the last 60 seconds stay within `limit`.
 * Stamps are kept up to `limit`, so a flood still fails and does not grow the list.
 */
export function takeAuthSlot(ip: string, limit: number, now: Date): boolean {
  const nowMs = now.getTime()
  pruneExpired(nowMs)
  const cutoff = nowMs - WINDOW_MS
  const recent = (buckets.get(ip) ?? []).filter((stamp) => stamp > cutoff)
  if (recent.length >= limit) {
    if (recent.length === 0) {
      buckets.delete(ip)
    } else {
      buckets.set(ip, recent)
    }
    return false
  }
  recent.push(nowMs)
  buckets.set(ip, recent)
  return true
}
