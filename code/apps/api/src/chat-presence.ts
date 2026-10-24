import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { chatPresence } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'
import { getChatStore } from './chat.js'
import { getInvitesPort } from './invites-port.js'
import { getTrustPort } from './trust-port.js'

/**
 * Chat presence (story chat-polish-2, Faycal): « En ligne » while the member has a realtime socket open, then « Vu pour
 * la dernière fois … ». Real presence from socket connections, never invented (the PRD rejects fake « online now »
 * chrome; this is FR-035 brought forward by the owner, with its hide-online control). WhatsApp rule: the « Statut en
 * ligne et dernière connexion » switch is reciprocal, so a member who hides hers sees nobody's. Only the two members of
 * a conversation see each other's presence, never across a Block, and never on browse or profile cards.
 *
 * Live state (open sockets per account) is held by this api process: the stack runs one api container today. A tab
 * that closes or reconnects within `PRESENCE_GRACE_MS` does not flicker « hors ligne ». `last_seen_at` is stored when
 * the last socket of the account closed, once the grace period is over.
 */

export const PRESENCE_GRACE_MS = 15_000

export type PresenceStore = {
  /** Which of these accounts turned « Statut en ligne et dernière connexion » off. No row means on. */
  hidden(accountIds: readonly string[]): Promise<Set<string>>
  setVisible(accountId: string, visible: boolean, at: Date): Promise<void>
  lastSeen(accountIds: readonly string[]): Promise<Map<string, string>>
  markSeen(accountId: string, at: Date): Promise<void>
}

export function memoryPresenceStore(): PresenceStore & { rows: Map<string, { visible: boolean; last_seen_at: string | null }> } {
  const rows = new Map<string, { visible: boolean; last_seen_at: string | null }>()
  return {
    rows,
    async hidden(accountIds) {
      return new Set(accountIds.filter((id) => rows.get(id)?.visible === false))
    },
    async setVisible(accountId, visible) {
      rows.set(accountId, { visible, last_seen_at: rows.get(accountId)?.last_seen_at ?? null })
    },
    async lastSeen(accountIds) {
      const seen = new Map<string, string>()
      for (const id of accountIds) {
        const at = rows.get(id)?.last_seen_at
        if (at) seen.set(id, at)
      }
      return seen
    },
    async markSeen(accountId, at) {
      rows.set(accountId, { visible: rows.get(accountId)?.visible ?? true, last_seen_at: at.toISOString() })
    },
  }
}

function postgresPresenceStore(): PresenceStore {
  return {
    async hidden(accountIds) {
      if (accountIds.length === 0) return new Set()
      const rows = await getIdentityDatabase()
        .select({ account_id: chatPresence.account_id })
        .from(chatPresence)
        .where(and(inArray(chatPresence.account_id, [...new Set(accountIds)]), eq(chatPresence.visible, false)))
      return new Set(rows.map((row) => row.account_id))
    },
    async setVisible(accountId, visible, at) {
      await getIdentityDatabase()
        .insert(chatPresence)
        .values({ account_id: accountId, visible, updated_at: at.toISOString() })
        .onConflictDoUpdate({ target: chatPresence.account_id, set: { visible, updated_at: at.toISOString() } })
    },
    async lastSeen(accountIds) {
      if (accountIds.length === 0) return new Map()
      const rows = await getIdentityDatabase()
        .select({ account_id: chatPresence.account_id, last_seen_at: chatPresence.last_seen_at })
        .from(chatPresence)
        .where(and(inArray(chatPresence.account_id, [...new Set(accountIds)]), isNotNull(chatPresence.last_seen_at)))
      return new Map(rows.flatMap((row) => (row.last_seen_at ? [[row.account_id, new Date(row.last_seen_at).toISOString()] as const] : [])))
    },
    async markSeen(accountId, at) {
      await getIdentityDatabase()
        .insert(chatPresence)
        .values({ account_id: accountId, last_seen_at: at.toISOString(), updated_at: at.toISOString() })
        .onConflictDoUpdate({ target: chatPresence.account_id, set: { last_seen_at: at.toISOString(), updated_at: at.toISOString() } })
    },
  }
}

let override: PresenceStore | undefined
let memoryFallback: ReturnType<typeof memoryPresenceStore> | undefined

export function setPresenceStore(next: PresenceStore | undefined): void {
  override = next
}

export function getPresenceStore(): PresenceStore {
  if (override) return override
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryPresenceStore()
    return memoryFallback
  }
  return postgresPresenceStore()
}

