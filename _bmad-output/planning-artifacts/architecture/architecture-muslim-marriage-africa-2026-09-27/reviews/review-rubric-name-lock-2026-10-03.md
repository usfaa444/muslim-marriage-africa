# Rubric-walker review — Architecture Spine (naming lock)

- **Artifact:** `ARCHITECTURE-SPINE.md` (frontmatter, title, lock paragraph, AD-22, Deferred) and companion `SOLUTION-DESIGN.md` (frontmatter `open_questions`, lock paragraph, §5.3 controller, §15 Q9/Q10, §17 only)
- **Driving constraint:** NAMING-ONLY. Locked 2026-10-03 by Maitchibi Fayçal via Harris: product name is **AnKanu**; domain **ankanu.com** purchased on Hostinger; repository slug `muslim-marriage-africa` is not the product name. No new AD. Do not treat AD-10, AD-11, AD-12, AD-27, AD-28, AD-29, or entity catalog §6 as holes. Do not propose AD-30 or product-rule changes. OAPI/WIPO for AnKanu is **not** completed — keep it open. Shortlist names (Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, `nisfdin`) may appear only as search history, not as a live shortlist or as purchased domains.
- **Altitude:** initiative / build-substrate
- **Reviewed:** 2026-10-03
- **Reviewer:** rubric-walker (good-spine; naming lock only)
- **Verdict:** **pass-with-residual**

This run judges whether the naming lock stops two implementers from shipping a different product name, treating the repo slug as the product, treating the search shortlist as live or purchased, closing OAPI/WIPO, or minting AD-30. It does **not** re-judge product rules, the entity catalog, or the stack.

The lock landed. Spine and companion both name **AnKanu**, record **ankanu.com** on Hostinger, distinguish the repo slug, mark the shortlist as search history with those domains not purchased, and keep OAPI/WIPO plus social handles open. No AD-30. Residual: companion §15’s lead sentence still says PRD questions 1 and 3–11 stay open, which re-includes resolved Q9.

---

## Checklist

| Gate | Result | Notes |
| --- | --- | --- |
| Fixes real naming divergences for the level below; misses none | **PASS WITH CAVEAT** | Product name, purchased domain, repo-slug ≠ product, shortlist = history (not purchased), branding = tokens/config not schema — locked on the spine. Caveat: companion §15 lead still lists Q9 among open questions (M1). |
| Every AD Rule is enforceable and prevents its stated divergence | **PASS** | No new AD. AD-22 Rule closes Q9 with AnKanu + ankanu.com and keeps Q10 open for OAPI/WIPO/handles of AnKanu; shortlist-domain purchase is closed. Binds dropped Q9 (`1, 3–8, and 10–11`). Name is not an AD and does not rewrite other Rules. |
| Nothing under Deferred could let two units diverge | **PASS** | Deferred names trademarks/handles for **AnKanu** as branding tokens, not schema; OAPI/WIPO not recorded as completed; product name + domain locked 2026-10-03 (not an AD). iOS, USSD, vendor SKUs, PG 18, prices unchanged. No Deferred item reopens a live shortlist or treats the repo slug as the product. |
| Named tech is verified-current | **PASS (LOCKED)** | Stack was **not** changed this update. Pins remain the 2026-09-27 table. Do not demand pin bumps. |
| Greenfield is coherent (no brownfield to ratify) | **PASS** | No legacy product name or production brand to inherit. Farata is evidence, not substrate. Hostinger is the purchase venue for the domain, not a rewrite of AD-5. |
| Covers the naming lock (PRD Q9 / Q10) | **PASS WITH CAVEAT** | Q9 resolved 2026-10-03 on AD-22 and in §15’s Q9 row. Q10 stays open for AnKanu. Frontmatter `open_questions` dropped the name-check and kept `oapi-wipo-handles`. Caveat: §15 lead sentence was not updated with AD-22 Binds (M1). |
| Locked ADs not reopened; no AD-30; no product-rule changes | **PASS** | AD-10/11/12/27/28/29 headings and Rules untouched by this lock. No AD-30 proposed. Name lives in prose + AD-22 + Deferred, not a new invariant. |
| Shortlist not live; OAPI not silently closed | **PASS** | Shortlist names appear only as the search that was not chosen. Those domains were not purchased. OAPI/WIPO + handles stay open on AD-22, Deferred, YAML, §15 Q10, and §17. |
| Every initiative dimension decided, deferred, or an open question | **PASS** | Display/product name decided. Public domain decided. Repo slug decided (not the product). Legal-entity name still counsel (§5.3). OAPI/WIPO/handles open. Ops/env envelope unchanged (AD-5 / AD-20). |

---

## What this naming-only update gets right

