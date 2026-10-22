#!/usr/bin/env bash
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
cd /home/claude/ankanu-profile-fix/code || exit 9
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=$SC/cdn2/chrome-wrap.sh
RC='^Failed to load resource: net::ERR_NAME_NOT_RESOLVED https://www\.google\.com/recaptcha/api\.js\?onload=onRecaptchaLoad&render=explicit$,^GET https://www\.google\.com/recaptcha/api\.js\?onload=onRecaptchaLoad&render=explicit net::ERR_NAME_NOT_RESOLVED$'
echo "E2E_ALLOW_ERRORS (web-only): $RC" > $SC/r2/logs/e2e-allow.txt
E2E_ALLOW_ERRORS="$RC" npx playwright test > $SC/r2/logs/e2e-webonly-styled-full.log 2>&1
echo "exit=$?" >> $SC/r2/logs/e2e-webonly-styled-full.log
E2E_ALLOW_ERRORS="$RC" npx playwright test e2e/profile-edit-flow.spec.ts --repeat-each=3 > $SC/r2/logs/e2e-webonly-styled-newspec-x3.log 2>&1
echo "exit=$?" >> $SC/r2/logs/e2e-webonly-styled-newspec-x3.log
export E2E_BASE_URL=http://localhost:4043
RCS="$RC"',localhost:4043/favicon\.ico'
echo "E2E_ALLOW_ERRORS (stack): $RCS" >> $SC/r2/logs/e2e-allow.txt
E2E_ALLOW_ERRORS="$RCS" npx playwright test > $SC/r2/logs/e2e-stack-styled-full.log 2>&1
echo "exit=$?" >> $SC/r2/logs/e2e-stack-styled-full.log
E2E_ALLOW_ERRORS="$RCS" npx playwright test e2e/profile-edit-flow.spec.ts --repeat-each=3 > $SC/r2/logs/e2e-stack-styled-newspec-x3.log 2>&1
echo "exit=$?" >> $SC/r2/logs/e2e-stack-styled-newspec-x3.log
echo ALLDONE >> $SC/r2/logs/e2e-stack-styled-newspec-x3.log
