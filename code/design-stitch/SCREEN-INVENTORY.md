# AnKanu — screen inventory (redo, no Stitch)

Status: **awaiting founder approval** (redo after founder: first file was not full enough).

No Google Stitch. No HTML. No PNG. Mock HTML under `_bmad-output/.../mockups/` was **not** used. `DESIGN.md` is tokens only and does not add screens.

This file lists every MVP screen the three sources name, and every UI element those sources actually name (controls, labels, states). If a needed element is not specified, the screen says **Unspecified** — do not invent it.

## Sources (only)

| Source | Path |
|---|---|
| Product brief | `_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/brief.md` |
| PRD (every FR, not epics one-liners) | `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` |
| EXPERIENCE.md | `_bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md` |

Screen names are EXPERIENCE.md IA / traceability names unless marked **PRD-named, IA omitted**.

## How each screen is listed

- **Reached from / Implements** — EXPERIENCE.md IA row.
- **Controls** — every named control, field, button, toggle, chip, banner.
- **Labels** — exact copy the sources give. If they give no string, it says so.
- **Dialogs** — named dialogs / interstitials / walls on that surface.
- **Empty / Loading / Error / Success** — EXPERIENCE.md State Patterns for that surface. Screens that only “inherit `empty-state` + `error-banner`” still get those two components spelled out here (the previous file left them as a one-liner).
- **Unspecified** — PRD/brief require a behaviour but do not name chrome. Stop. Do not invent.

## Shared chrome (named)

### Member shell (Sister / Brother)

- Phone-first.
- Bottom nav, four items, labels `[ASSUMPTION]`: **Découvrir · Invitations · Discussions · Profil**.
- Modal stack: one level.
- Time display: `Africa/Ouagadougou`. Invite quotas (Brothers always; Sisters when `same_quota_as_brothers`) and the Free message cap reset on that civil day.
- French-first on every primary screen (FR-137).
- Touch targets ≥44px (48px on primary actions).
- `{components.button-primary}`: one commit per screen; disabled until required fields valid; never a send that waits on AI.
- `{components.button-secondary}`: cancel / later; must not look more urgent than quiet decline.
- `{components.button-quiet}`: quiet decline, Revoke, remove Mahram; no confirm-shaming.
- `{components.error-banner}`: AD-7 `error.code` mapped to French. `PAY_UNAVAILABLE` does not disable Chat, Report, Blur, Mahram, Verification, or Block.
- `{components.empty-state}`: one sentence + one action. Zero results never invent Profiles.

### Mahram shell

- Phone-first.
- **No** Découvrir. **No** Invitations. **No** Invite. **No** compose.
- No browse identity. `[ASSUMPTION]` Mahram accounts cannot send Invites or appear in people lists.

### Staff shell

- `{components.staff-only-badge}` on every staff surface.
- Two-pane from 768px; stacked below. Members never see this chrome.
- Staff unblur control is not in the member tab order.

### Public shell

- Footer links to Legal hub and FAQ (EXPERIENCE.md IA).
- Cookie consent on first hit.
- No member bottom nav.

### Audio (only where named)

Mooré / Dioula `{components.audio-prompt}` on: onboarding, photo rules, no-auto-renew pricing line, Mahram invite explainers. 2G fail → pictograms remain. Failure → pictogram path remains.

### Banned on every surface (do not design)

pending-moderation / held / scan-wait Chat; GIF picker; Apple sign-in; brother-free mode; first-wife notification; who-favourited-me; member visitors; online-now; invented DAU / « +247.8k actifs »; testimonials carousel (NEXT); public likes; heart stack; « en ligne »; live 1:1 A/V; story rings; operator-as-member session; dating / *rencontre romantique* lexicon.

## Out of MVP — named so they are not invented as shipping

Mahram dashboard (multi-ward + digest); meeting planner (time/place/attendees — MVP has stage **meeting** only); native iOS + Apple sign-in; advanced paid filters; who favourited me; visitors list; online-now; anonymous mode; boosts; Premium badge as identity; GIF/sticker picker; USSD; anti-leak watermark/screenshot-notice; AI coach; blog; promo video; testimonials carousel; remaining SEO locales; language filters; quiet hours; Istikhara companion; Mahr conversation card; mosque attestation; alumni mentorship; English/Arabic UI.

---

# 1. Public

## Public landing

- **Reached from:** cold URL / store
- **Implements:** FR-101, FR-117, AD-25

**Controls**

- Honorable ta'aruf pitch. Allowed words only: *mariage / ta'aruf / nikah / khitba*.
- Verified-marriages counter.
- Entry to signup / pricing / Académie / Board / showcase **as linked from this spine** (EXPERIENCE.md: “entry to signup / pricing / Académie / Board / showcase as linked from this spine”).
- Footer to Legal hub / FAQ.

**Labels**

- Counter copy: **« Mariages confirmés : 0 »** until dual-confirm.
- Do not invent DAU or « +247.8k actifs ».

**Dialogs**

- Cookie consent on first public hit (own surface below).

**Empty**

- Counter at 0 is valid.

**Loading**

- Inherit `{components.empty-state}` is not the loading rule here. State Patterns: public surfaces inherit `{components.error-banner}` on error. Loading chrome for landing is **Unspecified**.

**Error**

- `{components.error-banner}` (inherit). Exact French for a landing fetch fail is **Unspecified**.

**Success**

- Visitor can continue to Auth or content.

**Unspecified**

- Hero layout, image, extra CTAs, nav beyond footer + the linked entries above. SEO pages (FR-117) are a separate PRD-named surface, not extra landing chrome.

## Legal hub

- **Reached from:** footer
- **Implements:** FR-109, FR-119, FR-120, AD-5, AD-19

**Controls**

- Mentions.
- CGV / refunds (must match pricing summary).
- Cookies.
- Privacy with hosting/CIL line Operators cannot hide (FR-120). Hosting location string is present.

**Labels**

- EXPERIENCE.md names the four documents. Exact headings beyond Mentions / CGV / cookies / privacy are **Unspecified**.
- A3: hosting disclosure ships the AD-5 French sentence; A3 text is not rewritten here.

**Dialogs**

