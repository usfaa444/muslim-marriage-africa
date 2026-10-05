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
