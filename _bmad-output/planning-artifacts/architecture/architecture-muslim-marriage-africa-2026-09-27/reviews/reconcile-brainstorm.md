# Input reconciliation — architecture spine vs brainstorm intent

> **Superseded 2026-10-01.** Chat moderation is passive after delivery (AD-10 amendment; PRD FR-062–068, FR-144, NFR-003). Claims in this review of pre-delivery Chat scan, hold-on-timeout, or fail-closed Chat delivery are historical. Profile Photo/bio publish-gate (FR-065), AD-9 blur, and AD-12 mahram read-delivered-only are unchanged.

**Input:** Brainstorm session `brainstorm-muslim-marriage-africa-2026-09-27`  
**Source read:** `brainstorm-intent.md` only (this review does not start other BMAD skills)  
**Compared to:** `ARCHITECTURE-SPINE.md` (initiative-altitude consistency contract). Companion `SOLUTION-DESIGN.md` is cited only to show what the spine itself does *not* lock.  
**Focus:** Does the spine contradict, silently drop, or leave unbound the brainstorm's stance, MUST process invariants, wedge, and open questions — at architecture altitude (things two modules could implement differently). Tone/palette/keepsake feel is out of scope here.  
**Method:** Extract, do not ingest. The spine was not modified.

---

## 1. Verdict

**Partial.**

The spine faithfully locks the brainstorm *wedge's technical moat*: hexagonal isolation, fail-closed pre-delivery moderation, server-side blur/reveal, sister-initiated mahram with no send-as-her, verification free of Premium, XOF mobile-money without silent renew, lite + SMS essential path, honest Mooré/Dioula ASR limits, CIL-tagged Paris hosting, and billing-outage isolation from safety.

It does **not** lock the brainstorm's *process law* — the rules that keep the product from shipping as a correctly-moderated dating app. Woman's consent before chat, honest polygamy visible before accept, and dual-confirm-only marriage counters are owned as entities (AD-3) or mis-bound to a Mahram AD. Sister-invite paths may still call `BillingPort.isEntitled` (AD-2), which can re-paywall D20 when billing is up. Those gaps are architectural, not UX.

---

## 2. What already landed (do not re-litigate)

These brainstorm bindings have a named AD, a module owner, a deferred row, or a consistency convention. They are not gaps.

| Brainstorm binding | Where it lives on the spine |
| --- | --- |
| Burkina-first; Ouaga/Bobo launch; region later | Scope line; AD-5 launch assumption 10k MAU BF; multi-region / in-country move deferred |
| French-first UI; Mooré/Dioula audio MUST; EN/AR UI LATER | Locale convention (`fr`, audio keys `mos`/`dyu`); AD-11; content owns `audio_asset`; full EN/AR UI deferred LATER |
| XOF; Orange Money BF / Moov Africa BF / Wave/Coris first; cards secondary | AD-14 `MobileMoneyPort`; no Stripe SKU lock (portable, correct) |
| Safety / sister dignity never paywalled when billing is *down* | AD-13 (verification not an entitlement); AD-21 (safety paths succeed if billing `unavailable`) |
| Pre-delivery AI on text / photo / voice / bio; fail **closed** | AD-10 state machine; AD-11 local-language hold |
| Mahram optional, sister-initiated; read-all; flag/pause/end; cannot send as her; unmatched-friend rejected; no kinship docs | AD-12 `[ADOPTED]`; D38 revoke ≤60s |
| Khalwa: no live 1:1 A/V in MVP; live video LATER | Deferred: “Live 1:1 A/V (LATER, khalwa)” |
| Haya-default media; originals never in list/grid/push; per-viewer grant + revoke | AD-9 |
| Verification free; phone OTP + liveness + ID + human review before public visibility | AD-13 |
| Contact-share is the single off-platform unlock; money-ask held even after share | AD-17 |
| Cookie consent ≠ photo reuse | AD-19 |
| Coarse geo; quartier hidden until accepted Invite | AD-19 |
| Shared-device PIN | AD-8; identity owns `pin_lock` |
| SMS essential path MUST; USSD port exists, off until cost known | AD-16; USSD deferred |
| Lite / 2G payload budgets | AD-16 |
| Web + PWA first-class; store-listed Android MUST; iOS NEXT same project | AD-4 (Capacitor, not a second UI) |
| No silent auto-renew; time-boxed 1/3/6 packs | AD-14 |
| Name TBD; shortlist Nisfuddin / Nikahsira / Sakinaa; alternates Mithaqun / Nonglem | Header + Deferred (Dannaya correctly absent — `.com` taken in brainstorm) |
| Copy keys: no dating lexicon | Consistency Conventions |
| Farata labels only: Offered (seen) / Claimed (marketing) / Not publicly evidenced | Consistency Conventions |
| Open PRD questions stay open | AD-22 |
| GIF pack, anonymous mode, Apple Sign-In as flags | Feature flags |
| Dual-control unblur, watermark polish | Deferred (D31 / D9 NEXT) |
| Product name / domains / trademarks not schema | Deferred |

