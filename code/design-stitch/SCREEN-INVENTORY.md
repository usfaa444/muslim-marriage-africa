# AnKanu — screen inventory (no Stitch)

Status: **awaiting founder approval**. No Google Stitch call. No HTML/PNG download. No invented screens.

This file is the design-gate inventory (ticket ANK-7). Layout files are not in this folder yet.

## Sources (only)

| Source | Path | Role |
|---|---|---|
| Product brief | `_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/brief.md` | Scope and named surfaces |
| PRD | `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` | Every MVP FR, not epics one-liners |
| EXPERIENCE.md | `_bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md` | Named screens, elements, empty/loading/error/success |

`DESIGN.md` is tokens only. It does not add screens. Local UX mock HTML under `_bmad-output/.../mockups/` is not Stitch and is not copied here.

Screen names below are the EXPERIENCE.md IA / traceability names unless marked **PRD-named, IA omitted**.

## Rules applied

- **Stitch is source** — not this heartbeat. HTML/PNG are out of scope until founder approval.
- **No invented screens** — if brief / PRD / EXPERIENCE.md do not name it, it is not listed as shipping.
- **Tokens only from DESIGN.md** — no restyle license; tokens unused here.
- **Honorable ta'aruf** — no dating-app chrome the documents reject (`dating` / `rencontre romantique`, « en ligne », invented scale, public likes, heart stack).
- **Accessibility as written** — EXPERIENCE.md Accessibility Floor only. Not a parallel spec.
- **Ethics** — no roach motel, confirmshaming, sneak-into-basket, bait-and-switch. Quiet decline. No silent auto-renew. Safety never paywalled.

## Shared chrome (named)

| Shell | Who | Chrome the sources name |
|---|---|---|
| Public | Visitor | Footer to Legal hub / FAQ. Cookie consent on first hit. No member bottom nav. |
| Member | Sister / Brother | Bottom nav: **Découvrir · Invitations · Discussions · Profil**. Phone-first. Modal stack: one level. |
| Mahram | Read-only guardian | Phone-first. **No Découvrir. No Invitations. No Invite.** No compose. |
| Staff | Moderator / Operator | `{components.staff-only-badge}` on every staff surface. Two-pane from 768px; stacked below. Members never see this chrome. |

French-first on every primary screen (FR-137). Time: `Africa/Ouagadougou`. Invite quotas and Free message cap reset on that civil day.

**Banned on every surface:** pending-moderation / held / scan-wait Chat states; GIF picker; Apple sign-in; brother-free mode; first-wife notification; who-favourited-me; member visitors; online-now; invented DAU; testimonials carousel (NEXT).

**Audio (Mooré / Dioula) only where named:** onboarding, photo rules, no-auto-renew, Mahram invite explainers. 2G audio fail → pictograms remain.

---

## Out of MVP — do not design as shipping

From EXPERIENCE.md “NEXT — out of MVP” and PRD NEXT/LATER FRs. Named so they are not invented later as MVP:

Mahram dashboard (multi-ward + digest); meeting planner (time/place/attendees — MVP has stage **meeting** only); native iOS + Apple sign-in; advanced paid filters; who favourited me; visitors list; online-now; anonymous mode; boosts; Premium badge as identity; GIF/sticker picker; USSD; anti-leak watermark/screenshot-notice; AI coach; blog; promo video; testimonials carousel; remaining SEO locales; language filters; quiet hours; Istikhara companion; Mahr conversation card; mosque attestation; alumni mentorship; English/Arabic UI; live 1:1 A/V.

---

## 1. Public

### Public landing

- **From:** cold URL / store
- **Implements:** FR-101, FR-117, AD-25
- **Elements:** honorable ta'aruf pitch (*mariage / ta'aruf / nikah / khitba* only); Verified-marriages counter copy **« Mariages confirmés : 0 »** until dual-confirm; entry to signup / pricing / Académie / Board / showcase as linked from this spine; no invented DAU
- **Empty:** counter at 0 is valid
- **Loading / Error:** inherit `empty-state` + `error-banner`
- **Success:** visitor can continue to Auth or content

### Legal hub

