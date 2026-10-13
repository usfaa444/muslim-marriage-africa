import type { BillingAnswer, BillingPort } from '@ankanu/ports'

const unavailable: BillingPort = {
  async isEntitled(): Promise<BillingAnswer> {
    return 'unavailable'
  },
}

let port: BillingPort = unavailable

export function setBillingPort(next: BillingPort | undefined): void {
  port = next ?? unavailable
}

export function getBillingPort(): BillingPort {
  return port
}
