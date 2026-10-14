/**
 * Invites owns invite counts (AD-3). Story 4.1 replaces this adapter with the
 * real count of invite rows whose UUID v7 `id` falls in the window. No invite
 * table exists until then, so zero is true.
 */
export type InvitesPort = {
  sentCountSince(accountId: string, since: Date): Promise<number>
}

const zeroInvites: InvitesPort = {
  async sentCountSince() {
    return 0
  },
}

let port: InvitesPort = zeroInvites

export function setInvitesPort(next: InvitesPort | undefined): void {
  port = next ?? zeroInvites
}

export function getInvitesPort(): InvitesPort {
  return port
}