- **From:** footer
- **Implements:** FR-109, FR-119, FR-120, AD-5, AD-19
- **Elements:** Mentions; CGV / refunds (must match pricing summary); cookies; privacy with hosting/CIL line Operators cannot hide
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`
- **Note:** EXPERIENCE.md names one hub, not four separate layouts. Do not invent extra chrome per document.

### Public pricing

- **From:** landing / settings
- **Implements:** FR-044, FR-045, FR-105, FR-106, FR-108, FR-145, FR-146, AD-14
- **Elements:** `{components.pack-card}` 1 / 3 / 6 month in XOF; Free tier described; launch price and normal price both shown when a launch price exists (FR-108); **« Pas de renouvellement automatique. »** + `{components.audio-prompt}` on that line; safety stays free; rails Orange Money BF / Moov Africa BF / Wave/Coris (cards secondary). **Brother / Sister `same_quota_as_brothers`:** same pack list and Free Invite cap as checkout. **Sister `free_unlimited`:** « Invitations illimitées. »; pack listed for unlimited messages, not required for Invite reach. No brother-free pack.
- **Empty:** pack list from `/v1/packs` (Brother and Sister `same_quota_as_brothers`); unlimited Invite copy + message pack (Sister `free_unlimited`)
- **Loading:** page load
- **Error:** copy/rail error does not hide Free or safety (`PAY_UNAVAILABLE` does not disable Chat, Report, Blur, Mahram, Verification, Block)
- **Success:** prices match checkout

### Académie list + article

- **From:** landing / help
- **Implements:** FR-115, AD-24
- **Elements:** five scholar-reviewed articles named and marked reviewed; reviewer name; article body; *mariage / ta'aruf / nikah / khitba* only. Unpublished draft → 404 (FR-141).
- **Empty:** fewer than five articles is unmet (Operator publish). Inherit `empty-state` + `error-banner` on the public list.
- **Loading / Error:** inherit `empty-state` + `error-banner`
- **Note:** EXPERIENCE.md names list + article as one surface. Do not invent a third Académie chrome.

### Advisory Board

- **From:** landing / help
- **Implements:** FR-116, AD-22
- **Elements:** named scholars with roles (at least two at launch); fiqh-edge is human, not a bot. **Do not hardcode scholar names** (open question 4).
- **Empty:** no names → FR unmet; do not ship a fictional board
- **Loading / Error:** inherit `empty-state` + `error-banner`

### FAQ + contact

- **From:** footer
- **Implements:** FR-118
- **Elements:** FAQ; ticketed contact form (not Gmail-only); subject triage including misuse; ticket id returned on submit
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

### Showcase

- **From:** landing
- **Implements:** FR-099, FR-100, AD-25
- **Elements:** consent stories only; faces optional; no Chat excerpts; empty is valid and points at the counter at 0, not invented quotes
- **Empty:** no stories — counter at 0, no fake quotes
- **Loading / Error:** inherit `empty-state` + `error-banner`

### Cookie consent

- **From:** first public hit
- **Implements:** FR-119, AD-9
- **Elements:** accept; manage; cookies ≠ likeness grant (accept never implies Profile Photo campaign rights)
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

### SEO pages — Ouagadougou, Bobo-Dioulasso, Burkina Faso *(PRD-named, IA omitted)*

- **From:** URLs (FR-117)
- **Implements:** FR-117
- **Elements the PRD states:** HTTP 200; local imam-reviewed copy; no dating / *rencontre romantique* lexicon
- **Unspecified — do not invent:** layout, nav, hero, CTAs beyond what Public landing already names. See Gaps.

---

## 2. Identity and onboarding

### Splash

- **From:** app open
- **Implements:** FR-132, FR-133, FR-134, AD-4
- **Elements:** brand field; continue; product name **AnKanu** (ankanu.com)
- **Empty:** —
- **Loading:** skeleton on splash ≤2s
- **Error:** `UNAUTHENTICATED` / captcha fail named
- **Success:** session cookie or Bearer; next is age gate or home

### Auth (signup / login)

- **From:** Splash
- **Implements:** FR-001, FR-003, FR-005, FR-007, AD-8
- **Elements:** `{components.field}` email; password; unique pseudonym; gender Sister / Brother (immutable after first set without operator+audit); Google additional (not the only path); captcha; sincerity pledge naming honesty about existing marriage + Code of conduct + privacy; 19+ note; remember-me (FR-008); `{components.button-primary}` disabled until required fields valid. No Apple control on MVP.
- **Empty:** —
- **Loading:** skeleton on splash path ≤2s
- **Error:** taken email/pseudonym names the field; captcha fail named; `UNAUTHENTICATED`
- **Success:** account exists, **not** publicly visible until FR-012 and FR-014

### Age gate

- **From:** Auth
- **Implements:** FR-011, FR-091, AD-8
- **Elements:** `{components.age-gate}` DOB; primary disabled while blank; copy does not claim statute (A1 legal review open)
- **Empty:** DOB blank, primary disabled
- **Loading:** —
- **Error:** under 19 — account rejected/held, never listed
- **Success:** adult continues to OTP

### Email verification

- **From:** Auth
- **Implements:** FR-006
- **Elements:** waiting-for-link state; resend
- **Empty:** waiting for link
- **Loading:** resend in flight
- **Error:** expired link — request new
- **Success:** email marked verified

### Password reset

- **From:** Auth
- **Implements:** FR-008
- **Elements:** request form; single-use expiring link; new password
- **Empty:** request form
- **Loading:** link sending
- **Error:** expired / unknown email per published rule
- **Success:** new password; old sessions dead

### OTP

- **From:** after account
- **Implements:** FR-002, AD-13
- **Elements:** `{components.otp-input}`; resend cooldown published; phone OTP before public visibility
- **Empty:** boxes empty
- **Loading:** « Code envoyé »
- **Error:** wrong/expired — retry + cooldown; does not leak whether the number exists beyond the published rule
- **Success:** phone level granted

### ID + liveness

- **From:** after OTP
- **Implements:** FR-014, FR-015, FR-105, AD-13
- **Elements:** `{components.liveness-capture}` free (not Premium); ID document; must match Profile Photos; retake on fail, not paywall
- **Empty:** camera idle + pictogram
- **Loading:** capture upload
- **Error:** mismatch / fail — retake, not pay
- **Success:** ID level pending human review

### Onboarding

- **From:** after verification
- **Implements:** FR-009, FR-010, FR-137, FR-138, AD-24
- **Elements:** split **minimum-to-browse** vs **complete-to-send-Invite**; `{components.completeness-meter}`; `{components.audio-prompt}` on hard steps; pictogram path if audio fails
- **Empty:** minimum path — browse-only CTA
- **Loading:** audio buffering (step still usable)
- **Error:** 2G audio fail — pictograms
- **Success:** browse unlocked after visibility gates; Invite only if complete

### Photo rules

- **From:** onboarding / upload
- **Implements:** FR-070, FR-010, AD-24
- **Elements:** pictograms + French text + Mooré/Dioula audio; completable without a paragraph; modest / recent / real / no third parties
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

### PIN lock

- **From:** background >60s `[ASSUMPTION]`
- **Implements:** FR-020, NFR-001, AD-8
- **Elements:** `{components.pin-lock}`; 5 fails → re-auth; idle 15 min on Sister/Mahram PIN sessions `[ASSUMPTION]`
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`. PIN 5-fail lives here and on Profile edit.

