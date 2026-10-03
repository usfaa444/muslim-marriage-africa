> **Correction of record 2026-10-02 (Maitchibi Fayçal).** D1 “read-all” is superseded. After confirm the mahram grant list is empty; the sister grants individual threads and can revoke one or all. One-at-a-time pass/invite is the browse default, not a rejected dating pattern. Free-tier messages are admin-capped; Premium is unlimited invites and unlimited messages. Rows below that still say read-all are the 2026-09-27 brainstorm.

> **Correction of record 2026-10-01 (Maitchibi Fayçal).** AI moderation is passive. Chat is delivered immediately; the AI flags for an admin and does not block, hold, or delay a message. D4 and D32 below are the corrected wording. Photo blur/reveal and mahram read-only are unchanged.

# Brainstorm intent — Muslim marriage Africa (Burkina-first)

Marriage-focused Muslim matrimony (web + mobile) for African Muslim brothers and sisters. Launch Burkina Faso first (Ouagadougou, then Bobo-Dioulasso), then CI / Mali / Senegal / wider. The product is honorable ta'aruf — not dating: sister dignity never paywalled, optional sister-initiated verified mahram-in-chat, passive after-send AI on text/photo/voice (delivered immediately, then flagged for an admin), honest polygamy disclosure, XOF mobile money, French-first UI plus Mooré/Dioula audio. Become the reference for finding a Muslim spouse in Ouagadougou/Bobo, then the region — not another dating app from Dakar.

## Stance & constraints

Bindings for the product brief (assumptions and decisions from the memlog only):

- Burkina first (Ouagadougou → Bobo-Dioulasso); then CI/Mali/Senegal/wider.
- French-first UI. Mooré and Dioula audio (D18) is a differentiator, not a nice-to-have. English/Arabic full UI is LATER.
- XOF pricing. Mobile money first: Orange Money BF, Moov Africa BF, Wave/Coris where available. Cards secondary.
- Sisters' safety and dignity are never paywalled: verification, blur, mahram, reporting always free in both sister-access modes. Sister invite reach defaults free and unlimited; the admin can switch sisters onto the same paid quota as brothers (corrected 2026-10-02). Brothers stay on the paid quota. Do not monetise safety.
- AI moderation covers text, images, and audio **after** delivery; the AI flags an admin, who decides the action. When the AI is down the message stays delivered and a scan-deferred event is recorded. **Corrected 2026-10-01** (was: before delivery, fail closed).
- Mahram/wali is optional and sister-initiated. Wali is a process actor (flag, pause, end, propose meeting, later attest nikah).
- Marriage success reporting requires both parties to confirm. North-star metric: chaperoned meetings + dual-confirmed nikah — not DAU or inflated members.
- Farata statements use **only** evidence labels from `docs/competitor-farata.md`: Offered (seen) / Claimed (marketing) / Not publicly evidenced. No invented gaps.
- Product copy is mariage / ta'aruf / nikah / khitba. Ban “dating / rencontre romantique.” Entertainment-seeking is non-marriage use (P44).
- Khalwa-safe: no 1:1 live video/voice until wali present or a chaperoned family meeting is scheduled; text + async moderated voice until then. Live video even with wali is LATER (khalwa-sensitive).
- Woman's consent is first-class: sister must explicitly accept before any chat opens; decline is quiet (no guilt timer; brother only sees not-accepted).
- Haya-default media: opposite-gender photos blurred by default; voice optional and pre-moderated; GIFs/stickers only from a curated modest set.
- Verification is a public good: phone OTP + liveness selfie + ID are free; badges show phone / ID / wali-verified. Never sell a “looks verified” Premium badge.
- Never use member likeness in ads/social without explicit per-use opt-in.
- Publish only proof-backed counters (verified members, verified marriages, moderation stats). Never invent scale.
- Small-community doxxing resistance: default pseudonym, city-level location; quartier optional and hidden until match.
- Honest polygamy disclosure required for brothers (single / already married + wives / open to polygyny) and visible before a sister accepts. Never claim ID proves marital status.
- Web + PWA MUST; store-listed native Android (thin wrapper / TWA / Capacitor over the PWA) MUST for Burkina launch; native iOS is parity — deferred to NEXT (Apple store/build/compliance; BF is Android-first).
- Checkout: Orange Money BF / Moov Africa BF / Coris Money / Wave first; cards via Stripe secondary.
- No silent auto-renew on any rail; if a processor wants it, still require explicit repurchase.
- Boosts cannot buy safety bypass; ranking prefers verified + complete + wali-ready profiles.
- Thoughtful product owner aligned with `docs/system-idea.md` must-haves.
- Product name remains TBD (shortlist only; no purchase this run).
- **Every P1–P59 is required in the brief and PRD.** **D1–D23 plus D24–D40 are listed for the brief and PRD.**

