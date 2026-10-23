import { getInviteStore } from './invites.js'

/** Invites owns invite counts (AD-3). The default counts real invite rows whose UUID v7 `id` falls in the window. */
export type InvitesPort = {
  sentCountSince(accountId: string, since: Date): Promise<number>
}

const storeInvites: InvitesPort = {
  async sentCountSince(accountId, since) {
    return getInviteStore().countSentSince(accountId, since)
  },
}

let port: InvitesPort = storeInvites

export function setInvitesPort(next: InvitesPort | undefined): void {
  port = next ?? storeInvites
}

export function getInvitesPort(): InvitesPort {
  return port
}
