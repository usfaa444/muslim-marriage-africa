import { createHash } from 'node:crypto'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { newId, toUtcStorage, uuidV7Instant } from '@ankanu/kernel'
import { account, auditEvent, cilTicket, credential, pinLock, profile, session, smsDispatch, verificationRecord } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'
import {
  ACTIVE_STATUS,
  DEACTIVATED_STATUS,
  HELD_STATUS,
  PENDING_DELETION_STATUS,
  type CreatedAccount,
  type CreatedProfile,
  type PasswordCredential,
} from './create-account.js'
import { isAccountStatus, type AccountStatus } from './life-pause.js'
import type { SessionRow } from './session-store.js'

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
export const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000
export const AUDIT_ZERO_HASH = '0'.repeat(64)
export const CONFIRM_MESSAGE = 'confirm : true est requis.'
export const EXPORT_BODY_MESSAGE = 'Le corps de la requête doit être vide.'
export const EXPORT_NOT_READY_MESSAGE = "L'archive n'est pas prête."
export const EXPORT_FAILED_MESSAGE = "La génération de l'archive a échoué."

const EXPORT_STATUSES: readonly AccountStatus[] = [
  ACTIVE_STATUS,
  DEACTIVATED_STATUS,
  HELD_STATUS,
  PENDING_DELETION_STATUS,
]
const DELETE_FROM: readonly AccountStatus[] = [ACTIVE_STATUS, DEACTIVATED_STATUS, HELD_STATUS]

export class ExportNotReadyError extends Error {
  constructor() {
    super('export not ready')
    this.name = 'ExportNotReadyError'
  }
}

export type TicketKind = 'export' | 'erase'
export type StoredKind = TicketKind | 'access'
export type TicketStatus = 'ready' | 'scheduled' | 'stalled' | 'completed'

export type StoredTicket = {
  id: string
  subject_account_id: string
  kind: StoredKind
  status: TicketStatus
}

export type TicketView = {
  id: string
  kind: TicketKind
  status: TicketStatus
  requested_at: string
  due_at: string
  status_url: string
  download_url: string | null
}

export type AuditRow = {
  id: string
  actor_id: string | null
  action: string
  payload: Record<string, string>
  prev_hash: string
  hash: string
}

export type DeleteOutcome =
  | { ok: true; account_status: typeof PENDING_DELETION_STATUS; ticket: TicketView }
  | { ok: false; reason: 'missing' }

export type OpenExportOutcome = { ok: true; ticket: TicketView } | { ok: false; reason: 'missing' | 'status' }

export type StatusOutcome =
  | { ok: true; account_status: AccountStatus; tickets: TicketView[] }
  | { ok: false; reason: 'missing' }

type VerificationExport = {
  kind: string
  status: string
  vendor: string | null
  phone_e164: string | null
  expires_at: string | null
}

type SmsExport = { template: string; created_at: string }

type SessionExport = { kind: string; expires_at: string; last_seen_at: string }

type CredentialExport = { kind: string; email_verified_at: string | null }

export type ProfileExport = {
  account_id: string
  dob: string
  city: string | null
  country: string | null
  origin: string | null
  marital_status: string | null
  polygamy_intent: string | null
  education: string | null
  profession: string | null
  madhhab: string | null
  practice: string | null
  life_plans: string | null
  bio_live: string | null
  bio_pending: string | null
  visibility: string | null
}

export type ExportFile = {
  format: 'ankanu-export-v1'
  ticket_id: string
  generated_at: string
  account: {
    id: string
    email: string
    pseudonym: string
    gender: string
    roles: string[]
    status: string
    age_attested: boolean
    coc_version: string
  }
  credential: CredentialExport[]
  profile: ProfileExport | null
  verification_record: VerificationExport[]
  sms_dispatch: SmsExport[]
  pin_lock: { pin_set: boolean }
  session: SessionExport[]
  cil_ticket: Array<Pick<StoredTicket, 'id' | 'subject_account_id' | 'kind' | 'status'>>
}

