# Security / privacy / compliance review — 2026-10-02 sister reach + BillingPort

**Artifact:** `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md` (updated 2026-10-02)  
**Lens:** security / privacy / compliance — billing isolation from safety, `sister_reach_mode` authz, AD-18 completeness, payment-subject expansion  
**Attack:** can a builder put `BillingPort` on a safety path “because sisters now pay”? Can billing-unavailable block verification? Can a non-operator flip the mode? Can audit omit the mode change?  
**Sources read:** the pair above; PRD FR-044, FR-045, FR-104, FR-105, FR-139, FR-145, NFR-004, NFR-009; prior `reviews/review-security-privacy-2026-10-01.md` (Chat correction; not re-litigated)  
**Binding 2026-10-02 (not reopened):** AD-5 data residency; AD-10 / AD-11 passive Chat; AD-9 blur product; AD-12 mahram product. Sister invite send may call `BillingPort.isEntitled` **only** when `operator_config.sister_reach_mode` is `same_quota_as_brothers`. Safety paths (verification, blur/reveal, mahram, report, block) and Chat after accept must not call `BillingPort` in either mode. Billing down must not block those. Mode change is an AD-18 event. `PATCH` of `sister_reach_mode` is staff-routed (`/v1/staff/config`).  
**Spine / companion:** not modified by this review  
**Verdict:** pass-with-findings  
**Date:** 2026-10-02

This is not legal advice and not a CIL filing. It judges whether two feature teams that obey the written ADs can still produce the four attack outcomes after the 2026-10-02 AD-2 / AD-21 / AD-27 / AD-18 amendment.

---

## Verdict in one paragraph

The 2026-10-02 pair **names** the four attacks and closes them on the happy path: AD-2 / AD-21 / AD-27 repeat that verification, blur/reveal, mahram, report, block, and Chat after accept must not import or call `BillingPort` (including `isEntitled`) in either `sister_reach_mode`, and must succeed when billing is down, `unavailable`, or the caller has no pack. Sister invite **send** is the only new entitlement read, and only in `same_quota_as_brothers`; `unavailable` there is the Free cap, not a safety block. Companion §7 says `PATCH /v1/staff/config` with `sister_reach_mode` is operator-only and an AD-18 event named `operator sister_reach_mode change`. That is not yet enough against the attack. A builder can put `isEntitled` on invite **accept** / `ChatPort.openFromInvite` (not in the send-only exception, not in the chat module). Paid-faster-review is explicitly allowed to call `BillingPort` and shares the human-review queue that writes `ProfilePort.setVisibility` — `unavailable` or a throw can hold verification’s public outcome without the verification module importing the port. `AuthContext` can smuggle an `entitled` bit so safety handlers “never call `BillingPort`” and still branch on pay. The spine binds `PATCH` to `/v1/staff/*` and `session.kind=staff`, not to the `operator` role — a moderator, a `system` worker, an env override, or a SQL `UPDATE` of `operator_config` can flip the mode. AD-18 lists the event but does not bind the config write and the audit insert as one transaction, nor require old/new values in `payload`. Those are lawful readings of the current seams, not rogue deviations. Closable without a new paradigm. Until they are closed, **pass-with-findings**, not launch-cleared.

---

## What holds (do not re-litigate)

Closed by the 2026-10-02 pair relative to the absolute “Sister invite send never calls `BillingPort`” reading (now annotated superseded in `reviews/review-security-privacy.md`). Do not reopen as if the old text were still live. Do not reopen AD-5, AD-9, AD-10, AD-11, or AD-12.

