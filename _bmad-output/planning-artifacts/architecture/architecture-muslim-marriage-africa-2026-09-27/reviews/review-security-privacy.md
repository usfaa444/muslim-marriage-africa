# Security / privacy / CIL review

**Artifact:** architecture spine + solution design (2026-09-27)  
**Lens:** authn/z, RBAC, photo original leakage, signed-URL revoke, moderation fail-closed, payment isolation, audit immutability, CIL transfer honesty, secrets, rate limits, anti-scam predicate, staff bulk-export ban  
**Sources read:** `ARCHITECTURE-SPINE.md`, `SOLUTION-DESIGN.md`, PRD NFR-001–NFR-009 / FR-007 / FR-019 / FR-056–FR-061 / FR-067 / FR-068 / FR-088 / FR-093 / FR-119–FR-120 / FR-143  
**Statute check:** Loi n°001-2021/AN (official AN PDF, an.bf). Only articles actually read are cited. No article numbers invented.  
**Spine status:** not modified by this review  
**Verdict:** pass-with-findings  
**Date:** 2026-09-27

This is not legal advice and not a CIL filing. It judges whether the architecture can be built without two teams inventing a weaker security model, and whether CIL claims stay inside the verified statute.

---

## Verdict in one paragraph

The pair of documents is an honest, buildable security floor for a Burkina-first ta'aruf platform: roles are not genders, originals are not list payloads, moderation fails closed, billing cannot sit on the safety path, contact-share has a single writer, France hosting is named as a transfer and a launch gate, and the statute citation is the real law. It is **not** yet a control design. Four load-bearing promises — 60-second reveal revoke, “immutable” audit, “no staff bulk export,” and “CIL authorisation before traffic” — are stated as outcomes without the mechanism that makes them true against S3-style URLs, a DBA, a backup, or a KYC/ASR vendor. Those gaps are closable in the companion design (or a later AD) without changing the paradigm. Until they are closed, treat the spine as **pass-with-findings**, not launch-cleared.

---

## What holds (do not re-litigate)

| Topic | Why it holds |
| --- | --- |
| Authn split | AD-7: httpOnly session cookie on web/PWA; Bearer on Capacitor. Google OIDC is additional, never the only path (AD-8). PIN is an identity entity (`pin_lock`), not a UI toy. |
| RBAC | Roles `member \| mahram \| moderator \| operator \| system`. Sister/Brother is a Member attribute. Staff accounts are individual. Mahram cannot compose, browse, or Invite (AD-12). `AuthContext` is minted by identity; downstream does not re-parse tokens. |
| Photo originals in feeds | AD-9 + AD-23: only `MediaPort.sign` mints URLs; notifications store asset ids; list/grid/push never carry original keys. Moderator unblur is an audited grant, not a client decode. `FLAG_SECURE` is correctly labeled deterrence. |
| Fail-closed | AD-10 state machine + AD-15: recipient (and Mahram) see only `delivered`. AI 5xx / timeout → `hold`. Mooré/Dioula path is hold-for-human, not fake ASR (AD-11). |
| Payment isolation | AD-2 / AD-14 / AD-21: safety paths do not import the billing adapter; `BillingPort.isEntitled` is the only entitlement read; no `renew_at`; webhook signature + 600s skew + 30-day `webhook_receipt` (AD-7). |
| Anti-scam predicate | AD-17 + AD-3 + AD-23: only chat writes `contact_share`; moderation/trust call `ChatPort.contactShareOpen`. Money-ask stays held/blocked after share. Matches FR-068 as autofixed in the PRD. |
| CIL hosting honesty | A3 kept verbatim. AD-5 is an added pick tagged `[ASSUMPTION — legal review]`. Public French disclosure string is concrete. Launch gate is authorisation + DPA + encryption **before** public traffic. Farata USA processors are not copied. |
| Statute hygiene | Loi n°001-2021/AN is the real statute. Arts 42–44 are the transfer chapter. NFR-008 clocks stay `[ASSUMPTION]`. 72h breach notice is repeated from NFR-002 and **not** pinned to a fabricated article. |
| Secrets (direction) | AD-6: secrets manager, never images. AD-17: chat envelope `{v, alg, kid, iv, ct}` with yearly `kid` rotation. |
| Encryption / hashing | TLS 1.2+; AES-256-class at rest for photos, chat bodies, ID images, backups; argon2id. Matches NFR-001 classes. |

