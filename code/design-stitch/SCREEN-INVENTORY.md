# AnKanu screen inventory (no Stitch)

Ticket: [ANK-7](/ANK/issues/ANK-7). Inventory only. **Do not call Google Stitch. Do not download HTML/PNG.** `DESIGN.md` is tokens only and does not add screens.

Screen names are the EXPERIENCE.md Information Architecture / Traceability names. UI elements are only those the brief, PRD functional requirements, or EXPERIENCE.md already state. French labels below are copied from EXPERIENCE.md Voice and Tone / State Patterns. Member bottom-nav French labels are `[ASSUMPTION]` in EXPERIENCE.md.

Sources:

- `_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/brief.md`
- `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` (FRs, not `epics.md`)
- `_bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md`

Not sources for screens: `DESIGN.md`, `epics.md`, architecture, `mockups/` (EXPERIENCE.md: spines win on conflict). Architecture AD codes are cited only where EXPERIENCE.md already binds them to a surface.

Modal stack is one level (EXPERIENCE.md IA). Three role shells, never mixed (Member / Mahram / Staff). UI language is French (FR-137). Time display `Africa/Ouagadougou`.

---

## Gaps — stop, do not invent

These are named in the brief or PRD but **have no EXPERIENCE.md IA / Traceability row**. This inventory does not invent layout, extra controls, or copy for them. Founder / [Awa](/ANK/agents/awa) must decide before Stitch.

| Named in sources | What the sources actually say | Missing |
|---|---|---|
| Suspended-account screen | Brief P43; PRD FR-085: warning → Member sees warning and can continue under published limits; suspension → after auth, a suspended screen, Chat/Invite/browse disabled; Ban → access denied | No IA row. EXPERIENCE.md Appeal is “Reached from: Sanction notice”, but **Sanction notice** is also not an IA row. |
| Public stats page | PRD FR-092: public periodic stats (Reports handled, SLA met rate, Bans, scan-deferred) with definitions. EXPERIENCE.md Operator metrics is **internal only**; Public landing only has the Verified-marriages counter | No public stats IA row. |
| Pledge reaffirmation | FR-005: entertainment-seeking may require re-accept before further Invites | No surface. |
| Staff home | Admin flag queue is “Reached from: Staff home” | No Staff home IA row. |
| Kids / partner-with-kids as a Profile **field** | FR-024 / EXPERIENCE.md shared-trait examples include “kids / accepts a partner with kids” and forbid inventing Profile fields. FR-021 field list is: age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, Photos | Shared-trait display is named; a Profile-edit control for kids is **not** named in FR-021. Do not invent the field. |
| Chat reactions control chrome | FR-050: reactions exist and are visible to the other Member. EXPERIENCE.md `chat-bubble` does not name a reaction control | Element required by PRD on Chat thread; no EXPERIENCE.md control spec. Do not invent chrome. |
| Meeting confirm control chrome | FR-028: either Member or attached Mahram proposes **meeting**, other Member confirms; stage-chip values `invite` / `chat` / `meeting` / `married`. EXPERIENCE.md: meeting is a confirm, not the NEXT planner; no time/place/attendee fields | No named confirm dialog. Do not invent a planner. |
| Ice Breaker template texts | FR-047: scholar-sensible deen/family templates, editable before send. EXPERIENCE.md: Ice Breaker templates on Invite compose | Templates themselves are not named. Do not invent wording. |
| Operator refund surface | FR-109: Operator approves a refund; Member returns to Free; ticket records it | No Operator refund IA row. |
| PWA install prompt | EXPERIENCE.md: optional; Play listing is the Burkina find path (FR-134) | Not a required shipping screen. |

Open questions EXPERIENCE.md forbids closing in UI: A1–A3; no first-wife notification surface; no hardcoded scholar names; show `operator_config` review hours, do not invent a second number; anonymous-mode surface absent; GIF picker absent; Free Money / MTN MoMo not on checkout.

---

## Chrome shared by Member screens (not a screen)

- Bottom nav: **Découvrir · Invitations · Discussions · Profil** (`[ASSUMPTION]` labels). Mahram has no Découvrir and no Invitations. Staff has no member nav.
- Bell / OS notifications entry (Notifications surface).
- `{components.card-grid-toggle}` on every people-list (Discover, Search).
- `{components.error-banner}` on any surface: AD-7 `error.code` mapped to French. `PAY_UNAVAILABLE` does not disable Chat, Report, Blur, Mahram, Verification, or Block.
- `{components.empty-state}` on lists: one sentence + one action. Zero results never invent Profiles.
- Banned on every Member surface: story rings, live 1:1 A/V, GIF picker, member visitors, « en ligne » / online-now, invented scale, public likes counter, heart stack, operator-as-member session, *dating* / *rencontre romantique*, pending-moderation / held / scan-wait Chat, brother-free mode, CSS blur of originals.

