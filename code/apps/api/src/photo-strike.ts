import { and, eq, inArray, sql } from 'drizzle-orm'
import { newId, uuidV7Instant } from '@ankanu/kernel'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { strike } from './account-schema.js'
import { operatorConfig } from './operator-config.js'
import type { ProfileDb } from './profile-store.js'

/** Catalog ladder for the photo floor. Later ladders add other strings. No check constraint. */
export const PHOTO_FLOOR_LADDER = 'photo_floor'

const COUNT_KEY = 'photo_strike_count'
const HOURS_KEY = 'photo_strike_block_hours'
const HOUR_MS = 3_600_000
const MAX_DATE_MS = 8_640_000_000_000_000

export type PhotoFloorStrike = {
  id: string
  account_id: string
  case_id: null
  ladder: typeof PHOTO_FLOOR_LADDER
  evidence: string
}

export type PhotoStrikeConfigFailure = {
  ok: false
  field: typeof COUNT_KEY | typeof HOURS_KEY
}

export type PhotoStrikeBlock =
  | { ok: true; block: null }
  | { ok: true; block: { blocked_until: string }; count: number; retryAfter: number }
  | PhotoStrikeConfigFailure

type ConfigReader = () => Promise<{ count: string | undefined; hours: string | undefined }>

export type StrikeStore = {
  insert(row: PhotoFloorStrike): Promise<'inserted' | 'duplicate'>
  listPhotoFloor(accountId: string): Promise<PhotoFloorStrike[]>
  snapshot?: () => PhotoFloorStrike[]
  restore?: (rows: PhotoFloorStrike[]) => void
}

let configReader: ConfigReader | undefined
let storeOverride: StrikeStore | undefined
const memoryDefault = memoryStrikeStore()

export function setPhotoStrikeConfigReader(next: ConfigReader | undefined): void {
  configReader = next
}

export function setStrikeStore(store: StrikeStore | undefined): void {
  storeOverride = store
}

export function getStrikeStore(): StrikeStore {
  if (storeOverride) {
    return storeOverride
  }
  if (accountStoreIsMemory()) {
    return memoryDefault
  }
  return postgresStrikeStore()
}

export function memoryStrikeStore(): StrikeStore & { rows: PhotoFloorStrike[] } {
  const rows: PhotoFloorStrike[] = []
  return {
    rows,
    async insert(row) {
      if (rows.some((item) => item.ladder === PHOTO_FLOOR_LADDER && item.evidence === row.evidence)) {
        return 'duplicate'
      }
      rows.push(row)
      return 'inserted'
    },
    async listPhotoFloor(accountId) {
      return rows
        .filter((row) => row.account_id === accountId && row.ladder === PHOTO_FLOOR_LADDER)
        .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    },
    snapshot() {
      return rows.map((row) => ({ ...row }))
    },
    restore(saved) {
      rows.length = 0
      for (const row of saved) {
        rows.push({ ...row })
      }
    },
  }
}

/** One photo-floor row per blocked profile photo. A repeat of the same asset does not add another row. */
export async function recordPhotoFloorStrike(input: {
  accountId: string
  assetId: string
  at: Date
  db?: ProfileDb
}): Promise<void> {
  const row: PhotoFloorStrike = {
    id: newId(input.at),
    account_id: input.accountId,
    case_id: null,
    ladder: PHOTO_FLOOR_LADDER,
    evidence: `photo_asset:${input.assetId}`,
  }
  if (input.db) {
    await input.db.insert(strike).values(row).onConflictDoNothing(photoFloorConflict())
    return
  }
  if (!accountStoreIsMemory()) {
    throw new Error('photo floor strike requires the caller transaction')
  }
  await getStrikeStore().insert(row)
}

/**
 * Replay photo-floor strikes in id order.
 * A block starts at the Nth counted strike and lasts `hours` from that strike.
 * Strikes inside an open window are skipped. After the window, the count starts over.
 */
