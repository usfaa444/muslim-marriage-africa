# Rubric-walker review — Architecture Spine (card / grid + message cap)

- **Artifact:** `ARCHITECTURE-SPINE.md`
- **Companion (context only, not judged):** `SOLUTION-DESIGN.md`
- **Driving PRD (binding, 2026-10-02):** `prds/prd-muslim-marriage-africa-2026-09-27/prd.md` — FR-024, FR-025, FR-044, FR-045, FR-050, FR-051, FR-105, FR-145, FR-146
- **Altitude:** initiative / build-substrate
- **Reviewed:** 2026-10-02
- **Reviewer:** rubric-walker (independent; spine only; lint already 0 findings)
- **Verdict:** **pass-with-findings**

> **Name lock 2026-10-03 (Maitchibi Fayçal via Harris).** Product name is **AnKanu**. Domain **ankanu.com** purchased on Hostinger. Repository slug `muslim-marriage-africa` is not the product name. Sentences below that treat the name as TBD, undecided, or a live shortlist (Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, `nisfdin`) are historical of this review date. Those names were not chosen and those domains were not purchased. OAPI/WIPO for AnKanu is not recorded as completed.

This run judges the 2026-10-02 card/cap amendment: new AD-28 (one focused card, grid optional) and AD-29 (Free-tier daily message cap), kept as separate IDs; AD-12 grant-scoped Mahram; AD-14 / AD-21 / AD-27 checkout widened so Sisters can buy packs in **both** reach modes because messages are capped. Locked items are **not** holes: AD-10/AD-11 passive Chat, AD-5 hosting, A1–A3, stack pins, Capacitor, AD-9 blur product, AD IDs 1–29 stable and not merged, Brothers never free, passive moderation not reverted.

The card/cap contract landed. A builder who obeys AD-28 will not ship a supermarket grid as the only people-list UI, will not add kids/trait columns, and will not treat Pass as a like. A builder who obeys AD-21 / AD-23 / AD-29 will cap Free-tier sends (including a Sister in `free_unlimited`), will not hold an over-cap send for scan, and will not bake seed **10** as a product lock. Residual: AD-27’s compose “must not show remaining/cap” still reads as a blanket ban and now fights AD-29 on the Sister Flash/compose surface; Invite+Flash fail-together against the message cap is PRD-locked and spine-silent; `message_quota` is thinner than the `invite_quota` lock AD-27 already wrote.

---

## Checklist