- None named.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` (one sentence + one action; exact sentence **Unspecified**) + `{components.error-banner}`.

**Success**

- Visitor can read Mentions, CGV, cookies, privacy; hosting line visible.

**Unspecified**

- Four separate page layouts vs one hub with four documents — EXPERIENCE.md names **one hub**. Do not invent extra chrome per document.
- D6 “when the Member opens D6 policy” (FR-066) is not a named Legal-hub document (see Gaps).
- Standalone Code of conduct page (FR-089) is not named here (see Gaps).

## Public pricing

- **Reached from:** landing / settings
- **Implements:** FR-044, FR-045, FR-105, FR-106, FR-108, FR-145, FR-146, AD-14

**Controls**

- `{components.pack-card}` for 1 / 3 / 6 month packs in XOF (FCFA symbol allowed).
- Free tier described.
- Launch price **and** normal price both shown when a launch price exists (FR-108).
- `{components.audio-prompt}` on the no-auto-renew line.
- Rails offered: Orange Money BF, Moov Africa BF, Wave/Coris where available; cards secondary. Free Money / MTN MoMo **absent**.
- Path that matches checkout numbers.

**Labels**

- **« Pas de renouvellement automatique. »**
- Brother / Sister `same_quota_as_brothers`: same pack list and Free Invite cap as checkout.
- Sister `free_unlimited`: **« Invitations illimitées. »**; pack listed for unlimited messages, not required for Invite reach.
- Message remaining: show the current admin `daily_message_cap` — do not lock a number in copy.
- Premium vs Free differences named on the page: unlimited Invites (vs Free Invite cap), unlimited messages (vs FR-146), queue priority for FR-012. No Premium Invite cap of 15.
- Single published free-review SLA on public help/pricing (FR-013). Which line on this page vs FAQ is **Unspecified**.
- No brother-free pack.

**Dialogs**

- None named on this page (checkout is Payment pack).

**Empty**

- Brother / Sister `same_quota_as_brothers`: pack list from `/v1/packs`.
- Sister `free_unlimited`: unlimited Invite copy + message pack listed.

**Loading**

- Page load.

**Error**

- Copy/rail error does not hide Free or safety. `PAY_UNAVAILABLE` does not disable Chat, Report, Blur, Mahram, Verification, Block.

**Success**

- Prices match checkout. Sister `same_quota_as_brothers` sees the same Free Invite cap. Premium = unlimited Invites and unlimited messages.

## Académie list + article

- **Reached from:** landing / help
- **Implements:** FR-115, AD-24

**Controls**

- List of at least five scholar-reviewed articles, named and marked reviewed.
- Reviewer name on each published article.
- Article body.
- Topics named by PRD: Mahram, mahr, rights, haya, honesty.
- Unpublished draft → 404 (FR-141).

**Labels**

- *mariage / ta'aruf / nikah / khitba* only.
- **Do not hardcode scholar names** (open question 4).

**Dialogs**

- None named.

**Empty**

- Fewer than five articles is unmet (Operator publish). Inherit `{components.empty-state}` + `{components.error-banner}` on the public list.

**Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- Five live reviewed articles.

**Unspecified**

- Separate list layout vs article layout chrome. EXPERIENCE.md names list + article as **one surface**. Do not invent a third Académie chrome.

## Advisory Board

- **Reached from:** landing / help
- **Implements:** FR-116, AD-22

**Controls**

- Named scholars with roles (at least two at launch).
- Fiqh-edge is human, not a bot. No fatwa-bot control.

**Labels**

- Do not hardcode scholar names.

**Dialogs**

- None named.

**Empty**

- No names → FR unmet; do not ship a fictional board.

**Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- At least two named people with roles.

## FAQ + contact

- **Reached from:** footer
- **Implements:** FR-118

**Controls**

- FAQ.
- Ticketed contact form (not Gmail-only).
- Subject triage including misuse (misuse routes to Moderators).
- Ticket id returned on submit.

**Labels**

- Exact FAQ questions: **Unspecified**.
- Exact form field labels beyond “ticketed form” + subject triage including misuse: **Unspecified**.

**Dialogs**

- None named.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- Ticket id shown to the visitor.

## Showcase

- **Reached from:** landing
- **Implements:** FR-099, FR-100, AD-25

**Controls**

- Consent stories only.
- Faces optional / blurred.
- No Chat excerpts.
- Empty is valid and points at the counter at 0.

**Labels**

- Counter **« Mariages confirmés : 0 »** when empty. No invented quotes.

**Dialogs**

- None named.

**Empty**

- No stories — counter at 0, no fake quotes.

**Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- Only consented published cards.

## Cookie consent

- **Reached from:** first public hit
- **Implements:** FR-119, AD-9

**Controls**

- Accept.
- Manage.
- Accept never implies Profile Photo campaign rights (cookies ≠ likeness grant).

**Labels**

- Exact banner copy: **Unspecified** beyond accept / manage and the cookies ≠ likeness rule.

**Dialogs**

- This surface **is** the first-hit banner/dialog.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- Accept or manage recorded; Photo reuse still false unless FR-060 opt-in exists.

## SEO pages — Ouagadougou, Bobo-Dioulasso, Burkina Faso *(PRD-named, IA omitted)*

- **Reached from:** those three URLs (FR-117)
- **Implements:** FR-117

**Controls the PRD states**

- HTTP 200.
- Local imam-reviewed copy.
- No dating / *rencontre romantique* lexicon.

**Labels**

- Local reviewed copy. Exact headlines: **Unspecified**.

**Dialogs / Empty / Loading / Error / Success chrome**

- **Unspecified.** EXPERIENCE.md does not name page chrome, nav, or whether they reuse Public landing (Gap G2).

---

# 2. Identity and onboarding

## Splash

- **Reached from:** app open
- **Implements:** FR-132, FR-133, FR-134, AD-4

**Controls**

- Brand field.
- Continue.
- Product name **AnKanu** (ankanu.com).
- Web / PWA / Play Android are in scope. Native iOS **absent**.

**Labels**

- Product name: AnKanu. Exact splash tagline: **Unspecified**.

**Dialogs**

- PWA install prompt is **optional** (FR-134). Not a required shipping screen (Gap G18).

**Empty**

- —

**Loading**

- Skeleton on splash ≤2s.

**Error**

- `UNAUTHENTICATED` / captcha fail named.

**Success**

- Session cookie or Bearer; next is age gate or home.

## Auth (signup / login)

- **Reached from:** Splash
- **Implements:** FR-001, FR-003, FR-005, FR-007, AD-8

**Controls**

- `{components.field}` email (48px; errors name the field).
- `{components.field}` password (published rules).
- `{components.field}` unique pseudonym.
- Gender: Sister / Brother. Immutable after first set without operator + audit.
- Google additional (not the only path). Email + password still works if Google is down.
- Captcha / bot check. Non-color fail state required.
- Sincerity pledge: commit before Allah to seek marriage; Code of conduct; privacy notice; copy names honesty about existing marriage. Account is not created until accepted. Version stored on the account (FR-089).
- 19+ note (A1 legal review open — copy does not claim statute).
- Remember-me (FR-008).
- `{components.button-primary}` disabled until required fields valid.
- Login path uses the same email / password / captcha / remember-me set. Google additional.
- **Absent:** Apple sign-in.

**Labels**

- 19+ note exists; exact wording **Unspecified** except it must not claim statute.
- Pledge must name honesty about existing marriage. Exact paragraph **Unspecified**.
- Taken email/pseudonym: name the conflicting field.

**Dialogs**

- Captcha challenge.
- Sincerity reaffirmation before further Invites if entertainment browsing (FR-005) — **no dialog named** (Gap G5).

**Empty**

- —

**Loading**

- Skeleton on splash path ≤2s.

**Error**

- Taken email/pseudonym names the field.
- Captcha fail named.
- `UNAUTHENTICATED`.
- Rate-limit on credential stuffing: no account created.

**Success**

- Account exists, **not** publicly visible until FR-012 and FR-014.

## Age gate

- **Reached from:** Auth
- **Implements:** FR-011, FR-091, AD-8

**Controls**

- `{components.age-gate}` date of birth.
- `{components.button-primary}` disabled while DOB blank.

**Labels**

- Copy does not claim statute (A1 open).

**Dialogs**

- This surface is the gate.

**Empty**

- DOB blank, primary disabled.

**Loading**

- —

**Error**

- Under 19: account rejected/held, never listed.
- ID DOB disagrees toward a minor (FR-014): Profile held per FR-091. Member-facing hold chrome after ID/liveness is **Unspecified** (Gap G8).

**Success**

- Adult continues to OTP.

## Email verification

- **Reached from:** Auth
- **Implements:** FR-006

**Controls**

- Waiting-for-link state.
- Resend (issues a new link; old one fails).

**Labels**

- Exact waiting copy: **Unspecified**.

**Dialogs**

- None named.

**Empty**

- Waiting for link.

**Loading**

- Resend in flight.

**Error**

- Expired link — request new.

**Success**

- Email marked verified.

## Password reset

- **Reached from:** Auth
- **Implements:** FR-008

**Controls**

- Request form (verified email).
- Single-use expiring link.
- New password field.
- Completing reset invalidates old sessions except the new one.

**Labels**

- Exact request/success copy: **Unspecified**.

**Dialogs**

- None named.

**Empty**

- Request form.

**Loading**

- Link sending.

**Error**

- Expired / unknown email per published rule.

**Success**

- New password; old sessions dead.

## OTP

- **Reached from:** after account
- **Implements:** FR-002, AD-13

**Controls**

- `{components.otp-input}`.
- Resend with published cooldown.
- Phone OTP required before public visibility.

**Labels**

- Loading: **« Code envoyé »**.
- Wrong code does not leak whether the number exists beyond the published rule.

**Dialogs**

- None named.

**Empty**

- Boxes empty.

**Loading**

- « Code envoyé ».

**Error**

- Wrong/expired — retry + cooldown.

**Success**

- Phone level granted.

## ID + liveness

- **Reached from:** after OTP
- **Implements:** FR-014, FR-015, FR-105, AD-13

**Controls**

- `{components.liveness-capture}` — free, not Premium. Camera/mic.
- ID document capture.
- Must match Profile Photos.
- Retake on fail, not a paywall.
- Captcha/liveness non-color fail state.

**Labels**

- Exact capture instructions: **Unspecified** beyond free / retake / match Photos.

**Dialogs**

- None named.

**Empty**

- Camera idle + pictogram.

**Loading**

- Capture upload.

**Error**

- Mismatch / fail — retake, not pay.
- Suspected-minor hold: Profile held, never listed (FR-091). Chrome for that hold: **Unspecified** (Gap G8).

**Success**

- ID level pending human review. Premium without ID+liveness still cannot become publicly visible.

## Onboarding

- **Reached from:** after verification
- **Implements:** FR-009, FR-010, FR-137, FR-138, AD-24

**Controls**

- Split **minimum-to-browse** vs **complete-to-send-Invite**.
- `{components.completeness-meter}` names missing Islamic criteria.
- `{components.audio-prompt}` on hard steps (Mooré or Dioula).
- Pictogram path if audio fails.
- Browse-only CTA when only minimum fields are done.
- Invite send blocked until Invite-ready fields complete.
- Sister Chat-ready: offer (not force) Mahram invite (FR-080 / FR-071).

**Labels**

- Completeness: **« Il manque : madhhab »** — never **« Votre profil est faible »**.
- Exact step titles: **Unspecified**.

**Dialogs**

- None named.

**Empty**

- Minimum path — browse-only CTA.

**Loading**

- Audio buffering (step still usable).

**Error**

- 2G audio fail — pictograms.

**Success**

- Browse unlocked after visibility gates; Invite only if complete.

## Photo rules

- **Reached from:** onboarding / upload
- **Implements:** FR-070, FR-010, AD-24

**Controls**

- Pictograms (visible without reading a paragraph).
- French text.
- Mooré/Dioula `{components.audio-prompt}`.
- Rules: modest / recent / real / no third parties.

**Labels**

- Exact pictogram captions beyond those four rules: **Unspecified**.

**Dialogs**

- None named.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- Member can complete via pictogram + audio without a paragraph.

**Unspecified**

- Photo Strike 3→24h upload block (FR-069) has **no named wall** (Gap G9). Do not invent one here.

## PIN lock

- **Reached from:** background >60s `[ASSUMPTION]`
- **Implements:** FR-020, NFR-001, AD-8

**Controls**

- `{components.pin-lock}`.
- Enable/disable lives on Settings / Profile edit (PIN 5-fail and life-pause deactivate live on Profile edit / PIN lock).
- 5 fails → re-auth with password or OTP (sixth attempt locks local session).
- Idle 15 min on Sister/Mahram PIN sessions `[ASSUMPTION]`.
- Long-press reserved for system text selection (not a PIN control).

**Labels**

- Exact lock copy: **Unspecified**.

**Dialogs**

- This surface is the lock overlay.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`. PIN 5-fail lives here and on Profile edit.

