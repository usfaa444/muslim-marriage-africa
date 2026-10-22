#!/usr/bin/env bash
# Round 3 / G7: a real signed media URL of the owner, used by the owner while the session is PIN-locked, by another member, and by nobody.
# The URL lives 60 s, so everything between the profile read and the last call is fast; PUT /v1/pin and lock share the 10/min auth limit.
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
B=http://localhost:4043
OWNER=${1:-r3photo}; OTHER=${2:-r3b}; OWN=$(cat $SC/cookie-$OWNER.txt); OTH=$(cat $SC/cookie-$OTHER.txt)
tok() { curl --noproxy '*' -s -m 8 -H "cookie: $OWN" $B/v1/me/profile | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print(d["photos"][0]["url"])'; }
get() { # who cookie path
  local code=$(curl --noproxy '*' -s -m 8 -D $SC/r3/mh.txt -o $SC/r3/mb.txt ${2:+-H "cookie: $2"} -w '%{http_code}' "$B$3")
  local cc=$(grep -i '^cache-control:' $SC/r3/mh.txt | tr -d '\r' | sed 's/^[Cc]ache-[Cc]ontrol: //')
  local ec=$(python3 -I -c 'import json,sys
try: print(json.load(open(sys.argv[1])).get("error",{}).get("code",""))
except Exception: print("image/bytes")' $SC/r3/mb.txt)
  printf '%-22s | %s | cache-control=%-9s | %s\n' "$1" "$code" "${cc:-<none>}" "$ec"
}
{
echo "# Round 3 / G7: owner's real signed media URL, head $(git -C /home/claude/ankanu-profile-fix rev-parse --short HEAD), member $OWNER (owner), $OTHER (another member, PIN-less and unlocked), $(date -u +%FT%TZ)"
U=$(tok)
echo "## unlocked owner session (control)"
get "owner, unlocked" "$OWN" "$U"
get "another member" "$OTH" "$U"
get "no cookie" "" "$U"
echo "## the owner turns the PIN on and locks the session, with a fresh URL read just before"
U=$(tok)
echo "PUT /v1/pin: $(curl --noproxy '*' -s -m 8 -o /dev/null -w '%{http_code}' -X PUT -H "cookie: $OWN" -H 'content-type: application/json' -d '{"pin":"482916"}' $B/v1/pin)"; sleep 7
echo "POST /v1/pin/lock: $(curl --noproxy '*' -s -m 8 -o /dev/null -w '%{http_code}' -X POST -H "cookie: $OWN" $B/v1/pin/lock)"
get "owner, LOCKED" "$OWN" "$U"
get "another member" "$OTH" "$U"
get "no cookie" "" "$U"
get "garbage cookie" "ankanu_session=00000000-0000-7000-8000-000000000000" "$U"
} 2>&1 | tee $SC/r3/ev/r3-media-token-locked.txt