| Topic | Why it holds now |
| --- | --- |
| Named safety list | AD-2, AD-21, AD-27, AD-13, SD §3 / §11: verification, blur/reveal, mahram, report, block, Chat after accept are not entitlement checks in **either** mode. They must not import or call `BillingPort` / `isEntitled`. |
| Sister send exception | Narrow: `POST /v1/invites` (send) may call `isEntitled` **only** when `sister_reach_mode` is `same_quota_as_brothers`. `free_unlimited` send must not call. Brothers always call; they never read the mode as a free pass. |
| Unavailable on send | AD-27 / SD §7: missing pack or `isEntitled=unavailable` → Free cap, `QUOTA_EXCEEDED` with reset — not `PAY_UNAVAILABLE` as a safety kill, not a verification/chat block. |
| `isEntitled` shape | `true \| false \| unavailable`; must not throw into a **safety** handler (AD-21). Stale-closed cache must not disable Free/safety. |
| Quota writer | `invite_quota` written only by invites, and only when the sender is capped (Brothers always; Sisters iff `same_quota`). Billing never writes that row. |
| Mode enum | Both values seeded day one; not a compile-out flag. No brother-free field. Subsequent invites only; past invites not deleted. |
| Companion role sentence | SD §6 “Operator is the only writer” of `operator_config`; SD §7 “PATCH … `sister_reach_mode` is operator-only.” |
| Audit *intention* | AD-18 mandatory set now includes operator `sister_reach_mode` changes. SD §7 names the action `operator sister_reach_mode change`. Individual staff attribution. Tamper-evident (not WORM) unchanged. |
| Payment rails | AD-14 / AD-7: no silent auto-renew; hosted checkout; webhook signature + 600s + `Idempotency-Key`. Sisters buy the same packs only in `same_quota` (SD §11). |
| Locked surfaces | AD-5 hosting/CIL transfer honesty; AD-9 blur/gateway; AD-10/AD-11 passive Chat; AD-12 mahram product — not reopened. Prior SEC-1 transferable tokens / Mahram-remove denylist remain unapplied and out of this update’s scope. |

---

## Attack result

| Attack outcome | Closed if both teams obey the named Rule sentences | Still possible while obeying the written ADs |
| --- | --- | --- |
| `BillingPort` on a named safety handler (verify / blur / mahram / report / block / chat persist) | **No** — that is a Rule violation of AD-2 / AD-21 / AD-27 / AD-13 | **Yes** — invite **accept** / `openFromInvite` (SEC-1); paid-faster-review on the shared review queue (SEC-2); `AuthContext.entitled` or a global Nest guard (SEC-3); browse / identity decoration (SEC-5) |
| Billing-unavailable blocks verification | **No** on `POST /v1/verifications/*` if that module never calls the port | **Yes** — review-queue `unavailable` pauses `setVisibility` (SEC-2); process bootstrap / `BillingModule` init throw (SEC-2); smuggled entitlement flag (SEC-3) |
| Non-operator flips `sister_reach_mode` | **No** if SD §7 “operator-only” is treated as spine law | **Yes** — spine binds `/v1/staff/*` + `session.kind=staff`, not `roles ∋ operator` (SEC-4); SQL / env / seed / `system` worker (SEC-4) |
| Audit omits the mode change | **No** on the HTTP PATCH happy path if AD-18 mandatory set is implemented | **Yes** — write and audit not one transaction; `payload` need not carry old/new; non-HTTP writes emit nothing (SEC-6) |

The named safety handlers cannot *accidentally* call `BillingPort` if the team reads AD-2 + AD-21 + AD-27. The failures are **adjacent commands, shared queues, and staff-kind vs operator-role**.

---

## Judgement by requested attack

### 1. Can a builder put `BillingPort` on a safety path “because sisters now pay”?

**Fail as a complete ban. Pass on the six named handlers.**

AD-2 Prevents even records the old absolute Sister-send ban as the thing *not* to do. The Rule then lists identity, verification, media, moderation, mahram, report, block, and Chat-after-accept as must-not-import / must-not-call, including `isEntitled`, in either mode. A verification or report handler that injects `BillingPort` because “Sisters are now a billing persona” is a Rule break, not a gap.

Lawful placements that still paywall safety or Chat:

1. **Invite accept is not “invite send”.** The exception is send-only. `POST /v1/invites/:id/accept` and `ChatPort.openFromInvite` live in invites / the AD-23 command, not in the chat persist path AD-21 names. A builder can require `isEntitled` before opening the conversation “so a same-quota Sister who hit the cap cannot start Chat.” Billing `unavailable` or a throw then prevents Chat after accept without the chat module importing the port. FR-105’s free Chat-after-accept is lost at the gate, not in the handler.

2. **Paid-faster-review is an explicit `BillingPort` licence** (AD-2, AD-21) on the same human-review path that AD-13 uses for `ProfilePort.setVisibility` after OTP + liveness + ID. The perk is allowed to call `isEntitled` *always*. If that call sits in verification, operator, or a shared queue worker, the module can claim it is not “the verification path” while visibility never goes live when billing is down.

