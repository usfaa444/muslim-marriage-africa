# Epic 1 Story 1.8 QA handoff

## What was built

`code/compose.yaml` stays the one self-managed environment: project `ankanu`, services `web`, `api`, `worker`, `postgres`, `redis`, and `bucket`. No second compose file, no `profiles`, no `infra/` env module, no OpenTofu, and no Kapsule.

The public landing no longer prints `Hébergé en infrastructure souveraine en France (Scaleway / Île-de-France).` The copyright line that was already there remains: `© 2026 AnKanu. Tous droits réservés.` The splash no longer prints `Serveurs Régionaux Chiffrés`. No replacement location sentence was added. No privacy route was added. A3 was not rewritten.

## Where

- `code/compose.yaml` (unchanged Story 1.7 stack, now locked by the test)
- `code/apps/web/src/landing.tsx`
- `code/apps/web/src/splash.tsx`
- `code/apps/web/src/shell.test.tsx`
- `code/apps/api/src/self-managed-environment.test.ts`

## How to run

From `code/`. Docker is not required.

```bash
npx vitest run --fileParallelism false apps/api/src/self-managed-environment.test.ts apps/web/src/shell.test.tsx
npx tsc -p tsconfig.tests.json --pretty false
npx oxlint apps/api/src/self-managed-environment.test.ts apps/web/src/shell.test.tsx apps/web/src/landing.tsx apps/web/src/splash.tsx
```

Do not start, stop, or prune any compose project for this story. Do not deploy.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| One stack | Read `code/compose.yaml` | `name: ankanu`. Services are exactly `web`, `api`, `worker`, `postgres`, `redis`, `bucket`. No `profiles` key at any indent. No `dev`, `staging`, or `prod` word. The file does not contain the forbidden hosting sentence, Scaleway, Île-de-France, Paris, `fr-par`, Kapsule, or OpenTofu. |
| No isolated envs | Walk the repo except `.git`, `node_modules`, `dist`, `.next`, `design-stitch`, `_bmad`, and `_bmad-output` | The only compose file is `code/compose.yaml`. No `infra/`, `kapsule`, `opentofu`, `tofu`, or `terraform` path. No `.tf`, `.tfvars`, `.tofu`, or `.tf.json` file. No `compose.dev`, `compose.staging`, `compose.prod`, or matching `docker-compose.*` file. Application source under `code/apps`, `code/packages`, and `code/modules` does not contain Kapsule or OpenTofu in any letter case. |
| Public landing | Render `LandingPage` | HTML contains `© 2026 AnKanu. Tous droits réservés.` It does not contain `Scaleway`, `Île-de-France`, `Ile-de-France`, `Paris`, `fr-par`, `Données hébergées en région`, or `Hébergé en infrastructure souveraine en France`. |
| Public splash | Render `SplashPage` | HTML does not contain `Scaleway`, `Île-de-France`, `Paris`, `fr-par`, `Serveurs Régionaux Chiffrés`, or `Données hébergées en région`. |
| Public source | Read `apps/web/src` and `apps/web/app`, skipping tests | Those files do not contain the forbidden sentence, Scaleway, Île-de-France, Paris, or `fr-par`, in any letter case. |

## Test data

No accounts, secrets, or containers. The forbidden sentence checked for absence is `Données hébergées en région Île-de-France (France), prestataire Scaleway`.

## My results

`npx vitest run --fileParallelism false apps/api/src/self-managed-environment.test.ts apps/web/src/shell.test.tsx` — 2 files, 7 tests passed. `npx tsc -p tsconfig.tests.json --pretty false` passed. `npx oxlint` on the four touched source files passed with no findings.

## Three validation passes

1. Public render: landing and splash HTML omit the Scaleway / Île-de-France sentence, Paris, `fr-par`, and the splash regional-servers line. The landing copyright sentence that was already present stays. No new location sentence was added.
2. One environment: `compose.yaml` is project `ankanu` with the six Story 1.7 services, no `profiles` key at any indent, and it is the only compose file outside `_bmad` and `_bmad-output`. No `infra/`, `tofu/`, `terraform/`, OpenTofu, or Kapsule path is present.
3. Source and types: public web source (tests excluded) does not contain those location strings. Application source does not name Kapsule or OpenTofu. The test typecheck and oxlint on the touched files passed.

## Solution-design sections

- Entity catalog: no table.
- AD-5: one self-managed environment. The public shell does not print `Données hébergées en région Île-de-France (France), prestataire Scaleway` and does not print a replacement location. A3 was not rewritten.
- AD-6: the Story 1.7 compose stack stays the runtime. No Kubernetes and no Kapsule. Secrets stay out of images.
- AD-20: no isolated `dev | staging | prod`, no OpenTofu, and no `infra/` modules. CI, OpenTelemetry, and PITR stay Story 1.9.
- AD-22: A3 stays open. No host country was written into copy.
- §5.2 / §5.3: host and region stay unnamed.
- §7: no new route. No privacy path was named in the story.
- §14: not followed where it asks for isolated environments or a Paris region. This story does not deploy.

## Stitch files

Do not pixel-match these hosting blocks. They name Scaleway, Paris, or Île-de-France, and this story forbids that sentence and any invented replacement.

- `code/design-stitch/02-legal-hub/screen.html`
- `code/design-stitch/02-legal-hub/screen.png`

Strings that must not appear in the built UI:

- `Données hébergées en région Île-de-France (France), prestataire Scaleway`
- `Prestataire d'Hébergement Souverain : Scaleway S.A.S. (Groupe Iliad)`
- `Localisation des Datacenters : Paris / Île-de-France (Datacenters DC2 & DC4 - Souterrains certifiés)`
- `Hébergé en infrastructure souveraine en France (Scaleway / Île-de-France).`
- `Serveurs Régionaux Chiffrés`

`code/design-stitch/tokens/DESIGN.md` is tokens only. Matching its tone or colors is a fail. `code/design-stitch/SCREEN-INVENTORY.md` still says the old hosting sentence ships. That line was not used as copy.

## Known gaps

- No privacy, Mentions, CGV, cookies, or FAQ route was added. Story 11.4 owns that hub. The Story 1.4 landing still has the cookie bar and footer links to `#legal`, `#faq`. Those links do not name a host.
- The splash footer still has the Story 1.4 link label `Hébergement Souverain`. It does not name a host, a city, or a provider. No replacement label was invented.
- `S3_REGION` still defaults to `fr-par` in the Story 1.6 adapter when the env var is unset. That value is not rendered on the public shell. This story does not rename it and does not publish it.
- A3 is unchanged. This story did not add a sentence that says the product is CIL-compliant. The Story 1.4 landing footer still links `Mentions Légales & Registre CIL` and `Politique de Pudeur & RGPD` to `#legal`. No host is named.
- This story does not deploy and does not push until QA passes.
