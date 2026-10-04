const WINDOW_MS = 60_000
const MAX_BUCKETS = 4096

type AuthBucket = {
  stamps: number[]
  lastPost: number
  saturated: boolean
}

const buckets = new Map<string, AuthBucket>()

export function resetAuthRateWindow(): void {
  buckets.clear()
}

function pruneExpired(nowMs: number): void {
  if (buckets.size < MAX_BUCKETS) {
    return
  }
  const cutoff = nowMs - WINDOW_MS
  for (const [ip, bucket] of buckets) {
    if (bucket.lastPost <= cutoff) {
      buckets.delete(ip)
    }
  }
}

/**
 * Counts this call, including a denied one.
 * Allows it only while this IP's posts in the last 60 seconds stay within `limit`.
 * A denied post keeps the window open until 60 seconds after the last post.
 * The stamp list stays capped at `limit`.
 */
export function takeAuthSlot(ip: string, limit: number, now: Date): boolean {
  const nowMs = now.getTime()
  pruneExpired(nowMs)
  const cutoff = nowMs - WINDOW_MS
  const existing = buckets.get(ip)
  const windowOpen = existing !== undefined && existing.lastPost > cutoff
  if (!windowOpen) {
    buckets.set(ip, { stamps: [nowMs], lastPost: nowMs, saturated: 1 >= limit })
    return true
  }
  const recent = existing.stamps.filter((stamp) => stamp > cutoff)
  const lastPost = Math.max(existing.lastPost, nowMs)
  if (existing.saturated || recent.length >= limit) {
    buckets.set(ip, { stamps: recent, lastPost, saturated: true })
    return false
  }
  recent.push(nowMs)
  buckets.set(ip, { stamps: recent, lastPost, saturated: recent.length >= limit })
  return true
}
