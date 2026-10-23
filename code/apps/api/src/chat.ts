import { newId } from '@ankanu/kernel'
import type { ChatPort, OpenedConversation } from '@ankanu/ports'
import { eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { conversation } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { getInvitesPort } from './invites-port.js'
import { assertBrowseViewer, type PublicProfileFailure } from './public-profile.js'
import type { ResolvedSession } from './session-store.js'

/**
 * Minimal chat module (Story 4.5). It owns `conversation` and nothing else yet: no message, no Socket.IO, no screen
 * (Epic 5). `openFromInvite` is the only code in the api that inserts a conversation (AD-23).
 */

function stageOf(value: string): OpenedConversation['stage'] {
  return value === 'invite' || value === 'meeting' || value === 'married' ? value : 'chat'
}

export function memoryChatPort(): ChatPort & { conversations: OpenedConversation[] } {
  const conversations: OpenedConversation[] = []
  return {
    conversations,
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

function postgresChatPort(): ChatPort {
  return {
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
  if (override) {
    return override
  }
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryChatPort()
    return memoryFallback
  }
  return postgresChatPort()
}

export type ConversationItem = {
  id: string
  invite_id: string
  stage: OpenedConversation['stage']
  other_id: string
}

export type ChatFailure = {
  ok: false
  status: 403 | 500
  code: 'FORBIDDEN' | 'UNHANDLED'
  message: string
  details: PublicProfileFailure['details']
  retryable: boolean
}

/**
 * `GET /v1/conversations`. The viewer's conversations, found through the accepted invites invites reports for them
 * (chat never reads the invite table). A pending or declined invite has none. No BillingPort.
 */
export async function listConversations(
  session: ResolvedSession,
): Promise<{ ok: true; body: { count: number; items: ConversationItem[] } } | ChatFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    if (gate.status === 403 && gate.code === 'FORBIDDEN') {
      return { ok: false, status: 403, code: 'FORBIDDEN', message: gate.message, details: gate.details, retryable: false }
    }
    return { ok: false, status: 500, code: 'UNHANDLED', message: 'Request failed', details: null, retryable: false }
  }
  const accepted = await getInvitesPort().acceptedFor(gate.account.id)
  const otherByInvite = new Map(accepted.map((row) => [row.inviteId, row.otherId]))
  const rows = await getChatPort().conversationsForInvites([...otherByInvite.keys()])
  const items = rows
    .map((row) => ({ id: row.id, invite_id: row.invite_id, stage: row.stage, other_id: otherByInvite.get(row.invite_id) ?? '' }))
    .filter((row) => row.other_id !== '')
    .sort((left, right) => right.id.localeCompare(left.id))
  return { ok: true, body: { count: items.length, items } }
}
