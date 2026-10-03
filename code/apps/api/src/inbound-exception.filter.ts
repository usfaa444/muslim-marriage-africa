import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import { errorEnvelope, newId, type ErrorEnvelope } from '@ankanu/kernel'
import { mapInboundException } from '@ankanu/ports'

type JsonResponse = {
  status: (code: number) => { json: (body: unknown) => void }
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
    response.status(httpStatus(exception)).json(toPublicEnvelope(exception))
  }
}