---

## Statute note (Loi n°001-2021/AN) — verified, not invented

Checked against the official Assemblée nationale PDF (`an.bf`, loi titled *portant protection des personnes à l’égard du traitement des données à caractère personnel*, adopted 30 March 2021).

**Article 42 (read in full).** A controller may transfer personal data to a foreign country or international organisation only if that destination assures a level of protection adequate to that assured in Burkina Faso. Before any outward transfer the controller must, in advance: (1) obtain the authorisation of the supervisory authority; (2) sign with the counterparty a confidentiality clause and a reversibility clause so data can be migrated in full at the end of the contract; (3) implement technical and organisational measures including **chiffrement**, availability, confidentiality, integrity, and resilience, plus a procedure to test and evaluate those measures. Adequacy is assessed in light of all circumstances of the transfer.

**Article 44 (read in full).** Notwithstanding the cited provision of article 43, a transfer to a country that does **not** assure adequate protection may still occur under listed derogations (specific informed consent after risk notice; contract necessity; vital interest; decree after conforming opinion of the authority; preponderant legitimate interests provided by law; punctual non-massive transfer for an important public interest or the establishment/exercise/defence of a legal right; public-register consultation; international judicial assistance; a bilateral/multilateral agreement to which Burkina Faso is party; or express reasoned authorisation when a contract homologated by the authority guarantees an adequate level of protection).

**Article 43.** Article 44’s chapeau cites « article 43 alinéa 2, 2e tiret ». The article therefore exists. The official-PDF extract used for this review has no separate “Article 43” heading between 42 and 44 (likely an OCR skip). **This review does not reconstruct Article 43 from blogs or Law Lab Africa.** The spine’s three-bullet summary (authorisation + confidentiality/reversibility + encryption; art. 44 derogations exist) matches verified Article 42 and the Article 44 chapeau. It does not invent further article numbers.

**Also read, relevant to this product, not summarised as “the hosting rule” in the spine:**

- **Article 12.** Collecting or processing data that reveal religious convictions or activities (among other sensitive categories), without the person’s express consent, is forbidden unless a statutory derogation applies.
- **Article 31.** Treatments implemented only after authorisation of the supervisory authority include, among others: biometric data in the private sector; interconnection of files; a national-identification number or identifier of the same nature; AI-assisted decision support / profiling; **and transfers of data to a foreign country**.

The architecture is honest that France hosting is a transfer under arts 42–44 and that CIL authorisation is a launch gate. It is **incomplete** if builders treat that as the whole CIL surface (see Finding CIL-1).

---

## Judgement by requested topic

### 1. Authn / authz

**Pass, with holes that will become incidents.**

Identity owns `account`, `credential`, `session`, `pin_lock`. Session kinds are `web | capacitor | mahram`. PIN idle timeout 15 minutes is inherited from NFR-001 as a working number. Password reset (FR-008) invalidates old sessions — named in the PRD, not restated as an identity command in the spine.

Missing as architecture (builders will invent):

- Cookie flags: `Secure`, `HttpOnly` (named), `SameSite` (not named). CSRF on cookie-authenticated POST/WS is unspecified.
- Capacitor Bearer persistence: secure-storage vs WebView localStorage. A leaked Bearer is a full session.
- Socket.IO `/v1/realtime` handshake: no rule that the socket must present the same `AuthContext` and that `message.delivered` media URLs are still minted only via `MediaPort.sign`. A side-channel subscribe would bypass HTTP RBAC.
- Staff step-up: no MFA, no IP allow-list, no `session.kind=staff`. Moderator and operator share the same cookie/Bearer scheme as Members.
- Multi-role: `AuthContext.roles[]` is a list. A staff account that also holds `member` can browse the grid with privileged knowledge. AD-8 forbids Mahram-as-Member; it does not forbid operator-as-member.
- Captcha (FR-007) is in AD-17’s **Binds** line and absent from the **Rule** text. Rate limits are named; bot check is not.
- Session revocation on Ban / password change / Mahram remove is implied by AD-12’s 60s access drop, not specified as “identity revokes sessions.”

