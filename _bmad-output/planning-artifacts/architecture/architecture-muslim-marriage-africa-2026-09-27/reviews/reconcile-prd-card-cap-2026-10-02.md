---
title: Input reconciliation — PRD 2026-10-02 card / grant / message-cap lock
status: complete
created: 2026-10-02
verdict: pass-with-findings
date: 2026-10-02
input: prds/prd-muslim-marriage-africa-2026-09-27/prd.md (binding 2026-10-02)
against: architecture/architecture-muslim-marriage-africa-2026-09-27 (ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md, updated 2026-10-02)
focus: FR-024, FR-025, FR-044, FR-045, FR-050, FR-051, FR-074, FR-076, FR-077, FR-105, FR-145, FR-146
locked: 2026-10-02 card default + grid toggle; mahram grant list empty after confirm; Free-tier daily_message_cap; Sisters buy packs in both sister_reach_mode values; Brothers stay paid; NEXT stays NEXT; AD-10 passive Chat stays
not_reopened: AD-10, AD-11, AD-5, A1–A3, name
supersedes_for_this_lock: reviews/reconcile-prd-2026-10-02.md §3 pack-offer finding (PRD now requires Sister checkout in both modes)
---

# Reconcile: UPDATED PRD → UPDATED spine + SOLUTION-DESIGN (card / grant / cap, 2026-10-02)

PRIMARY input: `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` (binding 2026-10-02).
Compared against: `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md` (both `updated: 2026-10-02`).
Spine `.memlog.md` treated as author intent, not coverage. Artifacts were not modified.

This is extract-and-gap on the **2026-10-02 card / Mahram-grant / message-cap lock**. The earlier same-day sister-reach reconcile (`reviews/reconcile-prd-2026-10-02.md`) is still the lens for AD-27 Invite-quota mechanics. Its **§3 pack-offer finding is superseded**: the binding PRD now requires Sisters to see and buy the same 1/3/6 packs in **both** `sister_reach_mode` values because Free-tier messages are capped (FR-146). This file does not re-score the 2026-10-01 Chat-passive findings.

**Verdict: pass-with-findings.**

The locked decisions landed as **AD-28** (card default + grid toggle), **AD-29** (Free-tier `daily_message_cap`), **AD-12** amended (empty grant list after confirm; grant / revoke-one / revoke-all), and consequential AD-2 / AD-14 / AD-21 / AD-18 / AD-23 / AD-27-checkout edits. SOLUTION-DESIGN §2 / §3 / §6 / §7 / §10 / §11 / §16 carry the APIs and entities. FR-146 has its own §16 row. Coverage claim is **146 / 146** FRs and **9 / 9** NFRs — arithmetic range walk confirms. NEXT ids inside ranges stay horizon-NEXT. AD-10 (passive Chat) and AD-5 (Scaleway `fr-par`) were not reopened. Brothers never gain a free Invite mode. Sisters can buy packs in both reach modes. After OTP + Sister confirm, the Mahram grant list is empty.

What landed thinly (not dropped): FR-024 basic-filter ACs and the kids shared-trait example versus “no new profile columns”; FR-074 Flash-before-conversation grant (grant is `conversation_id`-scoped); FR-077 Report → trust case (revoke-all + emergency hide landed; case-open is implicit); FR-146 over-cap “see the pack purchase” (error code landed; offer payload is not an AD).

---

## 0. Required confirmations

