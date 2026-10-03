---
title: muslim-marriage-africa
status: final
created: 2026-09-27
updated: 2026-10-02
---

# PRD: muslim-marriage-africa
*Working title — product name TBD. Shortlist: Nisfuddin, Nikahsira, Sakinaa (alternates Mithaqun, Nonglem). Native-speaker and trademark checks pending.*

## 0. Document Purpose

This PRD is the decision record for a Burkina-first honorable ta'aruf product. It is written for the product owner, Trust & Safety, and the downstream owners of UX, architecture, and stories. Vocabulary is Glossary-anchored. Capabilities are grouped with globally numbered functional requirements (FR-001…) and cross-cutting non-functional requirements (NFR-001…). Inferences the product owner made on this Fast-path run are tagged `[ASSUMPTION]`. Technical-how, rejected-option matrices, and persona depth live in `addendum.md`. This PRD builds on `_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/` and `docs/system-idea.md`. It does not start UX, architecture, or epics.

Farata statements use **only** the evidence labels from `docs/competitor-farata.md`: **Offered (seen)** / **Claimed (marketing)** / **Not publicly evidenced**. No new unsourced competitor claims.

## 1. Vision

If this works, families in Ouagadougou and Bobo-Dioulasso will treat the product as a known honorable path: a Sister can search without selling her face, a father can read the Chat, a Brother can pay in Orange Money, and the public number that matters is Verified marriages — starting at zero and growing only when both spouses confirm. Then Côte d’Ivoire, Mali, Senegal, and wider Africa — still marriage-shaped.

This is Burkina-first honorable ta'aruf, not another dating app from Dakar. Sister dignity is never paywalled. Sister Invite reach defaults `free_unlimited`; the Operator can switch to `same_quota_as_brothers` (D20). Mahram-in-Chat is optional and Sister-initiated. Every Chat text, Chat Photo, Voice note, and Message Flash is **delivered immediately**, then a background AI scan checks published red flags and may flag the person for an admin. The AI does not block, hold, refuse, or delay delivery, and it does not apply a sanction. Profile Photo and bio still must not be publicly visible until reviewed (publish gating, not a Chat hold). Polygamy intent is disclosed before a Sister invests hope. Pricing is in XOF on mobile money. The interface is French-first; Mooré and Dioula audio carry low-literacy Members through the path that matters.

The thesis the rest of this document bets on: **safety and dignity are a right; reach is a product.** Brothers pay for convenience. Sisters do not pay for safety; Sister reach is free by default and quota-capped only when the Operator sets `same_quota_as_brothers`. The north star is chaperoned meetings plus dual-confirmed nikah — not DAU, not invented member counts. Farata’s “+247.8k actifs” is Claimed (marketing); Google Play shows 10k+ downloads Offered (seen). This product will not copy that honesty failure.

## 2. Target User

### 2.1 Jobs To Be Done

- **Sisters (functional):** find a practicing Brother without exposing face or phone; decline quietly; attach a Mahram who reads the Chat; keep Photos under her control; never pay for safety; send Invites free by default (Operator can apply Brother Invite quotas).
- **Sisters (emotional / social):** stay haya-safe and still hopeful; not be recognised and mocked in her quartier; let her family call the path honorable.
- **Brothers (functional):** filter by Islamic criteria; send a sincere first message; pay in XOF on Orange Money / Moov; be seen as a suitor, not a player.
- **Brothers (emotional / social):** disclose existing marriage or polygyny intent so they are not a liar before Allah; involve her family without overstepping.
- **Mahrams (functional):** read all messages; flag, pause, or end; prove they are who they say; stop a Chat that becomes inappropriate.
- **Moderators (functional):** decide from one case file (text / Photo / audio + scores + report + device); never peek unblurred Photos for curiosity.
- **Married couples (outcome):** jointly close the search; optionally tell a consent-based story that helps others make du'a without becoming celebrities.
- **Operators (functional):** set price, `sister_reach_mode`, and policy without shipping a release; honour deletion and CIL requests; publish only proof-backed metrics.

### 2.2 Non-Users (v1)

- People seeking entertainment, casual “rencontre romantique,” or dating. That is non-marriage use (P44) and a Code of conduct violation.
- Minors. Age gate is **19+** — see A1.
- Members outside the Burkina launch geography for paid local rails and SEO; diaspora may browse later surfaces but MVP copy, payments, and support are BF-first.
- First wives who have not consented to awareness of a Brother’s polygyny search. First-wife notification is out of scope unless she consents (open question). **Given up:** first-wife notification — the product will not tell a first wife her husband is searching. That is a dignity trade-off against doxxing her; mosque-rumor control (Advisory Board, zero dating language, honesty pledge) must carry the choice. `[NOTE FOR PM]` Revisit if sisters or counsel reject this.

### 2.3 Key User Journeys

Named scenes. Each step lists the FR IDs it exercises. Protagonist names are `[ASSUMPTION]` stand-ins for UX research, not sampled users.

#### UJ-1. Fatim searches without selling her face

**Persona + context:** Fatim, 24, Ouagadougou, shared low-end Android, ~1GB/month, French plus Mooré at home. She will not put a clear face on a grid that cousins can screenshot.
**Entry state:** New phone number. No account. French UI, Lite mode available.
**Climax:** She accepts one Invite, a Chat opens, her Photos stay blurred to that Brother until she Reveals, and her father can already read if she attached him.
**Resolution:** She is in a wali-aware Chat at Ta'aruf stage **chat**, not a dating inbox.

1. Fatim opens the web app or installed PWA or Play-listed Android app and creates an account (email, password, unique pseudonym, gender Sister). → FR-001, FR-132, FR-133, FR-134
2. She completes phone OTP, then ID document + liveness selfie. Verification is free and is not Premium. → FR-002, FR-014, FR-015, FR-105
3. Age gate blocks anyone under 19. → FR-011, NFR-001
4. Guided onboarding offers **minimum-to-browse** vs **complete-to-send-Invite**. Mooré audio plays the hard steps. → FR-009, FR-010, FR-137, FR-138
5. She sets Blur-by-default on Profile Photos. Human review must pass before she is publicly visible. → FR-012, FR-016, FR-056, FR-065
6. She browses a Lite grid of cached Profiles, filters by city / marital status / practice, and saves a private favourite. → FR-021, FR-022, FR-024, FR-025, FR-026, FR-136
7. She sends an Invite with a Message Flash. Default `sister_reach_mode` is `free_unlimited` (no quota, no pack). If the Operator has set `same_quota_as_brothers`, FR-044 caps apply and she may need a pack for more Invites. Safety stays free. → FR-038, FR-045, FR-046, FR-145
8. When a Brother’s Invite arrives she sees his marital-status and polygamy-intent fields **before** accept. Decline is quiet. → FR-037, FR-039, FR-040, FR-042
9. She accepts. Chat opens. She may Reveal Photos to him only, or refuse. She can Revoke later. → FR-041, FR-050, FR-057, FR-058, FR-059
10. Optional: she invites her Mahram by phone (UJ-3). → FR-071–FR-079
11. Every outbound and inbound Chat text, Photo, and Voice note is delivered immediately. A background scan may later flag the person for an admin; a later flag does not unsend what was already delivered. If AI is down, delivery still happened and a scan-deferred event is recorded. → FR-062–FR-067, FR-144, NFR-003
12. She can Report or Block from Profile or Chat. → FR-083, FR-084

**Edge case:** Shared-phone — she locks the app with a PIN before handing the device to a cousin. → FR-020, NFR-001

#### UJ-2. Ibrahim pays in Orange Money and is seen as a suitor

**Persona + context:** Ibrahim, 29, Bobo-Dioulasso, already married, seeking a second wife with honesty. He has Orange Money, not a foreign card.
**Entry state:** Unverified. French UI.
**Climax:** A Sister accepts his Invite. He sees a Mahram-present banner. He has not been asked to pay for verification or reporting.
**Resolution:** He is in a Chat at stage **chat**, Premium only bought him more daily Invites.

1. Ibrahim signs up as Brother, pledges sincerity with wording that names honesty about existing marriage, accepts rules. → FR-001, FR-005, FR-089
2. Phone OTP + liveness + ID, free. Google sign-in is available as an additional method, not the only path. → FR-002, FR-003, FR-014
3. He declares marital status **married** and polygamy intent **yes** on the Profile. Those fields are visible to Sisters before they accept. → FR-021, FR-037
4. Completeness meter names missing Islamic criteria (madhhab, practice, intentions) without shaming. → FR-022, FR-023
5. Human review passes. He browses and filters. Daily Invite quota on Free is **3** `[ASSUMPTION]`. → FR-012, FR-024, FR-025, FR-044
6. He attaches a Message Flash using a deen/family Ice Breaker template. He cannot resend after a refuse. → FR-043, FR-046, FR-047
7. He buys a 1-month Premium pack in XOF via Orange Money BF. No silent auto-renew. Checkout shows the same price as the public pricing page. → FR-104, FR-106, FR-107, FR-108
8. Sister accepts. If a Mahram is attached, Ibrahim sees that presence from the first message. → FR-041, FR-048, FR-079
9. He cannot pay to skip moderation, quotas, or verification. → FR-105, FR-110, FR-111

**Edge case:** Payment rail down — Free tier and all safety features stay up. → NFR-004, FR-105

#### UJ-3. Ousmane reads every message and can stop the Chat

**Persona + context:** Ousmane, Fatim’s father, feature-phone plus a basic Android, does not want a dating-app identity.
**Entry state:** No account. Fatim has already created her Profile.
**Climax:** He pauses a Chat that slips. He never sent a message as Fatim.
**Resolution:** Ward is not in digital khalwa. He can end the Chat.

1. Fatim invites him by phone number. → FR-071
2. He verifies with phone OTP and declares relationship **father**. → FR-072
3. Fatim confirms. Optional ID check can earn a “verified wali” badge; no kinship document is required. → FR-073, FR-078
4. He is attached as a read-all participant on her existing and new Chats. He receives SMS for pause/end/flag events. → FR-053, FR-074
5. He sees all delivered messages. He cannot compose or send as Fatim. → FR-074, FR-076
6. He flags a message (priority queue), pauses the Chat (both Members see paused), or ends the Chat. → FR-075, FR-087
7. Fatim can remove or Report him. After removal he loses read access. → FR-077
8. He is not offered a Member browse/Invite identity. `[ASSUMPTION]` Mahram accounts cannot send Invites or appear in the grid. → FR-071, FR-025

**Edge case:** He is not an unmatched male friend — product rule rejects that relationship class. → FR-072, A2

#### UJ-4. Aïcha closes a report without peeking for curiosity

**Persona + context:** Aïcha, Trust & Safety, French + local-language support, small team.
**Entry state:** Authenticated Moderator. Case arrives from Member Report and/or an AI flag on an already-delivered message (plus the flagged person).
**Climax:** She issues a warning, a suspend (when too indecent), or another published action, with evidence. Appeal path exists. Unblur of a Sister Photo required a reason logged to the audit trail.
**Resolution:** Decision is appealable and auditable. The original message stays delivered unless a later product rule (not the AI) says otherwise; the AI never unsends or auto-sanctions.

1. A case file opens with Chat text / Photo / Voice note, model scores, Member Report, device/phone/ID fingerprint hints. → FR-087, FR-088, FR-144
2. Console thumbnails of Sister Photos stay blurred. Unblur requires an explicit case reason and is written to the audit log. → FR-093, NFR-009
3. She applies warning / suspend / another published action, or a photo Strike (3 rejections → 24h upload block as floor). The AI does not choose or apply the sanction. → FR-069, FR-085, FR-144
4. False-report pattern can itself be sanctioned. → FR-086
5. Member receives a published-status outcome. For a Member Report, the SLA clock started at submit; for an AI-originated flag, the clock starts when the flag enters the admin queue. Target 24h first human decision. → FR-083, FR-144, NFR-003
6. Member can Review (appeal). A second human reviews. → FR-090
7. If AI is unavailable, she works the **flag queue** of already-delivered messages plus scan-deferred / scan-failed events — delivery already happened; nothing is held for the recipient. → FR-067, FR-144, NFR-003

**Edge case:** Fiqh-edge case — she escalates to the Advisory Board rather than inventing a fatwa. → FR-116, FR-141

#### UJ-5. Aminata and Yusuf jointly report they got married

**Persona + context:** A couple who completed nikah after a chaperoned path on the product.
**Entry state:** Both still Members in an accepted Chat at stage **meeting** or **chat**.
**Climax:** Both confirm. Public Verified-marriages counter increments by 1. Optional story is consent-gated; faces optional.
**Resolution:** Joint **married** state. Neither stays “available.”

1. One spouse starts a joint “we got married” report naming the other. → FR-095, FR-028
2. The other must confirm. One-sided claim does not increment the counter and does not change availability. → FR-096, FR-101
3. Optional private nikah proof (certificate or imam/Mahram attestation) is stored privately, never published. → FR-097
4. Both accounts enter joint **married** state together (not available in browse; Chats close to new Invites). → FR-098, FR-025
5. They may submit a consent-based story (city, date, faces optional/blurred, no Chat excerpts). Either spouse can refuse public. `[ASSUMPTION]` both families should approve before public — extra gate. → FR-099, FR-100
6. Public counter was 0 at launch and only increments on dual-confirmed reports. → FR-101
7. Testimonials carousel of “the app felt respectful” is **not** the hero and is not MVP. → FR-102

**Edge case:** One spouse refuses the public story — counter may still increment if both confirmed the marriage; the showcase page stays empty of their faces. → FR-099, FR-101

#### UJ-6. Kadiatou configures price, policy, and honours a CIL request

**Persona + context:** Operator / admin for the BF entity. Not a Moderator.
**Entry state:** Authenticated Operator role, separate from Moderator.
**Climax:** She lowers a flag-confidence threshold and publishes a 3-month XOF pack without a code release. She completes a deletion/CIL request with a status the Member can see.
**Resolution:** Config is audited. Metrics on the public site remain proof-backed.

1. She edits Premium pack prices and durations (1 / 3 / 6 months) on one pricing page. Auto-renew stays off. She can set `sister_reach_mode` (`free_unlimited` default, or `same_quota_as_brothers`). The change is audited; subsequent Sister Invites use the new mode; past Invites stay. → FR-106, FR-108, FR-139, FR-145
2. She edits moderation policy text and numeric thresholds (flag confidence, photo-Strike count). New thresholds apply to subsequent messages; they do not silently rewrite old decisions. → FR-140, NFR-003
3. She publishes or updates Advisory Board names and Académie articles (minimum five scholar-reviewed in MVP). → FR-115, FR-116, FR-141
4. She views internal metrics (Verified Members by level, dual-confirmed marriages, report SLA, scan-deferred events). Public counters she can promote are proof-backed only. → FR-092, FR-101, FR-142
5. She processes a Member deletion / export / CIL access request through ticketing with a status page. → FR-019, FR-143, NFR-008
6. Hosting location is disclosed on the public privacy page. She cannot hide it. → FR-120, NFR-002

