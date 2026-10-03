---
name: TBD
status: final
updated: 2026-10-02
sources:
  - ../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md
  - ../../prds/prd-muslim-marriage-africa-2026-09-27/addendum.md
  - ../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md
  - ../../architecture/architecture-muslim-marriage-africa-2026-09-27/SOLUTION-DESIGN.md
  - ../../briefs/brief-muslim-marriage-africa-2026-09-27/brief.md
---

# TBD — Experience spine

Working title muslim-marriage-africa. Product name is TBD. A1–A3 and PRD §16 questions 1 and 3–12 stay open.

Visual tokens live in `DESIGN.md`. Component pairing uses those names. Spines win on conflict with `mockups/`.

## Foundation

Mobile-first **web + installable PWA + Capacitor Android** (AD-4, FR-132–FR-134). One Next.js / Tailwind 4 shell. Native iOS is NEXT (FR-135) — out of MVP, not designed as shipping.

Three role shells, never mixed on one session (AD-8):

| Shell | Who | Form factor |
|---|---|---|
| Member | Sister / Brother | Phone-first, bottom nav |
| Mahram | Read-only guardian | Phone-first, no browse, no Invite |
| Staff | Moderator / Operator | Two-pane from 768px; stacked below |

`DESIGN.md` is the visual identity. This spine is behavior. UI system: Tailwind 4 layout tokens; no second component library is named.

`sister_reach_mode` is an Operator setting on day one: `free_unlimited` (DEFAULT) or `same_quota_as_brothers`. Brothers never see a free-unlimited mode. There is no brother-free control. Safety screens (verification, blur/reveal, mahram, report, block) stay free in both modes. Do not add a paywall to those. Chat after accept is not a safety paywall; Free-tier message volume is still capped (FR-146) unless Premium. Passive chat delivery stays: no held-until-scanned state.

On top of that, **Free-tier messages** are daily-capped for both genders (FR-146), including a Sister in `free_unlimited`. Premium: unlimited messages and unlimited Invites. The Operator `daily_message_cap` control sits next to `sister_reach_mode`. Show the current admin value — no locked number in UI copy. Over-cap send is refused, not held for scan. Card/grid is AD-28. Message cap is AD-29. Mahram per-thread grants are amended AD-12. Card payload budget stays AD-16.

## Information Architecture

Member bottom nav: **Découvrir · Invitations · Discussions · Profil**. `[ASSUMPTION]` labels. Modal stack is one level.

Mahram has no Découvrir and no Invitations. Staff has no member nav.

Spines win on conflict with every mock. Per-file captions sit on the matching IA row.

### Public

