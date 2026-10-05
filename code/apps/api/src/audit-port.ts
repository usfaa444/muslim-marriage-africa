import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { newId } from '@ankanu/kernel'
import type { AuditAppend, AuditPort } from '@ankanu/ports'
import { auditEvent } from './account-schema.js'
import { authNow } from './auth-clock.js'

export const AUDIT_ZERO_HASH = '0'.repeat(64)

export type AuditRow = {
  id: string
  actor_id: string | null
  action: string
  payload: Record<string, string>
  prev_hash: string
  hash: string
}

type AuditTx = Pick<NodePgDatabase, 'execute' | 'insert' | 'select'>

export function chainHash(
  prevHash: string,
  id: string,
  actorId: string | null,
  action: string,
  payload: Record<string, string>,
): string {
  const body = [prevHash, id, actorId ?? '', action, sortedJson(payload)].join('\n')
  return createHash('sha256').update(body).digest('hex')
}

/** Tail of the chain: the row whose hash is not another row's prev_hash. UUID order is not insert order. */
export function previousAuditHash(rows: Array<{ hash: string; prev_hash: string }>): string {
  if (rows.length === 0) {
    return AUDIT_ZERO_HASH
  }
  const referenced = new Set(rows.map((row) => row.prev_hash))
  const tails = rows.filter((row) => !referenced.has(row.hash))
  if (tails.length !== 1) {
    throw new Error('audit chain has no single tail')
  }
  return tails[0]?.hash ?? AUDIT_ZERO_HASH
}

export function memoryAuditPort(audits: AuditRow[]): AuditPort {
  return {
    async append(_tx, input) {
      const prev = audits[audits.length - 1]?.hash ?? AUDIT_ZERO_HASH
      const id = newId(authNow())
      audits.push({
        id,
        actor_id: input.actorId,
        action: input.action,
        payload: input.payload,
        prev_hash: prev,
        hash: chainHash(prev, id, input.actorId, input.action, input.payload),
      })
    },
  }
}

export function postgresAuditPort(): AuditPort {
  return {
    async append(tx, input) {
      await appendOn(asTx(tx), input)
    },
  }
}

async function appendOn(tx: AuditTx, input: AuditAppend): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ankanu.audit_event'))`)
  const rows = await tx.select({ hash: auditEvent.hash, prev_hash: auditEvent.prev_hash }).from(auditEvent)
  const prev = previousAuditHash(rows)
  const id = newId(authNow())
  await tx.insert(auditEvent).values({
    id,
    actor_id: input.actorId,
    action: input.action,
    payload: input.payload,
    prev_hash: prev,
    hash: chainHash(prev, id, input.actorId, input.action, input.payload),
  })
}

function asTx(tx: unknown): AuditTx {
  if (typeof tx !== 'object' || tx === null || !('insert' in tx) || !('select' in tx) || !('execute' in tx)) {
    throw new Error('AuditPort.append requires the caller transaction')
  }
  return tx as AuditTx
}

function sortedJson(value: Record<string, string>): string {
  const keys = Object.keys(value).sort()
  const sorted: Record<string, string> = {}
  for (const key of keys) {
    const item = value[key]
    if (item !== undefined) {
      sorted[key] = item
    }
  }
  return JSON.stringify(sorted)
}
