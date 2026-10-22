#!/usr/bin/env bash
# Round 3 (re-run of the hostile-path part of pages.sh, which stopped after two rows): locked session vs no cookie, redirect not followed.
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
B=http://localhost:4043
LCK=$(cat $SC/cookie-r3lock.txt)
st() { curl --noproxy '*' -s -m 8 --path-as-is -o /dev/null -w '%{http_code} %{redirect_url}' ${2:+-H "cookie: $2"} "$B$1" | sed "s|$B||" || echo "curl-error"; }
{
echo "# hostile paths, round 3, head $(git -C /home/claude/ankanu-profile-fix rev-parse --short HEAD), $(date -u +%FT%TZ): path | locked session (r3lock, GET /v1/pin says locked: $(curl --noproxy '*' -s -m 8 -H "cookie: $LCK" $B/v1/pin)) | no cookie"
for p in '/profil/%2F%2Fevil.example' '/profil//evil.example' '/profil/../..//evil.example' '//evil.example' '/%2F%2Fevil.example' '/pin//evil.example' '/pin/%2F%2Fevil.example' '/decouvrir%0D%0ALocation:%20http://evil.example' '/decouvrir/' '/decouvrir//' '/DECOUVRIR' '/profile-edit/' '/profile-edit%2F' '/settings?next=//evil.example' '/pin?next=%2F%2Fevil.example' '/favoris;x=1' '/profile-edit%00'; do
  echo "$p | locked: $(st "$p" "$LCK") | anon: $(st "$p")"
done
} 2>&1 | tee $SC/r3/ev/r3-pages-hostile-paths.txt
