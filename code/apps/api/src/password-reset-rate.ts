const WINDOW_MS = 60_000
const MAX_BUCKETS = 4096

type ResetBucket = {
  stamps: number[]
  lastPost: number
  saturated: boolean
}

const buckets = new Map<string, ResetBucket>()

export function resetPasswordResetRateWindow(): void {
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
 * Own 60-second window for `POST /v1/password-resets`.
 * A denied post stays in the window until 60 seconds after the last post.
 */
export function takePasswordResetSlot(ip: string, limit: number, now: Date): boolean {
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