| Gate | Result | Notes |
| --- | --- | --- |
| Fixes real feature-level divergence points; misses none | **PASS WITH CAVEAT** | Card-default + `card\|grid` toggle on every people list, no new profile columns, Pass ≠ like, Free-tier message cap for both genders, Premium = unlimited Invites **and** messages, no Premium Invite cap of 15, over-cap rejected not held, Sisters checkout in both reach modes — locked. Caveats: AD-27 compose remaining/cap wording (H1); Invite+Flash atomicity (H2); `message_quota` grain / live read / remaining-read (M1). |
| Every AD Rule is enforceable and prevents its stated divergence | **PASS WITH CAVEAT** | AD-28 Prevents match the Rule (grid-only, fake presence, invented scale). AD-29 Prevents match the Rule (uncapped free Sister chat; locked seed number). Caveat: AD-27 Rule still says Sister compose in `free_unlimited` “must not show remaining/cap or a reach-pack offer” — letter now blocks the message-remaining AD-29 requires on that same surface (H1). |
| Nothing under Deferred could let two units diverge | **PASS** | iOS = same Capacitor project; USSD flag off; one live adapter per port; Redis/Valkey and PG 18 stay on host pins; prices stay `operator_config`. No Deferred item reopens card-vs-grid, `daily_message_cap`, a Brother-free mode, or pre-delivery Chat hold. |
| Named tech is verified-current | **PASS WITH LOW** | Stack is **LOCKED** this run. Pins were current 2026-09-27. Do not demand pin bumps. Internal stale floor (table 16.3.6 vs “do not scaffold below 16.3.7 after 2026-09-30”) recorded only (L3). |
| Greenfield is coherent (no brownfield to ratify) | **PASS** | No legacy runtime or schema. Farata is evidence, not substrate. |
| Covers PRD capability surface, especially FR-024, FR-025, FR-146 | **PASS WITH CAVEAT** | Card default + optional grid; shared traits from existing fields; Free-tier messages capped for both genders including a Sister in `free_unlimited`; Premium unlimited Invites + messages; safety not a message; Brothers stay Invite-capped. Caveats: FR-046 Flash+Invite fail-together (H2); FR-146 remaining-read / live cap (M1). |
| AD IDs 1–29 present and stable; AD-28 card/grid; AD-29 message cap; not merged | **PASS** | All 29 headings present. AD-28 title/Rule is people-list card/grid. AD-29 title/Rule is `daily_message_cap`. They cite each other; they are not one AD. |
| AD-5, AD-10, AD-11 not reopened | **PASS** | AD-5 still Scaleway `fr-par` `[ASSUMPTION — legal review]`. AD-10 still persist-`delivered` + background scan; no `pending→delivered`; no `hold_queue`. AD-11 still Whisper-honest; low-confidence / `mos`/`dyu` is flag or `scan-deferred`, not a Voice hold. Over-cap reject is not a scan-hold (AD-21, AD-29). |
| Brothers not made free | **PASS** | AD-14 / AD-27 / AD-29: no brother-free mode; Brothers always paid Invite quota; they never read `sister_reach_mode` as a free pass; Free Brothers keep the daily Invite cap (`3` `[ASSUMPTION]`). |
| Passive moderation not reverted | **PASS** | Allowed sends still deliver immediately (AD-10). Over-cap is not stored and not held (AD-21, AD-29). AI still does not block, hold, refuse, or auto-suspend. |
| Every initiative dimension decided, deferred, or an open question — especially ops/env envelope | **PASS** | Region, Kapsule `web`+`api`+`worker`, secrets, OTel, IaC, CI host, PITR, launch scale, migration runner: decided. People-list presentation decided (AD-28). Message volume decided (AD-29). `sister_reach_mode` stays decided (AD-27). Q1 and 3–11 plus NFR-008 stay open (AD-22). |

---

## What the 2026-10-02 card/cap update gets right

- **AD-28 and AD-29 exist as separate, stable IDs.** Card/grid is not folded into discovery lite (AD-16) or into the message cap. The message cap is not folded into `sister_reach_mode` (AD-27 still governs Invite reach only).
- **AD-28 locks the people-list fork.** Default is **one** profile on discovery and every people list, including search. Toggle `card | grid` on every such screen; a many-filter search may open on the grid and the toggle remains. Shared traits are computed only from Profile fields that already exist; **no new profile columns**. Pass is a dismiss for this viewer, not a like and not a public counter. Invite and quick-message reuse existing invite/chat commands and obey AD-27 + AD-29. FR-030 stays NEXT. No “online now”. No invented member counts. Card payload budget stays AD-16.
- **AD-29 locks the Free-tier volume fork.** `operator_config.daily_message_cap` is an audited operator key, same kind as `sister_reach_mode`, not a compile-out flag. Seed **10** is `[ASSUMPTION — admin-configurable, not a product lock]`. Counts: chat text, chat photo, voice note, message flash, card quick message. Premium (`isEntitled` true) = unlimited Invites **and** unlimited messages. No Premium Invite cap of 15. Free Brothers keep the daily Invite cap. Change applies to subsequent sends; already-delivered messages stay. Over-cap → `MESSAGE_CAP_EXCEEDED`, not stored, not held. Chat owns `message_quota` and consults before insert.
- **AD-21 no longer treats Chat-after-accept volume as never an entitlement check.** A Free-tier send (both genders, including a Sister in `free_unlimited`) may call `BillingPort.isEntitled` **only** to decide FR-146: entitled = unlimited messages; not entitled = `daily_message_cap`; `unavailable` → Free cap (fail closed on the paid perk, not on safety). Allowed messages still deliver immediately (AD-10). Safety paths, browse, Invite accept, and `openFromInvite` still must not call `BillingPort`.
- **Sister checkout in both reach modes is now the spine lock, not a companion-only sentence.** AD-14 Prevents “hiding the Sister pack when Free-tier messages are capped.” AD-27: catalog exists in both modes; in `free_unlimited` the pack is not required for Invite reach; Sister Invite send still must not call `BillingPort` when `free_unlimited`. Prior rubric H1 (checkout only in `same_quota_as_brothers`) is **closed by this amendment**, not re-opened.
- **AD-12 grant-scoped Mahram stayed `[ADOPTED]` and did not swallow AD-28/AD-29.** Empty grant list after OTP + confirm; individual thread grants; revoke-one vs FR-077 revoke-all; no auto-grant of new chats. Mahram still cannot browse, Invite, or send as her.
- **Consequential amendments stay consistent.** AD-2 Chat/Flash/card-quick-message may call `isEntitled` only for FR-146. AD-3 adds `mahram_thread_grant` and `message_quota`. AD-8 operator may write `daily_message_cap`. AD-17 `MESSAGE_CAP_EXCEEDED` is the message-cap code; a message rate-limit must not be the product cap. AD-18 audits `daily_message_cap` + mahram grant/revoke-one/remove. Config table requires `daily_message_cap`. Capability map cites AD-28 on discovery and AD-29 on invites/chat/billing/operator.
- **Prior 2026-10-02 sister-reach holes that stay closed:** AD-21 `isEntitled` must not throw; quota callers map `unavailable` to the Free Invite cap; `QUOTA_EXCEEDED` named; already-sent invites that day do **not** count toward a newly applied Invite cap. Do not re-raise those.

