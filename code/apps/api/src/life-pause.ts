import { ACTIVE_STATUS, DEACTIVATED_STATUS, HELD_STATUS } from './create-account.js'

export const ACCOUNT_STATUSES = [ACTIVE_STATUS, DEACTIVATED_STATUS, HELD_STATUS] as const

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const PAUSE_REASONS = ['ramadan', 'exams', 'travel', 'mourning'] as const

export const REASON_MESSAGE = 'reason : un motif est requis.'
export const NOTE_TYPE_MESSAGE = 'note : le texte est illisible.'
export const NOTE_CONTROL_MESSAGE = 'note : caractères de contrôle refusés.'
export const NOTE_LENGTH_MESSAGE = 'note : 200 caractères au maximum.'
export const HELD_PAUSE_MESSAGE = "La pause ne modifie pas un compte en attente."
export const NON_MEMBER_PAUSE_MESSAGE = 'Cette session ne peut pas modifier ce compte.'

const NOTE_MAX = 200
const CONTROL = /[\u0000-\u001F\u007F]/

export type PauseFieldError = { field: 'reason' | 'note'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isAccountStatus(value: string): value is AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value)
}

/** Validates the named pause, then drops it. Nothing here is stored or returned. */
export function acceptDeactivateBody(body: unknown): PauseFieldError | null {
  if (!isRecord(body)) {
    return { field: 'reason', message: REASON_MESSAGE }
  }
  const reason = body.reason
  if (typeof reason !== 'string' || !(PAUSE_REASONS as readonly string[]).includes(reason)) {
    return { field: 'reason', message: REASON_MESSAGE }
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'note') || body.note === undefined) {
    return null
  }
  const note = body.note
  if (typeof note !== 'string') {
    return { field: 'note', message: NOTE_TYPE_MESSAGE }
  }
  const trimmed = note.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (CONTROL.test(trimmed)) {
    return { field: 'note', message: NOTE_CONTROL_MESSAGE }
  }
  if (Array.from(trimmed).length > NOTE_MAX) {
    return { field: 'note', message: NOTE_LENGTH_MESSAGE }
  }
  return null
}
