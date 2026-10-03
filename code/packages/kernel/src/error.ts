import { newId } from './id.js'

/** Named machine codes from the API style catalog. `code` on the envelope stays a string. */
export const ERROR_CODES = Object.freeze({
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  CONTACT_SHARE_REQUIRED: 'CONTACT_SHARE_REQUIRED',
  REVEAL_DENIED: 'REVEAL_DENIED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  MESSAGE_CAP_EXCEEDED: 'MESSAGE_CAP_EXCEEDED',
  PAY_UNAVAILABLE: 'PAY_UNAVAILABLE',
  IDEMPOTENCY_REPLAY: 'IDEMPOTENCY_REPLAY',
  UNHANDLED: 'UNHANDLED',
} as const)

export type ErrorBody = {
  code: string
  message: string
  details: unknown
  request_id: string
  retryable: boolean
}

export type ErrorEnvelope = {
  error: ErrorBody
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isErrorBody(value: unknown): value is ErrorBody {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    'details' in value &&
    typeof value.request_id === 'string' &&
    typeof value.retryable === 'boolean'
  )
}

export function copyErrorBody(value: ErrorBody): ErrorBody {
  return {
    code: value.code,
    message: value.message,
    details: value.details,
    request_id: value.request_id,
    retryable: value.retryable,
  }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return isRecord(value) && isErrorBody(value.error)
}

export function errorEnvelope(fields: {
  code: string
  message: string
  details: unknown
  requestId?: string
  retryable: boolean
}): ErrorEnvelope {
  if (fields.code.length === 0 || fields.code.length > 64) {
    throw new TypeError('error code must be 1 to 64 characters')
  }
  const requestId = fields.requestId?.trim()
  return {
    error: {
      code: fields.code,
      message: fields.message,
      details: fields.details === undefined ? null : fields.details,
      request_id: requestId ? requestId : newId(),
      retryable: fields.retryable,
    },
  }
}
