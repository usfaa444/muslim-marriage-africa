---
title: muslim-marriage-africa — product brief
status: complete
created: 2026-09-27
updated: 2026-10-02
---

# Product Brief: muslim-marriage-africa

Working title only. Product name is TBD (see Naming). This brief is the planning spine for a marriage-focused Muslim matrimony product (honorable ta'aruf / nikah — not dating) that launches in Burkina Faso and must implement every Farata feature (P1–P59) plus the differentiators (D1–D40).

Read the narrative sections first (problem through pricing), then the two feature-scope lists. Overflow (full risk table, personas, options considered) lives in `addendum.md`.

## Executive summary

Muslim brothers and sisters in francophone West Africa who want a spouse need a path that is marriage-shaped, haya-safe, and locally usable. Today they improvise across family networks, WhatsApp, and Senegal-first apps. Farata (farata.net) is already live and is the primary comparable: French-only UI (Offered (seen)), Senegal-centric, family involvement as rules text (Offered (seen) policy; mahram-in-chat Not publicly evidenced), blur as all-or-nothing reveal-on-acceptance (Offered (seen) [bundle]; per-viewer reveal/revoke Not publicly evidenced), and homepage Claimed “AI scans every message” versus FAQ Claimed “we do not read private chats.” Testimonials Offered (seen) are app-experience quotes, not marriages. Marriage-success reporting is Not publicly evidenced.

This product is Burkina-first honorable ta'aruf: sister dignity never paywalled (safety stays free in both sister-access modes); sister reach defaults free and unlimited (`free_unlimited`), and the admin can apply the same invite quota as brothers (`same_quota_as_brothers`); free-tier messages are daily-capped by the admin, and Premium unlocks unlimited invites and unlimited messages; people lists default to one focused card (optional grid); optional sister-initiated verified mahram-in-chat on threads she grants; passive AI on chat text, chat photos, and voice (delivered then scanned; profile photos and bio stay publish-gated); honest polygamy disclosure; XOF mobile money; French-first UI plus Mooré/Dioula audio. Become the reference for finding a Muslim spouse in Ouagadougou and Bobo-Dioulasso, then the region — not another dating app from Dakar.

MVP ships web + installable PWA + store-listed Android. Native iOS is parity — deferred to NEXT (Android-first Burkina launch; Apple build/store cost), not dropped. All six owner must-haves from `docs/system-idea.md` are MVP. Every P1–P59 ships or is marked “parity — deferred to NEXT/LATER” with a reason. Nothing is dropped.

## Naming

Product name is **not decided**. No domain has been registered or bought. RDAP checks against Verisign on **2026-09-27 ~21:10 ET** are point-in-time only (HTTP 404 = free at check time; not a purchase, reservation, or hold). Premium/reserved pricing and trademark conflicts were not checked.

**Shortlist** (all `.com` + `.net` free at that RDAP check):

| Candidate | Meaning / note | .com | .net |
| --- | --- | --- | --- |
| **Nisfuddin** | “Half the deen” (hadith). Also consider buying `nisfdin` (also free). | free | free |
| **Nikahsira** | *nikah* + Jula *sira* (“path to nikah”). Confirm Dioula with native speakers. | free | free |
| **Sakinaa** | *sakina* (tranquillity, Ar-Rum 30:21). `sakina.com` / `.net` are taken. | free | free |

**Alternates** (also `.com` + `.net` free at the same check):

| Candidate | Meaning / note | .com | .net |
| --- | --- | --- | --- |
| **Mithaqun** | Solemn covenant (Qur’an 4:21 *mīthāqan ghalīẓā*). | free | free |
| **Nonglem** | Mooré wildcard (“love / affection”). Native-speaker check required. | free | free |

Pending before any name decision: native-speaker validation of Mooré/Dioula meanings (slang/taboo risk in Ouaga/Bobo); OAPI and WIPO trademark searches; social-handle check; user test with sisters, brothers, and walis in Ouagadougou and Bobo-Dioulasso.

## The problem

Practicing Muslim sisters and brothers in Ouagadougou and Bobo-Dioulasso who are ready for nikah lack a local, honorable, and trustworthy way to meet a spouse online.

How people cope today: family and mosque introductions (honorable but slow and socially exposed); WhatsApp and Facebook groups (fast, but khalwa-adjacent, unmoderated, and easy to scam via Orange Money / Wave); Senegal-first apps such as Farata (French-only Offered (seen); Burkina Faso is an SEO page Offered (seen); no Mooré/Dioula, no BF-specific rails, no CIL mention found).

Cost of the status quo: sisters pay with dignity (photos reused, blur that cannot be revoked per viewer, conversations without a mahram in the product); families cannot supervise without joining a dating-shaped chat; brothers who are already married can hide polygyny intent (an open-to-polygamy field is Not publicly evidenced at Farata); scale claims are marketing (Farata “+247.8k membres actifs” Claimed vs Google Play 10k+ downloads Offered (seen)). A leak or a trapped account in a small city kills mosque trust.

## Who this serves

| Actor | Who | What they need | Success |
| --- | --- | --- | --- |
| **Sisters** (primary) | Practicing Muslim women in BF, often on shared/low-end Androids, 1GB-class data, French ± Mooré/Dioula | Find a practicing brother without exposing face or phone; decline quietly; optional wali on threads she grants; never pay for safety; reach free by default (admin can apply brother invite quotas); free-tier messages capped unless Premium | A chaperoned path to nikah; photos stay under her control |
| **Brothers** (primary) | Practicing Muslim men, including those who must disclose existing marriage / polygyny intent | Honest criteria search; sincere first message; pay in XOF on Orange Money / Moov; be seen as a suitor, not a player | Accepted requests that become family meetings, then dual-confirmed nikah |
| **Walis / mahrams** (process actors) | Fathers, brothers, uncles, or other mahrams invited by the sister | Read-only on threads she grants; flag/pause/end those threads; she can revoke one or all; prove they are who they say; weekly digest later; not a dating-app identity | Ward is not in digital khalwa on the chats she opens to him; they can stop a granted chat |
| **Moderators / T&S** | Small trusted team, French + local-language support | One case file (text/photo/audio + scores + report + device); cannot peek unblurred photos for curiosity | Fast, appealable, auditable decisions |
| **Married couples** (outcome actors) | Members who completed nikah through the product | Joint close; optional private proof; consent-based public story; faces optional | Help others make du'a without becoming celebrities |

## Positioning and wedge vs Farata

**Wedge:** Burkina-first honorable ta'aruf — sister dignity never paywalled, sister reach free by default with an admin switch to the same invite quota as brothers, free-tier messages daily-capped (Premium unlocks unlimited invites and messages), people lists one card at a time by default, optional verified mahram-in-chat on sister-granted threads, passive AI on chat text/photo/voice (delivered then scanned), honest polygamy disclosure, XOF mobile money, French + Mooré/Dioula audio. The reference for a Muslim spouse in Ouagadougou/Bobo, then the region. Not “another dating app from Dakar.”

Farata statements below use **only** evidence labels from `docs/competitor-farata.md`. No invented gaps.

| Lever | Farata (labeled) | Our raise |
| --- | --- | --- |
| Family involvement | Rules §04 Offered (seen) as policy; mahram-in-chat **Not publicly evidenced** | D1 product: sister-initiated, verified, grant-scoped read-only, flag/pause/end on granted threads |
| AI moderation | Homepage Claimed “AI scans every message”; FAQ Claimed “we do not read private chats” (evidenced contradiction). Voice/chat-photo moderation **Not publicly evidenced** | D4 + D6: chat delivered then scanned; we say the AI flags a human and does not block |
| Photo blur | Offered (seen) [bundle]: all-or-nothing reveal-on-acceptance. Per-viewer reveal/revoke **Not publicly evidenced** | D8: per-viewer match / request / never + revoke |
| Success stories | P54 testimonials Offered (seen) are app-experience quotes, not marriages. Couples reporting marriage **Not publicly evidenced** | D11 dual-confirm + D12 honest counter starting at 0 |
| Dignity / paywall | Starting a conversation Premium-gated Offered (seen) [bundle]; “Badge Premium vérifié” bundled with Premium (Claimed) | D20 + D13: safety always free; sister reach defaults `free_unlimited`; admin can switch to `same_quota_as_brothers`; free-tier messages daily-capped; Premium unlocks unlimited invites and unlimited messages |
| Local fit | Senegal-first, French-only UI Offered (seen); BF is an SEO page Offered (seen) | D17–D19: CIL, Orange Money BF / Moov Africa BF, Mooré/Dioula audio, lite |
| Profile marketing | Rules §07 Offered (seen): profiles may be used in ads; opt-out on request | D10: never, without per-use opt-in |
| Deletion | Claimed; Play review reported broken (Offered (seen) as a user report) | D15: instant delete + export + status + ticketing |

Copy language is *mariage / ta'aruf / nikah / khitba*. Ban “dating / rencontre romantique.” Entertainment-seeking is non-marriage use (P44).

The launch advantage is execution of dignity and local fit, not a secret model. Farata already occupies the category. We raise the places their public evidence is weak or contradictory: mahram as a product on sister-granted threads (D1), deliver-then-scan on chat media stated honestly (D4/D6), per-viewer blur/revoke (D8), dual-confirmed marriages as the hero metric (D11/D12), free verification (D13), sister reach free by default with an admin-switchable invite quota (D20), free-tier message caps with Premium unlocking unlimited invites and messages, one-card people lists by default, and Burkina payments, languages, and CIL (D17–D19).

## The solution

A web + PWA + Android matrimony product that makes ta'aruf a visible process. People lists default to one focused card, not a grid of many faces. A one-at-a-time card is not a rejected dating-app pattern; what is rejected is dishonest chrome only — fake presence (“online now”) and invented scale (“+247.8k actifs”).

A sister creates a verified profile (phone OTP + liveness selfie + ID, free). Photos are blurred by default for the opposite gender; she reveals per viewer on match or on request, and can revoke. Discover, search, and every list of people open on one focused card. Under the photo, lightweight traits in common with the viewer (open to polygamy, same town, kids / accepts a partner with kids, and the other shared profile traits already in the product). Tap opens the full profile. On the card: pass (dismiss / swipe away), swipe or act to send an invite, or send a quick message. Those actions obey invite and message quotas. She can switch to a grid on every such screen; a many-filter search may open on the grid, but the single-card toggle stays.

Invites she sends are unlimited and free unless the admin has switched sisters onto the same invite quota as brothers. Chat opens only after she accepts. Free-tier messages are daily-capped by the platform admin; Premium unlocks unlimited invites and unlimited messages.

She may invite a mahram by phone; after OTP he does not receive every conversation — she chooses which brother threads he may read, and she can revoke one thread or his entire permission. He is read-only on granted, delivered messages and can flag, pause, or end those threads. He cannot send as her.

Chat text, chat photos, and voice notes send immediately. After send, a passive AI background-checks red flags and, if it flags, reports to an admin and flags the person. The admin decides suspend (if too indecent), a warning, or another action. The AI does not block, hold, or refuse delivery. Profile photos and bio stay publish-gated. Contact-share still blocks phone numbers, WhatsApp handles, and links until both members opt in (that is a product rule, not the AI). When both confirm “we got married,” accounts move to a joint married state; a public story is opt-in; the verified-marriages counter stays honest (starts at 0).

Khalwa-safe: no 1:1 live video/voice until a wali is present or a chaperoned family meeting is scheduled; text + async voice notes (delivered then scanned) until then. Live video even with wali is LATER. Woman’s consent is first-class: decline is quiet (no guilt timer; brother sees not-accepted only). Haya-default media; GIFs/stickers only from a curated modest set (pack is NEXT). Small-community doxxing resistance: default pseudonym, city-level location; quartier optional and hidden until match.

## Launch market and platforms

- **Launch:** Burkina Faso first — Ouagadougou, then Bobo-Dioulasso. Then Côte d’Ivoire, Mali, Senegal, wider.
- **UI language:** French-first. Mooré and Dioula **audio** (D18) is a differentiator, not a nice-to-have. Full English/Arabic UI is LATER.
- **Currency / rails:** XOF. Mobile money first: Orange Money BF, Moov Africa BF, Wave/Coris where available. Cards secondary (Stripe or equivalent).
- **MVP platforms:** web + installable PWA + store-listed Android (thin wrapper / TWA / Capacitor over the PWA).
- **Native iOS:** parity — deferred to NEXT. Reason: Burkina launch is Android-first; Apple build/store/compliance cost. Not dropped. Apple sign-in ships with iOS (P2).

## Must-have coverage

These six are the owner must-haves from `docs/system-idea.md`. All are MVP MUST, stated with their P/D ids.

| # | Must-have | P / D ids | Horizon |
| --- | --- | --- | --- |
| 1 | **Profiles:** create/submit, browse (one focused card by default; optional grid), send invite/match request, accept/decline, see who invited you and who accepted, messaging once matched | P7, P15, P21, P28, P31, P33 | MUST |
| 2 | **Passive AI moderation of chat text, chat photos, and voice notes AFTER delivery** (profile photos/bio stay publish-gated), feeding a report → strike → ban pipeline with human review | P37, P34, P38, D4, D7, P41, P42, P43 | MUST |
| 3 | **Photo blur** with per-viewer reveal-on-match / reveal-on-request and revoke | P40, D8 | MUST |
| 4 | **Optional, sister-initiated mahram/wali in chat** (grant-scoped read-only; can flag/pause/end granted threads; she revokes one or all) | D1, P45 | MUST |
| 5 | **Marriage success reporting** — joint “we got married,” both confirm — plus consent-based showcase and an honest verified-marriages counter. D11 full; D12 MUST slice (consent story submit + showcase page + counter starting at 0). P54 stays NEXT (fed by real D11/D12 stories) | D11; D12 MUST slice; P54 NEXT | MUST (P54 stays NEXT parity) |
| 6 | **Strong verification/security:** phone OTP + liveness selfie + ID, free and separate from Premium; reporting; blocking; sanctions | P8, P9, P41, P46, D5, D6, D13 | MUST |

## Feature scope — Parity with Farata (P1–P59)

User requirement: implement **every** Farata feature. Nothing in P1–P59 may be dropped. Deferred items are marked **parity — deferred to NEXT** or **parity — deferred to LATER** with a reason. Split items show both slices. Mapping is consistent with `brainstorm-intent.md`.

### Account and onboarding

| ID | Title | Horizon | Notes / reason if deferred |
| --- | --- | --- | --- |
| P1 | Email + password + pseudonym + gender | MVP | Harden with phone OTP (D13) + captcha + expiry resend + reset + remember-me |
| P2 | Google sign-in | MVP | Explore Orange/Moov identity; do not depend on Google-only in BF |
| P2 | Apple sign-in | **parity — deferred to NEXT** | Ships with native iOS; store-compliance reason, not dropped |
| P3 | Sincerity pledge | MVP | Plus gentle reaffirmation if behaviour looks like entertainment browsing |
| P4 | Email verification | MVP | Expiry + resend |
| P5 | Captcha / bot check | MVP | |
| P6 | Password reset + remember-me | MVP | |
| P7 | Guided onboarding | MVP | Lite split: minimum-to-browse vs complete-to-send-request; Mooré/Dioula audio so low-literacy users complete without reading French |
| P8 | Human review of every new profile + paid faster perk | MVP | Published free SLA; paid buys a faster queue, not a rubber stamp; train on BF photo-modesty norms. Honest SLA hours are an open question |
| P9 | ID + liveness selfie → Verified badge | MVP | **Free**, separate from Premium (D13) |
| P10 | Photo required to contact; may be blurred | MVP | Sisters may remain blurred until reveal-on-match or reveal-on-request (D8) |
| P11 | Edit profile; photo changes re-moderated | MVP | |
| P12 | Deactivate / reactivate | MVP | Named life-pauses (Ramadan, exams, travel, grief) with one-tap reactivate |
| P13 | Self-serve delete + full erasure | MVP | Instant + export + status page + real ticketing (D15) |
| P14 | Age gate | MVP | **19+** this brief (Farata parity, conservative). Legal review required — see Assumptions |

### Profiles, discovery, matching

| ID | Title | Horizon | Notes / reason if deferred |
| --- | --- | --- | --- |
| P15 | Profile fields (age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, photos) | MVP | Completeness meter that names missing Islamic criteria without shaming |
| P16 | Islamic criteria — madhhab, practice, intentions | MVP | Core religious criteria for ta'aruf |
| P16 | Islamic criteria — confrérie + hijra fields | **parity — deferred to NEXT** if not cheap enough for MUST | Extra taxonomy. Include in MVP if cheap |
| P17 | Search filters incl. distance | MVP | Basic filters: location / marital / religious / life plans. Default result is one focused card; optional grid. A many-filter search may open on the grid; the single-card toggle stays. |
| P18 | Advanced filters tier | **parity — deferred to NEXT** | Paid convenience after basic P17 works |
| P19 | AI compatibility + detailed score | **parity — deferred to NEXT** | Needs grounded model (D21); ship rule-based overlap as interim |
| P20 | Daily recommendations that learn | **parity — deferred to NEXT** | Needs usage data |
| P21 | Grid browse | MVP | Default on discover and every people list (including search): one focused card with shared traits under the photo; pass / invite / quick message (quotas apply); tap opens the full profile. Optional grid toggle on every such screen. A many-filter search may open on the grid. One-at-a-time is not rejected dating chrome. |
| P22 | Favourites — private list | MVP | Core save-for-later |
| P22 | Who favourited me | **parity — deferred to NEXT** | Vanity Premium; private favourites can ship MUST |
| P23 | Visit patterns — internal T&S use | MVP | Mass-view-then-never-request signal for mods |
| P23 | Member-facing visitors list | **parity — deferred to NEXT** | Vanity / stalking risk |
| P24 | Online-now indicator | **parity — deferred to NEXT** | Stalking risk; add sister hide-online control (safety > vanity) |
| P25 | Boosts / paid visibility | **parity — deferred to NEXT** | Pay-to-win tension; ship after quotas proven; cannot bypass request quotas or moderation (D37) |
| P26 | Premium badge | **parity — deferred to NEXT** | After payments live; paid status only, not verification |
| P27 | Anonymous mode + visibility controls | **parity — deferred to NEXT** | Farata behaviour unknown (Claimed); ship our D36 definition |

### Contact and messaging

| ID | Title | Horizon | Notes / reason if deferred |
| --- | --- | --- | --- |
| P28 | Contact request accept/decline + lists (sent / received / accepted) | MVP | Chat opens only after sister accepts. First Message Flash is wali-visible from minute one if she already attached a mahram |
| P29 | No resend after refuse | MVP | |
| P30 | Daily request quota by tier | MVP | Brothers always on a Free-tier daily invite cap. Sisters default `free_unlimited` (no invite quota). Admin can switch to `same_quota_as_brothers` (same Free-tier daily invite cap as brothers). Premium 1/3/6 packs unlock unlimited invites AND unlimited messages (replaces a Premium invite cap such as 15). Mode change applies to subsequent invites only (D20). |
| P31 | Message Flash (personalised first message) | MVP | Simple personalised first message. Card-level quick message and Flash obey the sender's message quota. |
| P32 | Ice Breakers — deen/family templates | MVP | Scholar-sensible templates |
| P32 | AI-personalised Ice Breakers | **parity — deferred to NEXT** | Wait for grounded coach (D21) |
| P33 | Real-time chat — typing, reactions, photo share (gallery/camera) | MVP | Free tier: daily message cap set by the platform admin (same kind of operator setting as `sister_reach_mode`; do not lock a number). Premium unlocks unlimited messages. A free sister must not be able to chat forever with a free brother. Passive deliver-then-scan stays. |
| P33 | Curated GIFs / stickers | **parity — deferred to NEXT** | Pack design time; modest curated set only |
| P34 | Voice messages | MVP | French / Mooré / Dioula; delivered immediately, then STT + audio-classified in the background (D4 + D18). Not a safety paywall. AI outage does not hold the voice note |
| P35 | Push notifications | MVP | Messages / requests / visits; plus wali digest of granted threads only, reveal-requests, moderation outcomes, quiet hours (quiet-hours default is D30 NEXT) |
| P36 | Web + installable PWA | MVP | |
| P36 | Store-listed native Android (thin wrapper / TWA / Capacitor over the PWA) | MVP | Required for Burkina launch |
| P36 | Native iOS | **parity — deferred to NEXT** | Android-first Burkina launch; Apple store/build/compliance cost; not dropped |

### Safety, moderation, privacy

| ID | Title | Horizon | Notes / reason if deferred |
| --- | --- | --- | --- |
| P37 | AI message moderation | MVP | Raised by D4 to every chat modality, delivered then scanned |
| P38 | Photo strike rule | MVP | Keep 3-strike / 24h block as floor (can tighten) |
| P39 | Published photo rules | MVP | Pictograms + French text + Mooré/Dioula audio (D40) |
| P40 | Blur toggle / default / reveal-on-accept / unblur | MVP | Raised to per-viewer reveal/revoke (D8) |
| P41 | Report + published SLA | MVP | Published 24h report SLA |
| P42 | Block | MVP | From profile or chat; they can no longer see or contact you |
| P43 | Sanctions + false-report sanctions | MVP | Warning / suspension / ban; suspended-account screen |
| P44 | Code of conduct | MVP | Entertainment-seeking as non-marriage use; multi-account fingerprint (D7) |
| P45 | Family-involvement guidance | MVP | Rules **plus** product D1 |
| P46 | Data protection | MVP | Encryption, rights, DPA, 72h breach + CIL (D17) |
| P47 | Cookie consent | MVP | Never implies rights to reuse profile photos in campaigns (D10) |
| P48 | Contact form + FAQ | MVP | Ticketed contact form (not Gmail-only) |

### Coach, content, growth

| ID | Title | Horizon | Notes / reason if deferred |
| --- | --- | --- | --- |
| P49 | AI marriage coach | **parity — deferred to NEXT** | Scholar-review + one persona, not a mufti (D21); no “Cheikh” title / dual coach names |
| P50 | Académie library — minimum 5 scholar-reviewed articles | MVP | Wali, mahr, rights, haya, honesty |
| P50 | Full Académie library | **parity — deferred to NEXT** | After seed articles |
| P51 | Blog | **parity — deferred to NEXT** | Editorial capacity; human-review all copy (Farata blog leaked AI-prompt text — Offered (seen)) |
| P51 | Full blog cadence | **parity — deferred to LATER** if NEXT capacity is tight | Content production, not strategic rejection |
| P52 | Programmatic SEO — Ouagadougou, Bobo-Dioulasso, Burkina Faso | MVP | Local imam-reviewed copy first |
| P52 | Remaining city / country / intent SEO | **parity — deferred to NEXT** | After BF trio |
| P53 | Promo / explainer video | **parity — deferred to NEXT** | Production; human-review all copy |
| P53 | High-production video | **parity — deferred to LATER** if NEXT capacity is tight | Content production, not strategic rejection |
| P54 | Testimonials carousel | **parity — deferred to NEXT** | Wait for real D11/D12 stories or modest process quotes; no invented marriages; demote placement vs verified-marriages counter |

### Monetisation

| ID | Title | Horizon | Notes / reason if deferred |
| --- | --- | --- | --- |
| P55 | Freemium in XOF / FCFA | MVP | One XOF pricing page; launch vs normal price disclosed |
| P56 | Premium structure minus paywalled safety | MVP | Pay for reach/convenience (unlimited invites, unlimited messages, ranking, convenience). Safety, blur, mahram, report, block, and verification stay free in both sister-access modes. Free-tier messages stay daily-capped unless that person has Premium. Sister invite/reach is free and unlimited by default; paid only when the admin sets `same_quota_as_brothers` (D20). |
| P56 | Remaining Premium perks (HD 10 photos, unlimited coach, priority 7/7, &lt;10 min validation) | **parity — deferred to NEXT** | After core Premium |
| P57 | 1 / 3 / 6 month plans, no silent auto-renew | MVP | Advertise as a trust feature in French and Mooré/Dioula audio (D16) |
| P58 | Payment rails — BF launch | MVP | Orange Money BF, Moov Africa BF, Wave/Coris, cards |
| P58 | Free Money / MTN MoMo | **parity — deferred to NEXT** (later countries) | Keep as parity rails for later markets; not BF-launch blockers |
| P59 | Published CGV / refunds | MVP | No homepage-vs-CGV contradiction |

**Parity count: 59 ids. No drops.**

## Feature scope — Differentiators (D1–D40)

D1–D23 from `docs/competitor-farata.md` §7; D24–D40 from the 2026-09-27 brainstorm. All are required in this brief and the future PRD. Horizons match `brainstorm-intent.md`. **Priority:** P0 = owner must-have; P1 = launch MUST; P2 = NEXT; P3 = LATER. Rank is global (lower = earlier).

### D1–D23 (from competitor teardown)

| Rank | Tier | ID | Title | Horizon |
| --- | --- | --- | --- | --- |
| 3 | P0 | D1 | Mahram-in-chat, sister-initiated; she grants which brother threads he may read (revoke one or all); verified wali is read-only on granted, delivered messages and can flag/pause/end those threads | MUST |
| 27 | P2 | D2 | Wali dashboard: multi-ward + digest + priority flags | NEXT |
| 28 | P2 | D3 | Chaperoned-meeting / khitba planner with wali in the loop | NEXT (full) |
| 1 | P0 | D4 | Every chat modality delivered, then passively scanned (text, chat photos, voice STT+classifier incl. local languages); profile photos and bio stay publish-gated | MUST |
| 8 | P1 | D5 | Scam and off-platform guardrails; contact-share still blocks phone, WhatsApp, and links until both members opt in (not the AI) | MUST |
| 9 | P1 | D6 | Honest consistent moderation policy + member appeal | MUST |
| 7 | P0 | D7 | Report → strike → ban pipeline, console, evidence, fingerprinting, transparency stats | MUST (MVP-scale) |
| 2 | P0 | D8 | Per-viewer reveal (match / request / never) + revoke | MUST |
| 29 | P2 | D9 | Anti-leak: watermark, screenshot notice, no downloads, blurred notification thumbs | NEXT |
| 17 | P1 | D10 | Never use profiles in marketing without per-use opt-in | MUST |
| 4 | P0 | D11 | Joint “we got married” report, optional private nikah proof, joint married state | MUST |
| 5 | P0 | D12 | Consent-based story submit + showcase page + honest verified-marriages counter starting at 0 | MUST |
| 30 | P2 | D12 | Curated rich showcase polish / marketing | NEXT |
| 6 | P0 | D13 | Verification free for everyone, separate from Premium; levels phone / ID / wali | MUST |
| 10 | P1 | D14 | Declared marital-status honesty + polygamy intent | MUST |
| 16 | P1 | D15 | Deletion that works + export + status + ticketing | MUST |
| 15 | P1 | D16 | Transparent consistent pricing, no dark patterns | MUST |
| 12 | P1 | D17 | Burkina-first entity, CIL, Orange Money BF / Moov Africa BF / Coris / Wave, XOF | MUST |
| 13 | P1 | D18 | French first + Mooré/Dioula audio | MUST |
| 44 | P3 | D18 | Full Arabic + English UI for diaspora | LATER |
| 14 | P1 | D19 | Low-bandwidth lite mode | MUST |
| 11 | P1 | D20 | Sister reach defaults free/unlimited; admin can apply the same invite quota as brothers; wali/safety always free. Free-tier messages stay capped in both modes unless that person has Premium. | MUST |
| 31 | P2 | D21 | Grounded coach, scholar-reviewed, not a mufti, one persona | NEXT |
| 26 | P1 | D22 | Seed articles MUST via P50 (5 scholar-reviewed) | MUST (via P50) |
| 32 | P2 | D22 | Working public imam-reviewed Académie (Sahel context) | NEXT |
| 25 | P1 | D23 | Independent imam/advisory board can start as 2–3 named people | MUST (names) |
| 33 | P2 | D23 | Trust by proof: public metrics + fuller named board | NEXT |

### D24–D40 (from brainstorm)

| Rank | Tier | ID | Title | Horizon |
| --- | --- | --- | --- | --- |
| 18 | P1 | D24 | Structured ta'aruf stages in product (at least invite / chat / meeting / married) | MUST |
| 34 | P2 | D25 | Istikhara companion (reminder + private journal, not a fatwa) | NEXT |
| 35 | P2 | D26 | Mahr conversation card | NEXT |
| 24 | P1 | D27 | SMS essential-path alerts | MUST |
| 43 | P2 | D27 | USSD essential path | MUST if feasible; otherwise NEXT |
| 23 | P1 | D28 | Shared-device PIN mode | MUST |
| 36 | P2 | D29 | Mosque / imam attestation level | NEXT |
| 37 | P2 | D30 | Prayer/night quiet hours (default no push between Isha and Fajr local time) | NEXT |
| 38 | P2 | D31 | Moderator dual-control / audit / wellness | NEXT |
| 19 | P1 | D32 | AI outage records a scan-deferred event for the admin; it does not hold undelivered media | MUST |
| 45 | P3 | D33 | Alumni mentorship (read-only advice, not matchmaking) | LATER |
| 39 | P2 | D34 | Optional language filters with anti-caste design (Mooré / Dioula / Fulfulde / French) | NEXT |
| 40 | P2 | D35 | Match-visible change-audit (marital status or photos) | NEXT |
| 41 | P2 | D36 | Anonymous-mode defined (hide last-seen + hide from browse except people you requested) | NEXT |
| 42 | P2 | D37 | Boosts cannot bypass safety; verified / wali-ready ranking preference | NEXT |
| 20 | P1 | D38 | Sister can remove/report abusive wali; emergency hide; wali cannot send as her | MUST |
| 21 | P1 | D39 | Age/liveness hold for suspected minors | MUST |
| 22 | P1 | D40 | Pictogram + audio photo rules for low literacy | MUST |

**Differentiator count: 40 ids. No drops.** Rank 1–7 = P0 must-haves; 8–26 = P1 launch MUST; 27–43 = P2 NEXT; 44–45 = P3 LATER.

LATER (non-parity, from D-mapping): English/Arabic full UI; diaspora-heavy features beyond the hijra field; live video even with wali (khalwa-sensitive).

## Pricing stance

Freemium in **XOF**. Safety and dignity are **never paywalled** in either sister-access mode: verification, blur/reveal, mahram, report, and block stay free.

**Messages are quotaed, not only invites.** Free tier: a daily message cap set by the platform admin (the same kind of operator setting as `sister_reach_mode`). Do not lock a number here; any seed is an admin-configurable placeholder only. **Premium** (paid **1 / 3 / 6 month** packs) unlocks **unlimited invites AND unlimited messages**. This replaces a Premium invite cap such as 15. Free brothers keep a daily invite cap. Sisters in `free_unlimited` still have unlimited invites, but free-tier messages stay capped unless that person has Premium. A free sister must not be able to chat forever with a free brother.

**Sister access** (`sister_reach_mode`) is admin-configurable and ships both modes on day one (not hardcoded):

- Default **`free_unlimited`**: sisters send invites with no quota and no paid pack for reach. They do not pay for the invite-quota actions brothers pay for. Free-tier messages stay capped unless they have Premium.
- Admin can switch to **`same_quota_as_brothers`**: sisters use the same **1 / 3 / 6 month** packs (no silent auto-renew) and the same Free-tier daily invite cap as brothers. Premium, if purchased, unlocks unlimited invites and unlimited messages.
- Brothers stay on the paid quota subscription. There is no mode that makes brothers free.
- Switching the mode applies to **subsequent** invites. It does not delete invites already sent.

Brothers pay for reach and convenience (unlimited invites and messages on Premium, ranking, convenience perks). One transparent pricing page. Plans of **1 / 3 / 6 months** with **no silent auto-renew** on any rail; if a processor wants auto-renew, still require explicit repurchase. Mobile money first: Orange Money BF, Moov Africa BF, Wave/Coris where available; cards secondary.

**[ASSUMPTION]** Exact price points are not locked. Public reference: Farata **5 900 FCFA/month** launch, **9 900** normal — Claimed (marketing). Working assumption for validation: brother Premium launch in a similar band (about 4 900–5 900 XOF/month) with cheaper 3- and 6-month packs; do not race to 0 FCFA. Validate against BF purchasing power before lock. Free-tier brother daily request quota is a number the PRD must set; **[ASSUMPTION]** start from a tight quota (about 3/day) so free brothers can participate without spray-and-pray. The free-tier daily **message** cap is admin-configurable and is **not** locked in this brief.

Boosts (P25, NEXT) cannot buy a safety bypass; ranking prefers verified + complete + wali-ready profiles (D37).

## Success metrics

**North star:** chaperoned meetings + dual-confirmed nikah — not DAU, not inflated member counts.

| Class | Metric | Notes |
| --- | --- | --- |
| Outcome | Dual-confirmed marriages (D11) | Public counter starts at 0; proof-backed only (D12, D23) |
| Outcome | Chaperoned / family meetings proposed and accepted (D3 full is NEXT; a lightweight “meeting” stage in D24 is MUST) | |
| Trust | Verified members (phone / ID / wali levels) | Never sell a “looks verified” Premium badge |
| Safety | Passive-scan flag rates; admin warning / suspend / other-action rates; report SLA met (target 24h); strike → ban completions; appeal overturn rate | Scan-deferred events counted, not hidden |
| Dignity | Share of sister profiles remaining blurred; reveal-revoke use; sister-granted wali threads; sister-initiated requests | |
| Local fit | Android + PWA actives in Ouaga then Bobo; Orange Money / Moov checkout completion; audio-onboarding completion (Mooré/Dioula) | |
| Honesty | Publish only proof-backed counters. Never invent scale | Contrast: Farata “+247.8k actifs” Claimed vs Play 10k+ Offered (seen) |

## Top risks and controls

Full table is in `addendum.md`. The launch-killing eight:

| Risk | Control |
| --- | --- |
| Fake profiles / catfish | D13 + P8 + P9: no public visibility until phone OTP + liveness + ID + human review; liveness matched to profile photos |
| Romance / money scams | D5 classifiers; P44 ban; in-chat “never send money to a suitor” |
| Indecent media (incl. Mooré/Dioula slang jailbreak) | D4 deliver-then-scan + local lists + flag-for-admin; D32 scan-deferred (no hold) |
| Photo leaks / small-city doxxing | D8 + D9 (NEXT polish); coarse geo; D10; kill-switch + mass revoke |
| Fake or coercive wali | Invite-by-phone + OTP + declared relationship + sister confirm; he sees only threads she grants; she can revoke one or all; D38 remove/report; wali cannot send as her |
| Minors | P14 19+ + ID DOB + D39 facial-age hold |
| AI vendor down | D32 scan-deferred event for the admin — does not hold undelivered media |
| Mosque rumor that this is dating/haram | Zero dating language; D23 named board; working seed Académie (P50); proof-backed metrics |

## Out of scope / not-now

- **Architecture / hosting vendor pick** — deferred to architecture. CIL compliance and public hosting disclosure are product requirements (see Assumptions).
- **Name purchase / trademark filing** — shortlist only this run.
- **Native iOS** — parity — deferred to NEXT, not dropped.
- **Live 1:1 video / live voice** — LATER, including with wali (khalwa-sensitive).
- **Full English / Arabic UI** — LATER (audio in Mooré/Dioula is MUST).
- **Alumni mentorship (D33)** — LATER.
- **First-wife awareness / notification** — out of scope unless she consents (open question to confirm in PRD research).
- **Document proof of kinship** for wali — not in MVP (see Assumptions).
- **PRD, architecture, and other skills** — not started by this brief run.
- **Invented scale, invented marriages, dating-app copy, paywalled safety, fake presence chrome.** A one-at-a-time people card is in scope.

## Assumptions and decisions for legal review

Product-owner resolutions of the three questions the brief was asked to close. Each is an **[ASSUMPTION]** with rationale, **flagged for later legal review**.

### A1 — Minimum age 19+

**[ASSUMPTION]** Minimum age is **19+** (Farata parity, conservative). Rationale: Farata Mentions légales Claimed 19+; stores rate Farata 17+ (iOS) / 18+ (Play) Offered (seen) as store ratings. A conservative floor reduces minor-adjacent risk in a matrimony product and matches the competitor’s published rule. **Flag for legal review:** Burkina Faso civil majority and marriage-age law, plus our own store ratings (likely 17+/18+), must be confirmed before launch. If counsel requires 18+, the PRD will add extra protections for 18–21 rather than silently lowering the gate.

### A2 — Wali verification in MVP

**[ASSUMPTION]** MVP wali path:

1. Sister invites her mahram **by phone number**.
2. Mahram verifies via **phone OTP** and **declares the relationship** (father / brother / uncle / other mahram).
3. Sister **confirms**.
4. Optional ID check earns a **“verified wali”** badge.
5. **No document proof of kinship in MVP** (avoids excluding orphans, converts, and families without papers).
6. Sister can **remove/report** the wali (D38). Wali **cannot send messages as her**.

Rationale: kinship documents are uneven in BF and would block the must-have; phone + sister confirmation + optional ID is a workable anti-fake-wali floor; cooling-off and “wali cannot be an unmatched male friend” stay as product rules. **Flag for legal review:** relationship declaration vs. false-identity / impersonation liability; who is an acceptable mahram if the father is deceased (fiqh + local practice); whether “other mahram” needs a constrained list.

### A3 — Data residency and CIL

**[ASSUMPTION]** Hosting-location **decision is deferred to architecture**. The product **must** comply with Burkina Faso’s data-protection authority (**CIL — Commission de l’Informatique et des Libertés**) and **must publicly disclose the hosting location**. Rationale: Farata lists Vercel/Neon USA as Claimed processors and does not mention CIL (gap 9, labeled). We will not pretend a region pick in a product brief; we will not hide where data lives. **Flag for legal review:** CIL filing, lawful basis, cross-border transfer if hosting is outside BF, retention schedule vs. Farata-like 2-year message keep (Claimed policy — we must write our own), and 72h breach notice (P46).

## Open questions

Items from the brainstorm. One was closed by the 2026-10-01 locked decision; the rest stay open. The 2026-10-02 locked decisions (D20 sister-access modes; one-card people lists; message quotas; mahram thread grant) are not open-question closes.

- **Polygamy disclosure UX:** how to disclose existing wives without doxxing them? First-wife awareness remains out of scope unless she consents — confirm with sisters and counsel.
- **Fail-closed UX tolerance:** **Resolved 2026-10-01** (locked decision, Maitchibi Fayçal). AI moderation is passive. Messages send immediately; AI outage does not hold or delay chat. Scan-deferred events are recorded for the admin. The former “how long will members tolerate held voice notes” question no longer applies.
- **USSD/SMS cost:** which BF operators and what cost per wali alert is sustainable at launch? SMS is MUST; USSD is MUST-if-feasible.
- **Imam advisory:** which Ouaga/Bobo scholars will lend names, and what review SLA for Académie?
- **Free review SLA (P8):** what free review time is honest in BF? Farata claims 12–24h / 30 min / 10 min Premium — numbers disagree, Claimed.
- **Anonymous-mode rules:** confirm D36 (hide last-seen + hide from browse except people you requested) with sisters. Farata “mode anonyme” is Claimed; behaviour unknown.
- **Brother clear photo before accept:** should sisters ever see a brother’s clear photo before accept if he chose unblurred? Default lean: yes if he opted out of blur — confirm.
- **GIFs/stickers:** is a zero-GIF launch acceptable until a curated pack exists (P33 NEXT)?
- **Native-speaker validation:** do Nikahsira (Jula *sira*) and Nonglem (Mooré) read as intended in Ouaga/Bobo, or is there slang/taboo?
- **OAPI trademark + social handles** for Nisfuddin / Nikahsira / Sakinaa — not done.
- **Free Money / MTN MoMo (P58):** keep as later-country parity rails? This brief assumes yes (see P58 split).

## What the PRD must preserve

1. All six owner must-haves as MVP, with the P/D ids in the coverage table.
2. The **complete P1–P59 list** (every id, both slices, horizons + reasons). None dropped.
3. The **complete D1–D40 list** (horizons + tiers). D11 MUST. D12 MUST slice + NEXT polish. D1 MUST. D4 MUST. D8 MUST.
4. Evidence discipline: Farata claims only as Offered (seen) / Claimed (marketing) / Not publicly evidenced.
5. Freemium XOF; safety and dignity never paywalled (both sister-access modes); sister reach default `free_unlimited`, admin-switchable to `same_quota_as_brothers`; free-tier daily message cap (admin-set, number not locked); Premium unlocks unlimited invites and unlimited messages; no silent auto-renew; mobile money first.
6. Platforms: web + PWA + store-listed Android in MVP; native iOS parity — deferred to NEXT, not dropped.
7. Age 19+, wali-invite-by-phone (no kinship papers in MVP), CIL + public hosting disclosure — all tagged **[ASSUMPTION]** and queued for legal review.
8. North star = chaperoned meetings + dual-confirmed nikah. Proof-backed counters only. No dating language.
9. Passive deliver-then-scan moderation. Profile photos and bio stay publish-gated. Contact-share still blocks phone/WhatsApp/links until both opt in (not the AI). Khalwa-safe (no live A/V until wali or chaperoned meeting). Woman’s consent first-class.
10. Name remains TBD until native-speaker + trademark work. Do not start architecture from this brief.
11. People lists default to one focused card with shared traits and pass / invite / quick-message; optional grid on every such screen; many-filter search may open on the grid. Reject dishonest chrome (fake presence, invented scale), not the one-at-a-time card.
12. Mahram sees only sister-granted, delivered threads; she can revoke one thread or his entire permission; read-only; he cannot send as her.

## Vision

If this works, Ouagadougou and Bobo families will treat the product as a known honorable path: a sister can search one profile at a time without selling her face, a father can read the chats she grants, a brother can pay in Orange Money, and the public number that matters is verified marriages — starting at zero and growing only when both spouses confirm. Then CI / Mali / Senegal / wider, still marriage-shaped.

## Document control

- **Intent:** update (headless). Correction of record 2026-10-02: one-card people lists by default; messages quotaed (Premium unlimited invites and messages); mahram grant-scoped (D1 reframed). D20 sister-access modes and passive AI stay except where message quotas change chat volume.
- **Sources:** `docs/system-idea.md`; `docs/competitor-farata.md`; `docs/name-options.md`; `_bmad-output/brainstorming/brainstorm-muslim-marriage-africa-2026-09-27/` (intent, html, memlog). Passive-AI locked decision of 2026-10-01 stays. D20 locked decision of 2026-10-02 stays. This run does not edit the PRD, architecture, UX, or epics.
- **Overflow:** `addendum.md` (full risk table, personas/job maps, options considered).
- **Audit:** `.memlog.md` (via `memlog.py` only).
- **This run:** does not edit the PRD, architecture, UX, or epics; does not start implementation.
