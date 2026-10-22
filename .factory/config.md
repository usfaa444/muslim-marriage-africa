# Software factory config: AnKanu

Read by the `factory-dev`, `factory-qa` and `feature-factory` skills. Keep it short and true. When a fact here changes, change it in the same PR.

## Models

- QA agent: **Claude Sonnet 5.5** (`claude-sonnet-5-5`), always. The orchestrator starts QA with the `factory-qa` agent in `.claude/agents/factory-qa.md`, which pins this model. A QA run on any other model is not a valid QA verdict.
- Developer agent: the session's default model.

## Sources of truth

- Stories and acceptance criteria: `_bmad-output/planning-artifacts/epics.md`, story specs in `_bmad-output/implementation-artifacts/spec-*.md`
- Functional and non-functional requirements: `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` (§5 for NFR targets)
- Architecture: `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/`
- UX: `_bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/` (`EXPERIENCE.md`, `DESIGN.md`, `review-accessibility.md`)
- Screen designs: `code/design-stitch/ankanu-v2/<nn-name>/screen.png` and `screen.html` (`MANIFEST.md` maps screens)
- Story status: BMAD sprint status (`bmad-sprint-planning`)

## Commands (run from `code/`)

| Step | Command |
| --- | --- |
| Install | `npm ci`, then `npx playwright install --with-deps chromium` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit | `npm run test:unit` |
| Integration | `npm run test:integration` (needs Docker) |
| Migration check | `npm run migration-check` |
| E2E, local web only | `npm run test:e2e` (starts the web app on port 3100; no API behind `/v1`) |
| E2E, against staging | `E2E_BASE_URL=https://staging.ankanu.com npm run test:e2e` |
| Full local stack | `docker compose up` (see `code/README.md`) |
| Dependency audit | `npm audit --omit=dev --audit-level=high` |

E2E tests live in `code/e2e/`. Import `test`, `expect`, `expectAccessible` and `expectNoHorizontalOverflow` from `./fixtures`. Every test already fails on console errors, page errors, failed requests and 5xx responses. Failure artefacts land in `code/e2e/test-results/` and `code/e2e/report/`. Tolerated errors live in `code/e2e/known-issues.ts`, each with a reason; QA lists every open entry in its report.

## Environments

- Staging: `https://staging.ankanu.com` (Next.js web in front of the API under `/v1`)
- reCAPTCHA on staging uses Google's test keys. A headless browser cannot tick the checkbox; open sessions with `POST /v1/sessions` and `recaptcha_token: test-ok`, which is what the panel sends.
- Test accounts: create disposable accounts per run. Staff verification on staging uses `STAGING_STAFF_VERIFICATION_GRANT`. Never use real member data.

## QA standards

- Widths: 360, 390, 768, 1024, 1280, 1440. No horizontal scroll at any width.
- Language: every MVP screen in French. Copy must match the Stitch design or the story exactly.
- Accessibility: WCAG 2.1 AA minimum (axe runs 2.2 AA tags); zero serious or critical violations; touch targets at least 44 by 44 px; keyboard-only path for every flow.
- Performance (NFR-005, low-end Android on 2G to 3G): Lite first grid at most 8 s, Chat open at most 4 s, send-text acknowledgement at most 2 s, no autoplay. Lighthouse mobile: LCP under 2.5 s, CLS under 0.1, INP under 200 ms on public pages.
- Security (NFR-001): server-side authorization on every endpoint (no session, other member, lower role); auth rate limits; argon2id passwords; no personal data in URLs, logs or client storage beyond the spec.
- Privacy (NFR-002, NFR-008): coarse geo only; photos stay blurred unless the spec allows.
- Auditability (NFR-009): events listed in the NFR are written for the actions this story touches.

## Handoffs and reports

- Developer handoff: `code/docs/qa-handoffs/<story-id>-qa-handoff.md`
- QA report: `code/docs/qa-handoffs/<story-id>-qa-report.md`, evidence in `code/docs/qa-handoffs/<story-id>-evidence/`

## Forbidden

- QA never edits product code, never pushes, never deploys, never changes staging data beyond disposable test accounts.
- No agent deploys to production, merges a PR, or opens a new epic without Fay's approval.
- Never skip, quarantine or weaken a test to get green.
