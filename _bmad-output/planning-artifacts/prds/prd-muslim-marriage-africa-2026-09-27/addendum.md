---
title: muslim-marriage-africa — PRD addendum
status: final
created: 2026-09-27
updated: 2026-10-01
---

# Addendum — overflow for the muslim-marriage-africa PRD

This file holds depth that belongs downstream or would bloat `prd.md`: technical-how options (not decisions), rejected-alternative rationale, and in-depth personas. It is not architecture and not a UX spec. Audit and override information lives in `.memlog.md`, not here.

Sources: `_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/` (brief + addendum + memlog), brainstorm 2026-09-27, `docs/system-idea.md`, `docs/competitor-farata.md`, `docs/name-options.md`.

## 1. Technical-how (options, not decisions)

Architecture owns the pick. Product constraints already locked in the PRD:

- Passive after-delivery scan on Chat text, Chat Photos, Voice notes (STT + audio classifier including Mooré/Dioula word lists), and Message Flash. Delivery does not wait for the AI. AI outage records scan-deferred / scan-failed for the admin flag queue; it does not hold Chat. Profile Photos and bio remain publish-gated. The AI flags for a human admin and does not apply a sanction.
- Phone OTP + liveness selfie + ID, free, separate from Premium.
- Web + installable PWA + store-listed Android in MVP. Wrapper technology (TWA / Capacitor / thin WebView) is an architecture choice; the product requirement is a Play listing that completes UJ-1.
- Native iOS is NEXT parity, not dropped.
- Hosting region is deferred (A3), but the location must be publicly disclosed and the product must comply with CIL.
- Payments: Orange Money BF, Moov Africa BF, Wave/Coris, cards secondary. No silent auto-renew even if a processor prefers it.
- SMS essential-path alerts in MVP; USSD only if operator cost is feasible (PRD treats USSD as NEXT).

Options considered for later architecture (not chosen here):

| Concern | Options seen in sources | Binding product constraint |
| --- | --- | --- |
| Android packaging | TWA vs Capacitor vs thin wrapper over PWA | Must be store-listed; share one web capability core |
| Identity | Email+password required; Google additional; Orange/Moov identity to explore; Apple with iOS | Must not be Google-only in BF |
| Moderation AI | Vendor vs self-host vs hybrid | Passive after-delivery scan; local-language lists; admin flag queue of already-delivered messages (AI never applies the sanction) |
| Liveness / ID | Any vendor that can run on low-end Android | Free; matched to Profile Photos; minor hold (D39) |
| STT | Multilingual model + keyword lists | French + Mooré + Dioula coverage is a product requirement |
| Mobile money | Aggregator vs direct operator | XOF; explicit repurchase; BF rails first |
| Notifications | Web push + FCM + SMS gateway | SMS for OTP, Invite, Mahram pause/end/flag, admin suspend/Ban outcomes |
| Data store | (deferred) | Erasure clocks, no staff bulk export, audit log ≥ 12 months |

Farata’s public DPA lists Vercel (USA) and Neon (USA) as processors — Offered (seen) (legal text). CIL mention is Not publicly evidenced (gap 9). Do not copy that silence; disclose hosting (A3). Their stack names are not a recommendation.

## 2. Options considered (product, carried from the brief)

### 2.1 Age gate

| Option | Why considered | Disposition |
| --- | --- | --- |
| 19+ (Farata parity) | Conservative; Mentions légales Claimed 19+ | **Chosen** as A1; legal review before launch |
| 18+ with extra 18–21 protections | May match BF law / store 18+ | Rejected as launch default until counsel speaks |
| 21+ | Extra conservative | Rejected: excludes too many marriage-ready adults |

### 2.2 Mahram proof

| Option | Why considered | Disposition |
| --- | --- | --- |
| Kinship documents | Strong anti-fake-wali | Rejected for MVP — excludes orphans, converts, families without papers |
| Phone OTP + declared relationship + Sister confirm + optional ID | Workable floor | **Chosen** as A2 |
| Imam-only attestation | Extra trust | D29 NEXT, not a launch blocker |

### 2.3 Data residency

| Option | Why considered | Disposition |
| --- | --- | --- |
| Pick a region in the brief/PRD | Stakeholders want a box ticked | Rejected — architecture decision |
| Ignore CIL | Faster launch | Rejected |
| Comply with CIL + disclose hosting | Honest and local | **Chosen** as A3 |

### 2.4 Platforms

