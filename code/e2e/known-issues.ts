// Console errors and failed requests that the guards tolerate, each with a reason.
// Every match is still attached to the test as a `known-issue` annotation, and QA
// lists open entries in its report. Remove an entry in the change that fixes it.
export type KnownIssue = { pattern: RegExp; reason: string; when?: () => boolean }

const webOnly = () => !process.env.E2E_BASE_URL

export const KNOWN_ISSUES: KnownIssue[] = [
  {
    pattern: /localhost:3100\/favicon\.ico/,
    reason: 'No favicon is served yet; every page logs a 404.',
  },
  {
    pattern: /localhost:3100\/v1\//,
    reason: 'The local web-only run has no API behind /v1. Full-stack checks run with E2E_BASE_URL.',
    when: webOnly,
  },
  {
    // Chromium's own message, logged from inside Google's anchor and bframe iframes for the
    // test site key in compose.yaml. Our page never calls requestStorageAccess.
    pattern:
      /^requestStorageAccess: Permission denied\. https:\/\/www\.google\.com\/recaptcha\/api2\/(?:anchor|bframe)\?(?:\S*&)?k=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI(?:&\S*)?$/,
    reason:
      "Google's reCAPTCHA iframes ask for third-party storage access on load and headless Chromium denies it. Third-party code, not ours.",
  },
  {
    // Logged from inside Google's anchor iframe when its own XHR for the release stylesheet is refused.
    pattern:
      /^Access to XMLHttpRequest at 'https:\/\/www\.gstatic\.com\/recaptcha\/releases\/[\w-]+\/styles__ltr\.css' from origin 'https:\/\/www\.google\.com' has been blocked by CORS policy: .*? https:\/\/www\.google\.com\/recaptcha\/api2\/(?:anchor|bframe)\?(?:\S*&)?k=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI(?:&\S*)?$/,
    reason: "Google's reCAPTCHA iframe loads its own stylesheet by XHR and gstatic refuses it by CORS. Third-party code, not ours.",
  },
  {
    // The same refused stylesheet, as Chromium's console line and as the guard's failed request.
    pattern:
      /^(?:Failed to load resource: net::ERR_FAILED |GET )https:\/\/www\.gstatic\.com\/recaptcha\/releases\/[\w-]+\/styles__ltr\.css(?: net::ERR_FAILED)?$/,
    reason: "The reCAPTCHA stylesheet that gstatic refuses to Google's own iframe. Third-party code, not ours.",
  },
  {
    // Google's report-only policy on its own frame; report-only means nothing is blocked.
    pattern:
      /^Framing 'https:\/\/www\.google\.com\/' violates the following report-only Content Security Policy directive: "frame-ancestors 'self'"\. The violation has been logged, but no further action has been taken\.(?: \S+)?$/,
    reason:
      "Google's reCAPTCHA frame carries a report-only frame-ancestors policy that logs when our page embeds it. Report-only, third-party, not ours.",
  },
]

// E2E_ALLOW_ERRORS is a comma-separated list of extra regexes, for an environment
// that cannot reach a host (for example a sandbox without CDN access).
for (const source of (process.env.E2E_ALLOW_ERRORS ?? '').split(',').filter(Boolean)) {
  KNOWN_ISSUES.push({ pattern: new RegExp(source), reason: `E2E_ALLOW_ERRORS: ${source}` })
}

export function knownIssue(text: string): KnownIssue | undefined {
  return KNOWN_ISSUES.find((issue) => (issue.when?.() ?? true) && issue.pattern.test(text))
}