**Hosting pick vs brainstorm open question.** Brainstorm left data residency open. A3 deferred the pick *to architecture*. AD-5 chooses Scaleway `fr-par`, tagged `[ASSUMPTION — legal review]`, with portable substrate (AD-6) and public FR disclosure. That is a legitimate close of the *hosting option*, not a silent rewrite of CIL as a launch gate. Not a contradiction.

**TWA vs Capacitor.** Brainstorm allowed “thin wrapper / TWA / Capacitor.” AD-4 rejects TWA-only because it cannot set `FLAG_SECURE` or reliable FCM/camera. Refinement in service of D9 deterrence and P36 Play listing. Not a contradiction.

---

## 3. Stance & constraints — bind check

Stance items the spine **does not** make un-implementable-wrong.

### 3.1 Woman's consent is first-class — unbound

Brainstorm: *“sister must explicitly accept before any chat opens; decline is quiet.”*

Spine:

- `invites` owns `invite`; `chat` owns `conversation`.
- ERD: `INVITE ||--o| CONVERSATION : opens` — no accept predicate.
- Capability map: Invites are governed by **AD-12 (Mahram)** and AD-21 (billing isolation). AD-12 is read-access for a guardian, not Invite/consent.
- No AD that a conversation row is created only after Sister accept (or she sent).

AD-3 (one writer) does not prevent `invites` from creating a chat on send, or `chat` from accepting an invite-id without a sister-accept timestamp. This is the load-bearing process invariant of the session. Companion SOLUTION-DESIGN §6 states the rule; the spine — the consistency contract — does not.

### 3.2 Honest polygamy visible before accept — absent

Brainstorm D14 (MUST): brothers declare `single / already married + wives / open to polygyny`; visible **before** a sister accepts; *never claim ID proves marital status*.

Spine: the word “polygamy” does not appear. `profiles` owns `profile` under AD-3 only. Discovery is governed by AD-16 (lite payloads). Invites have no pre-accept field-read rule. AD-13 (verification) does not forbid treating an ID badge as marital-status proof.

Two teams can ship accept-without-disclosure or “ID Verified ⇒ single.” That is a consistency hole, not a missing UX copy line.

### 3.3 Dual-confirmed marriage is the product — AD-3 only

Brainstorm north-star: chaperoned meetings + **dual-confirmed nikah**, not DAU or inflated members. D11 MUST; D12 MUST slice (consent story + showcase + counter **starting at 0**). Proof stays private; either spouse can refuse public.

Spine:

- `outcomes` owns `marriage_report`, `consent_story`, `marriage_counter`.
- Capability map: Outcomes → **AD-3 only**.
- AD-18 audits deletion/CIL/mahram/reveal/payments — not dual-confirm or counter increment.
- AD-20 observability: moderation latency, fail-closed, report SLA, webhook lag. **No** dual-confirmed nikah, chaperoned-meeting, or proof-backed public counter.