---

## 3. Member core

### Profile edit

- **From:** Profil tab
- **Implements:** FR-017, FR-018, FR-021, FR-022, FR-023, AD-26
- **Elements:** fields age/DOB, city/country, origin, marital status (`single` / `married` / `divorced` / `widowed`), education, profession, practice, intentions, description, Photos; Islamic criteria madhhab / practice / intentions (confrérie + hijra absent — NEXT); `{components.completeness-meter}` names missing criteria (« Il manque : madhhab » — never « Votre profil est faible »); Brother `married` must set polygamy intent `no` / `yes`; life-pauses deactivate: Ramadan, exams, travel, grief + free text; one-tap reactivate; Photo changes re-moderated. Shared-trait example “kids / accepts a partner with kids” is display-only if already on both Profiles — FR-021 does not name a kids field. Do not invent it (G16).
- **Empty:** completeness lists missing fields
- **Loading:** save spinner on primary
- **Error:** validation names the field
- **Success:** saved. New Photo/bio → **not-yet-public**

### Profile not-yet-public

- **From:** Profile edit / upload
- **Implements:** FR-012, FR-065, AD-10
- **Elements:** « Photo en revue — pas encore publique. » Not a Chat state.
- **Empty:** no pending asset
- **Loading:** « En revue »
- **Error:** rejected with published photo-rule reason
- **Success:** approved asset replaces live; old stays until then

### Discover

- **From:** Découvrir
- **Implements:** FR-024, FR-025, FR-136, FR-146, AD-16
- **Elements:** `{components.focused-card}` default (one Profile); `{components.blur-photo}`; `{components.shared-trait}` under photo only if in common (open to polygamy, same town, kids / accepts a partner with kids, other shared Profile fields already in the PRD — omit when none); tap → Profile detail; **Passer** = dismiss (not a like); swipe or `{components.button-primary}` Invite; quick message; quotas FR-044/FR-045 and FR-146; `{components.card-grid-toggle}`; optional `{components.discovery-card}` grid; Lite: small image, text first; private favourite control. No public likes. No heart stack. No « en ligne ».
- **Empty:** « Aucun profil pour ces filtres. »
- **Loading:** text + `{components.lite-placeholder}` first (≤8s); small image deferred
- **Error:** browse error, retry; no invented cards
- **Success:** one focused card; toggle present

