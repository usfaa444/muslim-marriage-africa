import { unreadConversationCount } from './chat-messages.js'
import { pendingReceivedCount } from './invites.js'
import { assertBrowseViewer } from './public-profile.js'
import type { ResolvedSession } from './session-store.js'

/**
 * `GET /v1/me/badges` (story chat-polish): the two bottom-nav counts, for members only. `invitations` is the number of
 * invites I received and have not answered; `discussions` the number of conversations with messages I have not read.
 * Counts only, no names or ids (NFR-005: a few bytes, refetched on realtime events and on focus).
 */
export type BadgesFailure = { ok: false; status: 403 | 500; code: 'FORBIDDEN' | 'UNHANDLED'; message: string; details: unknown }

export async function readBadges(
  session: ResolvedSession,
): Promise<{ ok: true; body: { invitations: number; discussions: number } } | BadgesFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return gate.status === 403
      ? { ok: false, status: 403, code: 'FORBIDDEN', message: gate.message, details: gate.details }
      : { ok: false, status: 500, code: 'UNHANDLED', message: 'Request failed', details: null }
  }
  const me = gate.account.id
  const [invitations, discussions] = await Promise.all([pendingReceivedCount(me), unreadConversationCount(me)])
  return { ok: true, body: { invitations, discussions } }
}
