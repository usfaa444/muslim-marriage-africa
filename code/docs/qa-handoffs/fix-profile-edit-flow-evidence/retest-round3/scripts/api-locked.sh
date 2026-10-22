#!/usr/bin/env bash
# Round 3, finding 20 and G7 authorization: locked vs anonymous vs garbage cookie, status + Cache-Control + error code, on the real stack.
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
B=http://localhost:4043
LABEL=${1:-r3lock}
C=$(cat $SC/cookie-$LABEL.txt)
OUT=$SC/r3/ev/r3-api-locked-vs-anon.txt
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
echo "# Round 3 / finding 20: Cache-Control on the locked 401 PIN_REQUIRED, real stack (ankanu-qa3, head $(git -C /home/claude/ankanu-profile-fix rev-parse --short HEAD)), member $LABEL, $(date -u +%FT%TZ)"
echo "## setup (rate limit: auth calls paced 7 s)"
row setup "$C" PUT /v1/pin '{"pin":"482916"}'; sleep 7
row setup "$C" GET /v1/me/profile
row unlocked "$C" GET /v1/browse
row setup "$C" POST /v1/pin/lock; sleep 7
echo "## locked session vs signed-out vs garbage cookie"
for spec in "GET /v1/me/profile" "PUT /v1/me/profile {}" "PATCH /v1/me/profile {}" "GET /v1/accounts/gate" "GET /v1/browse" "GET /v1/pin" "PUT /v1/pin {\"pin\":\"135790\"}" "GET /v1/health" "GET /v1/media/get?token=x"; do
  set -- $spec; m=$1; p=$2; body=${3:-}
  row locked  "$C" "$m" "$p" "$body"
  row anon    "" "$m" "$p" "$body"
  row garbage "ankanu_session=00000000-0000-7000-8000-000000000000" "$m" "$p" "$body"
done
echo "## a wrong PIN while locked, then the right one"
row locked "$C" POST /v1/pin/unlock '{"pin":"999999"}'; sleep 7
row locked "$C" GET /v1/me/profile
row locked "$C" POST /v1/pin/unlock '{"pin":"482916"}'; sleep 7
row unlocked "$C" GET /v1/me/profile
row unlocked "$C" GET /v1/accounts/gate
} 2>&1 | tee $OUT
