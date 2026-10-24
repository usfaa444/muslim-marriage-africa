import { newId } from '@ankanu/kernel'
import type { ModerationPort, ScanItemKind, ScanPayload } from '@ankanu/ports'
import { moderationJob } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'

/**
 * Minimal moderation module (Stories 5.2 to 5.4). `enqueueScan` is the only INSERT of `moderation_job` (AD-10): one
 * queued row per delivered item (a Chat Photo or a Voice note is one job keyed by its message id, not a second job by
 * asset), `outcome` null until the Epic 8 worker scans it. The plaintext payload is accepted here and not stored: no
 * scanner exists yet, and keeping it in Postgres or Redis would undo the Chat encryption. A photo or voice payload
 * carries the media id only; the worker reads the bytes through `fetchChatMediaForScan`. Moderation never reads
 * `message` and never writes `message.state`.
 */

export type QueuedJob = {
  id: string
  message_id: string | null
  asset_id: string | null
  flash_id: string | null
  outcome: null
}

function columnsFor(itemKind: ScanItemKind, itemId: string): Pick<QueuedJob, 'message_id' | 'asset_id' | 'flash_id'> {
  return {
    message_id: itemKind === 'message' ? itemId : null,
    asset_id: itemKind === 'asset' ? itemId : null,
    flash_id: itemKind === 'flash' ? itemId : null,
  }
}

/** Test and dev adapter. `calls` keeps what Chat handed over, so a test can check the payload reached moderation. */
export function memoryModerationPort(): ModerationPort & {
  jobs: QueuedJob[]
  calls: { itemId: string; itemKind: ScanItemKind; accountId: string; payload: ScanPayload }[]
} {
  const jobs: QueuedJob[] = []
  const calls: { itemId: string; itemKind: ScanItemKind; accountId: string; payload: ScanPayload }[] = []
  return {
    jobs,
    calls,
    async enqueueScan(input) {
      calls.push({ ...input, payload: { ...input.payload } })
      const keys = columnsFor(input.itemKind, input.itemId)
      const existing = jobs.find(
        (job) => job.message_id === keys.message_id && job.asset_id === keys.asset_id && job.flash_id === keys.flash_id,
      )
      if (existing) {
        return { jobId: existing.id }
      }
      const job: QueuedJob = { id: newId(authNow()), ...columnsFor(input.itemKind, input.itemId), outcome: null }
      jobs.push(job)
      return { jobId: job.id }
    },
  }
}

function postgresModerationPort(): ModerationPort {
  return {
    async enqueueScan(input) {
      const id = newId(authNow())
      const inserted = await getIdentityDatabase()
        .insert(moderationJob)
        .values({ id, ...columnsFor(input.itemKind, input.itemId) })
        .onConflictDoNothing()
        .returning({ id: moderationJob.id })
      return { jobId: inserted[0]?.id ?? id }
    },
  }
}

let override: ModerationPort | undefined
let memoryFallback: ReturnType<typeof memoryModerationPort> | undefined

export function setModerationPort(next: ModerationPort | undefined): void {
  override = next
}

/** The override, else memory beside a memory account store (tests), else Postgres. */
export function getModerationPort(): ModerationPort {
  if (override) {
    return override
  }
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryModerationPort()
    return memoryFallback
  }
  return postgresModerationPort()
}