### Search

- **From:** Discover / filters
- **Implements:** FR-024, FR-025, FR-136, FR-146, AD-16
- **Elements:** same card/grid toggle as Discover; many-filter search may open on the grid; single-card toggle remains; FR-030 controls **absent**
- **Empty / Loading / Error / Success:** same as Discover

### Filters

- **From:** Discover / Search
- **Implements:** FR-024
- **Elements:** city; marital; practice; life plans (`ready_now` / `within_year` / `exploring`); distance 10 / 25 / 50 / city `[ASSUMPTION]`. No advanced paid filters.
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

### Profile detail

- **From:** focused card / grid / favourite / invite
- **Implements:** FR-015, FR-016, FR-056, AD-9
- **Elements:** `{components.blur-photo}` opposite-gender default; verification levels phone / ID / Verified-Mahram (Premium must not look like identity Verification); marital status + polygamy intent; Report / Block; Reveal/Revoke controls when owner or granted
- **Empty:** missing optional fields omitted
- **Loading:** blur thumb first
- **Error:** `REVEAL_DENIED` if clear requested without grant
- **Success:** criteria + blur or granted clear

### Blur / Reveal / Revoke

- **From:** Profile detail / Chat
- **Implements:** FR-056, FR-057, FR-058, FR-059, AD-9
- **Elements:** `{components.reveal-control}` 44px, role+pressed/disabled; per-viewer `on_accept` / `on_request` / `never`; request cap 1 pending per pair `[ASSUMPTION]`; Revoke ≤60s; caption + pictogram (color is not the only signal); paid perk cannot grant Reveal. Brother can choose the same three policies.
- **Empty:** never-policy: still blur
- **Loading:** Reveal request pending (1 max)
- **Error:** Revoke network fail — keep trying; gateway denylist is source of truth
- **Success:** grant/revoke reflected ≤60s
- **Announce:** « Visible pour [pseudonym] » / « Flou rétabli »

### Favourites

- **From:** Discovery / Profil
- **Implements:** FR-026
- **Elements:** private list only. No “who favourited me”.
- **Empty:** « Aucun favori. » + Découvrir
- **Loading:** list skeleton
- **Error:** save fail, retry
- **Success:** private row only

### Invite compose + Message Flash

- **From:** Profile detail / focused-card Invite or quick message
- **Implements:** FR-038, FR-044, FR-045, FR-046, FR-047, FR-105, FR-145, FR-146, AD-23
- **Elements:** `{components.flash-composer}` (visible before accept); Ice Breaker deen/family templates (not AI-personalised); phone/WhatsApp/links refused; `{components.mahram-banner}` to Brother from first Flash **only if this thread is granted**. Photo required to send Invite — block with prompt to add a Photo (FR-016). **Brother:** remaining Free Invites **3** `[ASSUMPTION]`; Premium = unlimited Invites; never a free-unlimited Invite state. **Sister `free_unlimited`:** « Invitations illimitées. »; no Invite remaining-count; no reach-pack CTA. **Sister `same_quota_as_brothers`:** same remaining **3** as Brothers. Free message remaining shows current admin `daily_message_cap` (no locked number).
- **Empty:** Flash empty; Ice Breaker optional; remaining copy as above
- **Loading:** send in flight
- **Error:** `QUOTA_EXCEEDED` with Ouaga-day reset (Brother and Sister `same_quota_as_brothers` only); `MESSAGE_CAP_EXCEEDED` → Message quota wall (refused, not held); `CONTACT_SHARE_REQUIRED`. Sister `free_unlimited` never Invite `QUOTA_EXCEEDED` and never a reach-pack offer.
- **Success:** Invite on recipient list; Flash already visible if under FR-146

### Sister invite quota wall

- **From:** Invite compose when `same_quota_as_brothers` and Free Invite cap is hit
- **Implements:** FR-044, FR-045, FR-105, FR-145, AD-14, AD-23
- **Elements:** remaining Invites 0; Ouaga-day reset time; `{components.pack-card}` CTA matching Brother checkout. **Not shown** in `free_unlimited` for Invite reach. Safety stays free.
- **Empty:** remaining 0 + reset + pack CTA
- **Loading:** entitlement fetch
- **Error:** `PAY_UNAVAILABLE` — cannot buy; Invite send stays blocked until reset; Chat, Verification, Blur, Mahram, Report, Block stay usable
- **Success:** CTA opens Payment pack; after purchase: unlimited Invites and unlimited messages

### Message quota wall

