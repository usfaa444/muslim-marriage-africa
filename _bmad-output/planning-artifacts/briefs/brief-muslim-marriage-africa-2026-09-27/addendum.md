---
title: AnKanu — product brief addendum
status: complete
created: 2026-09-27
updated: 2026-10-03
---

# Addendum — overflow for the AnKanu brief

This file holds depth that the brief points at but does not need in the executive spine: the full risk table, persona / job maps, and options considered. It is not a PRD and not architecture.

Sources: `_bmad-output/brainstorming/brainstorm-muslim-marriage-africa-2026-09-27/` (intent + memlog), `docs/competitor-farata.md`, `docs/system-idea.md`, `docs/name-options.md`.

## 1. Full risk table

| # | Risk | Control |
| --- | --- | --- |
| 1 | Fake profiles | D13 + P8 + P9: no public visibility until phone OTP + liveness + ID + human review |
| 2 | Romance / money scams (Wave / Orange Money asks) | D5 classifiers; P44 ban; in-chat education “never send money to a suitor” |
| 3 | Married men posing single | D14 required disclosure + dedicated report reason + pattern flags; never claim ID proves marital status |
| 4 | Catfish / stolen photos | Liveness selfie matched to profile photos + P38 |
| 5 | Indecency (voice / chat-photo slips) | D4 deliver-then-scan + flag-for-admin + local-language audio lists; D32 scan-deferred (no hold) |
| 6 | Screenshot leaks of sister photos | D8 + D9 (watermark, screenshot notice, no download, revoke, blurred thumbs) |
| 7 | Fake wali | D1 verify (phone OTP, sister confirms relationship, cooling-off; wali cannot be an unmatched male friend) + optional ID badge; grant-scoped threads; D38 |
| 8 | Post-decline harassment | P29 + D7 fingerprint |
| 9 | Off-platform grooming to WhatsApp | D5 detect numbers/handles; share contact only after mutual + optional wali |
| 10 | False-report weaponization | P43 sanctions, evidence required, rate limits, dual review |
| 11 | Moderator abuse / peek / leak | D31 RBAC, audit log, watermarked console, dual-control unblur, staff vetting (D31 is NEXT; MVP uses least-privilege + audit log as a floor) |
| 12 | Breach / doxxing in a small community | P46 + D17 + coarse geo; no staff bulk export; D15 owner-only |
| 13 | Minors | P14 age gate 19+ + ID DOB + D39 facial-age hold |
| 14 | Shared-phone exposure | D28 PIN + session timeout (wali accounts too) |
| 15 | Paid boost flood | D37 cannot bypass quotas or moderation |
| 16 | Coercive / abusive wali | D38 sister remove/report; emergency hide; wali cannot send as her |
| 17 | AI jailbreak via Dioula / Mooré slang | D4 local keyword lists + flag-for-admin or scan-deferred on low confidence; voice already delivered |
| 18 | Imam / public-figure impersonation | Name-collision review in P8 + P9 |
| 19 | Weaponize success-story to dox an ex | Both confirm; either can refuse public story; proof stays private |
| 20 | Payment provider down | Free-tier and all safety features stay up |
| 21 | AI vendor down | Delivery already happened; record scan-deferred for the admin (D32) |
| 22 | Mosque rumor that the app is haram / dating | D23 named board, public fiqh notes, zero dating language, working Académie seed (D22 / P50) |
| 23 | Competitor ships a shallow wali digest | Keep wedge product-deep (D1–D2 verified, sister-initiated, grant-scoped read-only, pause/end) |
| 24 | Viral indecent leak | Kill-switch, mass revoke of reveals, user notification, transparency note (D7 / D9) |
| 25 | Week-long data / electricity strain in Ouaga | SMS / USSD essential path + lite mode (D19, D27) |
| 26 | Farata undercuts on price from Senegal | Compete on dignity, local payments, languages, verified marriages — not a race to 0 FCFA |
| 27 | Multi-account ban evasion | D7 device / phone / ID fingerprint and linked-account bans (P44) |
| 28 | Insider bulk-export of contact lists | No staff bulk export; D15 export is owner-only; need-to-know access |
| 29 | Screenshot of wali dashboard on a shared phone | Wali PIN + session timeout + D28-like lock on guardian accounts |
| 30 | Social-engineer an unblur then screenshot | Time-limited reveal, revoke, watermark, re-blur on report (D8 + D9) |
| 31 | Admin switches sisters onto brother quota after launch | Mode applies to subsequent invites only; safety stays free; do not delete sent invites (D20) |
| 32 | Free sister chats forever with a free brother | Free-tier daily message cap (admin-set) applies to both; Premium unlocks unlimited messages; `free_unlimited` does not lift the message cap |
| 33 | Mahram receives every conversation after OTP | After phone invite + OTP he sees only threads she grants; she can revoke one thread or his entire permission; read-only on delivered messages; he cannot send as her (D1) |

