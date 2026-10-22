#!/usr/bin/env bash
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
cd $SC
for spec in "r3kbd sister" "r3slow sister" "r3perf sister" "r3b2 brother"; do
  set -- $spec
  echo "=== $1 $(date +%T)" >> $SC/r3/logs/members.log
  ./member.sh $1 $2 >> $SC/r3/logs/members.log 2>&1
  sleep 45
done
echo done >> $SC/r3/logs/members.log
