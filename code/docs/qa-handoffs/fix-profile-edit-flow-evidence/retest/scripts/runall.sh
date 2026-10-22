#!/usr/bin/env bash
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
cd $SC/r2/pw
export STYLED=1 CHROME=$SC/cdn2/chrome-wrap.sh
run() { n=$1; shift; echo "=== $n $(date +%T)" >> $SC/r2/logs/runall.log; node "$@" > $SC/r2/logs/$n.log 2>&1; echo "exit=$?" >> $SC/r2/logs/$n.log; }
run ac345-r2a-360 ac345-pin.mjs r2a 360
run ac345-r2slow-1440 ac345-pin.mjs r2slow 1440
run ac4-every-field ac4-every-field.mjs r2other
run ac4-fail ac4-fail.mjs r2other 360
run slow3g slow3g.mjs
run ac2-repair ac2-repair.mjs r2photo
run ac2-live-back ac2-live-back.mjs
run ac2-bfcache ac2-bfcache.mjs
run g7-perf g7-perf.mjs
echo ALLDONE >> $SC/r2/logs/runall.log