## Wedge

Burkina-first honorable ta'aruf: sister dignity never paywalled, optional verified mahram-in-chat, passive after-send AI on text/photo/voice (delivered immediately, then flagged for an admin), honest polygamy disclosure, XOF mobile money, French + Mooré/Dioula audio — become **the** reference for finding a Muslim spouse in Ouagadougou/Bobo, then the region. Not “another dating app from Dakar.”

Farata has family-involvement as policy words (P45 Offered as rules; Not publicly evidenced as product). Homepage Claimed “AI scans every message” vs FAQ Claimed “we do not read private chats” is an evidenced contradiction. Blur is Offered (seen) [bundle] as all-or-nothing reveal-on-acceptance; per-viewer reveal/revoke is Not publicly evidenced. P54 testimonials Offered (seen) are app-experience quotes, not marriages. Local-fit lever: Farata is Senegal-first, French-only UI (Offered); BF is an SEO page (Offered). D17–D19 (entity, CIL, Orange Money BF/Moov BF, Mooré/Dioula audio, lite) are the launch moat.

## PARITY CARRY-FORWARD

**User requirement: implement EVERY Farata feature.** Every item **P1–P59** is a required feature for the product brief and PRD. Nothing from P1–P59 may be silently dropped. If deferred, it is marked **“parity — deferred to NEXT/LATER”** with a reason, never removed.

## P1–P59 mapping

Carry-forward titles from the memlog. Split items appear in both buckets; deferred slices carry the memlog reason.

### MVP MUST

- **P1** email+password+pseudo+gender — harden with phone OTP (D13) + captcha + expiry resend + reset + remember-me
- **P2** Google+Apple sign-in — Google at launch; Apple with iOS when apps ship; explore Orange/Moov identity; do not depend on Google-only in BF
- **P3** sincerity pledge — plus gentle reaffirmation if behaviour looks like entertainment browsing
- **P4** email verify
- **P5** captcha
- **P6** reset+remember
- **P7** guided onboarding — lite split: minimum-to-browse vs complete-to-send-request; Mooré/Dioula audio so low-literacy users complete without reading French
- **P8** human review + paid faster perk — published free SLA; paid buys a faster queue, not a rubber stamp; train on BF photo-modesty norms
- **P9** ID+selfie Verified badge — **free**, separate from Premium (D13)
- **P10** photo required to contact, may blur — sisters may remain blurred until reveal-on-match or reveal-on-request (D8)
- **P11** edit + photo remod
- **P12** deactivate — named life-pauses (Ramadan, exams, travel, grief) with one-tap reactivate
- **P13** self-serve delete — instant + export + status page + real ticketing (D15)
- **P14** age gate — parity 19+ unless legal review says 18 (open question)
- **P15** profile fields — completeness meter that names missing Islamic criteria without shaming
- **P16** Islamic criteria madhhab/confrérie/hijra/practice — MUST: madhhab, practice, intentions; confrérie+hijra included if cheap (else the extra taxonomy is NEXT)
- **P17** search filters incl. distance — basic filters MUST (location/marital/religious/life plans); lite grid of cached profiles per session
- **P21** grid browse
- **P22** favourites + who favourited me — **private list MUST**; “who favourited me” is NEXT
- **P23** visitors list — **internal T&S use of visit patterns MUST**; member-facing list is NEXT
- **P28** contact request accept/decline + lists — first Message Flash wali-visible from minute one if sister already attached a mahram
- **P29** no resend after refuse
- **P30** daily request quota by tier — brothers always on a paid quota; sisters default unlimited free invites, and the admin can apply the same quota (corrected 2026-10-02, D20)
- **P31** Message Flash — simple personalised first message
- **P32** AI Ice Breakers — **deen/family templates MUST**; AI-personalised slice is NEXT
- **P33** realtime chat typing/reactions/GIFs/stickers/photos — MUST: typing, reactions, photo share (gallery/camera); GIFs/stickers NEXT
- **P34** voice messages — French/Mooré/Dioula; delivered immediately, then STT + audio-classified in the background (D4 + D18). Mooré/Dioula: Whisper has no mos/dyu; word lists + human review are the passive scan, not a pre-delivery hold
- **P35** push notifications — messages/requests/visits; plus wali digest, reveal-requests, moderation outcomes, quiet hours
- **P36** web+PWA+iOS+Android — **WEB + PWA MUST**; **store-listed native Android** (thin wrapper / TWA / Capacitor over the PWA) **MUST** for Burkina launch; native iOS NEXT
- **P37** AI message moderation — chat text, chat photos, and voice notes are delivered immediately, then scanned in the background; a flag goes to an admin (D4). Profile photos and bio stay publish-gated
- **P38** photo strike rule — keep 3-strike / 24h block as floor (can tighten)
- **P39** published photo rules — pictograms + French text + Mooré/Dioula audio (D40)
- **P40** blur toggle/default/reveal-on-accept/unblur — raise to per-viewer reveal/revoke (D8)
- **P41** report + SLA — published 24h report SLA
- **P42** block
- **P43** sanctions + false-report sanctions
- **P44** code of conduct — entertainment-seeking as non-marriage use; multi-account fingerprint (D7)
- **P45** family-involvement guidance — rules PLUS product D1
- **P46** data protection — encryption, rights, DPA, 72h breach + CIL (D17)
- **P47** cookie consent — never implies rights to reuse profile photos in campaigns (D10)
- **P48** contact form + FAQ — ticketed contact form (not Gmail-only)
- **P50** Académie library — **minimum 5 scholar-reviewed articles** (wali, mahr, rights, haya, honesty)
- **P52** programmatic SEO incl. Ouaga/BF — **Ouagadougou, Bobo-Dioulasso, Burkina Faso** pages first with local imam-reviewed copy
- **P55** freemium FCFA — one XOF pricing page; launch vs normal price disclosed
- **P56** Premium perks bundle — Premium structure minus paywalled safety; pay for reach/convenience only
- **P57** 1/3/6 mo no silent auto-renew — advertise as a trust feature in French and Mooré/Dioula audio (D16)
- **P58** payment rails incl. Orange/Wave/Moov/MTN/cards — BF launch: Orange Money BF, Moov Africa BF, Wave/Coris, cards
- **P59** published CGV/refunds — no homepage-vs-CGV contradiction

