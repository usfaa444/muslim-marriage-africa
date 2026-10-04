- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-1-shared-kernel-and-port-types.md`
  summary: Ouagadougou display may keep the previous civil day if Intl reports hour 24.
  evidence: maybe-false, would be medium if true. A 48-hour scan on Node 24.5 ICU emitted hour 00 for Africa/Ouagadougou, so the rewrite branch was not observed. An ICU that emits hour 24 for that zone would prove the civil day is wrong.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-7-dockerfiles-and-local-compose.md`
  summary: Unquoted database or Redis password assignments in non-image text still pass the secrets scan.
  evidence: The quoted-secret pattern predates this story and still applies to ordinary source files. Image files now reject unquoted literals. A non-image file with an unquoted password assignment would prove the remaining hole.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-4-web-shell-tokens-and-three-role-chrome.md`
  summary: Unit tests do not prove the browser applied globals.css.
  evidence: The layout imports the sheet and `next build` emits the token hexes. A unit render cannot show the sheet is applied. A browser computed-style check would settle it.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-8-one-self-managed-compose-environment.md`
  summary: The splash link Hébergement Souverain still points at #securite, which is not on that page.
  evidence: The link is Story 1.4 chrome and does not name a host. Story 1.8 does not invent a section or a replacement label. Opening the splash and clicking that link shows no matching id.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-8-one-self-managed-compose-environment.md`
  summary: The landing footer still shows Mentions Légales & Registre CIL and Politique de Pudeur & RGPD.
  evidence: Those links are Story 1.4 and point at #legal. Story 1.8 does not add a CIL-compliant sentence and does not rewrite that footer. Story 11.4 owns the legal hub.
