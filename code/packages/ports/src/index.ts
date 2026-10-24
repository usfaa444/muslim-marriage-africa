export { mapInboundException } from './map-inbound-exception.js'

export {
  assertAuthContext,
  civilDayOuagadougou,
  copyErrorBody,
  ERROR_CODES,
  errorEnvelope,
  GENDERS,
  isErrorBody,
  isErrorEnvelope,
  isUuidV7,
  newId,
  uuidV7Instant,
  OUAGADOUGOU_TIME_ZONE,
  ROLES,
  toOuagadougouDisplay,
  toUtcStorage,
} from '@ankanu/kernel'

export type { AuthContext, ErrorBody, ErrorEnvelope, Gender, Role } from '@ankanu/kernel'

export type CilTicketKind = 'export' | 'erase'

export type CilTicketStatus = 'ready' | 'scheduled' | 'stalled' | 'completed'

export type OpenCilTicketResult = {
  id: string
  kind: CilTicketKind
  status: CilTicketStatus
}

export type ListedCilTicket = {
  id: string
  subject_account_id: string
  kind: CilTicketKind | 'access'
  status: CilTicketStatus
}

/** Operator is the only writer of `cil_ticket`. Identity passes its transaction into `openCilTicket`. */
export type OperatorPort = {
  openCilTicket(tx: unknown, input: { subjectAccountId: string; kind: CilTicketKind }): Promise<OpenCilTicketResult>
  listCilTickets(subjectAccountId: string): Promise<ListedCilTicket[]>
  markCilTicketStalled(ticketId: string): Promise<void>
}

export type AuditAppend = {
  actorId: string | null
  action: string
  payload: Record<string, string>
}

/** Audit is the only writer of `audit_event`. */
export type AuditPort = {
  append(tx: unknown, input: AuditAppend): Promise<void>
}

/** `true` is Premium. `false` and `unavailable` both sort as Free. */
export type BillingAnswer = boolean | 'unavailable'

/** Billing is the only writer of entitlement. Review may read `isEntitled` and must not write it. */
export type BillingPort = {
  isEntitled(accountId: string): Promise<BillingAnswer>
}

export type ConversationStage = 'invite' | 'chat' | 'meeting' | 'married'

export type OpenedConversation = {
  id: string
  invite_id: string
  stage: ConversationStage
}

/**
 * Chat owns `conversation` (AD-23). `openFromInvite` is the only insert: invites call it inside the accept
 * transaction (`tx`), after Sister consent. A second call for the same invite returns the existing conversation.
 * It never calls BillingPort and never touches `message_quota`.
 */
export type ChatPort = {
  openFromInvite(tx: unknown, input: { inviteId: string; now: Date }): Promise<OpenedConversation>
  conversationsForInvites(inviteIds: readonly string[]): Promise<OpenedConversation[]>
}

/** What a background scan covers: a Chat message, a pre-conversation Message Flash, or a media asset (AD-10). */
export type ScanItemKind = 'message' | 'flash' | 'asset'

/** Language a member chose for a Voice note: French, Mooré or Dioula (FR-051). A hint for the scan, never a hold (AD-11). */
export type VoiceLanguage = 'fr' | 'mos' | 'dyu'

/**
 * What Chat hands to moderation after persist. Text is plaintext from the owner (Chat decrypts). A Chat Photo or a
 * Voice note carries its media id only (Stories 5.3, 5.4): the Epic 8 worker reads the bytes with
 * `fetchChatMediaForScan(mediaId)` (AD-10 `MediaPort.fetchForScan`), so moderation never reads `message`.
 */
export type ScanPayload =
  | { kind: 'text'; text: string }
  | { kind: 'photo'; mediaId: string; contentType: string }
  | { kind: 'voice'; mediaId: string; contentType: string; durationMs: number; language: VoiceLanguage | null }

/**
 * Moderation is the only writer of `moderation_job` (AD-3, AD-10). Chat calls `enqueueScan` **after** a message is
 * persisted `delivered`; the call never decides delivery and the caller must not fail its send when it throws.
 * Moderation never reads `message` and never writes `message.state`.
 */
export type ModerationPort = {
  enqueueScan(input: { itemId: string; itemKind: ScanItemKind; accountId: string; payload: ScanPayload }): Promise<{ jobId: string }>
}

/**
 * Trust owns `block`, `report` and `moderation_case` (AD-3). Browse, profiles, favourites, invites and chat ask trust
 * whether two members are kept apart; they never read the `block` table. A Block hides both ways (FR-084).
 */
export type TrustPort = {
  /** True when either member blocked the other. */
  blockedBetween(a: string, b: string): Promise<boolean>
  /** Every member kept apart from this one: those they blocked and those who blocked them. */
  hiddenFor(accountId: string): Promise<string[]>
}
