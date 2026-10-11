import { getCaptureStore } from './id-liveness-store.js'
import { getEmailVerificationStore } from './email-verification-store.js'
import { readPhoneOtp } from './phone-otp.js'
import { getPhoneOtpStore } from './phone-otp-store.js'

/** First unfinished signup step. `account` means ID and liveness both succeeded. */
export type SignupStep = 'email' | 'phone' | 'otp' | 'identity' | 'account'

export type SignupFacts = {
  emailVerified: boolean
  phone: 'none' | 'pending' | 'granted'
  idPassed: boolean
  livenessPassed: boolean
}

const PASSED = new Set(['pending', 'granted'])

export function signupStep(facts: SignupFacts): SignupStep {
  if (!facts.emailVerified) {
    return 'email'
  }
  if (facts.phone === 'none') {
    return 'phone'
  }
  if (facts.phone === 'pending') {
    return 'otp'
  }
  if (!facts.idPassed || !facts.livenessPassed) {
    return 'identity'
  }
  return 'account'
}

export function capturePassed(status: string | undefined): boolean {
  return status !== undefined && PASSED.has(status)
}

export async function readSignupStep(accountId: string): Promise<SignupStep> {
  const emailVerified = await getEmailVerificationStore().passwordVerified(accountId)
  const otp = await readPhoneOtp({ accountId, store: getPhoneOtpStore() })
  const phone = otp.body.status === 'pending' || otp.body.status === 'granted' ? otp.body.status : 'none'
  const idRow = await getCaptureStore().latest(accountId, 'id_document')
  const liveRow = await getCaptureStore().latest(accountId, 'liveness')
  return signupStep({
    emailVerified,
    phone,
    idPassed: capturePassed(idRow?.status),
    livenessPassed: capturePassed(liveRow?.status),
  })
}