- **From:** Chat / Flash / card quick message when a Free Member hits `daily_message_cap`
- **Implements:** FR-146, FR-105, FR-044
- **Elements:** remaining messages 0; current admin `daily_message_cap` shown (no locked number); Ouaga-day reset; `{components.pack-card}` CTA; copy **« Envoi refusé. Quota du jour atteint. »** + pack. Both genders, including Free Sister in `free_unlimited`. Premium never sees this wall.
- **Empty:** remaining 0 + cap + reset + pack
- **Loading:** entitlement fetch
- **Error:** `PAY_UNAVAILABLE` — cannot buy; over-cap send stays refused, not held; safety stays usable
- **Success:** CTA opens Payment pack; after purchase: unlimited messages and unlimited Invites

### Invite inbox

- **From:** Invitations tab
- **Implements:** FR-037, FR-039, FR-040, FR-042, AD-26
- **Elements:** lists Sent / Received / Accepted; `{components.invite-row}` with marital status + polygamy intent **before** accept; accept; `{components.button-quiet}` **« Refuser discrètement »** (no guilt timer, no « Elle a vu », no lecture); no resend after refuse; declined does not name guilt copy
- **Empty:** « Aucune invitation. »
- **Loading:** list skeleton
- **Error:** accept fail if other married/Banned
- **Success:** accept → Chat; decline → declined without lecture

### Discussions list

- **From:** Discussions tab
- **Implements:** FR-041, FR-050, AD-15
- **Elements:** open Chats after Sister consent; unread increment; **no hold badge**
- **Empty:** « Aucune discussion. »
- **Loading:** list skeleton
- **Error:** fetch fail, retry
- **Success:** row opens Chat

### Chat thread

- **From:** Accept / Discussions list
- **Implements:** FR-041, FR-050, FR-051, FR-062, FR-063, FR-064, FR-146, AD-10, AD-15
- **Elements:** `{components.chat-bubble}` persist `delivered` immediately; `{components.voice-note}` play as soon as stored (no member-facing transcript); text; Photo gallery/camera; typing indicator ≤2s; `{components.stage-chip}` `invite` / `chat` / `meeting` / `married` (meeting is a confirm, not the NEXT planner); `{components.mahram-banner}` if granted; `{components.reveal-control}`; Report / Block; send announces « Message envoyé » never « en vérification » / « scan ». Ack copy: « Votre message est arrivé. » Compose off when Mahram-paused. Ended Chat is terminal. Free-tier sends obey FR-146. No GIF picker. **Banned states:** pending-moderation, held, scan-wait. Reactions exist (FR-050) but EXPERIENCE.md does not name a reaction control — see G13. Meeting confirm exists (FR-028) but has no named dialog — see G14.
- **Empty:** new Chat — stage **chat**, no scan banner
- **Loading:** thread open ≤4s; typing ≤2s
- **Error:** send fail = connection. Over-cap = Message quota wall. **Never** “held for scan”
- **Success:** allowed bubble `delivered` immediately. Offline: text outbox; media waits for **connection**, not AI

### Contact-share interstitial

- **From:** send blocked (`CONTACT_SHARE_REQUIRED`)
- **Implements:** FR-068, AD-17
- **Elements:** `{components.contact-share-interstitial}` shown to **both** Members; blocks phone, WhatsApp, links until both opt in; « Les numéros et WhatsApp attendent l’accord des deux. » Not an AI hold. **Do not reuse for money-ask.**
- **Empty:** both not opted in
- **Loading:** opt-in in flight
- **Error:** one-sided yes — still blocked
- **Success:** both yes — numbers/links may send; scan still runs after

### Report / Block

- **From:** Profile / Chat
- **Implements:** FR-083, FR-084, FR-037
- **Elements:** Report with reason (includes marital misrepresentation); starts 24h SLA; Block hides — they can no longer see or contact you
- **Empty:** reason required
- **Loading:** submit in flight
- **Error:** rate limit
- **Success:** Report: SLA started. Block: hidden

### Marriage dual-confirm

- **From:** Chat / settings
- **Implements:** FR-095, FR-096, FR-097, FR-098, AD-25
- **Elements:** joint « nous nous sommes mariés » naming the other; one-sided does nothing; optional private nikah proof (never published); counter stays 0 until both confirm
- **Empty:** one spouse started
- **Loading:** waiting other
- **Error:** expired 30d `[ASSUMPTION]` without confirm — no counter
- **Success:** both confirm — joint **married**, counter +1; both leave browse; no new Invites

### Consent story

