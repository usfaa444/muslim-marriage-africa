/**
 * The one published Report reason list (Story 8.5, FR-083; Stitch screen 23). The api validates `reason` against these
 * codes, the web renders these labels, and Story 8.7's case console reads the same list. Order is the Stitch order.
 * `misrepresented_marital_status` is the reason Story 4.4 AC 3 deferred here (FR-037 marital honesty).
 */
export const REPORT_REASONS = Object.freeze([
  { code: 'indecency', label: 'Indécence ou tenue inappropriée' },
  { code: 'sexual_content', label: 'Propos à caractère sexuel' },
  { code: 'impersonation', label: "Usurpation d'identité" },
  { code: 'multiple_accounts', label: 'Comptes multiples' },
  { code: 'harassment', label: 'Harcèlement ou insistance déplacée' },
  { code: 'money_scam', label: "Demande d'argent ou tentative d'escroquerie" },
  { code: 'hateful', label: 'Propos haineux ou irrespectueux' },
  { code: 'non_matrimonial', label: 'Usage non matrimonial' },
  { code: 'misrepresented_marital_status', label: 'Dissimulation ou fausse déclaration de situation matrimoniale' },
] as const)

export type ReportReason = (typeof REPORT_REASONS)[number]['code']

export const REPORT_REASON_CODES: readonly ReportReason[] = Object.freeze(REPORT_REASONS.map((item) => item.code))

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && (REPORT_REASON_CODES as readonly string[]).includes(value)
}

/** What a Report points at: a member's Profile, or one Chat message (FR-083). */
export type ReportTargetKind = 'profile' | 'message'

/** Optional free text for the moderators, at most this many characters. */
export const REPORT_DETAILS_MAX = 1000