---

## Public

### Public landing

Reached from: cold URL / store. FR-101, FR-117.

- Honorable ta'aruf pitch. No dating lexicon.
- Verified-marriages counter. Launch copy **« Mariages confirmés : 0 »**. Counter only increments on dual-confirm (FR-101).
- No invented DAU / member counts.
- Entry to Public pricing, Académie, Advisory Board, Showcase, Legal hub / FAQ via footer as IA “Reached from” states.
- SEO URLs for Ouagadougou, Bobo-Dioulasso, Burkina Faso return local reviewed copy (FR-117). No Senegal clone. Testimonials carousel is NEXT (FR-102) — **absent**.

States: inherit empty-state + error-banner. Counter 0 is valid success at launch.

### Legal hub

Reached from: footer. FR-109, FR-119, FR-120.

- Mentions, CGV, cookies, privacy.
- Hosting / CIL line Operators cannot hide (FR-120). Hosting location string always present.
- CGV refund rules match the pricing-page summary (FR-109).
- Cookie accept never implies likeness / Profile Photo campaign reuse (FR-119, FR-060).

States: inherit empty-state + error-banner.

### Public pricing

Reached from: landing / settings. FR-044, FR-045, FR-105, FR-106, FR-108, FR-145, FR-146.

- Packs **1 / 3 / 6** months, XOF (FCFA symbol allowed). Launch vs normal price both shown when a launch price exists.
- Rails named: Orange / Moov / Wave (FR-107; cards secondary). Free Money / MTN MoMo **absent**.
- Audio on the no-auto-renew line. Copy **« Pas de renouvellement automatique. »** No renew toggle.
- Free + safety stay described. Safety never paywalled.
- Brother / Sister in `same_quota_as_brothers`: same pack list and same Free Invite cap as checkout. Premium = unlimited Invites and unlimited messages.
- Sister in `free_unlimited`: **« Invitations illimitées. »** No reach-pack required. Pack still listed for unlimited messages (FR-146).
- No brother-free mode. No locked `daily_message_cap` number in copy.

States: pack list loading; copy/rail error does not hide Free or safety; prices match checkout on success.

### Académie list + article

Reached from: landing / help. FR-115.

- Five scholar-reviewed articles. Topics named in PRD: Mahram, mahr, rights, haya, honesty.
- Reviewer name from Advisory Board or recorded delegate.
- Lexicon: *mariage / ta'aruf / nikah / khitba* only.
- Full library NEXT (FR-121) — do not design extra catalog chrome as shipping.

States: inherit empty-state + error-banner. Operator publish error: missing scholar review.

### Advisory Board

Reached from: landing / help. FR-116.

- Named scholars. Fiqh-edge is human, not a bot.
- At least two named people with roles at launch (PRD). Do not ship a fictional board. Do not hardcode names in chrome (EXPERIENCE.md open question 4).

States: inherit empty-state + error-banner.

### FAQ + contact

Reached from: footer. FR-118.

- FAQ.
- Ticketed contact form. Subject triage including misuse (routes to Moderators). Ticket id returned. Not Gmail-only.

States: inherit empty-state + error-banner.

### Showcase

Reached from: landing. FR-099, FR-100.

- Consent stories only. Empty is valid. Faces optional / may be blurred. No Chat excerpts.
- Either spouse can refuse public; then this page stays empty of their faces even if the marriage counter incremented.

States: empty valid; inherit error-banner.

### Cookie consent

Reached from: first public hit. FR-119. Dialog / banner. Modal stack one level.

- Accept control.
- Manage control.
- Cookies ≠ likeness grant.

States: inherit empty-state + error-banner.

---

## Identity and onboarding

### Splash

Reached from: app open. FR-132–FR-134.

- Brand field. Product name **AnKanu** (ankanu.com).
- Continue.

States: loading skeleton on splash ≤2s; error `UNAUTHENTICATED` / captcha fail named; success → age gate or home.

### Auth (signup / login)

Reached from: Splash. FR-001, FR-003, FR-005, FR-007.

