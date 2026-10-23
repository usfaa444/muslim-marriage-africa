import * as L from './lib.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json'))
const A = st.memberA
const callers = {
  'signed-out': '',
  'forged-uuid': 'ankanu_session=01a165b2-46d8-7568-8d03-62b4d1d5855b',
  'forged-stub-staff': 'ankanu_session=staff',
  'forged-garbage': 'ankanu_session=' + 'x'.repeat(3000),
  'member-sister': st.memberA.cookie,
  'member-brother': st.memberB.cookie,
  'mahram': st.mahram.cookie,
  'staff-mfa-pending': st.pend.cookie,
  'operator': st.op1.cookie,
  'moderator': st.mod1.cookie,
}
const calls = [
  ['GET', `/v1/staff/review/queue`],
  ['GET', `/v1/staff/review/cases/${A.id}`],
  ['GET', `/v1/staff/review/evidence/${A.idRec}`],
  ['GET', `/v1/staff/review/evidence/${A.liveRec}`],
  ['POST', `/v1/staff/review/photos/unblur`, { account_id: A.id, asset_id: A.photoId, reason: 'comparer avec le selfie' }],
  ['GET', `/v1/staff/review/photo?token=01a165b2-46d8-7568-8d03-62b4d1d5855a`],
  ['POST', `/v1/staff/review/decisions`, { kind: 'id_document', account_id: 'x', record_id: 'x', decision: 'approve' }],
  ['GET', `/v1/staff/cases?kind=profile_review`],
  ['POST', `/v1/staff/cases`, { account_id: A.id }],
  ['GET', `/v1/staff/metrics`],
]
const rows = []
for (const [cn, ck] of Object.entries(callers)) {
  const c = new L.Client(); c.noRetry = true
  for (const [m, p, b] of calls) {
    const r = await c.raw(m, p, { json: b, cookie: ck || ' ' , headers: ck ? {} : {} })
    const code = r.json?.error?.code ?? ''
    const reason = r.json?.error?.details?.reason ?? ''
    const leaked = r.headers['content-type']?.startsWith('image/') ? 'IMAGE-BYTES' : ''
    rows.push(`${cn.padEnd(18)} ${m.padEnd(4)} ${p.split('?')[0].replace(A.id,':acct').replace(A.idRec,':rec').replace(A.liveRec,':rec').padEnd(40)} ${r.status} ${code} ${reason} ${leaked} cc=${r.headers['cache-control']??'-'}`)
  }
}
console.log(rows.join('\n'))