| Option | Why considered | Disposition |
| --- | --- | --- |
| Web only | Faster | Rejected — BF Members live on Android |
| PWA only (no Play listing) | Avoid store cost | Rejected — Play is how Ouaga finds apps |
| iOS in MVP | Parity with Farata Offered (seen) native iOS | Deferred NEXT — Android-first; not dropped |
| Capacitor/TWA over PWA | One core | Favoured *as an option* for architecture |

### 2.5 Blur model

| Option | Why considered | Disposition |
| --- | --- | --- |
| All-or-nothing reveal-on-accept (Farata Offered (seen) [bundle]) | Parity floor | Rejected as the *only* model |
| Always-blur, never reveal | Maximum haya | Rejected — blocks sincere ta'aruf |
| Per-viewer Reveal + Revoke | Must-have #3 raised | **Chosen** (D8) |

### 2.6 Monetisation

| Option | Why considered | Disposition |
| --- | --- | --- |
| Farata-style start-chat Premium (Offered (seen) [bundle]) | Revenue | Rejected for Sisters (D20) |
| Paywall Verification | Revenue | Rejected (D13) |
| Race to 0 FCFA | Undercut Farata 5 900/9 900 Claimed (marketing) | Rejected |
| Freemium XOF; Brothers pay reach | Dignity-first | **Chosen** |

### 2.7 Name

No decision. Shortlist, alternates, Dannaya note, and RDAP snapshot: §6.

### 2.8 Homepage proof

| Option | Why considered | Disposition |
| --- | --- | --- |
| P54-style testimonial carousel as hero | Familiar | Rejected as hero; Farata quotes Offered (seen) are not marriages |
| Invented member counts | Look big | Forbidden (SM-C1) |
| Dual-confirm + counter at 0 | Honest | **Chosen** (D11, D12 MUST slice) |

## 3. Personas and job maps

Condensed from the brief addendum / brainstorm JTBD pass. Not a research sample. Journey stand-in names in the PRD are `[ASSUMPTION]`.

### Sisters (Fatim)

- **Functional:** find a practicing Brother without exposing face or phone → Blur-by-default + no phone/WhatsApp until mutual accept and optional Mahram (D8, D5).
- **Functional:** let father/brother read the Chat → Mahram read-all (D1).
- **Functional:** know marital/polygamy status before hope → D14 visible pre-accept.
- **Functional:** decline without drama → P29 + quiet decline + Block.
- **Functional:** photo never in ads without per-use opt-in → D10.
- **Functional:** ~1GB/month → Lite mode.
- **Emotional:** haya-safe and still hopeful → free safety stack (D20).
- **Emotional:** not mocked in the quartier → coarse geo; anonymous mode NEXT.
- **Social:** family can call the path honorable → Mahram now; meeting planner NEXT.
- **Social:** show real Ouaga/Bobo couples, not app-experience quotes → D12.

### Brothers (Ibrahim)

- **Functional:** filter by practice/madhhab/intentions.
- **Functional:** declare polygamy once (D14).
- **Functional:** sincere first message (Message Flash + templates).
- **Functional:** pay XOF on Orange Money.
- **Functional:** see Mahram presence so he does not overstep.
- **Emotional:** serious suitor, not a player → pledge + quotas.
- **Emotional:** not waste months on a fake → free Verification levels.
- **Social:** mother will ask who her family is → meeting planner NEXT.

### Mahrams (Ousmane)

- **Functional:** read ward Chats without a dating-app identity.
- **Functional:** pause/end; SMS not 40 pings (digest is NEXT).
- **Functional:** phone OTP + declared relationship + Sister confirm; no kinship papers.
- **Emotional:** evidence if he must confront a man.
- **Social:** mosque credibility → Advisory Board + Verified marriages.

### Moderators (Aïcha)

- **Functional:** one case file; fingerprint Ban evasion; escalate fiqh-edge to the Advisory Board.
- **Functional:** audited unblur (dual-control NEXT).
- **Emotional:** auto-blur in console / wellness NEXT.
- **Social:** wrongful Ban in a small city is a reputation disaster → appeal.
- **Tone:** respectful Ouaga French sanction macros.

### Married couples (Aminata & Yusuf)

- **Functional:** joint close; optional private proof; consent story without Chat excerpts.
- **Emotional:** help others make du'a, not become celebrities.
- **Social:** both families approve before public.
- **LATER:** read-only alumni advice (D33), not matchmaking.

### Operators (Kadiatou)

- **Functional:** price/packs, thresholds, Board/Académie publish, proof-backed metrics, deletion/CIL tickets.
- **Constraint:** cannot hide hosting location; cannot invent public counters.

## 4. Full risk table (from brief addendum)

