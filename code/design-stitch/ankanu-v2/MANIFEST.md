# AnKanu v2 Stitch download map

- Project name: **AnKanu v2**
- Project: https://stitch.withgoogle.com/project/6717808880062298165
- Design system: `DESIGN.md` (tokens only; layout is each PNG)
- Old Stitch project on Google was **not** deleted.
- Refresh: founder-edited project re-downloaded 2026-10-11 (replaces [`23a7151`](https://github.com/usfaa444/muslim-marriage-africa/commit/23a7151)).

## Completeness proof

- Command: `stitch-mcp tool list_screens -d '{"projectId":"6717808880062298165"}'`; HTTP GET htmlCode.downloadUrl; screenshot.downloadUrl with FIFE suffix `=s2048-rp`; python PNG signature `\x89PNG` and HTML size > 0; compare API ids to MANIFEST and folders; no folder whose id is absent from the live list
- API count: **56**
- Downloaded count: **56**
- HTML count: **56**
- PNG count: **56**
- Missing: **0**
- Stale extras (folder/id not in live `list_screens`): **0**

Zero missing and zero stale extras is the only pass. Verified 2026-10-11 against a fresh `list_screens` for project `6717808880062298165`.

Note: `55-pwa-manifest` is a JSON asset. Stitch returned no screenshot URL. The PNG is a raster of the downloaded `manifest.json` bytes (cream/navy tokens). Do not treat it as a Stitch canvas.

## Screens

| # | v2 screen name | Stitch id | HTML path | PNG path | Inventory screen |
|---|----------------|-----------|-----------|----------|------------------|
| 01 | AnKanu - Splash | `9ce1c9cb22694148b6303159788ea78d` | `01-splash/screen.html` | `01-splash/screen.png` | Splash |
| 02 | AnKanu - Authentification & Inscription | `b0d154fbf34841019922364a93a6cd38` | `02-auth/screen.html` | `02-auth/screen.png` | Auth (signup / login) |
| 03 | AnKanu - Identification & Date de naissance | `a859df6349c04f37b8c81d06930adbf5` | `03-age-gate/screen.html` | `03-age-gate/screen.png` | Age gate |
| 04 | AnKanu - Vérification d'email | `ace7d63577264df6bf9505f886f50403` | `04-email-verification/screen.html` | `04-email-verification/screen.png` | Email verification |
| 05 | AnKanu - Réinitialisation de mot de passe | `33ea1516f99d43c3812d64533e006ee3` | `05-password-reset/screen.html` | `05-password-reset/screen.png` | Password reset |
| 06 | AnKanu - Vérification Téléphone & OTP | `305e77fba8a54bd8b98b870e23970dfa` | `06-otp/screen.html` | `06-otp/screen.png` | OTP |
| 07 | AnKanu - Vérification d'identité & Preuve de vie | `ee172cfb20fa492aa8be5518ddd0f103` | `07-id-liveness/screen.html` | `07-id-liveness/screen.png` | ID + liveness |
| 08 | AnKanu - Onboarding | `ac4404f16560404baecc2ef8a5f9232b` | `08-onboarding/screen.html` | `08-onboarding/screen.png` | Onboarding |
| 09 | AnKanu - Règles relatives aux photographies | `e165912a668d4ab1aaa6f91c86d1c4f5` | `09-photo-rules/screen.html` | `09-photo-rules/screen.png` | Photo rules |
| 10 | AnKanu - Verrouillage PIN | `916e55997d0c42df8f59ba940bff3e53` | `10-pin-lock/screen.html` | `10-pin-lock/screen.png` | PIN lock |
| 11 | AnKanu - Édition du profil | `00b3c545d70c406491fd2ae959c17978` | `11-profile-edit/screen.html` | `11-profile-edit/screen.png` | Profile edit |
| 12 | AnKanu - Profil en revue (Non public) | `a39a94de24584b319c3e04ae2cc1a01a` | `12-profile-not-yet-public/screen.html` | `12-profile-not-yet-public/screen.png` | Profile not-yet-public |
| 13 | AnKanu - Recherche | `f40af8571a314fdcb351dbf971380715` | `13-search/screen.html` | `13-search/screen.png` | Search |
| 14 | AnKanu - Filtres | `c1993d0010384d419133db9cf8a99e7e` | `14-filters/screen.html` | `14-filters/screen.png` | Filters |
| 15 | AnKanu - Profil détaillé | `6e0fc9ebb2e14daf90cd53b0b09f4a4c` | `15-profile-detail/screen.html` | `15-profile-detail/screen.png` | Profile detail |
| 16 | AnKanu - Révélation & Révocation de photo | `b3811f89e6d5489593515a49c17032ed` | `16-blur-reveal-revoke/screen.html` | `16-blur-reveal-revoke/screen.png` | Blur / Reveal / Revoke |
| 17 | AnKanu - Favoris | `e36c2c6ab73346b78ef29931a890ed0e` | `17-favourites/screen.html` | `17-favourites/screen.png` | Favourites |
| 18 | AnKanu - Envoi d'invitation & Message Flash | `3af8fe91692841b7aa52601ba70da7fd` | `18-invite-compose-flash/screen.html` | `18-invite-compose-flash/screen.png` | Invite compose + Message Flash |
| 19 | AnKanu - Invitations | `b3ad9e6aa70d4b519ba680ddd772eb20` | `19-invite-inbox/screen.html` | `19-invite-inbox/screen.png` | Invite inbox |
| 20 | AnKanu - Discussions | `e744e2bfef5f4dc5ab42de919a6e7280` | `20-discussions-list/screen.html` | `20-discussions-list/screen.png` | Discussions list |
| 21 | AnKanu - Fil de Discussion Ta'aruf | `ebbd10283c4a4ef48794e53f8226cdb4` | `21-chat-thread/screen.html` | `21-chat-thread/screen.png` | Chat thread |
| 22 | AnKanu - Échange de coordonnées & Consentement | `9b92efa9f55d47fcb0a9bb87f514300c` | `22-contact-share-interstitial/screen.html` | `22-contact-share-interstitial/screen.png` | Contact-share interstitial |
| 23 | AnKanu - Signaler et Bloquer | `f8ceb1ee8c144a1ab3dcb9c6193f136a` | `23-report-block/screen.html` | `23-report-block/screen.png` | Report / Block |
| 24 | AnKanu - Confirmation mutuelle de mariage (Nikah) | `c6d6139b1a074db48bcab1b0e6a7bf33` | `24-marriage-dual-confirm/screen.html` | `24-marriage-dual-confirm/screen.png` | Marriage dual-confirm |
| 25 | AnKanu - Packs & Formules Ta'aruf (Gratuit & Premium) | `a7f3cf998a464ac0a61bc317b45c4561` | `25-payment-pack/screen.html` | `25-payment-pack/screen.png` | Payment pack |
| 26 | AnKanu - Notifications | `e905fc48c5db4aabbb17e9c176eaa54b` | `26-notifications/screen.html` | `26-notifications/screen.png` | Notifications |
| 27 | AnKanu - Paramètres | `5f2172f264e0466e9199fed0ddf64b07` | `27-settings/screen.html` | `27-settings/screen.png` | Settings |
| 28 | AnKanu - Statut de suppression et d'export | `84e11a301d384f258ebd661e22bcceb6` | `28-delete-export-status/screen.html` | `28-delete-export-status/screen.png` | Delete / export status |
| 29 | AnKanu - Recours & Réexamen de sanction | `1da2e7afafb744888e89803180f89f59` | `29-appeal/screen.html` | `29-appeal/screen.png` | Appeal |
| 30 | AnKanu - Guidance familiale & Rôle du Tuteur | `366151f75c4543fbb093c9d7e53231bd` | `30-family-guidance/screen.html` | `30-family-guidance/screen.png` | Family guidance |
| 31 | AnKanu - Compte suspendu & Voie de recours | `5bf027d5c8c8464d89b72bade53880b7` | `31-suspended-account/screen.html` | `31-suspended-account/screen.png` | Suspended-account screen *(PRD-named, IA omitted)* |
| 32 | AnKanu - Invitation du Tuteur (Mahram) | `b77d70d6e8714145b1b2cec1cc7766e9` | `32-mahram-invite/screen.html` | `32-mahram-invite/screen.png` | Mahram invite (Sister) |
| 33 | AnKanu - Accès Tuteur (Mahram) : OTP & Lien de parenté | `bb81f693c6c945dca1e25ddfd1e50603` | `33-mahram-otp-relationship/screen.html` | `33-mahram-otp-relationship/screen.png` | Mahram OTP + relationship |
| 34 | AnKanu - Confirmation du Tuteur (Mahram) | `b9790671c6db4351973a5b4382be8059` | `34-sister-confirm-mahram/screen.html` | `34-sister-confirm-mahram/screen.png` | Sister confirm Mahram |
| 35 | AnKanu - Accès accordés au Tuteur (Mahram) | `2a941f4597734d648d3f7daf5fa9cf5a` | `35-mahram-grant-list/screen.html` | `35-mahram-grant-list/screen.png` | Mahram grant list |
| 36 | AnKanu - Espace Tuteur (Discussions suivies) | `2ae2cd92e5504933a01ea74996aa0c63` | `36-mahram-thread-list/screen.html` | `36-mahram-thread-list/screen.png` | Mahram thread list |
| 37 | AnKanu - Consultation Tuteur (Fil en lecture seule) | `4f5dd73aed3647468a587a2767ffb4ef` | `37-mahram-readonly-thread/screen.html` | `37-mahram-readonly-thread/screen.png` | Mahram read-only thread |
| 38 | AnKanu - Mesures tutélaires (Pause, Fin, Signalement) | `0eadff48eb1e43139c60a1d7c8455256` | `38-mahram-pause-end-flag/screen.html` | `38-mahram-pause-end-flag/screen.png` | Mahram pause / end / flag |
| 39 | AnKanu - Vérification d'identité Tuteur (Wali vérifié) | `6bbd7cf092df4e06b9bd786c805983c6` | `39-verified-mahram-id/screen.html` | `39-verified-mahram-id/screen.png` | Verified-Mahram ID (optional) |
| 40 | AnKanu - Révocation & Signalement du Tuteur | `4c57844d09914d9ab7df2c975bd1a667` | `40-remove-report-mahram/screen.html` | `40-remove-report-mahram/screen.png` | Remove / Report Mahram |
| 41 | AnKanu - File de Modération & Signalements (Staff) | `095acc81678a4e0ba48071c56ab8438e` | `41-admin-flag-queue/screen.html` | `41-admin-flag-queue/screen.png` | Admin flag queue |
| 42 | AnKanu - Instruction de dossier (Staff) | `1c2b412723e44f3687a8d99efb3dc646` | `42-case-file/screen.html` | `42-case-file/screen.png` | Case file |
| 43 | AnKanu - Sanction déontologique (Staff) | `59f12addb9504ba991d02cb0ca8e9556` | `43-sanction/screen.html` | `43-sanction/screen.png` | Sanction |
| 44 | AnKanu - Réexamen de recours (Staff) | `ede195534136410d8e6ff0bf4d060cc8` | `44-appeal-review/screen.html` | `44-appeal-review/screen.png` | Appeal review |
| 45 | AnKanu - Seuils & Politiques Opérateur (Staff) | `365ac3a00ddd493babfea4e388f490ea` | `45-operator-policy/screen.html` | `45-operator-policy/screen.png` | Operator policy / thresholds |
| 46 | AnKanu - Tarification & Packs Opérateur (Staff) | `89a27e641a534aac8056807204501e46` | `46-operator-pricing/screen.html` | `46-operator-pricing/screen.png` | Operator pricing |
| 47 | AnKanu - Accès Sœurs & Plafonds Opérateur (Staff) | `59e9958e8b1041c68f428c2f900e1633` | `47-operator-sister-reach/screen.html` | `47-operator-sister-reach/screen.png` | Operator sister-reach mode |
| 48 | AnKanu - Plafond Journalier de Messages & Accès Sœurs (Staff) | `46021cb225104767b72a9c56e4ed012b` | `48-operator-message-cap/screen.html` | `48-operator-message-cap/screen.png` | Operator daily message cap |
| 49 | AnKanu - Métriques Opérateur (Staff) | `c143ef4636044f509dc2d307b65437ca` | `49-operator-metrics/screen.html` | `49-operator-metrics/screen.png` | Operator metrics |
| 50 | AnKanu - File des Requêtes CIL & Effacement (Staff) | `a7c0d7374f3d407396edb4e90149a74d` | `50-operator-cil-tickets/screen.html` | `50-operator-cil-tickets/screen.png` | Operator CIL / deletion tickets |
| 51 | AnKanu - Académie & Publications Éthiques (Staff) | `e3ecb4ac01da4061bbd31e0643dc9548` | `51-operator-board-academie/screen.html` | `51-operator-board-academie/screen.png` | Operator Board / Académie publish |
| 52 | AnKanu - Signaux de visite T&S & Modération (Staff) | `44fc9a9f8432478fb034f7576da37bd8` | `52-ts-visit-signals/screen.html` | `52-ts-visit-signals/screen.png` | T&S visit signals |
| 53 | AnKanu - Barre de navigation | `83017ec45eb44fc6b7f70657afbe823e` | `53-barre-de-navigation/screen.html` | `53-barre-de-navigation/screen.png` | — (extra / not in inventory numbering; member-shell bottom nav chrome) |
| 54 | AnKanu - Pseudonyme & Date de naissance | `fd15ec6c6d854ee79cb1be8e5e910bc5` | `54-pseudonym-dob/screen.html` | `54-pseudonym-dob/screen.png` | — (extra / not in inventory numbering) |
| 55 | manifest.json (AnKanu PWA) | `2259e9895a48410b82b4fd63a8dcab94` | `55-pwa-manifest/screen.html` | `55-pwa-manifest/screen.png` | — (extra / not in inventory numbering) |
| 56 | AnKanu - Vérification Téléphone (OTP) | `9d8deea75c154a04bf26e4eb8938cec7` | `56-otp-alt/screen.html` | `56-otp-alt/screen.png` | — (extra / not in inventory numbering) |

## v2 coverage gaps

Information only. Do not invent designs.

- Public landing
- Legal hub
- Public pricing
- Académie list + article
- Advisory Board
- FAQ + contact
- Showcase
- Cookie consent
- SEO pages — Ouagadougou, Bobo-Dioulasso, Burkina Faso
- Discover
- Sister invite quota wall
- Message quota wall
- Consent story
- Mahram revoke one thread
- Gaps G1–G25 (unnamed chrome — not invented)

Public landing and other public IA screens were skipped in the v2 generation on founder order. Inventory gaps G1–G25 stay unnamed.