export function replayPhotoFloor(
  strikes: Array<{ id: string }>,
  count: number,
  hours: number,
  now: Date,
): { blocked_until: string } | null | 'invalid' {
  const ordered = [...strikes].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
  let tally = 0
  let end: number | null = null
  for (const item of ordered) {
    const at = uuidV7Instant(item.id).getTime()
    if (end !== null && at < end) {
      continue
    }
    if (end !== null && at >= end) {
      end = null
    }
    tally += 1
    if (tally === count) {
      const next = at + hours * HOUR_MS
      if (!Number.isFinite(next) || next > MAX_DATE_MS) {
        return 'invalid'
      }
      end = next
      tally = 0
    }
  }
  if (end !== null && now.getTime() < end) {
    return { blocked_until: new Date(end).toISOString() }
  }
  return null
}

/** Trust read. Media calls this and does not select `strike`. */
export async function photoStrikeBlock(accountId: string, now: Date): Promise<PhotoStrikeBlock> {
  const config = await readConfig()
  if (!config.ok) {
    return config
  }
  const rows = await getStrikeStore().listPhotoFloor(accountId)
  const block = replayPhotoFloor(rows, config.count, config.hours, now)
  if (block === 'invalid') {
    return { ok: false, field: HOURS_KEY }
  }
  if (!block) {
    return { ok: true, block: null }
  }
  const seconds = Math.ceil((Date.parse(block.blocked_until) - now.getTime()) / 1000)
  return {
    ok: true,
    block,
    count: config.count,
    retryAfter: Math.max(1, seconds),
  }
}

async function readConfig(): Promise<{ ok: true; count: number; hours: number } | PhotoStrikeConfigFailure> {
  const raw = configReader ? await configReader() : await readOperatorKeys()
  const count = positiveInt(raw.count)
  if (count === null) {
    return { ok: false, field: COUNT_KEY }
  }
  const hours = positiveInt(raw.hours)
  if (hours === null || !Number.isSafeInteger(hours * HOUR_MS)) {
    return { ok: false, field: HOURS_KEY }
  }
  return { ok: true, count, hours }
}

async function readOperatorKeys(): Promise<{ count: string | undefined; hours: string | undefined }> {
  const rows = await getIdentityDatabase()
    .select({ key: operatorConfig.key, value: operatorConfig.value })
    .from(operatorConfig)
    .where(inArray(operatorConfig.key, [COUNT_KEY, HOURS_KEY]))
  const count = rows.find((row) => row.key === COUNT_KEY)?.value
  const hours = rows.find((row) => row.key === HOURS_KEY)?.value
  return { count, hours }
}

/** Literal predicate so Postgres can match the partial unique index. A bound parameter does not. */
function photoFloorConflict(): { target: typeof strike.evidence; where: ReturnType<typeof sql> } {
  return {
    target: strike.evidence,
    where: sql`${strike.ladder} = ${sql.raw("'photo_floor'")}`,
  }
}

function positiveInt(value: string | undefined): number | null {
  if (value === undefined || !/^[0-9]+$/.test(value)) {
    return null
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null
  }
  return parsed
}

function postgresStrikeStore(): StrikeStore {
  return {
    async insert(row) {
      await getIdentityDatabase().insert(strike).values(row).onConflictDoNothing(photoFloorConflict())
      return 'inserted'
    },
    async listPhotoFloor(accountId) {
      const rows = await getIdentityDatabase()
        .select({
          id: strike.id,
          account_id: strike.account_id,
          case_id: strike.case_id,
          ladder: strike.ladder,
          evidence: strike.evidence,
        })
        .from(strike)
        .where(and(eq(strike.account_id, accountId), eq(strike.ladder, PHOTO_FLOOR_LADDER)))
        .orderBy(strike.id)
      return rows.map((row) => ({
        id: row.id,
        account_id: row.account_id,
        case_id: null,
        ladder: PHOTO_FLOOR_LADDER,
        evidence: row.evidence ?? '',
      }))
    },
  }
}