## 3. Glossary

Downstream workflows must use these terms exactly. FRs, UJs, and SMs use them verbatim.

- **Académie** — Scholar-reviewed marriage-education library (wali, mahr, rights, haya, honesty). MVP seed is five articles.
- **Advisory Board** — Named imams/scholars shown on the site; they review Académie copy and take fiqh-edge escalations. They are not a mufti-bot.
- **Ban** — Permanent account termination on the sanctions ladder.
- **Blur** — Default concealment of a Photo for viewers who have not been granted a Reveal.
- **Brother** — A Member whose gender is man.
- **Chat** — The messaging thread that exists only after a Sister accepts an Invite.
- **CIL** — Commission de l’Informatique et des Libertés, Burkina Faso’s data-protection authority.
- **Code of conduct** — Published banned behaviours, including entertainment-seeking as non-marriage use.
- **Contact-share** — An explicit, mutual opt-in inside a Chat after which phone numbers, WhatsApp handles, and links may be exchanged. Default is off. Mahram presence is optional, not required, for Contact-share.
- **Flag queue** — The admin queue of already-delivered messages plus the flagged person (and scan-deferred / scan-failed events). Not a pre-delivery hold queue. The admin chooses warning, suspend, or another published action; the AI never applies the sanction.
- **Ice Breaker** — A scholar-sensible deen/family message template a Member may use when composing a Message Flash. AI-personalised Ice Breakers are NEXT.
- **Scan-deferred** — A recorded event when AI outage, timeout, or low confidence means the background scan did not complete. Delivery already happened. Visible on the admin flag queue and in Operator metrics.
- **Invite** — A request from one Member to another to open a Chat. Chat opens only after the Sister accepts.
- **Life plans** — Profile field for nikah timing and household intent. Enum: `ready_now` / `within_year` / `exploring`. `[ASSUMPTION]`
- **Marital status** — Profile enum: `single` / `married` / `divorced` / `widowed`. Brothers who are `married` must also set Polygamy intent.
- **Lite mode** — Low-bandwidth data-saver: deferred images, compressed Photos, no autoplay video, offline-cached browse queue.
- **Mahram** — The product role for a Sister-invited guardian (father / brother / uncle / other mahram). Member-facing French copy may say *wali*. Requirements use Mahram.
- **Member** — A registered person using the product as Sister or Brother after gender is set.
- **Message Flash** — A personalised first message attached to an Invite.
- **Moderator** — A Trust & Safety human who decides cases. Distinct from Operator and from Mahram.
- **Operator** — An admin who configures pricing, `sister_reach_mode`, moderation policy/thresholds, Advisory Board content, metrics, and deletion/CIL requests.
- **Photo** — A still image on a Profile or in a Chat.
- **Polygamy intent** — Brother-only enum: `no` / `yes`. Visible to Sisters before they accept an Invite.
- **Premium** — Paid reach and convenience. Brothers always pay for higher daily Invite quota (FR-044) and faster human-review queue (FR-013). Sisters buy the same packs only when `sister_reach_mode` is `same_quota_as_brothers`. Ranking and boosts are NEXT (FR-111). Never Verification, Blur, Mahram, Report, or Chat after an accepted Invite.
- **Profile** — A Member’s matrimony record (criteria, description, Photos).
- **Report** — An in-app flag of a Profile or message that opens a Moderator case and starts the report SLA clock.
- **Reveal** — Per-viewer un-Blurring of Photos, granted by the owner (on accepted Invite, on request, or never) and revocable.
- **sister_reach_mode** — Operator setting. `free_unlimited` (DEFAULT): Sisters send Invites with no daily quota and no paid pack. `same_quota_as_brothers`: Sisters use the same 1/3/6-month packs (no silent auto-renew) and the same Free and Premium daily Invite caps as Brothers (FR-044). Both values exist on day one. A change applies to subsequent Invites; past Invites are not deleted. Brothers have no free-reach mode.
- **Sister** — A Member whose gender is woman.
- **Strike** — A recorded policy violation that feeds the sanctions ladder (including the photo-Strike rule).
- **Ta'aruf stage** — Productized courtship stage: **invite** / **chat** / **meeting** / **married**. Always visible on the Chat.
- **Verification** — Phone OTP + liveness selfie + ID, free, separate from Premium. Levels: phone / ID / Mahram.
- **Verified-Mahram** — Badge on a Mahram who completed optional ID + liveness (FR-078). Member-facing French may say *wali vérifié*. Requirements use Verified-Mahram.
- **Verified marriage** — A nikah both spouses confirmed via the joint report. The public counter counts only these.
- **Voice note** — An asynchronous audio message in a Chat. Delivered immediately; speech-to-text + audio classification run in the background after send.
- **XOF** — West African CFA franc. The product’s pricing currency (also written FCFA in member-facing copy only as a currency symbol, not as a second product term).

## 4. Features

Each FR is a capability with testable acceptance criteria. Horizon is MVP unless marked **NEXT** or **LATER**. Realizes journeys by ID.

### 4.1 Identity, account, and onboarding

**Description:** Accountable identity before public visibility. Farata offers email + password + pseudonym + gender Offered (seen), Google sign-in Offered (seen), and ID + selfie Verification Claimed (marketing). This product adds free phone OTP and keeps Verification off the paywall (D13). Realizes UJ-1, UJ-2.

#### FR-001: Create account with email, password, pseudonym, and gender

A prospective Member can create an account with email, password, unique pseudonym, and gender (Sister or Brother).

**Acceptance criteria:**
- Given an unused email and unused pseudonym, When the person submits a password that meets the published rules plus a gender, Then an account exists and the Profile is **not** publicly visible until FR-012 and FR-014 succeed.
- Given a taken email or taken pseudonym, When they submit, Then no account is created and the conflicting field is named.

#### FR-002: Phone OTP

A Member must verify a phone number by OTP before public visibility.

**Acceptance criteria:**
- Given a phone number that has not completed OTP, When the Member requests a code, Then an OTP is sent and public browse listing remains blocked.
- Given a correct OTP before expiry, When they submit it, Then the phone level of Verification is granted.
- Given an incorrect or expired OTP, When they submit, Then Verification is not granted and they may resend per published cooldown.

#### FR-003: Google sign-in

A Member may sign in with Google as an additional method. The product must not depend on Google-only identity in Burkina.

**Acceptance criteria:**
- Given a valid Google account, When the Member chooses Google sign-in, Then they can complete account linking and still must complete FR-002 and FR-014.
- Given Google is unavailable, When the Member uses email + password, Then they can still create and use an account.

#### FR-004: Apple sign-in — NEXT

Apple sign-in ships with native iOS (store-compliance), not dropped.

**Acceptance criteria:**
- Given native iOS is in scope for a release, When that release ships, Then Apple sign-in is offered on iOS.
- Given MVP Android / web / PWA, When a Member signs in, Then Apple sign-in is not required.

#### FR-005: Sincerity pledge

At signup the Member commits before Allah to seek marriage and accepts the Code of conduct and privacy notice. Copy names honesty about existing marriage.

**Acceptance criteria:**
- Given signup, When the Member has not accepted the pledge and rules, Then the account is not created.
- Given behaviour that looks like entertainment browsing `[ASSUMPTION: heuristics defined in T&S playbook]`, When the system triggers reaffirmation, Then the Member must re-accept before sending further Invites.

#### FR-006: Email verification

The Member verifies email via a link with expiry and resend.

**Acceptance criteria:**
- Given a new account, When they open a valid unexpired link, Then email is marked verified.
- Given an expired link, When they request resend, Then a new link is issued and the old one fails.

#### FR-007: Captcha / bot check

Auth endpoints present a bot check.

**Acceptance criteria:**
- Given a failed captcha, When signup or login is submitted, Then the account action is rejected.
- Given automated credential stuffing above the published rate, When requests continue, Then the endpoint returns a rate-limit and does not create accounts.

#### FR-008: Password reset and remember-me

A Member can reset a password by email and optionally persist a session.

**Acceptance criteria:**
- Given a verified email, When they request reset, Then a single-use expiring link lets them set a new password and invalidates old sessions except the new one.
- Given remember-me is off, When they close the client, Then the next launch requires authentication (PIN may still apply — FR-020).

#### FR-009: Guided onboarding (browse vs Invite-ready)

Onboarding splits **minimum-to-browse** from **complete-to-send-Invite**, with Mooré/Dioula audio so low-literacy Members can finish without reading French (P7).

**Acceptance criteria:**
- Given minimum fields only, When the Member finishes onboarding, Then they can browse (after visibility gates) and cannot send an Invite.
- Given Invite-ready fields complete, When they finish, Then they can send an Invite subject to quotas.
- Given audio language Mooré or Dioula selected, When they play a step, Then that step’s audio plays.

#### FR-010: Audio onboarding prompts

Mooré and Dioula audio cover onboarding, photo rules, and pricing-trust lines (D18, D40).

**Acceptance criteria:**
- Given a Member selects Mooré or Dioula audio, When they open onboarding, photo-rules, or the no-auto-renew pricing explanation, Then audio is available without requiring them to read the French paragraph.
- Given audio fails to load on 2G, When they retry, Then the step remains usable via pictograms (FR-070).

#### FR-011: Age gate 19+

**[ASSUMPTION] A1 (verbatim):** Minimum age is **19+** (Farata parity, conservative). Rationale: Farata Mentions légales Claimed 19+; stores rate Farata 17+ (iOS) / 18+ (Play) Offered (seen) as store ratings. A conservative floor reduces minor-adjacent risk in a matrimony product and matches the competitor’s published rule. **Flag for legal review:** Burkina Faso civil majority and marriage-age law, plus our own store ratings (likely 17+/18+), must be confirmed before launch. If counsel requires 18+, the PRD will add extra protections for 18–21 rather than silently lowering the gate.

**Acceptance criteria:**
- Given a date of birth that makes the person younger than 19, When they attempt signup or human review, Then the account is rejected or held (FR-091) and is never publicly listed.
- Given DOB on the ID document disagrees with self-declared age toward a minor, When FR-014 runs, Then the Profile is held per FR-091.

#### FR-012: Human review of every new Profile

Every new Profile is human-reviewed before public visibility. Paid faster queue is a perk, not a rubber stamp. Reviewers are trained on BF photo-modesty norms.

**Acceptance criteria:**
- Given a new Profile that has not been approved, When any other Member browses or searches, Then that Profile does not appear.
- Given Premium, When a Profile enters the queue, Then it is ordered ahead of Free but still requires a human decision.
- Given rejection, When the Member is notified, Then reasons map to published photo/Profile rules (FR-070).

#### FR-013: Published free review SLA

The product publishes an honest free-queue SLA. `[ASSUMPTION]` Working target: 24 hours for Free, faster for Premium, until ops measures real BF capacity. Farata’s 12–24h / 30 min / 10 min figures disagree and are Claimed (marketing).

**Acceptance criteria:**
- Given the public help/pricing surfaces, When a Member reads review timing, Then a single SLA is stated (no contradictory numbers).
- Given a Free Profile waiting longer than the published SLA, When the Operator dashboard is opened, Then the case is flagged as SLA-breach.

#### FR-014: ID document plus liveness selfie — free

Verification with ID + liveness selfie is free and separate from Premium (D13, P9).

**Acceptance criteria:**
- Given a Member without Premium, When they submit ID + liveness, Then they can complete Verification without payment.
- Given liveness does not match Profile Photos, When review runs, Then the Profile is not approved and the Member is asked to retake.
- Given Premium purchase, When the Member has not completed ID + liveness, Then they still cannot become publicly visible.

#### FR-015: Verification levels on the Profile

Profiles show phone / ID / Mahram levels. Premium must not display a “looks verified” badge.

**Acceptance criteria:**
- Given completed phone OTP only, When another Member views the Profile, Then only the phone level is shown.
- Given ID + liveness approved, When another Member views the Profile, Then the ID level is shown.
- Given a Mahram who completed optional ID (FR-078), When another Member views the Sister’s Profile or Chat, Then the Verified-Mahram level is shown.
- Given Premium is active, When the Profile is rendered, Then no badge implies identity Verification from payment alone.

#### FR-016: Photo required to contact; may stay Blurred

A Profile Photo is required to send an Invite. Sisters may remain Blurred until Reveal-on-accepted-Invite or Reveal-on-request (P10, D8).

**Acceptance criteria:**
- Given a Member with no Profile Photo, When they try to send an Invite, Then the action is blocked with a prompt to add a Photo.
- Given a Sister who chose Blur, When an unmatched Brother views her Profile, Then he sees a Blurred Photo, not a clear face.

#### FR-017: Edit Profile; Photo changes re-moderated

A Member may edit the Profile any time. Changed Photos are re-moderated before they replace the live Photo.

**Acceptance criteria:**
- Given an approved Profile, When the Member uploads a new Photo, Then the old Photo remains live until the new one is approved or rejected.
- Given rejection of the new Photo, When the Member views the Profile, Then the previous approved Photo remains (subject to Strike rules).

#### FR-018: Deactivate and reactivate with named life-pauses

A Member can deactivate and reactivate. Named pauses: Ramadan, exams, travel, grief — plus free text.

**Acceptance criteria:**
- Given an active Member, When they deactivate with a named reason, Then they disappear from browse and cannot receive new Invites; existing Chats show a pause state.
- Given a deactivated Member, When they one-tap reactivate, Then visibility returns without repeating full onboarding (Verification and review remain valid unless Photos changed).

#### FR-019: Self-serve delete, export, status, ticketing

Deletion works: instant self-serve delete + export, status page, real ticketing — not Gmail-only (D15). Farata deletion is Claimed (marketing); one Play review reports it broken (S16; not Offered (seen) as a working feature).

**Acceptance criteria:**
- Given an authenticated Member, When they confirm delete, Then the account is scheduled for erasure per NFR-008 and they receive a status URL.
- Given they request export before or with delete, When the export is ready, Then they can download it from the status page without emailing a personal inbox.
- Given a stuck request, When they open the ticket from the status page, Then an Operator/support queue owns it (FR-143).

#### FR-020: Shared-device PIN

A Member (and a Mahram) can lock the client with a PIN on a shared Android.

**Acceptance criteria:**
- Given PIN is enabled, When the app is backgrounded longer than the published timeout `[ASSUMPTION: 60 seconds]`, Then re-entry requires the PIN.
- Given five incorrect PIN attempts, When the sixth is entered, Then the local session locks and the Member must re-authenticate with password or OTP.

### 4.2 Profiles and discovery

**Description:** Marriage-criteria Profiles, a Lite grid, private favourites. Vanity/stalking surfaces (who favourited me, visitors list, online-now) are NEXT. Realizes UJ-1, UJ-2.

#### FR-021: Profile fields

A Profile stores age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, and Photos.

**Acceptance criteria:**
- Given Invite-ready onboarding, When a required field is empty, Then the Member cannot send an Invite.
- Given a Member views another Profile, When fields are present, Then they render in French-first copy using Glossary marital-status values.