- Email, password, unique pseudonym, gender (Sister / Brother). Gender immutable after first set without operator+audit (`{components.field}`).
- Google sign-in **additional**, not the only path. Apple sign-in NEXT — **absent**.
- Captcha / bot check. Non-color fail state (Accessibility Floor).
- Sincerity pledge: commit before Allah to seek marriage; accepts Code of conduct and privacy; copy names honesty about existing marriage (FR-005, FR-089). EXPERIENCE.md mock note: pledge + 19+ note.
- Taken email / pseudonym: conflicting field named (FR-001). Primary disabled until required fields valid.
- Remember-me (FR-008) is a control on this flow; it is not a separate screen.

States: skeleton on splash path; captcha fail named; session cookie or Bearer on success.

### Age gate

Reached from: Auth. FR-011, FR-091.

- DOB field. Primary disabled while DOB blank.
- Under 19: account rejected/held, never listed. Copy does **not** claim statute (A1 open).
- Suspected-minor hold is FR-091, not a Chat state.

States: empty = DOB blank, primary disabled; under 19 error; adult continues to OTP.

### Email verification

Reached from: Auth. FR-006.

- Expiring link.
- Resend.

States: waiting for link; resend in flight; expired link → request new; success = email marked verified.

### Password reset

Reached from: Auth. FR-008.

- Request form.
- Single-use expiring link.
- New password; old sessions dead except the new one.

States: request form; link sending; expired / unknown email per published rule; success = new password.

### OTP

Reached from: after account. FR-002.

- `{components.otp-input}` boxes.
- Resend with published cooldown.
- Wrong code does not leak whether the number exists beyond the published rule.

States: boxes empty; « Code envoyé »; wrong/expired: retry + cooldown; success = phone level granted. Public visibility still blocked until OTP (FR-002).

### ID + liveness

Reached from: after OTP. FR-014, FR-015, FR-105.

- Free. Not Premium. Failure = retake, not paywall.
- ID document + liveness selfie. Liveness must match Profile Photos.
- `{components.liveness-capture}`. Pictogram. Non-color fail state.
- Paid-faster-review does not skip Verification.

States: camera idle + pictogram; capture upload; mismatch / fail: retake, not pay; success = ID level pending human review.

### Onboarding

Reached from: after verification. FR-009, FR-010, FR-137, FR-138.

- Split **minimum-to-browse** vs **complete-to-send-Invite**.
- `{components.completeness-meter}` names missing Islamic criteria. Completeness copy **« Il manque : madhhab »** pattern — no « Votre profil est faible ».
- `{components.audio-prompt}` Mooré or Dioula on hard steps. 2G audio fail → pictograms remain.
- Browse-only CTA when minimum path. Invite send blocked until complete (FR-009).
- Completable via pictogram + audio without a paragraph (FR-070, FR-010).

States: minimum path browse-only CTA; audio buffering (step still usable); 2G audio fail: pictograms; browse unlocked after visibility gates; Invite only if complete.

### Photo rules

Reached from: onboarding / upload. FR-070, FR-010.

- Pictogram + Mooré/Dioula audio. No paragraph required.
- Rejection reasons later map to these published rules (FR-012).

States: inherit empty-state + error-banner.

### PIN lock

Reached from: background >60s `[ASSUMPTION]`. FR-020, NFR-001. Overlay, not a Member tab.

- PIN entry. Shared-phone lock. Member and Mahram.
- 5 fails → re-auth with password or OTP.
- Idle 15 min on Sister/Mahram PIN sessions `[ASSUMPTION]`.
- Long-press reserved for system text selection.

States: inherit empty-state + error-banner. 5-fail deactivates live on Profile edit / PIN lock (EXPERIENCE.md State Patterns closer).

---

## Member core

### Profile edit

Reached from: Profil tab. FR-017, FR-018, FR-021–FR-023.

- Fields named in FR-021: age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, Photos.
- Islamic criteria (FR-022): madhhab, practice level, intentions. Confrérie / hijra NEXT — **absent**.
- `{components.completeness-meter}` names missing fields. No shaming copy.
- Life-pauses deactivate / reactivate (FR-018): Ramadan, exams, travel, grief, plus free text. One-tap reactivate. Existing Chats show a pause state when deactivated.
- New Photo/bio unpublished until review (hands off to Profile not-yet-public).
- Gender not editable here without operator+audit.

States: completeness lists missing fields; save spinner on primary; validation names field; saved. New Photo/bio → not-yet-public.