| Check | Result | Evidence |
| --- | --- | --- |
| FR-024 / FR-025 traced (not dropped) | **Confirmed** | AD-28 Binds FR-024, FR-025. SD §16 `FR-024–FR-027` → discovery → AD-3, AD-16, **AD-28**. Capability map discovery cites AD-28. |
| FR-044 / FR-045 still bound; Brothers stay paid | **Confirmed** | AD-27 + AD-14 “Do not accept a brother-free mode.” AD-2: Brother Invite quota may call `BillingPort.isEntitled` always. AD-29: Free Brothers keep daily Invite cap (3 / Ouagadougou day `[ASSUMPTION]`); no Premium Invite cap of 15. SD §7 Brother quota row ignores `sister_reach_mode`. |
| FR-050 / FR-051 cap + passive delivery | **Confirmed** | AD-29 counts chat text / photo / voice. AD-10: allowed send persists `delivered` immediately; later flag does not unsend; not held for scan. Over-cap → `MESSAGE_CAP_EXCEEDED`, not stored, not held (AD-21, AD-23). SD §8 step 1 consults FR-146 before insert. |
| FR-074 / FR-076 / FR-077 grant model | **Confirmed** | AD-12 `[ADOPTED]`: after OTP + Sister confirm, grant list is **empty**; she grants individual Brother threads; new chats not auto-granted; reads only granted, delivered; cannot compose/send as her; revoke-one drops that thread; remove/report drops every grant within 60s + may `ProfilePort.emergencyHide` (24h). SD §6 `mahram_thread_grant`; §7 grant/revoke/remove routes; **no mahram send route**. |
| FR-105 safety not paywalled; Chat volume is capped | **Confirmed** | AD-21: verification, blur/reveal, mahram attach, report, block, browse must not call `BillingPort`. Invite accept / `openFromInvite` must not. Chat-after-accept **may** call `isEntitled` **only** to decide FR-146. Safety actions are not messages. |
| FR-145 operator mode + Sister checkout in **both** modes | **Confirmed** | AD-27: both enum values seeded day one; operator-only write; Invite-send `BillingPort` still banned in `free_unlimited`. Checkout catalog exists in **both** modes (AD-14, AD-27, AD-2). SD §7 `/v1/packs` + `/v1/payments`; §11 Sisters buy 1/3/6 in both modes; in `free_unlimited` pack is not required for Invite reach. |
| FR-146 traced (not dropped) | **Confirmed** | Own SD §16 row: FR-146 → chat, operator, billing → **AD-29, AD-21, AD-23, AD-18**. AD-29 Binds FR-044, FR-050, FR-051, FR-105, FR-146. `operator_config.daily_message_cap` required; seed **10** `[ASSUMPTION — admin-configurable, not a product lock]`. |
| Coverage still complete (146/146, 9/9) | **Confirmed as range coverage** | Continuous walk FR-001…FR-146; NFR-001…NFR-009 each have a row. Claim: “146 / 146 FRs mapped (145 prior + FR-146). 9 / 9 NFRs mapped. 0 missing.” |
| NEXT ids stay NEXT | **Confirmed** | §16 horizon column + totals footnote: FR-004, FR-029–FR-036, FR-049, FR-054–FR-055, FR-061, FR-081–FR-082, FR-094, FR-102–FR-103, FR-111–FR-114, FR-121–FR-131, FR-135. AD-28: FR-030 stays NEXT. Feature flags `who_favourited_me`, `visitors_list`, `online_now`, `boosts`, `gif_picker`, `ussd`, `anonymous_mode`, `ios_apple_signin` stay off. |
| Passive Chat (AD-10) unchanged | **Confirmed** | Persist-`delivered`, background `ModerationPort`, no pre-delivery hold, Profile publish-gate, D6 honesty. Cap consult is **before** insert (AD-29); an allowed message is still AD-10. No `hold_queue`. OQ-2 stays resolved. |
| AD-5 unchanged | **Confirmed** | Scaleway `fr-par`; same French disclosure; CIL launch gate; `[ASSUMPTION — legal review]`. |
| Sisters buy packs in **both** `sister_reach_mode` values | **Confirmed** | AD-14, AD-27, AD-2, AD-21; SD §2 inherit, §7 resource map, §11. Inverse of the morning pack-hide finding. |
| Mahram grant list empty after confirm | **Confirmed** | AD-12 Rule first sentences; SD §6 `mahram_invite` / `mahram_link` “After confirm the grant list is empty”; §10; conversation insert does **not** insert a grant (AD-23). |

