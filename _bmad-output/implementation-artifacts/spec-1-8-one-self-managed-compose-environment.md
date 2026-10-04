---
title: 'Story 1.8 — One self-managed compose environment'
type: 'feature'
created: '2026-10-04'
status: 'done'
baseline_commit: '5f720b0a840a2330e7ab3adbdfda7a8e22c5a8f1'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 1.7 already runs one compose stack, but the public landing still prints a France / Scaleway / Île-de-France hosting line, and nothing locks the repo against Kapsule, OpenTofu, `infra/` env modules, or a second `dev | staging | prod` stack.

**Approach:** Keep `code/compose.yaml` as the only environment. Add a file scan that fails if those extras appear. Delete the existing public location sentences and do not write a replacement, a privacy route, or a Legal hub.

</frozen-after-approval>

## Implementation Notes

- No privacy path is named in the story, so none was added. The public landing already printed a France / Scaleway / Île-de-France line; that clause was deleted and the existing copyright sentence was left in place.
- Splash `Serveurs Régionaux Chiffrés` was deleted and not replaced. The Story 1.4 link label `Hébergement Souverain` does not name a host, so it stayed.
- `code/compose.yaml` was not edited. The new test locks the six services, project name `ankanu`, and the absence of a second env stack.
- `S3_REGION` default `fr-par` is Story 1.6 and is not rendered. It was not changed.
- Vitest: 2 files, 7 tests passed. `tsc -p tsconfig.tests.json` passed. oxlint on the touched files passed.
- Review patch: `profiles` is rejected at any indent; `dev` / `staging` / `prod` are rejected in `compose.yaml`; the file walk covers the repo outside `_bmad` and catches `.tofu` and `.tf.json`; Kapsule and OpenTofu matches are case-insensitive. The landing render asserts the existing copyright sentence is still present.

## Review Triage Log

- medium — Service `profiles` at four spaces would have passed. Patched: any indent.
- medium — The lock missed `.tofu`, `.tf.json`, `tofu/` and `terraform/` directories, other letter cases, a compose file outside `code/`, and the words `dev` and `prod`. Patched. Helm and Kubernetes manifests are not named in the acceptance criteria.
- medium — Public checks missed `Paris` and `fr-par`. Patched in the source scan and the rendered landing and splash. The bare word France stays allowed. `Hébergement Souverain` does not name a place.
- defer — `Hébergement Souverain` still points at `#securite`, which is not on the splash page. That link is Story 1.4. This story does not invent a target or a new label.
- defer — Landing still links `Mentions Légales & Registre CIL` and `Politique de Pudeur & RGPD`. Those lines are Story 1.4. This story does not add a CIL-compliant claim and does not rewrite that footer. The handoff no longer says CIL is absent from the page.
- medium — The landing test did not require the copyright sentence to remain. Patched. Splash `© 2025` is the Story 1.4 line and was left as written.
- false — The epic-context `AuthContext` line says `gender` is required on member sessions. That matches the architecture rule. Kernel still types `gender` as optional off a member session. This story does not change auth.
- false — Seed integers, `sister_reach_mode`, and the Next.js pin note are the compiled epic summary, not this story's code. No newer Next pin is named.
- false — `fr-par` remains the Story 1.6 adapter default and is not rendered. Trust auth and env-based bucket credentials are Story 1.7. This story does not add a secrets manager or a new region.
- false — `SCREEN-INVENTORY.md` still describes the old hosting sentence. The story says that line is stale and must not be used as copy. It was not edited.
- false — The cookie button height is the Story 1.4 control. This story does not restyle it.