### Profile not-yet-public

Reached from: Profile edit / upload. FR-012, FR-065. **Not a Chat state.**

- Copy **« Photo en revue — pas encore publique. »** / « En revue ».
- Not a hold inbox. Not “en vérification” as Chat.

States: no pending asset; « En revue »; rejected with published photo-rule reason; approved asset replaces live; old stays until then.

### Discover

Reached from: Découvrir. FR-024, FR-025, FR-136, FR-146.

- Default: `{components.focused-card}` — one Profile.
- Under the photo: `{components.shared-trait}` only (open to polygamy, same town, kids / accepts a partner with kids, other shared Profile fields already in the PRD). Omit when none. Do not invent fields.
- Tap → Profile detail.
- **Passer** = dismiss this card (not a like). No public likes counter. No heart stack.
- Swipe or button to Invite. Quick message. Those obey Invite quota (FR-044 / FR-045) and FR-146.
- `{components.card-grid-toggle}` on this screen. Optional `{components.discovery-card}` grid. Lite: small image, text first. EXPERIENCE.md: default is the single card (spine wins over grid-only mock).
- Favourite is private (FR-026).
- Empty: **« Aucun profil pour ces filtres. »**

States: empty copy above; loading text + lite-placeholder first (≤8s NFR-005), small image deferred; browse error, retry, no invented cards; success = one focused card + toggle.

### Search

Reached from: Discover / filters. Same FRs as Discover.

- Same card/grid toggle. A many-filter search may open on the grid; the single-card toggle remains.
- Basic filters only. FR-030 advanced filters **absent**.
- Lite: small image, text first.

States: same empty / loading / error / success as Discover. FR-030 controls absent.

### Filters

Reached from: Discover / Search. FR-024.

- City, marital, practice, life plans, distance **10 / 25 / 50 / city** `[ASSUMPTION]`.
- Life plans example in PRD: `ready_now`.
- FR-030 stays NEXT — those controls absent.
- Zero results → empty state, no invented Profiles.

States: inherit empty-state + error-banner.

### Profile detail

Reached from: focused card / grid / favourite / invite. FR-015, FR-016, FR-056.

- Opposite-gender blur default (`{components.blur-photo}`). Server `blur` derivative. Never CSS-blur `original`.
- Verification levels: phone / ID / Verified-Mahram. No Premium “looks verified” badge (FR-015). Premium badge NEXT (FR-112) — **absent**.
- Marital status + polygamy intent visible before accept when reached from Invite (FR-037) — also required on Invite inbox.
- Report / Block.
- Reveal / Revoke controls as the Blur / Reveal / Revoke surface.
- Missing optional fields omitted (not placeholder fiction).

States: missing optional omitted; blur thumb first; `REVEAL_DENIED` if clear requested without grant; success = criteria + blur or granted clear.

### Blur / Reveal / Revoke

Reached from: Profile detail / Chat. FR-056–FR-059.

- Per-viewer policies: `on_accept` / `on_request` / `never`.
- `{components.reveal-control}`: 44px, role+pressed/disabled. Caption + pictogram required. Color is not the only Reveal signal.
- Request cap 1 pending per pair `[ASSUMPTION]`.
- Revoke ≤60s. Paid perk cannot grant Reveal.
- Owner (Sister or Brother) can choose the same three policies (FR-057).
- A11y: « Visible pour [pseudonym] » / « Flou rétabli ».

States: never-policy still blur; Reveal request pending (1 max); Revoke network fail: keep trying; grant/revoke reflected ≤60s.

### Favourites

Reached from: Discovery / Profil. FR-026.

- Private list only. No “who favourited me”.

States: **« Aucun favori. »** + Découvrir; list skeleton; save fail, retry; private row only.

### Invite compose + Message Flash

Reached from: Profile detail / focused-card Invite or quick message. FR-038, FR-044–FR-047, FR-105, FR-145, FR-146.

- `{components.flash-composer}` visible before accept. Phone / WhatsApp / links refused (contact-share rule).
- Ice Breaker templates (deen/family). Editable before send. No AI-personalised Ice Breakers (FR-049 NEXT).
- Photo required to contact; block with prompt to add a Photo if none (FR-016).
- Brother: remaining Free Invites **3** `[ASSUMPTION]`; Premium = unlimited Invites. Never a free-unlimited Invite state.
- Sister `free_unlimited`: **« Invitations illimitées. »** No Invite remaining-count. No reach-pack CTA.
- Sister `same_quota_as_brothers`: same remaining Free Invites **3** as Brothers.
- Free message remaining shows the **current admin** `daily_message_cap` (no locked number).
- Mahram banner to Brother from first Flash **only if this thread is granted** (FR-079): **« Un wali lit cette discussion. »**