### NEXT (parity — deferred to NEXT)

- **P16** confrérie+hijra fields if not in MUST — *parity — deferred to NEXT: extra taxonomy*
- **P18** advanced filters tier — *parity — deferred to NEXT: paid convenience after basic P17 works*
- **P19** AI compatibility + detailed score — *parity — deferred to NEXT: needs grounded model (D21); ship rule-based overlap as interim*
- **P20** daily recs that learn — *parity — deferred to NEXT: needs usage data*
- **P22** who-favourited-me — *parity — deferred to NEXT: vanity Premium; private favourites can ship MUST*
- **P23** member-facing visitors list — *parity — deferred to NEXT: vanity/stalking; internal T&S use of visit patterns is MUST*
- **P24** online-now — *parity — deferred to NEXT: stalking risk; add sister hide-online control (safety > vanity)*
- **P25** boosts — *parity — deferred to NEXT: pay-to-win tension; ship after quotas proven; cannot bypass request quotas or moderation (D37)*
- **P26** Premium badge — *parity — deferred to NEXT: after payments live; paid status only, not verification*
- **P27** anonymous mode + visibility controls — *parity — deferred to NEXT: Farata behaviour unknown (Claimed); ship our D36 definition*
- **P32** AI-personalised Ice Breakers — *parity — deferred to NEXT: wait for grounded coach (D21); templates MUST*
- **P33** curated GIFs/stickers — *parity — deferred to NEXT: pack design time*
- **P36** native iOS — *parity — deferred to NEXT: Burkina launch is Android-first (web + PWA + store-listed Android wrapper); Apple store/build/compliance cost, not dropped*
- **P49** AI marriage coach — *parity — deferred to NEXT: scholar-review + one persona, not a mufti (D21); no “Cheikh” title / dual coach names*
- **P50** full Académie library — *parity — deferred to NEXT: after seed articles*
- **P51** blog — *parity — deferred to NEXT: editorial capacity; human-review all copy (Farata blog leaked AI-prompt text — Offered)*
- **P52** remaining city/country/intent SEO — *parity — deferred to NEXT: after BF trio*
- **P53** promo video — *parity — deferred to NEXT: production; human-review all copy*
- **P54** testimonials carousel — *parity — deferred to NEXT: wait for real D11/D12 stories or modest process quotes; no invented marriages; demote placement vs verified-marriages counter; carousel will be fed by real D11/D12 stories*
- **P56** remaining perks (HD 10 photos, unlimited coach, priority 7/7, &lt;10min validation) — *parity — deferred to NEXT: after core Premium*

