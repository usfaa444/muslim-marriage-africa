#!/usr/bin/env bash
# Make r3photo's oldest photo live + main (the second upload stays pending), as in round 2.
SC=/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3
. $SC/member-r3photo.env
psql -h 127.0.0.1 -p 55443 -U ankanu -d ankanu -v e="$email" -At <<'SQL'
select id, kind, moderation_state, is_main from photo_asset where owner_id = (select id from account where email = :'e') order by id;
update photo_asset set moderation_state='live', is_main=true where id = (select id from photo_asset where owner_id = (select id from account where email = :'e') order by id limit 1) returning id, moderation_state, is_main;
select id, kind, moderation_state, is_main from photo_asset where owner_id = (select id from account where email = :'e') order by id;
SQL