---

## 1. What transferred (not findings)

Locked decision 2026-10-02 (card / grant / cap), from PRD Document control + glossary `daily_message_cap` + `sister_reach_mode` + must-have #1 / #4 amendments:

| PRD lock (2026-10-02) | Architecture |
| --- | --- |
| People lists (Discover, search, every list) default to one focused card | AD-28; SD `GET /v1/browse?view=card\|grid` default `card` |
| Shared traits from existing Profile fields; no new Profile columns | AD-28; SD §6 profile “**No new columns** for kids or card traits” |
| Pass is dismiss, not a like / public counter | AD-28; SD `/v1/browse/pass`; no likes table |
| Card Invite / quick-message obey FR-044 / FR-045 / FR-146 | AD-28 → AD-27 + AD-29; SD returns `QUOTA_EXCEEDED` / `MESSAGE_CAP_EXCEEDED` |
| Optional grid; toggle on every people-list screen; many-filter search may open on grid | AD-28; SD `view=card\|grid` |
| No “online now”; no invented member counts | AD-28; feature flag `online_now` off |
| Advanced filters FR-030 stay NEXT | AD-28 Rule; §16 FR-029–036 NEXT |
| Brothers always paid Invite quota; no brother-free; Premium Invites unlimited (no cap of 15) | AD-27, AD-14, AD-29; SD §6 invite |
| `sister_reach_mode` governs **Invite reach only**; default `free_unlimited` | AD-27 unchanged core |
| Free-tier messages daily-capped for **both** genders, including a Sister in `free_unlimited` | AD-29, AD-21 |
| Counts: chat text, chat photo, voice note, message flash, card quick message | AD-29; SD §6 `message_quota`; Flash / card quick-message call `ChatPort` (AD-23) |
| Premium = unlimited Invites **and** unlimited messages | AD-14, AD-29 |
| Over-cap rejected, not held for scanning; allowed send still AD-10 | AD-29, AD-21, AD-10; `MESSAGE_CAP_EXCEEDED` |
| `daily_message_cap` operator-audited; seed not a product lock | AD-8, AD-18, AD-29; SD `PATCH /v1/staff/config` |
| Sisters buy 1/3/6 packs in **both** reach modes; `free_unlimited` pack not required for Invite reach | AD-14, AD-27 checkout sentence |
| After confirm, Mahram grant list empty; she grants individual threads; new chats not auto-granted | AD-12, AD-23, SD §6 / §7 / §10 |
| Revoke-one vs remove-all (FR-077, ≤60s + emergency hide 24h) | AD-12, AD-23 `ProfilePort.emergencyHide` |
| Mahram cannot send as her | AD-12, AD-8; SD no mahram send route |
| Safety (verification, Blur/Reveal, Mahram, Report, Block) free; not messages | AD-21, AD-13, AD-27 |
| Passive Chat stays | AD-10 |
| NEXT vanity / iOS / USSD / boosts stay NEXT | §16 + feature flags |

The morning lock (AD-27 Invite send / quota / operator PATCH / Brothers paid / safety isolation) is still true. Chat-after-accept is **no longer** “never an entitlement check” for **volume** — that is the intended FR-146 amendment, not a reopen of AD-27 Invite-send rules.

---

## 2. Focus FR point-at-new-rule

