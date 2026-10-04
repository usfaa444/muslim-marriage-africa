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

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/create-account.test.ts apps/web/src/auth-page.test.ts apps/api/src/api.test.ts
npx vitest run --config vitest.integration.config.ts apps/api/src/operator-config.migrate.test.ts
npm run typecheck
npm run lint
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
| Password | shorter than 12, longer than 128, or only spaces | 400. `details.field` is `password`. A 12-character Unicode password with spaces inside is accepted. No required digit, symbol, or mixed case. |
| Screen | `GET /auth` | Stitch signup markup, including captcha, “Continuer via Google”, and the 19+ notice. The post body sends `coc_version` `FR-089` and does not send the captcha checkbox. No Google URL. No date of birth. |

## Test data

- email `fatim@example.bf`, pseudonym `Fatim_Ouaga`, gender `sister`, password `phrase avec espaces`, pledge `true`, `coc_version` `FR-089`
- Conflict checks reuse that email in other casing and that pseudonym
- Postgres 17 throwaway database for the migration test only

## My results

- `create-account.test.ts`, `auth-page.test.ts`, and `api.test.ts`: passed
- `operator-config.migrate.test.ts`: 4 passed. Empty Postgres 17 ends with `account`, `credential`, and `operator_config`
- `npm run typecheck` passed
- `npm run lint` passed
- `drizzle-kit check` passed

## Three validation passes

1. HTTP: create, skipped pledge, missing `coc_version`, email conflict, pseudonym conflict, and the published password bounds.
2. Migration: `coc_version` text not null and `age_attested` boolean not null are in `0001_account_credential.sql`. The SQL does not create `profile`. Migrate on empty Postgres 17 applies two migrations.
3. Static: `npm run typecheck` and `npm run lint`. The auth page test checks the stitch strings and that the added script does not post the captcha checkbox.

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