#### FR-022: Islamic criteria (core)

Core religious criteria: madhhab, practice level, intentions. Confrérie and hijra fields are FR-029 (NEXT unless cheap enough to include — `[ASSUMPTION]` treat as NEXT in this PRD so architecture does not assume them).

**Acceptance criteria:**
- Given Profile edit, When the Member saves, Then madhhab, practice, and intentions are persistable and filterable (FR-024).
- Given a blank madhhab, When they try to send an Invite, Then the completeness meter (FR-023) names that field.

#### FR-023: Completeness meter

The meter names missing Islamic criteria without shaming.

**Acceptance criteria:**
- Given missing fields, When the Member views their Profile, Then the meter lists the missing criteria by field name and does not use insulting copy.
- Given all Invite-ready fields present, When they view the meter, Then it shows complete.

#### FR-024: Search filters (basic)

Basic filters: location, marital status, religious criteria, life plans. Distance is included. Advanced paid filters are FR-030 (NEXT).

**Acceptance criteria:**
- Given browse, When a Sister filters Marital status `married` and Polygamy intent `yes`, Then Brothers who have not set those fields are excluded.
- Given a distance filter of 25 km around Ouagadougou `[ASSUMPTION: radii 10 / 25 / 50 / city-wide]`, When applied, Then Profiles whose city centroid is outside that radius are excluded.
- Given a Life plans filter `ready_now`, When applied, Then only Profiles with that enum remain.
- Given a filter combination with zero results, When applied, Then an empty state is shown (no invented Profiles).

#### FR-025: Grid browse

Members browse a grid of cached Profiles per session (Lite-friendly).

**Acceptance criteria:**
- Given visibility-approved opposite-gender Profiles, When the Member opens browse, Then a grid renders without requiring a live high-bandwidth video.
- Given Lite mode, When images are deferred, Then text criteria still appear.

#### FR-026: Private favourites

A Member can save a private favourite list. “Who favourited me” is FR-033 (NEXT).

**Acceptance criteria:**
- Given a viewed Profile, When the Member favourites it, Then it appears only on their private list.
- Given another Member, When they view their own Profile, Then they cannot see who favourited them in MVP.

#### FR-027: Visit patterns for Moderators

Mass-view-then-never-Invite patterns are available to Moderators. Member-facing visitors list is FR-034 (NEXT).

**Acceptance criteria:**
- Given a Member views more than the published threshold of Profiles in 24h without sending an Invite `[ASSUMPTION: 50]`, When a Moderator opens T&S signals, Then that Member is listed.
- Given MVP, When a Member opens settings, Then there is no “who viewed me” list.

#### FR-028: Ta'aruf stages

Each Invite/Chat shows stage **invite** / **chat** / **meeting** / **married**.

**Acceptance criteria:**
- Given a pending Invite, When either party views it, Then stage is **invite**.
- Given an accepted Invite, When they open the Chat, Then stage is **chat** until FR-028 meeting confirm or a Verified marriage is confirmed.
- Given both confirm marriage (FR-096), When they view the thread, Then stage is **married**.
- Given stage **chat**, When either Member or an attached Mahram proposes **meeting** and the other Member confirms, Then stage becomes **meeting** for both Members and the Mahram is notified. `[ASSUMPTION]` A Mahram may reject a proposal, which pauses compose (FR-075) until the Sister resumes. Brother-only mark without Sister confirm does not change stage. No certificate is required in MVP.

#### FR-029: Confrérie and hijra fields — NEXT

Extra Islamic taxonomy. Include in MVP only if cheap; this PRD flags NEXT.

**Acceptance criteria:**
- Given a NEXT release that includes these fields, When a Member edits Profile, Then confrérie and hijra intention are persistable and filterable.
- Given MVP, When a Member edits Profile, Then these fields are absent or hidden without breaking FR-022.

#### FR-030: Advanced filters tier — NEXT

Paid convenience after basic FR-024 works.

**Acceptance criteria:**
- Given NEXT, When a Brother has Premium, Then additional filters (e.g. madhhab-only advanced set) are available.
- Given MVP, When a Member searches, Then only FR-024 filters are offered.

#### FR-031: AI compatibility score — NEXT

Needs a grounded model (D21). Rule-based overlap may ship as an interim non-score in addendum notes; the scored AI feature is NEXT.

**Acceptance criteria:**
- Given NEXT, When both Profiles have criteria, Then a documented score is shown with a “not a fatwa” disclaimer.
- Given MVP, When a Member views a Profile, Then no AI compatibility score is shown.

#### FR-032: Daily recommendations that learn — NEXT

Needs usage data.

**Acceptance criteria:**
- Given NEXT, When a Member opens home, Then a daily list is produced from explicit behaviour signals.
- Given MVP, When a Member opens home, Then they see search/browse, not a learning recs rail.

#### FR-033: Who favourited me — NEXT

Vanity Premium. Private favourites (FR-026) ship in MVP.

**Acceptance criteria:**
- Given NEXT, When a Member opens the list, Then they see who favourited them per published privacy rules.
- Given MVP, this list does not exist.

#### FR-034: Member-facing visitors list — NEXT

Stalking risk. T&S use is FR-027.

**Acceptance criteria:**
- Given NEXT, When shipped, Then a Sister hide-visits control exists.
- Given MVP, Members cannot see who viewed them.

#### FR-035: Online-now indicator — NEXT

Stalking risk; Sister hide-online control required if shipped.

**Acceptance criteria:**
- Given NEXT and a Sister who hid online, When a Brother views her Profile, Then online-now is not shown.
- Given MVP, online-now is not shown.

#### FR-036: Anonymous mode — NEXT

Defined as: hide last-seen and hide from browse except people the Member Invited (D36). Farata “mode anonyme” is Claimed (marketing); behaviour unknown.

**Acceptance criteria:**
- Given NEXT and anonymous mode on, When an unmatched Member browses, Then the anonymous Member does not appear unless they sent that person an Invite.
- Given MVP, this mode is not offered.

#### FR-037: Marital-status honesty and polygamy intent

Brothers declare Marital status (`single` / `married` / `divorced` / `widowed`) and Polygamy intent (`no` / `yes`). Fields are visible to Sisters **before** accept. Misrepresentation is a Report reason. ID does not prove Marital status.

**Acceptance criteria:**
- Given a Brother, When he saves a Profile, Then Marital status and Polygamy intent are required. If Marital status is `married`, Polygamy intent must be `yes` or the save is rejected.
- Given a Sister viewing an Invite, When she has not accepted, Then she can see those fields.
- Given a Report reason “misrepresented marital status,” When submitted, Then a Moderator case opens (FR-087).

### 4.3 Invites and matching

**Description:** Woman’s consent is first-class. Farata gates starting a conversation behind Premium Offered (seen) [bundle]. This product lets Sisters start Invites; default reach is free and unlimited, and the Operator can apply the same invite quota as Brothers (D20). Realizes UJ-1, UJ-2.

#### FR-038: Send an Invite

A visibility-approved Member who is Invite-ready can send an Invite to an eligible opposite-gender Member.

**Acceptance criteria:**
- Given Invite-ready Sister or Brother within quota, When they submit an Invite from a Profile, Then it appears on the recipient’s received list (FR-040).
- Given the recipient is deactivated, Banned, or married, When they submit, Then the Invite is rejected.

#### FR-039: Accept or decline an Invite

The recipient accepts or declines. Chat opens only with Sister consent. `[ASSUMPTION]` If she sent the Invite, that send counts as consent; if he sent it, she must accept.

**Acceptance criteria:**
- Given a Brother-sent Invite, When the Sister accepts, Then a Chat opens.
- Given a Brother-sent Invite, When the Sister declines, Then no Chat opens and FR-042 applies.
- Given a Sister-sent Invite, When the Brother accepts, Then a Chat opens.

#### FR-040: Invite lists — sent, received, accepted

A Member can see who Invited them and who accepted.

**Acceptance criteria:**
- Given sent Invites, When the Member opens Sent, Then each row shows pending / accepted / declined (declined does not name guilt copy — FR-042).
- Given received Invites, When they open Received, Then they can accept or decline.
- Given accepted Invites, When they open Accepted, Then each row opens the Chat.

#### FR-041: Chat opens only after Sister consent

A Chat does not exist until the Sister’s consent condition in FR-039 is met.

**Acceptance criteria:**
- Given a pending Brother-sent Invite, When the Brother opens messages, Then there is no Chat thread.
- Given Sister accept, When either opens messages, Then the Chat exists and Ta'aruf stage is **chat**.

#### FR-042: Quiet decline

Decline is quiet: no “she saw this,” no guilt timer. Brother sees not-accepted / declined without a lecture.

**Acceptance criteria:**
- Given a decline, When the Brother views the Invite, Then status is declined and no Sister-read receipt is shown.
- Given a decline, When the Sister views the Brother’s Profile, Then she is not prompted to explain.

#### FR-043: No resend after refuse

After a decline, the same sender cannot send a new Invite to that recipient.

**Acceptance criteria:**
- Given a declined Invite, When the sender tries again, Then the action is blocked.
- Given the recipient later sends an Invite to them, When accepted, Then a Chat may open (her initiation).

#### FR-044: Daily Invite quota for Brothers

Brothers are always quota-capped. Free-tier Brothers have a tight daily quota. `[ASSUMPTION]` **3 Invites per UTC day** on Free; Premium raises the published quota. Sisters follow FR-045, which depends on `sister_reach_mode`.

**Acceptance criteria:**
- Given a Free Brother who already sent 3 Invites today, When he sends a fourth, Then it is rejected with the reset time.
- Given Premium, When he sends a 4th Invite the same day, Then it succeeds until **15** Invites that UTC day `[ASSUMPTION]`. The 16th is rejected with the reset time.
- Given MVP Premium, When browse ranking is inspected, Then no paid ranking boost is applied (FR-111 is NEXT).
- Given any `sister_reach_mode`, When a Brother opens Invite or pricing UI, Then he does not gain a free-unlimited reach mode.

#### FR-045: Sister Invite reach follows `sister_reach_mode`

Sister Invite reach is not hardcoded unlimited. Default `sister_reach_mode` is `free_unlimited`: a Sister sends Invites with no daily quota and no paid pack; she does not pay for the reach actions Brothers pay for. When the Operator sets `same_quota_as_brothers`, the FR-044 caps apply to Sisters (Free **3** and Premium **15** per UTC day, still `[ASSUMPTION]`) and a missing pack means the Free cap, not a block on safety. Mahram, Blur, Report, Block, and Verification stay free in both modes (D20, FR-105). Chat after an accepted Invite stays free.

**Acceptance criteria:**
- Given `sister_reach_mode` is `free_unlimited`, When a Sister sends her Nth Invite in a day, Then it is not blocked by a paid quota and she is not asked to buy a pack.
- Given `sister_reach_mode` is `same_quota_as_brothers` and the Sister has no pack, When she sends a 4th Invite the same UTC day, Then it is rejected with the reset time (FR-044 Free cap).
- Given `sister_reach_mode` is `same_quota_as_brothers` and the Sister has Premium, When she sends Invites, Then the FR-044 Premium cap (15 per UTC day) applies.
- Given either mode and she has no payment method, When she uses Blur, Mahram, Report, Block, or Verification, Then those actions succeed.

#### FR-046: Message Flash

An Invite may carry a personalised first message.

**Acceptance criteria:**
- Given an Invite with Message Flash, When the recipient opens it, Then the Flash text is visible before accept.
- Given a Mahram already attached, When the Flash is delivered, Then he can read it (FR-048).
- Given Flash text later fails the background scan, When the sender submits, Then the Invite and Flash are still delivered; the person is flagged for admin and the Flash is not unsent.

#### FR-047: Ice Breaker templates

Scholar-sensible deen/family templates. AI-personalised Ice Breakers are FR-049 (NEXT).

**Acceptance criteria:**
- Given compose Flash, When the Member picks a template, Then they can edit it before send.
- Given MVP, When they compose, Then no model-generated personalised Ice Breaker is required.

#### FR-048: Message Flash is Mahram-visible from minute one

If a Mahram is already attached, the Flash is read-all.

**Acceptance criteria:**
- Given attached Mahram, When a Flash is delivered, Then it appears in his read-all view.
- Given no Mahram, When a Flash is delivered, Then only the two Members see it.

#### FR-049: AI-personalised Ice Breakers — NEXT

Wait for grounded coach (D21).

**Acceptance criteria:**
- Given NEXT and a grounded coach, When the Member requests ideas, Then suggestions cite scholar-reviewed sources and say they are not a fatwa.
- Given MVP, this generator is absent.

### 4.4 Chat, Voice notes, and notifications

**Description:** Real-time Chat after accept. Voice notes are a safety feature, not a Premium-only toy. Farata voice is Claimed (marketing) and Premium-gated in marketing. Realizes UJ-1, UJ-2, UJ-3.

#### FR-050: Real-time Chat

After Chat opens: typing indicator, reactions, Photo share from gallery or camera. Curated GIFs/stickers are FR-054 (NEXT). Zero-GIF launch is acceptable.

**Acceptance criteria:**
- Given an open Chat, When a Member types, Then the other Member sees a typing indicator within 2 seconds on a median 3G connection (NFR-005).
- Given they send a Photo, When the send is stored, Then the recipient sees the Photo without waiting for FR-063. A later flag does not unsend it.
- Given they add a reaction, When the other views the message, Then the reaction is visible.

#### FR-051: Voice notes

Voice notes in French / Mooré / Dioula. Delivered immediately; STT + audio classification run in the background after send. Not a safety paywall.

**Acceptance criteria:**
- Given a Free Member in a Chat, When they send a Voice note, Then the recipient hears it without waiting for FR-064.
- Given classification or STT later hits a banned phrase list (including local-language lists), When the background scan flags it, Then the Voice note stays delivered, the person is flagged for admin, and a Strike path may open only after an admin action (FR-144).
- Given Premium is inactive, When they send a Voice note, Then the action is not payment-blocked.

#### FR-052: Push notifications

Pushes for messages, Invites, and (internally) visit signals as configured. Also: Mahram digest events, Reveal requests, moderation outcomes. Quiet hours default is FR-127 (NEXT).

**Acceptance criteria:**
- Given an accepted Chat and push enabled, When a delivered message arrives, Then a push is sent without a clear Sister Photo thumbnail (Blurred thumb).
- Given push enabled, When the Sister receives an Invite, Then a push is sent.
- Given an attached Mahram pauses or ends, When the action commits, Then both Members receive a push (and SMS per FR-053).
- Given a Reveal request, When it is created, Then the Photo owner receives a push.
- Given an admin sanction or Report outcome, When the decision is saved, Then the affected Member receives a push.
- Given push permission denied, When a message arrives, Then in-app unread still increments.

#### FR-053: SMS essential-path alerts

