---
name: review-adversarial-name-lock
artifact: ARCHITECTURE-SPINE.md
lens: adversarial
date: 2026-10-03
status: complete
kind: reviewer-gate
focus: naming-only (AnKanu lock / ankanu.com / AD-22 Q9–Q10)
verdict: pass
---

# Adversarial review — architecture spine (naming lock, 2026-10-03)

**Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md`  
**Lens:** Attack the spine as an adversary. Construct two units one level down (two feature teams) that each obey every AD to the letter and still ship incompatibly — clashing shared-data shapes, two owners of one entity, conflicting state-mutation paths. Every pair that survives is a hole.  
**Scope of this update:** NAMING ONLY. Product name **AnKanu** is locked 2026-10-03 (Maitchibi Fayçal via Harris). Domain **ankanu.com** purchased on Hostinger. Repo slug `muslim-marriage-africa` is not the product name.  
**Scope of reading:** the spine only. Companions, PRD, SOLUTION-DESIGN, memlog, UX, and prior reviews are not authority.  
**Locked (not holes):** A1–A3 (age / wali / CIL — not a name); AnKanu + ankanu.com; AD-5; stack pins; Capacitor (AD-4); AD-9 blur/reveal/gateway product; **AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 product rules**; entity catalog rules. Do not invent kids/children/`has_children` columns. Do not invent a likes table. Do not restore `hold_queue` or `message.state` `pending`/`held`.  
**New-AD bar:** do **not** add a new AD for the name. Do **not** change AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29. Do **not** propose AD-30. Do **not** treat branding-token replaceability (OAPI/WIPO still open) as a hole that needs a new AD. A pair that is branding-only and already closed by the AnKanu lock + AD-22 Q9 is not a hole.

**Focus of this attack**

1. Leftover current-state sentences that still say the product name is undecided / TBD / a live shortlist.
2. Two feature teams shipping different public product names as schema.
3. Claiming shortlist domains were purchased.
4. Claiming OAPI/WIPO completed.

## Method

Two hypothetical feature teams — **Team A** and **Team B** — are given the spine and nothing else. Each team:

- ships one API product, hexagonal modules, ports, adapters (AD-1, AD-2);
- writes only the entities AD-3 assigns;
- treats `content.locale_string` as content-owned copy (AD-3, AD-24) and does not invent a second product-name table;
- does not bake a closed PRD answer into a schema enum unless the PRD already locked that enum (AD-22);
- treats Q9 as **resolved 2026-10-03** — product name AnKanu; domain ankanu.com; shortlist names are search history; those domains were not purchased;
- treats Q10 as **open** for AnKanu OAPI/WIPO and social handles (not recorded as completed); shortlist-domain purchase is closed;
- treats trademarks / handles as branding tokens, not schema (Deferred);
- does not reopen AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 or the entity catalog.

If those two teams can still disagree on a **shared record, a writer, or a mutation path** that is *not* branding-token replaceability, the naming update does not yet bind that seam. A pair that only exists by *violating* the AnKanu lock, AD-22 Q9, or by treating Q10 replaceability as a schema fork is not a hole.

## Verdict

**pass**

The 2026-10-03 naming amendment holds for the thing it was written to lock. The spine has **no leftover current-state sentence** that still says the product name is undecided, TBD, or a live shortlist. Two teams that obey every AD **cannot** lawfully:

- ship Nikahsira / Nisfuddin / Sakinaa / Mithaqun / Nonglem / `nisfdin` / `muslim-marriage-africa` as the public product name;
- persist a shortlist name as a schema enum or a second product-name entity;
- treat a shortlist domain as purchased;
- treat OAPI/WIPO as completed.

Q9 is resolved in AD-22. Q10 stays open for AnKanu trademarks and handles only. Deferred names those as branding tokens, not schema, and says the product name and domain are locked **(not an AD)**. That is the bind. Branding-token replaceability while OAPI/WIPO is still open is **already closed** as an AD-class hole by the AnKanu lock + AD-22 Q9. It is not a reason for AD-30, and it is not a reason to tighten AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29.

No residual naming hole survives that would let two AD-compliant teams ship incompatible *schema*. **Do not add an AD for the name. Do not propose AD-30.**

---

## Checklist — leftover current-state sentences

Sweep of `ARCHITECTURE-SPINE.md` for undecided / TBD / live-shortlist / purchased-shortlist / completed-trademark claims presented as *now*.

| Location | What it says now | Leftover current-state? |
| --- | --- | --- |
| Frontmatter `name` | `AnKanu` | No |
| Frontmatter `scope` | Burkina-first AnKanu; repo slug is not the product name | No |
| Sources list `docs/name-options.md` | Historical input path. Not a sentence that the name is TBD or a live shortlist | No — a source citation is not current-state |
| Title + lead paragraph | AnKanu locked 2026-10-03; ankanu.com purchased on Hostinger; slug is not the name; shortlist names are history and **those domains were not purchased**; OAPI/WIPO **not recorded as completed** | No |
| AD-22 Binds | Questions 1, 3–8, 10–11 + NFR-008. Q9 is not in the open-binds list | No |
| AD-22 Rule Q9 | **resolved 2026-10-03** — AnKanu; ankanu.com; shortlist is search history; those domains were not purchased | No |
| AD-22 Rule Q10 | stays open for OAPI/WIPO and social handles of **AnKanu** (not recorded as completed); shortlist-domain purchase is closed | No |
| Deferred | Trademarks / handles for AnKanu — branding tokens, not schema; OAPI/WIPO not completed; name + domain locked (not an AD) | No |
| A1–A3 sentence in the lead | “Assumptions A1–A3 stay as written” — A1 age, A2 wali, A3 CIL/hosting. Not a name assumption | No |
| AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 | No product-name current-state | No — out of scope; not reopened |
| Entity catalog pointer (AD-3) | Ownership only; no product-name entity | No — catalog rules not in play |

**Finding on focus (1):** none. There is no spine sentence a second team can quote as “name still TBD / still a live shortlist.” A team that reads `docs/name-options.md` from the sources list as *current authority* is not obeying AD-22 Q9 or the lead paragraph.

---

## What the naming lock + AD-22 Q9 already bind (not holes)

These attacks die. Do not spend AD budget here. Do not propose AD-30.

| Attack | Why it dies |
| --- | --- |
| Public name is still undecided / TBD / a live shortlist | Lead + AD-22 Q9 resolved. Shortlist names are “history of the search that was not chosen” |
| Play / PWA / SEO / SMS / pay-descriptor title is the repo slug | Lead + scope: slug `muslim-marriage-africa` **is not** the product name |
| Schema enum `Nisfuddin \| Nikahsira \| …` or a `product_name` column of those values | AD-22 Q9 + “must not bake a closed answer into schema enums” + Deferred “branding tokens, not schema” |
| Cookie / CORS / origin on nisfuddin.com / nikahsira.com / … | Lead + AD-22 Q9: those domains **were not purchased**. Only ankanu.com is recorded as purchased |
| Treat RDAP / name-options as a purchase | Spine never claims a shortlist purchase; it denies it |
| Treat OAPI/WIPO as done and persist a registration id as fact | AD-22 Q10 + Deferred + lead: **not recorded as completed** |
| Compile a second product name because Q10 is open | Q10 is AnKanu trademarks/handles, not a second name. Shortlist-domain purchase is closed |
| Branding tokens remain replaceable → therefore two public names may ship | Branding-only. Closed by AnKanu lock + AD-22 Q9. **Not a new AD** |
| Reopen Chat hold / likes / kids column / `invite_id` grant / Brother-free / catalog grains under a “name” pretext | Locked. Out of scope |

---

## Attempted incompatibility pairs (all die)

Each pair was constructed so both teams obey every AD. None survive as a schema / writer / mutation hole. Suggested closure is **none** — do not add an AD, do not tighten AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29, do not touch the entity catalog.

### P1 — Two public product names as schema

**Clash type (attempted):** clashing shared-data shapes / two owners of one entity  
**Teams:** Content vs Identity (Web / Android as publishers)  
**location:** lead; AD-22 Q9; AD-3 `locale_string`; Deferred; Consistency Conventions Locale / AD-24

**What the spine says**

- Product name AnKanu is locked. Slug is not the product name. Shortlist names are history.
- AD-3: `article`, `board_member`, `locale_string`, `audio_asset`, `ice_breaker_template` → content. No `product_name` / `brand` entity.
- AD-22: do not bake a closed answer into schema enums unless the PRD already locked the enum. Q9 resolved to AnKanu.
- Deferred: trademarks / handles are branding tokens, not schema. Name + domain locked **(not an AD)**.
- AD-24: member-facing copy uses *mariage / ta'aruf / nikah / khitba* only — that is vocabulary, not the product name.

**The fork that was attempted**

- **Team Content-config.** Public name is a `locale_string` value (or equivalent config). Writer is content. Value is AnKanu. No enum.
- **Team Schema-enum.** Q9 is closed, so they add `operator_config` key or a new enum `product_name = AnKanu \| Nikahsira \| …` and pick a shortlist value “until OAPI.”
- **Team Slug-as-name.** Play listing / PWA `name` / cookie brand is `muslim-marriage-africa` because that string is the repo and appears in source paths.

**Why it dies**

Team Schema-enum that stores a **shortlist** value violates AD-22 Q9 (resolved name is AnKanu) and bakes a closed answer into an enum the PRD did not lock. Team Slug-as-name violates the lead and scope (“repo slug is not the product name”). Team Content-config shipping **AnKanu** as config/copy is the lawful build. Two teams cannot both obey the ADs and still ship *different public product names as schema*. A team that stores AnKanu as config vs hardcodes AnKanu in `apps/web` still publishes one name — branding-token home, not a schema clash. **Already closed by the AnKanu lock + AD-22 Q9. Do not demand a new AD.**

---

### P2 — Shortlist domains claimed as purchased

**Clash type (attempted):** conflicting public origin / cookie Domain  
**Teams:** Identity (session cookie) vs Web (Capacitor origin) vs Notifications (links in SMS)

**What the spine says**

- Domain **ankanu.com** purchased on Hostinger.
- Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, `nisfdin` — those domains were **not** purchased.
- AD-22 Q9: shortlist-domain purchase is closed (again under Q10: shortlist-domain purchase is closed).
- AD-4: Play listing wraps **the same origin**. AD-5: host region is Scaleway `fr-par`, not a USA edge.

**The fork that was attempted**

- **Team Origin-AnKanu.** Cookie, CORS, PWA start_url, Capacitor server URL, SMS links = `ankanu.com`.
- **Team Origin-shortlist.** They read `docs/name-options.md` from Sources and set origin to a shortlist host they treat as bought.
- **Team Origin-slug.** They use a repo-named host because no AD names the `Domain=` attribute (AD-7 / AD-17 name cookie flags only).

**Why it dies**

Team Origin-shortlist is not AD-compliant: the lead and AD-22 Q9 state those domains were not purchased. Team Origin-slug ships the slug as the public product identity — forbidden by the same lock. Team Origin-AnKanu is the only lawful public host name the spine records as purchased. Residual `www` vs apex vs `app.` is branding/ops, not a second product name and not a schema enum. **Not a new AD.**

---

### P3 — OAPI/WIPO claimed completed

**Clash type (attempted):** baking Q10 closed into schema  
**Teams:** Operator vs Content vs Trust

**What the spine says**

- OAPI/WIPO for AnKanu is **not recorded as completed** (lead, AD-22 Q10, Deferred).
- Q10 stays open for OAPI/WIPO and social handles of **AnKanu**.
- Builders must not bake a closed answer into schema enums unless the PRD already locked the enum.
- Deferred: trademarks and handles are branding tokens, not schema.

**The fork that was attempted**

- **Team Filing-done.** They add `trademark_class` / `oapi_reg_id` / `handle_verified` columns and seed them as complete so store listing can claim registration.
- **Team Filing-open.** Q10 is a disabled port / ops checklist. No schema. Copy does not claim a filing.

**Why it dies**

Team Filing-done closes Q10 in schema. AD-22 forbids baking a closed answer the PRD did not lock; Q10 is explicitly still open; the spine says the filing is not recorded as completed. Team Filing-open is the lawful build. Two teams cannot both obey AD-22 and disagree on “OAPI completed” as a stored fact. **Not a new AD. Do not treat Q10 replaceability as a hole.**

---

### P4 — Q10 replaceability as a second product name

**Clash type (attempted):** branding-token replaceability  
**Teams:** Content vs Web

**What the spine says**

- Name AnKanu locked (not an AD).
- Q10 open: trademarks and social handles of AnKanu; brand tokens remain the Deferred class.
- Shortlist-domain purchase is closed.

**The fork that was attempted**

- **Team Locked-string.** Every surface says AnKanu. Handles can wait.
- **Team Replaceable-token.** Because Q10 is open they keep a swap table so counsel can rename the product without a migration — and they seed the swap with a shortlist name “until filing.”

**Why it dies as an AD-class hole**

A swap table that still **displays AnKanu** is branding-token home (config vs hardcode). That pair is branding-only and **already closed** by the AnKanu lock + AD-22 Q9. Seeding the swap with a shortlist name is P1 and dies. Q10 does not re-open the product name. **Do not demand a new AD.**

---

### P5 — `locale_string` vs `operator_config` as two writers of the display name

**Clash type (attempted):** two owners of one entity  
**Teams:** Content vs Operator

**What the spine says**

- AD-3: `locale_string` → content; `operator_config` → operator. Required config keys are listed; `product_name` is not among them.
- AD-24 / capability map: FR copy lives in content.
- Name is not an AD and is not a schema enum.

**The fork that was attempted**

- **Team Content.** AnKanu is a `locale_string` (or compiled copy). Operator does not own it.
- **Team Operator.** They add an `operator_config` key `product_name` so a PATCH can rebrand.

**Why it dies as a naming hole**

Both teams that obey Q9 still store **AnKanu**. Operator adding a key the conventions do not require is extra config, not a second public name, and not a catalog/AD-10…29 change. If Operator PATCHes the key to Nikahsira, they violate Q9. The lawful value has one reading. **Branding-only; closed by the lock + AD-22 Q9. Do not demand a new AD. Do not add a catalog row.**

---

## Two-team sketches (executable thought experiment)

### Sketch 1 — “Content ships the store listing; Identity ships cookies; Billing ships the Orange descriptor”

- **Content** writes FR-117 / Play / PWA strings as AnKanu (AD-24 vocabulary still *mariage / ta'aruf / nikah / khitba*). Lawful.
- **Identity** sets `Domain=ankanu.com` on the AD-17 cookie. Lawful.
- **Billing** that prints `NISFUDDIN` or `MMA` on the mobile-money descriptor is shipping a different public product name — illegal under the lead + AD-22 Q9, not a missing AD.
- **Web** that wraps Capacitor on a shortlist origin is illegal under “those domains were not purchased” (P2).
- Chat persist stays `delivered` (AD-10 locked). Sister reach and message cap unchanged (AD-27 / AD-29 locked). No catalog field appears.

No AD-compliant pair forks the public name.

### Sketch 2 — “Operator files OAPI later; two modules persist the result”

- **Operator** leaves Q10 as ops. No `oapi_reg_id` column. Copy does not claim a filing. Lawful (P3).
- **Content** that adds a `locale_string` key `trademark_registered=true` bakes Q10 closed. Illegal under AD-22.
- **Content** that stores AnKanu in `locale_string` while **Web** hardcodes AnKanu is P4/P5 — same public name, branding home only.
- A later counsel rename of the *token* while OAPI is still open is Deferred branding replaceability — **not a hole, not AD-30**.

No AD-compliant pair ships two product names as schema.

---

## AD gap map (holes → bind)

| Pair | Missing bind | Action |
| --- | --- | --- |
| P1 | — | None. AnKanu lock + AD-22 Q9 already make a second public name as schema illegal |
| P2 | — | None. Shortlist domains were not purchased |
| P3 | — | None. Q10 open; filing not recorded as completed |
| P4 | — | None. Branding-token replaceability is not a new AD |
| P5 | — | None. Two homes of the same locked string are branding-only |

**Do not add an AD for the name. Do not propose AD-30.** Two teams cannot rebuild a live shortlist, a purchased shortlist domain, a completed OAPI fact, a slug-as-name schema, or a Chat hold / likes table / kids column / `invite_id` grant / Brother-free mode while obeying the locked ADs and this naming amendment.

---

## Reviewer note

This review does not propose stack changes, hosting changes, AD-30, a name AD, a brother-free mode, kids/children columns, a likes table, `hold_queue`, or `message.state` `pending`/`held`. It does not reopen AD-10, AD-11, AD-12, AD-27, AD-28, AD-29, or entity catalog rules. It does not treat Q10 branding-token replaceability as a hole.

Leftover TBD / undecided / live-shortlist current-state: **none in the spine.**  
Top findings that remain holes: **none.**