None of these overturn AD-8. They are the difference between “roles exist” and “authz holds on every socket and staff console.”

### 2. RBAC

**Pass.** The role model is the right one for this product.

Mahram is a role with a `mahramWardId`, not a second Member login. Gender is not a role. Unblur is a media grant (AD-9), not a CSS filter. Memlog (not the AD-8 rule body) says operator cannot unblur — that split should live in the companion permission matrix (moderator: holds/cases/unblur; operator: config/CIL/metrics/prices; neither: contact-list export).

`system` is unnamed: which service accounts hold it, and can it mint reveals? Needs one line in SOLUTION-DESIGN, not a new AD.

MVP unblur is audited single-control (D31 NEXT). That is an accepted residual, not a defect, if every unblur writes AD-18.

### 3. Photo original leakage

**Pass on the happy path; residual on API shape and vendors.**

Prevented: original URLs in list/grid/push; notification teams constructing bucket URLs (AD-23); client-side de-blur.

Still leakable:

- `photo_asset.original_key` is a stored field (SOLUTION-DESIGN §6). AD-9 forbids originals in list/grid/notification **payloads**. It does not forbid `/v1/media`, `/v1/profiles/:id`, or `/v1/staff/cases` from returning the row. One careless serializer ships the key.
- Derivatives `xs | sm | md | blur` (AD-16). If `md` is a clear downscale, Lite mode becomes a clear-photo channel. The sign API must take `derivative` and refuse `original` / clear `md` unless a reveal grant exists.
- Ingest + moderation + KYC adapters receive originals and ID images. That is a **subprocessor transfer**, not Scaleway Paris. See CIL-1.
- Object-storage **versioning** (AD-20) keeps prior originals after a Member delete or photo replace. Conflicts with NFR-008 erasure unless versions are in the erase path.
- Web/PWA cannot set `FLAG_SECURE`. Screenshot residual is accepted (FR-061 NEXT). Honest.

### 4. Signed URL revoke

**Fail the 60-second promise as currently written.**

AD-9 now says: default TTL 300s, max 900s; revoke deletes the grant, writes a denylist row, and **stops new signatures within 60s**. FR-059 / SOLUTION-DESIGN §9 still say the product **stops serving** the clear URL within 60 seconds (cached bytes are the named residual).

Native S3-compatible pre-signed URLs are valid until expiry. A denylist checked only inside `MediaPort.sign` does not stop an already-issued 300–900s URL. To honour 60s “stop serving”:

1. every GET must pass a grant-checking gateway (then the signed URL is a capability token to **that** gateway, not to the bucket), **or**
2. signed TTL must be ≤ 60s and revoke must also be a bucket-side deny (key rename / ACL / object lock), **or**
3. the product must downgrade the promise to “stop **minting** within 60s; already-issued URLs die at TTL” and say so in FR-059 terms.

As written, a Brother who loaded a clear photo 10 seconds before revoke keeps a working URL for up to 15 minutes. That is not “cached bytes.” That is the origin still serving.

`signed_url_ttl_seconds` is a required `operator_config` key — good — but an operator can set it to 900 and silently break FR-059. Cap the config at 60s **or** put the denylist on the GET path.

### 5. Moderation fail-closed

**Pass.** This is the strongest safety invariant in the spine.

`pending` is the only birth state. Recipients never get media bytes until `delivered` (AD-15). Vendor down → `hold`. Local-language honesty is unusually good.

Close these edges in SOLUTION-DESIGN (not new ADs unless two teams diverge):

