/**
 * Optional verified-wali read. Epic 7 replaces the adapter with `mahram_link` SQL.
 * This story adds no mahram table.
 */
export type MahramPort = {
  verifiedWali(sisterId: string): Promise<boolean>
}

const stub: MahramPort = {
  async verifiedWali() {
    return false
  },
}

let port: MahramPort = stub

export function setMahramPort(next: MahramPort | undefined): void {
  port = next ?? stub
}

export function getMahramPort(): MahramPort {
  return port
}
