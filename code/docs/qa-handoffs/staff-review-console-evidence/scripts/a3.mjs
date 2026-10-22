import * as L from './lib.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json'))
const A = st.memberA
const mod = new L.Client(); mod.noRetry = true; const ck = st.mod1.cookie
const before = L.sql(`select count(*) from audit_event where action='moderator_evidence_view'`)
let r = await mod.get(`/v1/staff/review/evidence/${A.idRec}`, { cookie: ck })
console.log('EVIDENCE headers', JSON.stringify(r.headers, null, 1), 'len', r.buf.length, 'first bytes', r.buf.slice(0,4).toString('hex'))
const after = L.sql(`select count(*) from audit_event where action='moderator_evidence_view'`)
console.log('audit evidence_view before/after', before, after)
console.log(L.sql(`select action, actor_id, payload::text from audit_event where action like 'moderator_%' order by id desc limit 3`))
// invalid ids
for (const id of ['abc', '../../etc/passwd', '00000000-0000-0000-0000-000000000000', A.photoId, A.id, `${A.idRec}%00`, 'x'.repeat(5000)]) {
  r = await mod.get(`/v1/staff/review/evidence/${encodeURIComponent(id)}`, { cookie: ck })
  console.log('evidence', id.slice(0,40), r.status, r.headers['content-type'])
}
// record id of a phone_otp row
const otpId = L.sql(`select id from verification_record where account_id='${A.id}' and kind='phone_otp' limit 1`)
r = await mod.get(`/v1/staff/review/evidence/${otpId}`, { cookie: ck }); console.log('phone_otp row as evidence', r.status)
// content of the case view: check no bucket URL / evidence_uri / s3
r = await mod.get(`/v1/staff/review/cases/${A.id}`, { cookie: ck })
const body = r.buf.toString()
console.log('case view len', body.length, 'contains s3://', /s3:\/\//.test(body), 'contains evidence_uri', /evidence_uri/.test(body), 'contains bucket', /bucket|minio|9000/.test(body))
console.log(body.slice(0, 1800))
// case 404 for unknown / non-uuid
for (const id of ['abc', '01a165b2-46d8-7568-8d03-62b4d1d5855f', st.mod1.id, st.op1.id]) { r = await mod.get(`/v1/staff/review/cases/${id}`, { cookie: ck }); console.log('case', id, r.status, r.json?.error?.code) }