export type PinExportRow = { account_id: string; pin_hash: string }

export type RightsSource = {
  accounts: CreatedAccount[]
  credentials: PasswordCredential[]
  profiles: CreatedProfile[]
  sessions: SessionRow[]
  pins: PinExportRow[]
  verifications: Array<VerificationExport & { account_id: string }>
  sms: Array<SmsExport & { account_id: string }>
}

export type RightsStore = {
  deleteAccount(accountId: string): Promise<DeleteOutcome>
  openExport(accountId: string): Promise<OpenExportOutcome>
  exportAccount(accountId: string): Promise<ExportFile>
  exportStatus(accountId: string): Promise<StatusOutcome>
  stallReadyExport(accountId: string): Promise<void>
}

type MemoryBundle = RightsSource & {
  flags: { failExport: boolean }
  tickets: StoredTicket[]
  audits: AuditRow[]
}

let override: RightsStore | undefined

export function setRightsStore(store: RightsStore | undefined): void {
  override = store
}

export function getRightsStore(): RightsStore {
  if (override) {
    return override
  }
  return postgresRightsStore()
}

export function acceptDeleteBody(body: unknown): boolean {
  if (!isRecord(body)) {
    return false
  }
  const keys = Object.keys(body)
  return keys.length === 1 && keys[0] === 'confirm' && body.confirm === true
}

export function acceptExportBody(body: unknown): boolean {
  if (body === undefined || body === null) {
    return true
  }
  return isRecord(body) && Object.keys(body).length === 0
}

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

export function ticketView(row: StoredTicket): TicketView | null {
  if (row.kind === 'access') {
    return null
  }
  const requested = uuidV7Instant(row.id)
  const dueMs = row.kind === 'erase' ? THIRTY_DAYS_MS : SEVENTY_TWO_HOURS_MS
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    requested_at: toUtcStorage(requested),
    due_at: toUtcStorage(new Date(requested.getTime() + dueMs)),
    status_url: `/privacy/status/${row.id}`,
    download_url: row.kind === 'export' && row.status === 'ready' ? '/v1/me/export' : null,
  }
}

/** Profiles read used by the export. Callers do not select `profile` themselves. */
export async function readProfile(accountId: string, database = getIdentityDatabase()): Promise<ProfileExport | null> {
  const rows = await database.select().from(profile).where(eq(profile.account_id, accountId)).limit(1)
  const row = rows[0]
  if (!row) {
    return null
  }
  return profileExport(row)
}

export function profileExport(row: Partial<ProfileExport> & { account_id?: string; dob?: string }): ProfileExport {
  return {
    account_id: row.account_id ?? '',
    dob: row.dob ?? '',
    city: textOrNull(row.city),
    country: textOrNull(row.country),
    origin: textOrNull(row.origin),
    marital_status: textOrNull(row.marital_status),
    polygamy_intent: textOrNull(row.polygamy_intent),
    education: textOrNull(row.education),
    profession: textOrNull(row.profession),
    madhhab: textOrNull(row.madhhab),
    practice: textOrNull(row.practice),
    life_plans: textOrNull(row.life_plans),
    bio_live: textOrNull(row.bio_live),
    bio_pending: textOrNull(row.bio_pending),
    visibility: textOrNull(row.visibility),
  }
}

export function memoryRightsStore(source: RightsSource & { failExport?: boolean }): RightsStore & MemoryBundle {
  const tickets: StoredTicket[] = []
  const audits: AuditRow[] = []
  const flags = { failExport: source.failExport === true }
  const bundle: MemoryBundle = {
    ...source,
    flags,
    tickets,
    audits,
  }
  return {
    ...bundle,
    deleteAccount: (accountId) => Promise.resolve(memoryDelete(bundle, accountId)),
    openExport: (accountId) => Promise.resolve(memoryOpenExport(bundle, accountId)),
    exportAccount: (accountId) => Promise.resolve(memoryExport(bundle, accountId)),
    exportStatus: (accountId) => Promise.resolve(memoryStatus(bundle, accountId)),
    stallReadyExport: (accountId) => {
      memoryStall(bundle, accountId)
      return Promise.resolve()
    },
  }
}

