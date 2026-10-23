import * as L from './lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json'))
const c = new L.Client(); c.noRetry = true
const M1 = st.mod1.cookie, M2 = st.mod2.cookie
const dec = (b, ck = M1) => c.raw('POST', '/v1/staff/review/decisions', { json: b, cookie: ck })
const view = (id) => c.get(`/v1/staff/review/cases/${id}`, { cookie: M1 }).then(r => r.json)
const profAll = async (id, d = 'allow') => { const v = await view(id); return c.raw('POST', '/v1/staff/cases', { json: { kind: 'profile_review', account_id: id, profile: d, bio: d, photos: v.profile_review.photo_ids.map(a => ({ asset_id: a, decision: d })), reason: d === 'block' ? 'Photo non conforme' : undefined }, cookie: M1 }) }
const vis = (id) => L.sql(`select coalesce(visibility,'null') from profile where account_id='${id}'`)
const acc = (id) => L.sql(`select status from account where id='${id}'`)
const say = (...a) => console.log(...a)
const approve = (m, kind, rec) => dec({ kind, account_id: m.id, record_id: rec, decision: 'approve' })
const A = st.memberA
say('=== A (order: liveness granted earlier) ===')
say('A vis before', vis(A.id))
let r = await approve(A, 'id_document', A.idRec); say('A approve ID ->', r.status, 'vis', vis(A.id), '(expect unpublished: profile review pending)')
r = await profAll(A.id); say('A profile review allow ->', r.status, JSON.stringify(r.json?.visibility), 'DB vis', vis(A.id))
const pub = await c.get(`/v1/profiles/${A.id}`, { cookie: st.memberB.cookie }); say('A public profile as member B ->', pub.status)
// C: profile first, then id, then liveness
const C = await L.createMember({}); const capC = await L.captureBoth(C)
say('=== C (profile review first, then ID, then selfie) ===')
r = await profAll(C.id); say('C profile allow ->', r.status, 'vis', vis(C.id), '(expect unpublished)')
r = await approve(C, 'id_document', capC.id.json.id); say('C approve ID ->', r.status, 'vis', vis(C.id), '(unpublished: selfie pending)')
r = await approve(C, 'liveness', capC.live.json.id); say('C approve selfie ->', r.status, JSON.stringify(r.json), 'vis', vis(C.id), '(expect public)')
// G: ID rejected, selfie approved, profile allow -> hidden
const G = await L.createMember({}); const capG = await L.captureBoth(G)
say('=== G (ID rejected, selfie approved, profile allowed) ===')
r = await dec({ kind: 'id_document', account_id: G.id, record_id: capG.id.json.id, decision: 'reject', reason: 'not_an_id', note: 'SECRET-NOTE-TEXT' }); say('G reject ID ->', r.status)
await approve(G, 'liveness', capG.live.json.id); await profAll(G.id); say('G vis (expect unpublished)', vis(G.id))
say('G member sees ID row:', JSON.stringify((await G.get('/v1/verifications/id')).json))
const gh = await G.get('/v1/verifications/liveness'); say('G member sees liveness row:', JSON.stringify(gh.json))
// retake ID then approve -> public
const up = await L.uploadId(G, 'id2'); say('G retake ID ->', up.status)
r = await dec({ kind: 'id_document', account_id: G.id, record_id: capG.id.json.id, decision: 'approve' }); say('G decide OLD id record ->', r.status, r.json?.error?.code, '(expect 409)')
r = await approve(G, 'id_document', up.json.id); say('G approve NEW ID ->', r.status, 'vis', vis(G.id), '(expect public)')
// H: suspected minor on ID
const H = await L.createMember({ dob: '2000-01-01' }); const capH = await L.captureBoth(H)
say('=== H (suspected minor) ===')
r = await dec({ kind: 'id_document', account_id: H.id, record_id: capH.id.json.id, decision: 'suspected_minor', note: 'looks young' }); say('H suspected minor ->', r.status, JSON.stringify(r.json))
say('H account', acc(H.id), 'vis', vis(H.id), 'id row', L.sql(`select status, decision_reason from verification_record where id='${capH.id.json.id}'`))
r = await approve(H, 'liveness', capH.live.json.id); say('H approve selfie ->', r.status, 'vis', vis(H.id), 'acct', acc(H.id))
r = await profAll(H.id); say('H profile allow ->', r.status, JSON.stringify(r.json?.visibility ?? r.json?.error), 'vis', vis(H.id))
r = await approve(H, 'id_document', capH.id.json.id); say('H approve held ID again ->', r.status, r.json?.error?.code)
say('H member id row:', JSON.stringify((await H.get('/v1/verifications/id')).json))
r = await L.uploadId(H, 'again'); say('H (held) uploads new ID ->', r.status, JSON.stringify(r.json?.error ?? r.json))
r = await L.challenge(H); say('H (held) new challenge ->', r.status)
say('H after: acct', acc(H.id), 'vis', vis(H.id))
const hp = await c.get(`/v1/profiles/${H.id}`, { cookie: st.memberB.cookie }); say('H profile visible to other member ->', hp.status)
// F: stale after retake while case open
const F = await L.createMember({}); const capF = await L.captureBoth(F)
say('=== F (retake after case opened) ===')
await view(F.id)
const ch2 = await L.challenge(F); const up2 = await L.uploadSelfie(F, ch2.json.challenge_id, 'retake')
r = await dec({ kind: 'liveness', account_id: F.id, record_id: capF.live.json.id, decision: 'approve' }); say('F decide old selfie ->', r.status, r.json?.error?.code, '(expect 409)')
say('F old row status', L.sql(`select status from verification_record where id='${capF.live.json.id}'`), 'new row', L.sql(`select status from verification_record where id='${up2.json.id}'`))
// audit completeness
say('=== audit ===')
say(L.sql(`select action, count(*) from audit_event where action like 'moderator_%' group by 1 order by 1`))
say(L.sql(`select payload::text from audit_event where action='moderator_verification_decision' order by id desc limit 4`))
say('note text leaked in audit?', L.sql(`select count(*) from audit_event where payload::text ilike '%SECRET-NOTE-TEXT%' or payload::text ilike '%looks young%'`))
say('note in row:', L.sql(`select decision_note from verification_record where id='${capG.id.json.id}'`))
say('audit chain sane (prev_hash present?):', L.sql(`select count(*) from audit_event`))
writeFileSync('state2.json', JSON.stringify({ C: { id: C.id }, F: { id: F.id }, G: { id: G.id }, H: { id: H.id } }))
