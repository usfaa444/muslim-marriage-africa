import { getInviteStore } from './invites.js'

/** One accepted invite seen from one member: the invite and the other member. */
export type AcceptedInvite = { inviteId: string; otherId: string }

/** Invites owns invite counts and states (AD-3). The defaults read real invite rows. */
export type InvitesPort = {
  sentCountSince(accountId: string, since: Date): Promise<number>
  /** Accepted invites where the member is sender or recipient (chat reads these, never the table). */
  acceptedFor(accountId: string): Promise<AcceptedInvite[]>
}

const storeInvites: InvitesPort = {
  async sentCountSince(accountId, since) {
    return getInviteStore().countSentSince(accountId, since)
  },
  async acceptedFor(accountId) {
    const rows = await getInviteStore().list(accountId, 'accepted')
    return rows.map((row) => ({ inviteId: row.id, otherId: row.from_id === accountId ? row.to_id : row.from_id }))
  },
}

let port: InvitesPort = storeInvites

export function setInvitesPort(next: InvitesPort | undefined): void {
  port = next ?? storeInvites
}

export function getInvitesPort(): InvitesPort {
  return port
}
