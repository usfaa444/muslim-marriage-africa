import {
  ERROR_CODES,
  errorEnvelope,
  isErrorBody,
  isErrorEnvelope,
  type ErrorBody,
  type ErrorEnvelope,
} from '@ankanu/kernel'

const MACHINE_CODE = /^[A-Z][A-Z0-9_]{0,63}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 32 || code === 127) {
      return true
    }
  }
  return false
}

function safeMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    if (value.length > 400 || hasControlCharacter(value) || value.trim().length === 0) {
      return undefined
    }
    return value
  }
  if (!Array.isArray(value) || value.length === 0) {
    return undefined
  }
  if (!value.every((item) => typeof item === 'string' && !hasControlCharacter(item))) {
    return undefined
  }
  const joined = value.join('; ')
  if (joined.length > 400 || joined.trim().length === 0) {
    return undefined
  }
  return joined
}

function readNest(thrown: unknown): { status: number; response: unknown } | undefined {
  if (!isRecord(thrown)) {
    return undefined
  }
  const getStatus = thrown.getStatus
  const getResponse = thrown.getResponse
  if (typeof getStatus !== 'function' || typeof getResponse !== 'function') {
    return undefined
  }
  const status = getStatus.call(thrown) as unknown
  if (typeof status !== 'number' || !Number.isInteger(status)) {
    return undefined
  }
  return { status, response: getResponse.call(thrown) as unknown }
}

function codeForStatus(status: number, response: unknown): string {
  if (isRecord(response) && typeof response.code === 'string' && MACHINE_CODE.test(response.code)) {
    return response.code
  }
  if (status === 401) {
    return ERROR_CODES.UNAUTHENTICATED
  }
  if (status === 403) {
    return ERROR_CODES.FORBIDDEN
  }
  return ERROR_CODES.UNHANDLED
}

function messageFor(response: unknown): string {
  if (typeof response === 'string') {
    return safeMessage(response) ?? 'Request failed'
  }
  if (isRecord(response)) {
    return safeMessage(response.message) ?? 'Request failed'
  }
  return 'Request failed'
}

function detailsFor(response: unknown): unknown {
  if (!isRecord(response) || !('details' in response)) {
    return null
  }
  return response.details
}

function retryableFor(response: unknown): boolean {
  return isRecord(response) && typeof response.retryable === 'boolean' ? response.retryable : false
}

function fromParts(response: unknown, status: number, requestId: string | undefined): ErrorEnvelope {
  return errorEnvelope({
    code: codeForStatus(status, response),
    message: messageFor(response),
    details: detailsFor(response),
    ...(requestId ? { requestId } : {}),
    retryable: retryableFor(response),
  })
}

function throughEnvelope(body: ErrorBody): ErrorEnvelope {
  const requestId = body.request_id.trim()
  return errorEnvelope({
    code: body.code,
    message: body.message,
    details: body.details,
    ...(requestId ? { requestId } : {}),
    retryable: body.retryable,
  })
}

function unhandled(requestId: string | undefined): ErrorEnvelope {
  return errorEnvelope({
    code: ERROR_CODES.UNHANDLED,
    message: 'Request failed',
    details: null,
    ...(requestId ? { requestId } : {}),
    retryable: false,
  })
}

/**
 * Inbound mapping for a thrown value. Nest is not imported: domain code must not
 * take a framework dependency through this package. A Nest HttpException is recognized
 * by getStatus/getResponse. The return value is only the AD-7 envelope.
 */
export function mapInboundException(thrown: unknown, requestId?: string): ErrorEnvelope {
  try {
    return mapKnown(thrown, requestId)
  } catch {
    return unhandled(requestId)
  }
}

function mapKnown(thrown: unknown, requestId: string | undefined): ErrorEnvelope {
  if (isErrorEnvelope(thrown)) {
    return throughEnvelope(thrown.error)
  }

  if (isErrorBody(thrown)) {
    return throughEnvelope(thrown)
  }

  const nest = readNest(thrown)
  if (nest) {
    if (isErrorEnvelope(nest.response)) {
      return throughEnvelope(nest.response.error)
    }
    if (isErrorBody(nest.response)) {
      return throughEnvelope(nest.response)
    }
    return fromParts(nest.response, nest.status, requestId)
  }

  return unhandled(requestId)
}