- **Product name is locked without an AD.** Spine `name: AnKanu`, title, scope, and the lock paragraph cite Maitchibi Fayçal via Harris, 2026-10-03. Companion title, lock paragraph, and §5.3 controller use the same string. Deferred says the lock is **not an AD**. That is the right split; a brand token is not AD-30.
- **Repo slug is not the product.** Scope and both lock paragraphs say `muslim-marriage-africa` is not the product name. Artifact folder names and source paths may keep the historical slug.
- **Domain purchase is recorded once, as a fact.** **ankanu.com** purchased on Hostinger. Shortlist-domain purchase is closed (those domains were not purchased). Q10 is not “the domain,” it is OAPI/WIPO and social handles of AnKanu.
- **AD-22 matches the lock.** Binds no longer include Q9. Rule: Q9 resolved — AnKanu + ankanu.com; shortlist is search history only. Q10 stays open; OAPI/WIPO not recorded as completed. Builders must not bake a closed answer into schema enums. Retention clocks stay `[ASSUMPTION]`.
- **Companion YAML and Q10 stay honest.** `open_questions` has `oapi-wipo-handles` and no name-check / shortlist key. §15 Q10: still open for AnKanu; brand tokens replaceable. §17: not an OAPI/WIPO filing; not a trademark registration; name + domain locked.
- **§5.3 does not invent a legal entity.** Controller is “the Burkina operating company (product AnKanu; legal entity name still counsel).” Product name ≠ company name.
- **Shortlist names are history only.** They appear in the lock paragraphs and in the historical Q9 question title (“Native-speaker check of Nikahsira / Nonglem”). They are not a live shortlist and are not claimed as purchased domains.
- **Locked ADs and the catalog were not reopened.** This walker did not re-read §6 and does not treat AD-10/11/12/27/28/29 as holes.

---

## Findings

Flag only naming-lock holes: product name still TBD on a judged surface; shortlist still live or claimed purchased; OAPI/WIPO closed; repo slug treated as the product; a new AD-30; a product-rule rewrite. Do not raise catalog or AD-10/11/12/27/28/29 gaps.

### CRITICAL

None. The lock does not leave the product name undecided on the spine. It does not present Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, or `nisfdin` as a live shortlist or as purchased domains. It does not close OAPI/WIPO. It does not add AD-30.

### HIGH

None.

### MEDIUM

#### M1 — Companion §15 lead still lists Q9 among open questions

- **Severity:** medium
- **Checklist:** missed naming divergence on a judged companion surface; Q9 coverage
- **Suggest:** **autofix (prose only)**
- **Where:** `SOLUTION-DESIGN.md` §15 lead (“PRD §16 questions 1 and 3–11 stay **open**”); contrast AD-22 Binds (`1, 3–8, and 10–11`), frontmatter `open_questions` (no name-check), and the §15 Q9 row (**Resolved 2026-10-03**)
- **Gap:** The table and the spine close Q9. The section heading “stay OPEN” plus the lead sentence still claim questions 3–11 are open. That set includes Q9. A skimming implementer can keep a shortlist working title while the spine ships AnKanu.
- **Divergence it fails to prevent:** content/SEO/store strings stay “Nikahsira / Nonglem pending native-speaker check”; identity/session copy uses AnKanu; the repo slug is treated as the public name “until Q9 closes.”
- **Autofix:** Align the §15 lead with AD-22 Binds: questions 1, 3–8, and 10–11 stay open; Question 2 resolved 2026-10-01; Question 9 resolved 2026-10-03 (AnKanu; ankanu.com purchased; shortlist is search history). Do not reopen Q9. Do not close Q10. Do not add AD-30.

### LOW

None that this naming-only run will act on. Stack-pin staleness (Next.js table vs own floor) is **ignore** — stack locked.

---

## Not holes (do not raise)

| Temptation | Why it is not a hole |
| --- | --- |
| Propose AD-30 for the product name | Name is a brand token. Deferred and Q9 say config/tokens, not schema. An AD would be a product-rule change this run forbids. |
| Reopen AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 | Locked. Naming prose does not amend those Rules. |
| Re-judge entity catalog §6 | Out of scope. Prior catalog residuals (phone column, hide clock, photo enum) are not naming holes. |
| OAPI/WIPO still open | Required. Not recorded as completed. YAML `oapi-wipo-handles`, AD-22 Q10, Deferred, §17. |
| Social handles unset | Part of open Q10. Do not invent `@ankanu` as locked. |
| Legal entity name still counsel | §5.3 is correct. Product AnKanu ≠ operating-company legal name. |
| Shortlist names appear at all | Allowed as search history. Spine + companion lock paragraphs list them as not chosen / not purchased. Q9 title is the historical PRD question. |
| Repo / artifact paths still say `muslim-marriage-africa` | Locked as not the product name. Do not demand a folder rename. |
| Hostinger vs Scaleway `fr-par` | “Purchased on Hostinger” is the registrar/purchase fact. AD-5 still governs compute (Scaleway `fr-par`; USA edge rejected). Do not treat Hostinger as a hosting rewrite and do not reopen AD-5. |
| Prod origin not written as `https://ankanu.com` | Domain purchase is locked; env hostnames stay AD-20. Do not expand the spine into DNS. |
| A1–A3 unchanged | Required. Lock paragraph says they stay as written. |
| Stack pins / Next.js 16.3.6 | Locked this update. Ignore. |
| Kids / likes / `hold_queue` / grant-vs-link | Catalog and AD-10/12/28 concerns. Not this run. |