AD-3 stops a second writer. It does not stop a single writer from incrementing on one-sided report, rounding the counter, or promoting DAU on the public surface. Brainstorm: *“Publish only proof-backed counters. Never invent scale.”*

### 3.4 Sisters start conversations free (D20) vs AD-2 `isEntitled`

Brainstorm: *“Monetise brothers' reach/convenience only.”* P30: tight brother quotas; **sisters unlimited free requests.**

AD-21 correctly keeps sister-invite paths alive when billing is **down**. AD-2 says billing is unreachable from sister-invite paths **except via `BillingPort.isEntitled`**. When billing is **up**, a builder can gate Sister sends on entitlement and still satisfy both ADs. That re-opens the paywall the whole session existed to close.

AD-13 states the stronger form for verification (“is not an entitlement check”). Sister invites do not get that sentence.

### 3.5 Likeness in ads (D10) narrowed to cookies

Brainstorm: *“Never use member likeness in ads/social without explicit per-use opt-in.”*

AD-19: *“Cookie consent never grants photo reuse.”* Necessary, not sufficient. Campaign/social reuse can still be implemented as a content job without a per-use grant entity. No owner for a `likeness_grant` (or equivalent) appears in the entity table.

### 3.6 Stance items that are fine as-is

Wali as process actor (flag/pause/end) is AD-12. “Propose meeting” and “attest nikah” are D3 / D11 horizons (NEXT / outcomes), not silent drops. Boosts-cannot-bypass-safety is D37 NEXT; not required as an MVP AD. Ranking preference (verified + complete + wali-ready) is the same NEXT cluster.

---

## 4. MVP MUST cluster vs spine

Brainstorm § “MVP MUST (BF launch)” one-liner, mapped at architecture altitude.

| MUST cluster | Spine lock | Gap? |
| --- | --- | --- |
| Accountable identity | identity; AD-8, AD-17 | No |
| Haya-safe profiles | media AD-9; profiles AD-3 | Polygamy/honesty fields not in the contract (see 3.2) |
| Invite / accept / decline | invites module; **no consent AD** | **Yes** (3.1) |
| Wali-optional chat | mahram AD-12; chat AD-15/AD-10 | No for D1/D38 |
| Pre-delivery moderation all media | AD-10, AD-11 | No |
| BF payments + lite + FR/audio | AD-14, AD-16, AD-11 | No |
| Sisters-free safety | AD-13, AD-21; hole in AD-2 (3.4) | **Yes** (invite entitlement) |
| Honest polygamy | — | **Yes** |
| Working delete + export + CIL ticket | AD-19 clocks `[ASSUMPTION]`; operator owns `cil_ticket`; audit on deletion completions | Partial — no port/rule that delete/export is owner-only and ticketed (D15). Retention is assumed, not a delete state machine |
| Dual-confirmed marriage close + honest counter at 0 | outcomes / AD-3 | **Yes** (3.3) |
| Web + PWA + store Android | AD-4 | No |
| Proof-not-hype landing (Ouaga/Bobo/BF) | content + AD-22 | Soft — SEO pages are content, not a consistency risk if copy keys stay lexicon-clean |

---

## 5. Differentiator coverage (architecture altitude)

Intent required D1–D40 listed in brief/PRD. The spine inherits PRD silently and does not re-list P/D IDs. That is acceptable **if** every MUST differentiator that two modules could split has an AD. Below: MUST rows only, plus NEXT rows that need a disabled port/flag so they cannot ship by accident.

### 5.1 MUST — locked

