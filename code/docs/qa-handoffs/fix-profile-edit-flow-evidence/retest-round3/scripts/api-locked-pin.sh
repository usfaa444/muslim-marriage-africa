#!/usr/bin/env bash
# Round 3, finding 20 and G7 authorization: locked vs anonymous vs garbage cookie, status + Cache-Control + error code, on the real stack.
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
B=http://localhost:4043
LABEL=${1:-r3lock}
C=$(cat $SC/cookie-$LABEL.txt)
OUT=$SC/r3/ev/r3-api-locked-vs-anon-part2-pin-endpoints.txt
row() { # who cookie method path [body]
  local who=$1 ck=$2 m=$3 p=$4 body=${5:-}
  local args=(-s --noproxy '*' -D $SC/r3/h.txt -o $SC/r3/b.txt -X "$m" -H 'content-type: application/json')
  [ -n "$ck" ] && args+=(-H "cookie: $ck")
  [ -n "$body" ] && args+=(-d "$body")
  local code=$(curl "${args[@]}" -w '%{http_code}' "$B$p")
  local cc=$(grep -i '^cache-control:' $SC/r3/h.txt | tr -d '\r' | sed 's/^[Cc]ache-[Cc]ontrol: //')
  local ec=$(python3 -I -c 'import json,sys
try: print(json.load(open(sys.argv[1])).get("error",{}).get("code",""))
except Exception: print("")' $SC/r3/b.txt)
  printf '%-9s | %-6s %-24s | %s | cache-control=%-9s | %s\n' "$who" "$m" "$p" "$code" "${cc:-<none>}" "$ec"
}
{
echo "# Part 2 (PIN endpoints, paced 12 s because they share the 10/min auth rate limit): member $LABEL is locked from part 1, $(date -u +%FT%TZ)"
row locked  "$C" PUT /v1/pin '{"pin":"135790"}'; sleep 12
row anon    "" PUT /v1/pin '{"pin":"135790"}'; sleep 12
row garbage "ankanu_session=00000000-0000-7000-8000-000000000000" PUT /v1/pin '{"pin":"135790"}'; sleep 12
row locked  "$C" POST /v1/pin/unlock '{"pin":"999999"}'; sleep 12
row locked  "$C" POST /v1/pin/unlock '{"pin":"12345"}'; sleep 12
row anon    "" POST /v1/pin/unlock '{"pin":"482916"}'; sleep 12
row locked  "$C" GET /v1/me/profile
row locked  "$C" POST /v1/pin/unlock '{"pin":"482916"}'; sleep 12
row unlocked "$C" GET /v1/me/profile
row unlocked "$C" GET /v1/accounts/gate
row unlocked "$C" GET /v1/health
} 2>&1 | tee $OUT