| ID | PRD (updated 2026-10-02) | Points at a Rule that would fail the opposite? | Quiet miss inside the FR |
| --- | --- | --- | --- |
| **FR-024** | Default people list is one focused card. Shared traits from existing fields. Pass / Invite / quick-message. Basic filters. FR-030 stays NEXT. No online-now / invented counts. | **Yes** on card-default, no-new-columns, pass-is-dismiss, actions obey quota+cap, no dishonest chrome. AD-28 + SD browse. | Basic-filter ACs (location, marital status, religious criteria, life plans, distance radii, empty state, opposite-gender visibility-approved) are not on AD-28. Kids example vs no kids column — §3. Tap-opens-Profile is UX, not an AD. |
| **FR-025** | Grid optional; toggle on every people-list screen; many-filter search may open on grid; Lite text still shows. | **Yes.** AD-28 toggle + grid-open-ok; AD-16 lite “small image, text first”. | “Cached Profiles without live high-bandwidth video” is implied by AD-15 no live A/V + AD-16 deferred images — not restated on AD-28. |
| **FR-044** | Brothers always Free-capped (3 / Ouagadougou day). Premium = unlimited Invites. No cap of 15. Never a free-unlimited Brother mode. Messages are FR-146. | **Yes.** AD-27 + AD-29 + AD-23 Ouaga reset. PRD ACs now say Ouagadougou day (morning UTC contradiction is gone). | `brother_invite_quota_premium` key still exists in the config convention; Rule says Premium volume is unlimited, not a lock of 15. A builder could still write 15 into that key. Ranking-not-in-MVP is FR-111 NEXT / `boosts` off. |
| **FR-045** | `sister_reach_mode` = Invite reach only. `free_unlimited`: no Invite quota, no pack **for reach**. `same_quota`: FR-044 Free cap. FR-146 still caps Chat. Safety free. | **Yes.** AD-27 + AD-29. SD §7 Sister quota table matches the Invite ACs. Chat-cap AC points at AD-29. | None on Invite reach. Pack-for-messages is FR-145 / AD-14 (now required in both modes). |
| **FR-050** | Real-time Chat after accept. Allowed Photo delivered without waiting FR-063; later flag does not unsend. Free at cap → not sent, not held. GIFs FR-054 NEXT. | **Yes** on cap + passive delivery (AD-29 + AD-10 + AD-15 `message.delivered`). | Typing-within-2s (NFR-005) and reactions visibility are not numbers/invariants on AD-15. Pre-existing thinness; not this lock’s drop. |
| **FR-051** | Voice notes delivered immediately; STT/classify background; not a safety paywall; count as messages; at-cap not sent / not held. | **Yes.** AD-10 + AD-11 + AD-29 + AD-21. | None on the lock. Mooré/Dioula honesty stays AD-11 (not a hold). |
| **FR-074** | After confirm, not attached to every conversation. Empty grants. She grants individual Brother threads. Revoke-one. New Chats not auto-granted. Reads granted, delivered only. | **Yes** on empty list, per-thread grant, revoke-one, no auto-grant, delivered-only, later flag does not hide (AD-10). AD-12 + `mahram_thread_grant` + grant APIs. | Flash-before-conversation: grant row is `{ conversation_id }`. A pending Invite/Flash has no conversation until accept. FR-074 AC “including a Flash on that Invite/thread” and FR-048 remain conversation-scoped. Known leftover (review-gate unapplied). |
| **FR-076** | No send-as-Sister control; API rejects send-as-ward. | **Yes.** AD-12; SD “**no** mahram send route”; AD-8 Mahram ≠ Member. | Compose-UI absence is UX; API reject is the Rule. |
| **FR-077** | Remove drops every grant ≤60s + SMS. Report opens a Moderator case, drops every grant, may emergency-hide 24h. Revoke-one stays for a single thread. | **Yes** on revoke-all ≤60s + `emergencyHide` 24h + SMS (SD §10). Revoke-one stays on AD-12. | Report → `moderation_case` is implicit (AD-10 Member Report / `/v1/reports`). AD-12 names “remove/report” but does not say trust opens a case. |
| **FR-105** | Safety + dignity never paywalled. Invites follow FR-045. Chat after accept **not** unconditionally unlimited (FR-146). Safety actions are not messages. | **Yes.** AD-21 + AD-27 + AD-29. Sister in `free_unlimited` may send unlimited Invites and still hit the message cap. | None on the safety stack. |
| **FR-145** | Operator sets mode; both values day one; audited; subsequent Invites only; no brother-free. Sister UI unlimited Invites **or** same Free Invite cap. **Checkout exists in both modes** (pack for unlimited messages). | **Yes** on operator + audit + subsequent-only + Brother UI + **both-mode checkout** (AD-27, AD-18, AD-14, SD §7). | Invite-UI “shows unlimited Invites” in `free_unlimited` is the quota response `{ capped: false }` — landed. Pricing-page copy is not an AD. |
| **FR-146** | Operator `daily_message_cap`; audited; subsequent sends only; seed not a product lock; Free both genders capped; Premium unlimited; listed kinds count; allowed send still passive; over-cap not held. | **Yes.** AD-29 is the Rule. `message_quota` chat-owned. `GET /v1/me/message-remaining`. PATCH + AD-18 event. | Over-cap AC “they see the 1/3/6-month pack purchase” is an error code + checkout existence, not a required offer payload on `MESSAGE_CAP_EXCEEDED`. |