## 2. Personas and job maps

Condensed from the brainstorm JTBD / role-playing pass. Functional / emotional / social jobs only; not a research sample.

### Sisters

- **Functional:** find a practicing brother without exposing face or phone → blur-by-default + no phone/WhatsApp until mutual accept and optional wali (D8, D5). Discover and people lists default to one focused card with shared traits; optional grid (P21).
- **Functional:** let my father/brother read the conversations I grant so I am not in khalwa → mahram-in-chat grant-scoped (D1).
- **Functional:** revoke one brother thread or the mahram's entire permission → D1 + D38.
- **Functional:** know before I invest hope whether he is already married or wants a second wife → D14 visible pre-accept.
- **Functional:** decline without drama or follow-up → P29 no-resend + silent decline + one-tap block (P42).
- **Functional:** start a conversation without buying Premium by default → D20 `free_unlimited`; if the admin has switched to `same_quota_as_brothers`, same Free-tier invite cap as brothers. Free-tier messages stay capped unless she has Premium.
- **Functional:** guarantee my photo will not appear in Instagram ads → D10 per-use opt-in only.
- **Functional:** use this on ~1GB/month → D19 lite + compressed images + no autoplay video.
- **Emotional:** feel haya-safe and still hopeful → dignity-first free safety stack (D20).
- **Emotional:** not be recognised and mocked in my quartier → P27 / D36 discreet + coarse geo.
- **Emotional:** trust that a no stays a no → post-decline no-contact + new-account fingerprint (D7).
- **Social:** my family can say this path was honorable → wali in product + later meeting planner (D1–D3).
- **Social:** show married cousins a real Ouaga/Bobo couple, not anonymous app-experience quotes (Farata P54 Offered (seen) are not marriages) → D12.

### Brothers

- **Functional:** see sisters who share practice / madhhab / hijra plans one profile at a time → P16–P21 default one focused card with shared traits; optional grid.
- **Functional:** declare polygamy intent once so I am honest and not later reported → D14 as self-serve.
- **Functional:** send a sincere first message, not a pickup line → P31 / P32 Ice Breakers grounded in deen and family.
- **Functional:** pay in XOF with Orange Money without a foreign card → P58 / D17.
- **Functional:** know when to involve her wali so I do not overstep → D1 presence banner + later D3 meeting CTA.
- **Emotional:** be seen as a serious suitor, not a player → P3 pledge + invite quotas (P30) + free-tier message cap (P33).
- **Emotional:** not waste months on a fake or romance-scam profile → D13 verification levels visible.
- **Social:** my mother will ask who her family is → family-intro fields + D3 meeting planner (NEXT).
- **Brother already married (polygyny):** a path that is honest so I am not a liar before Allah → D14 + P3 pledge wording that names honesty about existing marriage.

### Walis / mahrams

- **Functional:** see the conversations my ward grants me, without creating a dating-app identity → D1 now (grant-scoped); D2 guardian dashboard NEXT.
- **Functional:** pause or end a chat that becomes inappropriate → D1.
- **Functional:** weekly digest, not 40 pings → D2 NEXT.
- **Functional:** prove I am really her father/brother → phone OTP + declared relationship + sister confirm; optional ID badge. No kinship papers in MVP (brief A2).
- **Functional:** propose a mosque / family meeting both sides can accept → D3 NEXT.
- **Emotional:** I failed if she is harmed; I need evidence if I must confront a man → wali-visible chat; later attestation export.
- **Social:** other fathers at the mosque will ask if this app is serious → D23 board + D12 verified marriages.