---

## Q9 / Q10 coverage (this update)

| Item | Spine lock | Companion lock | Hole? |
| --- | --- | --- | --- |
| Product name AnKanu (2026-10-03, Maitchibi Fayçal via Harris) | Frontmatter, title, lock paragraph, AD-22 | Title, lock paragraph, §5.3, §15 Q9, §17 | no |
| Domain ankanu.com purchased on Hostinger | Lock paragraph, AD-22, Deferred | Lock paragraph, §15 Q9, §17 | no |
| Repo slug ≠ product name | Scope + lock paragraph | Lock paragraph | no |
| Shortlist = search history; those domains not purchased | Lock paragraph, AD-22 | Lock paragraph, §15 Q9 | no |
| Branding strings / tokens, not schema | AD-22, Deferred | §15 Q9 / Q10 | no |
| Q9 closed (not silently) | AD-22 Binds drop Q9; Rule dated | §15 Q9 row dated; YAML dropped name-check | **M1** lead sentence only |
| Q10 OAPI/WIPO + handles of AnKanu still open | AD-22, Deferred | YAML, §15 Q10, §17 | no |
| Shortlist-domain purchase closed | AD-22 | §15 Q10 | no |
| No AD-30 | Deferred “not an AD” | §17 not a trademark registration | no |

---

## Deferred that can still fork units (naming only)

| Deferred item | Safe? | Why |
| --- | --- | --- |
| Trademarks (OAPI/WIPO) and social handles for AnKanu | yes | Tokens, not schema; explicitly not completed. Two units must not treat filing as done. Name + domain already locked. |
| Native iOS / USSD / vendor SKUs / Redis vs Valkey / PG 18 | yes | Unrelated to the name. |
| Dual-control unblur / watermark / multi-region / A-V / EN-AR | yes | Unrelated to the name. |
| Exact Premium XOF prices and free-review hours | yes | `operator_config` |

Nothing under Deferred reintroduces a live shortlist, treats the repo slug as the product, or closes OAPI/WIPO.

---

## Version check (named tech) — stack LOCKED

This walker does **not** treat the stack table as a required edit. Claim remains verified 2026-09-27.

---

## Locked-item audit (this run)

| Locked item | Reopened? | Evidence |
| --- | --- | --- |
| AD-10 passive Chat | no | Not edited for naming |
| AD-11 Mooré / Dioula honesty | no | Not edited for naming |
| AD-12 grant-scoped Mahram | no | Not edited for naming |
| AD-27 Sister reach | no | Not edited for naming |
| AD-28 card / grid | no | Not edited for naming |
| AD-29 message cap | no | Not edited for naming |
| Entity catalog §6 | no | Not judged |
| AD-30 | no | None proposed; Deferred says name lock is not an AD |
| OAPI/WIPO closed | no | AD-22 Q10, Deferred, YAML, §15 Q10, §17 |
| Shortlist as live / purchased | no | History-only; domains not purchased |
| Product-rule changes | no | Name + Q9/Q10 only |

---

## Suggested resolution order

1. **Autofix M1** — §15 lead: questions 1, 3–8, and 10–11 stay open; Q2 resolved 2026-10-01; Q9 resolved 2026-10-03. Leave the Q9/Q10 table rows as written.
2. **Do not** add AD-30. **Do not** close `oapi-wipo-handles`. **Do not** restore a live shortlist. **Do not** reopen AD-10, AD-11, AD-12, AD-27, AD-28, AD-29 or the catalog.

---

## Verdict rationale

**pass-with-residual**, not fail: the naming-only update did the job it was opened for. Product name is AnKanu. Domain ankanu.com is purchased on Hostinger. The repo slug is not the product. The shortlist is search history and those domains were not purchased. OAPI/WIPO for AnKanu stays open. No AD-30. Locked ADs and the catalog were not treated as holes.

**pass-with-residual**, not pass: companion §15’s lead sentence still claims questions 3–11 are open, which includes the Q9 the rest of this pair already resolved. That is a prose miss on a judged surface, not a missing name lock and not a reason to reopen trademarks or mint an AD.
