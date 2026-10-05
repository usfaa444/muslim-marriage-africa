import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ageGatePageHtml } from './age-gate-page.js'
import { authPageHtml } from './auth-page.js'
import { emailVerificationPageHtml } from './email-verification-page.js'
import { idLivenessPageHtml } from './id-liveness-page.js'
import { onboardingPageHtml } from './onboarding-page.js'
import { otpPageHtml } from './otp-page.js'
import { passwordResetPageHtml } from './password-reset-page.js'
import { photoRulesPageHtml } from './photo-rules-page.js'
import { pinPageHtml } from './pin-page.js'
import { profileEditPageHtml } from './profile-edit-page.js'
import { settingsPageHtml } from './settings-page.js'
import { statusPageHtml } from './status-page.js'

const DIALOG = /\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/

function stitch(folder: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../design-stitch/${folder}/screen.html`, import.meta.url)), 'utf8')
}

const pages: Record<string, string> = {
  auth: authPageHtml(stitch('11-auth')),
  'age-gate': ageGatePageHtml(stitch('12-age-gate')),
  'email-verification': emailVerificationPageHtml(stitch('13-email-verification'), null),
  otp: otpPageHtml(stitch('14-otp')),
  'password-reset': passwordResetPageHtml(stitch('15-password-reset')),
  onboarding: onboardingPageHtml(stitch('16-onboarding')),
  'id-liveness': idLivenessPageHtml(stitch('17-id-liveness')),
  'photo-rules': photoRulesPageHtml(stitch('18-photo-rules')),
  pin: pinPageHtml(stitch('19-pin-lock')),
  'profile-edit': profileEditPageHtml(stitch('21-profile-edit')),
  settings: settingsPageHtml(stitch('40-settings')),
  status: statusPageHtml(stitch('41-delete-export-status'), 'req-894-bf'),
}

describe('served pages', () => {
  it('does not call a native dialog', () => {
    for (const [name, html] of Object.entries(pages)) {
      expect(html, name).not.toMatch(DIALOG)
    }
  })
})
