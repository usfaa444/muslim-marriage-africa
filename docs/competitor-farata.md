# Competitor teardown: Farata (farata.net)

**Primary competitor:** [Farata](https://farata.net/) — "N°1 des apps de rencontre Islamique", tagline *"Ta moitié, par destin et invocation"*
**Research date:** 2026-09-27, ~21:00 ET (America/New_York)
**Method:** Public pages only. Full sitemap crawl (61 URLs) rendered with headless Chrome (site is client-rendered Next.js), FAQ answers read from the page's FAQPage JSON-LD and the public JS bundle, public JS bundles grepped for UI strings (evidence of shipped UI that is only visible after login), Apple App Store lookup API (SN/FR/US storefronts), Google Play listing (SN, fr), web search for third-party coverage. **No account was created**; nothing behind login was seen directly.
**Raw evidence (in repo):** `docs/research/farata-rendered-text/*.txt` (rendered text of every crawled page), `docs/research/farata-js-ui-strings.txt` (French UI strings pulled from the public JS bundles).

### Evidence labels used below

| Label | Meaning |
|---|---|
| **Offered (seen)** | Visible on a public page, or in shipped UI code from the public JS bundle (marked *[bundle]*), or in a store listing's structured facts (downloads, rating, version) |
| **Claimed (marketing)** | Stated in marketing copy, FAQ, store description or legal text, but the working feature was not seen (it sits behind login) |
| **Not publicly evidenced** | Searched for, not found on any public surface. This does **not** prove Farata lacks it, only that it can't be seen publicly |

---

## 1. Sources cited

| # | Source | URL | What it evidences |
|---|---|---|---|
| S1 | Homepage | https://farata.net/ | Positioning, key claims, how-it-works, free vs Premium table, testimonials, member-count claims |
| S2 | FAQ (17 Q&A) | https://farata.net/faq | Signup, validation delay, search, visitors, compatibility, contact requests, moderation stance, payment, cancellation, report/block |
| S3 | Règlement (rules) | https://farata.net/reglement | Code of conduct, photo rules, family involvement, banned behaviours, **promotional use of profiles** |
| S4 | Confidentialité (privacy) | https://farata.net/confidentialite | Data collected (profile fields), processors (Vercel, Neon, Stripe, Resend, Cloudflare), retention, rights |
| S5 | CGV (terms of sale) | https://farata.net/cgv | Premium features (older version), 1/3/6-month durations, payment rails, **no auto-renew**, refunds |
| S6 | Mentions légales | https://farata.net/mentions-legales | Entreprise individuelle, Dakar; host Vercel; **19+ age rule**; Senegalese law |
| S7 | DPA | https://farata.net/dpa | GDPR + Senegal law 2008-12; TLS 1.3 / AES-256 claims; retention (messages 2 yrs then anonymised) |
| S8 | Contact | https://farata.net/contact | faratasn@gmail.com, Dakar; 24–48h business-day reply; subject dropdown |
| S9 | Inscription / Connexion | https://farata.net/inscription , https://farata.net/connexion | Google sign-in + email; pledge checkbox; "+14.3k inscrits ce mois" / "+247.8k membres actifs" claims |
| S10 | SEO landing hub + 29 city/country/theme pages | https://farata.net/rencontre , e.g. https://farata.net/rencontre/ouagadougou , https://farata.net/rencontre/burkina-faso | Countries/cities targeted; "1 000+ membres à Ouagadougou" claim; filters madhhab/**confrérie**/hijra/education |
| S11 | Blog (6 articles) | https://farata.net/blog | Content marketing (Senegal-centric); categories Conseils/Pratique/Spiritualité/Témoignages |
| S12 | Public JS bundles | https://farata.net/_next/static/chunks/*.js (40 chunks loaded by public pages) | Shipped UI strings: photo blur toggle, reveal-after-acceptance, photo-rejection strike rule, boosts, suspension, deactivation, email verification, captcha, contact-form triage |
| S13 | PWA manifest | https://farata.net/manifest.json | Installable PWA, start_url /dashboard, shortcuts Profils / Messages / Demandes; lang fr-FR |
| S14 | robots.txt / sitemap.xml | https://farata.net/robots.txt , https://farata.net/sitemap.xml | Private app routes: /dashboard, /messages, /conversations, /demandes, /favoris, /visiteurs, /profil/parametres, /onboarding, /premium/callback, /admin |
| S15 | Apple App Store | https://apps.apple.com/sn/app/farata-muslim-dating/id6785800226 (lookup API SN/FR/US) | Seller **JAABA LLC**; v0.0.4; released 2026-07-22; updated 2026-09-19; 17+; rating SN 2.6 (8 ratings), FR 5.0 (1), US none; long feature description |
| S16 | Google Play | https://play.google.com/store/apps/details?id=net.farata.app | "Jaaba Corp's" / JAABA LLC (Newark, DE, USA); **10k+ downloads**; 4.3★ (41 reviews); 18+; updated 2026-09-23; review: *account deletion impossible* |
| S17 | Third-party | https://prixdakar.com/farata-une-nouvelle-plateforme-en-ligne-de-rencontre-halal-au-senegal/ , https://diodioglow.com/blog/details/farata-net-senegal-avis-application-rencontre-halal , https://fr.gridinsoft.com/online-virus-scanner/url/farata-net | Instagram 100k+ followers (third-party claim); domain registered 2025-11-29; Gridinsoft trust score 35/100 ("suspect", 1 blacklist hit) |

### Pages that could NOT be seen (login required or broken)

- **Behind login (redirect to /connexion):** `/premium` (checkout), `/academie` (Académie du Mariage index), `/dashboard`, `/profils` (browse), `/messages`, `/conversations`, `/demandes` (requests), `/favoris`, `/visiteurs`, `/profil/parametres` (settings), `/onboarding` (profile builder).
- **Broken:** all 19 `/academie/...` article URLs listed in the sitemap return **HTTP 404** (e.g. `/academie/droit/wali-role-importance-mariage`).
- **Not seen, so unknown:** the actual onboarding profile fields and required/optional split; what "mode anonyme" does exactly; how the ID document + selfie check works; how well the AI coach answers; whether AI chat moderation works in practice (and on voice/photos); Premium checkout UX; the admin/moderation back office; the promo video (`Découvrez Farata`) was not transcribed.

---

## 2. Positioning snapshot

- **Who / where:** French-language, Senegal-centric, West Africa + diaspora. Countries named: Sénégal, Mali, Côte d'Ivoire, Burkina Faso, Guinée, Gambie, Mauritanie (S10), plus France, Belgique, Canada "et au-delà" (S15/S16). HQ "Dakar, Sénégal", *entreprise individuelle* (S6), while the store apps are published by **JAABA LLC, Delaware, USA** (S15/S16).
- **Promise:** "Pas une app de rencontre. Une app de mariage." 100% halal, "zéro faux profil", privacy via anonymous mode + blurred photos, AI coach (S1).
- **Scale claims (marketing, not verified):** "+247.8k membres actifs", "100 % profils vérifiés", "+14.3k inscrits ce mois" (S1/S9), "1 000+ membres à Ouagadougou" (S10). **Hard data contradicts the scale:** Google Play shows **10k+ downloads / 41 reviews**; iOS has 8 ratings in Senegal (S15/S16).
- **Age rule:** 19+ (S6); stores rate it 17+ (iOS) / 18+ (Play).
- **Stack (from privacy/DPA/HTML):** Next.js on Vercel, Neon Postgres, Stripe, Resend email, Cloudflare, Cloudinary images, Sentry; trackers: Google Tag Manager, Meta Pixel, Microsoft Clarity (S4, S7, page HTML, S17).
- **Young product:** domain registered 2025-11-29 (S17); legal pages "Décembre 2024"; iOS v0.0.4 (S15); site footer v1.82.0; PWA manifest v1.27.1.

---

## 3. Pricing (public)

| Plan | Price | Source |
|---|---|---|
| **Gratuit** | 0 FCFA "pour toujours": full profile, **3 photos**, **5 contact requests/day**, **3 questions/day to the AI coach**, **reply** to messages received, Ice Breaker ideas, Académie du Mariage access, email support | S1 (homepage pricing block) |
| **Premium** | **5 900 FCFA / month** "offre de lancement", normal price **9 900 FCFA / month** | S1 |
| Premium includes | Unlimited contact requests, unlimited coach, who favourited you, who visited you, up to 10 HD photos, 100% unlimited messaging, **voice messages** ("NOUVEAU"), see who is online, personalised Ice Breakers, **Message Flash**, detailed AI compatibility score, better ranking, **advanced filters (madhhab, hijra…)**, boosts included, **"Badge Premium vérifié"**, priority support 7/7, priority profile validation (<10 min) | S1, S2, S12 |
| Boosts | Can also be bought on their own ("Acheter un Boost", "Activer le Boost") | S12 [bundle] |
| Durations | 1, 3 or 6 months; **not auto-renewed** | S5 |
| Payment rails | FAQ: Visa/Mastercard, Orange Money, Wave, Free Money. CGV: Wave, Orange Money, card via Stripe. Store listings add **MTN Money, Moov Money** | S2, S5, S15/S16 |
| Refunds | 14-day withdrawal right, waived once the service starts; refunds only for outage >7 days, double billing, or wrongful closure | S5 |

**Pricing inconsistencies seen (a trust gap):** the CGV says free = 1 photo / 3 contacts per day and Premium = 6 photos; the homepage says free = 3 photos / 5 contacts and Premium = 10 photos. The FAQ says payment is "automatique", but the CGV says there is no auto-renewal. Being verified is bundled into Premium ("Badge Premium vérifié"), separate from the ID-verified badge claimed in the store listings.

---

## 4. Feature matrix (evidenced vs claimed vs not evidenced)

### 4.1 Account, onboarding, verification

| Feature | Evidence | Status |
|---|---|---|
| Sign up with **email + pseudonym + gender + password** | FAQ "pseudo, ton email, ton genre, mot de passe" (S2); privacy data list (S4) | Offered (seen) |
| **Google sign-in** | "Inscription rapide avec Google", "Continuer avec Google" (S9) | Offered (seen) |
| **Sincerity pledge** at signup ("je m'engage sincèrement devant Allah à rechercher le mariage") + accept rules/privacy | S9 | Offered (seen) |
| **Email verification link** (expiry, resend) | "Lien de vérification invalide/expiré… Demander un nouveau lien" (S12) | Offered (seen) [bundle] |
| **Bot check / captcha** at auth | "Veuillez compléter la vérification de sécurité" (S12) | Offered (seen) [bundle] |
| Password reset by email link; "remember me" | /mot-de-passe-oublie, /reinitialiser-mot-de-passe (S9, S12) | Offered (seen) |
| **Guided onboarding** to build a detailed profile | FAQ "tu compléteras ton profil détaillé lors de l'onboarding" (S2); /onboarding route (S14) | Claimed (route behind login) |
| **Manual review of every signup** before the profile goes live | FAQ: 12–24 h (S2); homepage "vérifiée à la main" (S1); bundle UI "Validée sous 30 min" (S12) | Claimed (turnaround numbers disagree) |
| **Priority validation for Premium** (<10 min) | FAQ (S2); bundle "Validée en 10 min avec Premium" (S12) | Claimed |
| **ID verification by document + selfie → "Vérifié" badge** | App Store / Play description (S15/S16) | Claimed (not on the website) |
| **Photo required before you can contact members** (can be blurred) | "Ajoute une photo pour contacter les membres. Tu peux la flouter…" (S12) | Offered (seen) [bundle] |
| Edit profile any time; **photo changes are re-validated** | FAQ (S2) | Claimed |
| **Deactivate / reactivate** account | "Reconnecte-toi pour réactiver ton compte à tout moment" (S12) | Offered (seen) [bundle] |
| **Delete account** from settings (full erasure) | FAQ (S2); "Toutes tes données ont été définitivement effacées" (S12). **Play review (2026-08-14): "impossible de supprimer son compte… plusieurs mails sans résultat"** (S16) | Claimed; **reported broken by a user** |
| Age gate 19+ | S6 | Claimed (enforcement not seen) |

### 4.2 Profiles, discovery, matching

| Feature | Evidence | Status |
|---|---|---|
| Profile fields: age/DOB, city & country, marital status, education & profession, religious practice, free-text description, photos (optional) | Privacy data list (S4) | Claimed (onboarding not seen) |
| Islamic criteria: **practice level, intentions, madhhab**; filters for **confrérie (Sufi brotherhood), hijra**, education | S10 (city pages), S1 (Premium), S15/S16 | Claimed |
| **Search with filters**: age, origin, location, marital status, religious criteria, life plans; results sorted by relevance | FAQ (S2) | Claimed |
| **Distance filter** | Store description (S15/S16) | Claimed |
| **Advanced filters** (Premium) | S1; "Filtres Avancés Premium" (S12) | Claimed / UI string seen |
| **AI compatibility suggestions** (values, life plans, criteria) | FAQ (S2); homepage "Notre IA analyse tes critères" (S1) | Claimed |
| **Detailed AI compatibility score** (Premium) | S1 | Claimed |
| **Daily recommendations engine that learns your taste** | S15/S16 | Claimed |
| **Grid view of profiles** ("Vue grille illimitée") | S12 | Offered (seen) [bundle] |
| **Favourites** + **see who favourited you** (Premium) | S1, S2, /favoris route (S14) | Claimed |
| **Profile visitors list** (Premium) | FAQ (S2), /visiteurs (S14) | Claimed |
| **Online-now indicator** ("Vois qui est connecté", Premium) | S1 | Claimed |
| **Boosts** / better ranking (Premium or bought separately) | S1, S12 ("Ton profil est mis en avant dans les recherches !") | Offered (seen) [bundle] |
| **Premium badge** shown on profile | S1, S5 | Claimed |
| **Anonymous mode** ("mode anonyme") | S1, S10, S15 (not explained anywhere public) | Claimed (behaviour unknown) |
| "Fine-grained visibility controls" | S15/S16 | Claimed |
| Polygamy stance / field (blog discusses polygamy at length; an open-to-polygamy field is **not** shown) | S11 | Not publicly evidenced (as a field) |

### 4.3 Contact requests, messaging, media

| Feature | Evidence | Status |
|---|---|---|
| **Contact request** from a profile → **accept / decline**; conversation opens only on acceptance | FAQ (S2); /demandes route; PWA shortcut "Gérer mes demandes de contact" (S13) | Claimed (flow behind login) |
| **No re-sending a request after a refusal** | FAQ (S2) | Claimed |
| Daily request quota (free 5/day; unlimited Premium) | S1 (CGV says 3/day: S5) | Claimed |
| **Free users can only reply**; starting/unlimited messaging is Premium ("Pour envoyer des messages, rejoins Farata Premium") | S1, S12 | Offered (seen) [bundle] |
| **Message Flash** (personalised message, Premium) | S1 | Claimed (mechanics unknown) |
| **Ice Breakers** (AI message ideas; personalised on Premium) | S1 | Claimed |
| **Real-time chat**: typing indicator, reactions, **GIFs & stickers**, **photo sharing** (gallery/camera) | S15/S16 | Claimed |
| **Voice messages** (Premium, "NOUVEAU") | S1, S15/S16 | Claimed |
| **Push / Android notifications** (messages, requests, profile visits) | Play "Nouveautés" (S16) | Claimed |
| Installable **PWA** (shortcuts Profils / Messages / Demandes; offline notice "Pas de connexion internet") | S13, S12 | Offered (seen) |

### 4.4 Safety, moderation, privacy

| Feature | Evidence | Status |
|---|---|---|
| **AI scans every message; inappropriate content blocked instantly** | Homepage "Notre IA scanne chaque message… Bloqué instantanément" (S1); city pages (S10) | Claimed. **Contradicted by the FAQ:** "Nous ne lisons pas les conversations privées", moderators look only after a report (S2) |
| AI moderation of **voice notes** and **chat photos** | Nowhere explicit; the store copy only says "modération qui préserve le respect" (S15) | Not publicly evidenced |
| **Profile photo moderation** with a strike rule: **3 rejected photos → uploads blocked for 24 h** | S12 [bundle] (`REJECTION_THRESHOLD=3`, `BLOCK_DURATION_HOURS=24`, "Upload temporairement bloqué", `MODERATION_REJECTED`) | Offered (seen) [bundle] |
| Photo rules: modest, recent, real, no third parties/celebrities; hijab recommended for sisters | S3 | Offered (seen) (policy) |
| **Photo blur**: "Flouter ma photo — **Visible nette uniquement après acceptation**"; upload option "Photo floutée par défaut • Modifiable plus tard"; "Déflouter mes photos"; "Reste discret(e), défloute quand tu veux" | S12 [bundle]; S1 "photos floues" | Offered (seen) [bundle] = blur with **reveal-on-acceptance**, all or nothing |
| **Per-viewer reveal-on-request / revoke** | Not found | Not publicly evidenced |
| **Report a profile or a message** in-app; handled "within 24 h" | FAQ (S2); rules §05 (S3) | Claimed |
| **Block a member** (from profile or conversation; they can no longer contact or see you) | FAQ (S2) | Claimed |
| Sanctions: suspension/ban without notice; **false reports can be sanctioned**; "Ton compte a été suspendu" screen | S3, S4, S12 | Offered (seen) [bundle] / policy |
| Explicit ban list: indecent photos, sexual talk, impersonation, **multiple accounts**, harassment, **asking for money / scams**, illegal or un-Islamic activity, hate, non-marriage use | S3 | Offered (seen) (policy) |
| **Family involvement encouraged** (rules §04: involve family, family meetings when things get serious) | S3 | Offered (seen) (policy only; no product feature) |
| **Mahram / wali added to the chat** | Only mentioned in blog advice ("se voir en présence d'un mahram", "propose que ton wali prenne contact"); no product feature on site, bundle or store listing | **Not publicly evidenced** |
| **Contact-form AI triage** (rejects matchmaking requests: "Ce formulaire n'est pas destiné aux demandes de mise en relation") | S12 [bundle] | Offered (seen) [bundle] |
| Encryption in transit/at rest, bcrypt, daily encrypted backups | S4, S7 | Claimed |
| GDPR + Senegal law 2008-12; rights (access, rectification, erasure, portability, objection, restriction); DPA; breach notice within 72 h | S4, S7 | Claimed (policy) |
| Retention: deletion 30 days after closing; **messages kept 2 years then anonymised**; logs 12 months; payments 10 years | S4, S7 | Claimed (policy) |
| **Profiles may be used in ads/social/influencer promos with no pay; opt-out only on request** | Rules §07 (S3) | Offered (seen) (policy). **Privacy weakness for a halal-privacy brand** |
| Cookie banner (accept / manage) | All pages | Offered (seen) |

### 4.5 AI coach, education, content, SEO

| Feature | Evidence | Status |
|---|---|---|
| **AI coach "Cheikh Moussa"** (web) / **"Cheikh Amadou"** (app store copy): 24/7 advice, help completing your profile, ice breakers; floating widget "Coach & Support"; free 3 questions/day, unlimited on Premium | S1, S12 ("As-salamu alaykum … Je suis Cheikh Moussa, ton coach sur Farata"), S15 | Offered (seen) [bundle] (answer quality unknown) |
| **Académie du Mariage** (hadith / law / stories / advice; e.g. wali role, mahr, spouses' rights, polygamy) | Sitemap (S14); index behind login; **article URLs 404** | Claimed (content not reachable publicly) |
| **Blog**: 6 long articles (Senegal-centric; categories incl. "Témoignages") | S11 | Offered (seen). Note: one article still contains leaked AI-writing-prompt text ("Je vais structurer l'article comme les précédents…") |
| **Programmatic SEO**: 11 city pages (Dakar, Thiès, Saint-Louis, Touba, Ziguinchor, Bamako, Abidjan, **Ouagadougou**, Conakry, Nouakchott, Banjul), 7 country pages (incl. **Burkina Faso**), 11 intent pages (zawaj, nikah, mariage halal…) | S10 | Offered (seen) |
| **Promo video** on the homepage | S1 | Offered (seen) (not transcribed) |
| Islamic framing throughout (Qur'an/hadith quotes on every auth page) | S1, S9 | Offered (seen) |

### 4.6 Success stories, trust signals, support

| Feature | Evidence | Status |
|---|---|---|
| **Testimonials carousel** (3 quotes: Aminata D. 27 Dakar, Ousmane S. 31 Thiès, Fatou N. 25 Saint-Louis) about respect, verification and anonymity, **not** marriages | S1 | Offered (seen) (unverifiable; no photos, no couple, no marriage claim) |
| **Couples report a marriage / verified success stories** | Heading "Ils ont trouvé leur moitié sur Farata" but no marriage stories, counter or reporting flow | **Not publicly evidenced** |
| Trust badges: "RGPD 100 % Conforme", "Inscription sécurisée • Données chiffrées", "marques déposées" | S1, S6, S9 | Claimed |
| Support: email (faratasn@gmail.com, contact@farata.net), contact form with subjects (general / technical / suggestion / partnership / other), 24–48 h business-day SLA; FAQ promises <24 h; **priority support 7/7 on Premium** | S2, S8, S1 | Offered (seen) |
| Social: Facebook / Instagram / X (farata.net / farata_net); Instagram 100k+ followers (third-party claim) | Page JSON-LD; S17 | Claimed |
| Languages: **French UI only**; contactPoint JSON-LD lists French + Arabic; no Wolof/Bambara/Dioula/Mooré/English UI seen | S1, JSON-LD, S13 (lang fr-FR) | Offered (seen) (French); others Not publicly evidenced |
| Native apps: **iOS** (v0.0.4, 2026-07-22, JAABA LLC) and **Android** (net.farata.app, 10k+ downloads) + web + PWA | S15, S16, S13 | Offered (seen) |

---

## 5. Gaps and weaknesses actually found (inputs for differentiation)

1. **No mahram/wali-in-chat product feature** anywhere public; family involvement is policy text only (S3).
2. **AI moderation claims contradict each other** (homepage: every message scanned; FAQ: private chats not read unless reported). **Voice notes and chat photos:** no evidence that they are moderated, yet both are sold as chat features (voice is Premium).
3. **No marriage-success reporting or verified stories**; the testimonials are about the app experience, not marriages.
4. **Blur is all-or-nothing, revealed on acceptance**; no per-person reveal/revoke, no watermarking, no screenshot deterrence seen.
5. **Profiles can be used in ads/influencer content by default** (opt-out on request): a privacy/modesty risk that sisters will care about.
6. **Account deletion reported broken** (Play review with 11 "helpful" votes); support runs from a Gmail address.
7. **Opaque/inconsistent pricing and quotas** (homepage vs CGV vs FAQ); the verified-looking badge is sold with Premium; a free user cannot start a conversation (Premium gate).
8. **Scale claims vs hard data**: "+247.8k active" vs 10k+ Play downloads and a few dozen ratings; a third-party trust scanner scores the domain 35/100.
9. **Senegal-first**, French-only UI. Burkina Faso is an SEO page, with no Mooré/Dioula, no BF-specific payments (e.g. Orange Money BF / Moov Africa BF / Coris Money), no local entity, no mention of Burkina's data-protection authority (CIL).
10. **Entity mismatch**: Senegalese *entreprise individuelle* on the site vs **JAABA LLC (Delaware)** as app publisher; data hosted in the USA.
11. **Broken content**: all Académie URLs in the sitemap 404; the Académie index needs login; one blog post contains leaked AI-prompt text.
12. **Coach persona inconsistency** (Moussa on web vs Amadou in stores). The coach is framed as a "Cheikh", which risks being read as religious authority.

---

## 6. (A) PARITY FEATURES — the user requires we implement **every one** of these

> Scope: everything Farata offers, claims, or shows in shipped UI (Offered (seen) or Claimed). Where Farata's version is weak, parity is the floor and the differentiator in (B) raises it. **These must be carried into the product brief and PRD as explicit features.**

**Account & onboarding**
- P1. Sign up with email + password + pseudonym + gender. *(S2, S4)*
- P2. Google sign-in (plus Apple sign-in on iOS for store compliance). *(S9)*
- P3. Sincerity pledge ("I commit before Allah to seek marriage") + accept rules & privacy at signup. *(S9)*
- P4. Email verification link with expiry and resend. *(S12)*
- P5. Bot protection (captcha) on auth. *(S12)*
- P6. Password reset by email + "remember me". *(S9, S12)*
- P7. Guided onboarding into a detailed profile. *(S2, S14)*
- P8. Manual/human review of every new profile before it is visible, with a stated turnaround; faster validation as a paid perk *(S1, S2, S12)* (see D-list for our version).
- P9. ID verification with a document + selfie → "Verified" badge. *(S15/S16)*
- P10. A profile photo is required to contact others, and it may be blurred. *(S12)*
- P11. Edit profile any time; changed photos are re-moderated. *(S2)*
- P12. Deactivate / reactivate account. *(S12)*
- P13. Self-serve account deletion with full erasure. *(S2, S12)*
- P14. Age gate (Farata: 19+). *(S6)*

**Profiles, discovery, matching**
- P15. Profile fields: age/DOB, city/country, origin, marital status, education, profession, religious practice, intentions/life plans, description, photos. *(S4, S2)*
- P16. Islamic criteria: madhhab, confrérie (Sufi brotherhood), hijra intention, practice level. *(S10, S1, S15)*
- P17. Search with filters: age, origin, location, **distance**, marital status, religious criteria, life plans; relevance sort. *(S2, S15)*
- P18. Advanced filters tier (e.g. madhhab, hijra). *(S1)*
- P19. AI compatibility suggestions + a detailed AI compatibility score. *(S1, S2)*
- P20. Daily recommendations that learn from the member's behaviour. *(S15)*
- P21. Grid browse view. *(S12)*
- P22. Favourites + "who favourited me". *(S1, S2)*
- P23. Profile visitors list ("who viewed me"). *(S2)*
- P24. Online-now indicator. *(S1)*
- P25. Boosts / visibility ranking (included in Premium and sold on their own). *(S1, S12)*
- P26. Premium badge. *(S1, S5)*
- P27. Anonymous / discreet browsing mode + fine-grained visibility controls. *(S1, S15)*

**Contact & messaging**
- P28. Contact request from a profile → accept / decline; a chat opens only after acceptance; lists of sent/received/accepted requests. *(S2, S13)*
- P29. No re-sending after a refusal. *(S2)*
- P30. Daily request quota by tier. *(S1)*
- P31. "Message Flash": a personalised first message attached to a request. *(S1)*
- P32. AI Ice Breakers (message ideas; personalised). *(S1)*
- P33. Real-time chat: typing indicator, reactions, GIFs/stickers (we will offer a **curated halal** set), photo sharing (gallery/camera). *(S15)*
- P34. Voice messages. *(S1, S15)*
- P35. Push notifications for messages, requests and profile visits. *(S16)*
- P36. Web app + installable PWA + native iOS + Android apps. *(S13, S15, S16)*

**Safety, moderation, privacy**
- P37. AI moderation of chat messages, blocking inappropriate content. *(S1)*
- P38. Profile photo moderation with a strike rule (Farata: 3 rejections → 24 h upload block). *(S12)*
- P39. Published photo rules (modest, recent, real, no third parties). *(S3)*
- P40. Photo blur toggle, blur by default at upload, **clear photo after acceptance**, unblur any time. *(S12)*
- P41. Report a profile or a message in-app, with a published handling SLA (Farata: 24 h). *(S2, S3)*
- P42. Block a member (from profile or chat; they can no longer see or contact you). *(S2)*
- P43. Sanctions ladder: warning / suspension / ban; suspended-account screen; sanctions for false reports. *(S3, S12)*
- P44. Code of conduct with explicit banned behaviours (indecency, sexual talk, impersonation, multiple accounts, harassment, money requests/scams, hate, non-marriage use). *(S3)*
- P45. Family-involvement guidance in the rules. *(S3)*
- P46. Data protection: encryption in transit/at rest, hashed passwords, encrypted backups, data-subject rights, DPA, 72 h breach notice, retention schedule. *(S4, S7)*
- P47. Cookie consent (accept/manage). *(all pages)*
- P48. Support contact form with subject triage (incl. automatic filtering of misuse), plus FAQ. *(S8, S12)*

**Coach, content, growth**
- P49. AI marriage coach (24/7; profile help; ice breakers; free quota + unlimited on Premium). *(S1, S12, S15)*
- P50. Marriage education library ("Académie": hadith, fiqh of marriage incl. wali & mahr, spouses' rights, stories, advice). *(S14)*
- P51. Blog with categories (advice, practical, spirituality, testimonials). *(S11)*
- P52. Programmatic SEO landing pages by city / country / intent (incl. Ouagadougou & Burkina Faso). *(S10)*
- P53. Promo/explainer video on the landing page. *(S1)*
- P54. Testimonials carousel on the landing page. *(S1)*

**Monetisation**
- P55. Freemium: Free tier + Premium monthly subscription in FCFA, with launch pricing (Farata: 5 900 launch / 9 900 FCFA normal). *(S1)*
- P56. Premium perks bundle: unlimited requests/messages/coach, visitors & favourites, more/HD photos (Farata: 10), voice notes, online status, compatibility score, ranking, advanced filters, boosts, badge, priority support 7/7, priority validation. *(S1)*
- P57. Multi-month plans (1/3/6 months), no silent auto-renewal. *(S5)*
- P58. Payment rails: Orange Money, Wave, Free Money, MTN MoMo, Moov Money, Visa/Mastercard. *(S2, S5, S15)*
- P59. Published CGV with refund rules. *(S5)*

**Parity count: 59 items (P1–P59).**

---

## 7. (B) DIFFERENTIATORS — concrete improvements to beat Farata

> Each one comes from the system idea's must-haves and/or a gap from §5. **These must also be carried into the brief and PRD as explicit features.**

**Mahram / wali (must-have #4; gap 1)**
- D1. **Mahram-in-chat**: a sister can invite her mahram/wali (verified phone + identity) into any conversation as a **read-all participant**. He can flag messages, pause the chat, or end the chat. The brother sees clearly that a wali is present.
- D2. **Wali dashboard**: one wali can watch several of his wards' conversations, get digest notifications, and take a human-moderator role (his flags go to our moderation queue with priority).
- D3. **Chaperoned-meeting planner**: when both sides agree, propose a family meeting / *khitba* step with the wali in the loop (time, place, attendees), not an off-app DM.

**AI moderation on everything (must-have #2; gap 2)**
- D4. **Chat delivered, then scanned** (corrected 2026-10-01; was “every modality moderated before delivery”): text, **chat photos**, and **voice notes** are delivered immediately, then speech-to-text + audio classification (French, plus moderator word lists for Mooré/Dioula — Whisper has no mos/dyu). A flag goes to an admin, who chooses warning, suspend, or another action. The AI does not block, hold, or refuse delivery. Profile photos and bio stay publish-gated. Blur/reveal is photo privacy, not a moderation outcome.
- D5. **Scam and off-platform guardrails**: detect money requests, phone numbers/WhatsApp/links before mutual consent + wali presence; romance-scam pattern scoring.
- D6. **Honest, consistent moderation policy**: say exactly what is scanned, by whom, and how long it is kept (fixes Farata's homepage-vs-FAQ contradiction); a member-visible appeal flow.
- D7. **Report → strike → ban pipeline** with a moderator console, evidence snapshots, repeat-offender device/ID fingerprinting (ban evasion), and public periodic transparency stats.

**Photo privacy (must-have #3; gap 4)**
- D8. **Per-viewer reveal**: blur by default; the owner chooses reveal-on-match, **reveal-on-request** (approve per person), or never. **Revoke any time.**
- D9. **Anti-leak**: invisible watermark per viewer, screenshot deterrence/notice on mobile, no downloads, and blurred thumbnails in notifications.
- D10. **Never use member profiles in marketing** without explicit, per-use opt-in (the opposite of Farata rules §07).

**Marriage success (must-have #5; gap 3)**
- D11. **"We got married" joint report**: both members confirm, with optional nikah proof (certificate or imam/wali attestation) kept private; both accounts close or go into "married" state together.
- D12. **Verified success-story showcase** (consent-based, faces optional/blurred, city, date) + a public **verified-marriages counter**. This becomes the headline trust metric instead of inflated member counts.

**Security & verification (must-have #6; gaps 6, 7, 8, 10)**
- D13. **Verification is free for everyone** (ID document + liveness selfie + phone OTP) and **separate from Premium**. Profiles show verification levels (phone / ID / wali-verified); safety is never paywalled.
- D14. **Declared marital status honesty** for brothers (single / married, polygamy intent disclosed), with checks and reporting for misrepresentation.
- D15. **Deletion that works**: instant self-serve delete + export, with a status page, and support through a real ticketing system (not Gmail).
- D16. **Transparent, consistent pricing** on one page; no dark patterns; clear monthly vs multi-month terms.

**Local fit: Burkina Faso first (gap 9)**
- D17. **Burkina-first launch**: BF legal entity or partner, data-protection filing with the **CIL (Burkina)**, local payments (**Orange Money BF, Moov Africa BF, Coris Money / Wave where available**) and XOF pricing tuned to BF purchasing power.
- D18. **Languages**: French first, plus **Mooré and Dioula voice/audio onboarding and prompts**, Arabic, and English for the diaspora. Farata is French-only.
- D19. **Low-bandwidth "lite" mode** (data saver, deferred images, offline drafts) for 2G/3G and cheap Androids.

**Fairness & dignity**
- D20. **Sisters can start conversations for free** (and wali features are always free); monetise brothers' convenience features, not safety or dignity.
- D21. **Grounded coach**: an AI marriage coach with **scholar-reviewed sources** that says clearly it is not a mufti; defer fatwa questions to real scholars; one consistent persona.
- D22. **Working, verified Académie** (public, SEO-indexable, reviewed by local imams; Burkina/Sahel context, not only Senegal).
- D23. **Trust by proof**: publish real metrics (verified members, verified marriages, moderation stats); an independent imam/advisory board shown on site.

**Differentiator count: 23 items (D1–D23).**

---

## 8. How this feeds the pipeline

- **Brainstorm (this phase):** first input. SCAMPER is run on the parity list; risk-first / reverse brainstorm on gaps 2, 4, 5, 6.
- **Product brief and PRD (next phases):** must list **P1–P59 as parity requirements** and **D1–D23 as differentiators**, each traceable to this doc. Nothing here may be dropped silently; anything deferred must be marked as deferred with a reason.