### Moderators / T&S

- **Functional:** one case with text / photo / audio + model scores + user report + device history → D7 console.
- **Functional:** catch the same phone/device opening new accounts after a ban → D7 fingerprinting (P44).
- **Functional:** not be the only moral authority — escalate fiqh-edge cases to the advisor board → D21 / D23 deferral.
- **Functional:** be audited so I cannot peek at unblurred sister photos for curiosity → access logs + dual-control unblur (D31 NEXT; audit floor in MVP).
- **Emotional:** not burn out on indecent media → auto-blur in console + rotation / wellness (D31 NEXT).
- **Social:** a wrongful ban in a small city is a reputation disaster → D6 appeal + second human review.
- **Tone:** French macros that are respectful when warning a member in Ouaga French → templated, reviewed sanction language.

### Married couples

- **Functional:** tell the community we found each other here without exposing private chat → D11 / D12 public story, private proof.
- **Functional:** close both accounts so neither stays “available” → joint married state (D11).
- **Functional (LATER):** optionally mentor a new sister/brother with read-only advice, not matchmaking (D33).
- **Emotional:** our story should help others make du'a, not turn us into celebrities → faces optional/blurred, no chat excerpts.
- **Social:** both families approve before a story goes public → extra consent gate on D12.

## 3. Options considered

### 3.1 Age gate

| Option | Why considered | Disposition |
| --- | --- | --- |
| 19+ (Farata parity) | Conservative; matches competitor Mentions légales Claimed 19+ | **Chosen for this brief** as [ASSUMPTION] A1; legal review before launch |
| 18+ (civil majority) with extra 18–21 protections | May match BF law / store 18+ | Rejected for launch default until counsel speaks; fallback if law requires it |
| 21+ | Extra conservative | Rejected: excludes too many marriage-ready adults |

### 3.2 Wali proof

| Option | Why considered | Disposition |
| --- | --- | --- |
| Kinship documents (birth cert, livret de famille) | Strongest anti-fake-wali | **Rejected for MVP** — excludes orphans, converts, paper-poor families |
| Phone invite + OTP + declared relationship + sister confirm + optional ID badge | Workable floor | **Chosen** as [ASSUMPTION] A2 |
| Imam / mosque attestation as the only path | Local trust | Deferred to D29 NEXT as an extra level, not the gate |

### 3.3 Data residency

| Option | Why considered | Disposition |
| --- | --- | --- |
| Pick a region in the brief (EU / AF / US) | Feels decisive | **Rejected** — architecture decision |
| Ignore CIL until later | Speed | **Rejected** — launch-trust requirement (D17) |
| Comply with CIL + disclose hosting; region later | Honest | **Chosen** as [ASSUMPTION] A3 |

### 3.4 Platforms

| Option | Why considered | Disposition |
| --- | --- | --- |
| Web only | Cheapest | Rejected — owner asked for web + mobile; BF is Android-first |
| Web + PWA only | Fast | Rejected — store-listed Android is MUST for Burkina launch |
| Web + PWA + Android + iOS in MVP | Full Farata P36 parity | Split: iOS is parity — deferred to NEXT (cost), not dropped |
| Native Android rewrite | Quality | Rejected for MVP — thin wrapper / TWA / Capacitor over the PWA |

### 3.5 Blur model

| Option | Why considered | Disposition |
| --- | --- | --- |
| Farata-like all-or-nothing reveal-on-accept | Faster to build | Rejected as the only model — owner must-have #3 is per-viewer + revoke (D8) |
| Always-blur, never reveal | Maximum haya | Rejected — blocks ta'aruf when both want to see |
| Per-viewer match / request / never + revoke | Owner must-have | **Chosen** (MUST) |

### 3.6 Monetisation