### LATER (parity — deferred to LATER)

None of P1–P59 are dropped.

- **P51** full blog cadence — *parity — deferred to LATER if NEXT capacity is tight: content production, not strategic rejection*
- **P53** high-production video — *parity — deferred to LATER if NEXT capacity is tight: content production, not strategic rejection*

## DIFFERENTIATORS

All required in the brief and PRD. D1–D23 from competitor §7; D24–D40 from this session.

### D1–D23 (carry-forward)

| ID | Title | Horizon |
| --- | --- | --- |
| D1 | Mahram-in-chat read-all, sister-initiated, verified wali can flag/pause/end | MUST |
| D2 | Wali dashboard multi-ward + digest + priority flags | NEXT |
| D3 | Chaperoned-meeting/khitba planner with wali in loop | NEXT (full) |
| D4 | Chat text, chat photos, and voice notes delivered immediately, then scanned (STT+classifier; local-language word lists). A flag reports to an admin; the AI does not block or hold delivery. Profile photos and bio stay publish-gated. **Corrected 2026-10-01** (was: every modality before delivery) | MUST |
| D5 | Scam and off-platform guardrails (money, phone, WhatsApp, links) | MUST |
| D6 | Honest consistent moderation policy + member appeal | MUST |
| D7 | Report→strike→ban pipeline, console, evidence, fingerprinting, transparency stats | MUST (MVP-scale) |
| D8 | Per-viewer reveal (match/request/never) + revoke | MUST |
| D9 | Anti-leak watermark, screenshot notice, no downloads, blurred notification thumbs | NEXT |
| D10 | Never use profiles in marketing without per-use opt-in | MUST |
| D11 | We-got-married joint report, optional private nikah proof, joint married state | MUST |
| D12 | Verified success-story showcase + verified-marriages counter | MUST (consent-based story submit + showcase page + honest counter starting at 0); NEXT (curated rich showcase polish/marketing) |
| D13 | Verification free for everyone, separate from Premium, levels phone/ID/wali | MUST |
| D14 | Declared marital status honesty + polygamy intent | MUST |
| D15 | Deletion that works + export + status + ticketing | MUST |
| D16 | Transparent consistent pricing, no dark patterns | MUST |
| D17 | Burkina-first entity, CIL, Orange Money BF/Moov Africa BF/Coris/Wave, XOF | MUST |
| D18 | French first + Mooré/Dioula audio + Arabic + English diaspora | MUST (FR + audio); Arabic/English UI LATER |
| D19 | Low-bandwidth lite mode | MUST |
| D20 | Sister invite reach defaults free/unlimited; admin can apply the same quota as brothers; wali/safety always free. **Corrected 2026-10-02** (was: sisters always free) | MUST |
| D21 | Grounded coach, scholar-reviewed, not a mufti, one persona | NEXT |
| D22 | Working public imam-reviewed Académie (Sahel context) | NEXT (seed articles MUST via P50) |
| D23 | Trust by proof + independent imam/advisory board | NEXT (board can start MUST as 2–3 names) |

### D24–D40 (this session)

