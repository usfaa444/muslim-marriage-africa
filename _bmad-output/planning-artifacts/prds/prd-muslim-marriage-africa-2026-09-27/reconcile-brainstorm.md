# Input reconciliation — brainstorm 2026-09-27

**Superseded in part on 2026-10-01.** Locked decision (Maitchibi Fayçal): AI moderation is passive. Rows below that treat FR-051 as a pre-delivery scan or D32 as a fail-closed hold of Voice notes are historical. Current `prd.md` delivers then scans; D32 is scan-deferred visibility. Other qualitative gaps in this reconcile are not closed by that decision.

**Input:** Brainstorm session `brainstorm-muslim-marriage-africa-2026-09-27`  
**Sources read:** `brainstorm-intent.md`, `brainstorm.html`, `.memlog.md`  
**Compared to:** `prd.md` + `addendum.md` (same PRD workspace)  
**Focus:** Qualitative ideas FRs silently drop — tone, voice, feel, cultural values, dignity, naming vibes, rejected ideas, D24–D40 coverage.  
**Method:** Extract, do not ingest. Capability IDs that already have FRs are treated as landed; missing *feel*, *voice*, *placement*, and *ritual shape* are gaps even when the ID exists.

---

## 1. Verdict

Parity IDs (P1–P59, D1–D40) are listed and horizon-tagged in PRD Appendix A. The FR spine captured the *capabilities*. What the brainstorm actually sold — a **sira** (path) toward nikah, not a swipe product from Dakar — lives in Vision, JTBD one-liners, §10 Aesthetic, and addendum personas. Almost none of that voice is *testable* in FRs. UX and copy can therefore ship a correct feature list that still *feels* like dating software.

The worst silent drop is not a missing D-number. It is the **keepsake pointer that goes nowhere**: PRD §10 says the visual/tone hint (indigo / sand / gold, mihrab, *sira*) is “see addendum.” The addendum has no aesthetic section.

---

## 2. What already landed (do not re-litigate)

These qualitative bindings *did* survive into PRD capabilities or explicit non-goals. They are not gaps.

| Brainstorm idea | Where it lives |
| --- | --- |
| Copy lexicon *mariage / ta'aruf / nikah / khitba*; ban *dating / rencontre romantique* | FR-117, FR-137, Non-goals, NFR-007 |
| Quiet decline: no guilt timer, no “she saw this” | FR-042 (+ FR-040 declined-row copy) |
| Completeness meter names missing Islamic criteria **without shaming** | FR-023 |
| Named life-pauses (Ramadan, exams, travel, grief) | FR-018 |
| Woman’s consent first-class; Chat only after Sister accept | FR-039, FR-041 |
| Sister dignity never paywalled | FR-105, Vision thesis |
| Haya-default Blur; per-viewer Reveal / Revoke | FR-056–FR-059 |
| Khalwa-safe: no live A/V until Mahram or chaperoned meeting; live video LATER | §7 + Non-goals |
| No “Cheikh” bot / dual coaches; not a mufti | FR-124, §10, Non-goals |
| North star = chaperoned meetings + dual-confirmed nikah, not DAU | SM-1, SM-2, SM-C1 |
| Proof-backed counters; hero is Verified marriages starting at 0 | FR-101, FR-102 demotion |
| In-Chat “never send money to a suitor” | FR-068 |
| No-auto-renew stated in French + Mooré/Dioula audio | FR-106, FR-138 |
| BF photo-modesty training (stated, not specified) | FR-012 prose |
| Quartier optional, hidden until accepted Invite | NFR-002 (not a named FR; still testable) |
| Rejected product options (age 21+, kinship papers, web-only, paywall safety, race to 0 FCFA, P54-as-hero, always-blur-never-reveal) | Addendum §2 matrices |
| Dannaya off the shortlist (`.com` taken) | Addendum §2.7, §6 |

---

## 3. Qualitative ideas FRs drop

This is the load-bearing section. Each item is a brainstorm idea that the FR structure flattened into a capability, a one-line aesthetic, or nothing.

### 3.1 Tone, voice, feel — the keepsake is unbound

**Brainstorm HTML is a designed object**, not a feature dump. Title: “Brainstorm keepsake.” Hero: *“A sira toward nikah, not another swipe from Dakar.”* Visual system:

