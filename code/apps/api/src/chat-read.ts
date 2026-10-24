import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import { conversationRead, readReceiptSetting } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'

/**
 * Read pointers (story chat-polish): for each member of a conversation, the newest message they have read there.
 * Unread counts (« 3 messages non lus ») and the read ticks (« Lu ») are derived from it. The pointer only moves
 * forward, so a stale tab or a late request can never make a read message unread again. Chat owns the table; only
 * the two members of the conversation ever see a pointer (participant check on HTTP, account rooms on the socket).
 */

export type ReadPointer = { conversation_id: string; account_id: string; message_id: string }

export type ReadStore = {
  /** Moves the pointer forward to `messageId` (never back). Returns the pointer as stored after the call. */
  mark(conversationId: string, accountId: string, messageId: string, at: Date): Promise<string>
  /** Every pointer of these conversations (both members). */
  pointers(conversationIds: readonly string[]): Promise<ReadPointer[]>
  /** « Confirmations de lecture »: which of these accounts turned read receipts off. No row means on. */
  receiptsOff(accountIds: readonly string[]): Promise<Set<string>>
  /** Stores one member's choice. */
  setReceipts(accountId: string, enabled: boolean, at: Date): Promise<void>
}

export function memoryReadStore(): ReadStore & {
  rows: (ReadPointer & { read_at: string })[]
  settings: Map<string, { enabled: boolean; updated_at: string }>
} {
  const rows: (ReadPointer & { read_at: string })[] = []
  const settings = new Map<string, { enabled: boolean; updated_at: string }>()
  return {
    rows,
    settings,
    async receiptsOff(accountIds) {
      return new Set(accountIds.filter((id) => settings.get(id)?.enabled === false))
    },
    async setReceipts(accountId, enabled, at) {
      settings.set(accountId, { enabled, updated_at: at.toISOString() })
    },
    async mark(conversationId, accountId, messageId, at) {
      const row = rows.find((item) => item.conversation_id === conversationId && item.account_id === accountId)
      if (!row) {
        rows.push({ conversation_id: conversationId, account_id: accountId, message_id: messageId, read_at: at.toISOString() })
        return messageId
      }
      if (row.message_id < messageId) {
        row.message_id = messageId
        row.read_at = at.toISOString()
      }
      return row.message_id
    },
    async pointers(conversationIds) {
      const wanted = new Set(conversationIds)
      return rows
        .filter((row) => wanted.has(row.conversation_id))
        .map((row) => ({ conversation_id: row.conversation_id, account_id: row.account_id, message_id: row.message_id }))
    },
  }
}

function postgresReadStore(): ReadStore {
  return {
    async mark(conversationId, accountId, messageId, at) {
      const db = getIdentityDatabase()
      await db
        .insert(conversationRead)
        .values({ conversation_id: conversationId, account_id: accountId, last_read_message_id: messageId, read_at: at.toISOString() })
        .onConflictDoUpdate({
          target: [conversationRead.conversation_id, conversationRead.account_id],
          set: { last_read_message_id: messageId, read_at: at.toISOString() },
          // Forward only: an older id leaves the stored pointer as it is.
          setWhere: lt(conversationRead.last_read_message_id, sql`${messageId}::uuid`),
        })
      const found = await db
        .select({ message_id: conversationRead.last_read_message_id })
        .from(conversationRead)
        .where(and(eq(conversationRead.conversation_id, conversationId), eq(conversationRead.account_id, accountId)))
        .limit(1)
      return found[0]?.message_id ?? messageId
    },
    async pointers(conversationIds) {
      if (conversationIds.length === 0) {
        return []
      }
      return getIdentityDatabase()
        .select({
          conversation_id: conversationRead.conversation_id,
          account_id: conversationRead.account_id,
          message_id: conversationRead.last_read_message_id,
        })
        .from(conversationRead)
        .where(inArray(conversationRead.conversation_id, [...conversationIds]))
    },
    async receiptsOff(accountIds) {
      if (accountIds.length === 0) {
        return new Set()
      }
      const rows = await getIdentityDatabase()
        .select({ account_id: readReceiptSetting.account_id })
        .from(readReceiptSetting)
        .where(and(inArray(readReceiptSetting.account_id, [...new Set(accountIds)]), eq(readReceiptSetting.enabled, false)))
      return new Set(rows.map((row) => row.account_id))
    },
    async setReceipts(accountId, enabled, at) {
      await getIdentityDatabase()
        .insert(readReceiptSetting)
        .values({ account_id: accountId, enabled, updated_at: at.toISOString() })
        .onConflictDoUpdate({ target: readReceiptSetting.account_id, set: { enabled, updated_at: at.toISOString() } })
    },
  }
}

let override: ReadStore | undefined
let memoryFallback: ReturnType<typeof memoryReadStore> | undefined

export function setReadStore(next: ReadStore | undefined): void {
  override = next
}

export function getReadStore(): ReadStore {
  if (override) {
    return override
  }
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryReadStore()
    return memoryFallback
  }
  return postgresReadStore()
}

/** Pointers by conversation, then by account. */
export function pointerIndex(rows: readonly ReadPointer[]): Map<string, Map<string, string>> {
  const index = new Map<string, Map<string, string>>()
  for (const row of rows) {
    const byAccount = index.get(row.conversation_id) ?? new Map<string, string>()
    byAccount.set(row.account_id, row.message_id)
    index.set(row.conversation_id, byAccount)
  }
  return index
}
