#!/usr/bin/env bash
# Round 3: page statuses (no redirect follow) for no cookie, a garbage cookie, an unlocked member and a PIN-locked member; plus hostile paths.
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
B=http://localhost:4043
UNL=$(cat $SC/cookie-r3perf.txt)      # unlocked, PIN-less
LCK=$(cat $SC/cookie-r3lock.txt)      # PIN-enabled; locked below
st() { curl --noproxy '*' -s --path-as-is -o /dev/null -w '%{http_code} %{redirect_url}' ${2:+-H "cookie: $2"} "$B$1" | sed "s|$B||"; }
LRES=$(curl --noproxy '*' -s -X POST -H "cookie: $LCK" $B/v1/pin/lock); echo "lock r3lock: $LRES" >&2; sleep 2
{
echo "# page statuses, round 3, head $(git -C /home/claude/ankanu-profile-fix rev-parse --short HEAD): path | no cookie | garbage cookie | unlocked member (r3perf) | PIN-locked member (r3lock)"
for p in / /auth /password-reset /signup /signup/identity /age-gate /pin '/pin?next=%2Fprofile-edit' /decouvrir '/decouvrir?vue=grille' /favoris /profile-edit /profile-review /settings /onboarding /photo-rules /discussions /invitations /profil /profil/00000000-0000-7000-8000-000000000000 /privacy/status /email-verification /phone /otp /id-liveness /staff/visit-signals; do
  echo "$p | $(st "$p") | $(st "$p" 'ankanu_session=00000000-0000-7000-8000-000000000000') | $(st "$p" "$UNL") | $(st "$p" "$LCK")"
done
echo
echo "# hostile paths: locked (r3lock) | no cookie"
for p in '/profil/%2F%2Fevil.example' '/profil//evil.example' '/profil/../..//evil.example' '//evil.example' '/%2F%2Fevil.example' '/pin//evil.example' '/pin/%2F%2Fevil.example' '/decouvrir%0D%0ALocation:%20http://evil.example' '/decouvrir/' '/decouvrir//' '/DECOUVRIR' '/profile-edit/' '/profile-edit%2F' '/settings?next=//evil.example' '/pin?next=%2F%2Fevil.example' '/favoris;x=1' '/profile-edit%00'; do
  echo "$p | locked: $(st "$p" "$LCK") | anon: $(st "$p")"
done
} | tee $SC/r3/ev/r3-pages-matrix.txt