- Indigo ink (`#070b18` … `#2a3a62`)
- Sand / cream (`#e8d5b0`, `#f5ecd8`)
- Gold mihrab stroke (`#d4af37`) and olive gold-green (`#8b9a4a`)
- Dusk-rose accent, lattice overlay, Palatino display type
- Geometry named *mihrab*, *qibla*, *alcove*, *sira* nav — courtship as a path toward a niche, not a feed

PRD §10 correctly refuses to become a UX spec, then **delegates the keepsake to the addendum**. Addendum has no palette, no type, no metaphor, no “do not look like Tinder/Farata swipe chrome” instruction. Downstream UX has a slogan (“solemn marriage path, not swipe culture”) and zero tokens.

**Gap:** The *feel* the session designed — dusk indigo, sand, gold mihrab, path-not-grid — is not in `prd.md` as a binding and is not in `addendum.md` as overflow. It will be reinvented or ignored.

**Also dropped from voice:**

| Brainstorm voice | PRD residue | What’s missing |
| --- | --- | --- |
| “Not another **swipe** from Dakar” | “Not another **dating app** from Dakar” | Swipe-as-interaction banned; grid-as-hunt vs criteria-first |
| Niyyah stays marriage-shaped because **current stage is always visible** | FR-028 stage flags exist | No copy/UX rule that the stage *reads as a ritual path*, not a chat status |
| Voice notes as **Mooré/Dioula ta'aruf introductions**, not a Premium flirt channel | FR-051: languages + deliver-then-scan *(was pre-delivery scan; superseded 2026-10-01)* | Cultural *use* (introduction, not flirt) is not an AC |
| Ice Breakers: “sincere first message, **not a pickup line**” | FR-047: deen/family templates | No banned-pickup-line / scholar-reviewed template bar in AC |
| Discovery: **sister-initiated or mutual-criteria-reveal default** so brothers do not only hunt a grid | Sisters may start Invites free (FR-045) | No default that de-centers the hunt-the-grid interaction |
| Moderator macros: **respectful Ouaga French**, templated, reviewed | §10 one line; addendum persona | No FR that sanction copy is a reviewed corpus (tone can go bureaucratic or shaming) |
| Couple stories help others **make du'a**, not become celebrities | UJ-5 + FR-099 (faces optional, no Chat excerpts) | Emotional purpose is journey prose, not an AC on showcase copy |

### 3.2 Cultural values the FR list flattened

First-principles chips that cannot be bargained: **khalwa, wali, niyyah, haya, ta'aruf, khitba, mahr, consent, family, istikhara** — held against Sahel realities (French+Mooré+Dioula, cheap Android, expensive data, mobile money, family-driven marriage, honest polygamy, diaspora).

The PRD Glossary and Vision *name* these. FRs implement *pieces*. The **ritual shape** of the path was five stages in the HTML and four flags in FR-028:

| Brainstorm stage (HTML path) | PRD Ta'aruf stage | Dropped feel |
| --- | --- | --- |
| 1 Invite (consent, quiet decline, lexicon) | **invite** | Landed |
| 2 Wali-aware chat (khalwa-safe, wali as **process actor not spectator**) | **chat** | Actor language is in UJ-3; FR-075 is controls, not “process actor” voice |
| 3 **Family intro** (haya media + discreet istikhara) | *collapsed* | **No named stage.** Family-intro is not a product moment |
| 4 Khitba planner (family event, **who/when/where card**, screenshot-with-consent, **not a dating calendar**) | **meeting** (MVP = flag only); FR-082 NEXT = time/place/attendees | Card-as-ritual-artifact and anti-calendar feel are gone |
| 5 Nikah report | **married** | Landed |

**Family-intro fields** (brother social job: “my mother will ask who her family is”) have **no FR**. FR-021 stores origin / city / profession — not a dignified family-intro block for the other household.

**Digital mahram education:** SCAMPER put P50 to other use — Académie track *“how to be a digital mahram”* for fathers/brothers (D2 onboarding). FR-115 seed topics are Mahram, mahr, rights, haya, honesty. The *father-facing* track is not required. Mosque credibility (wali social job) then depends on D23 names + D12 counter without teaching the guardian role.

**Public fiqh notes:** Chaos invert for “mosque rumor the app is haram/dating” was D23 named board + **public fiqh notes** + zero dating language + working Académie. PRD ships Board names (FR-116) and seed articles (FR-115) and the lexicon ban. **Public fiqh notes as a trust surface** are not an FR. Addendum risk 22 omits them too.

