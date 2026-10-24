import { newId, type ReportReason, type ReportTargetKind } from '@ankanu/kernel'
import type { TrustPort } from '@ankanu/ports'
import { and, count, desc, eq, gte, isNull, lt, min, or } from 'drizzle-orm'
import { block, moderationCase, report } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { operatorConfig } from './operator-config.js'

/**
 * Trust module (Stories 8.5, 8.6). The only writer of `report`, `moderation_case` and `block` (AD-3, AD-10). A Member
 * Report opens exactly one `moderation_case` in the same transaction, with `sla_started_at` = submit time. Moderation
 * (`moderation_job`, `flag_queue`) is not touched here, and nothing here calls BillingPort (AD-21).
 */

export type ReportRow = {
  id: string
  reporter_id: string
  target_kind: ReportTargetKind
  target_id: string
  reported_account_id: string
  conversation_id: string | null
  reason: ReportReason
  details: string | null
  sla_started_at: string
  first_human_at: string | null
}

export type CaseRow = {
  id: string
  report_id: string | null
  flag_queue_id: string | null
  sla_started_at: string
  first_human_at: string | null
}

export type BlockRow = {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type OpenCaseSummary = { open: number; slaBreach: number; oldestOpenStartedAt: string | null }

export type TrustStore = {
  /** One transaction: the report, its case, and (when asked) the block. An existing block is kept, not duplicated. */
  fileReport(input: { report: ReportRow; case: CaseRow; block: BlockRow | null }): Promise<{ blockCreated: boolean }>
  reportsSince(reporterId: string, since: string): Promise<number>
  insertBlock(row: BlockRow): Promise<{ created: boolean; row: BlockRow }>
  /** The Blocks this member placed (never the ones placed on them), newest first, at most `limit` rows. */
  blocksBy(blockerId: string, limit?: number): Promise<BlockRow[]>
  /** Deletes the blocker's own row for this pair only. False when there is none. */
  removeBlock(blockerId: string, blockedId: string): Promise<boolean>
  blockedBetween(a: string, b: string): Promise<boolean>
  hiddenFor(accountId: string): Promise<string[]>
  /** Open cases are those with no first human touch; breach is open and started before `breachBefore`. */
  openCases(breachBefore: string): Promise<OpenCaseSummary>
}

export function memoryTrustStore(): TrustStore & { reports: ReportRow[]; cases: CaseRow[]; blocks: BlockRow[] } {
  const reports: ReportRow[] = []
  const cases: CaseRow[] = []
  const blocks: BlockRow[] = []
  const insertBlock = (row: BlockRow) => {
    const existing = blocks.find((item) => item.blocker_id === row.blocker_id && item.blocked_id === row.blocked_id)
    if (existing) {
      return { created: false, row: existing }
    }
    blocks.push({ ...row })
    return { created: true, row }
  }
  return {
    reports,
    cases,
    blocks,
    async fileReport(input) {
      reports.push({ ...input.report })
      cases.push({ ...input.case })
      return { blockCreated: input.block ? insertBlock(input.block).created : false }
    },
    async reportsSince(reporterId, since) {
      return reports.filter((row) => row.reporter_id === reporterId && row.sla_started_at >= since).length
    },
    async insertBlock(row) {
      return insertBlock(row)
    },
    async blocksBy(blockerId, limit) {
      const sorted = blocks
        .filter((row) => row.blocker_id === blockerId)
        .map((row) => ({ ...row }))
        .sort((left, right) => (left.created_at < right.created_at ? 1 : left.created_at > right.created_at ? -1 : 0))
      return limit === undefined ? sorted : sorted.slice(0, limit)
    },
    async removeBlock(blockerId, blockedId) {
      const index = blocks.findIndex((row) => row.blocker_id === blockerId && row.blocked_id === blockedId)
      if (index < 0) {
        return false
      }
      blocks.splice(index, 1)
      return true
    },
    async blockedBetween(a, b) {
      return blocks.some((row) => (row.blocker_id === a && row.blocked_id === b) || (row.blocker_id === b && row.blocked_id === a))
    },
    async hiddenFor(accountId) {
      const ids = new Set<string>()
      for (const row of blocks) {
        if (row.blocker_id === accountId) {
          ids.add(row.blocked_id)
        } else if (row.blocked_id === accountId) {
          ids.add(row.blocker_id)
        }
      }
      return [...ids]
    },
    async openCases(breachBefore) {
      const open = cases.filter((row) => row.first_human_at === null)
      const started = open.map((row) => row.sla_started_at).sort()
      return {
        open: open.length,
        slaBreach: open.filter((row) => Date.parse(row.sla_started_at) < Date.parse(breachBefore)).length,
        oldestOpenStartedAt: started[0] ?? null,
      }
    },
  }
}

function iso(value: string | null): string | null {
  return value === null ? null : new Date(value).toISOString()
}

function postgresTrustStore(): TrustStore {
  const blockColumns = { id: block.id, blocker_id: block.blocker_id, blocked_id: block.blocked_id, created_at: block.created_at }
  return {
    async fileReport(input) {
      return getIdentityDatabase().transaction(async (tx) => {
        await tx.insert(report).values(input.report)
        await tx.insert(moderationCase).values(input.case)
        if (!input.block) {
          return { blockCreated: false }
        }
        const inserted = await tx.insert(block).values(input.block).onConflictDoNothing().returning({ id: block.id })
        return { blockCreated: inserted.length > 0 }
      })
    },
    async reportsSince(reporterId, since) {
      const rows = await getIdentityDatabase()
        .select({ value: count() })
        .from(report)
        .where(and(eq(report.reporter_id, reporterId), gte(report.sla_started_at, since)))
      return Number(rows[0]?.value ?? 0)
    },
    async insertBlock(row) {
      const db = getIdentityDatabase()
      const inserted = await db.insert(block).values(row).onConflictDoNothing().returning(blockColumns)
      const created = inserted[0]
      if (created) {
        return { created: true, row: { ...created, created_at: new Date(created.created_at).toISOString() } }
      }
      const existing = await db
        .select(blockColumns)
        .from(block)
        .where(and(eq(block.blocker_id, row.blocker_id), eq(block.blocked_id, row.blocked_id)))
        .limit(1)
      const found = existing[0]
      if (!found) {
        throw new Error('block insert missed the existing row')
      }
      return { created: false, row: { ...found, created_at: new Date(found.created_at).toISOString() } }
    },
    async blocksBy(blockerId, limit) {
      const query = getIdentityDatabase()
        .select(blockColumns)
        .from(block)
        .where(eq(block.blocker_id, blockerId))
        .orderBy(desc(block.created_at), desc(block.id))
      const rows = limit === undefined ? await query : await query.limit(limit)
      return rows.map((row) => ({ ...row, created_at: new Date(row.created_at).toISOString() }))
    },
    async removeBlock(blockerId, blockedId) {
      const removed = await getIdentityDatabase()
        .delete(block)
        .where(and(eq(block.blocker_id, blockerId), eq(block.blocked_id, blockedId)))
        .returning({ id: block.id })
      return removed.length > 0
    },
    async blockedBetween(a, b) {
      const rows = await getIdentityDatabase()
        .select({ id: block.id })
        .from(block)
        .where(
          or(and(eq(block.blocker_id, a), eq(block.blocked_id, b)), and(eq(block.blocker_id, b), eq(block.blocked_id, a))),
        )
        .limit(1)
      return rows.length > 0
    },
    async hiddenFor(accountId) {
      const rows = await getIdentityDatabase()
        .select({ blocker_id: block.blocker_id, blocked_id: block.blocked_id })
        .from(block)
        .where(or(eq(block.blocker_id, accountId), eq(block.blocked_id, accountId)))
      return [...new Set(rows.map((row) => (row.blocker_id === accountId ? row.blocked_id : row.blocker_id)))]
    },
    async openCases(breachBefore) {
      const db = getIdentityDatabase()
      const [open, breach] = await Promise.all([
        db
          .select({ value: count(), oldest: min(moderationCase.sla_started_at) })
          .from(moderationCase)
          .where(isNull(moderationCase.first_human_at)),
        db
          .select({ value: count() })
          .from(moderationCase)
          .where(and(isNull(moderationCase.first_human_at), lt(moderationCase.sla_started_at, breachBefore))),
      ])
      return {
        open: Number(open[0]?.value ?? 0),
        slaBreach: Number(breach[0]?.value ?? 0),
        oldestOpenStartedAt: iso(open[0]?.oldest ?? null),
      }
    },
  }
}

let override: TrustStore | undefined
let memoryFallback: ReturnType<typeof memoryTrustStore> | undefined

export function setTrustStore(next: TrustStore | undefined): void {
  override = next
}

/** The override, else memory beside a memory account store (tests), else Postgres. */
export function getTrustStore(): TrustStore {
  if (override) {
    return override
  }
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryTrustStore()
    return memoryFallback
  }
  return postgresTrustStore()
}

