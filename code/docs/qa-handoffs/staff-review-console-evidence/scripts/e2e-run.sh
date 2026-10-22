#!/bin/bash
# usage: e2e-run.sh <label> <playwright args...>
S=/tmp/claude-0/-home-claude-muslim-marriage-africa/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa
cd /home/claude/ankanu-qa-review/code
mk() { QAS=$S node -e "import('$S/lib.mjs').then(m=>{const o=m.staffCreate(process.argv[1],process.argv[2]);console.log(o.match(/password[^:]*: (\S+)/i)[1])})" "$1" "$2"; }
ST=$(date +%s)
MOD=qa-e2e-mod-$ST@example.bf; OP=qa-e2e-op-$ST@example.bf
MP=$(mk $MOD moderator); OPP=$(mk $OP operator)
export no_proxy="$no_proxy,cdn.tailwindcss.com,fonts.googleapis.com,fonts.gstatic.com,www.google.com,www.gstatic.com,www.recaptcha.net" NO_PROXY="$no_proxy"
export E2E_BASE_URL=http://localhost:4022 E2E_COMPOSE_PROJECT=ankanu-qa-review E2E_MODERATOR_EMAIL=$MOD E2E_MODERATOR_ONE_TIME_PASSWORD=$MP E2E_OPERATOR_EMAIL=$OP E2E_OPERATOR_ONE_TIME_PASSWORD=$OPP
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
SF=qa-e2e-sh-$ST@example.bf; SFP=$(mk $SF moderator); export E2E_STAFF_EMAIL=$SF E2E_STAFF_ONE_TIME_PASSWORD=$SFP
shift
npx playwright test -c playwright.qa.config.ts "$@"
