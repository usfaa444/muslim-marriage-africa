import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { memoryAuditPort, setAuditPort, type AuditRow } from './audit-port.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { createApp } from './create-app.js'
import { memoryEmailVerificationStore, setEmailVerificationStore } from './email-verification-store.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { createStaffAccount } from './staff-accounts.js'
import { runStaffCli } from './staff-cli.js'
import { assertStaffMfaBoot, openTotpSecret, readStaffMfaKey, sealTotpSecret, setStaffMfaKey } from './staff-mfa-key.js'
import { STAFF_IDLE_MS } from './staff-session.js'
import { memoryStaffStore, type MemoryStaffStore } from './staff-store.js'
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  matchTotpStep,
  otpauthUri,
  totpCode,
  totpStep,
} from './staff-totp.js'
import {
  freshCode,
  installTestStaff,
  openTestStaff,
  signInTestStaff,
  TEST_STAFF_MFA_KEY,
  TEST_STAFF_PASSWORD,
} from './test-staff-session.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const audits: AuditRow[] = []
let staffStore: MemoryStaffStore
let now = new Date('2026-10-22T09:00:00.000Z')
let serial = 0
const MEMBER_PASSWORD = 'phrase avec espaces'

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

function cookieOf(response: Response): string {
  const match = /ankanu_session=([^;]+)/.exec(response.headers.getSetCookie().join('\n'))
  expect(match?.[1]).toBeTruthy()
  return `ankanu_session=${match?.[1] ?? ''}`
}

function advance(ms: number): void {
  now = new Date(now.getTime() + ms)
}