export type PresenceEvents = {
  /** `presence.changed { account_id }`, ids only, to chat partners who may see it (both switches on, no Block). */
  presenceChanged(input: { accountId: string; recipients: readonly string[] }): void
}

let events: PresenceEvents | undefined

export function setPresenceEvents(next: PresenceEvents | undefined): void {
  events = next
}

/**
 * Premium seam (Faycal: presence goes into a paid package later, not now). Today everyone who may see a partner's
 * presence does. The future gate decides here, for the viewer; it never changes what is stored or announced.
 */
export async function presenceAllowed(_viewerId: string): Promise<boolean> {
  return true
}

/** The other members of my conversations, minus anyone hidden by a Block either way. */
export async function chatPartners(me: string): Promise<string[]> {
  const accepted = await getInvitesPort().acceptedFor(me)
  const otherByInvite = new Map(accepted.map((row) => [row.inviteId, row.otherId]))
  const rows = await getChatStore().conversationsForInvites([...otherByInvite.keys()])
  const hidden = new Set(await getTrustPort().hiddenFor(me))
  return [...new Set(rows.map((row) => otherByInvite.get(row.invite_id) ?? '').filter((id) => id && !hidden.has(id)))]
}

let grace = PRESENCE_GRACE_MS

/** Tests: a shorter grace period (undefined restores the default). */
export function setPresenceGraceMs(ms: number | undefined): void {
  grace = ms ?? PRESENCE_GRACE_MS
}

const sockets = new Map<string, number>()
const leaving = new Map<string, ReturnType<typeof setTimeout>>()

/** Online: a socket is open, or the last one closed less than `PRESENCE_GRACE_MS` ago. */
export function isOnline(accountId: string): boolean {
  return (sockets.get(accountId) ?? 0) > 0 || leaving.has(accountId)
}

/** Tells the partners who may see it that this member's presence changed. They reload the thread head. */
export async function announcePresence(accountId: string): Promise<void> {
  if (!events) return
  const partners = await chatPartners(accountId)
  const hidden = await getPresenceStore().hidden([accountId, ...partners])
  // A member who hides it is never announced, so nobody can time her coming and going from the events either.
  if (hidden.has(accountId)) return
  const recipients = partners.filter((id) => !hidden.has(id))
  if (recipients.length > 0) events.presenceChanged({ accountId, recipients })
}

/** A realtime socket of this member opened (another tab counts once). */
export async function presenceConnected(accountId: string): Promise<void> {
  const wasOnline = isOnline(accountId)
  const timer = leaving.get(accountId)
  if (timer) {
    clearTimeout(timer)
    leaving.delete(accountId)
  }
  sockets.set(accountId, (sockets.get(accountId) ?? 0) + 1)
  if (!wasOnline) await announcePresence(accountId)
}

/** A realtime socket of this member closed. The last one starts the grace period; then « Vu … » is stored and told. */
export function presenceDisconnected(accountId: string): void {
  const left = (sockets.get(accountId) ?? 0) - 1
  if (left > 0) {
    sockets.set(accountId, left)
    return
  }
  sockets.delete(accountId)
  if (leaving.has(accountId)) return
  const at = authNow()
  const timer = setTimeout(() => {
    leaving.delete(accountId)
    void (async () => {
      await getPresenceStore().markSeen(accountId, at)
      await announcePresence(accountId)
    })().catch(() => undefined)
  }, grace)
  timer.unref?.()
  leaving.set(accountId, timer)
}

/** Tests and shutdown: forgets every live socket and pending grace timer. */
export function resetPresence(): void {
  for (const timer of leaving.values()) clearTimeout(timer)
  leaving.clear()
  sockets.clear()
}

export type PresenceView = { online: boolean; last_seen_at: string | null }

/**
 * What the viewer may see of the other member's presence: null under a Block, when either of them hides it, or when
 * the premium seam says no. `last_seen_at` is null while online, or when the member was never seen.
 */
export async function presenceBetween(viewerId: string, otherId: string, blocked: boolean): Promise<PresenceView | null> {
  if (blocked || !(await presenceAllowed(viewerId))) return null
  const store = getPresenceStore()
  const hidden = await store.hidden([viewerId, otherId])
  if (hidden.size > 0) return null
  const online = isOnline(otherId)
  if (online) return { online: true, last_seen_at: null }
  return { online: false, last_seen_at: (await store.lastSeen([otherId])).get(otherId) ?? null }
}