- Malformed / empty `ModerationPort` response → `hold` (same as 5xx).
- Worker crash after vendor `allow` and before state write → retry must not skip the write; default remains `pending`.
- Human bulk-allow from `/v1/staff/holds` needs the same per-item audit as unblur; a “allow all” button is fail-open.
- Operator threshold changes apply to **subsequent** messages only (PRD UJ-6). Spine does not restate that; a builder could rewrite old `delivered` rows.
- Discovery must omit `pending` / `held` profile photos. Bio swaps only on allow — already in the data-model table.

Chaos test in NFR-003 (kill AI, assert zero unreviewed deliveries) is the right verification. Keep it.

### 6. Payment isolation

**Pass.**

Billing is unreachable from identity, verification, media, moderation, mahram, report, and sister-invite paths except `BillingPort.isEntitled`. Packs have `ends_at` and no renewal job. Webhook authenticity is specified (signature + 600s + receipt).

Remaining (medium):

- `isEntitled` must return `false | true | unavailable`, never throw into a safety handler. AD-21 says paths succeed when the adapter is down; a thrown exception is a second, accidental coupling.
- Cards-secondary implies PCI-DSS scope or a redirect-offload. Not named. Prefer “cards only via hosted checkout; PAN never touches `apps/api`.”
- Entitlement cache: stale-open is acceptable for Premium convenience; stale-closed must not disable Free/safety.

### 7. Audit immutability

**Fail as “immutable”; pass as “tamper-evident at application layer.”**

AD-18: `audit` owns append-only `audit_event` with `prev_hash` / `hash`, ≥12 months, individual staff attribution. Event set is broader than NFR-009 (adds mahram, reveal, payment webhook) — good.

A hash chain in PostgreSQL is **not** immutable against:

- a DBA or operator with `UPDATE`/`DELETE` on `audit_event` (recompute the chain);
- PITR restore to a point before an unblur;
- a shared `operator` database role used for CIL tickets and for raw SQL.

NFR-009 verification (“audit-log replay test”) only proves the app writes the chain. It does not prove a staff member cannot erase an unblur.

Minimum companion rule (do not invent a new product AD unless two teams will write logs): audit DB role is `INSERT` + `SELECT` only; `UPDATE`/`DELETE` revoked; nightly chain-verify job; optional copy of hashes to versioned object storage. Payload hygiene: do not store phone numbers or original photo bytes in `payload` (conflicts with NFR-008 erase vs 12-month audit keep). Store ids + action + reason.

### 8. CIL transfer honesty

**Pass on hosting. Fail on “this is the whole filing.”**

Honest:

- A3 not rewritten.
- France = foreign transfer. Virtix recorded as the no-transfer alternative and rejected for ops reasons, not hidden.
- Public string names Île-de-France and Scaleway.
- Launch gate: CIL authorisation + DPA + encryption evidence before public traffic.
- Art. 44 derogations are mentioned as existing, not used as a “skip the filing” loophole.
- Retention clocks remain assumptions. Cookie consent ≠ photo reuse. Coarse geo.
- Documents say they are not a CIL filing.

Over-claims / under-claims (stay inside verified articles):

- SOLUTION-DESIGN §5.1 “GDPR adequacy argument.” Article 42 assesses adequacy **to the protection assured in Burkina Faso**, in light of the circumstances of the transfer. GDPR-grade contracts are a fact pattern for counsel. They are not an automatic satisfaction of Article 42. Do not let marketing say “CIL-compliant because GDPR.”
- Public disclosure names **one** processor (Scaleway). The deployment diagram also sends personal data to SMS, KYC, moderation AI, and mobile-money aggregators. Those are additional destinataires / sous-traitants (articles 5, 11 — definitions and processor convention — read). Several may be outside Burkina Faso. A CIL authorisation that lists only Scaleway `fr-par` is incomplete.
- Liveness + ID images are biometric-class evidence. Article 31 (verified) lists private-sector biometric treatments **and** foreign transfers as requiring prior authorisation. Counsel maps the product; architecture should list those processing facts as filing inputs, not only “Paris hosting.”
- `madhhab` and `practice` are religious-activity fields. Article 12 (verified) requires express consent (or a statutory derogation) to collect them. The data model has the columns; the CIL section does not mention consent for sensitive categories.
- Article 31 also lists AI-assisted profiling / decision support. Pre-delivery classifiers may or may not fall in that bullet. **Do not decide that here.** Do record the fact that every Chat text/photo/voice is scored by a model, so counsel can ask CIL.