**CIL as a launch trust *badge*, not a footer footnote** (HTML alcove; D17). FR-120 puts hosting disclosure on the privacy page. That is compliance, not the *feel* of a Burkina entity you can point to at the mosque. Placement and dignity of the badge are unbound.

**Istikhara (D25):** brainstorm trigger is **after N messages or before accept**, discreet reminder + private journal, explicitly not a fatwa. FR-129 NEXT AC is only “a private journal exists and the product does not issue a ruling.” Discreet timing and non-intrusive placement — the *haya* of the feature — are dropped.

**Mahr card (D26):** “sadaq discussed with family in the loop, **not bargained as flirt chat**.” FR-130: “dignified template… shared into a Chat with Mahram visibility.” The anti-bargain / ritual-not-flirt constraint is not an AC.

### 3.3 Dignity mechanics that stayed poetic

These are dignity *behaviors* the reverse-brainstorm / JTBD pass named. They are not in FRs (or are only in risk-table prose).

| Idea | Status |
| --- | --- |
| **Wali identified to the Brother; Sister may stay pseudonymous** (SCAMPER Reverse P27) | FR-079 is a presence *banner*. No AC that the guardian is *named/related* to the suitor while she remains a pseudonym. Dignity split (his accountability vs her quartier safety) is untestable. |
| **Wali-only exportable chat attestation** (wali emotional job: evidence if he must confront a man) | No FR. Export is owner-only (D15 / NFR-001). The guardian cannot take a lawful, scoped attestation. Dignity of the father’s role is incomplete. |
| **Time-limited Reveal + re-Blur on Report** (social-engineer an unblur then screenshot) | FR-057–FR-059 are policy + Revoke. No TTL. No auto-Revoke on Report. D9 watermarks are NEXT. |
| **Optional auto-Block after decline** | FR-043 no-resend + FR-084 manual Block. The “no stays a no” invert included optional auto-Block; not specified. |
| **Kill-switch + mass Revoke + member notification + transparency note** (viral indecent leak) | Addendum risk 24 only. Not an Operator FR. |
| **Recommendations treat declines *and* wali-pauses as negative signals** | FR-032 NEXT is generic “explicit behaviour signals.” Wali-pause as a first-class negative is dropped. |
| **P8 training specifics:** hijab styles, family-in-frame — not only Western filters | FR-012 says “trained on BF photo-modesty norms.” No AC naming those norms. Reviewers can still apply a generic filter. |
| **Data-lite cards:** text-first, **one compressed photo**, cached queue of N | FR-136 / FR-025 are Lite + deferred images. “One photo, text-first card” as the *feel* of browse is not bound. |

### 3.4 Naming vibes — inventory without a voice

Brainstorm treated names as **meanings that set product voice**, then RDAP as a point-in-time check (not a purchase).

| Candidate | Brainstorm vibe | PRD / addendum |
| --- | --- | --- |
| **Nisfuddin** (+ buy `nisfdin`) | “Half the deen” — the product *is* the other half of deen, not a marketplace | Listed; meaning in addendum §6. Not used as copy thesis or tone lock. |
| **Nikahsira** | *nikah* + Jula *sira* — same *sira* as the HTML hero path | Native-speaker check in Open Questions. Hero *sira* metaphor never tied to this candidate. |
| **Sakinaa** | HTML only records the spelling workaround (`sakina.com` taken). Intent does not unpack *sakīna* (tranquility). | Addendum: “*sakina*.” No product-feel note (calm household, not excitement). |
| **Mithaqun** | Alternate; addendum later adds “solemn covenant” | Meaning landed in addendum only. |
| **Nonglem** | Mooré wildcard; native-speaker / slang-taboo risk | Open Question 9. No vibe sentence for UX. |
| **Dannaya** | Jula “trust”; `.com` taken | Correctly **rejected from shortlist** (addendum). Good. |

**Dropped as a naming *program*:** OAPI/WIPO + handles + **user test Ouaga/Bobo** is an Open Question (trademark) but not a UX research binding that *name feel* is validated with sisters (taboo, slang, “sounds like dating”). The HTML wildcards sit next to the shortlist visually; the PRD demotes them correctly — and then forgets that **Nisfuddin / Nikahsira / Sakinaa each imply a different voice** (deen-duty vs path-to-nikah vs tranquility). §10 is one voice (“solemn… Ouaga French”) that does not say which name-vibe to write toward.

---

## 4. Rejected ideas — capture check

