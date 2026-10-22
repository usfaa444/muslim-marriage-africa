import * as L from './lib.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json'))
const c = new L.Client(); c.noRetry = true
const M1 = st.mod1.cookie, M2 = st.mod2.cookie, OP = st.op1.cookie
const dec = (ck, b) => c.raw('POST', '/v1/staff/review/decisions', { json: b, cookie: ck })
const prof = (ck, b) => c.raw('POST', '/v1/staff/cases', { json: { kind: 'profile_review', ...b }, cookie: ck })
const show = (n, r) => console.log(n.padEnd(66), r.status, r.json?.error?.code ?? '', r.json?.error?.message ?? '', r.json && !r.json.error ? JSON.stringify(r.json) : '')
const vis = (id) => L.sql(`select coalesce(visibility,'null') from profile where account_id='${id}'`)
const acc = (id) => L.sql(`select status from account where id='${id}'`)
const A = st.memberA
console.log('--- validation (member A)')
const base = { kind: 'id_document', account_id: A.id, record_id: A.idRec, decision: 'reject', reason: 'unreadable' }
show('operator decides', await dec(OP, { ...base }))
show('reject no reason', await dec(M1, { ...base, reason: undefined }))
show('reject bad reason', await dec(M1, { ...base, reason: 'bogus' }))
show('reject liveness reason on id', await dec(M1, { ...base, reason: 'pose_not_done' }))
show('approve with reason', await dec(M1, { ...base, decision: 'approve' }))
show('note 501 chars', await dec(M1, { ...base, note: 'n'.repeat(501) }))
show('note non-string', await dec(M1, { ...base, note: 5 }))
show('kind mismatch (liveness rec as id)', await dec(M1, { ...base, record_id: A.liveRec }))
show('wrong account for record', await dec(M1, { ...base, account_id: st.memberB.id }))
show('unknown record', await dec(M1, { ...base, record_id: '01a165b2-4f77-797f-b27a-beef7fca78ff' }))
show('decision bogus', await dec(M1, { ...base, decision: 'maybe' }))
show('body array', await dec(M1, [1]))
show('empty body', await dec(M1, undefined))
console.log('status still pending:', L.sql(`select status from verification_record where id='${A.idRec}'`))
console.log('--- concurrency: mod1 approve vs mod2 reject on A liveness, in parallel')
const rs = await Promise.all([
  dec(M1, { kind: 'liveness', account_id: A.id, record_id: A.liveRec, decision: 'approve' }),
  dec(M2, { kind: 'liveness', account_id: A.id, record_id: A.liveRec, decision: 'reject', reason: 'unclear' }),
])
rs.forEach((r, i) => show('parallel ' + i, r))
console.log('final status:', L.sql(`select status, decision_reason, decided_by from verification_record where id='${A.liveRec}'`))
show('third decision on decided record', await dec(M1, { kind: 'liveness', account_id: A.id, record_id: A.liveRec, decision: 'reject', reason: 'unclear' }))
console.log('--- 10x parallel on member B ID record')
const B = st.memberB
const rb = await Promise.all(Array.from({ length: 10 }, (_, i) => dec(i % 2 ? M1 : M2, { kind: 'id_document', account_id: B.id, record_id: B.idRec, decision: i % 3 ? 'approve' : 'reject', reason: i % 3 ? undefined : 'expired' })))
console.log('statuses:', rb.map(r => r.status).join(','), 'DB:', L.sql(`select status, decision_reason from verification_record where id='${B.idRec}'`))
console.log('audit decision rows for B id:', L.sql(`select count(*) from audit_event where action='moderator_verification_decision' and payload->>'record_id'='${B.idRec}'`))
