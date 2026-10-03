- source_spec: `/root/.paperclip/instances/default/projects/d6b20faa-c189-4b92-9379-82950394e45d/dc174d97-ed7b-40c5-89c8-f65605d33c3a/muslim-marriage-africa/_bmad-output/implementation-artifacts/spec-1-1-shared-kernel-and-port-types.md`
  summary: Ouagadougou display may keep the previous civil day if Intl reports hour 24.
  evidence: maybe-false, would be medium if true. A 48-hour scan on Node 24.5 ICU emitted hour 00 for Africa/Ouagadougou, so the rewrite branch was not observed. An ICU that emits hour 24 for that zone would prove the civil day is wrong.
