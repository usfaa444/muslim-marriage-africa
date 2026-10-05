import { and, eq, inArray } from 'drizzle-orm'
import { toUtcStorage, uuidV7Instant } from '@ankanu/kernel'
import type { ListedCilTicket, OperatorPort } from '@ankanu/ports'
import { account, credential, pinLock, profile, session, smsDispatch, verificationRecord } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { AUDIT_ZERO_HASH, chainHash, memoryAuditPort, postgresAuditPort, type AuditRow } from './audit-port.js'
import { authNow } from './auth-clock.js'
import { memoryOperatorPort, postgresOperatorPort } from './operator-port.js'
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
export { AUDIT_ZERO_HASH, chainHash }
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

export class ExportBuildError extends Error {
  constructor() {
    super('export build failed')
    this.name = 'ExportBuildError'
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
  flags: { failExport: boolean; failAudit: boolean; failStall: boolean }
  tickets: StoredTicket[]
  audits: AuditRow[]
  operator: OperatorPort
  audit: ReturnType<typeof memoryAuditPort>
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
  const flags = { failExport: source.failExport === true, failAudit: false, failStall: false }
  const stored = memoryAuditPort(audits)
  const audit = {
    async append(tx: unknown, input: { actorId: string | null; action: string; payload: Record<string, string> }) {
      if (flags.failAudit && input.action === 'subject_access_export') {
        throw new Error('audit append failed')
      }
      await stored.append(tx, input)
    },
  }
  const operator = memoryOperatorPort(tickets, audit)
  const bundle: MemoryBundle = {
    ...source,
    flags,
    tickets,
    audits,
    operator,
    audit,
  }
  return {
    ...bundle,
    deleteAccount: (accountId) => memoryDelete(bundle, accountId),
    openExport: (accountId) => memoryOpenExport(bundle, accountId),
    exportAccount: (accountId) => memoryExport(bundle, accountId),
    exportStatus: (accountId) => memoryStatus(bundle, accountId),
    stallReadyExport: (accountId) => memoryStall(bundle, accountId),
  }
}

async function memoryDelete(bundle: MemoryBundle, accountId: string): Promise<DeleteOutcome> {
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
  const ticket = await memoryOpen(bundle, accountId, 'erase')
  return { ok: true, account_status: PENDING_DELETION_STATUS, ticket }
}

async function memoryOpenExport(bundle: MemoryBundle, accountId: string): Promise<OpenExportOutcome> {
  const row = bundle.accounts.find((item) => item.id === accountId)
  if (!row || !isAccountStatus(row.status)) {
    return { ok: false, reason: 'missing' }
  }
  if (!EXPORT_STATUSES.includes(row.status)) {
    return { ok: false, reason: 'status' }
  }
  return { ok: true, ticket: await memoryOpen(bundle, accountId, 'export') }
}

async function memoryExport(bundle: MemoryBundle, accountId: string): Promise<ExportFile> {
  const ready = newestOpen(bundle.tickets, accountId, 'export', 'ready')
  if (!ready) {
    throw new ExportNotReadyError()
  }
  if (bundle.flags.failExport) {
    throw new ExportBuildError()
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
    tickets: (await bundle.operator.listCilTickets(accountId)).map(storedTicket),
  })
  await bundle.audit.append(undefined, {
    actorId: accountId,
    action: 'subject_access_export',
    payload: { ticket_id: ready.id },
  })
  return file
}

async function memoryStatus(bundle: MemoryBundle, accountId: string): Promise<StatusOutcome> {
  const row = bundle.accounts.find((item) => item.id === accountId)
  if (!row || !isAccountStatus(row.status)) {
    return { ok: false, reason: 'missing' }
  }
  const listed = await bundle.operator.listCilTickets(accountId)
  const tickets = listed
    .sort((left, right) => right.id.localeCompare(left.id))
    .flatMap((item) => {
      const view = ticketView(storedTicket(item))
      return view ? [view] : []
    })
  return { ok: true, account_status: row.status, tickets }
}

async function memoryStall(bundle: MemoryBundle, accountId: string): Promise<void> {
  if (bundle.flags.failStall) {
    throw new Error('stall failed')
  }
  const ready = newestOpen(bundle.tickets, accountId, 'export', 'ready')
  if (ready) {
    await bundle.operator.markCilTicketStalled(ready.id)
  }
}

