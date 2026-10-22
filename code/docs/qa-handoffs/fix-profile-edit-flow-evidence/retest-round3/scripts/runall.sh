#!/usr/bin/env bash
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
cd $SC/r3/pw
export STYLED=1 CHROME=$SC/cdn2/chrome-wrap.sh
run() { n=$1; shift; echo "=== $n $(date +%T)" >> $SC/r3/logs/runall.log; node "$@" > $SC/r3/logs/$n.log 2>&1; echo "exit=$?" >> $SC/r3/logs/$n.log; }
run ac4-every-field ac4-every-field.mjs r3other
run ac4-fail ac4-fail.mjs r3b 360
run pin-fail-modes r2-pin-fail-modes.mjs r3b
run brother-fix brother-fix.mjs r3b
run ac345-r3a-360 ac345-pin.mjs r3a 360
run ac345-r3slow-1440 ac345-pin.mjs r3slow 1440
run pin-alert-r3x-dob r2-pin-alert.mjs r3x dob
run pin-alert-r3b2-marital r2-pin-alert.mjs r3b2 marital 390
run pin-hint-pos r2-pin-hint-pos.mjs r3kbd
run inview-360x780 r3-pin-status-inview.mjs r3kbd r3x 360 780
run inview-1280x800 r3-pin-status-inview.mjs r3kbd r3b2 1280 800
run locked-390 r2-locked.mjs r3lock 390
run sec-next-real-api sec-next.mjs r3lock
run legacy-390 r2-legacy.mjs r3leg 390
run sec-next r2-sec-next.mjs r3other
run sec-next-extra r2-sec-next-extra.mjs r3other r3-sec-next-param-extra.txt
run ac2-back-360 ac2-back.mjs r3photo 360 65
run ac2-back-1440 ac2-back.mjs r3perf 1440 65
run upload2 upload1.mjs r3photo
$SC/r3/photo-live.sh > $SC/r3/logs/photo-live.log 2>&1
run ac2-live-back ac2-live-back.mjs
run ac2-repair ac2-repair.mjs r3photo
run ac2-bfcache ac2-bfcache.mjs
run axe r2-axe.mjs r3perf r3perf
run g7-perf g7-perf.mjs
run focus r2-focus.mjs
run g6 r2-g6.mjs
run slow3g slow3g.mjs
echo ALLDONE >> $SC/r3/logs/runall.log