| # | Risk | Control |
| --- | --- | --- |
| 1 | Fake Profiles | D13 + P8 + P9: no public visibility until phone OTP + liveness + ID + human review |
| 2 | Romance / money scams | D5; P44; in-Chat “never send money to a suitor” |
| 3 | Married men posing single | D14 + Report reason; never claim ID proves marital status |
| 4 | Catfish / stolen Photos | Liveness matched to Profile Photos + P38 |
| 5 | Indecency (voice / Chat-Photo) | D4 deliver-then-scan + local-language lists + D32 scan-deferred visibility + admin flag queue (FR-144) |
| 6 | Screenshot leaks | D8 + D9 (NEXT polish) |
| 7 | Fake Mahram | A2 path + D38 |
| 8 | Post-decline harassment | P29 + D7 fingerprint |
| 9 | Off-platform grooming | D5; contact after mutual + optional Mahram |
| 10 | False Reports | P43, evidence, rate limits, dual review |
| 11 | Moderator peek / leak | D31 NEXT; MVP audit floor |
| 12 | Breach / doxxing | P46 + D17 + coarse geo; no staff bulk export |
| 13 | Minors | P14 19+ + D39 |
| 14 | Shared-phone exposure | D28 PIN + session timeout |
| 15 | Paid boost flood | D37 |
| 16 | Coercive Mahram | D38 |
| 17 | AI jailbreak via Dioula / Mooré slang | Local lists + flag-for-admin or scan-deferred; Voice note already delivered |
| 18 | Imam impersonation | Name-collision review in P8 + P9 |
| 19 | Weaponize success story | Both confirm; either refuses public; proof private |
| 20 | Payment provider down | Free tier + safety stay up |
| 21 | AI vendor down | Delivery already happened; record scan-deferred / scan-failed on the admin flag queue |
| 22 | Mosque rumor (haram / dating) | Board, zero dating language, Académie seed |
| 23 | Copycat ships a shallow family-digest (Farata mahram-in-Chat is Not publicly evidenced; family text is Offered (seen) as rules §04 policy only) | Keep D1 product-deep (verified, Sister-initiated, read-all, pause/end) |
| 24 | Viral indecent leak | Kill-switch, mass Revoke, transparency |
| 25 | Ouaga power/data strain | SMS + Lite |
| 26 | Farata price undercut | Compete on dignity/local fit/outcomes, not 0 FCFA |
| 27 | Multi-account evasion | Fingerprint + linked Bans |
| 28 | Insider bulk export | Owner-only export; need-to-know |
| 29 | Mahram dashboard on shared phone | PIN + timeout (dashboard is NEXT) |
| 30 | Social-engineer an unblur | Time-limited Reveal, Revoke, watermark (D9 NEXT) |

## 5. Binding stance (do not re-litigate in UX/architecture)

Burkina first. French-first + Mooré/Dioula audio. Chat delivered immediately, then passively scanned; AI flags for a human admin and does not silently delete, block, or auto-sanction. Sister-initiated optional Mahram. Dual-confirm marriage. Three Farata evidence labels only. Copy vocabulary locked. Khalwa-safe (no live A/V until Mahram or chaperoned meeting). Woman’s consent first-class. Haya media. Verification is a public good. No likeness in ads without per-use opt-in. Proof-backed counters only. Pseudonym + city geo. Polygamy disclosure pre-accept. No silent auto-renew. Boosts never bypass safety. Aligned with `docs/system-idea.md`. **Correction of record 2026-10-01:** earlier addendum sentences that said pre-delivery scan or Fail-closed Chat delivery are superseded.

Visual hint only (UX owns the system): indigo / sand / gold, mihrab geometry, *sira* as a path metaphor — solemn marriage, not swipe culture.

## 6. Name shortlist (not a decision)

Working title: **muslim-marriage-africa**. Product name TBD.

| Candidate | Note |
| --- | --- |
| Nisfuddin | “Half the deen”; consider `nisfdin` too |
| Nikahsira | *nikah* + Jula *sira* — native-speaker check |
| Sakinaa | *sakina*; `sakina.com` / `.net` taken |
| Mithaqun | Alternate — solemn covenant |
| Nonglem | Alternate — Mooré wildcard; native-speaker check |

Dannaya (Jula “trust”) `.com` taken / `.net` free — not on the shortlist. Pending: native-speaker validation; OAPI + WIPO; social handles; user test in Ouaga/Bobo. Nothing registered or bought. RDAP 2026-09-27 ~21:10 ET is point-in-time only, not a purchase.

## 7. What this addendum is not

Not the PRD. Not architecture. Not a name/domain decision. Not legal advice. Not the start of UX, epics, or other skills.
