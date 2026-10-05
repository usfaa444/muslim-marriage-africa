import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { newId } from '@ankanu/kernel'
import type { AuditPort, CilTicketKind, ListedCilTicket, OpenCilTicketResult, OperatorPort } from '@ankanu/ports'
import { cilTicket } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'

type TicketTx = Pick<NodePgDatabase, 'insert' | 'select' | 'update'>

const OPEN_STATUSES = ['ready', 'scheduled'] as const

export function memoryOperatorPort(tickets: ListedCilTicket[], audit: AuditPort): OperatorPort {
  return {
    async openCilTicket(_tx, input) {
      const existing = tickets.find(
        (item) =>
          item.subject_account_id === input.subjectAccountId &&
          item.kind === input.kind &&
          (item.status === 'ready' || item.status === 'scheduled'),
      )
      if (existing && (existing.kind === 'export' || existing.kind === 'erase')) {
        return { id: existing.id, kind: existing.kind, status: existing.status }
      }
      const status = input.kind === 'erase' ? 'scheduled' : 'ready'
      const row: ListedCilTicket = {
        id: newId(authNow()),
        subject_account_id: input.subjectAccountId,
        kind: input.kind,
        status,
      }
      tickets.push(row)
      await audit.append(undefined, {
        actorId: input.subjectAccountId,
        action: 'cil_ticket.opened',
        payload: { ticket_id: row.id, kind: input.kind },
      })
      return { id: row.id, kind: input.kind, status }
    },
    async listCilTickets(subjectAccountId) {
      return tickets.filter((item) => item.subject_account_id === subjectAccountId)
    },
    async markCilTicketStalled(ticketId) {
      const row = tickets.find((item) => item.id === ticketId && item.status === 'ready')
      if (row) {
        row.status = 'stalled'
      }
    },
  }
}

export function postgresOperatorPort(audit: AuditPort): OperatorPort {
  return {
    async openCilTicket(tx, input) {
      return openOn(asTx(tx), audit, input.subjectAccountId, input.kind)
    },
    async listCilTickets(subjectAccountId) {
      const rows = await getIdentityDatabase()
        .select()
        .from(cilTicket)
        .where(eq(cilTicket.subject_account_id, subjectAccountId))
      return rows.map(listed)
    },
    async markCilTicketStalled(ticketId) {
      await getIdentityDatabase()
        .update(cilTicket)
        .set({ status: 'stalled' })
        .where(and(eq(cilTicket.id, ticketId), eq(cilTicket.status, 'ready')))
    },
  }
}

async function openOn(tx: TicketTx, audit: AuditPort, subjectAccountId: string, kind: CilTicketKind): Promise<OpenCilTicketResult> {
  const existing = await tx
    .select()
    .from(cilTicket)
    .where(
      and(
        eq(cilTicket.subject_account_id, subjectAccountId),
        eq(cilTicket.kind, kind),
        inArray(cilTicket.status, [...OPEN_STATUSES]),
      ),
    )
    .limit(1)
  const found = existing[0]
  if (found) {
    return opened(found)
  }
  const status = kind === 'erase' ? 'scheduled' : 'ready'
  const row = {
    id: newId(authNow()),
    subject_account_id: subjectAccountId,
    kind,
    status,
  }
  try {
    await tx.insert(cilTicket).values(row)
  } catch (error) {
    if (pgCode(error) === '23505') {
      const again = await tx
        .select()
        .from(cilTicket)
        .where(
          and(
            eq(cilTicket.subject_account_id, subjectAccountId),
            eq(cilTicket.kind, kind),
            inArray(cilTicket.status, [...OPEN_STATUSES]),
          ),
        )
        .limit(1)
      const raced = again[0]
      if (raced) {
        return opened(raced)
      }
    }
    throw error
  }
  await audit.append(tx, {
    actorId: subjectAccountId,
    action: 'cil_ticket.opened',
    payload: { ticket_id: row.id, kind },
  })
  return { id: row.id, kind, status }
}

function opened(row: { id: string; kind: string; status: string }): OpenCilTicketResult {
  if (row.kind !== 'export' && row.kind !== 'erase') {
    throw new Error('open cil ticket kind is not export or erase')
  }
  if (row.status !== 'ready' && row.status !== 'scheduled' && row.status !== 'stalled' && row.status !== 'completed') {
    throw new Error('open cil ticket status is not a catalog status')
  }
  return { id: row.id, kind: row.kind, status: row.status }
}

function listed(row: { id: string; subject_account_id: string; kind: string; status: string }): ListedCilTicket {
  if (row.kind !== 'export' && row.kind !== 'erase' && row.kind !== 'access') {
    throw new Error('cil ticket kind is not in the catalog')
  }
  if (row.status !== 'ready' && row.status !== 'scheduled' && row.status !== 'stalled' && row.status !== 'completed') {
    throw new Error('cil ticket status is not in the catalog')
  }
  return {
    id: row.id,
    subject_account_id: row.subject_account_id,
    kind: row.kind,
    status: row.status,
  }
}

function asTx(tx: unknown): TicketTx {
  if (typeof tx !== 'object' || tx === null || !('insert' in tx) || !('select' in tx)) {
    throw new Error('OperatorPort.openCilTicket requires the identity transaction')
  }
  return tx as TicketTx
}

function pgCode(error: unknown): string | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 6 && typeof current === 'object' && current !== null; depth += 1) {
    const record = current as { code?: unknown; cause?: unknown }
    if (typeof record.code === 'string') {
      return record.code
    }
    current = record.cause
  }
  return undefined
}