3. **Capability map under-cites AD-21.** Verification is mapped to AD-13 only; media to AD-9; mahram to AD-12 / AD-23; trust to AD-10 / AD-18 / AD-17; chat to AD-15 / AD-10 / AD-23. A team that implements from the map + AD-27’s “sisters may pay” sentence will not see the isolation Rule unless they read AD-2 / AD-21. This is how “because sisters now pay” becomes the local default.

4. **Shared `assertCanSendInvite()`** used from mahram invite-by-phone (AD-16 rate-limits that verb) or from Flash. Mahram must not call `BillingPort` (AD-2). A packages-level helper that always calls `isEntitled` when `sister_reach_mode === same_quota_as_brothers` will sit on the mahram path without anyone editing `modules/mahram`.

Do not treat browse as a named safety path in this attack — but FR-104 requires Sister browse without payment in both modes, and browse is **not** in the AD-21 list (SEC-5).

### 2. Can billing-unavailable block verification?

**Fail as process-and-queue isolation. Pass as a direct handler import.**

`VerificationPort` (AD-13) is free and is not an entitlement check. AD-21 says verification must succeed when billing is down, `unavailable`, or no pack, and must not call `BillingPort`. `isEntitled` must not throw **into a safety handler**. Those sentences stop `POST /v1/verifications/otp|liveness|id` from awaiting the aggregator.

They do not stop:

- **Queue coupling (SEC-2).** Public visibility is not the OTP 200; it is `ProfilePort.setVisibility` after human review. Paid-faster-review may call `isEntitled`. `unavailable` or throw treated as “do not dequeue” / “do not apply visibility” leaves the Member verified-in-record and invisible. That is a verification product failure caused by billing, while the verification module stayed clean.

- **Bootstrap coupling (SEC-2).** AD-1 is one image; billing adapters load in the same Nest process. AD-21’s mermaid (`pay -.->|must not block| app`) and AD-14 (“Billing down → Free + safety stay up”) do not require lazy / optional `BillingModule`, a circuit breaker, or a boot that survives missing payment credentials. An init throw takes `/v1/verifications/*` with it. No handler called `BillingPort`.

- **Flag smuggling (SEC-3).** Conventions fix `AuthContext` as `{ accountId, roles[], gender?, mahramWardId? }`. They do not forbid an inbound adapter from attaching `entitled` (or `packs[]`) after a single `isEntitled` at session mint. Downstream “trusts AuthContext, does not re-parse tokens.” A verification or report handler that reads `ctx.entitled === false` never imported `BillingPort`. Stale-closed on that bit disables safety.

`isEntitled=unavailable` on Sister **send** → Free cap is specified and is not this attack.

### 3. Can a non-operator flip the mode?

**Yes, while obeying the spine.**

The update’s HTTP surface is `/v1/staff/config` (`GET`/`PATCH`; `PATCH` may set `sister_reach_mode`). AD-8 staff accounts use `session.kind=staff` and cover **moderator and operator**. Rate limits on `/v1/staff/*` are staff-wide. AD-27 says the key lives on `operator_config` and that a mode change is an AD-18 event. It does not say `AuthContext.roles` must include `operator`. AD-3 “operator module is the only writer” is **module** ownership, not **role** ownership — a moderator adapter that calls `OperatorPort.setConfig` still has one writer.

Companion SD §6 / §7 and PRD FR-139 / FR-145 say operator-only / non-Operator rejected. That sentence is not in any AD Rule. Two teams: operator module implements `kind=staff` (matches AD-8 + `/v1/staff/*`); companion reviewer expects `roles ∋ operator`. The first team ships a **moderator mode flip**.

Other writers the ADs do not forbid:

- `system` worker/service account calling the same port (AD-8: `system` must not mint reveal URLs — it is not forbidden from writing config).
- Env / compile-time override of `sister_reach_mode` (AD-27 forbids compiling *out* a value; it does not forbid an env that *overrides* `operator_config` and bypasses PATCH + audit).
- Prod SQL `UPDATE operator_config` (AD-17 locks contact `COPY`/`SELECT`, not this table). Application audit never sees it.

Member self-service cannot reach the key. That half of the attack is closed.

Impact of a silent flip: `free_unlimited` → `same_quota_as_brothers` instantly caps every subsequent Sister send (dignity / FR-105 adjacent). The reverse opens unbounded Sister reach (spam / FR-044 abuse). This is why the role bind is load-bearing.

### 4. Can audit omit the mode change?