States: Flash empty, Ice Breaker optional; send in flight; `QUOTA_EXCEEDED` with Ouaga-day reset; `MESSAGE_CAP_EXCEEDED` → Message quota wall (refused, not held); `CONTACT_SHARE_REQUIRED`; success = Invite on recipient list; Flash already visible if under FR-146. Quiet decline: no resend (FR-043).

### Sister invite quota wall

Reached from: Invite compose when `same_quota_as_brothers` and Free Invite cap is hit. FR-044, FR-045, FR-105, FR-145.

- Remaining Invites 0. Ouaga-day reset time.
- `{components.pack-card}` CTA matching Brother checkout. Not rendered in `free_unlimited` for Invite reach.
- Safety stays free.

States: entitlement fetch; `PAY_UNAVAILABLE`: cannot buy; Invite send stays blocked until reset; Chat, Verification, Blur, Mahram, Report, Block stay usable; CTA opens Payment pack.

### Message quota wall

Reached from: Chat / Flash / card quick message when Free Member hits `daily_message_cap`. FR-146, FR-105, FR-044.

- Both genders, including a Free Sister in `free_unlimited`.
- Remaining messages 0. Current admin cap shown (no locked number). Ouaga-day reset.
- Copy **« Envoi refusé. Quota du jour atteint. »** + pack. Over-cap is refused, not held for scan.
- Premium never sees this wall.

States: entitlement fetch; `PAY_UNAVAILABLE`: cannot buy; over-cap stays refused; safety stays usable; CTA opens Payment pack.

### Invite inbox

Reached from: Invitations tab. FR-037, FR-039, FR-040, FR-042.

- Sent / received / accepted.
- `{components.invite-row}`: marital status + polygamy intent **required visible before accept**.
- Accept opens Chat.
- Quiet decline: `{components.button-quiet}` **« Refuser discrètement »**. No read receipt to the Brother. No resend.
- Stage **invite** on pending Invite (FR-028).

States: **« Aucune invitation. »**; list skeleton; accept fail if other married/Banned; accept → Chat; decline → declined without lecture.

### Discussions list

Reached from: Discussions tab. FR-041, FR-050.

- Open Chats after Sister consent. Not a hold inbox. No hold badge.

States: **« Aucune discussion. »**; list skeleton; fetch fail, retry; row opens Chat; unread increment.

### Chat thread

Reached from: Accept / Discussions list. FR-041, FR-050, FR-051, FR-062–FR-064, FR-146.

- Text, Photo (gallery/camera), Voice. Immediate delivery when send is allowed.
- `{components.stage-chip}`: `invite` / `chat` / `meeting` / `married`. Meeting is a confirm, not the NEXT planner.
- `{components.chat-bubble}`: persist `delivered` immediately. Time-only meta. **Banned states:** pending-moderation, held, scan-wait. Copy **« Votre message est arrivé. »** Send announces « Message envoyé » — never « en vérification » and never the word « scan ».
- `{components.voice-note}`: play as soon as stored. No member-facing transcript.
- `{components.mahram-banner}` if this thread is granted.
- Typing indicator (FR-050, ≤2s). Reactions exist per FR-050 (control chrome **gap** — do not invent).
- Lite: chat media waits for **connection**, not AI. Text outbox offline.
- Contact-share blocks phone, WhatsApp, links until both opt in.
- Report / Block. Marriage dual-confirm entry. Reveal / Revoke.
- Free-tier sends obey FR-146; over-cap → Message quota wall.
- GIF picker **absent**.

States: new Chat stage **chat**, no scan banner; thread open ≤4s; typing ≤2s; send fail = connection; over-cap = quota wall; **never** “held for scan”; allowed bubble `delivered` immediately.

### Contact-share interstitial

Reached from: send blocked. FR-068. Dialog. Modal stack one level.

- Shown to **both** Members on `CONTACT_SHARE_REQUIRED`.
- Copy **« Les numéros et WhatsApp attendent l’accord des deux. »**
- Not an AI hold. Do not reuse this interstitial for money-ask (money-ask is delivered and flagged).

States: both not opted in; opt-in in flight; one-sided yes: still blocked; both yes: numbers/links may send; scan still runs after.