| Option | Why considered | Disposition |
| --- | --- | --- |
| Farata: free users can only reply; start-chat is Premium (Offered (seen) [bundle]) | Known pattern | Rejected as the only model. Brothers stay on paid quota. Sisters default free/unlimited invites; admin can switch to the same invite quota (D20). |
| Hardcode sisters always free / never pay for reach | Original D20 | **Reversed 2026-10-02** (Maitchibi Fayçal). Replaced. |
| Admin-configurable sister access: default `free_unlimited`; switchable to `same_quota_as_brothers`; both modes day one | Owner locked decision | **Chosen** for invites. Mode change applies to subsequent invites only. |
| A mode that makes brothers free | Symmetry | **Rejected** — brothers stay on paid quota |
| Paywall safety (verification, blur, mahram, report, block) when sisters are on quota | Revenue | **Rejected** — do not paywall dignity |
| Chat after an accepted invite stays free for both genders | Prior brief (2026-10-02 D20 run) | **Reversed 2026-10-02** (Maitchibi Fayçal). Replaced by free-tier daily message caps. |
| Free-tier daily message cap (admin-set; number not locked); Premium unlocks unlimited invites AND unlimited messages | Owner locked decision | **Chosen.** Replaces a Premium invite cap such as 15. A free sister must not chat forever with a free brother. `free_unlimited` does not lift the message cap. |
| Lock a free-tier message-cap number in the brief | Convenience | **Rejected** — same kind of operator setting as `sister_reach_mode`; seed is admin-configurable placeholder only |
| Retroactive apply / delete sent invites on mode change | Clean slate | **Rejected** — subsequent invites only |
| Paywall verification | Revenue | Rejected — D13; never sell a “looks verified” badge |
| Race Farata to 0 FCFA | Acquisition | Rejected — compete on dignity and local fit |
| Freemium XOF, brothers pay for reach, 1/3/6 mo, no silent auto-renew | Trust + BF rails | **Chosen**; sister invite reach is admin-configurable (D20); messages quotaed on free tier; exact prices [ASSUMPTION] |

### 3.7 Name

**Chosen 2026-10-03** (Maitchibi Fayçal via Harris): product name is **AnKanu**. Domain **ankanu.com** purchased on Hostinger. The repository slug `muslim-marriage-africa` is not the product name.

2026-09-27 search history (not chosen; those domains were not bought): shortlist Nisfuddin / Nikahsira / Sakinaa; alternates Mithaqun / Nonglem. Dannaya (Jula “trust”) was not on the brief shortlist. The 2026-09-27 RDAP pass was point-in-time history, not a purchase and not current domain status for the product. Native-speaker checks on the shortlist are closed because those names were not chosen. OAPI/WIPO trademark and social-handle checks for **AnKanu** are still open.

### 3.8 Success proof on the homepage

| Option | Why considered | Disposition |
| --- | --- | --- |
| App-experience quote carousel as hero (Farata P54 Offered (seen)) | Familiar | Rejected as hero; P54 stays NEXT parity, demoted |
| Invented marriage counts | Marketing | Forbidden |
| Dual-confirm + honest counter at 0 + consent showcase | Owner must-have #5 | **Chosen** (D11 MUST; D12 MUST slice) |

### 3.9 Chat AI moderation model

| Option | Why considered | Disposition |
| --- | --- | --- |
| Before-delivery hold / fail-closed when AI is down | Original brief D4 / D32 | **Reversed 2026-10-01** (Maitchibi Fayçal). Replaced. |
| Passive deliver-then-scan; scan-deferred on outage | Recipients should not wait; AI outage must not hold chat | **Chosen.** D4 / D32 IDs kept, reframed. AI flags a human; admin decides warning, suspend, or another action |
| Profile photos / bio also send-first | Consistency with chat | **Rejected** — stay publish-gated |
| AI auto-blocks or auto-sanctions delivery | Safety | **Rejected** — AI does not block, hold, refuse, or apply a sanction |
| Drop contact-share blocks because AI is passive | Misread the reversal | **Rejected** — phone / WhatsApp / links still blocked until both members opt in; that is not the AI |

### 3.10 People-list presentation