function memoryDelete(bundle: MemoryBundle, accountId: string): DeleteOutcome {
  const row = bundle.accounts.find((item) => item.id === accountId)
  if (!row || !isAccountStatus(row.status)) {
    return { ok: false, reason: 'missing' }
  }
  if (row.status !== PENDING_DELETION_STATUS) {
    if (!DELETE_FROM.includes(row.status)) {
      return { ok: false, reason: 'missing' }
    }
    row.status = PENDING_DELETION_STATUS
  }
  const ticket = memoryOpen(bundle, accountId, 'erase')
  return { ok: true, account_status: PENDING_DELETION_STATUS, ticket }
}

function memoryOpenExport(bundle: MemoryBundle, accountId: string): OpenExportOutcome {
  const row = bundle.accounts.find((item) => item.id === accountId)
  if (!row || !isAccountStatus(row.status)) {
    return { ok: false, reason: 'missing' }
  }
  if (!EXPORT_STATUSES.includes(row.status)) {
    return { ok: false, reason: 'status' }
  }
  return { ok: true, ticket: memoryOpen(bundle, accountId, 'export') }
}

function memoryExport(bundle: MemoryBundle, accountId: string): ExportFile {
  const ready = newestOpen(bundle.tickets, accountId, 'export', 'ready')
  if (!ready) {
    throw new ExportNotReadyError()
  }
  if (bundle.flags.failExport) {
    throw new Error('export build failed')
  }
  const row = bundle.accounts.find((item) => item.id === accountId)
  if (!row) {
    throw new ExportNotReadyError()
  }
  const file = buildExportFile({
    ticketId: ready.id,
    generatedAt: authNow(),
    account: row,
    credentials: bundle.credentials.filter((item) => item.account_id === accountId),
    profile: bundle.profiles.find((item) => item.account_id === accountId) ?? null,
    verifications: bundle.verifications
      .filter((item) => item.account_id === accountId)
      .map(({ account_id: _accountId, ...item }) => item),
    sms: bundle.sms.filter((item) => item.account_id === accountId).map(({ account_id: _accountId, ...item }) => item),
    pinSet: bundle.pins.some((item) => item.account_id === accountId && item.pin_hash.length > 0),
    sessions: bundle.sessions.filter((item) => item.account_id === accountId),
    tickets: bundle.tickets.filter((item) => item.subject_account_id === accountId),
  })
  memoryAppend(bundle, accountId, 'subject_access_export', { ticket_id: ready.id })
  return file
}

function memoryStatus(bundle: MemoryBundle, accountId: string): StatusOutcome {
  const row = bundle.accounts.find((item) => item.id === accountId)
  if (!row || !isAccountStatus(row.status)) {
    return { ok: false, reason: 'missing' }
  }
  const tickets = bundle.tickets
    .filter((item) => item.subject_account_id === accountId)
    .sort((left, right) => right.id.localeCompare(left.id))
    .flatMap((item) => {
      const view = ticketView(item)
      return view ? [view] : []
    })
  return { ok: true, account_status: row.status, tickets }
}

function memoryStall(bundle: MemoryBundle, accountId: string): void {
  const ready = newestOpen(bundle.tickets, accountId, 'export', 'ready')
  if (ready) {
    ready.status = 'stalled'
  }
}

function memoryOpen(bundle: MemoryBundle, accountId: string, kind: TicketKind): TicketView {
  const existing = bundle.tickets
    .filter(
      (item) =>
        item.subject_account_id === accountId &&
        item.kind === kind &&
        (item.status === 'ready' || item.status === 'scheduled'),
    )
    .sort((left, right) => right.id.localeCompare(left.id))[0]
  if (existing) {
    const view = ticketView(existing)
    if (!view) {
      throw new Error('open ticket has no member view')
    }
    return view
  }
  const status: TicketStatus = kind === 'erase' ? 'scheduled' : 'ready'
  const row: StoredTicket = {
    id: newId(authNow()),
    subject_account_id: accountId,
    kind,
    status,
  }
  bundle.tickets.push(row)
  memoryAppend(bundle, accountId, 'cil_ticket.opened', { ticket_id: row.id, kind })
  const view = ticketView(row)
  if (!view) {
    throw new Error('new ticket has no member view')
  }
  return view
}

