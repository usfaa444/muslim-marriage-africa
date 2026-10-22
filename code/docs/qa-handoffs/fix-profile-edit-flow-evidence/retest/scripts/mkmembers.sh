#!/usr/bin/env bash
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
cd $SC
for spec in "r2a sister" "r2lock sister" "r2b brother" "r2photo sister" "r2leg sister" "r2other sister" "r2kbd sister" "r2slow sister" "r2x sister"; do
  set -- $spec
  echo "=== $1 $(date +%T)" >> $SC/r2/logs/members.log
  ./member.sh $1 $2 >> $SC/r2/logs/members.log 2>&1
  sleep 50
done
echo done >> $SC/r2/logs/members.log