Do **not** treat as holes this run: A1 19+, A2 mahram path, A3/AD-5 legal review, name TBD, Capacitor, AD-9 blur, AD-10/AD-11 passive Chat, AD-12 cannot-send / grant-scoped read, Brothers always capped, AD IDs 1–29, stack pins. FR-048 Flash-to-Mahram-before-conversation remains the 2026-10-01 unapplied item (would reopen AD-12) — not re-opened here.

---

## Findings

### CRITICAL

None.

### HIGH

#### H1 — AD-27 compose “must not show remaining/cap” now fights AD-29 on the Sister Flash surface

- **Severity:** high
- **Checklist:** AD enforceability; missed feature divergence (invites compose vs chat remaining)
- **Suggest:** **autofix**
- **Where:** AD-27 Rule (“Sister invite send, quota GET, and compose must not call `BillingPort` and must not show remaining/cap or a reach-pack offer”); AD-29 (Flash and card quick-message count against `daily_message_cap`); Consistency Conventions `Errors`
- **Gap:** After this update, Sister compose in `free_unlimited` still must not show **Invite** remaining/cap or a **reach-pack** offer (AD-27 core — do not reopen). It **must** show **message** remaining/cap and may show a message-pack CTA when Flash / card quick-message hits FR-146 (AD-29, FR-146, companion `GET /v1/me/message-remaining`, EXPERIENCE message quota wall). The AD-27 sentence is unscoped: “remaining/cap” and “reach-pack offer.” Two lawful readings: hide every remaining widget and every pack CTA on that screen (AD-29 / FR-146 fail); show message remaining (AD-27 letter fail). Companion and UX already take the second reading and cite the spine as if it had the scope.
- **Divergence it fails to prevent:** invites hide all remaining UI in `free_unlimited`; chat/web render message remaining + pack wall on the same compose; Flash is capped in one unit and looks unlimited in the other.
- **Autofix:** Scope AD-27 to **Invite** remaining/cap and a **reach-pack** offer only. Message remaining/cap and the message-pack CTA on that screen follow AD-29. Sister Invite send / quota GET still must not call `BillingPort` when `free_unlimited`.

#### H2 — Invite + Flash (and Invite + card quick-message) fail-together against the message cap is PRD-locked and spine-silent