function newestOpen(
  tickets: StoredTicket[],
  accountId: string,
  kind: TicketKind,
  status: 'ready' | 'scheduled',
): StoredTicket | undefined {
  return tickets
    .filter((item) => item.subject_account_id === accountId && item.kind === kind && item.status === status)
    .sort((left, right) => right.id.localeCompare(left.id))[0]
}

function memoryAppend(bundle: MemoryBundle, actorId: string, action: string, payload: Record<string, string>): void {
  const prev = bundle.audits[bundle.audits.length - 1]?.hash ?? AUDIT_ZERO_HASH
  const id = newId(authNow())
  bundle.audits.push({
    id,
    actor_id: actorId,
    action,
    payload,
    prev_hash: prev,
    hash: chainHash(prev, id, actorId, action, payload),
  })
}

export function buildExportFile(input: {
  ticketId: string
  generatedAt: Date
  account: CreatedAccount
  credentials: Array<{ kind: string; email_verified_at: string | Date | null }>
  profile: (Partial<ProfileExport> & { account_id?: string; dob?: string }) | null
  verifications: VerificationExport[]
  sms: SmsExport[]
  pinSet: boolean
  sessions: Array<{ kind: string; expires_at: Date | string; last_seen_at: Date | string }>
  tickets: StoredTicket[]
}): ExportFile {
  return {
    format: 'ankanu-export-v1',
    ticket_id: input.ticketId,
    generated_at: toUtcStorage(input.generatedAt),
    account: {
      id: input.account.id,
      email: input.account.email,
      pseudonym: input.account.pseudonym,
      gender: input.account.gender,
      roles: [...input.account.roles],
      status: input.account.status,
      age_attested: input.account.age_attested,
      coc_version: input.account.coc_version,
    },
    credential: input.credentials.map((item) => ({
      kind: item.kind,
      email_verified_at: isoOrNull(item.email_verified_at),
    })),
    profile: input.profile ? profileExport(input.profile) : null,
    verification_record: input.verifications.map((item) => ({
      kind: item.kind,
      status: item.status,
      vendor: item.vendor,
      phone_e164: item.phone_e164,
      expires_at: item.expires_at,
    })),
    sms_dispatch: input.sms.map((item) => ({ template: item.template, created_at: item.created_at })),
    pin_lock: { pin_set: input.pinSet },
    session: input.sessions.map((item) => ({
      kind: item.kind,
      expires_at: isoOrNull(item.expires_at) ?? '',
      last_seen_at: isoOrNull(item.last_seen_at) ?? '',
    })),
    cil_ticket: input.tickets.map((item) => ({
      id: item.id,
      subject_account_id: item.subject_account_id,
      kind: item.kind,
      status: item.status,
    })),
  }
}

function postgresRightsStore(): RightsStore {
  return {
    deleteAccount: postgresDelete,
    openExport: postgresOpenExport,
    exportAccount: postgresExport,
    exportStatus: postgresStatus,
    stallReadyExport: postgresStall,
  }
}

async function postgresDelete(accountId: string): Promise<DeleteOutcome> {
  return getIdentityDatabase().transaction(async (tx) => {
    await lockAudit(tx)
    const current = await readStatusTx(tx, accountId)
    if (!current) {
      return { ok: false, reason: 'missing' }
    }
    if (current !== PENDING_DELETION_STATUS) {
      if (!DELETE_FROM.includes(current)) {
        return { ok: false, reason: 'missing' }
      }
      await tx
        .update(account)
        .set({ status: PENDING_DELETION_STATUS })
        .where(and(eq(account.id, accountId), inArray(account.status, [...DELETE_FROM])))
    }
    const opened = await openCilTicket(tx, accountId, 'erase')
    const view = ticketView(opened)
    if (!view) {
      throw new Error('erase ticket has no member view')
    }
    return { ok: true, account_status: PENDING_DELETION_STATUS, ticket: view }
  })
}