72h breach notice: product/NFR policy. This review does not attribute a 72-hour duty to a specific article of Loi n°001-2021/AN.

### 9. Secrets

**Directionally pass; incomplete as a control.**

Present: secrets manager, not images; chat `kid` yearly rotation.

Absent: named store (Scaleway Secret Manager / equivalent); rotation for session-signing keys, webhook HMAC, object-storage keys, SMS/KYC/moderation/payment API keys; CI secret scan; staging/prod isolation of those keys; Capacitor token storage. `body_enc` envelope is specified; ID images and backups are only “AES-256-class.” Same `kid` story should apply to ID-image encryption or the claim is decorative.

### 10. Rate limits

**Named, not specified.**

AD-17 rate-limits auth, OTP, Invite, Report, payment. That covers stuffing, SMS pumping, spray-and-pray, false-report floods, and payment hammering.

Not in the list: password-reset (FR-008), media upload, reveal-request (FR-058 cap), browse/scrape (`/v1/browse` is the bulk-export bypass), Mahram invite-by-phone, `/v1/staff/*`. No numeric defaults in the required `operator_config` keys. FR-007 captcha is unbound in the rule text.

Companion should add working numbers (auth / OTP / invite / report / payment / browse) as config keys, and name captcha on signup/login.

### 11. Anti-scam predicate

**Pass after AD-17 / AD-23 autofix.**

Single writer (`chat.contact_share`), single reader port, money-ask independent of share, education interstitial implied by FR-068. `/v1/conversations/:id/contact-share` exists in SOLUTION-DESIGN §7.1.

Residual (product, not architecture fork): obfuscated numbers, QR / screenshot of a number (image path), spoken numbers in `mos`/`dyu` voice (hold path already). Image classifier should treat phone/QR as contact-share content, not only “indecency.”

### 12. Staff bulk-export ban

**Fail as a control; pass as an intention.**

AD-17 / NFR-001: “No staff bulk export of contact lists.” Verification in the PRD: a low-privilege staff export attempt must fail.

The architecture names the ban and does not define:

- what “bulk” is (CSV, JSON page of 100, SQL `COPY`);
- which roles may run FR-019 / FR-143 **subject-access** export (that is a legitimate export) vs fishing;
- whether `/v1/browse`, `/v1/staff/cases`, or `/v1/staff/metrics` can reconstruct a contact graph;
- whether the operator’s database role or PITR backup is in scope (addendum risk 28: “Owner-only export; need-to-know”).

Without a deny on list-export endpoints, an audit event on any contact-bearing download, and a non-superuser prod SQL role, the sentence is a policy poster. CIL tickets (`cil_ticket`) must be the **only** staff path that emits another person’s phone/WhatsApp, and only for that ticket’s data subject.

---

## Findings (triaged)

### High — signed URL still serves after revoke (SEC-1)

AD-9 denylist + “stop minting in 60s” does not stop an already-issued 300–900s pre-signed GET. FR-059 requires the product to stop **serving** the clear URL within 60s.

- **Close in companion (preferred) or tighten AD-9:** either GET-path grant check, or TTL cap ≤ 60s plus bucket-side invalidate. Do not leave `signed_url_ttl_seconds` unbounded at 900.

### High — CIL surface is hosting-only (CIL-1)

Arts 42–44 hosting transfer is correctly flagged and not over-cited. The product also processes religious fields (art. 12), biometric liveness/ID (art. 31 biometric + foreign-transfer bullets), model scores on every message (art. 31 AI/profiling bullet — counsel decides), and outbound vendors (SMS, KYC, ASR, aggregator) that the privacy page does not name.

