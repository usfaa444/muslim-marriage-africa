#!/usr/bin/env python3
"""QA scratch. Applies one exact-string mutation at a time to a tracked product file, runs the story's unit tests, restores the file with git checkout."""
import subprocess, sys, os, re, json
ROOT = '/home/claude/ankanu-profile-fix'
OUT = '/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3/r2/mut'
STORY = ['apps/web/src/pin-screen.test.ts', 'apps/web/src/pin-page.test.ts', 'apps/web/src/profile-edit-page.test.ts', 'apps/web/src/v2-flow.test.ts',
         'apps/web/src/pin-locked-entry.test.ts', 'apps/web/src/web-image.test.ts', 'apps/api/src/pin.test.ts', 'packages/kernel/src/kernel.test.ts']
W = 'code/apps/web/src/'
CL = W + 'v2-client.ts'; PG = W + 'v2-pages.ts'; EG = W + 'entry-guard.ts'; PS = 'code/apps/api/src/pin-session.ts'; KP = 'code/packages/kernel/src/pin.ts'; DP = W + 'discover-page.ts'
M = [
 ('N1-next-no-control-char-check', CL, r"if (next.charAt(0) !== '/' || /[\\u0000-\\u001F\\u007F\\\\]/.test(next)) return '/onboarding'", r"if (next.charAt(0) !== '/') return '/onboarding'"),
 ('N2-next-allows-backslash', CL, r"\\u007F\\\\]/.test(next)", r"\\u007F]/.test(next)"),
 ('N3-next-allows-tab-lf-cr', CL, r"/[\\u0000-\\u001F\\u007F\\\\]/.test(next)", r"/[\\\\]/.test(next)"),
 ('N4-next-no-origin-check', CL, "if (url.origin !== window.location.origin || path.charAt(0)", "if (path.charAt(0)"),
 ('N5-next-no-single-slash-check', CL, " || path.charAt(1) === '/') return '/onboarding'\n        return path", ") return '/onboarding'\n        return path"),
 ('N6-next-returns-raw-next', CL, "path.charAt(1) === '/') return '/onboarding'\n        return path", "path.charAt(1) === '/') return '/onboarding'\n        return next"),
 ('N7-next-round1-validator', CL, r"if (next.charAt(0) !== '/' || /[\\u0000-\\u001F\\u007F\\\\]/.test(next)) return '/onboarding'" + "\n      try {\n        var url = new URL(next, window.location.origin)\n        var path = url.pathname + url.search + url.hash\n        if (url.origin !== window.location.origin || path.charAt(0) !== '/' || path.charAt(1) === '/') return '/onboarding'\n        return path\n      } catch (error) {\n        return '/onboarding'\n      }", "if (next.charAt(0) !== '/' || next.charAt(1) === '/' || next.charAt(1) === '\\\\\\\\') next = '/onboarding'\n      return next"),
 ('N8-next-catch-returns-next', CL, "      } catch (error) {\n        return '/onboarding'\n      }\n    }\n    async function finish", "      } catch (error) {\n        return next\n      }\n    }\n    async function finish"),
 ('E1-gate-401-always-anon', EG, "return body?.error?.code === 'PIN_REQUIRED' ? 'locked' : 'anon'", "return 'anon'"),
 ('E2-gate-401-always-locked', EG, "return body?.error?.code === 'PIN_REQUIRED' ? 'locked' : 'anon'", "return 'locked'"),
 ('E3-locked-cannot-open-pin', EG, "    if (normalized === '/pin') {\n      return null\n    }\n    // What a signed-out", "    if (normalized === '/pin') {\n      return '/auth'\n    }\n    // What a signed-out"),
 ('E4-locked-auth-goes-to-pin', EG, "return signedOut === '/auth' ? `/pin?next=${encodeURIComponent(normalized)}` : signedOut", "return `/pin?next=${encodeURIComponent(normalized)}`"),
 ('E5-locked-next-not-encoded', EG, "`/pin?next=${encodeURIComponent(normalized)}` : signedOut", "`/pin?next=${normalized}` : signedOut"),
 ('E6-locked-next-dropped', EG, "`/pin?next=${encodeURIComponent(normalized)}` : signedOut", "`/pin` : signedOut"),
 ('P1-no-scroll-into-view', CL, "      if (text && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest' })\n", ""),
 ('P2-refusal-on-bottom-line', CL, "      showPinStatus(failureText(result))\n    }\n    if (pinInput) {", "      saveFailure(result)\n    }\n    if (pinInput) {"),
 ('P3-alert-role-removed', PG, 'role="alert"></p>\\n</section>', '></p>\\n</section>'),
 ('P4-status-not-cleared-on-save', CL, "            savedCount = sentAt\n            showPinStatus('')\n", "            savedCount = sentAt\n"),
 ('P5-status-not-cleared-on-tap', CL, "        showStatus('')\n        showPinStatus('')\n", "        showStatus('')\n"),
 ('P6-status-never-shown', CL, "node.classList.toggle('hidden', !text)", "node.classList.toggle('hidden', true)"),
 ('S1-say-noop', CL, "      if (hint) hint.textContent = text || restingHint\n", ""),
 ('S2-no-set-length-hint', CL, "          say(SET_LENGTH_MESSAGE)\n          return", "          return"),
 ('S3-unlock-hint-says-six', CL, "say(UNLOCK_LENGTH_MESSAGE)", "say(SET_LENGTH_MESSAGE)"),
 ('S4-button-only-4-or-6', CL, "if (digits.length > 0) finish(digits)", "if (digits.length === PIN_LENGTH || digits.length === LEGACY_PIN_LENGTH) finish(digits)"),
 ('S5-no-refusal-message', CL, "        paint()\n        say(refusal(body))", "        paint()"),
 ('S6-no-network-message', CL, "        paint()\n        say('La connexion a échoué.')", "        paint()"),
 ('S7-no-progress-line', CL, "        say('Validation du code en cours...')\n", ""),
 ('S8-key-does-not-restore-hint', CL, "        paint()\n        say('')\n        if (digits.length === PIN_LENGTH) finish(digits)", "        paint()\n        if (digits.length === PIN_LENGTH) finish(digits)"),
 ('S9-signin-link-hash', PG, "'href=\"/auth\">$1'", "'href=\"#\">$1'"),
 ('S10-status-role-removed', PG, 'id="status-hint" role="status"', 'id="status-hint"'),
 ('S11-hint-contrast-back-to-50', PG, 'text-deep-navy/70 flex items-center gap-1.5" id="status-hint" role="status"', 'text-deep-navy/50 flex items-center gap-1.5" id="status-hint" role="status"'),
 ('S12-backspace-icon-text-back', PG, '<span aria-hidden="true" class="material-symbols-outlined text-xl" data-icon="backspace"></span>', '<span class="material-symbols-outlined text-xl" data-icon="backspace">backspace</span>'),
 ('S13-clear-contrast-back-to-60', PG, 'text-deep-navy/70 hover:text-deep-navy transition-all duration-150 flex items-center justify-center focus:outline-none" id="btn-clear"', 'text-deep-navy/60 hover:text-deep-navy transition-all duration-150 flex items-center justify-center focus:outline-none" id="btn-clear"'),
 ('A1-unlock-message-says-six', PS, "const message = pattern === UNLOCK_PIN_PATTERN ? PIN_UNLOCK_LENGTH_MESSAGE : PIN_SET_LENGTH_MESSAGE", "const message = PIN_SET_LENGTH_MESSAGE"),
 ('K1-kernel-unlock-message-six', KP, "'pin : quatre ou six chiffres sont requis.'", "'pin : six chiffres sont requis.'"),
 ('W1-alias-read-in-loader', DP, "export function", "const _qaRead = readFileSync\nvoid _qaRead\nexport function"),
]
only = sys.argv[1:]
res = []
for label, rel, old, new in M:
    if only and label not in only: continue
    path = os.path.join(ROOT, rel)
    src = open(path, encoding='utf8').read()
    n = src.count(old)
    if n != 1:
        print(f'[{label}] target found {n} times'); res.append((label, 'TARGET-NOT-UNIQUE', n)); continue
    try:
        open(path, 'w', encoding='utf8').write(src.replace(old, new, 1))
        env = dict(os.environ, ANKANU_CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        r = subprocess.run(['npx', 'vitest', 'run', '--config', 'vitest.unit.config.ts', *STORY], cwd=os.path.join(ROOT, 'code'), env=env, capture_output=True, text=True, timeout=900)
        out = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
        open(f'{OUT}/{label}.log', 'w').write(out)
        fails = sorted(set(re.sub(r'\s+\d+ms$', '', l.strip()) for l in out.splitlines() if l.strip().startswith('FAIL') or l.strip().startswith('×')))
        summ = ' '.join(l.strip() for l in out.splitlines() if l.strip().startswith('Tests '))
        verdict = 'CAUGHT' if r.returncode != 0 else 'SURVIVED'
        print(f'[{label}] {verdict} exit={r.returncode} {summ}'); [print('    ', f[:170]) for f in fails[:4]]
        res.append((label, verdict, summ, fails[:6]))
    finally:
        subprocess.run(['git', 'checkout', '--', rel], cwd=ROOT, check=True)
json.dump(res, open(f'{OUT}/results.json', 'w'), indent=1)
print('done'); 