- **Severity:** high
- **Checklist:** missed feature divergence; PRD FR-046 / FR-146 coverage
- **Suggest:** **autofix**
- **Where:** AD-23 Rule; AD-29 Rule; AD-28 “existing invite/chat commands”
- **Gap:** FR-046 AC: if the sender is on Free and at the FR-146 cap, the Flash is not sent **and the Invite is not sent with it**. AD-29 says over-cap is not stored and not held. AD-23 says Flash persist and card quick-message call `ChatPort` to consume `message_quota` (chat is the only writer) and that chat consults the cap **before insert**. Neither Rule says the **Invite** persist is gated on that same allow. Two sequences both satisfy the letter: (1) `ChatPort` refuse → no Flash and no Invite; (2) Invite row persisted, Flash rejected with `MESSAGE_CAP_EXCEEDED`.
- **Divergence:** one invites story creates an Invite without Flash at cap; another treats Invite+Flash as one command that fails together. Recipients see a bare Invite the sender thought was blocked. Cap accounting and AD-26’s Invite surface then disagree.
- **Autofix:** One clause on AD-23 (cite on AD-29): Flash or card quick-message that travels with an Invite is one command. `ChatPort` must allow the message-cap consume **before** invites persist the Invite. `MESSAGE_CAP_EXCEEDED` means no `invite` row, no `message_flash` row, no `message` row.

### MEDIUM

#### M1 — `message_quota` is thinner than the `invite_quota` lock AD-27 already wrote

- **Severity:** medium
- **Checklist:** AD enforceability; missed feature divergence (chat vs invites Flash vs card quick-message)
- **Suggest:** **autofix**
- **Where:** AD-29 Rule; AD-23 Rule; AD-3 `message_quota` owner; AD-21 live `isEntitled`
- **Gap:** AD-27 locked `invite_quota` grain `{ account_id, civil_day_ouaga, sent_count }`, increment only on successful send persist, live `isEntitled` / `OperatorPort.get` every send, no process-lifetime cache, billing must not expose a remaining-int. AD-29 names `message_quota`, says chat owns it and consults before insert, and lists the counted kinds. It does **not** lock grain, increment-on-success (no increment on `CONTACT_SHARE_REQUIRED` or over-cap refuse), live `OperatorPort.get` of `daily_message_cap` every send, no civil-day snapshot of the entitled bit, or a single remaining-read through `ChatPort`. Companion already states grain, “written only by chat when the sender is not Premium,” and `GET /v1/me/message-remaining`, and cites AD-29 as if the spine had those sentences.
- **Divergence:** chat keys `message_quota` by conversation; invites Flash keys it by account+day; web counts `message` rows and misses Flash; a process-lifetime cache keeps seed **10** after the Operator writes 5; billing exposes a remaining-int. All five are lawful under AD-29’s letter and forbidden under the invite-quota pattern this spine already adopted.
- **Autofix:** Copy the AD-27 pattern onto AD-29 / AD-23: grain `{ account_id, civil_day_ouaga, sent_count }`; chat is the only writer, increment only on successful persist of a counted kind; Flash / card quick-message call `ChatPort` **before** owner persist and do not increment on refuse; remaining/cap/reset is `ChatPort` only (billing must not expose a remaining-int); every Free-tier send reads live `isEntitled` and live `daily_message_cap` (no process-lifetime cache, no civil-day snapshot of entitled or cap). Do not expand into API paths — those stay companion.

### LOW

#### L1 — Pass persistence is “dismiss for this viewer” without a write rule

- **Severity:** low
- **Checklist:** missed feature divergence (people-list stories)
- **Suggest:** **discuss**
- **Where:** AD-28 Rule (“Pass is a dismiss of this card for this viewer, not a like and not a public counter”)
- **Gap:** Companion hedges: “may reuse a discovery exclusion row if one already exists. Do not invent a likes table.” The spine forbids a likes table in spirit and forbids a public counter. It does not say whether Pass is a durable exclusion for this viewer or a session swipe that can return the same card.
- **Divergence:** Discover persists an exclusion; Search does not. Same viewer, two remaining decks.
- **Discuss:** Prefer “Pass writes a viewer-scoped exclusion (reuse an existing discovery exclusion row if one exists); do not invent a likes table; do not emit a public count.” Or name session-only Pass as an explicit product choice. Either way, one rule.

#### L2 — Mid-day `daily_message_cap` change does not say whether already-sent counts