- **From:** after dual-confirm
- **Implements:** FR-099, FR-100, AD-25
- **Elements:** optional; city; date; faces optional/blurred; no Chat excerpts; either spouse can refuse public; extra family-ok checkbox `[ASSUMPTION]`
- **Empty:** form after dual-confirm
- **Loading:** submit
- **Error:** one spouse refuses public — showcase empty of faces (counter may still increment)
- **Success:** public only if both (and family-ok if set) consent

### Payment pack

- **From:** Settings / Invite quota wall / Message quota wall
- **Implements:** FR-044, FR-045, FR-104, FR-105, FR-106, FR-107, FR-145, FR-146, AD-14, AD-21
- **Elements:** `{components.pack-card}` 1 / 3 / 6; explicit `ends_at`; **no renew toggle**; Orange / Moov / Wave checkout; audio on no-auto-renew. Brothers always. Sisters see the same checkout in both `sister_reach_mode` values because Free-tier messages are capped. In `free_unlimited` she is not required to buy for Invite reach. Paid-faster-review is queue only — must not skip Verification, Blur, Mahram, Report, Block, or Chat after accept. No brother-free pack.
- **Empty:** pack list (Brother / Sister `same_quota_as_brothers`); message pack not required for reach (Sister `free_unlimited`)
- **Loading:** hosted/rail redirect
- **Error:** `PAY_UNAVAILABLE` — Free + safety stay
- **Success:** entitlement until `ends_at`; unlimited Invites and unlimited messages; no renew job

### Notifications

- **From:** bell / OS
- **Implements:** FR-052, FR-053, AD-16
- **Elements:** template + ids; `{components.blur-photo}` thumbs; no Chat body; no phone; in-app unread still increments if push denied. Triggers the sources name: messages, Invites, Reveal requests, moderation outcomes, Mahram pause/end/flag (plus SMS on essential path)
- **Empty:** « Aucune alerte. »
- **Loading:** —
- **Error:** push denied — in-app unread still increments
- **Success:** template + blur thumb only

### Settings

- **From:** Profil
- **Implements:** FR-019, FR-020, FR-120, FR-136, FR-138, AD-19
- **Elements:** Lite; audio language Mooré / Dioula; PIN; delete/export; CIL/hosting disclosure always visible; path to public pricing / Payment pack
- **Empty:** current values
- **Loading:** —
- **Error:** delete/export ticket error → status URL still issued if scheduled
- **Success:** Lite/audio/PIN persist; hosting line always visible

### Delete / export status

- **From:** Settings
- **Implements:** FR-019, FR-143, NFR-008, AD-19
- **Elements:** status URL; ticket (not Gmail-only); export download when ready; NFR-008 clocks as `[ASSUMPTION]` working numbers
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

### Appeal

- **From:** Sanction notice
- **Implements:** FR-090, AD-18
- **Elements:** Member Review form; second human (not original decider)
- **Empty:** form
- **Loading:** submit
- **Error:** window closed
- **Success:** second-human queue

### Family guidance

- **From:** onboarding / help
- **Implements:** FR-080
- **Elements:** Mahram optional, Sister-initiated
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

### Suspended-account screen *(PRD-named, IA omitted)*

- **From:** authenticate while suspended (FR-085, brief P43)
- **Implements:** FR-085
- **Elements the PRD states:** suspended screen; Chat / Invite / browse disabled; published-status outcome in respectful Ouaga French (not meme macros); path to Appeal (FR-090)
- **Warning (not a named IA screen):** Member who is warned “sees the warning and can continue under the published limits” — overlay vs dedicated screen is unspecified. See Gaps.
- **Ban:** authenticate with same phone/ID → access denied (FR-085). Dedicated Ban chrome is unspecified. See Gaps.

---

## 4. Mahram

### Mahram invite (Sister)

- **From:** Chat / onboarding
- **Implements:** FR-071, AD-12
- **Elements:** invite by phone; not forced; `{components.audio-prompt}` explainer; Brother cannot attach a Mahram to her Chat
- **Empty:** phone blank
- **Loading:** OTP sending (attach flow)
- **Error:** friend class rejected
- **Success:** invite sent; no Chat message sent as her

### Mahram OTP + relationship

- **From:** SMS deep link
- **Implements:** FR-072, A2, AD-12
- **Elements:** `{components.otp-input}`; relationship `father` / `brother` / `uncle` / `other_mahram`; unmatched friend rejected
- **Empty:** phone/relationship unset
- **Loading:** OTP sending
- **Error:** wrong relationship / expired 7d `[ASSUMPTION]`
- **Success:** Sister is asked to confirm. Cooling-off 1h `[ASSUMPTION]` before Mahram actions.

### Sister confirm Mahram