describe('staff identity and authenticator MFA (Story 12.1)', () => {
  let app: INestApplication
  let base = ''
  const output: string[] = []
  const originalOut = process.stdout.write.bind(process.stdout)
  const originalErr = process.stderr.write.bind(process.stderr)

  beforeAll(async () => {
    setAuthClock(() => now)
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setPhoneOtpStore(memoryPhoneOtpStore())
    setCaptureStore(memoryCaptureStore({ accounts: memory.accounts, profiles: memory.profiles, phoneRows: [] }))
    setMediaStore(memoryMediaStore())
    setPinLockStore(memoryPinLockStore())
    setFreeReviewSlaReader(async () => 24)
    setEmailVerificationStore(memoryEmailVerificationStore(memory))
    setAuditPort(memoryAuditPort(audits))
    setBrowseLimitReader(async () => 1000)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
    // Everything the api writes to stdout or stderr during these tests is kept for the secret scan.
    process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      output.push(String(chunk))
      return (originalOut as (...args: unknown[]) => boolean)(chunk, ...rest)
    }) as typeof process.stdout.write
    process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      output.push(String(chunk))
      return (originalErr as (...args: unknown[]) => boolean)(chunk, ...rest)
    }) as typeof process.stderr.write
  })

  beforeEach(() => {
    staffStore = memoryStaffStore({ memberEmailTaken: (email) => memory.emailTaken(email) })
    installTestStaff(staffStore)
    setAuthLimitReader(async () => 1000)
    resetAuthRateWindow()
    resetPinEntries()
  })

  afterEach(() => {
    installTestStaff(undefined)
  })

  afterAll(async () => {
    process.stdout.write = originalOut
    process.stderr.write = originalErr
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setBrowseLimitReader(undefined)
    setAccountStore(undefined)
    setSessionStore(undefined)
    setProfileStore(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    setMediaStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    setFreeReviewSlaReader(undefined)
    setEmailVerificationStore(undefined)
    setAuditPort(undefined)
    if (app) {
      await app.close()
    }
  })

  async function createMember(gender: 'sister' | 'brother' = 'sister'): Promise<{ id: string; email: string }> {
    serial += 1
    const email = `member${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, json({
      email,
      password: MEMBER_PASSWORD,
      pseudonym: `Membre_${serial}`,
      gender,
      pledge_accepted: true,
      civil_given_name: 'Awa',
      civil_family_name: 'Sawadogo',
      recaptcha_token: 'test-ok',
      coc_version: 'FR-089',
      dob: '1990-01-15',
    }))
    expect(response.status).toBe(201)
    return { id: ((await response.json()) as { id: string }).id, email }
  }

  async function memberCookie(email: string): Promise<string> {
    const response = await fetch(`${base}/v1/sessions`, json({
      identifier: email,
      password: MEMBER_PASSWORD,
      remember_me: false,
      recaptcha_token: 'test-ok',
    }))
    expect(response.status).toBe(201)
    return cookieOf(response)
  }

  async function staffSignIn(email: string, password: string, token: string | null = 'test-ok'): Promise<Response> {
    return fetch(`${base}/v1/staff/sessions`, json(token === null ? { email, password } : { email, password, recaptcha_token: token }))
  }

  async function provision(role: 'moderator' | 'operator' = 'moderator') {
    serial += 1
    const created = await createStaffAccount({ email: `mod${serial}@example.bf`, role }, { store: staffStore })
    if (!created.ok) {
      throw new Error(created.message)
    }
    return created
  }

  async function code(cookie: string, value: string): Promise<Response> {
    return fetch(`${base}/v1/staff/sessions/mfa`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ code: value }),
    })
  }

  function get(path: string, cookie: string): Promise<Response> {
    return fetch(`${base}${path}`, { headers: { cookie } })
  }

  describe('TOTP (RFC 6238, SHA-1, 30 s, 6 digits)', () => {
    const rfcSecret = base32Encode(Buffer.from('12345678901234567890', 'ascii'))

    it('matches the RFC 6238 SHA-1 vectors truncated to six digits', () => {
      expect(totpCode(rfcSecret, new Date(59_000))).toBe('287082')
      expect(totpCode(rfcSecret, new Date(1_111_111_109_000))).toBe('081804')
      expect(totpCode(rfcSecret, new Date(1_234_567_890_000))).toBe('005924')
      expect(totpCode(rfcSecret, new Date(2_000_000_000_000))).toBe('279037')
      expect(hotp(base32Decode(rfcSecret), 0)).toBe('755224')
    })

    it('accepts the current step and one either side, once each, and nothing further', () => {
      const secret = generateTotpSecret()
      expect(secret).toMatch(/^[A-Z2-7]{32}$/)
      const at = new Date('2026-10-22T09:00:10.000Z')
      const step = totpStep(at)
      expect(matchTotpStep(secret, totpCode(secret, at), at, null)).toBe(step)
      expect(matchTotpStep(secret, totpCode(secret, at, -1), at, null)).toBe(step - 1)
      expect(matchTotpStep(secret, totpCode(secret, at, 1), at, null)).toBe(step + 1)
      const far = [totpCode(secret, at, -2), totpCode(secret, at, 2)].filter(
        (value) => ![-1, 0, 1].some((offset) => totpCode(secret, at, offset) === value),
      )
      for (const value of far) {
        expect(matchTotpStep(secret, value, at, null)).toBeNull()
      }
      expect(matchTotpStep(secret, totpCode(secret, at), at, step)).toBeNull()
      expect(matchTotpStep(secret, '12345', at, null)).toBeNull()
      expect(matchTotpStep(secret, 'abcdef', at, null)).toBeNull()
    })

    it('builds the otpauth URI the authenticator apps read', () => {
      expect(otpauthUri('mod@example.bf', 'JBSWY3DPEHPK3PXP')).toBe(
        'otpauth://totp/AnKanu:mod%40example.bf?secret=JBSWY3DPEHPK3PXP&issuer=AnKanu&algorithm=SHA1&digits=6&period=30',
      )
    })

    it('stores secrets as AES-256-GCM envelopes that do not contain the secret', () => {
      const secret = generateTotpSecret()
      const sealed = sealTotpSecret(secret, TEST_STAFF_MFA_KEY)
      expect(sealed).not.toContain(secret)
      expect(JSON.parse(sealed)).toMatchObject({ v: 1, alg: 'A256GCM', kid: 'test-staff-mfa' })
      expect(openTotpSecret(sealed, TEST_STAFF_MFA_KEY)).toBe(secret)
      expect(() => openTotpSecret(sealed, { key: Buffer.alloc(32, 1), kid: 'other' })).toThrow()
    })
  })

  describe('AC1 provisioning command', () => {
    it('creates a staff account with the role, prints the one-time password once and audits it', async () => {
      const out: string[] = []
      const err: string[] = []
      const before = audits.length
      const exit = await runStaffCli(['create', '--email', 'Mod.One@Example.bf', '--role', 'operator'], {
        out: (text) => out.push(text),
        err: (text) => err.push(text),
      })
      expect(exit).toBe(0)
      expect(err).toEqual([])
      const row = staffStore.accounts.find((item) => item.email === 'mod.one@example.bf')
      expect(row).toMatchObject({ roles: ['operator'], status: 'Active' })
      expect(row?.pseudonym).toMatch(/^staff_[0-9a-f]{12}$/)
      const printed = out.join('')
      const password = /One-time password \(shown once, change at first sign-in\): (\S+)/.exec(printed)?.[1] ?? ''
      expect(password).toMatch(/^[A-Za-z0-9_-]{24}$/)
      expect(printed.split(password).length - 1).toBe(1)
      expect(row?.password_hash).toMatch(/^\$argon2id\$/)
      expect(row?.password_hash).not.toContain(password)
      expect(staffStore.credentials.find((item) => item.account_id === row?.id)).toMatchObject({
        must_change_password: true,
        totp_sealed: null,
      })
      const created = audits.slice(before)
      expect(created.map((item) => item.action)).toEqual(['staff_account_created'])
      expect(created[0]?.payload).toEqual({ account_id: row?.id, role: 'operator', via: 'server_command' })
      expect(JSON.stringify(created)).not.toContain(password)
    })

    it('refuses an email that already exists, staff or member, and changes nothing', async () => {
      const first = await provision()
      const member = await createMember()
      const accounts = staffStore.accounts.length
      const before = audits.length
      for (const email of [first.email, member.email, member.email.toUpperCase()]) {
        const err: string[] = []
        const exit = await runStaffCli(['create', '--email', email, '--role', 'moderator'], {
          out: () => undefined,
          err: (text) => err.push(text),
        })
        expect(exit).toBe(1)
        expect(err.join('')).toContain('An account already uses this email. Nothing was changed.')
      }
      expect(staffStore.accounts.length).toBe(accounts)
      expect(audits.length).toBe(before)
      const memberRow = memory.accounts.find((item) => item.id === member.id)
      expect(memberRow?.roles).toEqual(['member'])
    })

    it('refuses a role other than moderator or operator, and bad usage', async () => {
      const io = { out: () => undefined, err: () => undefined }
      expect(await runStaffCli(['create', '--email', 'x@example.bf', '--role', 'member'], io)).toBe(1)
      expect(await runStaffCli(['create', '--email', 'x@example.bf', '--role', 'system'], io)).toBe(1)
      expect(await runStaffCli(['create', '--email', 'x@example.bf'], io)).toBe(2)
      expect(await runStaffCli(['grant', '--email', 'x@example.bf'], io)).toBe(2)
      expect(await runStaffCli(['reset-mfa', '--email', 'nobody@example.bf'], io)).toBe(1)
      expect(await runStaffCli(['disable', '--email', 'nobody@example.bf'], io)).toBe(1)
      expect(staffStore.accounts.length).toBe(0)
    })

    it('reset-mfa clears the enrollment, ends sessions and the next sign-in enrolls again', async () => {
      const staff = await openTestStaff(base, staffStore, 'moderator')
      expect((await get('/v1/staff/metrics', staff.cookie)).status).toBe(200)
      const before = audits.length
      const exit = await runStaffCli(['reset-mfa', '--email', staff.email], { out: () => undefined, err: () => undefined })
      expect(exit).toBe(0)
      expect(audits.slice(before).map((item) => item.action)).toEqual(['staff_mfa_reset'])
      expect((await get('/v1/staff/metrics', staff.cookie)).status).toBe(401)
      expect(staffStore.credentials.find((item) => item.account_id === staff.accountId)).toMatchObject({
        totp_sealed: null,
        totp_last_step: null,
      })
      const again = await staffSignIn(staff.email, TEST_STAFF_PASSWORD)
      expect(again.status).toBe(201)
      expect(await again.json()).toMatchObject({ kind: 'staff', mfa_state: 'enroll' })
      const enrollment = await get('/v1/staff/sessions/enrollment', cookieOf(again))
      expect(enrollment.status).toBe(200)
      const secret = ((await enrollment.json()) as { secret: string }).secret.replace(/\s/g, '')
      expect(secret).not.toBe(staff.secret)
    })

    it('disable ends the sessions, blocks sign-in with the generic failure, and is audited', async () => {
      const staff = await openTestStaff(base, staffStore, 'operator')
      const before = audits.length
      expect(await runStaffCli(['disable', '--email', staff.email], { out: () => undefined, err: () => undefined })).toBe(0)
      expect(audits.slice(before).map((item) => item.action)).toEqual(['staff_account_disabled'])
      expect((await get('/v1/staff/metrics', staff.cookie)).status).toBe(401)
      const refused = await staffSignIn(staff.email, TEST_STAFF_PASSWORD)
      expect(refused.status).toBe(401)
      expect(await refused.json()).toMatchObject({
        error: { code: 'UNAUTHENTICATED', message: 'Identifiant ou mot de passe incorrect.' },
      })
    })
  })

  describe('AC2 first sign-in: new password, QR and key, then a valid code', () => {
    it('walks password change, enrollment and the code; a wrong code keeps the session MFA-pending', async () => {
      const created = await provision()
      const opened = await staffSignIn(created.email, created.oneTimePassword)
      expect(opened.status).toBe(201)
      expect(opened.headers.get('cache-control')).toBe('no-store')
      expect(await opened.json()).toMatchObject({ kind: 'staff', mfa_state: 'password_change' })
      const setCookie = opened.headers.getSetCookie().join('\n')
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).not.toContain('Max-Age')
      const pending = cookieOf(opened)

      expect((await get('/v1/staff/sessions/enrollment', pending)).status).toBe(403)
      expect((await get('/v1/staff/cases?kind=profile_review', pending)).status).toBe(403)

      const post = (body: unknown) =>
        fetch(`${base}/v1/staff/sessions/password`, {
          method: 'POST',
          headers: { cookie: pending, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
      const same = await post({ new_password: created.oneTimePassword })
      expect(same.status).toBe(400)
      expect(await same.json()).toMatchObject({ error: { details: { field: 'new_password' } } })
      expect((await post({ new_password: 'court' })).status).toBe(400)
      const changed = await post({ new_password: TEST_STAFF_PASSWORD })
      expect(changed.status).toBe(200)
      expect(await changed.json()).toMatchObject({ mfa_state: 'enroll' })
      expect(audits.at(-1)?.action).toBe('staff_password_changed')
      expect((await post({ new_password: 'encore une autre phrase' })).status).toBe(403)

      const enrollment = await get('/v1/staff/sessions/enrollment', pending)
      expect(enrollment.status).toBe(200)
      expect(enrollment.headers.get('cache-control')).toBe('no-store')
      const body = (await enrollment.json()) as { otpauth_uri: string; secret: string; qr_svg: string }
      const secret = body.secret.replace(/\s/g, '')
      expect(body.secret).toMatch(/^([A-Z2-7]{4} ){7}[A-Z2-7]{4}$/)
      expect(body.otpauth_uri).toBe(otpauthUri(created.email, secret))
      expect(body.otpauth_uri.startsWith(`otpauth://totp/AnKanu:${encodeURIComponent(created.email)}?secret=`)).toBe(true)
      expect(body.qr_svg).toMatch(/^<svg[\s\S]*<\/svg>$/)
      const stored = staffStore.credentials.find((item) => item.account_id === created.accountId)
      expect(stored?.totp_pending_sealed).toBeTruthy()
      expect(stored?.totp_pending_sealed).not.toContain(secret)
      const again = (await (await get('/v1/staff/sessions/enrollment', pending)).json()) as { secret: string }
      expect(again.secret).toBe(body.secret)

      const wrong = await code(pending, totpCode(secret, now) === '000000' ? '111111' : '000000')
      expect(wrong.status).toBe(401)
      expect(await wrong.json()).toMatchObject({ error: { code: 'OTP_INVALID', message: 'Code incorrect.' } })
      expect(await (await get('/v1/staff/sessions/current', pending)).json()).toMatchObject({ mfa_state: 'enroll' })
      expect((await get('/v1/staff/metrics', pending)).status).toBe(403)

      const before = audits.length
      const verified = await code(pending, totpCode(secret, now))
      expect(verified.status).toBe(200)
      expect(await verified.json()).toMatchObject({ kind: 'staff', mfa_state: 'done' })
      expect(audits.slice(before).map((item) => item.action)).toEqual(['staff_mfa_enrolled', 'staff_sign_in'])
      const full = cookieOf(verified)
      expect(full).not.toBe(pending)
      expect((await get('/v1/staff/sessions/current', pending)).status).toBe(401)
      expect((await get('/v1/staff/metrics', full)).status).toBe(200)
      expect(await (await get('/v1/staff/sessions/current', full)).json()).toEqual({
        kind: 'staff',
        mfa_state: 'done',
        roles: ['moderator'],
        email: created.email,
        idle_timeout_seconds: 1800,
      })
      // After enrollment the secret is never sent again.
      expect((await get('/v1/staff/sessions/enrollment', full)).status).toBe(403)
      const enrolled = staffStore.credentials.find((item) => item.account_id === created.accountId)
      expect(enrolled?.totp_pending_sealed).toBeNull()
      expect(enrolled?.totp_sealed).toBeTruthy()
      expect(enrolled?.totp_sealed).not.toContain(secret)
    })
  })

  describe('AC3 enrolled sign-in', () => {
    it('gives a staff session for email, password and a valid code', async () => {
      const staff = await openTestStaff(base, staffStore, 'operator')
      advance(60_000)
      const opened = await staffSignIn(staff.email, TEST_STAFF_PASSWORD)
      expect(await opened.json()).toMatchObject({ mfa_state: 'verify' })
      const pending = cookieOf(opened)
      // A pending session never sees the secret again.
      expect((await get('/v1/staff/sessions/enrollment', pending)).status).toBe(403)
      const verified = await code(pending, totpCode(staff.secret, now))
      expect(verified.status).toBe(200)
      expect((await get('/v1/staff/metrics', cookieOf(verified))).status).toBe(200)
    })

    it('refuses a reused code and a code outside the ±1 step window', async () => {
      const staff = await openTestStaff(base, staffStore, 'moderator')
      advance(90_000)
      const first = await staffSignIn(staff.email, TEST_STAFF_PASSWORD)
      const used = totpCode(staff.secret, now)
      expect((await code(cookieOf(first), used)).status).toBe(200)
      const second = cookieOf(await staffSignIn(staff.email, TEST_STAFF_PASSWORD))
      const replay = await code(second, used)
      expect(replay.status).toBe(401)
      expect(await replay.json()).toMatchObject({ error: { code: 'OTP_INVALID', message: 'Code incorrect.' } })
      const window = [-1, 0, 1].map((offset) => totpCode(staff.secret, now, offset))
      // Replay plus two codes outside the window: three wrong codes, under the lock threshold of five.
      for (const offset of [-2, 2]) {
        const outside = totpCode(staff.secret, now, offset)
        if (!window.includes(outside)) {
          expect((await code(second, outside)).status).toBe(401)
        }
      }
      expect((await code(second, 'abc123')).status).toBe(400)
      expect((await get('/v1/staff/metrics', second)).status).toBe(403)
      // A code one step ahead is still inside the window and unused.
      expect((await code(second, totpCode(staff.secret, now, 1))).status).toBe(200)
    })

    it('locks sign-in for 15 minutes after 5 wrong codes, then opens again', async () => {
      const staff = await openTestStaff(base, staffStore, 'moderator')
      advance(60_000)
      const pending = cookieOf(await staffSignIn(staff.email, TEST_STAFF_PASSWORD))
      const valid = new Set([-1, 0, 1].map((offset) => totpCode(staff.secret, now, offset)))
      const wrongCodes = ['000000', '111111', '222222', '333333', '444444', '555555', '666666'].filter((item) => !valid.has(item))
      const before = audits.length
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        expect((await code(pending, wrongCodes[attempt - 1] ?? '')).status).toBe(401)
      }
      const locked = await code(pending, wrongCodes[4] ?? '')
      expect(locked.status).toBe(429)
      expect(locked.headers.get('retry-after')).toBe('900')
      expect(await locked.json()).toMatchObject({
        error: { code: 'RATE_LIMITED', message: 'Connexion verrouillée. Réessayez dans 15 minutes.', details: { reason: 'staff_locked' } },
      })
      const actions = audits.slice(before).map((item) => item.action)
      expect(actions.filter((item) => item === 'staff_sign_in_failure')).toHaveLength(5)
      expect(actions).toContain('staff_sign_in_locked')
      // The pending session ended, and even the right code waits for the lock.
      expect((await get('/v1/staff/sessions/current', pending)).status).toBe(401)
      const during = await staffSignIn(staff.email, TEST_STAFF_PASSWORD)
      expect(during.status).toBe(429)
      advance(14 * 60_000)
      expect((await staffSignIn(staff.email, TEST_STAFF_PASSWORD)).status).toBe(429)
      advance(61_000)
      const after = await staffSignIn(staff.email, TEST_STAFF_PASSWORD)
      expect(after.status).toBe(201)
      expect((await code(cookieOf(after), freshCode(staffStore, staff.accountId, staff.secret))).status).toBe(200)
    })

    it('answers wrong password, unknown email and a member account with the same generic failure', async () => {
      const staff = await openTestStaff(base, staffStore, 'moderator')
      const member = await createMember()
      const generic = { error: { code: 'UNAUTHENTICATED', message: 'Identifiant ou mot de passe incorrect.', details: null } }
      const before = audits.length
      for (const [email, password] of [
        [staff.email, 'mauvais mot de passe'],
        ['inconnu@example.bf', TEST_STAFF_PASSWORD],
        [member.email, MEMBER_PASSWORD],
      ] as const) {
        const response = await staffSignIn(email, password)
        expect(response.status).toBe(401)
        expect(await response.json()).toMatchObject(generic)
        expect(response.headers.getSetCookie()).toEqual([])
      }
      expect(audits.slice(before).map((item) => item.action)).toEqual([
        'staff_sign_in_failure',
        'staff_sign_in_failure',
        'staff_sign_in_failure',
      ])
      // A member account with a staff role is still not a staff account.
      const row = memory.accounts.find((item) => item.id === member.id)
      ;(row as { roles: string[] }).roles = ['moderator']
      expect((await staffSignIn(member.email, MEMBER_PASSWORD)).status).toBe(401)
      ;(row as { roles: string[] }).roles = ['member']
    })

    it('needs the captcha and is rate limited like member sign-in', async () => {
      const staff = await openTestStaff(base, staffStore, 'moderator')
      const noCaptcha = await staffSignIn(staff.email, TEST_STAFF_PASSWORD, null)
      expect(noCaptcha.status).toBe(400)
      expect(await noCaptcha.json()).toMatchObject({ error: { code: 'CAPTCHA_FAILED' } })
      expect((await staffSignIn(staff.email, TEST_STAFF_PASSWORD, 'test-bad')).status).toBe(400)
      resetAuthRateWindow()
      setAuthLimitReader(async () => 2)
      expect((await staffSignIn(staff.email, 'faux mot de passe 1')).status).toBe(401)
      expect((await staffSignIn(staff.email, 'faux mot de passe 2')).status).toBe(401)
      const limited = await staffSignIn(staff.email, TEST_STAFF_PASSWORD)
      expect(limited.status).toBe(429)
      expect(await limited.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } })
      const mfaLimited = await code(staff.cookie, '123456')
      expect(mfaLimited.status).toBe(429)
    })

    it('answers 503 without the MFA key and never opens a session', async () => {
      const created = await provision()
      setStaffMfaKey(null)
      const response = await staffSignIn(created.email, created.oneTimePassword)
      expect(response.status).toBe(503)
      expect(await response.json()).toMatchObject({ error: { code: 'STAFF_MFA_UNAVAILABLE' } })
      expect(staffStore.sessions).toEqual([])
    })
  })

  describe('AC4 separation', () => {
    const staffRoutes = ['/v1/staff/cases?kind=profile_review', '/v1/staff/metrics', '/v1/staff/signals/visits']
    const memberRoutes = ['/v1/accounts/gate', '/v1/me/profile', '/v1/browse', '/v1/favourites', '/v1/pin', '/v1/filters']

    it('refuses MFA-pending, member and Mahram sessions on every staff endpoint, even with a staff role', async () => {
      const created = await provision()
      const pending = cookieOf(await staffSignIn(created.email, created.oneTimePassword))
      const sister = await createMember('sister')
      const sisterCookie = await memberCookie(sister.email)
      const flipped = await createMember('brother')
      const flippedCookie = await memberCookie(flipped.email)
      ;(memory.accounts.find((item) => item.id === flipped.id) as { roles: string[] }).roles = ['moderator']
      const mahram = await createMember('brother')
      const mahramCookie = await memberCookie(mahram.email)
      ;(memory.accounts.find((item) => item.id === mahram.id) as { roles: string[] }).roles = ['mahram']
      for (const route of staffRoutes) {
        for (const cookie of [pending, sisterCookie, flippedCookie, mahramCookie]) {
          const response = await get(route, cookie)
          expect(response.status, `${route} ${cookie === pending ? 'pending' : 'member'}`).toBe(403)
        }
        expect((await fetch(`${base}${route}`)).status).toBe(401)
      }
      const pendingBody = await (await get('/v1/staff/metrics', pending)).json()
      expect(pendingBody).toMatchObject({ error: { code: 'FORBIDDEN', details: { reason: 'staff_mfa_pending' } } })
      const decide = await fetch(`${base}/v1/staff/cases`, {
        method: 'POST',
        headers: { cookie: flippedCookie, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(decide.status).toBe(403)
    })

    it('refuses a staff session on member endpoints, and an MFA-pending one too', async () => {
      const staff = await openTestStaff(base, staffStore, 'operator')
      const created = await provision()
      const pending = cookieOf(await staffSignIn(created.email, created.oneTimePassword))
      for (const route of memberRoutes) {
        const done = await get(route, staff.cookie)
        expect(done.status, route).toBe(403)
        expect(await done.json()).toMatchObject({
          error: {
            code: 'FORBIDDEN',
            message: "Cette session d'équipe ne peut pas ouvrir un espace membre.",
            details: { reason: 'staff_session' },
          },
        })
        const half = await get(route, pending)
        expect(half.status, route).toBe(403)
        expect(await half.json()).toMatchObject({ error: { details: { reason: 'staff_mfa_pending' } } })
      }
      const profile = await fetch(`${base}/v1/me/profile`, {
        method: 'PUT',
        headers: { cookie: staff.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ dob: '1990-01-15' }),
      })
      expect(profile.status).toBe(403)
      const pin = await fetch(`${base}/v1/pin`, {
        method: 'PUT',
        headers: { cookie: staff.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ pin: '123456' }),
      })
      expect(pin.status).toBe(403)
      expect((await get('/v1/staff/metrics', staff.cookie)).status).toBe(200)
    })

    it('ends a staff session after 30 idle minutes, slides while used, and signs out', async () => {
      const staff = await openTestStaff(base, staffStore, 'moderator')
      advance(STAFF_IDLE_MS - 60_000)
      expect((await get('/v1/staff/metrics', staff.cookie)).status).toBe(200)
      advance(STAFF_IDLE_MS - 60_000)
      expect((await get('/v1/staff/metrics', staff.cookie)).status).toBe(200)
      advance(STAFF_IDLE_MS)
      expect((await get('/v1/staff/metrics', staff.cookie)).status).toBe(401)

      advance(60_000)
      const again = await signInTestStaff(base, staffStore, staff)
      expect((await get('/v1/staff/metrics', again)).status).toBe(200)
      const out = await fetch(`${base}/v1/sessions/current`, { method: 'DELETE', headers: { cookie: again } })
      expect(out.status).toBe(204)
      expect((await get('/v1/staff/metrics', again)).status).toBe(401)
    })
  })

  describe('AC6 audit and logs carry no secret', () => {
    it('writes events without passwords, codes, secrets or otpauth URIs, and the log has none either', async () => {
      const from = audits.length
      const created = await provision()
      const opened = cookieOf(await staffSignIn(created.email, created.oneTimePassword))
      await fetch(`${base}/v1/staff/sessions/password`, {
        method: 'POST',
        headers: { cookie: opened, 'content-type': 'application/json' },
        body: JSON.stringify({ new_password: TEST_STAFF_PASSWORD }),
      })
      const enrollment = (await (await get('/v1/staff/sessions/enrollment', opened)).json()) as {
        secret: string
        otpauth_uri: string
      }
      const secret = enrollment.secret.replace(/\s/g, '')
      const used = totpCode(secret, now)
      await code(opened, used === '000000' ? '999999' : '000000')
      expect((await code(opened, used)).status).toBe(200)
      await staffSignIn(created.email, 'mauvais mot de passe')
      const events = audits.slice(from)
      expect(events.map((item) => item.action)).toEqual([
        'staff_account_created',
        'staff_password_changed',
        'staff_sign_in_failure',
        'staff_mfa_enrolled',
        'staff_sign_in',
        'staff_sign_in_failure',
      ])
      const text = JSON.stringify(events)
      const logged = output.join('')
      for (const secretValue of [created.oneTimePassword, TEST_STAFF_PASSWORD, 'mauvais mot de passe', secret, enrollment.secret, used, 'otpauth://']) {
        expect(text).not.toContain(secretValue)
        expect(logged).not.toContain(secretValue)
      }
      for (const event of events) {
        expect(Object.keys(event.payload).every((key) => ['account_id', 'role', 'via', 'reason', 'locked_until'].includes(key))).toBe(true)
      }
    })

    it('refuses a production boot without the MFA key and any boot with a malformed one', () => {
      const key = Buffer.alloc(32, 3).toString('base64')
      expect(() => assertStaffMfaBoot({ NODE_ENV: 'production' })).toThrow('STAFF_MFA_KEY and STAFF_MFA_KID are required in production')
      expect(() => assertStaffMfaBoot({ NODE_ENV: 'production', STAFF_MFA_KEY: key })).toThrow()
      expect(() => assertStaffMfaBoot({ STAFF_MFA_KEY: Buffer.alloc(16).toString('base64'), STAFF_MFA_KID: 'k' })).toThrow()
      expect(() => assertStaffMfaBoot({ NODE_ENV: 'production', STAFF_MFA_KEY: key, STAFF_MFA_KID: 'k1' })).not.toThrow()
      // The staging-style stack (reCAPTCHA test keys opted in) still boots; staff sign-in then answers 503.
      expect(() => assertStaffMfaBoot({ NODE_ENV: 'production', RECAPTCHA_ALLOW_TEST_KEYS: '1' })).not.toThrow()
      expect(() => assertStaffMfaBoot({})).not.toThrow()
      setStaffMfaKey(undefined)
      expect(readStaffMfaKey({ STAFF_MFA_KEY: key, STAFF_MFA_KID: 'k1' })).toEqual({ key: Buffer.alloc(32, 3), kid: 'k1' })
      expect(readStaffMfaKey({})).toBeNull()
    })
  })
})