SMS for essential path: Invite received (Sister), Mahram flag/pause/end, admin sanctions that suspend or Ban the Member, OTP. USSD is FR-055.

**Acceptance criteria:**
- Given a Sister with SMS alerts on, When she receives an Invite, Then an SMS is sent without Photo payloads.
- Given a Mahram action pause/end/flag, When it is committed, Then the Sister and the Brother receive SMS.

#### FR-054: Curated GIFs / stickers — NEXT

Modest curated pack only.

**Acceptance criteria:**
- Given NEXT, When a Member opens the picker, Then only the curated set is available.
- Given MVP, When they compose, Then no GIF picker is required.

#### FR-055: USSD essential path — NEXT unless feasible

`[ASSUMPTION]` USSD is NEXT (cost/operator unknown). SMS remains MVP.

**Acceptance criteria:**
- Given a NEXT USSD release, When a Sister dials the published code, Then she can accept or decline a pending Invite without data.
- Given MVP, USSD is not required for launch.

### 4.5 Photo privacy (Blur and Reveal)

**Description:** Farata Blur is Offered (seen) [bundle] as all-or-nothing reveal-on-acceptance. Per-viewer Reveal/Revoke is Not publicly evidenced. This product raises to D8. Realizes UJ-1. Must-have #3.

#### FR-056: Blur by default

Opposite-gender viewers see Blurred Profile and uploaded Photos by default at upload.

**Acceptance criteria:**
- Given a newly uploaded Photo, When an unmatched opposite-gender Member views it, Then it is Blurred.
- Given same-gender Moderator console without unblur grant, When they view the case, Then the Photo is Blurred (FR-093).

#### FR-057: Per-viewer Reveal policy

The owner chooses Reveal-on-accepted-Invite, Reveal-on-request, or never — per viewer, not global-only.