**Yes, except on a careful HTTP PATCH implementation.**

AD-18 adds `sister_reach_mode` to the mandatory list. SD §7 names `operator sister_reach_mode change`. Conventions say `operator_config` is “Audited on change.”

Omit paths that still compile:

1. **Not one transaction.** Config `UPDATE` can commit; `audit_event` insert can fail or be fire-and-forget. The chain-verify job only checks hashes of rows that exist. There is no rule that a failed audit insert rolls back the mode write (or that an outbox is required).

2. **Payload too thin.** `payload` is “ids + action + reason.” A generic `operator_config.updated` with no key name and no old/new value satisfies “a change was audited” and fails FR-145’s “written to the audit log” as a *reconstructable mode change*. `sister_reach_mode` is not an id.

3. **Non-HTTP writes** (seed after day one, migration, SQL, env override) are not PATCH and are not required to emit the named event.

4. **Combined PATCH.** One body sets `pack_prices_xof` and `sister_reach_mode`. A single `operator threshold/price change` event can be argued as the AD-18 bucket. The mode flip is then not queryable as `operator sister_reach_mode change`.

Idempotent same-value PATCH need not emit. Seed of the default on day one need not emit. Those are not omits.

---

## Other in-scope residuals (not the four attacks)

- **Browse / discovery** (FR-104) must work without payment in both modes and is absent from the AD-21 isolation list. A “sisters now pay” guard on `/v1/browse` is a dignity paywall, not a named safety-handler import (SEC-5).
- **Sisters as payment subjects** when the mode is `same_quota`: MSISDN and webhook destinataires already sit in SD §5.3. Do not reopen AD-5. Residual: no Member notice that a mode flip starts financial processing for Sisters. Counsel maps purpose; architecture should not invent an article.
- **Client global lock:** a web shell that treats `PAY_UNAVAILABLE` or quota 5xx as “disable Report / Verify / Chat” can recreate the attack in the UI. AD-7 already has `PAY_UNAVAILABLE`; EXPERIENCE.md says it must not disable those surfaces. Not a new AD — test it.
- **Gender change** (operator+audit in SD §6, not an AD-18 mandatory name) plus `free_unlimited` is a Brother-quota bypass. Adjacent, not this update’s Rule.
- **No dual-control** on the flip (one operator, one PATCH). Accepted residual; D31 dual-control is Deferred for unblur only.

---

## Findings (triaged)

### High — invite accept / `openFromInvite` can call `BillingPort` (SEC-1)

The send-only exception and the Chat-after-accept ban leave a hole at the command that *creates* Chat. Invites can call `isEntitled` on `POST /v1/invites/:id/accept` or before `ChatPort.openFromInvite` “because sisters now pay for reach.” `unavailable` or a throw blocks Chat after accept. The chat module stays clean.

- **Attack:** `BillingPort` on a safety-adjacent path; billing-unavailable blocks Chat.
- **Suggested action:** State that invite accept, decline, and `ChatPort.openFromInvite` must not call `BillingPort` in either mode. The only Sister entitlement read is invite **send** (and `GET /v1/invites/quota`) when `same_quota_as_brothers`. Cite AD-21 on the chat + invites capability-map rows.

### High — paid-faster-review / process boot can block verification (SEC-2)

`isEntitled` is allowed on paid-faster-review. That perk shares the human-review queue that writes `ProfilePort.setVisibility` (AD-13). Treating `unavailable` or a throw as “stop the queue” holds public visibility while OTP/liveness/ID already succeeded. Separately, a required `BillingModule` init throw (same AD-1 image) takes `/v1/verifications/*` down without any safety handler calling the port.

- **Attack:** billing-unavailable blocks verification.
- **Suggested action:** Paid-faster-review may read `isEntitled` only to reorder; `unavailable` / throw / stale-closed ⇒ Free position, never skip, hold, or fail `setVisibility` or any verification command. `BillingModule` must be lazy/optional; missing credentials or adapter 5xx must not fail `api`/`worker` boot or safety routes. Verification, media, mahram, trust, chat modules must not import the billing Nest module.

### High — entitlement smuggling via `AuthContext` or a global guard (SEC-3)

A session mint or Nest interceptor can call `isEntitled` once and attach `entitled` (or put a billing guard on a parent `/v1` group). Safety handlers then branch on pay without importing `BillingPort`, citing “sisters now pay.”

