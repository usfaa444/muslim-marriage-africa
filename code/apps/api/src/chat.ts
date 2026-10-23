import { newId } from '@ankanu/kernel'
import type { ChatPort, OpenedConversation } from '@ankanu/ports'
import { eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { conversation } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'

/**
 * Chat module. It owns `conversation` (Story 4.5) and `message` (Stories 5.1, 5.2, `chat-messages.ts`).
 * `openFromInvite` is the only code in the api that inserts a conversation (AD-23).
 */

function stageOf(value: string): OpenedConversation['stage'] {
  return value === 'invite' || value === 'meeting' || value === 'married' ? value : 'chat'
}

/** A conversation as chat itself reads it: open unless paused or ended. */
export type ConversationRow = OpenedConversation & { paused_by: string | null; ended_at: string | null }

/** The ChatPort adapters also answer chat's own lookup by id. */
export type ChatStore = ChatPort & { find(id: string): Promise<ConversationRow | null> }

export function memoryChatPort(): ChatStore & { conversations: (OpenedConversation & Partial<ConversationRow>)[] } {
  const conversations: (OpenedConversation & Partial<ConversationRow>)[] = []
  return {
    conversations,
    async find(id) {
      const row = conversations.find((item) => item.id === id)
      return row ? { id: row.id, invite_id: row.invite_id, stage: row.stage, paused_by: row.paused_by ?? null, ended_at: row.ended_at ?? null } : null
    },
    async openFromInvite(_tx, input) {
      const existing = conversations.find((row) => row.invite_id === input.inviteId)
      if (existing) {
        return existing
      }
      const row: OpenedConversation = { id: newId(input.now), invite_id: input.inviteId, stage: 'chat' }
      conversations.push(row)
      return row
    },
    async conversationsForInvites(inviteIds) {
      const wanted = new Set(inviteIds)
      return conversations.filter((row) => wanted.has(row.invite_id))
    },
  }
}

const columns = { id: conversation.id, invite_id: conversation.invite_id, stage: conversation.stage }

function postgresChatPort(): ChatStore {
  return {
    async find(id) {
      const rows = await getIdentityDatabase()
        .select({ ...columns, paused_by: conversation.paused_by, ended_at: conversation.ended_at })
        .from(conversation)
        .where(eq(conversation.id, id))
        .limit(1)
      const row = rows[0]
      return row
        ? { id: row.id, invite_id: row.invite_id, stage: stageOf(row.stage), paused_by: row.paused_by, ended_at: row.ended_at }
        : null
    },
    async openFromInvite(tx, input) {
      const db = (tx ?? getIdentityDatabase()) as NodePgDatabase
      const inserted = await db
        .insert(conversation)
        .values({ id: newId(input.now), invite_id: input.inviteId, stage: 'chat' })
        .onConflictDoNothing({ target: conversation.invite_id })
        .returning(columns)
      const row = inserted[0] ?? (await db.select(columns).from(conversation).where(eq(conversation.invite_id, input.inviteId)).limit(1))[0]
      if (!row) {
        throw new Error('conversation insert returned no row')
      }
      return { id: row.id, invite_id: row.invite_id, stage: stageOf(row.stage) }
    },
    async conversationsForInvites(inviteIds) {
      if (inviteIds.length === 0) {
        return []
      }
      const rows = await getIdentityDatabase()
        .select(columns)
        .from(conversation)
        .where(inArray(conversation.invite_id, [...inviteIds]))
      return rows.map((row) => ({ id: row.id, invite_id: row.invite_id, stage: stageOf(row.stage) }))
    },
  }
}

let override: ChatPort | undefined
let memoryFallback: ReturnType<typeof memoryChatPort> | undefined

export function setChatPort(next: ChatPort | undefined): void {
  override = next
}

/** The override, else memory beside a memory account store (tests), else Postgres. */
export function getChatPort(): ChatPort {
  return getChatStore()
}

/** Chat's own view of the same adapter. An override without `find` reads by id from Postgres. */
export function getChatStore(): ChatStore {
  if (override) {
    return 'find' in override ? (override as ChatStore) : { ...override, find: postgresChatPort().find }
  }
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryChatPort()
    return memoryFallback
  }
  return postgresChatPort()
}

