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