async function postgresOpenExport(accountId: string): Promise<OpenExportOutcome> {
  return getIdentityDatabase().transaction(async (tx) => {
    await lockAudit(tx)
    const current = await readStatusTx(tx, accountId)
    if (!current) {
      return { ok: false, reason: 'missing' }
    }
    if (!EXPORT_STATUSES.includes(current)) {
      return { ok: false, reason: 'status' }
    }
    const opened = await openCilTicket(tx, accountId, 'export')
    const view = ticketView(opened)
    if (!view) {
      throw new Error('export ticket has no member view')
    }
    return { ok: true, ticket: view }
  })
}

async function postgresExport(accountId: string): Promise<ExportFile> {
  const database = getIdentityDatabase()
  const ready = await readyExport(database, accountId)
  if (!ready) {
    throw new ExportNotReadyError()
  }
  const file = await database.transaction(async (tx) => {
    const accounts = await tx.select().from(account).where(eq(account.id, accountId)).limit(1)
    const owner = accounts[0]
    if (!owner) {
      throw new ExportNotReadyError()
    }
    const secrets = await tx
      .select({ kind: credential.kind, email_verified_at: credential.email_verified_at })
      .from(credential)
      .where(eq(credential.account_id, accountId))
    const person = await readProfile(accountId, tx)
    const checks = await tx
      .select({
        kind: verificationRecord.kind,
        status: verificationRecord.status,
        vendor: verificationRecord.vendor,
        phone_e164: verificationRecord.phone_e164,
        expires_at: verificationRecord.expires_at,
      })
      .from(verificationRecord)
      .where(eq(verificationRecord.account_id, accountId))
    const messages = await tx
      .select({ template: smsDispatch.template, created_at: smsDispatch.created_at })
      .from(smsDispatch)
      .where(eq(smsDispatch.account_id, accountId))
    const pins = await tx.select({ pin_hash: pinLock.pin_hash }).from(pinLock).where(eq(pinLock.account_id, accountId))
    const visits = await tx
      .select({ kind: session.kind, expires_at: session.expires_at, last_seen_at: session.last_seen_at })
      .from(session)
      .where(eq(session.account_id, accountId))
    const tickets = await tx.select().from(cilTicket).where(eq(cilTicket.subject_account_id, accountId))
    return buildExportFile({
      ticketId: ready.id,
      generatedAt: authNow(),
      account: {
        id: owner.id,
        email: owner.email,
        pseudonym: owner.pseudonym,
        gender: owner.gender as CreatedAccount['gender'],
        roles: owner.roles as CreatedAccount['roles'],
        status: owner.status as CreatedAccount['status'],
        age_attested: owner.age_attested,
        coc_version: owner.coc_version,
      },
      credentials: secrets,
      profile: person,
      verifications: checks.map((item) => ({
        kind: item.kind,
        status: item.status,
        vendor: item.vendor,
        phone_e164: item.phone_e164,
        expires_at: isoOrNull(item.expires_at),
      })),
      sms: messages.map((item) => ({
        template: item.template,
        created_at: isoOrNull(item.created_at) ?? '',
      })),
      pinSet: pins.some((item) => typeof item.pin_hash === 'string' && item.pin_hash.length > 0),
      sessions: visits,
      tickets: tickets.map(storedTicket),
    })
  })
  await getIdentityDatabase().transaction(async (tx) => {
    await lockAudit(tx)
    await appendAudit(tx, accountId, 'subject_access_export', { ticket_id: ready.id })
  })
  return file
}

