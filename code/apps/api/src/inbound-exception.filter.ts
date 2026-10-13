import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import { errorEnvelope, newId, type ErrorEnvelope } from '@ankanu/kernel'
import { mapInboundException } from '@ankanu/ports'

type StatusReply = {
  setHeader?: (name: string, value: string) => StatusReply
  json: (body: unknown) => void
}

type JsonResponse = {
  status: (code: number) => StatusReply
}

const BANNED = /dating|rencontre romantique/i

function showsBannedLexicon(message: string): boolean {
  if (BANNED.test(message)) {
    return true
  }
  try {
    return BANNED.test(decodeURIComponent(message))
  } catch {
    return false
  }
}

function showsStack(message: string): boolean {
  return message.includes('\n') || message.includes('    at ')
}

/** Client JSON is the AD-7 envelope. Paths and stacks never become the message. */
export function toPublicEnvelope(exception: unknown): ErrorEnvelope {
  const envelope = mapInboundException(exception, newId())
  if (!showsBannedLexicon(envelope.error.message) && !showsStack(envelope.error.message)) {
    return envelope
  }
  return errorEnvelope({
    code: envelope.error.code,
    message: 'Request failed',
    details: envelope.error.details,
    requestId: envelope.error.request_id,
    retryable: envelope.error.retryable,
  })
}

export function httpStatus(exception: unknown): number {
  if (typeof exception !== 'object' || exception === null || !('getStatus' in exception)) {
    return 500
  }
  const getStatus = exception.getStatus
  if (typeof getStatus !== 'function') {
    return 500
  }
  try {
    const status = getStatus.call(exception) as unknown
    if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599) {
      return status
    }
  } catch {
    return 500
  }
  return 500
}

@Catch()
export class InboundExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>()
    const reply = response.status(httpStatus(exception))
    const retryAfter = retryAfterHeader(exception)
    if (retryAfter !== null && typeof reply.setHeader === 'function') {
      reply.setHeader('Retry-After', String(retryAfter))
    }
    reply.json(toPublicEnvelope(exception))
  }
}

function retryAfterHeader(exception: unknown): number | null {
  if (typeof exception !== 'object' || exception === null || !('getResponse' in exception)) {
    return null
  }
  const getResponse = exception.getResponse
  if (typeof getResponse !== 'function') {
    return null
  }
  const body = getResponse.call(exception) as unknown
  if (typeof body !== 'object' || body === null || !('retryAfter' in body)) {
    return null
  }
  const seconds = (body as { retryAfter?: unknown }).retryAfter
  if (typeof seconds !== 'number' || !Number.isInteger(seconds) || seconds < 0) {
    return null
  }
  return seconds
}