- **From:** notification
- **Implements:** FR-073, AD-12
- **Elements:** confirm or let 7-day expire `[ASSUMPTION]`. After confirm he is **not** attached to every conversation.
- **Empty / Loading / Error / Success:** part of Mahram attach states — Confirmed + **empty grant list**

### Mahram grant list

- **From:** after Sister confirm
- **Implements:** FR-074
- **Elements:** `{components.mahram-grant-row}`; empty after confirm; she picks Brother threads; new Chats not auto-granted; revoke one thread
- **Empty:** « Aucune discussion accordée. » + pick threads
- **Loading:** list of her Brother threads
- **Error:** grant fail, retry
- **Success:** one or more grants; new Chats stay ungranted until she picks them

### Mahram revoke one thread

- **From:** grant list / Chat
- **Implements:** FR-074
- **Elements:** drops that grant only; other grants stay
- **Empty:** —
- **Loading:** revoke in flight
- **Error:** network fail — keep trying; denylist is source of truth
- **Success:** that thread gone from his list; other grants stay

### Mahram thread list

- **From:** Mahram home
- **Implements:** FR-074, FR-076
- **Elements:** **only granted** threads; no compose; read delivered messages only
- **Empty:** « Aucune discussion accordée. »
- **Loading:** list skeleton
- **Error:** fetch fail, retry
- **Success:** only granted threads

### Mahram read-only thread

- **From:** granted thread only
- **Implements:** FR-074, FR-076, AD-12
- **Elements:** delivered messages; **no compose / no send-as-Sister**; `{components.mahram-banner}` context; pause / end / flag
- **Empty:** granted thread, no messages yet
- **Loading:** same as Chat load
- **Error:** not granted / revoke already applied — « Accès retiré »
- **Success:** delivered messages visible; compose absent

### Mahram pause / end / flag

- **From:** granted read-only thread
- **Implements:** FR-075, FR-087, AD-12
- **Elements:** pause (both compose off; Brother cannot resume); end (terminal); flag (priority case). Rejected on a thread that is not granted.
- **Empty:** —
- **Loading:** action in flight
- **Error:** Brother resume rejected; pause/end/flag on ungranted thread rejected
- **Success:** pause: compose off. End: terminal. Flag: priority queue.

### Verified-Mahram ID (optional)

- **From:** Mahram settings
- **Implements:** FR-078, AD-13
- **Elements:** optional ID + liveness; **no kinship document**; still grant-scoped; badge only if ID done
- **Empty / Loading / Error / Success:** same pattern as member ID + liveness; badge only if done. Not read-all.

### Remove / Report Mahram

- **From:** Sister Chat / settings / grant list
- **Implements:** FR-077, FR-074
- **Elements:** `{components.button-quiet}` remove; Report; revoke entire permission — every thread grant gone ≤60s; optional 24h emergency hide `[ASSUMPTION]`; SMS both sides. No confirmshaming.
- **Empty:** —
- **Loading:** action in flight
- **Error:** network fail — keep trying
- **Success:** every grant gone ≤60s; read access gone

---

## 5. Staff (admin)

### Admin flag queue

- **From:** Staff home
- **Implements:** FR-067, FR-144, AD-10
- **Elements:** `{components.admin-flag-row}` kinds `flag-for-admin` | `scan-deferred` | `scan-failed`; `{components.staff-only-badge}` on every row; already-delivered items — not a hold queue; opening a row never changes `message.state`
- **Empty:** « File vide » (delivery still happened in the world)
- **Loading:** queue fetch
- **Error:** staff auth fail
- **Success:** row for flag or scan-deferred; badge staff-only
- **Note:** EXPERIENCE.md reaches this from “Staff home” but does not name a separate Staff home layout. Treat this as staff landing unless founder names another.

### Case file

- **From:** flag row / Report
- **Implements:** FR-087, FR-088, FR-093, AD-18
- **Elements:** text / Photo / Voice + scores + report + fingerprint hints; thumbs stay `{components.blur-photo}`; unblur requires typed case reason + audit; unblur control not in member tab order
- **Empty:** missing evidence named
- **Loading:** case fetch
- **Error:** staff auth fail; unblur locked until typed reason
- **Success:** reason-entered unblur writes audit; decision saved

### Sanction

- **From:** Case
- **Implements:** FR-085, FR-144, AD-10
- **Elements:** `{components.sanction-action}` human chooses warning / suspend / other published action; photo Strike 3→24h is a published floor; AI is not a control; paid-faster-review must not skip scan or auto-clear a flag
- **Empty:** action unselected
- **Loading:** write + audit
- **Error:** cannot apply as AI
- **Success:** warning / suspend / other saved; Member notified