- **Close in SOLUTION-DESIGN §5:** a filing inventory (controller, processors, destinataires, data categories, transfer countries). Keep A3/AD-5 text. Do not claim GDPR = art. 42 adequacy. Do not invent more articles.

### High — “immutable audit” is a table (AUD-1)

Hash-chain without INSERT-only DB role, chain-verify, and payload-minimisation is reversible by the same staff the log is meant to constrain (unblur, sanctions, CIL completions).

- **Close in companion:** INSERT/SELECT-only audit role; nightly verify; no phones/originals in `payload`.

### Medium — staff bulk-export is a slogan (SEC-2)

No endpoint deny, no subject-access vs fishing split, no backup/SQL scope.

- **Close in companion:** owner/subject export only via identity/operator ticket; staff list endpoints cannot return phone/WhatsApp; every allowed export is an AD-18 event; prod SQL role cannot `SELECT` contact columns in bulk.

### Medium — authz holes on WS, CSRF, staff, captcha (SEC-3)

Realtime and staff consoles are the two places a role mistake leaks a Sister photo or a hold queue.

- **Close in companion:** Socket.IO binds `AuthContext`; cookie `SameSite`+CSRF; staff MFA; captcha named on auth; `system` and operator-as-member forbidden.

### Medium — original_key / clear derivatives / versioned deletes (SEC-4)

Serializer and Lite `md` and S3 versioning can undo AD-9.

- **Close in companion:** API never returns `original_key`; `MediaPort.sign` rejects unauthorized derivatives; erase includes versions.

### Low — FLAG_SECURE / screenshots

Honest residual. FR-061 NEXT. Do not advertise “cannot screenshot.”

### Low — SOLUTION-DESIGN §9 stale vs AD-9

§9 still describes revoke as “drops the grant and stops minting” without TTL/denylist/`MediaPort.sign`. Companion should match the spine so legal reviewers do not file the weaker text.

---

## Topic scorecard

| Topic | Score | Note |
| --- | --- | --- |
| Authn/z | pass-with-findings | Model good; WS/CSRF/staff/captcha unspecified |
| RBAC | pass | Roles ≠ gender; Mahram cannot act-as |
| Photo original leakage | pass-with-findings | Feeds protected; API/vendor/versioning not |
| Signed URL revoke | fail-until-mechanism | 60s serve-stop vs 900s pre-sign |
| Moderation fail-closed | pass | Strongest invariant |
| Payment isolation | pass | AD-21 + webhook window |
| Audit immutability | fail-as-worded | Tamper-evident app log ≠ WORM |
| CIL transfer honesty | pass-on-hosting / incomplete-filing | No invented articles; filing surface too narrow |
| Secrets | pass-with-findings | Manager + chat `kid`; other keys unnamed |
| Rate limits | pass-with-findings | Right verbs; no numbers; captcha unbound |
| Anti-scam predicate | pass | Single writer after AD-23 |
| Staff bulk-export ban | fail-as-control | Intention only |

---

## What this review is not

Not a penetration test. Not a CIL filing pack. Not a rewrite of A1–A3. Not a request to start another BMAD skill. The spine was not edited.

---

## Top findings (for the parent return)

1. Signed-URL revoke does not stop already-issued 300–900s GETs within the 60s FR-059/AD-9 serve window.  
2. CIL honesty is correct on France-as-transfer (arts 42–44 verified) but the filing inventory omits subprocessors, biometric/religious categories (arts 12 and 31 read, not invented), and the GDPR-adequacy shorthand.  
3. Audit “immutability” is an application hash-chain, reversible by DBA/PITR.  
4. Staff bulk-export ban has no endpoint, SQL, or backup control, and collides with CIL/subject export unless that path is exclusive.  
5. Authz is unfinished on Socket.IO, CSRF/SameSite, staff MFA, and FR-007 captcha.
