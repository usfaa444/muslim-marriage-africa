#!/usr/bin/env bash
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
cd /home/claude/ankanu-profile-fix/code || exit 9
cp $SC/r2/logs/unit-full.log $SC/r2/logs/unit-full-no-chromium.log
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers ANKANU_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:unit > $SC/r2/logs/unit-full.log 2>&1
echo "unit-exit=$?" >> $SC/r2/logs/unit-full.log