/** The default TrustPort reads the trust store. Other modules only ever see these two questions. */
export const storeTrustPort: TrustPort = {
  blockedBetween(a, b) {
    return a === b ? Promise.resolve(false) : getTrustStore().blockedBetween(a, b)
  },
  hiddenFor(accountId) {
    return getTrustStore().hiddenFor(accountId)
  },
}

export function newReportIds(now: Date): { reportId: string; caseId: string } {
  return { reportId: newId(now), caseId: newId(now) }
}

/**
 * SLA state of one case (NFR-003, FR-083). `sla_breach`: no first human touch and more than `hours` since
 * `sla_started_at`. A first touch after the window is `first_touch_late` (it breached, and is no longer open).
 */
export type CaseSlaState = 'open' | 'sla_breach' | 'first_touch_in_sla' | 'first_touch_late'

export function caseSlaState(row: Pick<CaseRow, 'sla_started_at' | 'first_human_at'>, now: Date, hours: number): CaseSlaState {
  const start = Date.parse(row.sla_started_at)
  const windowMs = hours * 60 * 60 * 1000
  if (row.first_human_at !== null) {
    return Date.parse(row.first_human_at) - start > windowMs ? 'first_touch_late' : 'first_touch_in_sla'
  }
  return now.getTime() - start > windowMs ? 'sla_breach' : 'open'
}

