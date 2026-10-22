#!/usr/bin/env bash
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
cd /home/claude/ankanu-profile-fix/code || exit 9
pwd > $SC/r3/logs/build-cwd.txt
git rev-parse --short HEAD >> $SC/r3/logs/build-cwd.txt
git status --short >> $SC/r3/logs/build-cwd.txt
(docker build -f $SC/web.Dockerfile --build-context ca=$SC/ca -t ankanu-qa3-web . > $SC/r3/logs/build-web.log 2>&1; echo "web-exit=$?" >> $SC/r3/logs/build-web.log) &
(docker build -f $SC/api.Dockerfile --build-context ca=$SC/ca -t ankanu-qa3-api . > $SC/r3/logs/build-api.log 2>&1; echo "api-exit=$?" >> $SC/r3/logs/build-api.log) &
wait
echo BUILD-DONE >> $SC/r3/logs/build-cwd.txt
