import { authNow } from './auth-clock.js'
import { createStaffAccount } from './staff-accounts.js'
import { setStaffMfaKey } from './staff-mfa-key.js'
import { setStaffStore, type MemoryStaffStore, type StaffRole } from './staff-store.js'
import { totpStep, totpCode } from './staff-totp.js'

/**
 * Test-only helper: a real staff session through the public staff sign-in API (password change, enrollment, code).
 * The key and passwords here are fake values made for tests.
 */

export const TEST_STAFF_MFA_KEY = Object.freeze({ key: Buffer.alloc(32, 0x5a), kid: 'test-staff-mfa' })
export const TEST_STAFF_PASSWORD = 'phrase staff de test'

export function installTestStaff(store: MemoryStaffStore | undefined): void {
  setStaffStore(store)
  setStaffMfaKey(store ? TEST_STAFF_MFA_KEY : undefined)
}

export type TestStaff = {
  accountId: string
  email: string
  secret: string
  cookie: string
}

let serial = 0

function cookieFrom(response: Response): string {
  const header = response.headers.getSetCookie().join('\n')
  const match = /ankanu_session=([^;]+)/.exec(header)
  if (!match?.[1]) {
    throw new Error(`expected a session cookie (status ${response.status})`)
  }
  return `ankanu_session=${match[1]}`
}

async function expectStatus(response: Response, status: number, step: string): Promise<void> {
  if (response.status !== status) {
    throw new Error(`${step}: expected ${status}, got ${response.status} ${await response.text()}`)
  }
}

/** A code for a step the account has not used yet. */
export function freshCode(store: MemoryStaffStore, accountId: string, secret: string): string {
  const last = store.credentials.find((row) => row.account_id === accountId)?.totp_last_step ?? null
  const now = authNow()
  for (const offset of [-1, 0, 1]) {
    if (last === null || totpStep(now) + offset > last) {
      return totpCode(secret, now, offset)
    }
  }
  throw new Error('every code in the window was used; advance the test clock by 30 seconds')
}

/** Creates a staff account with the server command and walks the whole first sign-in. */
export async function openTestStaff(base: string, store: MemoryStaffStore, role: StaffRole): Promise<TestStaff> {
  serial += 1
  const email = `staff${serial}-${Date.now().toString(36)}@example.bf`
  const created = await createStaffAccount({ email, role }, { store })
  if (!created.ok) {
    throw new Error(created.message)
  }
  const opened = await fetch(`${base}/v1/staff/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: created.oneTimePassword, recaptcha_token: 'test-ok' }),
  })
  await expectStatus(opened, 201, 'staff sign-in')
  const pending = cookieFrom(opened)
  const changed = await fetch(`${base}/v1/staff/sessions/password`, {
    method: 'POST',
    headers: { cookie: pending, 'content-type': 'application/json' },
    body: JSON.stringify({ new_password: TEST_STAFF_PASSWORD }),
  })
  await expectStatus(changed, 200, 'staff password change')
  const enrollment = await fetch(`${base}/v1/staff/sessions/enrollment`, { headers: { cookie: pending } })
  await expectStatus(enrollment, 200, 'staff enrollment')
  const secret = ((await enrollment.json()) as { secret: string }).secret.replace(/\s/g, '')
  const verified = await fetch(`${base}/v1/staff/sessions/mfa`, {
    method: 'POST',
    headers: { cookie: pending, 'content-type': 'application/json' },
    body: JSON.stringify({ code: freshCode(store, created.accountId, secret) }),
  })
  await expectStatus(verified, 200, 'staff code')
  return { accountId: created.accountId, email, secret, cookie: cookieFrom(verified) }
}

/** Signs an enrolled staff account in again: password, then a code for an unused step. */
export async function signInTestStaff(base: string, store: MemoryStaffStore, staff: TestStaff): Promise<string> {
  const opened = await fetch(`${base}/v1/staff/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: staff.email, password: TEST_STAFF_PASSWORD, recaptcha_token: 'test-ok' }),
  })
  await expectStatus(opened, 201, 'staff sign-in')
  const pending = cookieFrom(opened)
  const verified = await fetch(`${base}/v1/staff/sessions/mfa`, {
    method: 'POST',
    headers: { cookie: pending, 'content-type': 'application/json' },
    body: JSON.stringify({ code: freshCode(store, staff.accountId, staff.secret) }),
  })
  await expectStatus(verified, 200, 'staff code')
  return cookieFrom(verified)
}