| ID | Spine lock |
| --- | --- |
| D1 Mahram-in-chat | AD-12 |
| D4 All-modality pre-delivery | AD-10, AD-11 |
| D5 Scam / off-platform | AD-17 contact-share + money-ask |
| D6 / D7 Report → strike → ban + appeal | trust owner; AD-10; AD-18 |
| D8 Per-viewer reveal + revoke | AD-9 (policy enum lives in companion, not spine — acceptable if media is sole writer) |
| D13 Verification free, leveled | AD-13 |
| D16 No dark-pattern renew | AD-14 |
| D17 CIL + BF rails + XOF | AD-5, AD-14, AD-19 |
| D18 FR + audio; honest ASR | AD-11 + locale convention |
| D19 Lite | AD-16 |
| D27 SMS; USSD flagged off | AD-16 |
| D28 PIN | AD-8 |
| D32 Fail-closed | AD-10 |
| D38 Sister remove/report wali | AD-12 |
| D39 Suspected-minor hold | AD-13 |
| D40 Pictogram + audio photo rules | content + AD-11/AD-22 (copy/audio, not a second media pipeline) |

### 5.2 MUST — unbound or thin

| ID | Problem |
| --- | --- |
| **D11** Dual-confirm close + private proof | Entity owner only. No increment/proof/joint-state rule |
| **D12** Consent story + counter at 0 | Same. Public counter can be a content hard-code |
| **D14** Polygamy honesty | Not in the spine |
| **D20** Sisters free; safety free | Safety-down is AD-21; Sister *send* can still hit `isEntitled` (AD-2) |
| **D10** Likeness opt-in | Cookie sentence only |
| **D15** Delete + export + status + ticketing | Audit + CIL ticket + assumed clocks; no delete/export port or owner-only rule |
| **D24** Stages invite/chat/meeting/married | `taaruf_stage` owned by chat; AD-15 emits `stage.changed`; enum not cited. PRD already dropped brainstorm's fifth “family-intro” stage — spine should not invent it back, but should cite the locked four so a second enum does not appear |

### 5.3 NEXT — need a stay-off latch

Brainstorm: nothing in P1–P59 / D-list may be silently dropped; deferred items stay marked. Spine feature flags: `gif_picker`, `ussd`, `anonymous_mode`, `ios_apple_signin`, extra payment methods.

Missing off-latches that discovery/chat/billing could ship as “obvious MVP”:

| Item | Horizon | Spine |
| --- | --- | --- |
| P22 who-favourited-me | NEXT | `favourite` owned; no flag. Member-facing “who favourited” can ship |
| P23 member-facing visitors | NEXT (internal T&S MUST) | `profile_visit` owned; no “internal-only” rule |
| P24 online-now | NEXT | No flag |
| P25 / D37 boosts | NEXT | No flag; AD-21 does not mention boost bypass |
| P32 AI Ice Breakers | NEXT (templates MUST) | No flag; templates have no module mention |
| D9 watermark / no-download | NEXT | Deferred row — OK |
| D31 dual-control unblur | NEXT | Deferred row — OK |
| D36 anonymous mode | NEXT | Flag present — OK |

P22/P23 are the ones that matter: the entities exist for MUST (private list; T&S visit patterns). Without a rule, the NEXT vanity surface is the default read model.

---

## 6. P-list architectural notes (not a full P1–P59 audit)

Parity IDs belong in brief/PRD. The spine only needs to stop a second *implementation shape*. Residual risks:

- **P8** paid-faster review, not a rubber stamp — no AD that a billing perk cannot skip human review. AD-13 keeps verification free; it does not say paid queue ≠ auto-allow.
- **P30** brother quotas from `operator_config` is implied by the config convention; sister-unlimited is not.
- **P44** entertainment-seeking + fingerprint — trust owns `fingerprint`; no AD text.
- **P50/P52** Académie seed + Ouaga/Bobo/BF pages — content + AD-22. Fine.
- **P55–P59** pricing honesty / CGV — AD-14 + AD-22 (prices in `operator_config`). Fine.

---

## 7. Open questions — silent-close check