### Report / Block

Reached from: Profile / Chat. FR-083, FR-084, FR-037.

- Report: reason required (includes marital misrepresentation). Starts SLA.
- Block: hides; they can no longer see or contact you.
- Rate limit on error.

States: reason required; submit in flight; rate limit; Report: SLA started; Block: hidden.

### Marriage dual-confirm

Reached from: Chat / settings. FR-095–FR-098.

- Joint **« nous nous sommes mariés »** naming the other. One-sided does nothing (no counter, no availability change).
- Optional private nikah proof (certificate or imam/Mahram attestation) stored privately, never published.
- Counter stays 0 until both confirm.

States: one spouse started / waiting other; expired 30d `[ASSUMPTION]` without confirm: no counter; both confirm: joint **married**, counter +1.

### Consent story

Reached from: after dual-confirm. FR-099, FR-100.

- Optional. City, date, faces optional/blurred, no Chat excerpts.
- Either spouse can refuse public.
- Extra family-ok checkbox `[ASSUMPTION]`.

States: form after dual-confirm; submit; one spouse refuses public: showcase empty of faces; public only if both (and family-ok if set) consent.

### Payment pack

Reached from: Settings / Invite quota wall / Message quota wall. FR-044, FR-045, FR-104–FR-107, FR-145, FR-146.

- `{components.pack-card}`: 1 / 3 / 6, explicit `ends_at`, no renew toggle.
- Rails: Orange Money BF, Moov Africa BF, Wave/Coris where available, cards secondary.
- Audio on no-auto-renew. Selected pack.
- Brothers always. Sisters in both `sister_reach_mode` values (messages capped). In `free_unlimited` pack is for unlimited messages, not Invite reach.
- Never a brother-free pack. Rail down: Free + safety stay.

States: pack list from `/v1/packs`; hosted/rail redirect; `PAY_UNAVAILABLE`: Free + safety stay; entitlement until `ends_at`; unlimited Invites and unlimited messages; no renew job.

### Notifications

Reached from: Bell / OS. FR-052, FR-053.

- Template + ids. Blur thumbs. No Chat body, no phone, no clear Sister Photo thumbnail.
- In-app unread still increments if push denied.
- SMS (not a screen): Invite received (Sister), Mahram flag/pause/end, admin sanctions that suspend or Ban, OTP. No Photo payloads.

States: **« Aucune alerte. »**; push denied: in-app unread still increments; success = template + blur thumb only.

### Settings

Reached from: Profil. FR-019, FR-020, FR-120, FR-136, FR-138.

- Lite mode.
- Audio language (Mooré / Dioula).
- PIN.
- Delete / export.
- CIL / hosting disclosure — hosting line **always visible**. Operator cannot hide it.
- No “who viewed me” list (FR-027).
- Public pricing / Payment pack reachable from settings (IA).
- Marriage dual-confirm reachable from settings (IA).

States: current values; delete/export ticket error → status URL still issued if scheduled; Lite/audio/PIN persist; hosting line always visible.

### Delete / export status

Reached from: Settings. FR-019, FR-143, NFR-008.

- Status URL + ticket. Not Gmail-only.
- Download export from the status page (no personal inbox).
- Ticket from the status page when stuck.

States: inherit empty-state + error-banner. Retention clocks show working NFR-008 numbers as `[ASSUMPTION]` (EXPERIENCE.md open question 12).

### Appeal

Reached from: Sanction notice (unnamed — see Gaps). FR-090.

- Member Review. Second human.
- For suspension or Ban.

States: form; submit; window closed; second-human queue.

### Family guidance

Reached from: onboarding / help. FR-080.

- Mahram optional, Sister-initiated.

States: inherit empty-state + error-banner.

---

## Mahram

### Mahram invite (Sister)

Reached from: Chat / onboarding. FR-071.

- Invite by phone. Not forced.
- `{components.audio-prompt}` explainer (FR-010, FR-138).
- Unmatched friend rejected at relationship step (next surface).

States (attach group): phone blank; friend class rejected; OTP sending; wrong relationship / expired 7d `[ASSUMPTION]`; confirmed + **empty grant list**.

### Mahram OTP + relationship

Reached from: SMS deep link. FR-072, A2.

- OTP.
- Relationship: `father` / `brother` / `uncle` / `other_mahram`. Unmatched friend rejected.
- No Member browse / Invite identity. Mahram accounts cannot send Invites or appear in people lists `[ASSUMPTION]`.