Addendum §2 is strong on *product* rejects. Cross-check against brainstorm eliminates and chaos inverts:

| Rejected / eliminated | Captured? | Note |
| --- | --- | --- |
| 21+ age gate | Yes — addendum 2.1 | |
| Kinship documents for Mahram | Yes — 2.2 + A2 | |
| Ignore CIL / pick hosting in the PRD | Yes — 2.3 | |
| Web-only or PWA-without-Play | Yes — 2.4 | |
| All-or-nothing Farata blur as the only model; always-blur-never-reveal | Yes — 2.5 | |
| Paywall sisters’ start-chat; paywall Verification; race to 0 FCFA | Yes — 2.6 | |
| P54 carousel as hero; invented counts | Yes — 2.8 + FR-102 | |
| Farata default right to use profiles in ads | Yes — FR-060, Non-goals | |
| “Cheikh” title + dual coach names | Yes — FR-124, Non-goals | |
| Silent auto-renew | Yes — FR-106 | |
| Uncurated GIFs | Yes — FR-054, Non-goals | |
| Fail-open moderation | Yes — FR-067 | |
| Live video even with wali | Yes — Non-goals LATER | |
| English/Arabic full UI in MVP | Yes — FR-128 LATER | |
| Dannaya as a shortlist name | Yes — addendum 2.7 | |
| First-wife awareness without consent | Yes — Non-users + Open Q1 | |
| **Swipe / hunt-the-grid as the default discovery feel** | **No** as an explicit reject | Only “not swipe culture” in §10 |
| **Dating-calendar khitba** | **No** as an explicit reject | FR-082 is a generic planner |
| **Footer-only CIL** | **No** as a reject | FR-120 can still be a footnote |
| **Pickup-line Ice Breakers** | **No** as an explicit reject | FR-047 is templates only |

---

## 5. D24–D40 coverage

Intent + memlog required **every D24–D40 listed** in brief and PRD. Appendix A lists all 17. None are silently deleted. Coverage quality is uneven: MUST IDs have real ACs; several NEXT IDs are stubs that lost the qualitative constraint.

| ID | Horizon (PRD) | FR | Coverage vs brainstorm | Qualitative residue |
| --- | --- | --- | --- | --- |
| **D24** | MVP | FR-028 | Stages exist: invite / chat / meeting / married | **Family-intro stage dropped.** Five-step HTML path → four flags. “Visible so niyyah stays marriage-shaped” is not an AC. |
| **D25** | NEXT | FR-129 | Journal + not-a-fatwa | Trigger (after N messages / before accept) and *discreet* placement dropped. |
| **D26** | NEXT | FR-130 | Template + Mahram-visible share | “Not bargained as flirt chat” / sadaq-with-family ritual dropped. |
| **D27 SMS** | MVP | FR-053 | Invite + Mahram pause/end/flag + OTP + block outcomes | Landed. |
| **D27 USSD** | NEXT | FR-055 | Accept/decline without data | Brainstorm: MUST *if feasible*. PRD assumption documents the deferral — not a silent drop. Feature-phone *feel* of the essential path is SMS-only at launch. |
| **D28** | MVP | FR-020 | PIN + timeout; Mahram too | Landed. HTML “brother or father cannot open her chats” is implied, not an AC about *who* is locked out. |
| **D29** | NEXT | FR-131 | Extra Verification level | Stub. Mosque/imam as *community trust* (extends D13/D23) is not described. |
| **D30** | NEXT | FR-127 | Isha–Fajr local; OTP may still send | Landed for a NEXT stub. |
| **D31** | NEXT (MVP audit floor) | FR-093 | Reasoned unblur + audit; dual-control NEXT | Wellness / rotation / auto-blur-in-console (moderator *emotional* job) is addendum-only. |
| **D32** | MVP | FR-067, FR-144, NFR-003 | **Superseded 2026-10-01.** No longer fail-closed hold. Messages delivered then scanned; AI outage records scan-deferred. Open Q on held-voice tolerance is resolved. |
| **D33** | LATER | FR-103 | Read-only, not matchmaking | Landed as LATER. |
| **D34** | NEXT | FR-126 | Mooré/Dioula/Fulfulde/French + anti-caste rule | Anti-caste AC exists — good. |
| **D35** | NEXT | FR-094 | Marital status / Photos notice to Chat partners | Landed as NEXT. |
| **D36** | NEXT | FR-036 | Hide last-seen; hide from browse except Invitees | Definition landed. Confirm-with-sisters is Open Q6. |
| **D37** | NEXT | FR-111 | No quota/moderation bypass; verified + complete + Mahram-ready ranking | Landed with boosts. |
| **D38** | MVP | FR-076, FR-077 | Cannot send as her; remove/Report; emergency hide | Landed. |
| **D39** | MVP | FR-091 | Facial-age / ID DOB hold | Landed. |
| **D40** | MVP | FR-070, FR-010 | Pictograms + French + Mooré/Dioula audio | Landed. |