async function readPositiveConfig(key: string, fallback: number): Promise<number | null> {
  if (!process.env['DATABASE_URL']) {
    return fallback
  }
  const rows = await getIdentityDatabase()
    .select({ value: operatorConfig.value })
    .from(operatorConfig)
    .where(eq(operatorConfig.key, key))
    .limit(1)
  const raw = rows[0]?.value
  if (raw === undefined || !/^[1-9]\d*$/.test(raw)) {
    return null
  }
  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) ? parsed : null
}

let slaReader: (() => Promise<number | null>) | undefined
let rateReader: (() => Promise<number | null>) | undefined

export function setReportSlaReader(next: (() => Promise<number | null>) | undefined): void {
  slaReader = next
}

export function setReportRateReader(next: (() => Promise<number | null>) | undefined): void {
  rateReader = next
}

/** `operator_config.report_sla_hours` (seed 24). Null when the row is missing or not a positive integer. */
export function readReportSlaHours(): Promise<number | null> {
  return slaReader ? slaReader() : readPositiveConfig('report_sla_hours', 24)
}

/** `operator_config.rl_report_per_hour` (seed 10, AD-17 Report rate limit). */
export function readReportRatePerHour(): Promise<number | null> {
  return rateReader ? rateReader() : readPositiveConfig('rl_report_per_hour', 10)
}
