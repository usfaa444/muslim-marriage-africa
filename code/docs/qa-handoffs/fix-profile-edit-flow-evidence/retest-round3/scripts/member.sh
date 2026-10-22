#!/usr/bin/env bash
# QA scratch: signs up a disposable member on the ankanu-qa3 stack and walks the signup gate with the log mail/SMS adapters.
# usage: member.sh <label> <sister|brother> [nophoto]   -> prints cookie path
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
BASE=${BASE:-http://localhost:4043}
LABEL=${1:?label}; GENDER=${2:-sister}
CODE=/home/claude/ankanu-profile-fix/code
N=$(date +%s%N | cut -c1-13)
EMAIL="qa3-$LABEL-$N@example.bf"
PASS='phrase avec espaces'
LAST=$DIR/last-$LABEL.json
api() { curl -sS -o "$LAST" -w '%{http_code}' -H 'content-type: application/json' ${COOKIE:+-H "cookie: $COOKIE"} "$@"; }
logs() { docker compose -p ankanu-qa3 --env-file $DIR/local.env -f $CODE/compose.yaml -f $DIR/compose.qa3.yml logs --no-log-prefix api 2>/dev/null; }
HDR=$(mktemp)
code=$(curl -sS -o "$LAST" -D "$HDR" -w '%{http_code}' -H 'content-type: application/json' "$BASE/v1/accounts" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"pseudonym\":\"Qa3_${LABEL}_$N\",\"gender\":\"$GENDER\",\"pledge_accepted\":true,\"civil_given_name\":\"Awa\",\"civil_family_name\":\"Sawadogo\",\"recaptcha_token\":\"test-ok\",\"coc_version\":\"FR-089\",\"dob\":\"1990-01-15\"}")
echo "create account: $code"
COOKIE=$(grep -i '^set-cookie: ankanu_session=' "$HDR" | head -1 | sed -E 's/^[Ss]et-[Cc]ookie: (ankanu_session=[^;]+).*/\1/')
[ -n "$COOKIE" ] || { echo "no session cookie"; cat "$LAST"; exit 1; }
echo "issue email link: $(api -X POST "$BASE/v1/accounts/email-verifications")"
sleep 1
LINK=$(logs | grep "^email $EMAIL AnKanu " | tail -1 | awk '{print $4}')
TOKEN=${LINK##*token=}
echo "consume email link: $(api -X POST "$BASE/v1/accounts/email-verifications/consume" -d "{\"token\":\"$TOKEN\"}")"
PHONE="+2267$(printf '%07d' $((N % 10000000)))"
echo "send otp: $(api -X POST "$BASE/v1/verifications/otp" -d "{\"action\":\"send\",\"phone_e164\":\"$PHONE\"}")"
sleep 1
OTP=$(logs | grep -E '^otp [0-9]{6}$' | tail -1 | awk '{print $2}')
echo "verify otp: $(api -X POST "$BASE/v1/verifications/otp" -d "{\"action\":\"verify\",\"code\":\"$OTP\"}")"
IMG=$(cat "$DIR/photo.b64")
echo "id: $(api -X POST "$BASE/v1/verifications/id" -d "{\"image\":\"$IMG\"}")"
echo "liveness: $(api -X POST "$BASE/v1/verifications/liveness" -d "{\"image\":\"$IMG\"}")"
echo "gate: $(api "$BASE/v1/accounts/gate") $(cat "$LAST")"
echo "$COOKIE" > "$DIR/cookie-$LABEL.txt"
echo "email=$EMAIL" > "$DIR/member-$LABEL.env"
echo "cookie file: $DIR/cookie-$LABEL.txt"