**Horizon honesty:** D11/D12 MUST split, P36 Android MUST / iOS NEXT, and D27 USSD → NEXT match the brainstorm memlog amendments. No D24–D40 ID is missing from Appendix A.

**D24 is the coverage problem that matters for *feel*:** the ID is present, the ritual path is not.

---

## 6. Open questions — carry-through

All 13 brainstorm open questions appear in PRD §16 (age gate closed as A1 = 19+ with legal flag). None silently closed against the session. Native-speaker name checks and OAPI/handles remain open — consistent with “name TBD, not a purchase.”

---

## 7. Gaps for the parent to surface

Ranked for Finalize input-reconciliation. These are qualitative losses, not missing P/D IDs.

1. **Keepsake tone is a broken pointer.** Indigo/sand/gold, mihrab, *sira*-not-swipe, Palatino/solemn path — HTML designed it; §10 says “see addendum”; addendum is silent. UX will invent a dating-app look or a generic Muslim-app look. **Fix:** move a short keepsake block into addendum (tokens + metaphor + anti-swipe chrome) or delete the pointer and write two binding sentences in §10.

2. **The path lost a stage and two ritual artifacts.** Family-intro is not a Ta'aruf stage; family-intro fields are not an FR; khitba is not a who/when/where card both families can screenshot-with-consent (explicitly *not* a dating calendar). D24/D3/D26 FRs are mechanical. **Fix:** either restore family-intro as a named stage or addendum-bind the ritual artifacts for UX.

3. **Mosque-trust *feel* is names and a privacy URL.** Missing: CIL/entity as a launch **badge** (not footer); **public fiqh notes**; Académie track **“how to be a digital mahram.”** Chaos invert for “the app is haram” is under-specified vs the session. **Fix:** one FR or addendum trust-surface list.

4. **Guardian dignity vs sister haya is incomplete.** No AC that the wali is **identified to the Brother** while she stays **pseudonymous**; no **wali-only exportable chat attestation**. Time-limited Reveal / re-Blur on Report also absent. **Fix:** fold into D1/D8/D15 notes before UX.

5. **Name meanings never became voice.** Nisfuddin = half the deen; Nikahsira = path to nikah (same *sira* as the hero); Sakinaa = sakīna (tranquility, not excitement). PRD lists candidates. It does not tell copy which vibe to write. User-test-the-*feel* in Ouaga/Bobo is weaker than the trademark Open Question. **Fix:** addendum name-vibe paragraph + research note.

Plus (do not lead with these): pickup-line ban on Ice Breakers; voice-as-ta'aruf-intro not flirt; reviewed Ouaga-French sanction corpus as an FR; P8 AC naming hijab-styles / family-in-frame; kill-switch / mass Revoke as Operator capability; optional auto-Block after decline; Lite “one compressed photo, text-first card.”

---

## 8. Suggested addendum / PRD patches (for triage, not applied here)

This reconcile does not edit the PRD. If the parent accepts gaps:

- **Addendum new §:** “Keepsake (not a UX spec)” — palette tokens, mihrab/sira metaphor, anti-patterns (swipe chrome, dating calendar, footer-only CIL, pickup-line prompts, celebrity success stories).
- **Addendum name-vibe:** one sentence per shortlisted name; Dannaya stays rejected; native-speaker *feel* test called out beside slang/taboo.
- **PRD §10:** replace “see addendum” with a real pointer once the section exists — or two binding sentences if addendum stays lean.
- **FR-028 / FR-082 / FR-129 / FR-130:** optional AC nits (stage reads as path; card not calendar; discreet istikhara trigger; mahr not flirt-bargain) — only if the parent wants FRs to carry feel.

---

## Document control

- **Reconcile type:** input (brainstorm → PRD + addendum)
- **Date:** 2026-09-27
- **Does not modify** `prd.md` or `addendum.md`
- **Does not start** UX, architecture, or epics