**Success**

- Correct PIN re-enters the session.

---

# 3. Member core

## Profile edit

- **Reached from:** Profil tab
- **Implements:** FR-017, FR-018, FR-021, FR-022, FR-023, AD-26

**Controls — fields the PRD names**

- Age / DOB.
- City / country.
- Origin.
- Marital status: `single` / `married` / `divorced` / `widowed`.
- Education.
- Profession.
- Practice.
- Intentions.
- Description (bio).
- Photos (new Photo re-moderated; old stays live until approved or rejected).
- Islamic criteria: madhhab / practice / intentions. **Absent in MVP:** confrérie, hijra (FR-029 NEXT).
- Brother: if marital status `married`, polygamy intent must be `no` / `yes`; save rejected if `married` without intent. (PRD: `married` requires polygamy intent `yes` or save rejected.)
- `{components.completeness-meter}` names missing criteria.
- Life-pauses deactivate: Ramadan, exams, travel, grief + free text.
- One-tap reactivate (no full onboarding repeat; Verification/review remain valid unless Photos changed).
- `{components.button-primary}` save with spinner.
- PIN enable (shared with Settings / PIN lock).
- Reveal policy settings for the owner (same three policies for Brother as Sister — FR-057): `on_accept` / `on_request` / `never` per viewer.

**Labels**

- Completeness: **« Il manque : madhhab »** (field name). Never **« Votre profil est faible »**.
- French-first Glossary marital-status values.
- Shared-trait example “kids / accepts a partner with kids” is **display-only if already on both Profiles**. FR-021 field list has **no kids control**. Do not invent it (Gap G16).

**Dialogs**

- Deactivate reason picker (named pauses + free text). Exact dialog chrome **Unspecified** beyond the named reasons.
- Confirm delete is on Settings / Delete status, not invented here.

**Empty**

- Completeness lists missing fields.

**Loading**

- Save spinner on primary.

**Error**

- Validation names the field.
- Brother `married` without polygamy intent: save rejected.

**Success**

- Saved. New Photo/bio → **not-yet-public**.

## Profile not-yet-public

- **Reached from:** Profile edit / upload
- **Implements:** FR-012, FR-065, AD-10

**Controls**

- Status of pending Photo/bio.
- Not a Chat state.

**Labels**

- **« Photo en revue — pas encore publique. »**
- Loading: **« En revue »**.
- Rejection reasons map to published photo/Profile rules (FR-070).

**Dialogs**

- None named.

**Empty**

- No pending asset.

**Loading**

- « En revue ».

**Error**

- Rejected with published photo-rule reason.

**Success**

- Approved asset replaces live; old stays until then. Unapproved Profile does not appear in anyone’s people list.

## Discover

- **Reached from:** Découvrir
- **Implements:** FR-024, FR-025, FR-136, FR-146, AD-16

**Controls**

- `{components.focused-card}` default: **one** opposite-gender visibility-approved Profile (not a multi-face grid).
- `{components.blur-photo}` on the card photo.
- `{components.shared-trait}` under the photo only if in common (open to polygamy, same town, kids / accepts a partner with kids, other shared Profile fields already in the PRD). Omit when none. Do not invent Profile fields.
- Tap photo or card body → Profile detail.
- **Passer** = dismiss this card (swipe away). Not a like. No Invite or message sent.
- Swipe or `{components.button-primary}` Invite (FR-038 / FR-044 / FR-045).
- Quick message (counts against FR-146; and Invite quota if it is also an Invite / Flash).
- `{components.card-grid-toggle}` on this screen.
- Optional `{components.discovery-card}` grid.
- Lite: small image, text first; `{components.lite-placeholder}`; criteria still render when images deferred.
- Private favourite control.
- Filters entry (own surface).
- Bottom nav Découvrir selected.
- **Absent:** public likes, heart stack, « en ligne », FR-030 advanced paid filters, who-favourited-me, visitors, online-now, AI compatibility score, daily recs rail.

**Labels**

- **« Passer »** = dismiss this card.
- Empty: **« Aucun profil pour ces filtres. »**

**Dialogs**

- Invite compose / Message Flash (own surface) when Invite or quick message is used.
- Message quota wall when Free cap hit.
- Sister invite quota wall only in `same_quota_as_brothers` when Free Invite cap hit.

**Empty**

- « Aucun profil pour ces filtres. » + `{components.empty-state}` (one sentence + one action). No invented cards.

**Loading**

- Text + `{components.lite-placeholder}` first (≤8s NFR-005); small image deferred.

**Error**

- Browse error, retry; no invented cards.

**Success**

- One focused card; shared traits under the photo; card/grid toggle present.

## Search

- **Reached from:** Discover / filters
- **Implements:** FR-024, FR-025, FR-136, FR-146, AD-16

**Controls**

- Same `{components.focused-card}` / `{components.card-grid-toggle}` / `{components.discovery-card}` / `{components.shared-trait}` / Pass / Invite / quick message / favourite / Lite as Discover.
- Many-filter search **may open on the grid**; the single-card toggle **remains**.
- Basic filters only (Filters surface). **FR-030 controls absent.**

**Labels / Empty / Loading / Error / Success**

- Same as Discover.

**Dialogs**

- Same walls as Discover.

## Filters

- **Reached from:** Discover / Search
- **Implements:** FR-024

**Controls**