### Appeal review

- **From:** Appeal queue
- **Implements:** FR-090, AD-18
- **Elements:** second human; not the original decider
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

### Operator policy / thresholds

- **From:** Operator
- **Implements:** FR-140, AD-10
- **Elements:** policy text (must say: delivered then scanned; AI flags a human; AI does not silently delete, block, or hold); flag confidence; photo-Strike; subsequent scans only
- **Empty:** current pack prices and thresholds (shared operator empty with pricing)
- **Loading:** save
- **Error:** validation
- **Success:** audited change; thresholds apply to **subsequent** scans; auto-renew stays off

### Operator pricing

- **From:** Operator
- **Implements:** FR-139, FR-106, FR-145, AD-14
- **Elements:** pack prices/durations 1/3/6; auto-renew stays **off**; hosts sister-reach mode + message cap
- **Empty / Loading / Error / Success:** see Operator policy / pricing states

### Operator sister-reach mode

- **From:** Operator pricing / policy
- **Implements:** FR-145, FR-044, FR-045, FR-105, AD-27, AD-14, AD-21
- **Elements:** `{components.operator-reach-mode}` values `free_unlimited` (DEFAULT) | `same_quota_as_brothers` only; `{components.staff-only-badge}`; `{components.operator-message-cap}` sits next to this. No brother-free value.
- **Empty:** current `sister_reach_mode` (`free_unlimited` DEFAULT selected if unset)
- **Loading:** save in flight
- **Error:** validation / unauthorized. No brother-free value to pick.
- **Success:** audited change. Subsequent Sister Invites use the new mode. Past Invites stay.

### Operator daily message cap

- **From:** Operator pricing / policy, next to `sister_reach_mode`
- **Implements:** FR-146
- **Elements:** `{components.operator-message-cap}` shows **current admin** `daily_message_cap`; no locked number in UI copy; `{components.staff-only-badge}`; Premium unlimited
- **Empty:** current admin value shown
- **Loading:** save in flight
- **Error:** validation / unauthorized
- **Success:** audited. Subsequent Free-tier sends use the new cap. Already-delivered messages stay.

### Operator metrics

- **From:** Operator
- **Implements:** FR-092, FR-142, AD-20
- **Elements:** internal only — Verified Members by level, dual-confirmed marriages, report SLA, scan-deferred, appeal overturns; public counters stay proof-backed; scan-deferred never hidden; SLA-breach flags for free review (FR-013) and reports (FR-083)
- **Empty:** zero-launch counters valid
- **Loading:** refresh
- **Error:** —
- **Success:** scan-deferred counted, never hidden

### Operator CIL / deletion tickets

- **From:** Operator
- **Implements:** FR-143, AD-19
- **Elements:** tickets Member can see on status page
- **Empty:** empty queue
- **Loading:** ticket fetch
- **Error:** clock breach flagged
- **Success:** Member status page shows completed

### Operator Board / Académie publish

- **From:** Operator
- **Implements:** FR-141, FR-115
- **Elements:** names + five articles; scholar review record
- **Empty:** fewer than five articles
- **Loading:** save
- **Error:** missing scholar review
- **Success:** five live articles; names published

### T&S visit signals

- **From:** Moderator
- **Implements:** FR-027
- **Elements:** mass-view-then-never-Invite. **No member visitors list.**
- **Empty / Loading / Error:** inherit `empty-state` + `error-banner`

---

## 6. Gaps — stop; do not invent

These are required by the brief or a PRD FR, but EXPERIENCE.md does not name a screen (or enough chrome) to inventory. **Do not invent layout.** Founder / Awa must say whether they are existing screens with extra elements, or named new screens.

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

**Not gaps (explicitly absent):** first-wife notification; GIF picker; brother-free mode; Apple sign-in; who-favourited-me; visitors; online-now; held-for-scan Chat; invented scale.

---

## 7. Coverage check

EXPERIENCE.md traceability MVP screens are all listed in §1–§5.

PRD MVP FRs mapped to those screens or to Gaps (not dropped): FR-001–FR-003, FR-005–FR-028, FR-037–FR-048, FR-050–FR-053, FR-056–FR-060, FR-062–FR-080, FR-083–FR-093, FR-095–FR-101, FR-104–FR-110, FR-115–FR-120, FR-132–FR-134, FR-136–FR-146.

NEXT/LATER FRs are in “Out of MVP” and are not shipping screens.

---

## 8. What this folder does not contain

No Stitch HTML. No Stitch PNG. That is required for later design gates, not this ticket.

After founder approval, Stitch downloads belong here as exact filenames bound to the screen names above — still no invented screens.