| Brainstorm open question | Spine behaviour | OK? |
| --- | --- | --- |
| Age 19+ vs 18+ | Not a schema enum; A1 inherited, not rewritten | Yes |
| Native-speaker Nikahsira / Nonglem | Branding tokens, not schema; Deferred name | Yes |
| Wali documents / acceptable mahram if father deceased | AD-12 enum + no kinship docs (A2). Does not invent papers | Yes |
| Polygamy UX / first-wife awareness | AD-22 + companion policy table. Spine itself never names the question | Partial — flexibility exists only if builders read the companion / AD-22 list |
| Data residency / CIL | AD-5 pick + launch-gate filing; A3 text not rewritten | Yes (see §2) |
| Fail-closed UX tolerance | State machine stays `hold`; SLA in `operator_config` | Yes |
| USSD/SMS operator cost | `UssdPort` disabled | Yes |
| OAPI / handles | Deferred; not schema | Yes |
| Imam names / Académie SLA | AD-22 / content tables | Yes |
| P8 free-review hours | `operator_config` | Yes |
| Anonymous-mode rules | Flag `anonymous_mode` | Yes |
| Brother clear photo before accept if he opted out | Not on the spine (companion config). Media/reveal policy could bake “always yes” | Soft |
| Zero-GIF launch | `gif_picker` flag | Yes |
| Free Money / MTN later countries | Extra payment methods flag; AD-14 aggregator | Yes |

No brainstorm open question is closed as a hard enum on the spine except the hosting *option* (explicitly architecture's job, still legally assumed).

---

## 8. Source / inheritance process

Spine `sources:` PRD, addendum, brief, `docs/system-idea.md`, `docs/competitor-farata.md`, `docs/name-options.md`.

Architecture memlog lists **brainstorm-intent** as a driving input. The published spine does not cite it. Inheritance via PRD is the intended path (“Inherit PRD silently”). The unbound items in §3 are exactly the stance lines that flatten into FRs in the PRD and then into **entity ownership** on the spine — the qualitative-to-mechanical loss the PRD reconcile already warned about, now one altitude lower.

This is not a missing file; it is why D14/D11/consent have FRs and still have no AD.

---

## 9. Findings for the parent

Ranked. Architecture-altitude only. This review does not patch the spine.

1. **Sister-consent-before-chat is not an invariant.** Brainstorm stance + D24/P28. Capability map binds Invites to AD-12 (wrong AD) and AD-21. ERD opens `CONVERSATION` from `INVITE` with no accept gate. **Fix (if accepted):** a short AD — Chat exists only after Sister consent (she accepted or she sent); decline creates no conversation; Mahram is attached to that conversation, not a browse session.

2. **AD-2 lets sister-invite call `BillingPort.isEntitled`.** Conflicts with D20 / “monetise brothers only.” AD-21 covers outage, not entitlement. **Fix:** same wording as AD-13 — sister-invite, blur, mahram, report, block, verification are not entitlement checks.

3. **D11/D12 / north-star have no governing AD.** Outcomes → AD-3. Counter can increment on one confirm; public surfaces can invent scale; AD-20 does not observe dual-confirmed nikah. **Fix:** one outcomes AD — increment only on dual confirm; proof never public; counter starts at 0; no “+” rounding; proof-backed public metrics only.

4. **D14 polygamy honesty is missing from the spine.** No pre-accept read rule for marital status + polygamy intent; no ban on “ID ⇒ marital status.” **Fix:** bind profiles + invites — those fields are readable on the Invite decision surface; verification badges must not imply marital status.

5. **NEXT vanity and D10/D15 are latch-thin.** `favourite` / `profile_visit` have no internal-only / flag-off rule (P22/P23). D10 is cookie-only. D15 has no delete/export port. Secondary to 1–4; still how a “correct” monolith ships Farata-shaped social proof.

---

## 10. What this review is not

Not a request to start UX, spec, epics, or another BMAD skill. Not a SOLUTION-DESIGN review (companion already records several of these rules in §6 — they are not spine invariants until they are ADs). Not a re-opening of A1–A3 or the Scaleway pick.

---

## Document control

- **Reconcile type:** input (brainstorm-intent → ARCHITECTURE-SPINE)
- **Date:** 2026-09-27
- **Does not modify** `ARCHITECTURE-SPINE.md` or `SOLUTION-DESIGN.md`
- **Does not start** other BMAD skills
