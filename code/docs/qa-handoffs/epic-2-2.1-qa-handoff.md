# Epic 2 Story 2.1 QA handoff

## What was built

`POST /v1/accounts` creates an `account` and a password `credential`. Gender is `sister` or `brother`. `roles` is `member`. `status` is `Active`. `age_attested` is `false`. `coc_version` stores the submitted Code of conduct version. The password is stored only as an argon2id hash on `credential.secret_hash`. No profile row is created. A skipped pledge or a missing conduct version creates nothing. A taken email or pseudonym creates nothing and names that field.

`GET /auth` serves `code/design-stitch/11-auth/screen.html`. Captcha, Google, and the 19+ notice stay on the screen and do not call Stories 2.2, 2.5, or 2.6. The form posts `/v1/accounts`. The web app rewrites `/v1/*` to `http://api:3000`.

## Where

- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/create-account.ts`
- `code/apps/api/src/account-store.ts`
- `code/apps/api/src/password-hash.ts`
- `code/apps/api/src/accounts.controller.ts`
- `code/apps/api/src/create-account.test.ts`
- `code/apps/api/drizzle/0001_account_credential.sql`
- `code/apps/web/src/auth-page.ts`
- `code/apps/web/app/auth/route.ts`
- `code/apps/web/src/auth-page.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/src/compose.test.ts`
- `code/.dockerignore`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/create-account.test.ts apps/web/src/auth-page.test.ts apps/api/src/api.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
npx next build
npm run typecheck
npm run lint
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/compose.test.ts -t "makes web, api"
```

The migrate test starts a throwaway Postgres 17 container and removes it. Auth HTML is `GET /auth` on the web app. Signup posts `/v1/accounts` on the API.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Create | Unused email and pseudonym, gender `sister` or `brother`, pledge accepted, `coc_version` non-blank, password 12–128 characters and not only spaces | 201. Account `status` `Active`, `age_attested` false, `roles` `["member"]`, `coc_version` stored. Credential `kind` `password`, `secret_hash` starts with `$argon2id$`, plaintext absent. No profile row. |
| Skip pledge | `pledge_accepted` not `true` | 400. `details.field` is `pledge`. No account. |
| Missing version | blank `coc_version` | 400. `details.field` is `coc_version`. No account. |
| Taken email | same email, other casing counts as the same email | 409. Message and `details.field` name `email`. No second account. |
| Taken pseudonym | same pseudonym | 409. Message and `details.field` name `pseudonym`. No second account. |
| Password | 11 characters, 129 characters, or 12 spaces | 400. `details.field` is `password`. No account row and no credential row. |
| Gender | `brother` | 201. Stored gender is `brother`. |
| Gender | any value other than `sister` or `brother` | 400. `details.field` is `gender`. No new row. |
| Screen | `GET /auth` | Stitch signup markup, including captcha, “Continuer via Google”, and the 19+ notice. The added script defines `validateSubmissionState`, checks `length >= 12`, and maps `frere` to `brother`. The post body sends `coc_version` `FR-089`. No Google URL. No date of birth. |
| Double submit | click submit while the request is in flight | The submit button stays disabled until the request settles. A rejected `fetch` writes a failure line in `#signup-result`. |
| Postgres insert | `POST /v1/accounts` through `getAccountStore()` on migrated Postgres 17, then the same email again | First response 201 and one `account` row. Second response 409 with `details.field` `email` and still one row. |
| Compose | from the api container, `GET http://web:3000/auth` and `GET http://web:3000/v1/health` | Auth returns the stitch HTML plus `function validateSubmissionState`. Health is ok with role `api`. |

## Test data

- email `fatim@example.bf`, pseudonym `Fatim_Ouaga`, gender `sister`, password `phrase avec espaces`, pledge `true`, `coc_version` `FR-089`
- Conflict checks reuse that email in other casing and that pseudonym
- Postgres 17 throwaway database for the migration test only

## My results

QA fail on this ticket, then:

- `create-account.test.ts`, `auth-page.test.ts`, and `api.test.ts`: 11 passed
- `operator-config.migrate.test.ts`: 5 passed. The fifth inserts through the Postgres store and the duplicate email is 409
- `npx next build` in `code/apps/web` succeeded. `GET /auth` on that build returned the stitch HTML and the signup script
- `compose.test.ts -t "makes web, api"`: 1 passed, 9 skipped. `http://web:3000/auth` and `http://web:3000/v1/health` both succeeded inside the stack
- `npm run typecheck` passed
- `npm run lint` passed

## Three validation passes

1. HTTP: create, skipped pledge, missing `coc_version`, email conflict, pseudonym conflict, the three rejected passwords, `brother`, and a rejected gender. `GET /auth` on the production build returns the stitch page.
2. Migration: `coc_version` text not null and `age_attested` boolean not null are in `0001_account_credential.sql`. The SQL does not create `profile`. Migrate on empty Postgres 17 applies two migrations, then one insert and one duplicate email.
3. Static and image: `npm run typecheck`, `npm run lint`, and `npx next build`. The web image includes `design-stitch/11-auth/screen.html`. Compose fetches auth and health through `web:3000`.

## Solution-design sections

- `account`: `id`, `email`, `pseudonym`, `gender`, `roles`, `status`, `age_attested`, plus founder field `coc_version` text not null
- `credential`: `id`, `account_id`, `kind`, `secret_hash`, `provider_subject`, `email_verified_at`
- `POST /v1/accounts` on the identity API
- Founder sentences on this ticket: `age_attested` false on create; `status` `Active`; no profile row; password 12–128 Unicode characters, reject only spaces, argon2id; captcha, Google, and the 19+ notice are visual only

## Stitch files

- `code/design-stitch/11-auth/screen.html`
- `code/design-stitch/11-auth/screen.png`

## Known gaps

- The stitch password box still reads “Minimum 10 caractères”, “1 chiffre requis”, “1 lettre majuscule”, and “1 symbole déontologique”. The server and the submit button use the founder rules, not those four lines.
- The page sends `coc_version` `FR-089` because that token is the charter mark printed on the pledge checkbox. The founder named the column and said a version must be submitted. The founder did not name a different token.
- Splash “Continuer” stays `href="#prochaine-etape"` because Story 1.4 locked that href. Auth is `GET /auth`.
- No session cookie, no captcha check, no Google call, no date of birth, and no navigation to `12-age-gate`.
- The downloaded auth footer still contains the Scaleway Paris sentence. This story serves that file.
- I did not pixel-diff `screen.png` in a browser. The initial document is the stitch HTML plus a script before `</body>`.
- This commit stays local until QA passes. Do not treat it as pushed.