| ID | Title | Horizon |
| --- | --- | --- |
| D24 | Structured ta'aruf stages in product (at least invite / chat / meeting / married) | MUST |
| D25 | Istikhara companion (reminder + private journal, not a fatwa) | NEXT |
| D26 | Mahr conversation card | NEXT |
| D27 | USSD/SMS essential path (SMS alerts MUST; USSD if feasible) | MUST |
| D28 | Shared-device PIN mode | MUST |
| D29 | Mosque/imam attestation level | NEXT |
| D30 | Prayer/night quiet hours (default no push between Isha and Fajr local time) | NEXT |
| D31 | Moderator dual-control / audit / wellness | NEXT |
| D32 | AI outage does not delay delivery. Record a scan-deferred event for the admin queue. **Corrected 2026-10-01** (was: fail-closed hold of undelivered media) | MUST |
| D33 | Alumni mentorship (read-only advice, not matchmaking) | LATER |
| D34 | Optional language filters with anti-caste design (Mooré/Dioula/Fulfulde/French) | NEXT |
| D35 | Match-visible change-audit (marital status or photos) | NEXT |
| D36 | Anonymous-mode defined (hide last-seen + hide from browse except people you requested) | NEXT |
| D37 | Boosts cannot bypass safety; verified/wali-ready ranking preference | NEXT |
| D38 | Sister can remove/report abusive wali; emergency hide; wali cannot send as her | MUST |
| D39 | Age/liveness hold for suspected minors | MUST |
| D40 | Pictogram + audio photo rules for low literacy | MUST |

LATER (non-parity, from D-mapping): English/Arabic full UI; diaspora-heavy features beyond hijra field; live video even with wali (khalwa-sensitive).

## MVP MUST / NEXT / LATER product clusters

### MVP MUST (BF launch)

Accountable identity; haya-safe profiles; invite/accept/decline; wali-optional chat; passive after-send moderation on chat media; BF payments + lite + French/audio; sisters-free safety; honest polygamy; working delete; dual-confirmed marriage close (D11); consent-based success-story page + honest verified-marriages counter starting at 0 (D12); web + PWA + store-listed Android; proof-not-hype landing (Ouaga/Bobo/BF).

### NEXT

Learning recs; vanity social proof (visitors / online / boosts); native iOS; full coach / Académie / blog / video; watermarks; meeting planner polish; curated rich marriage-showcase polish/marketing.

### LATER

Alumni circle; full multilingual UI; live video; regional expansion playbooks beyond BF.

## Must-have coverage check

`docs/system-idea.md` must-haves override prior horizon choices. All six are MVP MUST:

| # | Must-have | P / D ids | Horizon |
| --- | --- | --- | --- |
| 1 | Profiles: create/submit, browse, invite, accept/decline, who invited, who accepted, messaging after match | P7, P15, P21, P28, P31, P33 | MUST |
| 2 | AI moderation of messages, photos, voice + report/ban pipeline | P37, P34, P38, D4, D7, P41, P42, P43 | MUST |
| 3 | Photo blur with reveal-on-match / reveal-on-request | P40, D8 | MUST |
| 4 | Mahram in chat | D1, P45 | MUST |
| 5 | Marriage success reporting → showcase stories | D11 (full); D12 MUST slice (consent story submit + showcase page + honest counter starting at 0); P54 NEXT (fed by real D11/D12) | MUST (P54 stays NEXT parity) |
| 6 | Security & verification | P8, P9, P41, P46, D5, D6, D13 | MUST |

## Top 8 themes

1. Honorable ta'aruf process
2. Sister safety & haya
3. Auditable trust (free verification, real metrics, CIL)
4. All-media moderation + human pipeline
5. Burkina/local fit (languages, money, lite, entity)
6. Fair freemium (brothers pay for reach)
7. Marriage outcomes as the product
8. Education without false religious authority

## Name shortlist

Point-in-time RDAP 2026-09-27 ~21:10 ET. **Not a purchase.** No domain bought.

| Candidate | Meaning / note | .com | .net |
| --- | --- | --- | --- |
| **Nisfuddin** | half the deen | FREE | FREE |
| nisfdin (also buy) | shorter form | FREE | FREE |
| **Nikahsira** | nikah + Jula sira; confirm Dioula with native speakers | FREE | FREE |
| **Sakinaa** | sakina.com/.net TAKEN | FREE | FREE |
| Mithaqun (alternate) | — | FREE | FREE |
| **Nonglem** (wildcard, Mooré) | native-speaker check | FREE | FREE |
| **Dannaya** (wildcard, Jula) | — | TAKEN | FREE |

**Next steps (from log):** OAPI/WIPO trademark; native-speaker check; handles; user test Ouaga/Bobo. Name still TBD.

## Top risks & controls

