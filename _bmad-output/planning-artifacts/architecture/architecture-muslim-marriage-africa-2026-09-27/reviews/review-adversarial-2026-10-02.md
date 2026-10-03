---
name: review-adversarial
artifact: ARCHITECTURE-SPINE.md
lens: adversarial
date: 2026-10-02
status: complete
kind: reviewer-gate
focus: sister_reach_mode / invite_quota / BillingPort
---

# Adversarial review — architecture spine (Sister-reach, 2026-10-02)

**Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md`  
**Lens:** Attack the spine as an adversary. Construct two units one level down (two feature teams) that each obey every AD to the letter and still ship incompatibly — clashing shared-data shapes, two owners of one entity, conflicting state-mutation paths. Every pair is a hole to close with a new or tightened AD.  
**Scope of reading:** the spine only. Companions, PRD, SOLUTION-DESIGN, memlog, and prior reviews are not authority.  
**Locked (not holes):** A1–A3; product name; AD-5; stack pins; Capacitor (AD-4); AD-9 blur/reveal/gateway; AD-12 Mahram; AD-10 / AD-11 passive Chat.  
**New-AD bar:** do not invent a new AD unless two teams can still build Sister-reach / invite-quota / `BillingPort` use incompatibly while obeying AD-2, AD-21, AD-23, AD-27. Remaining Sister-reach forks close by tightening those ADs plus AD-8 / AD-18 / AD-17.

## Method

Two hypothetical feature teams — **Team A** and **Team B** — are given the spine and nothing else. Each team:

- ships one API product, hexagonal modules, ports, adapters (AD-1, AD-2);
- writes only the entities AD-3 assigns them;
- may call `BillingPort.isEntitled` from Sister **invite send** only when `operator_config.sister_reach_mode` is `same_quota_as_brothers`; must not call it from Sister send when `free_unlimited` (AD-2, AD-21, AD-27);
- never treats `sister_reach_mode` as a Brother free pass (AD-27);
- writes `invite_quota` only from invites, and only when the sender is quota-capped (AD-27);
- treats `isEntitled=unavailable` or missing pack as the Free cap, not a safety block (AD-27);
- resets daily quotas on the `Africa/Ouagadougou` civil day (AD-23);
- leaves safety paths and Chat after accept off `BillingPort` (AD-21);
- persists Chat `delivered` and never holds on AI (AD-10, locked).

If those two teams can still disagree on a shared record, a writer, or a mutation path, the spine does not yet bind that seam. A pair that only exists by *violating* AD-2 / AD-21 / AD-27 (Sister send calling `BillingPort` in `free_unlimited`; Billing writing `invite_quota`; Brothers reading the mode as unlimited; safety calling `isEntitled`) is not a hole.

## Verdict

**revise**

The 2026-10-02 amendment holds for the thing it was written to lock: two teams **cannot** lawfully compile out a mode, give Brothers a `sister_reach_mode` free pass, call `BillingPort` from Sister **send** in `free_unlimited`, let billing write `invite_quota`, or treat `unavailable` as a safety outage. `invite_quota` has one writer; both enum values seed; Chat after accept stays off billing.

That is not enough. Teams that obey AD-2, AD-21, AD-23, and AD-27 to the letter can still:

- apply a mode flip to the next send, to tomorrow, or to a stale Sister `invite_quota` row, and either retro-count today's unlimited sends against a new cap or start from zero (**P1**);
- treat the same account as Sister on one path and Brother on the other, because `AuthContext.gender` is optional and no module owns presentation (**P2**);
- show two different “invites left” numbers — invites' counter vs billing's entitlement read (**P3**);
- skip `BillingPort` on Sister **POST** in `free_unlimited` and still call `isEntitled` on compose, quota GET, or pack catalog (**P4**);
- snapshot `isEntitled` into today's `invite_quota` row so a mid-day pack or mode flip does not bind the next send (**P5**).

No new AD is justified: none of these restore a brother-free mode or a second writer of `invite_quota`. Close them by tightening AD-27, AD-21, AD-8, AD-18, and AD-17. Do not reopen A1–A3, name, AD-5, stack, Capacitor, AD-9, AD-10, AD-11, or AD-12.

---

## What the 2026-10-02 amendment already binds (not holes)

These attacks die. Do not spend AD budget here.

| Attack | Why it dies |
| --- | --- |
| Hardcoded unlimited Sister invites / compile-out of one mode | AD-27: both values exist and seed; not a feature-flag compile-out |
| Brothers read `sister_reach_mode` as a free pass | AD-27 Prevent + Rule; Brother caps from `operator_config` always (AD-23) |
| Sister invite **send** calls `BillingPort` in `free_unlimited` | AD-2, AD-21, AD-27 |
| Sister send in `same_quota_as_brothers` forbidden from `isEntitled` | AD-2 / AD-21 exception; AD-27 same predicate as Brothers |
| `unavailable` or missing pack blocks Sister/Brother send as a safety outage | AD-27: Free cap, not a safety block; AD-21 stale-closed cache must not disable Free |
| Billing INSERTs / UPDATEs `invite_quota` | AD-3 + AD-27: invites only; billing never writes it |
| Safety / Chat after accept call `BillingPort` | AD-2, AD-21, AD-27 |
| Quotas reset on UTC midnight | AD-23: `Africa/Ouagadougou` civil day |
| Pre-delivery Chat hold / AI send-block | AD-10 / AD-11 locked |
| Second blur path / Mahram compose / second UI / USA host | AD-9, AD-12, AD-4, AD-5 locked |

---

## Incompatibility pairs

Each pair is a hole. Suggested closure is a **tighten** of an existing AD. No new AD.

### P1 — “Subsequent invites only” does not bind cutoff, retro-count, or stale Sister quota rows

**Clash type:** conflicting state-mutation paths  
**Teams:** Operator vs Invites

**What the spine says**

- AD-27: mode change is an AD-18 event; “Applies to subsequent invites only; does not delete past invites.”
- AD-27: `invite_quota` is written only when the sender is quota-capped (Brothers always; Sisters iff `same_quota_as_brothers`).
- AD-23: daily quotas reset on the `Africa/Ouagadougou` civil day; Sister caps follow AD-27.
- AD-3: operator writes `operator_config`; invites writes `invite` and `invite_quota`.

**The fork**

- **Team Operator.** `PATCH` flips `sister_reach_mode` at 14:00 Ouaga. They write the AD-18 event. They do not DELETE `invite` rows. They expect the next Sister **send** to honor the new mode.
- **Team Invites-A (next civil day).** “Subsequent” + the AD-23 daily window means today's path is frozen. Sisters who already sent under `free_unlimited` stay uncapped until the next Ouaga midnight. They do not delete past invites.
- **Team Invites-B (next send, retro-count).** The next POST uses the new mode immediately. Flipping to `same_quota_as_brothers`, they COUNT today's already-persisted `invite` rows against `brother_invite_quota_free` / `_premium`. Counting is not deleting.
- **Team Invites-C (next send, fresh cap).** The next POST uses the new mode, but `sent_count` for the new cap starts at 0 — retro-counting would punish sends that were lawful when unlimited.
- **Team Invites-D (stale row).** After a flip to `free_unlimited`, they stop **writing** Sister `invite_quota` (not capped). They still **enforce** an existing Sister row (`used >= cap` → refuse). They did not delete the row.

Same Sister, same afternoon flip `free_unlimited` → `same_quota_as_brothers` after 8 sends, Free cap 3: Team A allows more unlimited sends until midnight; Team B refuses the next send; Team C allows 3 more. Flip the other way: Team D still blocks her on yesterday's cap row; Team C lets her send without a cap. All four obeyed “do not delete past invites,” “write `invite_quota` only when capped,” and “Brothers never get a free pass.”

**Suggested bind**

Tighten AD-27: a mode change binds the **next Sister invite send** (not the next civil day). Past `invite` rows stay. **Do not** count those already-sent invites toward a newly applied cap (subsequent-only). When the live mode is `free_unlimited`, invites must not read or enforce a Sister `invite_quota` row — ignore it; do not require a delete. Brothers are unchanged by the flip. Civil-day reset still zeros `sent_count`, not the mode.

---

### P2 — Sister vs Brother has two lawful writers; AD-27's split then forks

**Clash type:** two owners of one entity  
**Teams:** Identity vs Profiles (Invites as the consumer)

**What the spine says**

- AD-8: Sister/Brother is a Member attribute, not a role. `AuthContext` is `{ accountId, roles[], gender?, mahramWardId? }` — `gender` is optional. Downstream trusts AuthContext and does not re-parse tokens.
- AD-3: identity owns `account`; profiles owns `profile` / `profile_field`. No `gender` / `presentation` row.
- AD-27: Brothers always use the paid quota and may always call `isEntitled`. Sisters call `isEntitled` only in `same_quota_as_brothers` and are uncapped in `free_unlimited`.

**The fork**

- **Team Identity.** Presentation lives on `account`. They fill `AuthContext.gender` when they have it and leave it unset when they do not (lawful — it is optional). Invites must trust that context.
- **Team Profiles.** Sister/Brother is a `profile_field` used for discovery matching. They never write `account` or AuthContext. Invites that need a gender for AD-27 call `ProfilePort.getPresentation`.
- **Team Invites-unset-as-Brother.** `gender?` missing → treat as Brother: always write `invite_quota`, always call `BillingPort.isEntitled`.
- **Team Invites-unset-as-Sister.** Missing → treat as Sister: in `free_unlimited` skip `BillingPort` and skip `invite_quota`.

The same send is a Brother entitlement check on one build and a no-billing unlimited send on the other. Both teams obeyed AD-8 (attribute, optional gender), AD-2 (Brother path may always call `isEntitled`; Sister `free_unlimited` must not), and AD-27 (the mode is applied to whoever they believe is a Sister). Gender change mid-day repeats P1: one team follows live presentation, the other follows the `invite_quota` row created under the old side.

**Suggested bind**

Tighten AD-8 + AD-3: Identity is the only writer of presentation (`account.gender` / `account.presentation`). Profiles and invites read `IdentityPort.presentation(accountId)` only. `AuthContext.gender` is **required** on `member` sessions. Invites must not read a profile field as Sister/Brother. Presentation changes bind like P1 (next send; no retro-count).

---

### P3 — `invite_quota` write is owned; “invites remaining” is not

**Clash type:** clashing shared-data shapes  
**Teams:** Invites vs Billing

**What the spine says**

- AD-3: `invite_quota` → invites; `pack`, `payment`, `entitlement` → billing.
- AD-21: entitlements are read only through `BillingPort.isEntitled`, result `true | false | unavailable` — no remaining-int.
- AD-27: `invite_quota` is written only by invites when the sender is quota-capped; billing never writes `invite_quota`.
- Structural Seed ER: `PAYMENT ||--o| ENTITLEMENT`. No `INVITE_QUOTA` entity. Conventions require `brother_invite_quota_free` / `_premium` on `operator_config`.

**The fork**

- **Team Invites.** Remaining is `cap - sent_count` on an invites-owned row (or a stored `remaining` they decrement). Cap comes from `operator_config` + `isEntitled`. They never let billing INSERT the row.
- **Team Billing.** They never write `invite_quota` (AD-27 satisfied). `entitlement` carries `invites_remaining` or a pack-period credit. `GET /v1/billing/me` and the paywall read that number. `isEntitled` stays a boolean.
- **Team Client.** One shell paints Billing's remaining; the other paints Invites'. A Premium Brother is “12 left this pack-month” on billing and “2 left today” on invites — or the reverse after a webhook.

AD-27 closed the *write* hole. It did not close the *read* hole. Two sources of the same member-visible noun. Grain is also unbound: per account per Ouaga day vs a running remaining-int reset by a worker vs a pack-period pool on `entitlement`.

**Suggested bind**

Tighten AD-27 + AD-21: `invite_quota` grain is `{ account_id, civil_day_ouaga, sent_count }`. Cap is **not** stored as authority — it is computed at send/read from `operator_config` + the live `isEntitled` result (when that call is legal). Billing must not expose a remaining-invite integer. Member-facing remaining / `QUOTA_EXCEEDED` come only from invites.

---

### P4 — Sister **send** is bound; Sister quota-read, compose, and pack catalog are not

**Clash type:** conflicting state-mutation paths / `BillingPort` use  
**Teams:** Invites vs Billing (web inbound as the third caller)

**What the spine says**

- AD-2 / AD-21 / AD-27: Sister **invite send** may call `BillingPort.isEntitled` only when `same_quota_as_brothers`; when `free_unlimited` it must not call `BillingPort` and is not an entitlement check.
- Paid-faster-review and Brother quota may call `isEntitled` always.
- Safety and Chat after accept must not call `BillingPort`.
- No sentence names Sister **GET** quota, invite compose, or pack catalog.

**The fork**

- **Team Invites-send.** `POST /v1/invites` in `free_unlimited` does not import `BillingPort`. AD-27 satisfied.
- **Team Invites-read.** `GET /v1/invites/quota` (or compose bootstrap) calls `isEntitled` for Sisters in every mode “so the upgrade CTA has a number.” That is not send.
- **Team Billing.** Pack list and `isEntitled` are billing surfaces. Sisters can see and buy the same packs in `free_unlimited` (packs are not invite send). The compose screen shows a paywall. A Sister who buys a pack still sends unlimited (Invites-send never asked).
- **Team Billing-hidden.** They hide Sister pack SKUs unless the mode is `same_quota_as_brothers`, claiming “same packs” in AD-27 is a visibility rule. Spine never said that.

One build: Sister in `free_unlimited` never sees a cap or an invite upsell, and never hits `BillingPort` on the invite surface. The other: POST is unlimited, but GET quota and the storefront call `isEntitled` and sell her a pack that does not change send. Both obeyed the send-only sentences.

**Suggested bind**

Tighten AD-2 / AD-21 / AD-27: Sister-facing invite **read** and compose must not call `BillingPort` when `free_unlimited`, and must not present a remaining/cap or an invite-upsell. Pick one pack rule: Sisters may buy packs in `free_unlimited` only for non-invite perks (paid-faster-review), **or** Sister pack catalog is hidden unless `same_quota_as_brothers`. `isEntitled` for paid-faster-review stays a non-invite path.

---

### P5 — `isEntitled` consulted once per day vs on every send

**Clash type:** conflicting state-mutation paths  
**Teams:** Invites vs Billing

**What the spine says**

- AD-27: when `same_quota_as_brothers`, Sister send uses the same quota predicate and the same `isEntitled` result as Brothers; missing pack or `unavailable` → Free cap.
- AD-27: `invite_quota` is written when the sender is quota-capped.
- AD-14 / AD-18: payment webhook apply is the entitlement write; it is a mandatory audit event.
- No sentence says whether invites re-reads `isEntitled` on every send or snapshots it onto today's row.

**The fork**

- **Team Invites-live.** Every capped send reads mode, calls `isEntitled` (Brother always; Sister iff `same_quota`), applies Free or Premium cap, increments `sent_count`. A 15:00 pack purchase raises remaining on the next send. A mode flip binds the next send (P1).
- **Team Invites-snapshot.** First capped send of the civil day writes `invite_quota` with `cap` and `entitled` frozen. Later sends only increment `sent_count`. Billing's webhook updates `entitlement` (billing does not write `invite_quota` — legal). Today's remaining stays Free until tomorrow.

Premium Brother hits the Free cap at 14:00, pays, retries: live build allows more sends; snapshot build keeps refusing until Ouaga midnight. Same `isEntitled` result type, same writer, same “unavailable = Free cap.” The *when* of the call is the hole.

**Suggested bind**

Tighten AD-27: on every capped send, invites reads live `sister_reach_mode` and (when the call is legal) live `BillingPort.isEntitled`. `invite_quota` stores `sent_count` for the civil day only — not a frozen cap or a frozen entitled bit. Mid-day pack upgrade or loss applies to the next send. Mode flip as P1.

---

### P6 — Mode-change audit is named, not commanded

**Clash type:** two owners of one mutation path  
**Teams:** Operator vs Invites (Audit as the writer of the row)

**What the spine says**

- AD-3: `operator_config` → operator; `audit_event` → audit.
- AD-18: mandatory events include operator threshold/price/`sister_reach_mode` changes. Payload is ids + action + reason. Individual staff attribution.
- AD-27: “Mode change is an AD-18 event.”
- Conventions: `operator_config` is “Audited on change.”

**The fork**

- **Team Operator.** `PATCH` updates the key and calls `AuditPort.append` in the same command. Payload `{ from, to, staffId, reason }`.
- **Team Operator-row.** “Audited on change” is a `updated_at` + `staff_id` on `operator_config`. They never call `AuditPort`. They believe the config row *is* the audit.
- **Team Invites.** They emit the AD-18 event on the first subsequent Sister send that observes a new mode (“applies to subsequent invites”). If no Sister sends after the flip, no event. `from` is missing; timestamp is the send, not the staff click.

One operator change: zero, one, or two `audit_event` rows, with or without old value, attributed to staff or to `system`. AD-18 owns the table; it does not name the only lawful caller or the payload.

**Suggested bind**

Tighten AD-18 + AD-27: the operator config-write command is the **only** emitter of `sister_reach_mode` change. Same unit of work as the `operator_config` UPDATE. Payload `from`, `to`, `staffId`, `reason`. Invites must not emit this event. A config row timestamp is not the AD-18 event.

---

### P7 — Who may *read* `sister_reach_mode` inside `BillingPort.isEntitled`

**Clash type:** clashing shared-data shape / `BillingPort` use  
**Teams:** Billing vs Invites

**What the spine says**

- AD-27: Brothers never read `sister_reach_mode` as a free pass. Sisters use the mode to decide whether send is an entitlement check.
- AD-21: `isEntitled` returns `true | false | unavailable`.
- AD-2: modules call through published ports; operator owns the config row.
- No sentence says `isEntitled` must be mode-blind.

**The fork**

- **Team Invites.** They are the only quota-path reader of the mode. They call `isEntitled` only after the mode says the sender is capped. They expect `isEntitled` to mean “has a live pack.”
- **Team Billing-aware.** `isEntitled(accountId)` loads presentation + `sister_reach_mode`. Sister + `free_unlimited` → `true` (not a Brother free pass). Brother is pack-only. Any other module that calls the port for a Sister (P4) sees entitled.
- **Team Billing-blind.** `isEntitled` is pack presence only. Sister + `free_unlimited` + no pack → `false`. Same GET returns unentitled.

Both Billing teams obey “Brothers never read the mode as a free pass.” The Sister entitlement bit still forks every non-send caller. Defense-in-depth also forks: a buggy Sister send that calls the port in `free_unlimited` is unlimited on Billing-aware and Free-capped on Billing-blind.

**Suggested bind**

Tighten AD-21 + AD-27: `BillingPort.isEntitled` must not read `sister_reach_mode` or presentation to invent a Sister free pass. It is pack presence only (`true | false | unavailable`). Invites (and the operator UI) are the only readers of the mode for the invite path.

---

### P8 — `rl_invite_per_day` can recap “unlimited” Sisters

**Clash type:** clashing shared-data shapes  
**Teams:** Invites vs inbound API (AD-17 rate limits)

**What the spine says**

- AD-27: when `free_unlimited`, Sister invite send “is not quota-capped.”
- AD-17: rate limits on Invite (working numbers in `operator_config`).
- Conventions: required keys include both `brother_invite_quota_free` / `_premium` **and** `rl_invite_per_day`.

**The fork**

- **Team Invites.** Product cap is `invite_quota` only. In `free_unlimited` they never refuse a Sister for quota. `rl_invite_per_day` is not their entity.
- **Team API-adapter.** AD-17 requires an Invite rate limit. They apply `rl_invite_per_day` to every `POST /v1/invites`, including Sisters in `free_unlimited`. A working number of 20 (or a copy of the Brother Free cap) is a second daily cap.
- **Team Invites-merged.** They treat `rl_invite_per_day` as the quota, or they refuse to send when either knob trips. “Unlimited” is the looser of the two.

Same Sister's 21st send: 201 on one build, `QUOTA_EXCEEDED` / 429 on the other. Both teams can claim AD-27 (not *quota*-capped) and AD-17 (Invite is rate-limited). For Brothers, a `rl_invite_per_day` tighter than `brother_invite_quota_premium` silently replaces AD-27's cap.

**Suggested bind**

Tighten AD-27 + AD-17: `rl_invite_per_day` is inbound abuse control, not the product cap. It must not recreate a Sister product cap in `free_unlimited` (do not apply it to Sister send in that mode, or publish it as an ops ceiling that is not the Free/Premium numbers). `QUOTA_EXCEEDED` is emitted only by invites from `invite_quota` + `operator_config` caps.

---

### P9 — `isEntitled` arity and which packs flip the Premium cap

**Clash type:** clashing shared-data shape  
**Teams:** Billing vs Invites

**What the spine says**

- AD-21 names `BillingPort.isEntitled` and the result `true | false | unavailable`. No arguments.
- AD-27: “same packs, same daily caps”; missing pack or `unavailable` → Free cap.
- AD-14: packs are 1/3/6 months. `operator_config.pack_prices_xof` exists. No key says which SKU is “premium invite.”

**The fork**

- **Team Billing-feature.** `isEntitled(accountId, feature)` — `daily_invite` is true only for 3/6-month packs; 1-month is `false`. Paid-faster-review is a different feature bit.
- **Team Invites-any-pack.** They call `isEntitled(accountId)`. Any live pack → Premium cap (`brother_invite_quota_premium`).
- **Team Billing-boolean.** One bit for the whole pack. Faster-review and invite cap always move together.

A Sister in `same_quota_as_brothers` (or a Brother) on a 1-month pack: Premium daily cap on Invites-any-pack, Free cap on Billing-feature. Both used “the same `isEntitled` result.” The result is not the same function.

**Suggested bind**

Tighten AD-21 + AD-27: invite quota calls `isEntitled(accountId)` with no feature key. Any live pack → `true` → `brother_invite_quota_premium`. No pack or `unavailable` → `brother_invite_quota_free`. Do not invent invite-specific SKUs unless `operator_config` grows an explicit map. Paid-faster-review may share that boolean or use a separately named method — not a second invite remaining-int (P3).

---

### P10 — Live `OperatorPort` read vs cached mode

**Clash type:** conflicting state-mutation paths  
**Teams:** Operator vs Invites

**What the spine says**

- AD-2: modules call other modules only through published application ports, never tables.
- AD-3: operator owns `operator_config`.
- AD-27: the mode *is* `operator_config.sister_reach_mode`.
- No `OperatorPort.get` (or equivalent) is named. No freshness rule.

**The fork**

- **Team Operator.** They publish `OperatorPort.get(key)` and expect every send to read through it after a PATCH.
- **Team Invites-boot.** They read the mode at process start (or once per civil day into Redis) so they do not “chatty-call” operator on the send path. A 14:00 flip is invisible until restart or midnight — the P1 “next civil day” fork, now as a cache policy rather than a product reading.
- **Team Invites-table.** They SELECT `operator_config` (illegal under AD-2 if read as a foreign table — they instead copy the enum into invites' own config snapshot at deploy). Two seeds can drift.

Letter-compliant Invites never writes `operator_config`. They still apply a different mode than the operator just audited (P6) because the read is unbound.

**Suggested bind**

Tighten AD-27 + AD-2: invites reads `sister_reach_mode` through `OperatorPort.get` on every send and every Sister quota read. No process-lifetime or civil-day cache that outlives the operator write. Operator is the only publisher of that get.

---

## Additional pairs (same class; close if tightening the top set)

These do not change the verdict. They are not a reason for a new AD.

### P11 — Decline / accept vs when `invite_quota.sent_count` increments

**Teams:** Invites vs Chat. AD-23: decline creates no conversation and no resend. AD-27 talks about “invite send” and “sender.” Team Invites-send increments on INSERT `invite`. Team Invites-accept increments only when `ChatPort.openFromInvite` succeeds — pending invites are free. A Sister in `same_quota` can then open unbounded pending threads. Tighten AD-27: increment on successful send persist; never refund on decline; accept must not be the quota write.

### P12 — Paid-faster-review bundled into Sister send

**Teams:** Invites vs Moderation. AD-2 allows `isEntitled` always for paid-faster-review. A send handler that calls once for “quota + perk” in `free_unlimited` is illegal (Sister send must not call). A send handler that skips the call in `free_unlimited` also skips the perk enqueue. Tighten AD-10 / AD-21: faster-review is moderation's call after persist, never folded into invite send.

### P13 — `packages/ports` still has no publisher for `BillingPort`

**Teams:** any two port authors. Conventions say shared port types; no owner. Residual of the 2026-09-27 P11. Every tightened signature above (`isEntitled(accountId)`, `OperatorPort.get`, `IdentityPort.presentation`) will fork if two packages publish the same name. Close in conventions / AD-7: one publisher for `packages/ports`.

---

## AD gap map (holes → bind)

| Pair | Missing bind | AD action |
| --- | --- | --- |
| P1 | Mode-flip cutoff, retro-count, stale Sister `invite_quota` | Tighten AD-27 |
| P2 | Sister/Brother writer; `AuthContext.gender` optional | Tighten AD-8 + AD-3 |
| P3 | Remaining-int grain; billing must not expose a second remaining | Tighten AD-27 + AD-21 |
| P4 | Sister invite **read** / compose / pack catalog vs send | Tighten AD-2 / AD-21 / AD-27 |
| P5 | Live `isEntitled` every send vs daily snapshot | Tighten AD-27 |
| P6 | Who emits the mode-change `audit_event`, payload | Tighten AD-18 + AD-27 |
| P7 | `isEntitled` mode-blind vs Sister short-circuit | Tighten AD-21 + AD-27 |
| P8 | `rl_invite_per_day` vs “not quota-capped” | Tighten AD-27 + AD-17 |
| P9 | `isEntitled` arity; which pack is Premium cap | Tighten AD-21 + AD-27 |
| P10 | Named `OperatorPort.get`; no stale cache | Tighten AD-27 + AD-2 |
| P11–P13 | Increment-on-send; perk not folded into send; ports package | Tighten existing ADs / conventions |

**Do not add AD-28** for Sister-reach. Two teams cannot rebuild a brother-free mode, a billing writer of `invite_quota`, or a Sister-send `BillingPort` call in `free_unlimited` while obeying AD-2 / AD-21 / AD-23 / AD-27. The remaining forks are under-specified *when* / *who-reads* / *what-remaining-means* sentences on those ADs, not a missing decision.

Minimum close before feature-spine fork: **P1, P2, P3, P4, P5**. P6 and P7 are the next sentence each.

---

## Two-team sketches (executable thought experiment)

### Sketch 1 — “Operator flips to `same_quota_as_brothers` at 14:00”

- Sister has already sent 8 invites today under `free_unlimited`. Free cap is 3. No `invite_quota` row (not capped) — or Team D left a row from a previous flip (P1).
- **Operator** writes `operator_config` and maybe an `audit_event` (P6). **Invites-boot** still has `free_unlimited` in process memory (P10).
- Next POST: Team A/cached allows send #9 with no `BillingPort`. Team B calls `isEntitled` (unavailable → Free cap) and refuses (8 ≥ 3). Team C calls `isEntitled` and allows 3 more (P1, P5).
- Identity left `AuthContext.gender` unset; Profiles says Sister. Team Invites-unset-as-Brother calls `BillingPort` and writes `invite_quota` even if Operator still thinks she is in a Sister-only story (P2).
- Compose GET already called `isEntitled` this morning and showed a paywall (P4, P7). She bought a 1-month pack. Billing-feature still returns `false` for `daily_invite`; Invites-any-pack would have given Premium if they were live (P9). Snapshot invites ignore the pack until tomorrow (P5).
- Member-facing remaining: billing says pack credits; invites says 0 or unlimited (P3). `rl_invite_per_day=10` 429s her on another replica (P8).

All cited ADs remain satisfied.

### Sketch 2 — “Billing down, Brother send, Sister in `free_unlimited`”

- **Brother.** Both teams apply Free cap on `unavailable` (bound). Live team writes `invite_quota.sent_count`. Snapshot team that cannot call `isEntitled` freezes Free for the day even after billing returns — legal under today's AD-27, wrong after P5.
- **Sister `free_unlimited`.** Send does not call `BillingPort` (bound). GET quota on Team Invites-read still does (P4) and throws or paints `PAY_UNAVAILABLE` on a path AD-21 said was not an entitlement check.
- Safety / Chat after accept stay up (bound). Mahram / blur unchanged (locked).

All cited ADs remain satisfied.

---

## Reviewer note

This review does not propose stack changes, hosting changes, or edits to the spine file. It does not treat locked items as holes. Closing a pair means writing a sentence that makes one of the two builds *illegal*, not documenting both as options. If P1–P5 are closed in AD-27 / AD-21 / AD-8, a re-run of this lens should be able to verdict **pass** or **pass-with-findings** without a new AD.