### Sister confirm Mahram

Reached from: Notification. FR-073.

- Confirm or let 7-day expire `[ASSUMPTION]`.
- After confirm he is **not** attached to every conversation.

### Mahram grant list

Reached from: after Sister confirm. FR-074.

- Empty grant list after confirm: **« Aucune discussion accordée. »** + pick threads.
- `{components.mahram-grant-row}`: Sister picks which Brother threads to grant. New Chats are not auto-granted. Revoke one thread.
- Remove drops every grant (FR-077).

States: empty after confirm; list of her Brother threads; grant fail, retry; one or more grants; new Chats stay ungranted until she picks them.

### Mahram revoke one thread

Reached from: Grant list / Chat. FR-074. Action / dialog, one level.

- Drops that grant only. Other grants stay.

States: revoke in flight; network fail: keep trying; that thread gone from his list; other grants stay.

### Mahram thread list

Reached from: Mahram home. FR-074, FR-076.

- **Only granted** threads. No compose. Read delivered messages only. No Découvrir. No Invitations.

States: **« Aucune discussion accordée. »**; list skeleton; fetch fail, retry.

### Mahram read-only thread

Reached from: granted thread only. FR-074, FR-076.

- Read delivered messages. Compose **absent**. Banner + pause/end/flag.
- Not granted / revoke already applied: **« Accès retiré »**.

States: granted thread, no messages yet; same as Chat load; not granted: « Accès retiré »; delivered messages visible; compose absent.

### Mahram pause / end / flag

Reached from: granted read-only thread. FR-075, FR-087.

- Pause: both compose off. End: terminal. Flag: priority case.
- Rejected on a thread that is not granted. Brother resume of a Mahram pause rejected.
- SMS both Members on pause/end/flag (FR-053).

States: action in flight; Brother resume rejected; pause/end/flag on ungranted thread rejected.

### Verified-Mahram ID (optional)

Reached from: Mahram settings. FR-078.

- Optional ID + liveness. No kinship document. Still grant-scoped.
- Badge if ID done. Member-facing French may say *wali vérifié* (PRD glossary).

### Remove / Report Mahram

Reached from: Sister Chat / settings / grant list. FR-077, FR-074.

- `{components.button-quiet}`. No confirm-shaming.
- Revoke entire permission: every thread grant gone. Read access gone ≤60s.
- Optional 24h emergency hide `[ASSUMPTION]`. SMS both sides.

---

## Staff

Every staff surface: `{components.staff-only-badge}` visible. Members never see this chrome. Two-pane from 768px; below 768 the queue stacks above the case. Staff unblur is not in the member tab order.

### Admin flag queue

Reached from: Staff home (unnamed — see Gaps). FR-067, FR-144.

- Already-delivered items + scan-deferred / scan-failed. Staff-only. Not a hold queue.
- `{components.admin-flag-row}` kinds: `flag-for-admin` | `scan-deferred` | `scan-failed`. Opening a row never changes `message.state`.
- Staff-only badge on every row.

States: **« File vide »** (delivery still happened in the world); queue fetch; staff auth fail; row for flag or scan-deferred.

### Case file

Reached from: Flag row / Report. FR-087, FR-088, FR-093.

- Text / Photo / Voice + scores + report + fingerprint hints (device/phone/ID).
- Thumbs stay blurred. Unblur requires a **typed case reason** and writes audit. Control stays disabled without reason.
- Evidence snapshot immutable on Strike save.

States: missing evidence named; case fetch; staff auth fail; unblur locked until typed reason; reason-entered unblur writes audit; decision saved.

### Sanction

Reached from: Case. FR-085, FR-144.

- `{components.sanction-action}`: warning / suspend / other published action. Photo Strike 3→24h is a published floor.
- AI is not a control. Paid-faster-review must not skip scan or auto-clear a flag.
- False-report pattern can itself be sanctioned (FR-086) via this ladder.
- Member receives published-status outcome. Sanction copy: published status in respectful Ouaga French. No meme macros.

States: action unselected; write + audit; cannot apply as AI; warning / suspend / other saved; Member notified.

### Appeal review

Reached from: Appeal queue. FR-090.

- Second human (not the original decider).

States: inherit empty-state + error-banner.

### Operator policy / thresholds

Reached from: Operator. FR-140.

- Policy text + flag confidence + photo-Strike.
- Policy must say: delivered then scanned; AI flags a human; AI does not silently delete, block, or hold.
- New thresholds apply to **subsequent** scans only. UI states subsequent-only. Do not silently rewrite old decisions.
- `{components.staff-only-badge}`.