- **Severity:** low
- **Checklist:** AD-29 subsequent-only; feature-level remaining math
- **Suggest:** **discuss**
- **Where:** AD-29 “Change applies to subsequent sends; already-delivered messages stay”
- **Gap:** AD-27 already locked the Invite-mode analogue (already-sent that day do **not** count toward a newly applied Invite cap). AD-29 locks “already-delivered stay” (do not unsend) but not remaining math when the Operator moves 10→5 after 7 sends, or 10→20 after 7 sends.
- **Divergence:** two chat stories, two remaining values after an Operator edit the same Ouagadougou day.
- **Discuss:** Prefer “`sent_count` stays; remaining = max(0, new_cap − sent_count); change does not rewrite `message_quota` rows.” That matches “subsequent sends” without unsending. Do not copy AD-27’s no-retro-count unless the product owner wants a clean slate after every cap edit.

#### L3 — Next.js pin stale vs the spine’s own floor (stack LOCKED — no edit demanded)

- **Severity:** low
- **Checklist:** named tech verified-current
- **Suggest:** **ignore** this run (record only)
- **Where:** Stack table `16.3.6`; note “do not scaffold below 16.3.7 after 2026-09-30”
- **Gap:** Table vs note already disagreed after 2026-09-30. Prior version-check recorded live `next` 16.3.8. Stack is locked; do not demand a pin bump.

---

## FR coverage (binding this update)

| Requirement | Spine lock | Hole? |
| --- | --- | --- |
| FR-024 people lists default to one focused card; shared traits from existing fields; Pass / Invite / quick-message | AD-28, AD-16, AD-27, AD-29 | no (Pass persist = L1 only) |
| FR-025 optional grid + toggle on every people list; many-filter search may open on grid | AD-28 | no |
| FR-030 advanced filters stay NEXT | AD-28 | no |
| FR-044 Brothers always Invite-quota-capped; no Brother free-unlimited; no Premium Invite cap of 15 | AD-27, AD-14, AD-29 | no |
| FR-045 `sister_reach_mode` governs Invite reach only; Sister in `free_unlimited` still hits FR-146 | AD-27, AD-21, AD-29 | no |
| FR-046 Flash counts against FR-146; at cap, Flash **and** the Invite are not sent | AD-29 counts Flash; fail-together missing | **yes (H2)** |
| FR-050 / FR-051 allowed Chat Photo / Voice deliver immediately; at cap, not sent and not held | AD-10, AD-15, AD-29 | no |
| FR-105 safety + browse never paywalled; safety is not a message | AD-21, AD-2, AD-13, AD-29 count list | no |
| FR-145 both reach modes day one; Operator sets; audited; subsequent only; Brothers UI gains no free mode | AD-27, AD-18 | no |
| FR-145 / FR-106 / FR-107 Sister checkout in **both** modes because messages are capped | AD-14, AD-27, AD-29 | no (prior H1 closed) |
| FR-146 Free-tier daily message cap; both genders; seed not a product lock; subsequent sends; `MESSAGE_CAP_EXCEEDED` | AD-29, AD-21, AD-8, AD-18, Conventions | send path no; remaining/live grain **M1**; compose remaining **H1** |
| FR-110 Premium = unlimited Invites + unlimited messages + queue priority; cannot skip scan | AD-29, AD-14, AD-10 | no |
| FR-044/045 “UTC day” vs AD-23/AD-27/AD-29 `Africa/Ouagadougou` civil day | Intentional; BF is UTC+0 year-round | not a fork — **ignore** |
| OQ-2 resolved; Q1, Q3–11, NFR-008 open | AD-22 | no |

Do **not** treat as holes: A1 19+, A2 mahram path, A3/AD-5 legal review, name TBD, Capacitor, AD-9 blur, AD-10/AD-11 passive Chat, AD-12 grant-scoped read / cannot-send, Brothers never free, AD IDs 1–29, stack pins.

---

## Deferred that can still fork units

| Deferred item | Safe? | Why |
| --- | --- | --- |
| Native iOS + Apple Sign-In | yes | Same Capacitor project; flag `ios_apple_signin` |
| USSD enabled | yes | Port exists, flag off |
| KYC / SMS / moderation / aggregator SKUs | yes | One live adapter per port; OTP + notifications share `SmsPort` |
| Redis vs Valkey | yes | Stay on managed 8.6.3 |
| Scaleway PG 18 | yes | Stay on 17.11 until host lists 18 |
| Dual-control unblur / watermark / multi-region / name / A-V / EN-AR | yes | Scoped; not a card/grid or message-cap fork |
| Exact Premium XOF prices and free-review hours | yes | `operator_config`; `daily_message_cap` is decided (AD-29), not deferred |