- **Attack:** `BillingPort` on every safety path in effect; unavailable at login disables Verify / Report / Block / Chat.
- **Suggested action:** `AuthContext` stays `{ accountId, roles[], gender?, mahramWardId? }` — no entitlement bit. No global billing guard. Only Brother invite send, Sister invite send when `same_quota_as_brothers`, paid-faster-review reorder, and payment HTTP may call `BillingPort`. Safety routes must not read entitlement from context, headers, or a shared helper.

### High — non-operator can flip `sister_reach_mode` (SEC-4)

Spine: `/v1/staff/config` + `session.kind=staff` + AD-3 module ownership. Companion: operator-only. Moderator, `system`, env override, or SQL `UPDATE` can change the key. Member path is closed.

- **Attack:** non-operator (or non-HTTP) mode flip; silent paywall or silent unlimited reach.
- **Suggested action:** PATCH of `sister_reach_mode` requires `roles ∋ operator` (not merely `kind=staff`). Moderator `FORBIDDEN`. `system` must not write this key. No env/compile override of `operator_config.sister_reach_mode`. Prod SQL roles cannot `UPDATE` that key except through the operator command. Bind this in AD-8 or AD-27, not only SD §7.

### Medium — audit can omit the mode change (SEC-6)

Mandatory event is named. Write and audit are not atomic. `payload` need not include key + old + new. SQL / env / late seed emit nothing. A combined “config changed” event can hide the flip.

- **Attack:** audit omits (or un-reconstructs) the mode change.
- **Suggested action:** Config write and `audit_event` insert are one transaction (or outbox; failed audit ⇒ failed PATCH). Action must be `operator sister_reach_mode change`. Payload must include `from`, `to`, `actor_id`. Non-HTTP writes of this key are forbidden or must emit the same event.

### Medium — isolation list and capability map omit browse and under-cite AD-21 (SEC-5)

FR-104: Sister browse is free in both modes. AD-21’s list does not include discovery. Capability map omits AD-21 on verification, media, mahram, trust, chat. Shared invite helpers can pull `BillingPort` onto mahram.

- **Suggested action:** Add discovery/browse to the “must not call `BillingPort`” list (or cite FR-104 on AD-21). Capability-map those safety rows to AD-21. Invite entitlement helper lives in invites only.

---

## Topic scorecard

| Topic | Score | Note |
| --- | --- | --- |
| Named safety handlers vs `BillingPort` | pass-on-handler | AD-2 / AD-21 / AD-27 / AD-13 lock the six; accept / queue / context smuggle (SEC-1–3) |
| Billing-unavailable vs verification | fail-on-queue-and-boot | Direct OTP path holds; review-queue + process init do not |
| Mode-flip authz | fail-on-spine | Companion operator-only; spine is staff-kind (SEC-4) |
| Mode-flip audit | pass-on-intention | Mandatory name exists; atomicity + old/new + non-HTTP (SEC-6) |
| Sister send exception | pass | Narrow; `unavailable` → Free cap; billing does not write `invite_quota` |
| CIL / payment-subject expansion | residual | Do not reopen AD-5; destinataires already include mobile-money |
| Locked ADs (5, 9, 10, 11, 12) | not scored | Out of scope |

---

## What this review is not

Not a penetration test. Not a CIL filing pack. Not a rewrite of A1–A3. Not a reopen of AD-5, AD-9 blur, AD-10/AD-11 passive Chat, or AD-12 mahram product. Not a request to start another BMAD skill. The spine and companion were not edited. Findings from `reviews/review-security-privacy-2026-10-01.md` that this update did not touch are not restated as open.

---

## Top findings (parent return)

1. **High — SEC-1:** Invite accept / `ChatPort.openFromInvite` can call `BillingPort`; billing-unavailable then blocks Chat after accept.  
2. **High — SEC-2:** Paid-faster-review and billing-module boot can hold or take down verification without the verification handler importing `BillingPort`.  
3. **High — SEC-3:** `AuthContext.entitled` or a global guard puts pay on every safety path while handlers “never call `BillingPort`.”  
4. **High — SEC-4:** Spine allows any `session.kind=staff` (or SQL/env/`system`) to flip `sister_reach_mode`; operator-only lives only in the companion.  
5. **Medium — SEC-6:** Mode-change audit can be omitted or emptied (no atomic write, no old/new payload, non-HTTP writes).
