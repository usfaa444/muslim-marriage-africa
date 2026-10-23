import { member, call, sql, API } from './lib.mjs'
const out = []
const rec = (id, what, ok, actual) => { out.push({ id, what, ok, actual }); console.log(ok ? 'PASS' : 'FAIL', id, what, '=>', typeof actual === 'string' ? actual : JSON.stringify(actual)) }
const post = (m, to) => call('/v1/invites', m.cookie, 'POST', { to_id: to })
const err = (r) => r.json?.error
// no session
for (const [p, m] of [['/v1/invites/quota', 'GET'], ['/v1/invites', 'GET'], ['/v1/invites', 'POST']]) {
  const r = await call(p, undefined, m, m === 'POST' ? { to_id: '01a166d5-fd86-702c-9e9c-7fb62caad62d' } : undefined)
  rec('SEC-1', `no session ${m} ${p}`, r.status === 401, r.status)
}
const B = await member('brother'), S = await member('sister'), S2 = await member('sister'), S3 = await member('sister'), S4 = await member('sister'), B2 = await member('brother')
// bodies
const bads = [[undefined, 'missing body'], [{}, '{}'], [{ to_id: 'abc' }, 'non-uuid'], [{ to_id: '550e8400-e29b-41d4-a716-446655440000' }, 'uuid v4'], [{ to_id: B.id }, 'self'], [{ to_id: "1' OR '1'='1" }, 'sql'], [{ to_id: '<script>alert(1)</script>' }, 'xss'], [{ to_id: ['x'] }, 'array'], [{ to_id: null }, 'null'], [{ to_id: 'a'.repeat(100000) }, '100k chars'], [{ to_id: 12 }, 'number']]
for (const [b, n] of bads) {
  const r = await call('/v1/invites', B.cookie, 'POST', b)
  rec('NEG-body', n, r.status === 400, [r.status, err(r)?.code, err(r)?.details])
}
// unknown, same gender
let r = await post(B, '01a166d5-fd86-702c-9e9c-7fb62caad000'); rec('AC3', 'unknown recipient', r.status === 404 && err(r).message === "Ce profil n'est pas disponible.", [r.status, err(r)?.message])
r = await post(B, B2.id); rec('AC3', 'same-gender recipient (brother->brother)', r.status === 404, r.status)
const unknownBody = JSON.stringify(err(await post(B, '01a166d5-fd86-702c-9e9c-7fb62caad000')).message)
// unavailable states
for (const [label, q] of [['deactivated', `update account set status='deactivated' where id='@'`], ['held', `update account set status='held' where id='@'`], ['pending_deletion', `update account set status='pending_deletion' where id='@'`], ['emergency_hidden', `update profile set visibility='emergency_hidden' where account_id='@'`], ['unpublished', `update profile set visibility='unpublished' where account_id='@'`], ['held-visibility', `update profile set visibility='held' where account_id='@'`]]) {
  const t = await member('sister')
  sql(q.replace('@', t.id))
  const rr = await post(B, t.id)
  rec('AC3', `recipient ${label}`, rr.status === 404 && JSON.stringify(err(rr).message) === unknownBody, [rr.status, err(rr)?.message])
}
console.log('invite rows for B after rejections:', sql(`select count(*) from invite where from_id='${B.id}'`), 'quota rows', sql(`select count(*) from invite_quota where account_id='${B.id}'`))
rec('AC3', 'no row/count written on rejections', sql(`select count(*) from invite where from_id='${B.id}'`) === '0' && sql(`select count(*) from invite_quota where account_id='${B.id}'`) === '0', 'see above')
// no photo / pending photo / incomplete
const NP = await member('brother', { photo: false })
r = await post(NP, S.id); rec('AC2', 'no photo -> 403 photo_required', r.status === 403 && err(r).details.reason === 'photo_required' && err(r).message === 'Ajoutez une photo de profil pour envoyer une invitation.', [r.status, err(r)])
let q = await call('/v1/invites/quota', NP.cookie); rec('AC2', 'quota read sender.photo=false', q.json.sender.photo === false, q.json)
const PP = await member('brother', { photo: false })
const ph = await call('/v1/media', PP.cookie, 'POST', { kind: 'profile_photo', image: (await import('./lib.mjs')).png().toString('base64') })
r = await post(PP, S.id); rec('AC2', 'pending (unmoderated) photo -> 403', r.status === 403 && err(r).details.reason === 'photo_required', [ph.status, r.status])
const INC = await member('brother', { publish: false, photo: false })
r = await post(INC, S.id); rec('AC1', 'unlisted/unpublished sender -> 403', r.status === 403, [r.status, err(r)?.details])
// happy + dup + list
r = await post(B, S.id); rec('AC1', 'send 201', r.status === 201 && r.json.invite.state === 'pending' && r.json.quota.remaining === 2, [r.status, r.json]); rec('SEC-hdr', 'cache-control no-store', r.headers.get('cache-control') === 'no-store', r.headers.get('cache-control'))
const inv1 = r.json.invite.id
r = await post(B, S.id); rec('E-1', 'double submit -> 200 same invite, remaining unchanged', r.status === 200 && r.json.invite.id === inv1 && r.json.quota.remaining === 2, [r.status, r.json.quota])
rec('E-1', 'one row only', sql(`select count(*) from invite where from_id='${B.id}'`) === '1', sql(`select count(*) from invite where from_id='${B.id}'`))
rec('E-1', 'quota row count=1', sql(`select sent_count from invite_quota where account_id='${B.id}'`) === '1', sql(`select sent_count from invite_quota where account_id='${B.id}'`))
let rl = await call('/v1/invites?box=received', S.cookie); rec('AC1', 'on recipient received list', rl.status === 200 && rl.json.count === 1 && rl.json.items[0].id === inv1 && rl.json.items[0].from_id === B.id, rl.json)
rl = await call('/v1/invites?box=received', S2.cookie); rec('IDOR', 'another sister sees nothing', rl.json.count === 0, rl.json)
rl = await call('/v1/invites?box=received', B.cookie); rec('IDOR', 'sender received list empty', rl.json.count === 0, rl.json)
rl = await call('/v1/invites?box=sent', B.cookie); rec('AC1', 'sender sent list', rl.json.count === 1 && rl.json.items[0].to_id === S.id, rl.json)
rl = await call('/v1/invites?box=sent', S2.cookie); rec('IDOR', 'other member sent list empty', rl.json.count === 0, rl.json)
rl = await call('/v1/invites?box=../../x', B.cookie); rec('NEG', 'bad box 400', rl.status === 400, rl.status)
rl = await call('/v1/invites?box=received&from_id=' + B.id, S2.cookie); rec('IDOR', 'from_id query ignored', rl.json.count === 0, rl.json)
// cap for brother: 3 per day
r = await post(B, S2.id); r = await post(B, S3.id); rec('AC6', 'brother 3rd send ok remaining 0', r.status === 201 && r.json.quota.remaining === 0, r.json.quota)
r = await post(B, S4.id); const e = err(r); rec('AC6', 'brother 4th -> 429 QUOTA_EXCEEDED w/ reset', r.status === 429 && e.code === 'QUOTA_EXCEEDED' && e.message === 'Envoi refusé. Quota du jour atteint.' && e.details.reason === 'invite_quota' && e.details.cap === 3 && e.details.remaining === 0 && e.details.resets_at === '2026-10-24T00:00:00.000Z' && e.retryable === false, [r.status, e])
rec('AC12', 'error has no pack/price keys', Object.keys(e.details).sort().join() === 'cap,remaining,reason,resets_at' && !/pack|prix|price|xof/i.test(JSON.stringify(e)), Object.keys(e.details))
rec('AC6', 'no 4th row', sql(`select count(*) from invite where from_id='${B.id}'`) === '3', sql(`select count(*) from invite where from_id='${B.id}'`))
q = await call('/v1/invites/quota', B.cookie); rec('AC6', 'quota read after: remaining 0', q.json.remaining === 0 && q.json.capped, q.json)
r = await post(B, S.id); rec('AC6', 'replaying existing pending when at cap -> 200 (idempotent)', r.status === 200, r.status)
// race: sister default mode, 6 recipients, 6 parallel
const SR = await member('sister'); const targets = []; for (let i = 0; i < 6; i++) targets.push(await member('brother'))
const rs = await Promise.all(targets.map((t) => post(SR, t.id)))
const codes = rs.map((x) => x.status).sort().join()
rec('AC5/race', '6 parallel sends from Sister, cap 3 -> exactly 3x201 3x429', codes === '201,201,201,429,429,429', codes)
rec('AC5/race', 'quota row = 3', sql(`select sent_count from invite_quota where account_id='${SR.id}'`) === '3', sql(`select sent_count from invite_quota where account_id='${SR.id}'`))
q = await call('/v1/invites/quota', SR.cookie); rec('AC5', 'sister quota body has sister_reach_mode same_quota_as_brothers', q.json.sister_reach_mode === 'same_quota_as_brothers' && q.json.remaining === 0, q.json)
// parallel same-pair double submit
const T = await member('sister'); const P = await member('brother')
const pr = await Promise.all([post(P, T.id), post(P, T.id), post(P, T.id)])
rec('E-1', 'parallel same-pair -> one row, counted once', sql(`select count(*) from invite where from_id='${P.id}'`) === '1' && sql(`select sent_count from invite_quota where account_id='${P.id}'`) === '1', [pr.map((x) => x.status), sql(`select sent_count from invite_quota where account_id='${P.id}'`)])
// free_unlimited
sql(`update operator_config set value='free_unlimited' where key='sister_reach_mode'`)
const FU = await member('sister'); const fts = []; for (let i = 0; i < 5; i++) fts.push(await member('brother'))
const frs = []; for (const t of fts) frs.push(await post(FU, t.id))
rec('AC4', 'free_unlimited: 5 sends all 201 uncapped', frs.every((x) => x.status === 201 && x.json.quota.capped === false && x.json.quota.sister_reach_mode === 'free_unlimited'), frs.map((x) => x.status))
rec('AC4', 'free_unlimited writes no quota row', sql(`select count(*) from invite_quota where account_id='${FU.id}'`) === '0', '')
q = await call('/v1/invites/quota', FU.cookie); rec('AC4', 'quota read uncapped', q.json.capped === false, q.json)
// brother unaffected in free_unlimited
const BB = await member('brother'); q = await call('/v1/invites/quota', BB.cookie); rec('AC6', 'brother still capped in free_unlimited', q.json.capped === true && q.json.cap === 3, q.json)
// broken cap
sql(`update operator_config set value='free_unlimited' where key='sister_reach_mode'`)
sql(`update operator_config set value='abc' where key='brother_invite_quota_free'`)
q = await call('/v1/invites/quota', BB.cookie); rec('E-3', 'broken cap -> 500 not free pass', q.status === 500, q.status)
const T2 = await member('sister'); r = await post(BB, T2.id); rec('E-3', 'broken cap send -> 500, no row', r.status === 500 && sql(`select count(*) from invite where from_id='${BB.id}'`) === '0', r.status)
sql(`update operator_config set value='3' where key='brother_invite_quota_free'`)
sql(`delete from operator_config where key='sister_reach_mode'`)
const SM = await member('sister'); q = await call('/v1/invites/quota', SM.cookie); rec('AC11', 'missing sister_reach_mode row -> default same_quota', q.json.sister_reach_mode === 'same_quota_as_brothers' && q.json.capped, q.json)
sql(`insert into operator_config(key,value) select 'sister_reach_mode','same_quota_as_brothers' where not exists (select 1 from operator_config where key='sister_reach_mode')`)
console.log(sql(`select key,value from operator_config where key like 'sister%' or key like 'brother%'`))
// billing: no BillingPort call is observable; check list/browse unaffected
import fs from 'node:fs'; fs.writeFileSync(process.argv[2] ?? 'api-matrix.json', JSON.stringify(out, null, 1))
console.log('FAILS:', out.filter((o) => !o.ok).length, 'of', out.length)
