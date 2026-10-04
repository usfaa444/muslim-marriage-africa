import { HttpException } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { readRlAuthPerMin } from './auth-limit.js'
import { takeAuthSlot } from './auth-rate.js'

export type IpRequest = {
  socket?: { remoteAddress?: string | null }
}

/** One bucket per client. IPv4-mapped IPv6 is the same address as the dotted form. */
export function clientIp(request: IpRequest): string {
  const address = request.socket?.remoteAddress
  if (typeof address !== 'string' || address.length === 0) {
    return ''
  }
  const mapped = address.toLowerCase().startsWith('::ffff:') ? address.slice('::ffff:'.length) : address
  return mapped.toLowerCase()
}

/** Counts the post, then refuses it when the IP is over `rl_auth_per_min`. */
export async function rejectIfAuthRateLimited(ip: string): Promise<void> {
  const limit = await readRlAuthPerMin()
  if (limit === null) {
    throw new HttpException(
      {
        code: 'UNHANDLED',
        message: 'Request failed',
        details: null,
        retryable: false,
      },
      500,
    )
  }
  if (!takeAuthSlot(ip, limit, authNow())) {
    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Cadence de requêtes régulée.',
        details: null,
        retryable: false,
      },
      429,
    )
  }
}