- Fake profiles → D13 + P8 + P9 (no public visibility until phone OTP + liveness + ID + human review)
- Romance/money scams (Wave/Orange Money asks) → D5 classifiers; P44 ban; in-chat education “never send money to a suitor”
- Married men posing single → D14 required disclosure + dedicated report reason + pattern flags; never claim ID proves marital status
- Catfish / stolen photos → liveness selfie matched to profile photos + P38
- Indecency (voice/chat-photo slips) → D4 deliver-then-scan + admin flag queue + local-language word lists; D32 scan-deferred when AI is down (corrected 2026-10-01; was pre-delivery hold / fail-closed)
- Screenshot leaks of sister photos → D8 + D9 (watermark, screenshot notice, no download, revoke, blurred thumbs)
- Fake wali → D1 verify (ID+phone, sister confirms relationship, cooling-off; wali cannot be an unmatched male friend) + D38
- Post-decline harassment → P29 + D7 fingerprint
- Off-platform grooming to WhatsApp → D5 detect numbers/handles; share contact only after mutual + optional wali
- False-report weaponization → P43 sanctions, evidence required, rate limits, dual review
- Moderator abuse / peek / leak → D31 RBAC, audit log, watermarked console, dual-control unblur, staff vetting
- Breach / doxxing in a small community → P46 + D17 + coarse geo; no staff bulk export; D15 owner-only
- Minors → P14 age gate + ID DOB + D39 facial-age hold
- Shared-phone exposure → D28 PIN + session timeout (wali accounts too)
- Paid boost flood → D37 cannot bypass quotas or moderation
- Coercive/abusive wali → D38 sister remove/report; emergency hide; wali cannot send as her
- AI jailbreak via Dioula/Mooré slang → D4 local keyword lists + fail-to-human on low confidence
- Imam/public-figure impersonation → name-collision review in P8 + P9
- Weaponize success-story to dox an ex → both confirm; either can refuse public story; proof stays private
- Payment provider down → free-tier and all safety features stay up
- AI vendor down → message already delivered; scan-deferred for admin (D32, corrected 2026-10-01)
- Mosque rumor that the app is haram/dating → D23 named board, public fiqh notes, zero dating language, working Académie (D22)
- Competitor ships shallow wali digest → keep wedge product-deep (D1–D2 verified, sister-initiated, read-all, pause/end)
- Viral indecent leak → kill-switch, mass revoke of reveals, user notification, transparency note (D7/D9)
- Week-long data/electricity strain in Ouaga → SMS/USSD essential path + lite mode (D19)
- Farata undercuts on price from Senegal → compete on dignity, local payments, languages, verified marriages — not a race to 0 FCFA

## Open questions

- Age gate: keep Farata parity 19+ (P14) or 18+ (Burkina majority) with extra protections for 18–21? Legal + fiqh + store ratings (17+/18+) must be decided.
- Native-speaker validation: do Nikahsira (Jula sira) and Nonglem (Mooré) read as intended in Ouaga/Bobo, or is there slang/taboo?
- Wali verification in practice: what documents prove father/brother/uncle without excluding orphans or converts? Who is an acceptable mahram if father is deceased?
- Polygamy UX: how to disclose existing wives without doxxing them? First-wife awareness is out of scope unless she consents — confirm.
- Data residency: can we keep BF-user data in a place CIL accepts while still using modern hosting (Farata: Vercel/Neon USA — Claimed processors)?
- Fail-closed UX: **resolved 2026-10-01.** Messages are not held when the AI is down. No tolerance question remains.
- USSD/SMS: which BF operators and what cost per wali alert is sustainable at launch?
- OAPI trademark + social handles for Nisfuddin / Nikahsira / Sakinaa — not done.
- Imam advisory: which Ouaga/Bobo scholars will lend names, and what review SLA for Académie?
- P8 SLA: what free review time is honest in BF (Farata claims 12–24h / 30min / 10min Premium — numbers disagree, Claimed)?
- Anonymous mode exact rules (Farata Claimed, behaviour unknown) — confirm D36 definition with sisters.
- Should sisters ever see a brother’s clear photo before accept if he chose unblurred? Default yes if he opted out of blur; confirm.
- GIFs/stickers: is a zero-GIF launch acceptable until a curated pack exists (P33 NEXT)?
- Free Money / MTN MoMo (P58) — keep as parity rails for later countries; BF launch uses Orange/Moov/Wave/Coris/cards?

## Out of scope for next skill

- **No architecture.** Do not start architecture in the product-brief run.
- **Name still TBD.** Shortlist only; RDAP is point-in-time, not a purchase.
- This artifact is intent for `bmad-product-brief` (then PRD). It is not a brief, PRD, or architecture.