async function memoryOpen(bundle: MemoryBundle, accountId: string, kind: TicketKind): Promise<TicketView> {
  const opened = await bundle.operator.openCilTicket(undefined, { subjectAccountId: accountId, kind })
  const row = bundle.tickets.find((item) => item.id === opened.id)
  if (!row) {
    throw new Error('open ticket was not stored')
  }
  const view = ticketView(storedTicket(row))
  if (!view) {
    throw new Error('open ticket has no member view')
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

function postgresPorts(): { operator: OperatorPort; audit: ReturnType<typeof postgresAuditPort> } {
  const audit = postgresAuditPort()
  return { operator: postgresOperatorPort(audit), audit }
}

async function postgresDelete(accountId: string): Promise<DeleteOutcome> {
  const { operator } = postgresPorts()
  return getIdentityDatabase().transaction(async (tx) => {
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
    const opened = await operator.openCilTicket(tx, { subjectAccountId: accountId, kind: 'erase' })
    return { ok: true, account_status: PENDING_DELETION_STATUS, ticket: memberView(opened, accountId) }
  })
}

async function postgresOpenExport(accountId: string): Promise<OpenExportOutcome> {
  const { operator } = postgresPorts()
  return getIdentityDatabase().transaction(async (tx) => {
    const current = await readStatusTx(tx, accountId)
    if (!current) {
      return { ok: false, reason: 'missing' }
    }
    if (!EXPORT_STATUSES.includes(current)) {
      return { ok: false, reason: 'status' }
    }
    const opened = await operator.openCilTicket(tx, { subjectAccountId: accountId, kind: 'export' })
    return { ok: true, ticket: memberView(opened, accountId) }
  })
}

async function postgresExport(accountId: string): Promise<ExportFile> {
  const { operator, audit } = postgresPorts()
  const ready = await readyExport(operator, accountId)
  if (!ready) {
    throw new ExportNotReadyError()
  }
  const database = getIdentityDatabase()
  let file: ExportFile
  try {
    const tickets = await operator.listCilTickets(accountId)
    file = await database.transaction(async (tx) => {
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
  } catch (error) {
    if (error instanceof ExportNotReadyError) {
      throw error
    }
    throw new ExportBuildError()
  }
  await database.transaction(async (tx) => {
    await audit.append(tx, { actorId: accountId, action: 'subject_access_export', payload: { ticket_id: ready.id } })
  })
  return file
}

async function postgresStatus(accountId: string): Promise<StatusOutcome> {
  const { operator } = postgresPorts()
  const current = await readStatusTx(getIdentityDatabase(), accountId)
  if (!current) {
    return { ok: false, reason: 'missing' }
  }
  const rows = await operator.listCilTickets(accountId)
  const tickets = rows
    .sort((left, right) => right.id.localeCompare(left.id))
    .flatMap((row) => {
      const view = ticketView(storedTicket(row))
      return view ? [view] : []
    })
  return { ok: true, account_status: current, tickets }
}

async function postgresStall(accountId: string): Promise<void> {
  const { operator } = postgresPorts()
  const ready = await readyExport(operator, accountId)
  if (!ready) {
    return
  }
  await operator.markCilTicketStalled(ready.id)
}

async function readStatusTx(database: { select: RightsTx['select'] }, accountId: string): Promise<AccountStatus | null> {
  const rows = await database.select({ status: account.status }).from(account).where(eq(account.id, accountId)).limit(1)
  const status = rows[0]?.status
  if (!status || !isAccountStatus(status)) {
    return null
  }
  return status
}

async function readyExport(operator: OperatorPort, accountId: string): Promise<ListedCilTicket | null> {
  const rows = (await operator.listCilTickets(accountId))
    .filter((item) => item.kind === 'export' && item.status === 'ready')
    .sort((left, right) => right.id.localeCompare(left.id))
  return rows[0] ?? null
}

function memberView(opened: { id: string; kind: TicketKind; status: TicketStatus }, accountId: string): TicketView {
  const view = ticketView(
    storedTicket({
      id: opened.id,
      subject_account_id: accountId,
      kind: opened.kind,
      status: opened.status,
    }),
  )
  if (!view) {
    throw new Error('open ticket has no member view')
  }
  return view
}

type RightsTx = Pick<ReturnType<typeof getIdentityDatabase>, 'insert' | 'select' | 'update'>

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