async function postgresStatus(accountId: string): Promise<StatusOutcome> {
  const database = getIdentityDatabase()
  const current = await readStatusTx(database, accountId)
  if (!current) {
    return { ok: false, reason: 'missing' }
  }
  const rows = await database
    .select()
    .from(cilTicket)
    .where(eq(cilTicket.subject_account_id, accountId))
    .orderBy(desc(cilTicket.id))
  const tickets = rows.flatMap((row) => {
    const view = ticketView(storedTicket(row))
    return view ? [view] : []
  })
  return { ok: true, account_status: current, tickets }
}

async function postgresStall(accountId: string): Promise<void> {
  const ready = await readyExport(getIdentityDatabase(), accountId)
  if (!ready) {
    return
  }
  await getIdentityDatabase()
    .update(cilTicket)
    .set({ status: 'stalled' })
    .where(and(eq(cilTicket.id, ready.id), eq(cilTicket.status, 'ready')))
}

async function openCilTicket(
  tx: RightsTx,
  accountId: string,
  kind: TicketKind,
): Promise<StoredTicket> {
  const status: TicketStatus = kind === 'erase' ? 'scheduled' : 'ready'
  const existing = await tx
    .select()
    .from(cilTicket)
    .where(
      and(
        eq(cilTicket.subject_account_id, accountId),
        eq(cilTicket.kind, kind),
        eq(cilTicket.status, status),
      ),
    )
    .limit(1)
  const found = existing[0]
  if (found) {
    return storedTicket(found)
  }
  const row: StoredTicket = {
    id: newId(authNow()),
    subject_account_id: accountId,
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
            eq(cilTicket.subject_account_id, accountId),
            eq(cilTicket.kind, kind),
            inArray(cilTicket.status, ['ready', 'scheduled']),
          ),
        )
        .limit(1)
      const raced = again[0]
      if (raced) {
        return storedTicket(raced)
      }
    }
    throw error
  }
  await appendAudit(tx, accountId, 'cil_ticket.opened', { ticket_id: row.id, kind })
  return row
}

async function appendAudit(
  tx: RightsTx,
  actorId: string,
  action: string,
  payload: Record<string, string>,
): Promise<void> {
  const previous = await tx.select({ hash: auditEvent.hash }).from(auditEvent).orderBy(desc(auditEvent.id)).limit(1)
  const prev = previous[0]?.hash ?? AUDIT_ZERO_HASH
  const id = newId(authNow())
  await tx.insert(auditEvent).values({
    id,
    actor_id: actorId,
    action,
    payload,
    prev_hash: prev,
    hash: chainHash(prev, id, actorId, action, payload),
  })
}

async function lockAudit(tx: { execute: RightsTx['execute'] }): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ankanu.audit_event'))`)
}

async function readStatusTx(database: { select: RightsTx['select'] }, accountId: string): Promise<AccountStatus | null> {
  const rows = await database.select({ status: account.status }).from(account).where(eq(account.id, accountId)).limit(1)
  const status = rows[0]?.status
  if (!status || !isAccountStatus(status)) {
    return null
  }
  return status
}

async function readyExport(database: RightsTx, accountId: string): Promise<StoredTicket | null> {
  const rows = await database
    .select()
    .from(cilTicket)
    .where(
      and(eq(cilTicket.subject_account_id, accountId), eq(cilTicket.kind, 'export'), eq(cilTicket.status, 'ready')),
    )
    .orderBy(desc(cilTicket.id))
    .limit(1)
  const row = rows[0]
  return row ? storedTicket(row) : null
}

type RightsTx = Pick<ReturnType<typeof getIdentityDatabase>, 'execute' | 'insert' | 'select' | 'update'>

function storedTicket(row: {
  id: string
  subject_account_id: string
  kind: string
  status: string
}): StoredTicket {
  return {
    id: row.id,
    subject_account_id: row.subject_account_id,
    kind: row.kind as StoredKind,
    status: row.status as TicketStatus,
  }
}

function textOrNull(value: string | null | undefined): string | null {
  return typeof value === 'string' ? value : null
}

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return toUtcStorage(date)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
