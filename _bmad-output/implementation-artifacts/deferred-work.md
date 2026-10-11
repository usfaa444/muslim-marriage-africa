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
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-9-ci-observability-and-restore-drills.md`
  summary: Postgres data, WAL archive, and base backups are bind mounts on the same disk.
  evidence: `code/pg-data`, `code/pg-wal`, and `code/pg-base` live under the repo directory. A disk failure removes the cluster and both restore sources. This story does not name a second disk.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-9-ci-observability-and-restore-drills.md`
  summary: WAL segments and old base backups are not pruned.
  evidence: The daily script keeps one `latest` backup and does not delete archived WAL. Disk use grows for the life of the environment. No retention window was named, and deleting WAL can make that backup unrestorable.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-2-3-verify-email.md`
  summary: The web image copy of the email screen is not asserted by a test that reads the image.
  evidence: `code/apps/web/Dockerfile` still copies the old relative path `design-stitch/13-email-verification/screen.html` (founder handles the app diff). The design file is now `code/design-stitch/ankanu-v2/04-email-verification/screen.html`. The page test reads the repo file. Deleting that COPY would still leave the unit test green. An image build would show the missing file.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-2-3-verify-email.md`
  summary: `MAIL FROM` and the `From` header are the member address, so a relay that checks SPF may refuse the message.
  evidence: maybe-false, would be medium if true. No from-address was named. A relay that rejects that envelope would prove the send cannot be delivered. A permissive relay accepts it.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-2-8-free-id-and-liveness-selfie.md`
  summary: The Postgres capture store is not executed by the unit suite.
  evidence: HTTP tests use the memory store. `postgresCaptureStore` inserts `verification_record` and sets `profile.visibility` to `held` only when the new row is `held`. A migrated database with the override cleared would prove the insert, the newest-row read, and that `phone_otp` rows do not count toward the upload cap.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-ank-70-landing-link-signup-and-login.md`
  summary: The landing click test does not load Tailwind, so it does not prove the header stack or the cookie clearance.
  evidence: `landing-auth-links.test.ts` serves the rendered markup with no stylesheet and calls `element.click()`. A 390px hit-test against `next dev` with the cookie dialog open would prove the login link is not covered and the header row does not scroll sideways.
- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-ank-74-otp-grant-visual-and-cap.md`
  summary: Older OTP handoffs still describe the Wali success label and the 840192 fill.
  evidence: `code/docs/qa-handoffs/epic-2-signup-otp-wire-qa-handoff.md` and `epic-2-2.7-qa-handoff.md` record the earlier success paint. ANK-74 replaces that result. Those files were left as the record of the stories that shipped it.
