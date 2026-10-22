import * as L from './lib.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json'))
const A = st.memberA
const c = new L.Client(); c.noRetry = true
const M2 = st.mod2.cookie
const before = L.sql(`select count(*) from audit_event where action='moderator_evidence_view'`)
const rs = await Promise.all(Array.from({ length: 40 }, () => c.get(`/v1/staff/review/evidence/${A.idRec}`, { cookie: M2 })))
const counts = {}; rs.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1)
console.log('40 parallel evidence views on fresh mod2 session:', JSON.stringify(counts))
const r429 = rs.find(r => r.status === 429); console.log('429 body', r429.buf.toString(), 'retry-after', r429.headers['retry-after'])
const after = L.sql(`select count(*) from audit_event where action='moderator_evidence_view'`)
console.log('audit rows added', after - before, '(expect 30 = bytes served)')
// other sessions unaffected
const r = await c.get(`/v1/staff/review/evidence/${A.idRec}`, { cookie: st.mod1.cookie }); console.log('mod1 other session still ok ->', r.status)
// unblur shares limit
const u = await c.raw('POST', '/v1/staff/review/photos/unblur', { json: { account_id: A.id, asset_id: A.photoId, reason: 'comparer avec le selfie' }, cookie: M2 }); console.log('unblur on exhausted session ->', u.status)
// wait window then ok
await L.sleep(61000)
const r2 = await c.get(`/v1/staff/review/evidence/${A.idRec}`, { cookie: M2 }); console.log('after 61s ->', r2.status)
// new staff sign-in gets a new session -> fresh quota (limit per session, not per account)
