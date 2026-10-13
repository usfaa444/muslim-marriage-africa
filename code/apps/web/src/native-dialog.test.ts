import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  authHtml,
  emailHtml,
  idHtml,
  identityHtml,
  onboardingHtml,
  otpHtml,
  phoneHtml,
  photoHtml,
  pinHtml,
  profileHtml,
  resetHtml,
  reviewHtml,
  settingsHtml,
  splashHtml,
  statusHtml,
} from './v2-pages.js'

const DIALOG = /\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/

function stitch(folder: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../design-stitch/ankanu-v2/${folder}/screen.html`, import.meta.url)),
    'utf8',
  )
}

describe('v2 screens do not open a native dialog', () => {
  it('keeps every served script free of alert, confirm, and prompt', () => {
    const pages = [
      splashHtml(),
      identityHtml(stitch('03-age-gate')),
      authHtml(stitch('02-auth'), 'signup', 'site'),
      authHtml(stitch('02-auth'), 'login', 'site'),
      emailHtml(stitch('04-email-verification')),
      phoneHtml(stitch('06-otp')),
      otpHtml(stitch('56-otp-alt')),
      idHtml(stitch('07-id-liveness')),
      resetHtml(stitch('05-password-reset')),
      onboardingHtml(stitch('08-onboarding')),
      photoHtml(stitch('09-photo-rules')),
      pinHtml(stitch('10-pin-lock')),
      profileHtml(stitch('11-profile-edit')),
      reviewHtml(stitch('12-profile-not-yet-public'), { slaHours: 24, bioPending: true }),
      settingsHtml(stitch('27-settings')),
      statusHtml(stitch('28-delete-export-status')),
    ]
    for (const page of pages) {
      expect(page).not.toMatch(DIALOG)
    }
  })
})