| Surface | Reached from | Purpose | Implements |
|---|---|---|---|
| Public landing | Cold URL / store | Honorable ta'aruf pitch; Verified-marriages counter at 0; no invented DAU | FR-101, FR-117, AD-25. See [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Legal hub | Footer | Mentions, CGV, cookies, privacy + hosting/CIL line Operators cannot hide | FR-109, FR-119, FR-120, AD-5, AD-19. See [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-5](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Public pricing | Landing / settings | Brothers always see the same XOF 1/3/6 packs as checkout (Orange/Moov/Wave, no auto-renew, audio on that line). Sisters in `free_unlimited` (DEFAULT) see unlimited Invite reach and are not required to buy for reach; they still see the pack for unlimited messages (FR-146). Sisters in `same_quota_as_brothers` see the same Free Invite cap and the same checkout as Brothers. Premium: unlimited Invites and unlimited messages. Safety stays free. No brother-free mode. | FR-044, FR-045, FR-105, FR-106, FR-108, FR-145, FR-146, AD-14. See [prd.md §4.10](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Académie list + article | Landing / help | Five scholar-reviewed articles; *mariage / ta'aruf / nikah / khitba* only | FR-115, AD-24. See [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-24](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Advisory Board | Landing / help | Named scholars; fiqh-edge is human, not a bot | FR-116, AD-22. See [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-22](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| FAQ + contact | Footer | Ticketed form + FAQ | FR-118. See [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |
| Showcase | Landing | Consent stories only; empty is valid; faces optional | FR-099, FR-100, AD-25. See [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Cookie consent | First public hit | Cookies ≠ likeness grant | FR-119, AD-9. See [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-9](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |

### Identity and onboarding

| Surface | Reached from | Purpose | Implements |
|---|---|---|---|
| Splash | App open | Brand field + continue. Name stays TBD | FR-132, FR-133, FR-134, AD-4. See [prd.md §4.12](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-4](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Auth (signup / login) | Splash | Email, password, unique pseudonym, gender; Google additional; captcha; pledge. Mock: `mockups/auth.html` (pledge + 19+ note) | FR-001, FR-003, FR-005, FR-007, AD-8. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-8](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Age gate | Auth | DOB; under 19 blocked. A1 stays open | FR-011, FR-091, AD-8. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-8](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Email verification | Auth | Expiring link + resend | FR-006. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |
| Password reset | Auth | Single-use link | FR-008. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |
| OTP | After account | Phone OTP before public visibility | FR-002, AD-13. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-13](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| ID + liveness | After OTP | Free; not Premium; match to Profile Photos | FR-014, FR-015, FR-105, AD-13. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-13](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Onboarding | After verification | Split **minimum-to-browse** vs **complete-to-send-Invite**; audio on hard steps | FR-009, FR-010, FR-137, FR-138, AD-24. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-24](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Photo rules | Onboarding / upload | Pictogram + Mooré/Dioula audio; no paragraph required | FR-070, FR-010, AD-24. See [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-24](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| PIN lock | Background >60s `[ASSUMPTION]` | Shared-phone lock | FR-020, NFR-001, AD-8. See [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-8](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |

### Member core

| Surface | Reached from | Purpose | Implements |
|---|---|---|---|
| Profile edit | Profil tab | Fields, Islamic criteria, completeness meter, life-pauses | FR-017, FR-018, FR-021, FR-022, FR-023, AD-26. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-26](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Profile not-yet-public | Profile edit / upload | New Photo/bio unpublished until review. Not a Chat state | FR-012, FR-065, AD-10. See [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Discover | Découvrir | Default: one focused card. Under the photo: shared traits only (open to polygamy, same town, kids / accepts a partner with kids, other shared Profile fields already in the PRD). Tap opens full Profile. Pass (swipe away = dismiss, not a like). Swipe or button to Invite. Quick message. Those obey Invite quota (FR-044 / FR-045) and FR-146. `{components.card-grid-toggle}` on this screen. Lite: small image, text first. Mock: `mockups/discovery-lite.html` is grid-only — **spine wins; default is the single card**. | FR-024, FR-025, FR-136, FR-146, AD-16. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-16](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) (card payload budget). Message cap is AD-29. |
| Search | Discover / filters | Same card/grid toggle. A many-filter search may open on the grid; the single-card toggle remains. Basic filters only. FR-030 advanced filters stay NEXT — do not design them as shipping. Lite: small image, text first. | FR-024, FR-025, FR-136, FR-146, AD-16. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-16](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) (card payload budget). |
| Filters | Discover / Search | City, marital, practice, life plans, distance 10/25/50/city `[ASSUMPTION]`. FR-030 stays NEXT. | FR-024. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |
| Profile detail | Focused card / grid / favourite / invite | Opposite-gender blur default; verification levels; Report/Block. Mock: `mockups/profile-blur.html` (server blur + marital fields before accept) | FR-015, FR-016, FR-056, AD-9. See [prd.md §4.5](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-9](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Blur / Reveal / Revoke | Profile detail / Chat | Per-viewer `on_accept` / `on_request` / `never`; Revoke ≤60s | FR-056, FR-057, FR-058, FR-059, AD-9. See [prd.md §4.5](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-9](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Favourites | Discovery / Profil | Private list only. No “who favourited me” | FR-026. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |
| Invite compose + Message Flash | Profile detail / focused-card Invite or quick message | Brothers always Invite-quota-capped on Free (FR-044). Sisters follow `sister_reach_mode` for Invite reach only. Flash and card quick message count against FR-146. Premium: unlimited Invites and unlimited messages. Ice Breaker templates. No brother-free mode. | FR-038, FR-044, FR-045, FR-046, FR-047, FR-105, FR-145, FR-146, AD-23. See [prd.md §4.3](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-23](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md). Message cap is AD-29. |
| Sister invite quota wall | Invite compose when `same_quota_as_brothers` and the Free Invite cap is hit | Same Free **3** `[ASSUMPTION]` Ouaga-day Invite cap as Brothers. Premium = unlimited Invites (no Premium Invite cap of 15). CTA opens the Brother payment-pack checkout. Not shown in `free_unlimited` for Invite reach. Safety stays free. | FR-044, FR-045, FR-105, FR-145, AD-14, AD-23. See [prd.md §4.3](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Message quota wall | Chat / Flash / card quick message when a Free Member hits `daily_message_cap` | Both genders. Includes a Free Sister in `free_unlimited`. Shows the current admin cap and Ouaga-day reset. Pack CTA (unlimited messages + unlimited Invites). Over-cap send is refused, not held for scan. Premium never sees this wall. | FR-146, FR-105, FR-044. See [prd.md §4.4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [prd.md §4.10](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). Message cap is AD-29. |
| Invite inbox | Invitations tab | Sent / received / accepted. Marital status + polygamy intent **before** accept. Quiet decline | FR-037, FR-039, FR-040, FR-042, AD-26. See [prd.md §4.3](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-26](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Discussions list | Discussions tab | Open Chats after Sister consent. Not a hold inbox | FR-041, FR-050, AD-15. See [prd.md §4.4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-15](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Chat thread | Accept / Discussions list | Text, Photo, Voice. Immediate delivery when the send is allowed. Stage chip. No pending-moderation state. Free-tier sends obey FR-146; over-cap is refused, not held for scan. Mock: `mockups/chat-thread.html` (already-visible bubbles; time-only meta) | FR-041, FR-050, FR-051, FR-062, FR-063, FR-064, FR-146, AD-10, AD-15. See [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md). Message cap is AD-29. |
| Contact-share interstitial | Send blocked | Blocks phone, WhatsApp, links until both opt in. Not an AI hold | FR-068, AD-17. See [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-17](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Report / Block | Profile / Chat | Report starts SLA; Block hides; reasons include marital misrepresentation | FR-083, FR-084, FR-037. See [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |
| Marriage dual-confirm | Chat / settings | Joint “nous nous sommes mariés”; one-sided does nothing. Mock: `mockups/marriage-confirm.html` (counter stays 0 until both confirm) | FR-095, FR-096, FR-097, FR-098, AD-25. See [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Consent story | After dual-confirm | Optional; either spouse can refuse public; no Chat excerpts | FR-099, FR-100, AD-25. See [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Payment pack | Settings / Invite quota wall / Message quota wall | Brothers always. Sisters see the same 1/3/6 Orange / Moov / Wave checkout in both `sister_reach_mode` values because Free-tier messages are capped (FR-146). In `free_unlimited` she is not required to buy for Invite reach; she still sees the pack on the message quota wall. Premium = unlimited Invites and unlimited messages. Mock: `mockups/payment-pack.html` (selected pack + audio on no-auto-renew). No brother-free pack. | FR-044, FR-045, FR-104, FR-105, FR-106, FR-107, FR-145, FR-146, AD-14, AD-21. See [prd.md §4.10](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md). Message cap is AD-29. |
| Notifications | Bell / OS | Template + ids; blur thumbs; no Chat body, no phone | FR-052, FR-053, AD-16. See [prd.md §4.4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-16](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Settings | Profil | Lite, audio language, PIN, delete/export, CIL/hosting disclosure | FR-019, FR-020, FR-120, FR-136, FR-138, AD-19. See [prd.md §4.12](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-19](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Delete / export status | Settings | Status URL + ticket; not Gmail-only | FR-019, FR-143, NFR-008, AD-19. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-19](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Appeal | Sanction notice | Member Review; second human | FR-090, AD-18. See [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-18](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Family guidance | Onboarding / help | Mahram optional, Sister-initiated | FR-080. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |

### Mahram

| Surface | Reached from | Purpose | Implements |
|---|---|---|---|
| Mahram invite (Sister) | Chat / onboarding | Invite by phone; not forced | FR-071, AD-12. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Mahram OTP + relationship | SMS deep link | OTP + `father` / `brother` / `uncle` / `other_mahram`; unmatched friend rejected | FR-072, A2, AD-12. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Sister confirm Mahram | Notification | Confirm or let 7-day expire `[ASSUMPTION]`. After confirm he is **not** attached to every conversation. | FR-073, AD-12. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Mahram grant list | After Sister confirm | Empty grant list. Sister picks which Brother threads to grant. New Chats are not auto-granted. Revoke one thread. | FR-074. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). Mahram per-thread grants are amended AD-12. |
| Mahram revoke one thread | Grant list / Chat | Drops that grant only. Other grants stay. | FR-074. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). Mahram per-thread grants are amended AD-12. |
| Mahram thread list | Mahram home | Shows **only granted** threads. No compose. Read delivered messages only. | FR-074, FR-076. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). Mahram per-thread grants are amended AD-12. |
| Mahram read-only thread | Granted thread only | Read delivered messages; no compose. Mock: `mockups/mahram-readonly.html` (banner + pause/end; no send) | FR-074, FR-076, AD-12. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md). Mahram per-thread grants are amended AD-12. |
| Mahram pause / end / flag | Granted read-only thread | Pause both compose; end is terminal; flag is priority case. Rejected on a thread that is not granted. | FR-075, FR-087, AD-12. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Verified-Mahram ID (optional) | Mahram settings | Optional ID + liveness; no kinship document. Still grant-scoped. | FR-078, AD-13. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-13](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Remove / Report Mahram | Sister Chat / settings / grant list | Revoke entire permission: every thread grant gone. Read access gone ≤60s; optional 24h emergency hide `[ASSUMPTION]` | FR-077, FR-074. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). Mahram per-thread grants are amended AD-12. |

### Staff

| Surface | Reached from | Purpose | Implements |
|---|---|---|---|
| Admin flag queue | Staff home | Already-delivered items + scan-deferred / scan-failed. Staff-only. Not a hold queue. Mock: `mockups/admin-flag-queue.html` (staff-only badge on every row) | FR-067, FR-144, AD-10. See [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Case file | Flag row / Report | Text / Photo / Voice + scores + report + fingerprint hints. Thumbs stay blurred | FR-087, FR-088, FR-093, AD-18. See [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-18](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Sanction | Case | Warning vs suspend vs other published action. AI never applies | FR-085, FR-144, AD-10. See [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Appeal review | Appeal queue | Second human | FR-090, AD-18. See [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-18](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator policy / thresholds | Operator | Policy text + flag confidence + photo-Strike; subsequent scans only | FR-140, AD-10. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator pricing | Operator | Pack prices/durations; auto-renew stays off; hosts the sister-reach mode control | FR-139, FR-106, FR-145, AD-14. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator sister-reach mode | Operator pricing / policy | `operator-reach-mode` control. Values `free_unlimited` (DEFAULT) \| `same_quota_as_brothers`. Both on day one. Audited. Subsequent Sister Invites only; past Invites stay. No brother-free option. `{components.operator-message-cap}` sits next to this control. Architecture bind is AD-27, AD-14, AD-21. | FR-145, FR-044, FR-045, FR-105, AD-27, AD-14, AD-21. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-27](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator daily message cap | Operator pricing / policy, next to `sister_reach_mode` | `operator-message-cap` control. Shows the **current admin** `daily_message_cap`. No locked number in the UI copy. Audited. Subsequent Free-tier sends only; already-delivered messages stay. Premium is unlimited. | FR-146. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). Message cap is AD-29. |
| Operator metrics | Operator | Internal only; public counters stay proof-backed; scan-deferred never hidden | FR-092, FR-142, AD-20. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-20](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator CIL / deletion tickets | Operator | Status the Member can see | FR-143, AD-19. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-19](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator Board / Académie publish | Operator | Names + five articles | FR-141, FR-115. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |
| T&S visit signals | Moderator | Mass-view-then-never-Invite. No member visitors list | FR-027. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) |

### NEXT — out of MVP, not designed as shipping

| Surface | Horizon | Why named |
|---|---|---|
| Mahram dashboard (multi-ward + digest) | NEXT FR-081 | Do not mock a ward list as if live |
| Meeting planner (time/place/attendees) | NEXT FR-082 | MVP has stage **meeting** only (FR-028) |
| Native iOS + Apple sign-in | NEXT FR-135, FR-004 | Same Capacitor project later |
| Advanced paid filters | NEXT FR-030 | Do not design as shipping. Search stays on FR-024 basic filters. |
| Who favourited me / visitors / online-now / anonymous / boosts / GIF picker / USSD | NEXT | Feature flags stay off (AD-22). “Online now” and invented scale stay rejected. |

## Voice and Tone

Microcopy. Brand posture lives in `DESIGN.md`.

| Do | Don't |
|---|---|
| « Votre message est arrivé. » | « En cours de vérification… » / « En attente du scan » |
| « Refuser discrètement » | « Elle a vu » / guilt timer |
| « Un wali lit cette discussion. » | « Super visio en privé 🔥 » |
| « Photo en revue — pas encore publique. » | Treating unpublished Profile Photo as a Chat hold |
| « Les numéros et WhatsApp attendent l’accord des deux. » | Calling Contact-share an AI hold |
| « Pas de renouvellement automatique. » | « Essai gratuit puis on prélève » |
| `free_unlimited` Sister: « Invitations illimitées. » (no pack CTA for reach) | Offering a reach pack to a Sister in `free_unlimited` |
| `same_quota_as_brothers` Sister: same Free **3** Invite copy as Brothers; Premium = unlimited Invites | A brother-free « invitations illimitées » mode; a Premium Invite cap of 15 |
| Message remaining: show the current admin `daily_message_cap` | Locking a number in the UI copy |
| Over-cap: « Envoi refusé. Quota du jour atteint. » + pack | Holding the send for scan |
| After Mahram confirm: empty grant list; she picks threads | Auto-attaching him to every Chat |
| « Passer » = dismiss this card | A like, a public likes counter, or a heart stack |
| « Mariages confirmés : 0 » | Invented member counts; « en ligne »; « +247.8k actifs » |
| *mariage / ta'aruf / nikah / khitba* | *dating / rencontre romantique* |
| Completeness: « Il manque : madhhab » | « Votre profil est faible » |
| Sanction: published status in respectful Ouaga French | Meme macros |

Audio (Mooré / Dioula) covers onboarding, photo rules, no-auto-renew, and Mahram invite explainers (FR-010, FR-070, FR-138). If audio fails on 2G, pictograms remain.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| button-primary | One commit per screen | Disabled until required fields valid. Never a send that waits on AI. |
| button-secondary | Cancel / later | Does not look more urgent than quiet decline. |
| button-quiet | Quiet decline, Revoke, remove Mahram | No confirm-shaming. Decline: no read receipt to the Brother (FR-042). |
| field | Auth, profile, operator | 48px. Errors name the field. Gender immutable after first set without operator+audit. |
| age-gate | Signup | Blocks <19. A1 legal review stays open — copy does not claim statute. Suspected-minor hold is FR-091, not a Chat state. |
| otp-input | Phone / Mahram | Resend cooldown published. Wrong code does not leak whether the number exists beyond the published rule. |
| liveness-capture | Verification | Free. Failure = retake, not paywall. Liveness must match Profile Photos. |
| completeness-meter | Profile edit / onboarding | Names missing Islamic criteria. Minimum-to-browse may leave Invite fields empty; send Invite is then blocked (FR-009). |
| focused-card | Discover / Search default | One Profile. Under the photo: shared traits only (open to polygamy, same town, kids / accepts a partner with kids, other shared Profile fields already in the PRD). Tap → full Profile. Pass = dismiss this card (not a like). Swipe or button to Invite (FR-044 / FR-045). Quick message counts against FR-146 (and Invite quota if it is also an Invite / Flash). Lite: small image, text first. No public likes counter. No heart stack. |
| card-grid-toggle | Discover / Search | Switches between the FR-024 single card and the optional grid. A many-filter search may open on the grid; this toggle remains. |
| shared-trait | Under focused-card photo | Only traits in common that already exist on both Profiles. Omit when none. Do not invent Profile fields. |
| discovery-card | Optional Lite grid | Tap → profile detail. Images deferred in Lite; criteria still render. Favourite is private. |
| blur-photo | Grid, detail, chat thumbs, staff thumbs, push | Always a server `blur` derivative for unauthorized viewers. Owner + granted viewer may request `md` via `MediaPort.sign`. Never CSS-blur `original`. |
| reveal-control | Profile detail / Chat | 44px button, role+pressed/disabled. Policies `on_accept` / `on_request` / `never` per viewer. Request cap 1 pending per pair `[ASSUMPTION]`. Revoke stops serving clear URL ≤60s (FR-059). Paid perk cannot grant Reveal. Caption + pictogram required. |
| chat-bubble | Chat thread | Persist `delivered` immediately. Recipient (and Mahram) see it without scan wait. Later flag does not unsend and is invisible to members. **Banned states:** pending-moderation, held, scan-wait. |
| voice-note | Chat | Play as soon as stored. No member-facing transcript. STT is background staff scan only (FR-064, AD-11). |
| mahram-banner | Chat / Flash | Shown to Brother from first Flash **only if this thread is granted** (FR-079). Gone after Sister revoke-one or remove. |
| mahram-grant-row | Grant list | Sister picks which Brother threads to grant. Empty after confirm. Revoke one thread. Remove drops every grant (FR-077). |
| contact-share-interstitial | Send / Flash reject | On `CONTACT_SHARE_REQUIRED` show to **both** Members. Money-ask language is delivered and flagged — do not reuse this interstitial for money-ask. |
| invite-row | Inbox | Before accept: marital status + polygamy intent required visible (FR-037). Accept opens Chat. Decline is quiet; no resend (FR-043). |
| flash-composer | Invite compose | Visible before accept. Phone/WhatsApp/links refused. Delivered immediately; later flag does not unsend (FR-046). |
| stage-chip | Chat header | `invite` / `chat` / `meeting` / `married`. Meeting is a confirm, not the NEXT planner. |
| admin-flag-row | Flag queue | Staff-only. Kinds: `flag-for-admin` \| `scan-deferred` \| `scan-failed`. Opening it never changes `message.state`. |
| staff-only-badge | Every staff surface | Visible. Members never see this chrome. |
| sanction-action | Case | Human chooses warning / suspend / other. Photo Strike 3→24h is a published floor. AI is not a control. Paid-faster-review must not skip scan or auto-clear a flag (AD-10, AD-21). |
| pack-card | Pricing / checkout / message quota wall | Explicit `ends_at`. No renew toggle. Shown to Brothers always. Shown to Sisters in both `sister_reach_mode` values on the message quota wall (FR-146). In `free_unlimited` it is for unlimited messages, not Invite reach. Never a brother-free pack. Rail down: Free + safety stay (NFR-004). |
| operator-reach-mode | Operator pricing / policy | Two values only: `free_unlimited` (DEFAULT) \| `same_quota_as_brothers`. `{components.staff-only-badge}` required. Save writes audit. Change applies to subsequent Sister Invites; past Invites stay. No third brother-free value. `{components.operator-message-cap}` sits next to this control. Visual tokens in `DESIGN.md.Components`. |
| operator-message-cap | Operator pricing / policy, next to sister_reach_mode | Shows the current admin `daily_message_cap`. No locked number in the copy. `{components.staff-only-badge}` required. Save writes audit. Subsequent Free-tier sends only. Premium is unlimited. Message cap is AD-29. |
| audio-prompt | Hard steps | Play Mooré or Dioula. Failure → pictogram path remains. |
| pin-lock | Shared device | After 60s background `[ASSUMPTION]`. 5 fails → re-auth. Idle 15 min on Sister/Mahram PIN sessions `[ASSUMPTION]`. |
| empty-state | Lists | One sentence + one action. Zero results never invent Profiles. |
| error-banner | Any | AD-7 `error.code` mapped to French. `PAY_UNAVAILABLE` does not disable Chat, Report, Blur, Mahram, Verification, or Block. Sister Invite send is allowed or rejected solely by FR-045 / `sister_reach_mode`, never by a safety paywall. Free-tier message send is allowed or rejected by FR-146; over-cap is refused, not held for scan. |
| lite-placeholder | Focused card / grid / chat media | Criteria or caption remain. Chat media waits for **connection**, not AI (AD-16). |

## State Patterns

Every primary surface. Chat success = immediate delivery. Chat must not have pending-moderation or held. Scan-deferred is staff-only. Profile Photo not-yet-public is FR-065, not a Chat state.

| Surface | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Splash / Auth | — | Skeleton on splash ≤2s | `UNAUTHENTICATED` / captcha fail named | Session cookie or Bearer; next is age gate or home |
| Email verification | Waiting for link | Resend in flight | Expired link: request new | Email marked verified |
| Password reset | Request form | Link sending | Expired / unknown email per published rule | New password; old sessions dead |
| Age gate | DOB blank, primary disabled | — | Under 19: account rejected/held, never listed | Adult continues to OTP |
| OTP | Boxes empty | « Code envoyé » | Wrong/expired: retry + cooldown | Phone level granted |
| ID + liveness | Camera idle + pictogram | Capture upload | Mismatch / fail: retake, not pay | ID level pending human review |
| Onboarding | Minimum path: browse-only CTA | Audio buffering (step still usable) | 2G audio fail: pictograms | Browse unlocked after visibility gates; Invite only if complete |
| Profile edit | Completeness lists missing fields | Save spinner on primary | Validation names field | Saved. New Photo/bio → **not-yet-public** |
| Profile not-yet-public | No pending asset | « En revue » | Rejected with published photo-rule reason | Approved asset replaces live; old stays until then |
| Discover | « Aucun profil pour ces filtres. » | Text + lite-placeholder first (≤8s NFR-005); small image deferred | Browse error, retry; no invented cards | One focused card; shared traits under the photo; card/grid toggle present. Implements FR-024, FR-025, FR-136, FR-146, AD-16. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). |
| Search | « Aucun profil pour ces filtres. » | Same as Discover | Same as Discover. FR-030 controls absent. | Same card/grid toggle. Many-filter search may open on the grid; single-card toggle remains. Implements FR-024, FR-025, FR-136, FR-146, AD-16. See [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). |
| Profile detail | Missing optional fields omitted | Blur thumb first | `REVEAL_DENIED` if clear requested without grant | Criteria + blur or granted clear |
| Blur / Reveal / Revoke | Never-policy: still blur | Reveal request pending (1 max) | Revoke network fail: keep trying; gateway denylist is source of truth | Grant/revoke reflected ≤60s |
| Favourites | « Aucun favori. » + Découvrir | List skeleton | Save fail, retry | Private row only |
| Invite compose (Brother) | Flash empty, Ice Breaker optional; remaining Free Invites **3** `[ASSUMPTION]`; Premium = unlimited Invites. Free message remaining shows the current admin `daily_message_cap`. | Send in flight | `QUOTA_EXCEEDED` with Ouaga-day reset; `MESSAGE_CAP_EXCEEDED` → Message quota wall (refused, not held); `CONTACT_SHARE_REQUIRED` | Invite on recipient list; Flash already visible if under FR-146. Never a free-unlimited Invite state. |
| Invite compose (Sister, `free_unlimited`) | Flash empty, Ice Breaker optional; copy « Invitations illimitées. »; no Invite remaining-count; no reach-pack CTA. Free message remaining shows the current admin `daily_message_cap`. | Send in flight | `CONTACT_SHARE_REQUIRED`. Never Invite `QUOTA_EXCEEDED`. Never a reach-pack offer. `MESSAGE_CAP_EXCEEDED` → Message quota wall (Flash / quick message refused, not held). | Invite sent, no pack for reach. Flash already visible if under FR-146. |
| Invite compose (Sister, `same_quota_as_brothers`) | Flash empty, Ice Breaker optional; same remaining Free Invites **3** `[ASSUMPTION]` as Brothers; Premium = unlimited Invites. Free message remaining shows the current admin cap. | Send in flight | `QUOTA_EXCEEDED` → Sister invite quota wall; `MESSAGE_CAP_EXCEEDED` → Message quota wall; `CONTACT_SHARE_REQUIRED` | Invite on recipient list; Invite remaining decrements. Same Invite caps as Brothers. |
| Sister invite quota wall (`same_quota_as_brothers`) | Remaining Invites 0; Ouaga-day reset time; pack-card CTA matching Brother checkout. Not rendered in `free_unlimited` for Invite reach. | Entitlement fetch | `PAY_UNAVAILABLE`: cannot buy; Invite send stays blocked until reset; Chat, Verification, Blur, Mahram, Report, Block stay usable | CTA opens Payment pack (same 1/3/6 Orange/Moov/Wave as Brothers). After purchase: unlimited Invites and unlimited messages. |
| Message quota wall (Free, both genders) | Remaining messages 0; current admin `daily_message_cap` shown (no locked number); Ouaga-day reset; pack-card CTA. Includes a Free Sister in `free_unlimited`. | Entitlement fetch | `PAY_UNAVAILABLE`: cannot buy; over-cap send stays refused, not held for scan; safety stays usable | CTA opens Payment pack. After purchase: unlimited messages and unlimited Invites. Implements FR-146, FR-105, FR-044. See [prd.md §4.4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). |
| Payment pack (Brother) | Pack list from `/v1/packs` | Hosted/rail redirect | `PAY_UNAVAILABLE`: Free + safety stay | Entitlement until `ends_at`; unlimited Invites and unlimited messages; no renew job |
| Payment pack (Sister, `same_quota_as_brothers`) | Same pack list, prices, durations, and rails as Brothers | Hosted/rail redirect | `PAY_UNAVAILABLE`: Free + safety stay; Free Invite cap and Free message cap still apply | Same entitlement until `ends_at` as Brothers; unlimited Invites and unlimited messages; no renew job |
| Payment pack (Sister, `free_unlimited`) | Pack list for unlimited messages (not required for Invite reach). Shown on the message quota wall. | Hosted/rail redirect | `PAY_UNAVAILABLE`: Invite reach stays unlimited; Free message cap still applies; safety stays | After purchase: unlimited messages (Invite reach was already unlimited). Checkout not required for reach. |
| Public pricing (Brother / Sister `same_quota_as_brothers`) | Same pack list as checkout | Page load | Copy/rail error does not hide Free or safety | Prices match checkout. Sister sees the same Free Invite cap. Premium = unlimited Invites and unlimited messages. |
| Public pricing (Sister `free_unlimited`) | Unlimited Invite copy; pack still listed for unlimited messages | Page load | — | No reach-pack required. Pack offered for messages (FR-146). |
| Invite inbox | « Aucune invitation. » | List skeleton | Accept fail if other married/Banned | Accept → Chat; decline → declined without lecture |
| Discussions list | « Aucune discussion. » | List skeleton | Fetch fail, retry | Row opens Chat; unread increment; no hold badge |
| Chat thread | New Chat: stage **chat**, no scan banner | Thread open ≤4s; typing ≤2s | Send fail = connection. Over-cap = Message quota wall (refused, not held). **Never** “held for scan” | Allowed bubble `delivered` immediately. Offline: text outbox; media waits for connection |
| Contact-share interstitial | Both not opted in | Opt-in in flight | One-sided yes: still blocked | Both yes: numbers/links may send; scan still runs after |
| Mahram grant list | Empty after confirm: « Aucune discussion accordée. » + pick threads. Implements FR-074. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). | List of her Brother threads | Grant fail, retry | One or more grants. New Chats stay ungranted until she picks them. Mahram per-thread grants are amended AD-12. |
| Mahram revoke one thread | — | Revoke in flight | Network fail: keep trying; denylist is source of truth | That thread gone from his list; other grants stay. Implements FR-074. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). |
| Mahram thread list | « Aucune discussion accordée. » Implements FR-074, FR-076. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). | List skeleton | Fetch fail, retry | Only granted threads. No compose. Read delivered messages only. Mahram per-thread grants are amended AD-12. |
| Mahram read-only | Granted thread, no messages yet | Same as Chat load | Not granted / revoke already applied: « Accès retiré » | Delivered messages visible; compose absent. Implements FR-074, FR-076. See [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). |
| Mahram attach (invite / OTP / confirm / optional ID) | Phone blank; friend class rejected | OTP sending | Wrong relationship / expired 7d `[ASSUMPTION]` | Confirmed + **empty grant list**; badge only if ID done. Not read-all. |
| Mahram pause / end / remove | — | Action in flight | Brother resume rejected. Pause/end/flag on an ungranted thread rejected. | Pause: compose off. End: terminal. Revoke one: that grant gone. Remove (FR-077): every grant gone ≤60s. |
| Report / Block | Reason required | Submit in flight | Rate limit | Report: SLA started. Block: hidden |
| Marriage dual-confirm | One spouse started | Waiting other | Expired 30d `[ASSUMPTION]` without confirm: no counter | Both confirm: joint **married**, counter +1 |
| Consent story | Form after dual-confirm | Submit | One spouse refuses public: showcase empty of faces | Public only if both (and family-ok if set) consent |
| Notifications | « Aucune alerte. » | — | Push denied: in-app unread still increments | Template + blur thumb only |
| Settings | Current values | — | Delete/export ticket error → status URL still issued if scheduled | Lite/audio/PIN persist; hosting line always visible |
| Admin flag queue | « File vide » (delivery still happened in the world) | Queue fetch | Staff auth fail | Row for flag or scan-deferred; badge staff-only |
| Case file | Missing evidence named | Case fetch | Staff auth fail; unblur locked until typed reason | Reason-entered unblur writes audit; decision saved |
| Sanction | Action unselected | Write + audit | Cannot apply as AI | Warning / suspend / other saved; Member notified |
| Appeal | Form | Submit | Window closed | Second-human queue |
| Operator policy / pricing | Current pack prices and thresholds | Save | Validation | Audited change; thresholds apply to **subsequent** scans; auto-renew stays off |
| Operator sister-reach mode | Current `sister_reach_mode` (`free_unlimited` DEFAULT selected if unset). Two options only. `{components.staff-only-badge}`. Message-cap control sits next to this. | Save in flight | Validation / unauthorized. No brother-free value to pick. | Audited change. Subsequent Sister Invites use the new mode. Past Invites stay. Member Invite/pricing UI switches on next open. |
| Operator daily message cap | Current admin `daily_message_cap` shown (no locked number). `{components.staff-only-badge}`. Next to `sister_reach_mode`. Implements FR-146. See [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). | Save in flight | Validation / unauthorized | Audited change. Subsequent Free-tier sends use the new cap. Already-delivered messages stay. Premium stays unlimited. Message cap is AD-29. |
| Operator CIL / deletion tickets | Empty queue | Ticket fetch | Clock breach flagged | Member status page shows completed |
| Operator metrics | Zero-launch counters valid | Refresh | — | Scan-deferred counted, never hidden |
| Operator Board / Académie publish | Fewer than five articles | Save | Missing scholar review | Five live articles; names published |

Public, legal, Académie, Board, FAQ, showcase, cookie, photo rules, PIN, filters, family guidance, delete-status, appeal review, and T&S visit signals inherit `empty-state` + `error-banner`. PIN 5-fail and life-pause deactivate live on Profile edit / PIN lock (component rules).

**Banned Chat states:** `pending`, `held`, `pending-moderation`, `scan-wait`, `fail-closed`. Those clocks are deleted (AD-10).

**Staff-only:** scan-deferred / scan-failed visibility. Members are not told a later flag exists.

## Interaction Primitives

- **Tap to send.** Ack when stored. Do not await `ModerationPort`. Over-cap send is refused (FR-146), not held for scan.
- **Pass.** Dismiss this focused card. Not a like. No public likes counter. No heart stack.
- **Invite / quick message from the card.** Swipe or button. Obey Invite quota (FR-044 / FR-045) and FR-146.
- **Reveal / Revoke.** Per viewer. Revoke is a denylist + TTL ≤60s, not a client hide.
- **Mahram grant.** After confirm, empty list. Sister picks which Brother threads to grant. New Chats are not auto-granted.
- **Mahram revoke one.** Drops that thread only.
- **Mahram remove.** Sister control. Revokes entire permission — every thread grant gone ≤60s; SMS both sides; may `emergencyHide` 24h.
- **Quiet decline.** button-quiet. No resend (FR-043).
- **Contact-share.** Deterministic matcher in chat/invites. Not `ModerationPort`.
- **Paid perk.** Faster human-review queue only. Must not skip background scan, must not auto-clear a flag, must not skip Verification, Blur, Mahram, Report, Block, or Chat after accept (FR-105, AD-21). Sister Invite is reach (FR-045), not a safety skip. Premium = unlimited Invites and unlimited messages.
- **Sister reach mode.** Operator `operator-reach-mode` only. Member UI reads the current value. Brothers never gain a free-unlimited control. Message caps sit on top of this setting.
- **Daily message cap.** Operator `operator-message-cap` next to `sister_reach_mode`. Show the current admin value. No locked number.
- **PIN.** Background 60s → lock. Long-press reserved for system text selection.
- **Banned:** story rings, live 1:1 A/V, GIF picker (flag off), member visitors, fake presence (« en ligne » / online-now), invented scale, public likes counter, heart stack of likes, operator-as-member session. A one-at-a-time pass / invite swipe is **not** banned.

## Accessibility Floor

Behavioral. Contrast lives in `DESIGN.md`.

- WCAG 2.1 AA on French UI (AD-24, NFR-006).
- Touch targets ≥44px (48px on primary actions).
- VoiceOver / TalkBack: role + state on every control. Chat send announces « Message envoyé » — never « en vérification » and never the word « scan ». Reveal announces « Visible pour [pseudonym] » / « Flou rétabli ».
- Focus-visible: 2px `{colors.focus-ring}` on sand (≥3:1) or `{colors.gold-soft}` on indigo; required on Reveal, audio-prompt, nav, packs, fields, operator-reach-mode, operator-message-cap, card-grid-toggle, focused-card pass / invite / quick message, mahram-grant-row.
- Photo rules and onboarding completable via pictogram + audio without a paragraph (FR-070, FR-010).
- Dynamic type: primary actions do not truncate at largest setting.
- Reduce Motion: skip mihrab wash fade; instant state text.
- Focus order = reading order. Staff unblur control is not in the member tab order (separate shell).
- Color is not the only Reveal signal (caption + pictogram).
- Captcha and liveness must have a non-color fail state.

## Responsive & Platform

- Member: 360px reference. Discover / Search default to one focused card; optional two-column grid behind the toggle. No hover-only Reveal.
- PWA install prompt is optional; Play listing is the Burkina find path (FR-134).
- Android Capacitor: `FLAG_SECURE` as deterrence — do not advertise “cannot screenshot” (AD-9). Camera/mic for liveness and Voice.
- Staff: two-pane from 768px (comfortable at 1024); below 768 the queue stacks above the case.
- Time display `Africa/Ouagadougou`. Invite quotas (Brothers always; Sisters when `same_quota_as_brothers`) and the Free message cap reset on that civil day, not UTC (AD-23) — PRD FR-044 UTC wording is superseded by the spine for implementation.
- iOS layout is not specified for MVP.

## Inspiration & Anti-patterns

- **Lifted (product, not look):** Farata-class invite + blur *existence* (Offered (seen) [bundle]) — raised to per-viewer Reveal/Revoke. A one-at-a-time focused card with pass / invite swipe is **the product**, not a rejected dating pattern. Pass means dismiss this card, not a like.
- **Rejected — dishonest chrome only:** fake presence (« en ligne » / “online now”) and invented scale (“+247.8k actifs”). Do not add a public likes counter or a heart stack of likes.
- **Rejected — pre-delivery hold UX:** any “held until scanned” / fail-closed Chat. Over-cap send is refused, not held. Correction of record 2026-10-01.
- **Rejected — paywalled dignity:** Verification, Blur, Mahram, Report, Block, or Chat after accept behind Premium. Sister Invite is reach (FR-045 / FR-145), not a safety paywall.
- **Rejected — brother-free mode:** Brothers never see `free_unlimited`. Do not design that surface.
- **Rejected — CSS blur:** originals must not ship to unauthorized viewers.

## Open questions (do not close)

Keep PRD §16 and A1–A3 open. UX must not bake a closed answer.

1. Polygamy disclosure UX / first-wife awareness — no first-wife notification surface.
2. *(Resolved 2026-10-01 — not open.)* Chat is send-first.
3. USSD/SMS cost — USSD not designed.
4. Imam names + Académie SLA — no hardcoded scholar names in UI chrome.
5. Honest free review hours — show `operator_config` value, do not invent a second number.
6. Anonymous-mode rules — surface absent.
7. Brother clear Photo before accept if he opted out of Blur — `[ASSUMPTION]` lean yes if owner un-blurred; confirm. Config `default_preaccept_clear_if_owner_unblurred`.
8. GIF pack — picker absent.
9. Native-speaker check of shortlist names — name stays TBD.
10. OAPI / WIPO / handles — name stays TBD.
11. Free Money / MTN MoMo — not on checkout.
12. Retention clocks — status page shows working NFR-008 numbers as `[ASSUMPTION]`.
- **A1** 19+ gate ships as designed; legal review open.
- **A2** Mahram path ships as designed; legal review open.
- **A3** Hosting disclosure ships AD-5 French sentence; A3 text is not rewritten.

## Key Flows

Protagonist names kept from the PRD. Each climax is the named beat.

### UJ-1. Fatim searches without selling her face

**Persona + context:** Fatim, 24, Ouagadougou, shared low-end Android, ~1GB/month, French plus Mooré at home.

Implements FR-001, FR-002, FR-009–FR-012, FR-014, FR-016, FR-020, FR-021, FR-024–FR-026, FR-037–FR-042, FR-044, FR-045, FR-046, FR-050, FR-056–FR-059, FR-062–FR-065, FR-071–FR-079, FR-083, FR-084, FR-105, FR-132–FR-134, FR-136–FR-138, FR-144, FR-145, FR-146, NFR-001, NFR-003, AD-4, AD-9, AD-10, AD-12, AD-16. See [prd.md §2.3 UJ-1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-16](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md). Card/grid is AD-28. Message cap is AD-29. Mahram per-thread grants are amended AD-12.

1. Opens web / PWA / Play app. Creates account (email, password, unique pseudonym, gender Sister). → FR-001, FR-132, FR-133, FR-134
2. Completes phone OTP, then ID + liveness. Verification is free. → FR-002, FR-014, FR-015, FR-105
3. Age gate blocks anyone under 19. → FR-011, NFR-001
4. Guided onboarding: **minimum-to-browse** vs **complete-to-send-Invite**. Mooré audio on hard steps. → FR-009, FR-010, FR-137, FR-138
5. Sets Blur-by-default. Human review must pass before she is publicly visible. Profile Photo shows **not-yet-public**. → FR-012, FR-016, FR-056, FR-065
6. Discover (and Search) open on one focused card. Under the photo she sees shared traits only (open to polygamy, same town, kids / accepts a partner with kids, other shared Profile fields already in the PRD). She can pass (dismiss), send an Invite, or send a quick message (Invite quota FR-044/FR-045 and FR-146 apply). Tap opens the full Profile. A toggle to the optional grid is on the screen. She may save a private favourite. Lite: small image, text first. → FR-021, FR-022, FR-024, FR-025, FR-026, FR-136, FR-146
7. Sends an Invite with Message Flash. Default `sister_reach_mode` is `free_unlimited`: unlimited Invites, no pack for reach. If the Operator has set `same_quota_as_brothers`, FR-044 Invite caps apply and a 4th Free Invite that Ouaga day opens the same payment-pack checkout as Brothers. Free-tier messages (Flash and card quick message) still hit FR-146 unless she has Premium. Over-cap send is refused, not held for scan. Safety stays free. → FR-038, FR-044, FR-045, FR-046, FR-105, FR-145, FR-146
8. Incoming Brother Invite shows marital status and polygamy intent **before** accept. Decline is quiet. → FR-037, FR-039, FR-040, FR-042
9. She accepts. Chat opens. She may Reveal to him only, or refuse, and may Revoke later. → FR-041, FR-050, FR-057, FR-058, FR-059
10. Optional: invites her Mahram by phone (UJ-3). After confirm the grant list is empty; she picks which Brother threads he may read. → FR-071–FR-079
11. Every Chat text, Photo, and Voice note is delivered immediately. A later flag is invisible to her. Scan-deferred is staff-only. → FR-062–FR-067, FR-144, NFR-003
12. She can Report or Block from Profile or Chat. → FR-083, FR-084
13. **Climax:** She is in a wali-aware Chat at stage **chat**; Photos stay blurred to that Brother until she Reveals.
14. Edge: she locks PIN before handing the phone to a cousin. → FR-020

Failure: review not yet passed → she can finish onboarding but does not appear on anyone’s people list (card or grid). Failure: 2G audio → pictograms. Failure: send on dead radio → text outbox; never a scan-hold. Failure: Free message cap → send refused, message quota wall.

### UJ-2. Ibrahim pays in Orange Money and is seen as a suitor

**Persona + context:** Ibrahim, 29, Bobo-Dioulasso, already married, seeking a second wife with honesty.

Implements FR-001–FR-005, FR-012–FR-015, FR-021–FR-025, FR-037, FR-041, FR-043, FR-044, FR-046–FR-048, FR-089, FR-104–FR-111, FR-145, FR-146, NFR-004, AD-14, AD-16, AD-21, AD-26. See [prd.md §2.3 UJ-2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md). Message cap is AD-29.

1. Signs up as Brother, pledges sincerity naming honesty about existing marriage, accepts rules. → FR-001, FR-005, FR-089
2. Phone OTP + liveness + ID, free. Google is additional, not the only path. → FR-002, FR-003, FR-014
3. Declares marital status **married** and polygamy intent **yes**. Visible to Sisters before accept. → FR-021, FR-037
4. Completeness meter names missing Islamic criteria without shaming. → FR-022, FR-023
5. After human review, Discover opens on one focused card; he can toggle to the optional grid. Free daily Invite quota **3** `[ASSUMPTION]`. Free-tier messages are daily-capped (FR-146; current admin value). He never sees a free-unlimited reach mode, regardless of `sister_reach_mode`. → FR-012, FR-024, FR-025, FR-044, FR-145, FR-146
6. Attaches a Message Flash from a deen/family Ice Breaker. Flash and card quick message count against FR-146. Cannot resend after refuse. → FR-043, FR-046, FR-047, FR-146
7. Buys a 1-month Premium pack in XOF via Orange Money BF. No silent auto-renew. Price matches the public page. Premium unlocks unlimited Invites and unlimited messages. → FR-104, FR-106, FR-107, FR-108, FR-146
8. Sister accepts. If she granted this thread to a Mahram, he sees the banner from the first message. → FR-041, FR-048, FR-079
9. He cannot pay to skip moderation, quotas, or verification. Paid-faster-review does not auto-clear a flag. → FR-105, FR-110, FR-111
10. **Climax:** A Sister accepts. He is in stage **chat**. Premium bought him unlimited Invites and unlimited messages.

Failure: rail down → `PAY_UNAVAILABLE`; Free + safety stay (NFR-004). Failure: quota → reset time in `Africa/Ouagadougou`.

### UJ-3. Ousmane reads granted threads and can stop those Chats

**Persona + context:** Ousmane, Fatim’s father, feature-phone plus a basic Android. No dating-app identity.

Implements FR-024, FR-025, FR-053, FR-071–FR-079, FR-087. See [prd.md §2.3 UJ-3](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md). Mahram per-thread grants are amended AD-12.

1. Fatim invites him by phone. → FR-071
2. He verifies with OTP and declares **father**. Unmatched friend is rejected. → FR-072, A2
3. Fatim confirms. Optional ID may earn Verified-Mahram; no kinship document. After confirm the grant list is empty. → FR-073, FR-078
4. He is **not** attached to every conversation. Fatim chooses which Brother threads he may read. New Chats are not auto-granted. He receives SMS for pause/end/flag on granted threads. → FR-053, FR-074
5. He reads only granted, delivered messages. His thread list shows only granted threads. He cannot compose or send as Fatim. → FR-074, FR-076
6. On a granted thread he flags (priority queue), pauses (both see paused), or ends (terminal). → FR-075, FR-087
7. Fatim can revoke one granted thread, or remove / Report him. Removal (FR-077) drops every thread he had. After remove he loses all read access ≤60s. → FR-074, FR-077
8. He is not offered browse or Invite. `[ASSUMPTION]` Mahram accounts cannot send Invites or appear in people lists (card or grid). → FR-071, FR-024, FR-025
9. **Climax:** He pauses a granted Chat that slips. He never sent a message as Fatim. He was never read-all on every Chat.

Failure: pending invite ignored 7 days → expires `[ASSUMPTION]`. Failure: Brother tries to resume a Mahram pause → rejected. Failure: he opens an ungranted thread → « Accès retiré ».

### UJ-4. Aïcha closes a report without peeking for curiosity

**Persona + context:** Aïcha, Trust & Safety.

Implements FR-067, FR-069, FR-083, FR-085–FR-088, FR-090, FR-093, FR-116, FR-141, FR-144, NFR-003, NFR-009, AD-10, AD-18. See [prd.md §2.3 UJ-4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md).

1. Case opens from Member Report and/or an AI flag on an **already-delivered** message plus the flagged person. → FR-087, FR-088, FR-144
2. Console thumbnails stay blurred. Unblur requires a typed case reason and writes audit. → FR-093, NFR-009
3. She applies warning / suspend / other published action, or a photo Strike (3 → 24h). The AI does not choose. → FR-069, FR-085, FR-144
4. False-report pattern can itself be sanctioned. → FR-086
5. Member receives published-status outcome. Report clock started at submit; AI-flag clock started when the flag entered the queue. Target 24h first human. → FR-083, FR-144, NFR-003
6. Member can appeal. A second human reviews. → FR-090
7. If AI is down she works the flag queue of delivered messages plus scan-deferred / scan-failed. Nothing is held for the recipient. → FR-067, FR-144
8. **Climax:** Decision is appealable and auditable. The original message stays delivered unless a later **human** product rule says otherwise.

Failure: fiqh-edge → escalate to Advisory Board, do not invent a fatwa (FR-116, FR-141). Failure: curiosity unblur without reason → control stays disabled.

### UJ-5. Aminata and Yusuf jointly report they got married

**Persona + context:** A couple who completed nikah after a chaperoned path.

Implements FR-025, FR-028, FR-095–FR-102, AD-25. See [prd.md §2.3 UJ-5](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md).

1. One spouse starts “nous nous sommes mariés” naming the other. → FR-095, FR-028
2. The other must confirm. One-sided claim does not increment the counter. → FR-096, FR-101
3. Optional private nikah proof is stored privately. → FR-097
4. Both enter joint **married** (not in browse; no new Invites). → FR-098, FR-025
5. Optional consent story; either can refuse public. Extra family-ok checkbox `[ASSUMPTION]`. → FR-099, FR-100
6. Public counter was 0 at launch and only increments on dual-confirm. → FR-101
7. Testimonials carousel is **not** MVP. → FR-102
8. **Climax:** Both confirm. Counter increments by 1. Neither stays “available.”

Failure: one refuses the public story → counter may still increment; showcase stays empty of their faces.

### UJ-6. Kadiatou configures price, policy, and honours a CIL request

**Persona + context:** Operator, not a Moderator.

Implements FR-019, FR-044, FR-045, FR-092, FR-101, FR-105, FR-106, FR-108, FR-115, FR-116, FR-120, FR-139–FR-143, FR-145, FR-146, NFR-002, NFR-003, NFR-008, AD-5, AD-14, AD-19. See [prd.md §2.3 UJ-6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) and [ARCHITECTURE-SPINE.md AD-5](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md). Message cap is AD-29.

1. Edits Premium pack prices and 1/3/6 durations. Auto-renew stays off. Sets `sister_reach_mode` (`free_unlimited` default, or `same_quota_as_brothers`) and, next to it, `daily_message_cap` (current admin value; no locked number; Premium is unlimited). Those changes are audited; subsequent Sister Invites use the new reach mode; subsequent Free-tier message sends use the new cap; past Invites and already-delivered messages stay. No brother-free control. → FR-106, FR-108, FR-139, FR-145, FR-146
2. Edits moderation policy text and numeric thresholds. New thresholds apply to subsequent messages only. Policy must say: delivered then scanned; AI flags a human; AI does not silently delete, block, or hold. → FR-140, NFR-003
3. Publishes Advisory Board names and Académie articles (minimum five). → FR-115, FR-116, FR-141
4. Views internal metrics (levels, dual-confirmed marriages, report SLA, scan-deferred). Public counters stay proof-backed. → FR-092, FR-101, FR-142
5. Processes deletion / export / CIL through ticketing with a Member-visible status. → FR-019, FR-143, NFR-008
6. Hosting location stays on the public privacy page. She cannot hide it. → FR-120, NFR-002
7. **Climax:** She lowers a flag-confidence threshold and publishes a 3-month XOF pack without a code release, and a CIL request shows completed.

Failure: attempt to hide hosting → control absent. Failure: attempt to rewrite old sanctions by changing threshold → UI states subsequent-only.

## Traceability

One row per MVP screen. Paths relative to this file.

| Screen | Implements | PRD | Architecture |
|---|---|---|---|
| Public landing | FR-101, FR-117, AD-25 | [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Legal hub | FR-109, FR-119, FR-120, AD-5, AD-19 | [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-5](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Public pricing | FR-044, FR-045, FR-105, FR-106, FR-108, FR-145, FR-146, AD-14 | [prd.md §4.10](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md); AD-29 |
| Académie list + article | FR-115, AD-24 | [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-24](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Advisory Board | FR-116, AD-22 | [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-22](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| FAQ + contact | FR-118 | [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
| Showcase | FR-099, FR-100, AD-25 | [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Cookie consent | FR-119, AD-9 | [prd.md §4.11](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-9](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Splash | FR-132, FR-133, FR-134, AD-4 | [prd.md §4.12](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-4](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Auth (signup / login) | FR-001, FR-003, FR-005, FR-007, AD-8 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-8](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Age gate | FR-011, FR-091, AD-8 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-8](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Email verification | FR-006 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
| Password reset | FR-008 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
| OTP | FR-002, AD-13 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-13](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| ID + liveness | FR-014, FR-015, FR-105, AD-13 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-13](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Onboarding | FR-009, FR-010, FR-137, FR-138, AD-24 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-24](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Photo rules | FR-070, FR-010, AD-24 | [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-24](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| PIN lock | FR-020, NFR-001, AD-8 | [prd.md §4.1](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-8](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Profile edit | FR-017, FR-018, FR-021, FR-022, FR-023, AD-26 | [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-26](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Profile not-yet-public | FR-012, FR-065, AD-10 | [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Discover | FR-024, FR-025, FR-136, FR-146, AD-16 | [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-16](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) (card payload); AD-29 |
| Search | FR-024, FR-025, FR-136, FR-146, AD-16 | [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-16](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) (card payload) |
| Filters | FR-024 | [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — (FR-030 stays NEXT) |
| Profile detail | FR-015, FR-016, FR-056, AD-9 | [prd.md §4.5](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-9](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Blur / Reveal / Revoke | FR-056, FR-057, FR-058, FR-059, AD-9 | [prd.md §4.5](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-9](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Favourites | FR-026 | [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
| Invite compose + Message Flash | FR-038, FR-044, FR-045, FR-046, FR-047, FR-105, FR-145, FR-146, AD-23 | [prd.md §4.3](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-23](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md); AD-29 |
| Sister invite quota wall | FR-044, FR-045, FR-105, FR-145, AD-14, AD-23 | [prd.md §4.3](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Message quota wall | FR-146, FR-105, FR-044 | [prd.md §4.4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | AD-29 |
| Invite inbox | FR-037, FR-039, FR-040, FR-042, AD-26 | [prd.md §4.3](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-26](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Discussions list | FR-041, FR-050, AD-15 | [prd.md §4.4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-15](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Chat thread | FR-041, FR-050, FR-051, FR-062, FR-063, FR-064, FR-146, AD-10, AD-15 | [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md); AD-29 |
| Contact-share interstitial | FR-068, AD-17 | [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-17](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Report / Block | FR-083, FR-084, FR-037 | [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
| Marriage dual-confirm | FR-095, FR-096, FR-097, FR-098, AD-25 | [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Consent story | FR-099, FR-100, AD-25 | [prd.md §4.9](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-25](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Payment pack | FR-044, FR-045, FR-104, FR-105, FR-106, FR-107, FR-145, FR-146, AD-14, AD-21 | [prd.md §4.10](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md); AD-29 |
| Notifications | FR-052, FR-053, AD-16 | [prd.md §4.4](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-16](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Settings | FR-019, FR-020, FR-120, FR-136, FR-138, AD-19 | [prd.md §4.12](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-19](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Delete / export status | FR-019, FR-143, NFR-008, AD-19 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-19](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Appeal | FR-090, AD-18 | [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-18](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Family guidance | FR-080 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
| Mahram invite (Sister) | FR-071, AD-12 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Mahram OTP + relationship | FR-072, A2, AD-12 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Sister confirm Mahram | FR-073, AD-12 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Mahram grant list | FR-074 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | AD-12 |
| Mahram revoke one thread | FR-074 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | AD-12 |
| Mahram thread list | FR-074, FR-076 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | AD-12 |
| Mahram read-only thread | FR-074, FR-076, AD-12 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md); AD-12 |
| Mahram pause / end / flag | FR-075, FR-087, AD-12 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-12](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Verified-Mahram ID (optional) | FR-078, AD-13 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-13](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Remove / Report Mahram | FR-077, FR-074 | [prd.md §4.7](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | AD-12 |
| Admin flag queue | FR-067, FR-144, AD-10 | [prd.md §4.6](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Case file | FR-087, FR-088, FR-093, AD-18 | [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-18](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Sanction | FR-085, FR-144, AD-10 | [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Appeal review | FR-090, AD-18 | [prd.md §4.8](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-18](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator policy / thresholds | FR-140, AD-10 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-10](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator pricing | FR-139, FR-106, FR-145, AD-14 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-14](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator sister-reach mode | FR-145, FR-044, FR-045, FR-105, AD-27, AD-14, AD-21 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-27](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator daily message cap | FR-146 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | AD-29 |
| Operator metrics | FR-092, FR-142, AD-20 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-20](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator CIL / deletion tickets | FR-143, AD-19 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | [AD-19](../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) |
| Operator Board / Académie publish | FR-141, FR-115 | [prd.md §4.13](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
| T&S visit signals | FR-027 | [prd.md §4.2](../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md) | — |