§16 rows for the slice:

- `FR-024–FR-027` → discovery → **AD-3, AD-16, AD-28**
- `FR-038–FR-043` → invites, mahram, chat → AD-23, AD-21, AD-10, **AD-27** (morning omit of AD-27 is fixed)
- `FR-044–FR-045` → invites, billing, operator → **AD-27, AD-21, AD-23, AD-29**
- `FR-046–FR-049` → AD-23, AD-21, AD-10, **AD-29** (Flash counts; FR-049 stays NEXT)
- `FR-050–FR-052` → chat, notifications, media → AD-15, AD-9, AD-16, **AD-29**
- `FR-071–FR-080` → mahram → **AD-12, AD-13**
- `FR-104–FR-110` → billing → AD-14, AD-21, AD-27, **AD-29**
- `FR-139–FR-142` → operator → AD-10, AD-14, AD-20, AD-18, **AD-29**
- `FR-145` → operator, invites, billing → **AD-27, AD-18, AD-14, AD-21**
- `FR-146` → chat, operator, billing → **AD-29, AD-21, AD-23, AD-18**

That is the new rule set: card default, empty grant list, message cap, Sister packs in both modes. It is not the deleted “Chat after accept is never an entitlement check” and not the morning “do not offer a Sister pack in `free_unlimited`.”

---

## 3. Quiet requirement: FR-024 kids example vs no kids column

AD-28 copies the PRD example list — “open to polygamy, same town, kids / accepts a partner with kids” — and then forbids new profile columns. SD §6 is explicit: “**No new columns** for kids or card traits (AD-28).”

FR-021’s stored fields are age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, Photos. No kids field. Polygamy and town can be computed from `polygamy_intent` + `city`. Kids cannot, unless a builder treats `profile_field` as an unbounded bag or invents a column.

The FR-024 AC still passes if the kids chip is absent (show only traits that already exist). The **example inside the Rule** will tempt a discovery team to add a kids column and fail AD-28.

**Severity:** low. Card default landed. This is example-vs-schema honesty, not a dropped presentation rule.

---

## 4. Quiet requirement: FR-024 basic filters stay module-only

FR-024’s title is “one focused card **(basic filters)**.” ACs lock location, marital status, religious criteria, life plans, distance (working 10 / 25 / 50 / city-wide), `married` + polygamy-intent exclude, `life_plans=ready_now`, and an empty state with no invented Profiles.

AD-28 governs presentation (one profile, toggle, no new columns, no online-now). It does not name the filter set. SD has `/v1/filters` with no schema. Those ACs remain discovery-module work, the same way they were before the card rewrite.

**Severity:** low. Not a drop of the card lock. A team that ships card+toggle and omits distance / empty-state still satisfies every AD-28 sentence.

---