- City / location.
- Marital status.
- Practice / religious criteria.
- Life plans: `ready_now` / `within_year` / `exploring`.
- Distance: 10 / 25 / 50 / city `[ASSUMPTION]`.
- Sister filter example named: Marital status `married` + Polygamy intent `yes` excludes Brothers who have not set those fields.
- **Absent:** FR-030 advanced paid filters; language filters (FR-126 NEXT).

**Labels**

- Exact control captions beyond the field names: **Unspecified**.

**Dialogs**

- None named (this is the filter sheet/screen). Modal stack one level.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`. Zero-result combination shows empty on Discover/Search, not invented Profiles.

## Profile detail

- **Reached from:** focused card / grid / favourite / invite
- **Implements:** FR-015, FR-016, FR-056, AD-9

**Controls**

- `{components.blur-photo}` opposite-gender default (server `blur` derivative; never CSS-blur `original`).
- Verification levels: phone / ID / Verified-Mahram. Premium must not look like identity Verification. No Premium badge required in MVP (FR-112 NEXT).
- Marital status + polygamy intent (visible to Sisters **before** accept).
- Report / Block.
- Reveal/Revoke controls when owner or granted (`{components.reveal-control}`).
- Private favourite.
- Invite / if already accepted, open Chat.
- Missing optional fields omitted.

**Labels**

- Verification levels shown per FR-015. Exact badge captions: **Unspecified** except Member-facing French for Verified-Mahram **may** say *wali vérifié*.
- No AI compatibility score.

**Dialogs**

- Report / Block (own surface).
- Reveal request / Revoke (Blur / Reveal / Revoke surface).

**Empty**

- Missing optional fields omitted.

**Loading**

- Blur thumb first.

**Error**

- `REVEAL_DENIED` if clear requested without grant.

**Success**

- Criteria + blur or granted clear.

## Blur / Reveal / Revoke

- **Reached from:** Profile detail / Chat
- **Implements:** FR-056, FR-057, FR-058, FR-059, AD-9

**Controls**

- `{components.reveal-control}` 44px, role+pressed/disabled.
- Per-viewer policy: `on_accept` / `on_request` / `never`.
- Request cap 1 pending per pair `[ASSUMPTION]`.
- Revoke ≤60s (denylist + TTL; not a client hide).
- Caption + pictogram (color is not the only signal).
- Paid perk cannot grant Reveal.
- Brother can choose the same three policies.
- No hover-only Reveal.

**Labels**

- Announce: **« Visible pour [pseudonym] »** / **« Flou rétabli »**.

**Dialogs**

- Reveal-on-request prompt to the Photo owner (push also fires). Exact request dialog chrome **Unspecified** beyond 1 pending cap and approve/ignore/deny.

**Empty**

- Never-policy: still blur.

**Loading**

- Reveal request pending (1 max).

**Error**

- Revoke network fail — keep trying; gateway denylist is source of truth.

**Success**

- Grant/revoke reflected ≤60s.

## Favourites

- **Reached from:** Discovery / Profil
- **Implements:** FR-026

**Controls**

- Private list only.
- Open a favourite → Profile detail.
- **Absent:** “who favourited me”.

**Labels**

- Empty: **« Aucun favori. »** + action Découvrir.

**Dialogs**

- None named.

**Empty**

- « Aucun favori. » + Découvrir.

**Loading**

- List skeleton.

**Error**

- Save fail, retry.

**Success**

- Private row only.

## Invite compose + Message Flash

- **Reached from:** Profile detail / focused-card Invite or quick message
- **Implements:** FR-038, FR-044, FR-045, FR-046, FR-047, FR-105, FR-145, FR-146, AD-23

**Controls**

- `{components.flash-composer}` (Flash visible to recipient before accept).
- Ice Breaker deen/family templates, editable before send. Not AI-personalised (FR-049 NEXT absent).
- Phone / WhatsApp / links refused (Contact-share rule).
- `{components.mahram-banner}` to Brother from first Flash **only if this thread is granted**.
- Photo required to send Invite — block with prompt to add a Photo (FR-016).
- `{components.button-primary}` send. Never waits on AI.
- Free message remaining shows current admin `daily_message_cap` (no locked number).
- **Brother:** remaining Free Invites **3** `[ASSUMPTION]`; Premium = unlimited Invites; never a free-unlimited Invite state.
- **Sister `free_unlimited`:** no Invite remaining-count; no reach-pack CTA.
- **Sister `same_quota_as_brothers`:** same remaining **3** as Brothers.
- **Absent:** resend after refuse (blocked, FR-043); GIF picker; brother-free mode.

**Labels**

- Sister `free_unlimited`: **« Invitations illimitées. »**
- Ice Breaker template **texts themselves are not named** (Gap G15). Do not invent wording.

**Dialogs**

- Photo-required prompt (FR-016). Exact copy **Unspecified** beyond “prompt to add a Photo”.
- Sister invite quota wall / Message quota wall / Contact-share interstitial (own surfaces).

**Empty**

- Flash empty; Ice Breaker optional; remaining copy as above.

**Loading**

- Send in flight.

**Error**

- Recipient deactivated, Banned, or married → Invite rejected.
- `QUOTA_EXCEEDED` with Ouaga-day reset (Brother and Sister `same_quota_as_brothers` only).
- `MESSAGE_CAP_EXCEEDED` → Message quota wall (refused, not held).
- `CONTACT_SHARE_REQUIRED`.
- Sister `free_unlimited` never Invite `QUOTA_EXCEEDED` and never a reach-pack offer.

**Success**

- Invite on recipient list; Flash already visible if under FR-146.

## Sister invite quota wall

- **Reached from:** Invite compose when `same_quota_as_brothers` and Free Invite cap is hit
- **Implements:** FR-044, FR-045, FR-105, FR-145, AD-14, AD-23

**Controls**

- Remaining Invites 0.
- Ouaga-day reset time.
- `{components.pack-card}` CTA matching Brother checkout.
- **Not shown** in `free_unlimited` for Invite reach.
- Safety stays free (no paywall on Verification, Blur, Mahram, Report, Block).

**Labels**

- Same Free **3** Invite copy as Brothers. Premium = unlimited Invites. No Premium Invite cap of 15.

**Dialogs**

- This surface is the wall.

**Empty**

- Remaining 0 + reset + pack CTA.

**Loading**

- Entitlement fetch.

**Error**

- `PAY_UNAVAILABLE` — cannot buy; Invite send stays blocked until reset; Chat, Verification, Blur, Mahram, Report, Block stay usable.

**Success**

- CTA opens Payment pack; after purchase: unlimited Invites and unlimited messages.

## Message quota wall

- **Reached from:** Chat / Flash / card quick message when a Free Member hits `daily_message_cap`
- **Implements:** FR-146, FR-105, FR-044

**Controls**

- Remaining messages 0.
- Current admin `daily_message_cap` shown (no locked number).
- Ouaga-day reset.
- `{components.pack-card}` CTA.
- Both genders, including Free Sister in `free_unlimited`.
- Premium never sees this wall.

**Labels**

- **« Envoi refusé. Quota du jour atteint. »** + pack.

**Dialogs**

- This surface is the wall.

**Empty**

- Remaining 0 + cap + reset + pack.

**Loading**

- Entitlement fetch.

**Error**

- `PAY_UNAVAILABLE` — cannot buy; over-cap send stays refused, not held; safety stays usable.

**Success**

- CTA opens Payment pack; after purchase: unlimited messages and unlimited Invites.

## Invite inbox

- **Reached from:** Invitations tab
- **Implements:** FR-037, FR-039, FR-040, FR-042, AD-26

**Controls**

- Lists: Sent / Received / Accepted.
- `{components.invite-row}`: marital status + polygamy intent **before** accept.
- Accept (`{components.button-primary}`).
- `{components.button-quiet}` decline.
- Sent rows: pending / accepted / declined (declined does not name guilt copy).
- Accepted row opens Chat.
- Stage on a pending Invite: **invite** (FR-028).
- **Absent:** resend after refuse; « Elle a vu »; guilt timer; lecture.

**Labels**

- Quiet decline: **« Refuser discrètement »**.
- Empty: **« Aucune invitation. »**
- Brother sees not-accepted / declined without a lecture.
- Sister is not prompted to explain after decline.

**Dialogs**

- None named beyond accept / quiet decline on the row.

**Empty**

- « Aucune invitation. »

**Loading**

- List skeleton.

**Error**

- Accept fail if other married/Banned.

**Success**

- Accept → Chat (Sister consent rule FR-039). Decline → declined without lecture.

## Discussions list

- **Reached from:** Discussions tab
- **Implements:** FR-041, FR-050, AD-15

**Controls**

- Open Chats after Sister consent.
- Unread increment.
- Row opens Chat.
- **No hold badge.**
- Brother: no Chat thread for a pending Brother-sent Invite.

**Labels**

- Empty: **« Aucune discussion. »**

**Dialogs**

- None named.

**Empty**

- « Aucune discussion. »

**Loading**

- List skeleton.

**Error**

- Fetch fail, retry.

**Success**

- Row opens Chat; unread increment; no hold badge.

## Chat thread

- **Reached from:** Accept / Discussions list
- **Implements:** FR-041, FR-050, FR-051, FR-062, FR-063, FR-064, FR-146, AD-10, AD-15

**Controls**

- `{components.chat-bubble}` persist `delivered` immediately.
- `{components.voice-note}` play as soon as stored. No member-facing transcript. Counts as a message (FR-146). Camera/mic for Voice.
- Text compose.
- Photo: gallery or camera.
- Typing indicator ≤2s.
- `{components.stage-chip}`: `invite` / `chat` / `meeting` / `married`. Meeting is a confirm, not the NEXT planner (no time/place/attendee fields).
- `{components.mahram-banner}` if this thread is granted: **« Un wali lit cette discussion. »**
- `{components.reveal-control}`.
- Report / Block.
- Reactions exist (FR-050) but EXPERIENCE.md does **not** name a reaction control (Gap G13).
- Compose **off** when Mahram-paused. Brother cannot resume a Mahram pause.
- Ended Chat is terminal (compose stays disabled; stage does not revert).
- Free-tier sends obey FR-146.
- Send announces **« Message envoyé »** — never « en vérification » / « scan ».
- Ack copy: **« Votre message est arrivé. »**
- `{components.lite-placeholder}` for chat media: waits for **connection**, not AI.
- **Absent:** GIF picker; pending-moderation / held / scan-wait; first-wife notification; in-Chat marital-change audit rail (FR-094 NEXT).

**Labels**

- **« Votre message est arrivé. »**
- TalkBack: « Message envoyé ».
- Mahram granted: **« Un wali lit cette discussion. »**
- Not granted / revoke: **« Accès retiré »** is the Mahram-side label (Mahram read-only).

**Dialogs**

- Contact-share interstitial on `CONTACT_SHARE_REQUIRED`.
- Message quota wall on over-cap.
- Meeting confirm (FR-028) exists as behaviour; **no named dialog** (Gap G14). Do not invent the NEXT planner.
- Marriage dual-confirm (own surface).
- In-Chat “never send money to a suitor” education (FR-068) is **not** a named surface; do not reuse Contact-share for money-ask (Gap G6).

**Empty**

- New Chat — stage **chat**, no scan banner.

**Loading**

- Thread open ≤4s; typing ≤2s.

**Error**

- Send fail = connection. Over-cap = Message quota wall. **Never** “held for scan”.

**Success**

- Allowed bubble `delivered` immediately. Offline: text outbox; media waits for connection.

## Contact-share interstitial

- **Reached from:** send blocked (`CONTACT_SHARE_REQUIRED`)
- **Implements:** FR-068, AD-17

**Controls**

- `{components.contact-share-interstitial}` shown to **both** Members.
- Blocks phone, WhatsApp, links until both opt in.
- Not an AI hold.
- **Do not reuse for money-ask.** Money-request language is delivered and flagged.

**Labels**

- **« Les numéros et WhatsApp attendent l’accord des deux. »**

**Dialogs**

- This surface is the interstitial.

**Empty**

- Both not opted in.

**Loading**

- Opt-in in flight.

**Error**

- One-sided yes — still blocked.

**Success**

- Both yes — numbers/links may send; scan still runs after.

## Report / Block

- **Reached from:** Profile / Chat
- **Implements:** FR-083, FR-084, FR-037

**Controls**

- Report with reason (includes marital misrepresentation). Starts 24h SLA.
- Block hides — they can no longer see or contact you (browse absent; Invite/Chat rejected).
- Reason required.

**Labels**

- Exact reason list besides marital misrepresentation: **Unspecified** (Code of conduct banned behaviours exist: indecency, sexual talk, impersonation, multiple accounts, harassment, money requests/scams, hate, non-marriage use). Do not invent extra reason chrome beyond those named categories + marital misrepresentation.

**Dialogs**

- This surface is the report/block form.

**Empty**

- Reason required.

**Loading**

- Submit in flight.

**Error**

- Rate limit.

**Success**

- Report: SLA started. Block: hidden.

## Marriage dual-confirm

- **Reached from:** Chat / settings
- **Implements:** FR-095, FR-096, FR-097, FR-098, AD-25

**Controls**

- Joint start: **« nous nous sommes mariés »** naming the other (requires accepted Chat).
- Other spouse confirmation request.
- One-sided does nothing (first remains available; counter unchanged).
- Optional private nikah proof upload (certificate or imam/Mahram attestation) — never published.
- Skip proof still counts if both confirm.
- 30d `[ASSUMPTION]` expiry without second confirm: no counter.

**Labels**

- Start copy uses **« nous nous sommes mariés »**.
- Counter stays 0 until both confirm.

**Dialogs**

- Confirmation request to the other spouse.

**Empty**

- One spouse started.

**Loading**

- Waiting other.

**Error**

- Expired 30d without confirm — no counter.
- No accepted Chat → rejected.

**Success**

- Both confirm — joint **married**, counter +1; both leave browse; no new Invites; stage **married**.

## Consent story

- **Reached from:** after dual-confirm
- **Implements:** FR-099, FR-100, AD-25

**Controls**

- Optional.
- City.
- Date.
- Faces optional/blurred.
- No Chat excerpts.
- Either spouse can refuse public.
- Extra family-ok checkbox `[ASSUMPTION]`.
- Card waits for Operator/Advisory Board publish (FR-141) before live.

**Labels**

- Exact field captions beyond city / date / faces optional: **Unspecified**.

**Dialogs**

- Refuse-public choice. Exact chrome **Unspecified**.

**Empty**

- Form after dual-confirm.

**Loading**

- Submit.

**Error**

- One spouse refuses public — showcase empty of faces (counter may still increment).

**Success**

- Public only if both (and family-ok if set) consent and Operator/Board publish.

## Payment pack

- **Reached from:** Settings / Invite quota wall / Message quota wall
- **Implements:** FR-044, FR-045, FR-104, FR-105, FR-106, FR-107, FR-145, FR-146, AD-14, AD-21

**Controls**

- `{components.pack-card}` 1 / 3 / 6.
- Explicit `ends_at`.
- **No renew toggle.**
- Orange Money BF / Moov Africa BF / Wave/Coris checkout; cards secondary.
- `{components.audio-prompt}` on no-auto-renew.
- Brothers always. Sisters see the same checkout in both `sister_reach_mode` values because Free-tier messages are capped.
- In `free_unlimited` she is not required to buy for Invite reach.
- Paid-faster-review is queue only — must not skip Verification, Blur, Mahram, Report, Block, or Chat after accept; must not skip scan or auto-clear a flag.
- No brother-free pack.
- No Free Money / MTN MoMo. No boosts. No Premium identity badge.

**Labels**

- **« Pas de renouvellement automatique. »**
- Prices in XOF; match public pricing page.

**Dialogs**

- Hosted/rail redirect is the pay step.

**Empty**

- Pack list (Brother / Sister `same_quota_as_brothers`); message pack not required for reach (Sister `free_unlimited`).

**Loading**

- Hosted/rail redirect.

**Error**

- `PAY_UNAVAILABLE` — Free + safety stay.

**Success**

- Entitlement until `ends_at`; unlimited Invites and unlimited messages; no renew job.

## Notifications

- **Reached from:** bell / OS
- **Implements:** FR-052, FR-053, AD-16

**Controls**

- In-app list: template + ids.
- `{components.blur-photo}` thumbs. No Chat body. No phone. No clear Sister Photo thumbnail.
- In-app unread still increments if push denied.
- Triggers the sources name: messages, Invites, Reveal requests, moderation outcomes, Mahram pause/end/flag.
- SMS (not a screen control) on essential path: Invite received (Sister), Mahram flag/pause/end, admin sanctions that suspend or Ban, OTP. No Photo payloads.

**Labels**

- Empty: **« Aucune alerte. »**

**Dialogs**

- OS push permission. Quiet hours **absent** (FR-127 NEXT).

**Empty**

- « Aucune alerte. »

**Loading**

- —

**Error**

- Push denied — in-app unread still increments.

**Success**

- Template + blur thumb only.

## Settings

- **Reached from:** Profil
- **Implements:** FR-019, FR-020, FR-120, FR-136, FR-138, AD-19

**Controls**

- Lite mode (FR-136).
- Audio language: Mooré / Dioula.
- PIN (enable + timeout behaviour on PIN lock).
- Delete / export entry (own status surface).
- CIL / hosting disclosure **always visible**.
- Path to public pricing / Payment pack.
- **Absent:** “who viewed me”; marketing campaign opt-in control (Gap G4); language search filter.

**Labels**

- Hosting/CIL line always visible. Exact sentence is AD-5 / A3 — not rewritten here.

**Dialogs**

- Confirm delete (FR-019) — exact confirm chrome **Unspecified** beyond “when they confirm delete”.

**Empty**

- Current values.

**Loading**

- —

**Error**

- Delete/export ticket error → status URL still issued if scheduled.

**Success**

- Lite/audio/PIN persist; hosting line always visible.

## Delete / export status

- **Reached from:** Settings
- **Implements:** FR-019, FR-143, NFR-008, AD-19

**Controls**

- Status URL.
- Ticket (not Gmail-only).
- Export download when ready.
- NFR-008 clocks shown as `[ASSUMPTION]` working numbers (open question 12).

**Labels**

- Exact status strings: **Unspecified** beyond ticket / download when ready / working NFR-008 numbers as `[ASSUMPTION]`.

**Dialogs**

- None named.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- Member can download export; Operator queue owns stuck tickets.

## Appeal

- **Reached from:** Sanction notice
- **Implements:** FR-090, AD-18

**Controls**

- Member Review form.
- Second human (not original decider).
- For suspension or Ban.

**Labels**

- Exact form fields: **Unspecified**.
- Sanction outcome uses published status in respectful Ouaga French — not meme macros.

**Dialogs**

- None named.

**Empty**

- Form.

**Loading**

- Submit.

**Error**

- Window closed.

**Success**

- Second-human queue. Overturn restores access (counted on SM-C3).

## Family guidance

- **Reached from:** onboarding / help
- **Implements:** FR-080

**Controls**

- Published guidance: family involvement is honorable.
- Points at optional Mahram.
- Describes Mahram-in-Chat as optional and Sister-initiated.

**Labels**

- Exact body copy: **Unspecified** beyond optional + Sister-initiated.

**Dialogs**

- None named.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

## Suspended-account screen *(PRD-named, IA omitted)*

- **Reached from:** authenticate while suspended (FR-085, brief P43)
- **Implements:** FR-085

**Controls the PRD states**

- Suspended screen.
- Chat / Invite / browse disabled.
- Published-status outcome in respectful Ouaga French (not meme macros).
- Path to Appeal (FR-090).

**Warning (not a named IA screen)**

- Member who is warned “sees the warning and can continue under the published limits” — overlay vs dedicated screen is **Unspecified** (Gap G7).

**Ban**

- Authenticate with same phone/ID → access denied (FR-085). Dedicated Ban chrome is **Unspecified** (Gap G7). Fingerprint/ID/phone holds are Moderator-side (FR-088), not a named member screen.

---

# 4. Mahram

## Mahram invite (Sister)

- **Reached from:** Chat / onboarding
- **Implements:** FR-071, AD-12

**Controls**

- Invite by phone.
- Not forced.
- `{components.audio-prompt}` explainer.
- Brother cannot attach a Mahram to her Chat (action rejected).
- No Chat message sent as her.

**Labels**

- Exact explainer copy: **Unspecified**.

**Dialogs**

- None named.

**Empty**

- Phone blank.

**Loading**

- OTP sending (attach flow).

**Error**

- Friend class rejected.

**Success**

- Invite sent.

## Mahram OTP + relationship

- **Reached from:** SMS deep link
- **Implements:** FR-072, A2, AD-12

**Controls**

- `{components.otp-input}`.
- Relationship: `father` / `brother` / `uncle` / `other_mahram`.
- Unmatched friend rejected (not in the allowed enum).
- No kinship document.

**Labels**

- Exact relationship captions beyond the enum: **Unspecified**.
- Cooling-off 1h `[ASSUMPTION]` before Mahram actions; pause/end only after Sister confirm.

**Dialogs**

- None named.

**Empty**

- Phone/relationship unset.

**Loading**

- OTP sending.

**Error**

- Wrong relationship / expired 7d `[ASSUMPTION]`.

**Success**

- Sister is asked to confirm.

## Sister confirm Mahram

- **Reached from:** notification
- **Implements:** FR-073, AD-12

**Controls**

- Confirm.
- Or let 7-day expire `[ASSUMPTION]` (ignore or reject).
- After confirm he is **not** attached to every conversation.

**Labels**

- Exact confirm copy: **Unspecified**.

**Dialogs**

- Confirm / let expire.

**Empty / Loading / Error / Success**

- Part of Mahram attach states — Confirmed + **empty grant list**.

## Mahram grant list

- **Reached from:** after Sister confirm
- **Implements:** FR-074

**Controls**

- `{components.mahram-grant-row}`.
- Empty after confirm; she picks Brother threads.
- New Chats not auto-granted.
- Revoke one thread.
- Remove drops every grant (FR-077).

**Labels**

- Empty: **« Aucune discussion accordée. »** + pick threads.

**Dialogs**

- None named.

**Empty**

- « Aucune discussion accordée. » + pick threads.

**Loading**

- List of her Brother threads.

**Error**

- Grant fail, retry.

**Success**

- One or more grants; new Chats stay ungranted until she picks them.

## Mahram revoke one thread

- **Reached from:** grant list / Chat
- **Implements:** FR-074

**Controls**

- Drops that grant only; other grants stay.
- `{components.button-quiet}` pattern (no confirm-shaming).

**Labels**

- Exact revoke copy: **Unspecified**.

**Dialogs**

- None named.

**Empty**

- —

**Loading**

- Revoke in flight.

**Error**

- Network fail — keep trying; denylist is source of truth.

**Success**

- That thread gone from his list; other grants stay. Brother’s mahram-banner gone on that thread.

## Mahram thread list

- **Reached from:** Mahram home
- **Implements:** FR-074, FR-076

**Controls**

- **Only granted** threads.
- No compose.
- Read delivered messages only.
- **Absent:** Découvrir, Invitations, Invite, browse.

**Labels**

- Empty: **« Aucune discussion accordée. »**

**Dialogs**

- None named.

**Empty**

- « Aucune discussion accordée. »

**Loading**

- List skeleton.

**Error**

- Fetch fail, retry.

**Success**

- Only granted threads.

**Unspecified**

- EXPERIENCE.md reaches this from “Mahram home” but does not name a separate Mahram-home layout. Treat this list as Mahram landing unless founder names another.

## Mahram read-only thread

- **Reached from:** granted thread only
- **Implements:** FR-074, FR-076, AD-12

**Controls**

- Delivered messages (including Flash if that thread granted). Later AI flag does not hide delivered content from him.
- **No compose / no send-as-Sister.**
- `{components.mahram-banner}` context.
- Pause / end / flag (own surface).
- Optional Verified-Mahram badge on Chat header if ID done (FR-078).

**Labels**

- Error: **« Accès retiré »**.

**Dialogs**

- Pause / end / flag actions.

**Empty**

- Granted thread, no messages yet.

**Loading**

- Same as Chat load.

**Error**

- Not granted / revoke already applied — « Accès retiré ».

**Success**

- Delivered messages visible; compose absent.

## Mahram pause / end / flag

- **Reached from:** granted read-only thread
- **Implements:** FR-075, FR-087, AD-12

**Controls**

- Pause: both compose off; Brother cannot resume; Sister / pausing Mahram / Moderator may resume `[ASSUMPTION]`.
- End: terminal.
- Flag: priority case.
- Rejected on a thread that is not granted.

**Labels**

- Exact action captions: **Unspecified** beyond pause / end / flag.
- Members receive push + SMS on pause/end/flag.

**Dialogs**

- These three actions. Exact confirm chrome **Unspecified**.

**Empty**

- —

**Loading**

- Action in flight.

**Error**

- Brother resume rejected; pause/end/flag on ungranted thread rejected.

**Success**

- Pause: compose off. End: terminal. Flag: priority queue.

## Verified-Mahram ID (optional)

- **Reached from:** Mahram settings
- **Implements:** FR-078, AD-13

**Controls**

- Optional ID + liveness (`{components.liveness-capture}`).
- **No kinship document.**
- Still grant-scoped.
- Badge only if ID done.

**Labels**

- Member-facing French may say *wali vérifié*.

**Dialogs**

- None named.

**Empty / Loading / Error / Success**

- Same pattern as member ID + liveness; badge only if done. Not read-all.

**Unspecified**

- “Mahram settings” is the reached-from, not a separately named IA row. Do not invent extra Mahram-settings chrome beyond this optional ID path + PIN (shared-device PIN applies to Mahram).

## Remove / Report Mahram

- **Reached from:** Sister Chat / settings / grant list
- **Implements:** FR-077, FR-074

**Controls**

- `{components.button-quiet}` remove.
- Report.
- Revoke entire permission — every thread grant gone ≤60s; read access gone.
- Optional 24h emergency hide `[ASSUMPTION]` (Profile hidden from people lists).
- SMS both sides.
- No confirmshaming.

**Labels**

- Exact remove/report copy: **Unspecified**.

**Dialogs**

- Remove / Report. Exact confirm chrome **Unspecified** (must not confirm-shame).

**Empty**

- —

**Loading**

- Action in flight.

**Error**

- Network fail — keep trying.

**Success**

- Every grant gone ≤60s; mahram-banner gone; he receives SMS.

---

# 5. Staff (admin)

Every staff surface: `{components.staff-only-badge}`. Members never see this chrome.

## Admin flag queue

- **Reached from:** Staff home
- **Implements:** FR-067, FR-144, AD-10

**Controls**

- `{components.admin-flag-row}` kinds: `flag-for-admin` | `scan-deferred` | `scan-failed`.
- `{components.staff-only-badge}` on every row.
- Already-delivered items — not a hold queue.
- Opening a row never changes `message.state`.
- Flagged person is on the row.

**Labels**

- Empty: **« File vide »** (delivery still happened in the world).

**Dialogs**

- None named.

**Empty**

- « File vide ».

**Loading**

- Queue fetch.

**Error**

- Staff auth fail.

**Success**

- Row for flag or scan-deferred; badge staff-only.

**Unspecified**

- EXPERIENCE.md reaches this from “Staff home” but does not name a separate Staff home layout (Gap G10). Treat this as staff landing unless founder names another.

## Case file

- **Reached from:** flag row / Report
- **Implements:** FR-087, FR-088, FR-093, AD-18

**Controls**

- Text / Photo / Voice + scores + report + fingerprint hints (device/phone/ID).
- Thumbs stay `{components.blur-photo}`.
- Unblur requires typed case reason + audit (actor, case id, timestamp). Control disabled until reason entered.
- Unblur control not in member tab order.
- Strike save makes evidence snapshot immutable.
- False-report pattern can itself be sanctioned (FR-086).
- Fiqh-edge: escalate to Advisory Board; do not invent a fatwa.

**Labels**

- Exact field captions: **Unspecified** beyond media / scores / report / fingerprint hints / typed case reason.

**Dialogs**

- Typed reason before unblur.

**Empty**

- Missing evidence named.

**Loading**

- Case fetch.

**Error**

- Staff auth fail; unblur locked until typed reason.

**Success**

- Reason-entered unblur writes audit; decision saved.

## Sanction

- **Reached from:** Case
- **Implements:** FR-085, FR-144, AD-10

**Controls**

- `{components.sanction-action}`: human chooses warning / suspend / other published action.
- Photo Strike 3→24h is a published floor (FR-069).
- AI is **not** a control.
- Paid-faster-review must not skip scan or auto-clear a flag.
- Ban is on the sanctions ladder (FR-085) as access denied; dedicated Ban chrome on this form is **Unspecified** beyond warning / suspend / other published action.

**Labels**

- Member notified with published-status outcome in respectful Ouaga French.

**Dialogs**

- None named.

**Empty**

- Action unselected.

**Loading**

- Write + audit.

**Error**

- Cannot apply as AI.

**Success**

- Warning / suspend / other saved; Member notified. May open/continue Report → Strike → Ban case.

## Appeal review

- **Reached from:** Appeal queue
- **Implements:** FR-090, AD-18

**Controls**

- Second human.
- Not the original decider.
- Overturn restores access.

**Labels**

- Exact review fields: **Unspecified**.

**Dialogs**

- None named.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

**Success**

- Second-human decision saved; overturn counted.

**Unspecified**

- “Appeal queue” is reached-from, not a separately named IA row. Do not invent extra queue chrome beyond this review surface.

## Operator policy / thresholds

- **Reached from:** Operator
- **Implements:** FR-140, AD-10

**Controls**

- Policy text. Must say: delivered then scanned; AI flags a human; AI does not silently delete, block, or hold.
- Flag confidence.
- Photo-Strike count.
- Subsequent scans only (does not silently rewrite old decisions).
- `{components.staff-only-badge}`.

**Labels**

- UI must state subsequent-only when thresholds change.

**Dialogs**

- None named.

**Empty**

- Current pack prices and thresholds (shared operator empty with pricing).

**Loading**

- Save.

**Error**

- Validation.

**Success**

- Audited change; thresholds apply to **subsequent** scans; auto-renew stays off.

## Operator pricing

- **Reached from:** Operator
- **Implements:** FR-139, FR-106, FR-145, AD-14

**Controls**

- Pack prices / durations 1 / 3 / 6.
- Auto-renew stays **off** (no control to turn it on).
- Hosts sister-reach mode + message cap (own rows below).
- `{components.staff-only-badge}`.
- **Absent:** hide-hosting control; brother-free value.

**Labels**

- Exact price-field captions: **Unspecified** beyond 1/3/6 and auto-renew off.

**Dialogs**

- None named.

**Empty / Loading / Error / Success**

- See Operator policy / pricing states: current prices; save; validation; audited change; auto-renew stays off.

**Unspecified**

- Operator refund approval (FR-109) has **no IA row** (Gap G17). CGV text is on Legal hub.

## Operator sister-reach mode

- **Reached from:** Operator pricing / policy
- **Implements:** FR-145, FR-044, FR-045, FR-105, AD-27, AD-14, AD-21

**Controls**

- `{components.operator-reach-mode}` values `free_unlimited` (DEFAULT) | `same_quota_as_brothers` only.
- `{components.staff-only-badge}`.
- `{components.operator-message-cap}` sits next to this.
- No brother-free value.
- Save writes audit. Change applies to subsequent Sister Invites; past Invites stay.

**Labels**

- Two options only. DEFAULT `free_unlimited` selected if unset.

**Dialogs**

- None named.

**Empty**

- Current `sister_reach_mode`.

**Loading**

- Save in flight.

**Error**

- Validation / unauthorized. No brother-free value to pick.

**Success**

- Audited. Subsequent Sister Invites use the new mode. Member Invite/pricing UI switches on next open.

## Operator daily message cap

- **Reached from:** Operator pricing / policy, next to `sister_reach_mode`
- **Implements:** FR-146

**Controls**

- `{components.operator-message-cap}` shows **current admin** `daily_message_cap`.
- No locked number in UI copy.
- `{components.staff-only-badge}`.
- Premium unlimited (not a number on this control).

**Labels**

- Show the current admin value. Do not lock a number.

**Dialogs**

- None named.

**Empty**

- Current admin value shown.

**Loading**

- Save in flight.

**Error**

- Validation / unauthorized.

**Success**

- Audited. Subsequent Free-tier sends use the new cap. Already-delivered messages stay.

## Operator metrics

- **Reached from:** Operator
- **Implements:** FR-092, FR-142, AD-20

**Controls**

- Internal only: Verified Members by level; dual-confirmed marriages; report SLA; scan-deferred; appeal overturns.
- Public counters stay proof-backed.
- Scan-deferred never hidden.
- SLA-breach flags for free review (FR-013) and reports (FR-083).

**Labels**

- Zero-launch counters valid. Do not invent scale.

**Dialogs**

- None named.

**Empty**

- Zero-launch counters valid.

**Loading**

- Refresh.

**Error**

- —

**Success**

- Scan-deferred counted, never hidden.

## Operator CIL / deletion tickets

- **Reached from:** Operator
- **Implements:** FR-143, AD-19

**Controls**

- Tickets Member can see on status page.
- Clock breach flagged.

**Labels**

- Exact queue columns: **Unspecified**.

**Dialogs**

- None named.

**Empty**

- Empty queue.

**Loading**

- Ticket fetch.

**Error**

- Clock breach flagged.

**Success**

- Member status page shows completed.

## Operator Board / Académie publish

- **Reached from:** Operator
- **Implements:** FR-141, FR-115

**Controls**

- Names + five articles.
- Scholar review record required.
- Unpublished → public 404.

**Labels**

- Do not hardcode scholar names in UI chrome.

**Dialogs**

- None named.

**Empty**

- Fewer than five articles.

**Loading**

- Save.

**Error**

- Missing scholar review.

**Success**

- Five live articles; names published.

## T&S visit signals

- **Reached from:** Moderator
- **Implements:** FR-027

**Controls**

- Mass-view-then-never-Invite. `[ASSUMPTION]` threshold 50 Profiles in 24h without an Invite.
- **No member visitors list.**

**Labels**

- Exact columns: **Unspecified**.

**Dialogs**

- None named.

**Empty / Loading / Error**

- Inherit `{components.empty-state}` + `{components.error-banner}`.

---

# 6. Gaps — stop; do not invent

Required by the brief or a PRD FR, but EXPERIENCE.md does not name a screen (or enough chrome). **Do not invent layout.**

| Gap | What the sources require | What is missing |
|---|---|---|
| G1 Public stats page | FR-092 “public stats page”: Reports handled, SLA met rate, Bans, scan-deferred; each number has a definition; sourced from FR-142; Verified marriages 0 | EXPERIENCE.md IA has landing counter + Advisory Board names + internal Operator metrics. No public stats layout. |
| G2 SEO chrome | FR-117 three URLs return 200 with local copy | EXPERIENCE.md does not name page chrome, nav, or whether they reuse Public landing. |
| G3 D6 policy surface | FR-066 / FR-140: “When the Member opens D6 policy” they see delivered-then-scanned explanation | No member screen named. Legal hub documents are Mentions, CGV, cookies, privacy only. |
| G4 Marketing opt-in | FR-060 / D10 per-use campaign opt-in | Settings elements in EXPERIENCE.md are Lite, audio, PIN, delete/export, CIL/hosting. No opt-in control named. |
| G5 Sincerity reaffirmation | FR-005: re-accept before further Invites if entertainment browsing | No dialog/screen named. |
| G6 Never-send-money education | FR-068 / brief: in-Chat “never send money to a suitor” | EXPERIENCE.md forbids reusing Contact-share for money-ask. No named education surface. |
| G7 Warning vs suspended vs Ban chrome | FR-085 warning (continue under limits); suspended screen (named above from PRD); Ban access denied | EXPERIENCE.md Appeal is reached from “Sanction notice” but does not inventory warning or Ban screens. Suspended is PRD-named only. |
| G8 Suspected-minor hold UI | FR-091 Profile held, never listed | Age gate covers <19 at signup. Member-facing hold chrome after ID/liveness is unnamed. |
| G9 Photo Strike upload block | FR-069 3 rejections → 24h upload block | No named wall. Do not invent one. |
| G10 Staff home | Admin flag queue “Reached from: Staff home” | Staff home itself has no IA row. |
| G11 Code of conduct as a page | FR-089 accepted at signup; brief P44 | Auth pledge stores the version. A standalone published CoC page is not in EXPERIENCE.md IA (may live inside Legal hub — unspecified). |
| G12 Published free review SLA | FR-013 single SLA on public help/pricing | Not a dedicated screen. Which help/pricing line is unspecified. |
| G13 Chat reactions chrome | FR-050: reactions exist and are visible to the other Member | EXPERIENCE.md `chat-bubble` does not name a reaction control. Do not invent one. |
| G14 Meeting confirm | FR-028: Member or attached Mahram proposes **meeting**, other Member confirms; Mahram may reject (pauses compose). No certificate in MVP | Stage-chip values are named. No confirm dialog. Do not invent the NEXT planner. |
| G15 Ice Breaker template texts | FR-047 scholar-sensible deen/family templates, editable before send | Templates themselves are not named. Do not invent wording. |
| G16 Kids Profile field | FR-024 / shared-trait examples include “kids / accepts a partner with kids” and forbid inventing Profile fields | FR-021 field list has no kids control. Shared-trait display only if the field already exists. Do not invent the field. |
| G17 Operator refund | FR-109: Operator approves a refund; Member returns to Free; ticket records it | No Operator refund IA row. CGV text is on Legal hub. |
| G18 PWA install prompt | EXPERIENCE.md: optional; Play listing is the Burkina find path | Not a required shipping screen. |
| G19 Mahram home / Mahram settings | Thread list “Reached from: Mahram home”; Verified-Mahram ID “Reached from: Mahram settings” | No separate IA rows. Do not invent extra chrome. |
| G20 Appeal queue | Appeal review “Reached from: Appeal queue” | No separate IA row. |
| G21 Landing load chrome | Public landing loading state | State Patterns do not give a landing skeleton; only error-banner inherit. |
| G22 Report reason list | FR-083 reason required; FR-037 marital misrepresentation; FR-089 banned-behaviour categories | EXPERIENCE.md does not name a reason picker. Do not invent extra reasons. |
| G23 Delete confirm chrome | FR-019 “when they confirm delete” | Settings has the entry; exact confirm dialog unspecified. |
| G24 Reveal-request dialog chrome | FR-058 owner approves/ignores/denies; 1 pending cap | Control exists; dialog layout unspecified. |
| G25 Life-pause deactivate dialog | FR-018 named reasons + free text | Reasons named; dialog layout unspecified. |

**Not gaps (explicitly absent):** first-wife notification; GIF picker; brother-free mode; Apple sign-in; who-favourited-me; visitors; online-now; held-for-scan Chat; invented scale; Premium identity badge; boosts.

---

# 7. Coverage check

EXPERIENCE.md traceability MVP screens are all listed in §1–§5 with controls, labels, and states.

PRD MVP FRs mapped to those screens or to Gaps (not dropped): FR-001–FR-003, FR-005–FR-028, FR-037–FR-048, FR-050–FR-053, FR-056–FR-060, FR-062–FR-080, FR-083–FR-093, FR-095–FR-101, FR-104–FR-110, FR-115–FR-120, FR-132–FR-134, FR-136–FR-146.

NEXT/LATER FRs are in “Out of MVP” and are not shipping screens.

Brief named surfaces used only to confirm scope (P13 status page, P43 suspended-account, P48 FAQ+contact, P55 pricing page, P59 CGV). No extra screens from the brief beyond what PRD + EXPERIENCE.md already name.

---

# 8. Stitch files in this folder

Founder-approved HTML and PNG are on disk. Map: `MANIFEST.md`. Tokens: `tokens/DESIGN.md` (copy; layout is the PNG) and `tokens/stitch-design-system.json`.

Each named inventory screen has one folder: `NN-slug/screen.html` and `NN-slug/screen.png` (66 / 66). Gaps G1–G25 and Unspecified chrome were not invented. Extra Stitch assets not on the approved map were not downloaded. Mock HTML was not used.