| Option | Why considered | Disposition |
| --- | --- | --- |
| Grid of many faces as the default (P21 / P17 lite grid) | Farata-like browse; prior brief | **Reversed 2026-10-02** (Maitchibi Fayçal). Grid stays optional. |
| One focused card by default on discover and every people list, including search; shared traits under the photo; pass / invite / quick message (quotas apply); tap opens full profile; optional grid toggle on every such screen; many-filter search may open on the grid | Owner locked decision | **Chosen** for MVP day one |
| Treat one-at-a-time as a rejected dating-app pattern | Prior “not a swipe feed” line | **Rejected** — dishonest chrome only is rejected (fake presence, invented scale) |
| Fake presence (“online now”) or invented scale (“+247.8k actifs”) | Growth chrome | **Rejected** |

### 3.11 Mahram thread grant

| Option | Why considered | Disposition |
| --- | --- | --- |
| After phone invite + OTP, mahram reads every conversation (D1 read-all) | Prior brief / competitor teardown wording | **Reversed 2026-10-02** (Maitchibi Fayçal). Replaced. |
| She chooses which brother threads he may read; revoke one thread or his entire permission; read-only on granted, delivered messages; he cannot send as her | Owner locked decision | **Chosen.** D1 ID kept, reframed. |
| He can send as her | Convenience | **Rejected** — D38 unchanged |

## 4. Binding stance carried from the brainstorm

The AI-moderation line was overridden on 2026-10-01 (see 3.9). Sister reach (D20) was overridden on 2026-10-02 (see 3.6). People-list default, message quotas, and mahram thread grant were overridden on 2026-10-02 (see 3.6, 3.10, 3.11). Naming was locked on 2026-10-03 (see 3.7): AnKanu / ankanu.com. Other items were not re-litigated.

- Burkina first (Ouagadougou → Bobo-Dioulasso); then CI / Mali / Senegal / wider.
- French-first UI; Mooré/Dioula audio is a differentiator.
- AI moderation is passive: chat delivered then scanned; AI flags a human admin and does not block, hold, or refuse delivery. AI outage records scan-deferred and does not hold media. Profile photos and bio stay publish-gated. Contact-share still blocks phone numbers, WhatsApp handles, and links until both members opt in (not the AI).
- Mahram optional and sister-initiated. After phone invite and OTP he sees only threads she grants; she can revoke one thread or his entire permission; read-only on granted, delivered messages; he cannot send as her.
- Marriage report requires both parties.
- Farata statements use only the three evidence labels.
- Product copy: mariage / ta'aruf / nikah / khitba.
- Khalwa-safe: no 1:1 live A/V until wali present or chaperoned meeting scheduled.
- Woman’s consent first-class; quiet decline.
- Haya-default media; curated GIFs only.
- Sister access is admin-configurable on day one. Default `free_unlimited` (no invite quota, no paid pack for sister reach). Admin can switch to `same_quota_as_brothers` (same 1/3/6 packs and Free-tier daily invite cap). Brothers stay paid. Safety (verification, blur/reveal, mahram, report, block) stays free in both modes. Free-tier messages are daily-capped by the admin (number not locked). Premium unlocks unlimited invites AND unlimited messages. `free_unlimited` does not lift the message cap. Mode change applies to subsequent invites only.
- People lists default to one focused card (shared traits; pass / invite / quick message; quotas apply). Optional grid on every such screen. Many-filter search may open on the grid. Rejected chrome is fake presence and invented scale, not the one-at-a-time card.
- Verification is a public good; never sell a “looks verified” Premium badge.
- Never use member likeness in ads without per-use opt-in.
- Publish only proof-backed counters.
- Default pseudonym; city-level location; quartier hidden until match.
- Honest polygamy disclosure visible before a sister accepts.
- No silent auto-renew on any rail.
- Boosts cannot buy safety bypass.
- Thoughtful product owner aligned with `docs/system-idea.md`.

## 5. What this addendum is not

- Not a PRD (acceptance criteria, edge cases, API, copy deck).
- Not architecture (stack, region, vendors).
- Not a trademark filing. Name (AnKanu) and domain (ankanu.com) are decided; OAPI/WIPO and social handles for AnKanu remain open.
- Not legal advice — A1–A3 in the brief are flagged for counsel.