**Acceptance criteria:**
- Given policy “never,” When an Invite is accepted, Then that viewer still sees Blur.
- Given policy “on accepted Invite,” When that viewer’s Invite is accepted, Then they see clear Photos until Revoke.
- Given two Brothers, When the Sister Reveals to A only, Then B remains Blurred.
- Given a Brother, When he opens Photo settings, Then he can choose the same three Reveal policies as a Sister (must-have #3 applies to both).

#### FR-058: Reveal-on-request

A viewer may request Reveal; the owner approves per person.

**Acceptance criteria:**
- Given a request, When the owner approves, Then only that viewer is Revealed.
- Given a request, When the owner ignores or denies, Then the Photo stays Blurred and the requester is not spammed more than the published cap `[ASSUMPTION: 1 pending request per pair]`.

#### FR-059: Revoke Reveal

The owner can Revoke any time. After Revoke the viewer sees Blur again.

**Acceptance criteria:**
- Given a Revealed viewer, When the owner Revokes, Then subsequent views and notification thumbs are Blurred within 60 seconds.
- Given Revoke, When the viewer had cached the image, Then the product still stops serving the clear URL (anti-leak polish is FR-061 NEXT).

#### FR-060: No marketing use of Profiles without per-use opt-in

Opposite of Farata rules §07 Offered (seen) (profiles may be used in ads; opt-out on request).

**Acceptance criteria:**
- Given no per-use opt-in, When Operator exports “campaign images,” Then Member Photos are not included.
- Given a specific campaign opt-in, When that campaign ends, Then the grant does not reuse for a new campaign.

#### FR-061: Anti-leak polish — NEXT

Watermark per viewer, screenshot notice, no downloads, Blurred notification thumbs (thumbs Blur is also an MVP floor on FR-052).

**Acceptance criteria:**
- Given NEXT, When a Revealed Photo is shown, Then it carries a per-viewer watermark and download is disabled.
- Given MVP, When a push is sent, Then thumbs are already Blurred (FR-052).

### 4.6 Passive AI moderation and the strike pipeline

**Description:** Must-have #2. Farata homepage Claimed “AI scans every message”; FAQ Claimed “we do not read private chats” (evidenced contradiction). Voice/chat-Photo moderation is Not publicly evidenced. This product delivers Chat text, Chat Photos, Voice notes, and Message Flash immediately, then runs a background scan against published red flags (D4, D6). The AI reports a flag to an admin and marks the person; it does not block, hold, refuse, or delay delivery, and it does not auto-suspend. Honesty is that the AI flags for a human admin and does not silently delete or block. Profile Photo and bio remain publish-gated (FR-065). Realizes UJ-1, UJ-4.

**Locked decision (Maitchibi Fayçal, 2026-10-01):** AI moderation is passive, not an active gate before send. This replaces every earlier requirement that scanned Chat before delivery, held on AI timeout, or fail-closed so the recipient never saw an unscanned message.

#### FR-062: Chat text delivered, then passively scanned

**Acceptance criteria:**
- Given a Chat text, When the sender taps send, Then the message is stored and the recipient sees the text without waiting for the AI.
- Given a later flag, When the background scan reports a red flag, Then the already-delivered text is not unsent; the person is flagged for admin (FR-066, FR-144).

#### FR-063: Chat Photos delivered, then passively scanned

**Acceptance criteria:**
- Given a Chat Photo, When uploaded, Then the recipient’s thread shows the image without waiting for the AI. Unauthorized viewers still never receive unblurred originals (FR-056–FR-059).
- Given a later flag, When the background scan reports a red flag, Then the already-delivered Photo is not unsent; the person is flagged for admin (FR-066, FR-144). Blur remains the Photo-privacy control, not a moderation delivery outcome.

#### FR-064: Voice notes delivered, then STT + audio classifier in background

Includes French and local-language keyword lists. Current STT (Whisper-class) has no `mos` / `dyu`; word lists plus human review are how the passive scan handles Mooré and Dioula.

**Acceptance criteria:**
- Given a Voice note, When the sender sends it, Then the recipient can hear it without waiting for STT or the classifier.
- Given Whisper (or equivalent) has no mos/dyu, When the Voice note is in Mooré or Dioula, Then the passive scan uses word lists plus human review; it does not hold the Voice note before delivery.
- Given low-confidence on Dioula/Mooré slang, When the model is below the Operator threshold (FR-140), Then the person is flagged for admin or a scan-deferred event is recorded; the Voice note stays delivered.

#### FR-065: Profile Photos and bio moderated before publish

Publish gating, not Chat delivery. Unchanged: a Profile Photo or bio must not be publicly visible until reviewed.

**Acceptance criteria:**
- Given a new Profile Photo or bio edit, When review/AI has not allowed, Then other Members do not see the new content.
- Given bio block, When the Member views edit, Then the previous allowed bio remains live.

#### FR-066: Moderation outcomes

Outcomes of the AI scan: **flag-for-admin** and a **flagged-person** mark. Not block, hold, or blur-and-warn as delivery outcomes. Blur-and-warn is not reused as a moderation delivery outcome. Admin actions (FR-144) are warning, suspend (when too indecent), or another published action. The AI does not choose them.

**Acceptance criteria:**
- Given a red-flag scan result, When the background scan completes, Then the person is flagged, the already-delivered message is reported to the admin flag queue (FR-144), and the recipient still sees or hears the content.
- Given a later flag, When applied, Then the already-delivered message is not unsent. An admin may then warn, suspend, or take another published action.
- Given the AI scan, When it produces an outcome, Then that outcome is flag-for-admin only — not block, hold, or blur-and-warn as a delivery outcome. Blur remains the Photo-privacy control (FR-056).
- Given D6 policy, When the Member reads it, Then it explains that messages are delivered then scanned, that the AI flags for a human admin, and that the AI does not silently delete or block.

#### FR-067: Scan-deferred when AI is unavailable

AI outage, timeout, or low confidence does not hold or delay the message. Delivery already happened. Record a scan-deferred / scan-failed event for the admin queue so the gap is visible. This is not fail-closed. Do not invent a latency that blocks send.

**Acceptance criteria:**
- Given the AI vendor returns 5xx, times out, or returns low confidence, When a Member has already sent Chat text, Chat Photo, Voice note, or Flash, Then the recipient already has the content and send is not delayed.
- Given that gap, When it is recorded, Then a scan-deferred or scan-failed event appears in the admin flag queue (FR-144) so the gap is visible.
- Given Operator metrics, When viewed, Then scan-deferred / scan-failed events are counted (FR-142) and are not hidden.

#### FR-144: Admin flag queue and admin-chosen action

Already-delivered Chat items that the passive scan flags, plus scan-deferred / scan-failed events, appear in an admin flag queue with the flagged person. The admin chooses the action. The AI never applies a sanction.

**Acceptance criteria:**
- Given a passive-scan flag or a scan-deferred / scan-failed event, When it is recorded, Then the already-delivered message and the flagged person appear in the admin flag queue (not a pre-delivery hold queue).
- Given an item in that queue, When the admin decides, Then they choose warning, suspend (when the message is too indecent), or another published action. The AI does not choose or apply the sanction.
- Given the admin action, When saved, Then it may open or continue a Report → Strike → Ban case (FR-083, FR-085, FR-087). A later flag does not unsend what was already delivered.

#### FR-068: Scam and off-platform guardrails

Detect money requests, phone numbers, WhatsApp handles, and links. Romance-scam scoring (D5). In-Chat education: never send money to a suitor.

**Single predicate:** phone numbers, WhatsApp handles, and outbound links are **blocked** until both Members complete Contact-share. That is a deterministic product rule, not the AI gate. Mahram presence is **optional**, not required. Money-request language is still a red flag: the message is delivered and the person is flagged for admin.

**Acceptance criteria:**
- Given Contact-share is still off, When a Member sends a phone number, WhatsApp handle, or http(s) link, Then the message is blocked, the recipient never sees it, and both see the education interstitial. Example: “voici mon WhatsApp 70…” after accept, no Contact-share → block.
- Given both Members completed Contact-share and no Mahram is attached, When a Member sends a phone number, Then the message is delivered immediately; FR-062 still background-scans. Example: both tapped Contact-share → allow number.
- Given money-request language (including Wave / Orange Money ask patterns), When sent — Contact-share on or off — Then the message is delivered, the person is flagged for admin, and a Report may open. The message is not held or blocked before delivery.

#### FR-069: Photo Strike rule

Floor: 3 rejected Photos → 24h upload block (can tighten via FR-140).

**Acceptance criteria:**
- Given three rejected Profile or Chat Photos in the window, When the Member uploads a fourth within 24h of the third rejection, Then upload is blocked until the window ends.
- Given the window ends, When they upload, Then the Strike count for the block has reset per published policy.

#### FR-070: Published photo rules with pictograms and audio

Modest, recent, real, no third parties. Pictograms + French text + Mooré/Dioula audio (D40, P39).

**Acceptance criteria:**
- Given upload, When the Member opens rules, Then pictograms are visible without reading a paragraph.
- Given Mooré audio selected, When they play rules, Then audio matches the pictogram set.

### 4.7 Mahram in Chat

**Description:** Must-have #4. Farata family involvement is Offered (seen) as rules §04 policy; mahram-in-Chat is Not publicly evidenced. Optional, Sister-initiated. Realizes UJ-3.

**[ASSUMPTION] A2 (verbatim):** MVP wali path:

1. Sister invites her mahram **by phone number**.
2. Mahram verifies via **phone OTP** and **declares the relationship** (father / brother / uncle / other mahram).
3. Sister **confirms**.
4. Optional ID check earns a **“verified wali”** badge.
5. **No document proof of kinship in MVP** (avoids excluding orphans, converts, and families without papers).
6. Sister can **remove/report** the wali (D38). Wali **cannot send messages as her**.

Rationale: kinship documents are uneven in BF and would block the must-have; phone + sister confirmation + optional ID is a workable anti-fake-wali floor; cooling-off and “wali cannot be an unmatched male friend” stay as product rules. **Flag for legal review:** relationship declaration vs. false-identity / impersonation liability; who is an acceptable mahram if the father is deceased (fiqh + local practice); whether “other mahram” needs a constrained list.

#### FR-071: Sister invites a Mahram by phone

**Acceptance criteria:**
- Given a Sister, When she submits a phone number, Then an invite is sent to that number and no Chat message is sent as her.
- Given a Brother, When he tries to attach a Mahram to her Chat, Then the action is rejected.

#### FR-072: Mahram phone OTP and declared relationship

**Acceptance criteria:**
- Given the invite, When the invitee completes OTP and picks father / brother / uncle / other mahram, Then the Sister is asked to confirm (FR-073).
- Given they pick a class the product treats as “unmatched male friend” `[ASSUMPTION: not in the allowed enum]`, When they submit, Then the invite is rejected.
- Given cooling-off `[ASSUMPTION: 1 hour]` after OTP, When they try to take Mahram actions, Then pause/end are available only after Sister confirm.

#### FR-073: Sister confirms the Mahram

**Acceptance criteria:**
- Given a pending Mahram, When the Sister confirms, Then he becomes attached (FR-074).
- Given she ignores or rejects, When 7 days pass `[ASSUMPTION]`, Then the pending invite expires.

#### FR-074: Mahram reads all messages

**Acceptance criteria:**
- Given an attached Mahram, When any Chat message (including Message Flash) is delivered, Then he can read it.
- Given a later AI flag on an already-delivered message, When he opens the Chat, Then he still sees the delivered content; the flag does not hide it from him.

#### FR-075: Mahram can flag, pause, or end

**Acceptance criteria:**
- Given attached Mahram, When he flags a message, Then a priority Moderator case opens (FR-087).
- Given he pauses, When either Member opens the Chat, Then compose is disabled for both Members.
- Given a paused Chat, When the Sister, the Mahram who paused, or a Moderator resumes, Then compose is re-enabled. The Brother cannot resume. `[ASSUMPTION]`
- Given he ends, When either Member opens the thread, Then the Chat is terminal: compose stays disabled and stage does not revert. Ended Chats cannot be resumed.

#### FR-076: Mahram cannot send messages as the Sister

**Acceptance criteria:**
- Given attached Mahram, When he opens compose, Then there is no send-as-Sister control and the API rejects send-as-ward.
- Given a message in the Chat, When the Brother views it, Then the sender is never the Mahram impersonating the Sister.

#### FR-077: Sister can remove or Report the Mahram

**Acceptance criteria:**
- Given attached Mahram, When the Sister removes him, Then he loses read access within 60 seconds and receives SMS.
- Given she Reports him, When submitted, Then a Moderator case opens and she may enable emergency hide `[ASSUMPTION: Profile hidden from browse for 24h]`.

#### FR-078: Optional ID check → Verified-Mahram badge

**Acceptance criteria:**
- Given a confirmed Mahram who completes ID + liveness, When approved, Then the Verified-Mahram badge shows on the Chat header.
- Given he skips ID, When he is confirmed, Then he still has read-all; no kinship document is requested.

#### FR-079: Brother sees that a Mahram is present

**Acceptance criteria:**
- Given attached Mahram, When the Brother opens the Chat or the pending Flash, Then a persistent presence banner is shown.
- Given Mahram removed, When the Brother reopens, Then the banner is gone.

#### FR-080: Family-involvement guidance

Rules plus product: published guidance that family involvement is honorable, pointing at optional Mahram.

**Acceptance criteria:**
- Given the Code of conduct / help, When a Member opens family guidance, Then it describes Mahram-in-Chat as optional and Sister-initiated.
- Given onboarding, When a Sister reaches Chat-ready, Then she is offered (not forced) FR-071.

#### FR-081: Mahram dashboard — NEXT

Multi-ward + digest + priority flags (D2).

**Acceptance criteria:**
- Given NEXT, When a Mahram has two wards, Then one dashboard lists both with a weekly digest.
- Given MVP, When he has one ward, Then he uses per-Chat read-all (FR-074) without a multi-ward console.

#### FR-082: Chaperoned-meeting planner — NEXT

Full khitba planner with Mahram in the loop (D3). Lightweight **meeting** stage exists in FR-028 in MVP.

**Acceptance criteria:**
- Given NEXT, When both sides agree, Then they can propose time / place / attendees with the Mahram in the loop.
- Given MVP, When FR-028 meeting confirm occurs, Then stage is **meeting** without time/place/attendee fields.

### 4.8 Trust, Report, Block, sanctions

**Description:** Must-have #2 pipeline + must-have #6 enforcement. Realizes UJ-4.

#### FR-083: Report with published 24h SLA

**Acceptance criteria:**
- Given a Profile or message, When a Member submits a Report with a reason, Then a case exists and the SLA clock starts.
- Given 24 hours elapsed without a first human decision, When Operator metrics are viewed, Then the case is SLA-breach (NFR-003).

#### FR-084: Block

From Profile or Chat; they can no longer see or contact you.

**Acceptance criteria:**
- Given Block, When the blocked Member browses, Then the blocker’s Profile is absent.
- Given Block, When they send an Invite or Chat message, Then it is rejected.

#### FR-085: Sanctions ladder

Warning / suspension / Ban; suspended-account screen.

**Acceptance criteria:**
- Given a warning, When the Member opens the app, Then they see the warning and can continue under the published limits.
- Given suspension, When they authenticate, Then a suspended screen is shown and Chat/Invite/browse are disabled.
- Given Ban, When they authenticate with the same phone/ID, Then access is denied and FR-088 may link alts.

#### FR-086: False-report sanctions

**Acceptance criteria:**
- Given a Member whose Reports are repeatedly overturned above the published rate `[ASSUMPTION: 3 overturned in 30 days]`, When a Moderator applies P43, Then that Member can be warned or suspended for false Reports.

#### FR-087: Report → Strike → Ban console with evidence

Moderator console, evidence snapshots, priority from Mahram flags (D7 MVP-scale).

**Acceptance criteria:**
- Given a case, When a Moderator opens it, Then they see media, scores, Report text, and device/phone hints without leaving the case.
- Given they issue a Strike, When saved, Then the evidence snapshot is immutable on the case.

#### FR-088: Repeat-offender fingerprinting

Device / phone / ID linkage for Ban evasion (P44, D7).

**Acceptance criteria:**
- Given a Banned ID document hash, When a new account submits the same ID, Then it is held and not publicly listed.
- Given the same phone OTP on a new account after Ban, When they verify, Then the account is held for Moderator review.
- Given a device fingerprint previously tied to a Ban, When a new account is created from that device, Then the account is held for Moderator review and is not publicly listed. `[ASSUMPTION: fingerprint definition is an architecture input; product requires the hold.]`

#### FR-089: Code of conduct

Explicit banned behaviours: indecency, sexual talk, impersonation, multiple accounts, harassment, money requests/scams, hate, non-marriage use.

**Acceptance criteria:**
- Given signup, When the Member accepts rules, Then the Code of conduct version is stored on the account.
- Given entertainment-seeking determined by Moderator, When sanctioned, Then the reason code is non-marriage use.

#### FR-090: Member appeal

Honest policy plus appeal (D6).

**Acceptance criteria:**
- Given a suspension or Ban, When the Member submits an appeal, Then a second human (not the original decider) is assigned.
- Given overturn, When complete, Then access is restored and the overturn is counted on SM-C3.

#### FR-091: Age / liveness hold for suspected minors

**Acceptance criteria:**
- Given facial-age or ID DOB suggests under 19, When FR-014 or review runs, Then the Profile is held and never listed.
- Given hold, When a Moderator confirms 19+, Then listing may proceed; otherwise the account is closed.

#### FR-092: Periodic transparency stats

Public periodic stats: Reports handled, SLA met rate, Bans, scan-deferred events. No invented scale.

**Acceptance criteria:**
- Given a published period, When the public stats page renders, Then each number has a definition and is sourced from FR-142.
- Given zero Verified marriages, When the page renders, Then the counter shows 0 (FR-101).
- Given the D23 NEXT slice, When shipped, Then the public trust page lists more than the MVP two-to-three names **and** the FR-092 stats, still proof-backed only.

#### FR-093: Moderator unblur is audited (MVP floor; dual-control NEXT)

D31 dual-control / wellness is NEXT. MVP: least privilege + audit log. Realizes UJ-4.

**Acceptance criteria:**
- Given a Moderator, When they unblur a Sister Photo, Then they must enter a case reason and the event is written to the audit log (NFR-009) with actor, case id, timestamp.
- Given NEXT dual-control, When unblur is requested, Then a second Moderator must approve.

#### FR-094: Match-visible change-audit — NEXT

Marital status or Photo changes visible to current Chat partners (D35).

**Acceptance criteria:**
- Given NEXT, When a Brother changes marital status, Then Sisters in open Chats see a change notice.
- Given MVP, When he changes it, Then the Profile updates after re-review without an in-Chat audit rail.

### 4.9 Marriage outcomes

**Description:** Must-have #5. Farata testimonials Offered (seen) are app-experience quotes, not marriages. Couples reporting marriage is Not publicly evidenced. Realizes UJ-5.

#### FR-095: Joint “we got married” report

**Acceptance criteria:**
- Given two Members in an accepted Chat, When one starts the report naming the other, Then the other receives a confirmation request.
- Given no accepted Chat between them, When someone starts a report, Then it is rejected.

#### FR-096: Both must confirm

**Acceptance criteria:**
- Given only one confirmation, When 30 days pass `[ASSUMPTION]`, Then the report expires and the counter does not increment.
- Given the second confirmation, When saved, Then FR-098 and FR-101 may proceed.

#### FR-097: Optional private nikah proof

Certificate or imam/Mahram attestation, kept private.

**Acceptance criteria:**
- Given a confirmation, When they upload proof, Then it is visible only to the couple, designated Moderators, and Operators with a logged reason — never on the showcase.
- Given they skip proof, When both confirm, Then the Verified marriage still counts (honest dual-confirm is the bar; proof is optional).

#### FR-098: Joint married state

**Acceptance criteria:**
- Given dual confirm, When state applies, Then both Profiles leave browse and neither can send or receive new Invites.
- Given one account only, When the other has not confirmed, Then the first remains available.

#### FR-099: Consent-based story submit

Faces optional/blurred; city; date; no Chat excerpts. Either spouse can refuse public. `[ASSUMPTION]` extra family-approval checkbox before public.

**Acceptance criteria:**
- Given dual confirm, When either refuses public story, Then no showcase card is created.
- Given both accept public and family checkbox, When submitted, Then the card waits for Operator/Advisory Board publish (FR-141) before going live.

#### FR-100: Showcase page

**Acceptance criteria:**
- Given published stories, When a visitor opens the showcase, Then only consented cards appear.
- Given no stories, When a visitor opens it, Then the empty state points at the counter at 0, not at invented quotes.

#### FR-101: Honest Verified-marriages counter starting at 0

**Acceptance criteria:**
- Given launch, When any public surface renders the counter, Then it is 0 until the first dual-confirmed report.
- Given N dual-confirmed reports, When the counter renders, Then it equals N and is not rounded up or “+”.

#### FR-102: Testimonials carousel — NEXT

Wait for real FR-099 stories or modest process quotes. No invented marriages. Demote vs FR-101.

**Acceptance criteria:**
- Given NEXT, When a carousel ships, Then each quote is attributed and is not presented as a Verified marriage unless it is one.
- Given MVP, the hero metric is FR-101, not a carousel.

#### FR-103: Alumni mentorship — LATER

Read-only advice, not matchmaking (D33).

**Acceptance criteria:**
- Given LATER, When a married alum opts in, Then they can send read-only advice to a requesting Member without appearing in browse as available.
- Given MVP or NEXT, this feature is absent.

### 4.10 Monetisation and payments

**Description:** Freemium in XOF. Sisters’ safety and dignity are never paywalled. Brothers pay for reach/convenience. Sister Invite reach defaults `free_unlimited`; the Operator can apply the same quota and packs as Brothers. 1 / 3 / 6 month plans, no silent auto-renew. Mobile money first. Realizes UJ-2, UJ-6.

#### FR-104: Freemium in XOF

**Acceptance criteria:**
- Given the pricing page, When rendered, Then prices are in XOF (FCFA symbol allowed) and a Free tier is described.
- Given a Brother on Free, When he uses browse + quota Invites + Chat after accept, Then those capabilities work without payment.
- Given a Sister, When she uses browse + Chat after accept, Then those capabilities work without payment in both `sister_reach_mode` values.
- Given `sister_reach_mode` is `same_quota_as_brothers` and a Sister has no pack, When she sends Invites, Then the Free cap in FR-044 applies (FR-045).

#### FR-105: Safety and Sister dignity never paywalled

Verification, Blur/Reveal, Mahram, Report, and Block stay free in both `sister_reach_mode` values. Chat after an accepted Invite stays free for both genders (Brothers do not pay for that). Sister-initiated Invites are not unconditionally free: Invite quota follows FR-045.

**Acceptance criteria:**
- Given no payment method on a Sister account, When she uses Verification, Blur, Reveal, Mahram, Report, or Block, Then none of those actions require Premium.
- Given no payment method on a Sister account, When she sends an Invite, Then the send is allowed or rejected solely by FR-045 / `sister_reach_mode`, never by a safety paywall.
- Given a Brother, When he Reports, completes Verification, or chats after an accepted Invite, Then payment is not required.

#### FR-106: 1 / 3 / 6 month plans, no silent auto-renew

If a processor wants auto-renew, the product still requires explicit repurchase. Brothers always see these packs. Sisters see the same packs only when `sister_reach_mode` is `same_quota_as_brothers`.

**Acceptance criteria:**
- Given checkout, When a pack is purchased, Then the end date is shown and no renewal is scheduled.
- Given the pack ends, When the Member opens the app, Then they are on Free until they explicitly buy again.
- Given French or Mooré/Dioula audio on pricing, When played, Then no-auto-renew is stated (D16).
- Given `sister_reach_mode` is `same_quota_as_brothers`, When a Sister buys a pack, Then the same 1 / 3 / 6 durations and no-silent-auto-renew rules apply as for Brothers.
- Given `sister_reach_mode` is `free_unlimited`, When a Sister opens pricing, Then she is not required to buy a reach pack.

#### FR-107: Burkina payment rails

MVP rails: Orange Money BF, Moov Africa BF, Wave/Coris where available, cards secondary. Free Money / MTN MoMo are FR-114 (NEXT, later countries). Sister checkout exists on day one only when `sister_reach_mode` is `same_quota_as_brothers` (FR-145).

**Acceptance criteria:**
- Given Orange Money BF available, When a Brother — or a Sister when `sister_reach_mode` is `same_quota_as_brothers` — pays, Then a successful payment entitles them to the selected pack.
- Given Moov Africa BF available, When a Brother — or a Sister when `sister_reach_mode` is `same_quota_as_brothers` — pays, Then a successful payment entitles them to the selected pack.
- Given Wave or Coris available in BF, When a Brother — or a Sister when `sister_reach_mode` is `same_quota_as_brothers` — pays on that rail, Then a successful payment entitles them to the selected pack.
- Given cards unavailable, When they pay with mobile money, Then purchase can complete.
- Given `sister_reach_mode` is `free_unlimited`, When a Sister opens checkout, Then no reach-pack purchase is required.

#### FR-108: One transparent pricing page

Launch vs normal price disclosed. No dark patterns. Same numbers as checkout (D16).

**Acceptance criteria:**
- Given homepage and checkout, When prices are compared, Then they match.
- Given a “launch” price, When it is shown, Then the normal price is also shown.
- Given `sister_reach_mode` is `same_quota_as_brothers`, When a Sister sees checkout, Then the prices match the public pricing page and Brother checkout.

#### FR-109: Published CGV and refunds

No homepage-vs-CGV contradiction (P59).

**Acceptance criteria:**
- Given CGV, When refund rules are read, Then they match the pricing page summary.
- Given a refund request within the published window, When an Operator approves, Then the Member returns to Free and a ticket records the refund.

#### FR-110: Premium structure without paywalled safety

Pay for reach/convenience only. **MVP Premium delta (testable):** (1) daily Invite quota 15 vs Free 3 (FR-044) for Brothers always, and for Sisters when `sister_reach_mode` is `same_quota_as_brothers`; (2) faster human-review queue, not a rubber stamp (FR-013). Ranking/boosts are NEXT (FR-111). Remaining convenience perks we may add later (HD photo cap, unlimited coach, priority support, sub-10-minute validation queue) are FR-113 (NEXT). Farata markets similar items: “up to 10 HD photos” Offered (seen) on the homepage; unlimited coach Claimed (marketing); priority support 7/7 Claimed (marketing); “validée en 10 min” Premium Claimed (marketing).

**Acceptance criteria:**
- Given Premium vs Free in MVP, When the published pricing page is compared to product behaviour, Then the only differences are quota 15 vs 3 and queue priority for FR-012. When `sister_reach_mode` is `same_quota_as_brothers`, those quota numbers apply to Sisters too.
- Given Premium, When they try to use it to skip FR-012 human decision or FR-062 background scan, Then those still apply. Premium cannot skip the admin flag queue (FR-144).

#### FR-111: Boosts — NEXT

Cannot bypass Invite quotas or moderation (D37). Ranking prefers verified + complete + Mahram-ready Profiles.

**Acceptance criteria:**
- Given NEXT, When a boost is purchased, Then it does not raise Invite quota beyond published rules and does not skip moderation.
- Given MVP, boosts are not sold.

#### FR-112: Premium badge — NEXT

Paid status only, not Verification.

**Acceptance criteria:**
- Given NEXT, When Premium is active, Then a badge may show as paid status and must not say vérifié.
- Given MVP, no Premium badge is required.

#### FR-113: Remaining Premium perks — NEXT

HD 10 Photos, unlimited coach, priority 7/7, <10 min validation as a queue target — after core Premium.

**Acceptance criteria:**
- Given NEXT, When these perks ship, Then each is listed on FR-108 and still cannot rubber-stamp review.
- Given MVP, they are absent.

#### FR-114: Free Money / MTN MoMo — NEXT

Later-country parity rails, not BF-launch blockers.

**Acceptance criteria:**
- Given a later-country launch, When those rails are enabled, Then checkout lists them.
- Given BF MVP, When checkout renders, Then they are not required.

### 4.11 Content, localisation, growth, and legal surfaces

#### FR-115: Académie seed — five scholar-reviewed articles

Topics: Mahram, mahr, rights, haya, honesty. Local imam-reviewed. Full library is FR-121 (NEXT). D22 MUST via this FR.

**Acceptance criteria:**
- Given launch, When a visitor opens Académie, Then at least five articles are public, named, and marked reviewed.
- Given an article, When it is published, Then it has a reviewer name from the Advisory Board or a recorded delegate.

#### FR-116: Advisory Board names

Independent imam/Advisory Board can start as 2–3 named people (D23 MUST slice). Fuller board + public metrics polish is NEXT and specified on FR-092 (additional named people + proof-backed public stats), not a separate FR.

**Acceptance criteria:**
- Given the public trust page, When rendered at launch, Then at least two named people appear with roles.
- Given no names yet, When launch is attempted, Then this FR is unmet (do not ship a fictional board).

#### FR-117: Programmatic SEO — Ouagadougou, Bobo-Dioulasso, Burkina Faso

Imam-reviewed copy first. Remaining cities/countries are FR-125 (NEXT).

**Acceptance criteria:**
- Given launch, When those three URLs are requested, Then they return 200 with local, reviewed copy (not a Senegal clone).
- Given the copy, When scanned, Then it contains no dating / *rencontre romantique* lexicon.

#### FR-118: Ticketed contact form plus FAQ

Not Gmail-only. Subject triage including misuse.

**Acceptance criteria:**
- Given a visitor submits the form, When it is stored, Then a ticket id is returned.
- Given a misuse subject, When submitted, Then it is routed to Moderators, not only generic support.

#### FR-119: Cookie consent

Accept/manage. Consent never implies rights to reuse Profile Photos in campaigns (FR-060).

**Acceptance criteria:**
- Given first visit, When the banner is shown, Then accept and manage both work.
- Given cookie accept, When Operator checks marketing rights, Then Photo reuse is still false unless FR-060 opt-in exists.

#### FR-120: Public hosting disclosure and CIL stance

**[ASSUMPTION] A3 (verbatim):** Hosting-location **decision is deferred to architecture**. The product **must** comply with Burkina Faso’s data-protection authority (**CIL — Commission de l’Informatique et des Libertés**) and **must publicly disclose the hosting location**. Rationale: Farata lists Vercel/Neon USA as Claimed processors and does not mention CIL (gap 9, labeled). We will not pretend a region pick in a product brief; we will not hide where data lives. **Flag for legal review:** CIL filing, lawful basis, cross-border transfer if hosting is outside BF, retention schedule vs. Farata-like 2-year message keep (Claimed policy — we must write our own), and 72h breach notice (P46).

**Acceptance criteria:**
- Given the public privacy page, When rendered, Then the hosting location string is present (even if “TBD pending architecture” is replaced before launch by the real location).
- Given launch, When counsel has not filed/planned CIL, Then this FR remains an open legal gate (do not claim CIL-compliant in marketing until filed).

#### FR-121: Full Académie library — NEXT

**Acceptance criteria:** Given NEXT, the library grows beyond five with the same review bar. Given MVP, five suffice.

#### FR-122: Blog — NEXT (full cadence LATER)

Human-review all copy. Farata blog leaked AI-prompt text Offered (seen).

**Acceptance criteria:**
- Given NEXT, When a blog post is published, Then a human review record exists.
- Given LATER, When capacity allows, Then a stated cadence exists. MVP has no blog requirement.

#### FR-123: Promo / explainer video — NEXT (high-production LATER)

**Acceptance criteria:** Given NEXT, a human-reviewed explainer may appear. MVP does not require video.

#### FR-124: Grounded AI marriage coach — NEXT

One persona, scholar-reviewed, not a mufti; no “Cheikh” title / dual coach names (D21). Farata “Cheikh Moussa” Offered (seen) [bundle]; “Cheikh Amadou” Claimed (marketing) (store copy).

**Acceptance criteria:**
- Given NEXT, When the coach answers, Then it states it is not a mufti and defers fatwa questions.
- Given MVP, no AI coach is offered.

#### FR-125: Remaining city / country / intent SEO — NEXT

**Acceptance criteria:** Given NEXT, additional locales ship after the BF trio. MVP is FR-117 only.

#### FR-126: Optional language filters with anti-caste design — NEXT

Mooré / Dioula / Fulfulde / French (D34).

**Acceptance criteria:**
- Given NEXT, When a filter is applied, Then it cannot be the only matching dimension that hides a whole ethnic class without a published anti-caste rule.
- Given MVP, language is not a search filter.

#### FR-127: Prayer / night quiet hours — NEXT

Default no push between Isha and Fajr local time (D30).

**Acceptance criteria:**
- Given NEXT and default on, When local time is between Isha and Fajr, Then marketing and non-essential pushes are not sent. OTP/security SMS may still send.
- Given MVP, quiet hours are not required.

#### FR-128: Full Arabic + English UI — LATER

**Acceptance criteria:** Given LATER, full UI locales ship. MVP is French-first + audio (FR-137, FR-138).

#### FR-129: Istikhara companion — NEXT

Reminder + private journal, not a fatwa (D25).

**Acceptance criteria:** Given NEXT, a private journal exists and the product does not issue a ruling. MVP absent.

#### FR-130: Mahr conversation card — NEXT

Dignified template with family in the loop (D26).

**Acceptance criteria:** Given NEXT, the card can be shared into a Chat with Mahram visibility. MVP absent.

#### FR-131: Mosque / imam attestation level — NEXT

D29.

**Acceptance criteria:** Given NEXT, a Member may attach an imam attestation as an extra Verification level. MVP absent.

### 4.12 Platforms, language, and access

#### FR-132: Web app

**Acceptance criteria:**
- Given a current mobile or desktop browser, When the Member opens the site, Then they can complete UJ-1 core path (account → browse → Invite → Chat).

#### FR-133: Installable PWA

**Acceptance criteria:**
- Given a supporting browser, When the Member installs the PWA, Then they can return via home-screen icon and complete the same path as FR-132.

#### FR-134: Store-listed Android app

Thin wrapper / TWA / Capacitor over the PWA is an architecture choice (addendum). Product requirement: listed on Google Play for BF launch.

**Acceptance criteria:**
- Given a Play listing for the launch package, When a Member in BF installs it, Then they can complete UJ-1.
- Given the listing, When age rating is published, Then it matches counsel’s gate (A1).

#### FR-135: Native iOS — NEXT

Parity deferred: Android-first Burkina launch; Apple build/store/compliance cost. Not dropped. Apple sign-in (FR-004) ships with it.

**Acceptance criteria:**
- Given NEXT, When native iOS ships, Then UJ-1 is completable on iOS including FR-004.
- Given MVP, iOS native is not required.

#### FR-136: Lite mode

Data saver, deferred images, offline drafts, cached browse for 2G/3G and cheap Androids (D19). Target aligned to ~1GB/month Sister job.

**Acceptance criteria:**
- Given Lite on, When browse loads on a throttled 3G profile, Then first meaningful grid (text + placeholders) appears within NFR-005.
- Given Lite on, When a Chat Photo arrives, Then it is not auto-downloaded at full resolution until tap.

#### FR-137: French-first UI

**Acceptance criteria:**
- Given MVP, When any primary screen renders, Then the UI language is French.
- Given a string, When scanned against the banned lexicon, Then *dating* and *rencontre romantique* do not appear.

#### FR-138: Mooré and Dioula audio

Audio onboarding, photo rules, pricing-trust (no auto-renew). Full Arabic/English UI is FR-128 (LATER).

**Acceptance criteria:**
- Given language audio setting, When the Member plays a covered step, Then the correct language audio plays.
- Given French-only screens that are not in the covered set, When opened, Then UI remains French (audio may be absent and is listed as a gap, not a crash).

### 4.13 Operator administration

Realizes UJ-6.

#### FR-139: Pricing and pack configuration

**Acceptance criteria:**
- Given Operator role, When they change a pack price or duration, Then FR-108 and checkout show the new values without a store release.
- Given a non-Operator, When they call the config API, Then it is rejected.

#### FR-145: Operator `sister_reach_mode` and Sister checkout

The Operator sets `sister_reach_mode` in operator settings. Values: `free_unlimited` (DEFAULT) | `same_quota_as_brothers`. Both modes exist on day one. The value is audited. A change applies to subsequent Invites; past Invites are not deleted. Brothers stay on the paid quota; there is no brother-free mode. Sister UI shows either unlimited Invites or the same quota and pack purchase as Brothers. Brothers’ UI does not gain a free mode.

**Acceptance criteria:**
- Given Operator role, When they change `sister_reach_mode`, Then the new value is stored, written to the audit log, and subsequent Sister Invites use the new mode. Past Invites are not deleted.
- Given `sister_reach_mode` is `free_unlimited`, When a Sister opens Invite or pricing UI, Then it shows unlimited Invites and does not offer a reach pack.
- Given `sister_reach_mode` is `same_quota_as_brothers`, When a Sister opens Invite or pricing UI, Then she sees the same Free and Premium daily caps and the same 1/3/6-month pack purchase as Brothers (FR-044, FR-106, FR-107, FR-108).
- Given a Brother, When he opens Invite or pricing UI, Then he does not gain a free-unlimited reach mode.

#### FR-140: Moderation policy and thresholds

**Acceptance criteria:**
- Given Operator, When they change flag-confidence or Strike-count floor, Then new messages use the new values and a versioned policy record is stored. Thresholds affect the background scan and the admin flag queue, not send latency.
- Given a Member, When they open D6 policy, Then they see the currently published explanation of what is scanned after delivery, that the AI flags for a human admin and does not silently delete or block, and how long evidence is kept.

#### FR-141: Advisory Board content publishing

**Acceptance criteria:**
- Given Operator, When they publish an Académie article or Board name change, Then the public page updates and the review record is stored.
- Given unpublished draft, When a visitor requests it, Then they get 404.

#### FR-142: Internal metrics

Verified Members by level, dual-confirmed marriages, report SLA, scan-deferred events, appeal overturns. Public promotion only if proof-backed.

**Acceptance criteria:**
- Given Operator dashboard, When opened, Then the metrics above are present for the selected period.
- Given a public embed, When it shows a number, Then that number exists in this dashboard.

#### FR-143: Account deletion and CIL request handling

**Acceptance criteria:**
- Given a CIL/access/erasure ticket, When an Operator completes it, Then the status page shows completed and NFR-008 clocks are recorded.
- Given a Member-initiated FR-019, When it stalls, Then this queue can complete it.

## 5. Cross-cutting NFRs

Each NFR has a measurable target and a verification method.

#### NFR-001: Security

**Target:** Public visibility requires phone OTP + liveness + ID + human review. TLS 1.2+ in transit on all Member and staff endpoints. Photos, Chat bodies, ID images, and backups encrypted at rest (AES-256-class or equivalent). Passwords hashed (not stored reversible). Auth rate-limited. PIN lock on shared devices (FR-020). Sessions timeout `[ASSUMPTION: 15 minutes idle on Mahram and Sister PIN sessions]`. No staff bulk export of contact lists.
**Verification:** Security review + penetration test before launch; TLS scan of public endpoints; at-rest encryption config review for the four data classes; automated tests that an unreviewed Profile is omitted from search; access-control tests for Operator vs Moderator vs Member; attempt to export contacts as a low-privilege staff role must fail.

#### NFR-002: Privacy and CIL

**Target:** CIL compliance program in place before public launch; hosting location disclosed (FR-120); lawful basis documented; 72h breach notice to affected Members and to CIL as required; coarse geo (city-level; quartier optional and hidden until accepted Invite); no Profile marketing without FR-060.
**Verification:** Legal checklist signed; privacy page review; breach-tabletop exercise; automated test that quartier is hidden pre-accept.

#### NFR-003: Send-first Chat and admin decision SLA

**Target:** Send returns as soon as the message is stored (no AI wait). Background scan is async and must not delay send. Admin first decision on a flag stays within the existing report SLA (first human decision p95 ≤ 24h). Scan-deferred / scan-failed events counted, not fail-closed incidents. Do not invent a tighter admin clock or a send-blocking latency.
**Verification:** Synthetic send asserts ack without waiting on AI; chaos test that kills the AI dependency still delivers and records scan-deferred; SLA dashboard on FR-083 / FR-144.

#### NFR-004: Availability

**Target:** Member core path (login, browse, Invite, Chat, Report, Block, Verification, Mahram read) monthly availability ≥ 99.5% excluding agreed maintenance. Payment-provider outage must **not** take down Free tier or safety features.
**Verification:** Uptime checks on the core path; game-day: disable payment rail and complete UJ-1 safety actions.

#### NFR-005: Performance on low-end Android and 2G–3G

**Target:** On a reference low-end Android (2GB RAM class) and throttled Slow 3G, Lite mode first grid ≤ 8s, Chat thread open ≤ 4s, send-text ack ≤ 2s. No autoplay video. Browse usable with images deferred.
**Verification:** Lab run on a defined device + Chrome/WebView throttle; field RUM on Ouaga/Bobo Android.

#### NFR-006: Accessibility and low-literacy

**Target:** Primary flows usable with WCAG 2.1 AA on French UI (contrast, focus, labels). Photo rules and onboarding completable via pictogram + audio without reading a paragraph (FR-010, FR-070). Touch targets ≥ 44px on the Android/PWA primary path.
**Verification:** Accessibility audit; moderated test with 5 low-literacy Sisters in Ouaga/Bobo `[ASSUMPTION: research protocol]` completing onboarding + photo rules with audio.

#### NFR-007: Localisation — French + Mooré/Dioula audio

**Target:** 100% of MVP screens in French. Covered audio set (onboarding, photo rules, no-auto-renew, Mahram invite explainers) recorded in Mooré and Dioula and native-speaker checked before launch.
**Verification:** String freeze + linguistic QA; audio checklist signed by native speakers; automated test that banned dating lexicon is absent.

#### NFR-008: Data retention and deletion

**Target:** `[ASSUMPTION]` Working schedule (legal must replace): account erasure completed within 30 days of confirmed delete; Member export within 72h; Chat messages retained ≤ 18 months after Chat close unless a live moderation/legal hold exists; payment records retained per OHADA/tax counsel (not copied from Farata’s Claimed 10-year payment keep). Status page reflects each clock.
**Verification:** Deletion rehearsal on staging; legal sign-off of the schedule; automated test that a deleted Member’s Profile is gone from search within 15 minutes and fully erased by day 30.

#### NFR-009: Auditability

**Target:** Immutable audit events for: Moderator unblur, sanctions, appeal outcomes, Operator threshold/price/`sister_reach_mode` changes, deletion/CIL completions, scan-deferred / scan-failed events. Retention of audit logs ≥ 12 months. Staff access is individually attributed (no shared Moderator login).
**Verification:** Audit-log replay test; RBAC test; quarterly access review.

## 6. Must-have coverage

Owner must-haves from `docs/system-idea.md` are all MVP FRs.

| # | Must-have (system-idea wording) | P / D ids | FR IDs (MVP) |
| --- | --- | --- | --- |
| 1 | Profiles: create and submit a profile; browse profiles; send an invite/match request; accept or decline; see who invited you and who accepted; exchange messages once matched. | P7, P15, P21, P28, P31, P33 | FR-001, FR-009, FR-016, FR-017, FR-021, FR-025, FR-038, FR-039, FR-040, FR-041, FR-046, FR-050 |
| 2 | AI moderation on everything: every chat message, photo and voice note/audio is scanned continuously for indecent content (immodest photos, inappropriate language/advances). It blocks or flags, enforces the rules, and feeds a report/ban pipeline. Profile photos are moderated too. | P37, P34, P38, D4, D7, P41, P42, P43 | FR-062, FR-063, FR-064, FR-065, FR-066, FR-067, FR-068, FR-069, FR-070, FR-083, FR-084, FR-085, FR-087, FR-088, FR-144 |
| 3 | Photo privacy: each member (sister or brother) can choose in settings to blur their profile picture and uploaded photos for viewers (with ideas like reveal-on-match or reveal-on-request). | P40, D8 | FR-056, FR-057, FR-058, FR-059 |
| 4 | Mahram/wali in chat: a sister can optionally add her mahram to the conversation. He reads all messages and acts as a human safeguard and moderator if something slips past the AI, keeping the conversation within Islamic limits. | D1, P45 | FR-071, FR-072, FR-073, FR-074, FR-075, FR-076, FR-077, FR-078, FR-079, FR-080 |
| 5 | Marriage success reporting: couples report that they got married through the platform, and these become showcase success stories. | D11; D12 MUST slice; P54 NEXT | FR-095, FR-096, FR-097, FR-098, FR-099, FR-100, FR-101 |
| 6 | Strong security and verification so people can't break the rules (identity verification, reporting, etc.). | P8, P9, P41, P46, D5, D6, D13 | FR-002, FR-007, FR-011, FR-012, FR-014, FR-015, FR-083, FR-084, FR-085, FR-086, FR-091, NFR-001 |

Must-have #5 maps to D11 full + D12 MUST slice. P54 testimonials remain NEXT (FR-102).

## 7. Platform

| Surface | Horizon | Reason |
| --- | --- | --- |
| Web app | MVP | Primary surface (FR-132) |
| Installable PWA | MVP | Low-friction Android install without waiting on store review loops (FR-133) |
| Store-listed Android | MVP | Burkina launch is Android-first (FR-134) |
| Native iOS | NEXT | Android-first Burkina launch; Apple build/store/compliance cost; **not dropped**. Apple sign-in (FR-004) ships with it. |

Copy vocabulary: *mariage / ta'aruf / nikah / khitba*. Banned: *dating / rencontre romantique*.

Khalwa-safe: no 1:1 live video or live voice until a Mahram is present **or** a chaperoned family meeting is scheduled. Live video even with a Mahram is **LATER**. Text + async Voice notes (delivered then passively scanned) until then.

## 8. Monetization

Rules are FR-104–FR-110 and FR-145 (XOF freemium; safety and Sister dignity never paywalled; sister reach default `free_unlimited`, Operator-switchable to `same_quota_as_brothers`; 1 / 3 / 6 month packs; no silent auto-renew; Orange Money / Moov first). Lock-points and ops risk sit here.

**[ASSUMPTION]** Exact price points are not locked. Public reference: Farata homepage shows **5 900 FCFA/month** launch and **9 900** normal Offered (seen) (checkout amounts behind login are Claimed (marketing)). Working assumption for validation: brother Premium launch in a similar band (about 4 900–5 900 XOF/month) with cheaper 3- and 6-month packs; do not race to 0 FCFA. Validate against BF purchasing power before lock. Free-tier Brother daily Invite quota is **3/day**; Premium is **15/day** `[ASSUMPTION]`. MVP Premium does **not** include ranking (NEXT with FR-111).

Boosts (P25, NEXT) cannot buy a safety bypass; ranking prefers verified + complete + Mahram-ready Profiles (D37). `[NOTE FOR PM]` Human-review-everything (FR-012) plus the admin flag queue (FR-144) plus 24h Report SLA is an ops company. Launch staffing floor and the product behaviour when the free-review queue exceeds 48h (pause new public listings vs slip the SLA) must be set before Play submit.

## 9. Why now

Farata is live at farata.net (Senegal-first, French-only UI Offered (seen); Burkina is an SEO page Offered (seen)). Sisters in Ouaga/Bobo already leak dignity onto WhatsApp. The window is to become the honorable local reference **before** “another dating app from Dakar” owns the mental model. CIL + Orange Money BF + Mooré/Dioula audio are not polish; they are the wedge.

## 10. Aesthetic and tone

- Solemn marriage path, not swipe culture. Member-facing voice is respectful Ouaga French; sanction macros stay human.
- Hero number: Verified marriages (starts at 0). Not DAU. Not invented member counts.
- Haya-default media. Quiet decline. Education without false religious authority (no “Cheikh” bot).
- Visual direction is for UX, not this PRD. Brainstorm keepsake (indigo/sand/gold, mihrab, *sira*) is a hint only — see addendum.

## 11. Constraints and guardrails

- **Safety:** Passive scan after delivery; AI flags for a human admin and does not silently delete, block, or auto-sanction. Woman’s consent first-class. Mahram cannot send as her.
- **Privacy:** Coarse geo. D10 per-use opt-in. Owner-only export.
- **Cost:** SMS is MVP; USSD deferred (FR-055). Do not race Premium to 0 XOF.
- **Religious authority:** Product is not a mufti. Advisory Board reviews; Moderators escalate fiqh-edge cases.
- **Evidence discipline:** Farata claims only with the three labels. Proof-backed counters only.

## 12. Compliance, data, and risk (product-level)

- CIL + public hosting disclosure (A3, FR-120, NFR-002). Hosting vendor pick is architecture, not this PRD.
- 72h breach notice (P46).
- Cookie consent does not grant Photo reuse (FR-119).
- Launch-killing risks and controls: fake Profiles (FR-014 + FR-012); romance/money scams (FR-068); indecency including local-language jailbreak (FR-064 + FR-067 + FR-144); Photo leaks (FR-056–FR-059; D9 NEXT); fake/coercive Mahram (A2 + FR-077); minors (FR-011 + FR-091); AI vendor down records scan-deferred, does not hold Chat (FR-067); mosque rumor that this is dating (FR-115, FR-116, FR-137). Full 30-row risk table: addendum.

## 13. Non-Goals (Explicit)

- Casual dating or entertainment use.
- Native iOS in MVP (deferred, not dropped).
- Live 1:1 video/voice (LATER, khalwa-sensitive) — even with Mahram present.
- Full English/Arabic UI (LATER).
- Kinship-document proof for Mahram (not MVP; A2).
- First-wife awareness unless she consents.
- Invented member or marriage counts; invented success stories.
- Paywalled safety or a Premium “looks verified” badge.
- Silent auto-renew.
- Uncurated GIFs; dual “Cheikh” coaches; AI that silently deletes Chat or applies a sanction without a human admin.
- Architecture/hosting vendor selection in this document.
- Final product name / domain purchase.
- Starting UX, architecture, or epics from this run.

## 14. MVP Scope

### 14.1 In Scope

- All six owner must-haves as MVP FRs (coverage table).
- Web + PWA + store-listed Android.
- Every P/D slice whose Horizon is MVP in Appendix A.
- Freemium XOF, mobile money first, no silent auto-renew. Both `sister_reach_mode` values (`free_unlimited` default, `same_quota_as_brothers`) on day one (FR-145).
- French-first + Mooré/Dioula audio on the covered set.
- Passive after-delivery scan; admin flag queue; Report → Strike → Ban; appeal. The trigger for an AI-originated case is the passive flag plus an admin action, not a pre-delivery hold.
- Honest Verified-marriages counter at 0; dual-confirm close.
- CIL stance + public hosting disclosure (location string may be filled by architecture before launch, not hidden).

### 14.2 Out of Scope for MVP

Deferred items keep parity labels. See Appendix A for every NEXT/LATER id and reason. Emotionally load-bearing deferrals `[NOTE FOR PM]`: native iOS (not dropped); P54 carousel (must not become a fake-marriage hero); D9 anti-leak polish (MVP still has Blur/Revoke); D2/D3 Mahram dashboard and full meeting planner (D1 ships).

## 15. Success Metrics

North star: chaperoned meetings + dual-confirmed nikah — not DAU, not inflated member counts.

**Primary**

- **SM-1:** Dual-confirmed Verified marriages (FR-095–FR-101). Public counter starts at 0; proof-backed only. Validates FR-096, FR-101.
- **SM-2:** Chaperoned / family meetings marked (FR-028 **meeting** stage in MVP; full planner FR-082 is NEXT). Validates FR-028.

**Secondary**

- **SM-3:** Verified Members by level (phone / ID / Mahram). Never sell a “looks verified” Premium badge. Validates FR-015, FR-014.
- **SM-4:** Report SLA met rate (target 24h); Strike → Ban completions; passive-scan flag rates; admin warning / suspend / other-action rates; scan-deferred event count (never hidden). Validates FR-083, FR-087, FR-067, FR-144, NFR-003.
- **SM-5:** Share of Sister Profiles remaining Blurred; Reveal-Revoke use; Mahram-attached Chats; Sister-initiated Invites. Validates FR-056–FR-059, FR-071, FR-045.
- **SM-6:** Android + PWA actives in Ouaga then Bobo; Orange Money / Moov checkout completion; Mooré/Dioula audio-onboarding completion. Validates FR-134, FR-107, FR-010.

**Counter-metrics (do not optimize)**

- **SM-C1:** DAU / raw registered Members as a vanity headline. Counterbalances SM-1. Contrast: Farata “+247.8k actifs” Claimed (marketing) vs Play 10k+ Offered (seen).
- **SM-C2:** Invite volume without accept rate. Counterbalances SM-2 and FR-044 (prevents spray-and-pray).
- **SM-C3:** Appeal overturn rate driven to zero by rubber-stamping bans. A non-zero overturn rate is expected; hiding it is failure. Counterbalances SM-4.
- **SM-C4:** Reveal-on-request nagging that coerces Sisters to un-Blur. Counterbalances SM-5.

## 16. Open Questions

1. **Polygamy disclosure UX:** how to disclose existing wives without doxxing them? First-wife awareness remains out of scope unless she consents — confirm with Sisters and counsel.
2. **Fail-closed UX tolerance:** **Resolved 2026-10-01** (locked decision, Maitchibi Fayçal). AI moderation is passive. Messages are delivered immediately; AI outage does not hold or delay Chat. The former “how long will Members tolerate held Voice notes” question no longer applies. Scan-deferred events are recorded for the admin queue. Other open questions in this section remain open.
3. **USSD/SMS cost:** which BF operators and what cost per Mahram alert is sustainable at launch? SMS is MUST; USSD is MUST-if-feasible (this PRD treats USSD as NEXT — FR-055).
4. **Imam advisory:** which Ouaga/Bobo scholars will lend names, and what review SLA for Académie?
5. **Free review SLA (P8):** what free review time is honest in BF? Farata claims 12–24h / 30 min / 10 min Premium — numbers disagree, Claimed (marketing). Working `[ASSUMPTION]`: 24h Free (FR-013).
6. **Anonymous-mode rules:** confirm D36 with Sisters. Farata “mode anonyme” is Claimed (marketing); behaviour unknown.
7. **Brother clear Photo before accept:** should Sisters ever see a Brother’s clear Photo before accept if he chose un-Blurred? Default lean: yes if he opted out of Blur — confirm.
8. **GIFs/stickers:** is a zero-GIF launch acceptable until a curated pack exists (P33 NEXT)? This PRD assumes yes.
9. **Native-speaker validation:** do Nikahsira (Jula *sira*) and Nonglem (Mooré) read as intended in Ouaga/Bobo, or is there slang/taboo?
10. **OAPI trademark + social handles** for Nisfuddin / Nikahsira / Sakinaa — not done.
11. **Free Money / MTN MoMo (P58):** keep as later-country parity rails? This PRD assumes yes (FR-114).
12. **Retention schedule:** legal must replace NFR-008 working numbers before launch.

## 17. Assumptions Index

Every `[ASSUMPTION]` in this PRD, for confirmation:

- **A1** — Minimum age 19+ (verbatim in FR-011). Flag for legal review.
- **A2** — Wali/Mahram verification path (verbatim in §4.7). Flag for legal review.
- **A3** — Hosting deferred to architecture; CIL + public hosting disclosure required (verbatim in FR-120). Flag for legal review.
- Exact Premium price points not locked; working band ~4 900–5 900 XOF/month (§8).
- Free-tier Brother daily Invite quota = 3; Premium = 15 (§8, FR-044). MVP Premium has no paid ranking.
- Meeting stage: either Member or attached Mahram proposes; other Member must confirm; Mahram reject pauses; Brother-only mark does not change stage (FR-028).
- Contact-share is the single off-platform predicate; Mahram optional (FR-068).
- Distance filter radii 10 / 25 / 50 / city-wide (FR-024).
- Life plans enum `ready_now` / `within_year` / `exploring`.
- Device-fingerprint Ban hold is a product requirement; algorithm is architecture (FR-088).
- USSD treated as NEXT (FR-055); SMS is MVP.
- Confrérie/hijra fields treated as NEXT (FR-029).
- Free review SLA working target 24h (FR-013).
- Entertainment-browsing reaffirmation heuristics belong in the T&S playbook (FR-005).
- PIN re-lock after 60s background (FR-020); idle timeout 15 minutes on Mahram/Sister PIN sessions (NFR-001).
- T&S mass-view threshold 50 Profiles/24h (FR-027).
- One pending Reveal request per pair (FR-058).
- Mahram cooling-off 1 hour after OTP before some actions; pending invite expires in 7 days (FR-072, FR-073).
- Pause resume: Sister, the Mahram who paused, or a Moderator; Brother cannot resume; ended Chats are terminal (FR-075).
- Mahram accounts cannot send Invites or appear in the browse grid (UJ-3).
- Emergency hide 24h after Reporting a Mahram (FR-077).
- False-report sanction trigger: 3 overturned Reports in 30 days (FR-086).
- Joint-report expires in 30 days if not dual-confirmed (FR-096).
- Extra family-approval checkbox before public story (FR-099).
- Working retention schedule in NFR-008 (legal must replace).
- Journey protagonist names (Fatim, Ibrahim, Ousmane, Aïcha, Aminata, Yusuf, Kadiatou) are stand-ins.
- Low-literacy research protocol: 5 Sisters in Ouaga/Bobo (NFR-006).
- If she sent the Invite, send counts as consent to Chat (FR-039).
- P58 Free Money / MTN MoMo kept as later-country rails.
- Zero-GIF launch acceptable (FR-054).
- Brother clear Photo before accept if he opted out of Blur (open question 7; default lean yes).

## Appendix A. Traceability — P1–P59 and D1–D40

Required. One row per slice. No id dropped. Horizons match the brief. Farata evidence labels stay on competitor statements only; this table is our commitment, not a new Farata claim.

| ID | Title | Horizon | FR IDs | Reason if deferred |
| --- | --- | --- | --- | --- |
| P1 | Email + password + pseudonym + gender | MVP | FR-001 | |
| P2 | Google sign-in | MVP | FR-003 | |
| P2 | Apple sign-in | NEXT | FR-004 | Ships with native iOS; store-compliance, not dropped |
| P3 | Sincerity pledge | MVP | FR-005 | |
| P4 | Email verification | MVP | FR-006 | |
| P5 | Captcha / bot check | MVP | FR-007 | |
| P6 | Password reset + remember-me | MVP | FR-008 | |
| P7 | Guided onboarding | MVP | FR-009, FR-010 | |
| P8 | Human review of every new Profile + paid faster perk | MVP | FR-012, FR-013 | |
| P9 | ID + liveness selfie → Verified badge | MVP | FR-014, FR-015 | Free, separate from Premium |
| P10 | Photo required to contact; may be Blurred | MVP | FR-016, FR-056 | |
| P11 | Edit Profile; Photo changes re-moderated | MVP | FR-017 | |
| P12 | Deactivate / reactivate | MVP | FR-018 | |
| P13 | Self-serve delete + full erasure | MVP | FR-019 | |
| P14 | Age gate | MVP | FR-011, FR-091 | 19+ this PRD (A1) |
| P15 | Profile fields | MVP | FR-021 | |
| P16 | Islamic criteria — madhhab, practice, intentions | MVP | FR-022 | |
| P16 | Islamic criteria — confrérie + hijra fields | NEXT | FR-029 | Extra taxonomy; include if cheap — PRD treats NEXT |
| P17 | Search filters incl. distance | MVP | FR-024 | |
| P18 | Advanced filters tier | NEXT | FR-030 | Paid convenience after basic P17 |
| P19 | AI compatibility + detailed score | NEXT | FR-031 | Needs grounded model (D21) |
| P20 | Daily recommendations that learn | NEXT | FR-032 | Needs usage data |
| P21 | Grid browse | MVP | FR-025 | |
| P22 | Favourites — private list | MVP | FR-026 | |
| P22 | Who favourited me | NEXT | FR-033 | Vanity Premium |
| P23 | Visit patterns — internal T&S | MVP | FR-027 | |
| P23 | Member-facing visitors list | NEXT | FR-034 | Vanity / stalking risk |
| P24 | Online-now indicator | NEXT | FR-035 | Stalking risk; add Sister hide-online |
| P25 | Boosts / paid visibility | NEXT | FR-111 | Pay-to-win tension; after quotas proven; no safety bypass |
| P26 | Premium badge | NEXT | FR-112 | After payments live; paid status only, not Verification |
| P27 | Anonymous mode + visibility controls | NEXT | FR-036 | Farata behaviour unknown (Claimed); ship D36 definition |
| P28 | Contact request accept/decline + lists | MVP | FR-038, FR-039, FR-040, FR-041 | |
| P29 | No resend after refuse | MVP | FR-043 | |
| P30 | Daily request quota by tier | MVP | FR-044, FR-045, FR-145 | |
| P31 | Message Flash | MVP | FR-046, FR-048 | |
| P32 | Ice Breakers — deen/family templates | MVP | FR-047 | |
| P32 | AI-personalised Ice Breakers | NEXT | FR-049 | Wait for grounded coach (D21) |
| P33 | Real-time Chat — typing, reactions, Photo share | MVP | FR-050 | |
| P33 | Curated GIFs / stickers | NEXT | FR-054 | Pack design time; modest set only |
| P34 | Voice notes | MVP | FR-051, FR-064 | |
| P35 | Push notifications | MVP | FR-052 | |
| P36 | Web + installable PWA | MVP | FR-132, FR-133 | |
| P36 | Store-listed native Android | MVP | FR-134 | Required for Burkina launch |
| P36 | Native iOS | NEXT | FR-135 | Android-first Burkina launch; Apple store/build cost; not dropped |
| P37 | AI message moderation | MVP | FR-062, FR-144 | Raised by D4 to every Chat modality, delivered then scanned |
| P38 | Photo Strike rule | MVP | FR-069 | |
| P39 | Published photo rules | MVP | FR-070 | |
| P40 | Blur toggle / default / reveal-on-accept / unblur | MVP | FR-056, FR-057, FR-059 | Raised to per-viewer (D8) |
| P41 | Report + published SLA | MVP | FR-083 | |
| P42 | Block | MVP | FR-084 | |
| P43 | Sanctions + false-report sanctions | MVP | FR-085, FR-086 | |
| P44 | Code of conduct | MVP | FR-089, FR-088 | |
| P45 | Family-involvement guidance | MVP | FR-080 | Plus product D1 |
| P46 | Data protection | MVP | FR-120, NFR-002, NFR-008 | |
| P47 | Cookie consent | MVP | FR-119 | |
| P48 | Contact form + FAQ | MVP | FR-118 | |
| P49 | AI marriage coach | NEXT | FR-124 | Scholar-review + one persona, not a mufti (D21) |
| P50 | Académie library — minimum 5 scholar-reviewed articles | MVP | FR-115 | |
| P50 | Full Académie library | NEXT | FR-121 | After seed articles |
| P51 | Blog | NEXT | FR-122 | Editorial capacity; human-review all copy |
| P51 | Full blog cadence | LATER | FR-122 | Content production, not strategic rejection |
| P52 | Programmatic SEO — Ouagadougou, Bobo-Dioulasso, Burkina Faso | MVP | FR-117 | |
| P52 | Remaining city / country / intent SEO | NEXT | FR-125 | After BF trio |
| P53 | Promo / explainer video | NEXT | FR-123 | Production; human-review all copy |
| P53 | High-production video | LATER | FR-123 | Content production, not strategic rejection |
| P54 | Testimonials carousel | NEXT | FR-102 | Wait for real D11/D12 stories; no invented marriages |
| P55 | Freemium in XOF / FCFA | MVP | FR-104 | |
| P56 | Premium structure minus paywalled safety | MVP | FR-105, FR-110, FR-145 | |
| P56 | Remaining Premium perks | NEXT | FR-113 | After core Premium |
| P57 | 1 / 3 / 6 month plans, no silent auto-renew | MVP | FR-106 | |
| P58 | Payment rails — BF launch | MVP | FR-107 | Orange Money BF, Moov Africa BF, Wave/Coris, cards |
| P58 | Free Money / MTN MoMo | NEXT | FR-114 | Later-country parity rails; not BF-launch blockers |
| P59 | Published CGV / refunds | MVP | FR-109 | |
| D1 | Mahram-in-Chat read-all, Sister-initiated; flag/pause/end | MVP | FR-071–FR-079 | |
| D2 | Mahram dashboard: multi-ward + digest + priority flags | NEXT | FR-081 | Depth after D1 |
| D3 | Chaperoned-meeting / khitba planner with Mahram in the loop | NEXT | FR-082 | Full planner after stage flag |
| D4 | Every Chat modality delivered, then passively scanned; Profile Photo/bio still publish-gated | MVP | FR-062–FR-066, FR-144 | |
| D5 | Scam and off-platform guardrails | MVP | FR-068 | |
| D6 | Honest consistent moderation policy + Member appeal; AI flags for a human and does not silently delete or block | MVP | FR-066, FR-090, FR-140, FR-144 | |
| D7 | Report → Strike → Ban pipeline, console, evidence, fingerprinting, transparency | MVP | FR-087, FR-088, FR-092 | MVP-scale |
| D8 | Per-viewer Reveal (accepted Invite / request / never) + Revoke | MVP | FR-056–FR-059 | |
| D9 | Anti-leak: watermark, screenshot notice, no downloads, Blurred thumbs | NEXT | FR-061 | Polish after D8; thumbs Blur already on FR-052 |
| D10 | Never use Profiles in marketing without per-use opt-in | MVP | FR-060 | |
| D11 | Joint “we got married” report, optional private proof, joint married state | MVP | FR-095–FR-098 | |
| D12 | Consent story submit + showcase page + counter starting at 0 | MVP | FR-099–FR-101 | MUST slice |
| D12 | Curated rich showcase polish / marketing | NEXT | FR-100 | Polish after honest counter |
| D13 | Verification free for everyone, separate from Premium; levels phone / ID / Mahram | MVP | FR-002, FR-014, FR-015, FR-105 | |
| D14 | Declared marital-status honesty + polygamy intent | MVP | FR-037 | |
| D15 | Deletion that works + export + status + ticketing | MVP | FR-019, FR-143 | |
| D16 | Transparent consistent pricing, no dark patterns | MVP | FR-106, FR-108 | |
| D17 | Burkina-first entity, CIL, local rails, XOF | MVP | FR-107, FR-120, NFR-002 | |
| D18 | French first + Mooré/Dioula audio | MVP | FR-137, FR-138 | |
| D18 | Full Arabic + English UI for diaspora | LATER | FR-128 | After BF audio wedge |
| D19 | Low-bandwidth Lite mode | MVP | FR-136, NFR-005 | |
| D20 | Sister reach defaults free/unlimited; Operator can apply the same invite quota as Brothers; Mahram/safety always free | MVP | FR-045, FR-105, FR-145 | |
| D21 | Grounded coach, scholar-reviewed, not a mufti, one persona | NEXT | FR-124 | Scholar-review capacity |
| D22 | Seed articles MUST via P50 (5 scholar-reviewed) | MVP | FR-115 | |
| D22 | Working public imam-reviewed Académie (Sahel context) | NEXT | FR-121 | After seed |
| D23 | Independent imam/Advisory Board can start as 2–3 named people | MVP | FR-116 | |
| D23 | Trust by proof: public metrics + fuller named board | NEXT | FR-092 | After names + real stats |
| D24 | Structured ta'aruf stages (invite / chat / meeting / married) | MVP | FR-028 | |
| D25 | Istikhara companion (reminder + private journal, not a fatwa) | NEXT | FR-129 | After core path |
| D26 | Mahr conversation card | NEXT | FR-130 | After core path |
| D27 | SMS essential-path alerts | MVP | FR-053 | |
| D27 | USSD essential path | NEXT | FR-055 | MUST if feasible; PRD treats NEXT pending operator cost |
| D28 | Shared-device PIN mode | MVP | FR-020 | |
| D29 | Mosque / imam attestation level | NEXT | FR-131 | After free ID Verification |
| D30 | Prayer/night quiet hours (no push Isha–Fajr local) | NEXT | FR-127 | After core notifications |
| D31 | Moderator dual-control / audit / wellness | NEXT | FR-093 | MVP ships audit floor |
| D32 | Messages delivered then scanned; AI outage records scan-deferred and does not hold Chat; AI flags for a human admin and does not silently delete or block | MVP | FR-067, FR-144, NFR-003 | |
| D33 | Alumni mentorship (read-only advice, not matchmaking) | LATER | FR-103 | After real Verified marriages exist |
| D34 | Optional language filters with anti-caste design | NEXT | FR-126 | After basic filters |
| D35 | Match-visible change-audit (marital status or Photos) | NEXT | FR-094 | After core Chat |
| D36 | Anonymous mode defined (hide last-seen + hide from browse except Invitees) | NEXT | FR-036 | Confirm with Sisters |
| D37 | Boosts cannot bypass safety; verified / Mahram-ready ranking preference | NEXT | FR-111 | Ships with boosts |
| D38 | Sister can remove/Report abusive Mahram; emergency hide; cannot send as her | MVP | FR-076, FR-077 | |
| D39 | Age/liveness hold for suspected minors | MVP | FR-091 | |
| D40 | Pictogram + audio photo rules for low literacy | MVP | FR-070, FR-010 | |

### Horizon totals

**Unique IDs: 99** (P1–P59 = 59; D1–D40 = 40). Split items have one row per slice in the table above.

**Unique IDs by earliest horizon (an ID with any MVP slice counts as MVP):**

| Horizon | Unique IDs | Count |
| --- | --- | --- |
| MVP | P1–P17 (P16 has a NEXT slice), P21–P23 (P22/P23 have NEXT slices), P28–P48 (several have NEXT slices), P50, P52, P55–P59; D1, D4–D8, D10–D20, D22–D24, D27–D28, D32, D38–D40 | **74** |
| NEXT | P18–P20, P24–P27, P49, P51, P53, P54; D2, D3, D9, D21, D25, D26, D29–D31, D34–D37 | **24** |
| LATER | D33 | **1** |

74 + 24 + 1 = 99.

**Slice/row counts in the table:**

| Horizon | Rows |
| --- | --- |
| MVP | 75 |
| NEXT | 39 |
| LATER | 4 |
| **Total rows** | **118** |

LATER rows: P51 full blog cadence, P53 high-production video, D18 full EN/AR UI, D33 alumni.

## Document control

- **Intent:** update (headless). Correction of record of the same product, 2026-10-02.
- **Locked decision (Maitchibi Fayçal, 2026-10-02):** Sister access is admin-configurable on MVP day one (`sister_reach_mode`: `free_unlimited` DEFAULT | `same_quota_as_brothers`). Overrides every earlier sentence that said Sisters never pay for Invites or that Invites are always unlimited. Safety and Chat after accept stay free in both modes. Brothers stay on paid quota.
- **Locked decision (Maitchibi Fayçal, 2026-10-01):** AI moderation is passive, not a pre-delivery gate. Overrides every earlier sentence that said the AI gates Chat delivery.
- **Workspace:** `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/`
- **Sources:** brief + addendum + memlog (2026-09-27); brainstorm intent/html/memlog; `docs/system-idea.md`; `docs/competitor-farata.md`; `docs/name-options.md`.
- **Name:** TBD. Working title muslim-marriage-africa.
- **Shortlist:** Nisfuddin (“nisf-ou-dine”; also consider `nisfdin`), Nikahsira (*nikah* + Jula *sira*), Sakinaa (*sakina*; `sakina.com`/`.net` taken). Alternates: Mithaqun, Nonglem.
- **RDAP** 2026-09-27 ~21:10 ET is point-in-time: HTTP 404 = free at check; not a purchase or reservation; premium/reserved/trademark unchecked.
- **Pending:** native-speaker Ouaga/Bobo (slang/taboo), OAPI + WIPO, social handles, user test with sisters/brothers/walis.
- **Naming constraints:** Do not put God’s name in the brand; do not echo Farata’s “Ta moitié” tagline. Rubric: short, francophone-pronounceable, no dating tone, works as a French brand.
- **Downstream:** UX, architecture, and epics are **not** started by this document.