States: current pack prices and thresholds (grouped with pricing in State Patterns); save; validation; audited change.

### Operator pricing

Reached from: Operator. FR-139, FR-106, FR-145.

- Pack prices / durations 1 / 3 / 6. Auto-renew stays **off** (no control to turn it on).
- Hosts `{components.operator-reach-mode}` and `{components.operator-message-cap}` (next two surfaces, same page cluster).

### Operator sister-reach mode

Reached from: Operator pricing / policy. FR-145.

- `{components.operator-reach-mode}`: `free_unlimited` (DEFAULT) | `same_quota_as_brothers`. Two values only. No brother-free option.
- `{components.staff-only-badge}`. Save writes audit. Subsequent Sister Invites only; past Invites stay.
- Message-cap control sits next to this.

States: current mode (`free_unlimited` selected if unset); save in flight; validation / unauthorized; audited change; member Invite/pricing UI switches on next open.

### Operator daily message cap

Reached from: Operator pricing / policy, next to `sister_reach_mode`. FR-146.

- `{components.operator-message-cap}`: shows the **current admin** `daily_message_cap`. No locked number in UI copy.
- `{components.staff-only-badge}`. Save writes audit. Subsequent Free-tier sends only. Premium unlimited.

States: current admin value; save in flight; validation / unauthorized; audited change.

### Operator metrics

Reached from: Operator. FR-092, FR-142.

- Internal only. Public counters stay proof-backed.
- Verified Members by level, dual-confirmed marriages, report SLA, scan-deferred events.
- Scan-deferred counted, never hidden. Zero-launch counters valid.
- Free-queue SLA-breach flagged when a Free Profile waits longer than the published SLA (FR-013). Show `operator_config` value; do not invent a second number.

States: zero-launch counters valid; refresh.

### Operator CIL / deletion tickets

Reached from: Operator. FR-143.

- Status the Member can see. Clock breach flagged.

States: empty queue; ticket fetch; clock breach flagged; Member status page shows completed.

### Operator Board / Académie publish

Reached from: Operator. FR-141, FR-115.

- Names + five articles.

States: fewer than five articles; save; missing scholar review; five live articles; names published.

### T&S visit signals

Reached from: Moderator. FR-027.

- Mass-view-then-never-Invite. `[ASSUMPTION: 50]` Profiles in 24h without Invite.
- No member visitors list.

States: inherit empty-state + error-banner.

---

## NEXT — named, not designed as shipping

Do not mock these as live. EXPERIENCE.md NEXT table + PRD NEXT FRs:

- Mahram dashboard (multi-ward + digest) — FR-081
- Meeting planner (time/place/attendees) — FR-082
- Native iOS + Apple sign-in — FR-135, FR-004
- Advanced paid filters — FR-030
- Who favourited me / visitors / online-now / anonymous / boosts / GIF picker / USSD — FR-033–FR-036, FR-054, FR-055, FR-111
- Testimonials carousel — FR-102
- Premium badge — FR-112
- Blog, video, coach, full Académie, remaining SEO — FR-121–FR-125
- Anti-leak polish (watermark, screenshot notice, no downloads) — FR-061
- Confrérie / hijra fields — FR-029

---

## Dialogs and overlays already named above

These are not extra screens. They are the IA surfaces that EXPERIENCE.md already treats as interstitial / overlay. Modal stack is one level.

| Surface | Kind |
|---|---|
| Cookie consent | Banner / dialog |
| PIN lock | Overlay |
| Filters | Overlay or sheet (not specified beyond surface name) |
| Contact-share interstitial | Interstitial |
| Sister invite quota wall | Wall / overlay |
| Message quota wall | Wall / overlay |
| Report / Block | Dialog |
| Blur / Reveal / Revoke | Controls on Profile detail / Chat |
| Mahram revoke one thread | Action / dialog |
| Age gate | Screen in the identity path |

Do not add a second modal layer. Do not invent additional dialogs (first-wife notice, confirmshaming decline, auto-renew toggle, scan-hold, brother-free pack).

---

## Ethics (do not ship)

- No roach motel, confirmshaming, sneak-into-basket, bait-and-switch.
- No « Essai gratuit puis on prélève ».
- Quiet decline is quiet. Pass is dismiss, not a like.
- Safety is not a paywall. Over-cap send is refused, not held for scan.
