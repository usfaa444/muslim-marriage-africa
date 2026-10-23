import type { TrustPort } from '@ankanu/ports'
import { storeTrustPort } from './trust.js'

/** Browse, profiles, favourites, invites and chat ask trust through this port; none of them reads `block`. */
let port: TrustPort = storeTrustPort

export function setTrustPort(next: TrustPort | undefined): void {
  port = next ?? storeTrustPort
}

export function getTrustPort(): TrustPort {
  return port
}