## 5. FR-074 Flash-before-conversation (grant is conversation-scoped)

`mahram_thread_grant.conversation_id` is unique per active mahram+conversation. `ChatPort.openFromInvite` is the only INSERT of `conversation`, and only after Sister accept (or she sent). New conversation does not insert a grant.

FR-074 AC: Mahram can read “a message (including a Flash on that Invite/thread)” when she has granted that thread. Message Flash is invites-owned and visible **before** accept (AD-10). There is no conversation_id to grant yet.

This is the same leftover the 2026-10-01 gate left unapplied (FR-048 / AD-12 read access). The **empty-after-confirm** lock landed. The Flash-before-accept grant path did not.

**Severity:** low for this lock (empty list + per-thread + no auto-grant all landed). Medium only if a story treats pre-accept Flash as in-scope for Mahram read on day one.

---

## 6. FR-146 over-cap → pack purchase

PRD ACs (FR-104, FR-146): a Free Member at the cap “see[s] the pack purchase.”

Architecture: reject with `MESSAGE_CAP_EXCEEDED` + reset time; `GET /v1/me/message-remaining` returns `{ capped, remaining, cap, resets_at }`; Sister `/v1/packs` + `/v1/payments` exist in both reach modes.

Nothing requires the error `details` to include a pack catalog or a checkout deep-link. A chat team can return the code and a reset timestamp and leave pricing to a separate screen. That still satisfies AD-29. The AC is UX-complete only if EXPERIENCE.md (out of this compare) is treated as binding.

**Severity:** low. Checkout existence in both modes landed (the important inversion). Offer-on-error is not an AD.

---

## 7. AD-10 and AD-5 (must stay unchanged)

| Topic | Still true? |
| --- | --- |
| Chat persist `delivered` immediately; background scan; no hold-on-timeout | Yes. AD-10. Cap reject happens **before** persist and is not a hold. |
| Profile Photo / bio publish-gated | Yes. AD-10 apply path. |
| D6 Member-facing delivered-then-scanned copy | Yes. Untouched. |
| Flash `flash_id` scan substrate | Yes. Flash now also consumes `message_quota` via `ChatPort` (AD-23) — scan path unchanged. |
| Primary host Scaleway `fr-par`; public FR disclosure; CIL gate | Yes. AD-5. |
| A1–A3, name, stack pins | Unchanged. |

No card or cap clause was inserted into AD-10 or AD-5. Passive moderation and hosting were not used as a vehicle for the monetisation or browse lock.

AD-27 **core** (Invite-send `BillingPort` only when `same_quota_as_brothers`; Brothers never free; both modes seeded; safety isolation) was not reopened. Only the checkout sentence was amended so Sisters can buy packs in both modes.

---

## 8. SOLUTION-DESIGN §16 coverage (145 prior + FR-146)

Claim: “Coverage: **FR-001–FR-146 = 146/146**. **NFR-001–NFR-009 = 9/9**.” Totals repeat: “146 / 146 FRs mapped (145 prior + FR-146). 9 / 9 NFRs mapped. 0 missing.”

Range walk (no hole, no duplicate of 146):

FR-001–008, 009–010, 011, 012–013, 014–015, 016–017, 018, 019, 020, 021–023, **024–027**, 028, 029–036, 037, 038–043, **044–045**, 046–049, **050–052**, 053, 054, 055, 056–061, 062–068, 069–070, **071–080**, 081–082, 083–093, 094, 095–101, 102–103, **104–110**, 111–114, 115–116, 117, 118, 119–120, 121–131, 132–135, 136, 137–138, **139–142**, 143, 144, **145**, **146**.

Count: 146 distinct FR ids. NFR-001–009 each have a row.

NEXT/LATER inside ranges stay horizon-NEXT (listed in §16 footnote). Dual-control unblur (D31) remains Deferred.

