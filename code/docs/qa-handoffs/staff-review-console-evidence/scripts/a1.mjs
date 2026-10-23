import * as L from './lib.mjs'
const out = []
const log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s) }
const ok = (name, cond, extra='') => log(cond ? 'PASS' : 'FAIL', name, extra)
const m = await L.createMember({ photo: false })
const m2 = await L.createMember({ photo: false })
const noOtp = await L.createMember({ photo: false, phoneOtp: false })
// challenge basics
let r = await new L.Client().post('/v1/verifications/liveness-challenge', {})
ok('A1.1 challenge signed-out 401', r.status === 401, r.status)
r = await L.challenge(noOtp)
ok('A1.2 challenge before phone OTP 403', r.status === 403 && r.json?.details?.required === 'phone_otp', r.status+JSON.stringify(r.json))
r = await L.challenge(m)
ok('A1.3 challenge 201 shape', r.status === 201 && r.json.challenge_id && r.json.pose && r.json.pose_label && r.json.expires_at, JSON.stringify(r.json))
ok('A1.3b no-store on challenge', /no-store/.test(r.headers['cache-control']||''), r.headers['cache-control'])
const c1 = r.json
// RNG distribution
const seen = {}
for (let i = 0; i < 60; i++) { const x = await L.challenge(m); seen[x.json.pose] = (seen[x.json.pose]||0)+1 }
ok('A1.4 all 6 poses appear in 60 draws', Object.keys(seen).length === 6, JSON.stringify(seen))
// replaced challenge
r = await L.uploadSelfie(m, c1.challenge_id)
ok('A1.5 replaced challenge refused 400 VERIFICATION_RETAKE', r.status === 400 && r.json?.code === 'VERIFICATION_RETAKE', r.status+JSON.stringify(r.json))
// missing
r = await m.post('/v1/verifications/liveness', { image: L.jpeg('x').toString('base64') })
ok('A1.6 missing challenge_id refused', r.status === 400 && r.json?.code === 'VERIFICATION_RETAKE', r.status)
r = await m.post('/v1/verifications/liveness', { image: L.jpeg('x').toString('base64'), challenge_id: 'not-a-uuid' })
ok('A1.7 garbage challenge_id refused', r.status === 400, r.status)
// foreign challenge
const cm2 = (await L.challenge(m2)).json
const cm = (await L.challenge(m)).json
r = await L.uploadSelfie(m, cm2.challenge_id)
ok('A1.8 other member challenge refused', r.status === 400, r.status)
// m2 challenge still valid after m used it
r = await L.uploadSelfie(m2, cm2.challenge_id)
ok('A1.9 owner can still use hers (not burned by foreign attempt)', r.status === 201, r.status+JSON.stringify(r.json))
// single use + replay
const okr = await L.uploadSelfie(m, cm.challenge_id)
ok('A1.10 valid selfie 201', okr.status === 201, okr.status+JSON.stringify(okr.json))
r = await L.uploadSelfie(m, cm.challenge_id)
ok('A1.11 replay of used challenge refused', r.status === 400, r.status)
// concurrency on challenge
const cc = (await L.challenge(m)).json
const rs = await Promise.all([1,2,3,4,5].map(i => L.uploadSelfie(m, cc.challenge_id, 'par'+i)))
ok('A1.12 5 parallel uses -> exactly one 201', rs.filter(x=>x.status===201).length === 1, rs.map(x=>x.status).join(','))
// pose stored
log(L.sql(`select kind,status,pose,length(coalesce(evidence_uri,'')) from verification_record where account_id='${m.id}' and kind='liveness' order by id`))
ok('A1.13 pose stored on liveness row matches', L.sql(`select pose from verification_record where account_id='${m2.id}' and kind='liveness'`) === cm2.pose, cm2.pose)
// expiry: set expires_at in the past
const ce = (await L.challenge(m)).json
L.sql(`update liveness_challenge set expires_at = now() - interval '1 second' where account_id='${m.id}'`)
r = await L.uploadSelfie(m, ce.challenge_id)
ok('A1.14 expired challenge refused', r.status === 400, r.status)
// 10 minute TTL
const cx = (await L.challenge(m)).json
const ttl = (Date.parse(cx.expires_at) - Date.now())/1000
ok('A1.15 ttl ~600s', ttl > 590 && ttl <= 601, ttl)
// body size: huge challenge_id
r = await m.post('/v1/verifications/liveness', { image: L.jpeg('x').toString('base64'), challenge_id: 'a'.repeat(100000) })
ok('A1.16 huge challenge_id 400', r.status === 400, r.status)
// id upload needs no challenge
r = await L.uploadId(m)
ok('A1.17 ID upload still works without challenge', r.status === 201, r.status)
// challenge GET /post other routes
r = await m.get('/v1/verifications/liveness-challenge')
log('GET challenge ->', r.status)
// sql injection in challenge_id
r = await m.post('/v1/verifications/liveness', { image: L.jpeg('x').toString('base64'), challenge_id: "' OR 1=1 --" })
ok('A1.18 SQLi challenge_id 400', r.status === 400, r.status)
// pose field injection: client-supplied pose ignored
const cy = (await L.challenge(m)).json
r = await m.post('/v1/verifications/liveness', { image: L.jpeg('p').toString('base64'), challenge_id: cy.challenge_id, pose: 'thumbs_up' })
const stored = L.sql(`select pose from verification_record where id = (select max(id::text)::uuid from verification_record where account_id='${m.id}' and kind='liveness')`)
ok('A1.19 client pose ignored, server pose stored', r.status===201 && stored === cy.pose, stored+' vs '+cy.pose)