Nothing under Deferred reintroduces a grid-only browse, an uncapped free Sister chat, a Brother-free mode, a compile-out of either `sister_reach_mode` value, or a pre-delivery Chat hold.

---

## Version check (named tech) — stack LOCKED

Claim: verified 2026-09-27. This walker does **not** treat the stack table as a required edit.

| Name | Spine | Check 2026-10-02 | Status |
| --- | --- | --- | --- |
| Next.js | 16.3.6 | Spine note already required ≥16.3.7 after 2026-09-30; prior gate recorded live 16.3.8 | **stale pin (L3) — ignore** |
| TypeScript / Node / React / Nest / Capacitor / Drizzle / BullMQ / Socket.IO / Tailwind | as table | not re-pulled as a required edit | locked |
| PostgreSQL (Scaleway managed) | 17.11 | host pin — Deferred already | locked |
| Redis (Scaleway managed) | 8.6.3 | host pin — Deferred already | locked |
| Scaleway `fr-par` | product | AD-5 assumption / legal review — **not a hole** | n/a |

---

## Greenfield

No existing production schema, vendor contract, or deployable is ratified. Rejected hosts remain alternatives, not brownfield. Coherent.

---

## Locked-item audit (this run)

| Locked item | Reopened? | Evidence |
| --- | --- | --- |
| AD-5 hosting | no | Still Scaleway `fr-par`; Vercel/USA rejected; A3 not rewritten |
| AD-10 passive Chat | no | Persist `delivered`; background `enqueueScan`; no hold clocks; over-cap is reject-not-hold, not a new hold machine |
| AD-11 Mooré / Dioula honesty | no | Still no `mos`/`dyu` claim; low-confidence is flag / `scan-deferred`, not a Voice hold |
| AD-28 vs AD-29 merged | no | Separate headings, Prevents, and Rules |
| Brothers made free | no | AD-14 / AD-27 / AD-29 forbid a brother-free mode |
| Passive moderation reverted | no | AD-10 + AD-21 + AD-29: allowed send delivers; AI does not hold |

---

## Suggested resolution order

1. **Autofix H1** — Scope AD-27 “remaining/cap / pack offer” to **Invite** remaining and a **reach-pack** offer. Message remaining and the message-pack CTA follow AD-29.
2. **Autofix H2** — Invite+Flash / Invite+card-quick-message is one command; `ChatPort` allow before invites persist; over-cap means no Invite row.
3. **Autofix M1** if touching AD-29 anyway — grain, increment-on-success, live cap + live `isEntitled`, `ChatPort` remaining-read, billing must not expose a remaining-int.
4. **Discuss L1 / L2** only if Pass persist or cap-edit remaining ships in the same slice.
5. **Ignore L3** this run (stack locked).

Do not expand the spine into a solution design. Do not re-open A1–A3, AD-5 legal review, Capacitor, AD-9, AD-10/AD-11, AD-12 mahram product, AD-27 Invite-reach core, AD IDs, or stack pins. Do not merge AD-28 and AD-29. Do not make Brothers free. Do not revert passive moderation.

---

## Verdict rationale

**pass-with-findings**, not revise: the 2026-10-02 card/cap correction landed. AD-28 and AD-29 are present, stable, and not merged. People lists default to one card with an optional grid. Free-tier messages are capped for both genders, including a Sister in `free_unlimited`. Premium is unlimited Invites **and** unlimited messages. Over-cap is rejected, not held. Sisters can buy packs in both reach modes because messages are capped. AD-5 / AD-10 / AD-11 were not reopened. Brothers were not made free. Passive Chat was not reverted.

**pass-with-findings**, not pass: AD-27’s unscoped compose remaining/cap ban now contradicts the message-remaining AD-29 requires on that surface; Invite+Flash fail-together is a binding FR-046 AC the spine does not lock; `message_quota` lacks the grain / live-read / remaining-read sentences this spine already used for `invite_quota`. Those are real feature-altitude forks. None of them reintroduces a grid-only browse, a Brother-free mode, or a Chat hold.