Range presence is not a Rule that would fail if the FR were ignored. For this update that distinction matters for **FR-024 filters / kids** (§3–§4), **FR-074 Flash-before-conversation** (§5), and **FR-146 pack-offer-on-error** (§6). Older decorative maps (FR-005 pledge, FR-007 captcha, FR-042 quiet decline, …) are out of this lock’s scope.

NFR-005 now names “first people-list (default one focused card) ≤ 8s.” AD-16 still says “First-grid metadata+blur thumbs ≤150KB.” AD-28 says card payload budget stays AD-16. The 8s / 4s / 2s lab targets are still not AD numbers (pre-existing). Card default is bound; the lab SLO is not.

NFR-009 now includes `daily_message_cap` changes. AD-18 mandatory events include operator `daily_message_cap` and mahram grant / revoke-one / remove. Landed.

---

## 9. Findings (triaged)

### Critical

None. All twelve must-land FRs have a governing AD. Brothers are not free. Sisters can buy packs in both reach modes. Grant list is empty after confirm. Allowed Chat stays passive (AD-10). Over-cap is reject-not-hold. NEXT ids stay NEXT. Coverage arithmetic is 146/146 + 9/9.

### High

None.

### Medium

None for this lock. The morning medium (Sister pack-offer hidden in `free_unlimited`) is **closed by PRD inversion + AD-14 / AD-27 checkout**. Shipping a Sister pack in `free_unlimited` is now required, not a honesty risk.

### Low

1. **FR-024 kids shared-trait example vs “no new profile columns.”** AD-28 names kids as a computed trait; SD §6 and FR-021 have no kids field. Builders will invent a column or never show the chip. Card default still landed.
2. **FR-024 basic-filter ACs are not on AD-28.** Distance radii, married+polygamy exclude, `ready_now`, empty state, visibility-approved opposite-gender default live only as discovery-module work / `/v1/filters` stub.
3. **FR-074 Flash-before-conversation grant is unbound.** `mahram_thread_grant` is conversation-scoped; Flash is pre-accept. Empty-after-confirm landed. Same leftover as FR-048.
4. **FR-077 Report → `moderation_case` is implicit.** Revoke-all ≤60s, SMS, and `emergencyHide` 24h landed.
5. **FR-146 over-cap “see the pack purchase” is not an error-payload Rule.** `MESSAGE_CAP_EXCEEDED` + both-mode checkout landed.
6. **`brother_invite_quota_premium` key still exists** while every Rule says Premium Invite volume is unlimited (no cap of 15). A config write of 15 would contradict AD-29 unless callers ignore the key when `isEntitled`.

---

## 10. Suggested repairs (not applied)

This review does not edit the spine or the PRD. If a later distill absorbs findings:

1. AD-28: drop “kids / accepts a partner with kids” from the example list, **or** name the existing `profile_field` key the chip reads — do not add a column.
2. Point FR-024 filter ACs at discovery + `/v1/filters` schema (location, marital_status, religious, life_plans, distance) or accept them as UX/spec work.
3. Either grant Flash/Invite by `invite_id` before `openFromInvite`, or state that Mahram Flash read begins only after the conversation exists (and keep FR-048 NEXT-or-explicit).
4. AD-12 or trust: Sister Report of a Mahram opens a `moderation_case` (FR-077 AC).
5. `MESSAGE_CAP_EXCEEDED` details include pack-offer identity, or state that `/v1/me/message-remaining` + `/v1/packs` is the offer surface.
6. Retire `brother_invite_quota_premium` as a daily cap, or document it as unused when `isEntitled` (unlimited).

---

## 11. What this review is not

Not a spine or PRD edit. Not a reopen of AD-10, AD-11, AD-5, A1–A3, name, stack, Capacitor, or AD-9. Not a re-score of 2026-10-01 Chat-passive findings. Not a re-litigation of AD-27 Invite-send `BillingPort` rules. Not UX, spec, or epics. Not legal advice.
