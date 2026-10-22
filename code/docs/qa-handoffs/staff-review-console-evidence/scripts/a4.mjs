import * as L from './lib.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json'))
const A = st.memberA, B = st.memberB
const c = new L.Client(); c.noRetry = true
const M1 = st.mod1.cookie, M2 = st.mod2.cookie, OP = st.op1.cookie
const un = (ck, body) => c.raw('POST', '/v1/staff/review/photos/unblur', { json: body, cookie: ck })
const show = (n, r) => console.log(n.padEnd(58), r.status, r.json?.error?.code ?? '', r.json?.error?.details ? JSON.stringify(r.json.error.details) : '', r.headers['content-type']?.startsWith('image') ? 'IMG' : '')
const good = { account_id: A.id, asset_id: A.photoId, reason: 'Comparer avec le selfie et la pièce' }
show('unblur reason 9 chars', await un(M1, { ...good, reason: '123456789' }))
show('unblur reason 9 + spaces padding', await un(M1, { ...good, reason: '   123456789   ' }))
show('unblur reason 301 chars', await un(M1, { ...good, reason: 'x'.repeat(301) }))
show('unblur reason missing', await un(M1, { account_id: A.id, asset_id: A.photoId }))
show('unblur reason non-string', await un(M1, { ...good, reason: 12345678901 }))
show('unblur asset of other member (IDOR) acct=A asset=B', await un(M1, { ...good, asset_id: B.photoId }))
show('unblur acct=B asset=A', await un(M1, { ...good, account_id: B.id }))
show('unblur asset id = acct id', await un(M1, { ...good, asset_id: A.id }))
show('unblur sqli reason ok-length (stored literal)', await un(M1, { ...good, reason: "x'); drop table audit_event;-- <script>alert(1)</script>" }))
let r = await un(M1, good); show('unblur valid', r)
const url = r.json.url; const exp = r.json.expires_at
console.log('grant url', url, 'expires in s', (Date.parse(exp) - Date.now()) / 1000)
show('photo with grant, same mod1', await c.get(url, { cookie: M1 }))
const rp = await c.get(url, { cookie: M1 }); console.log('photo headers', rp.headers['cache-control'], rp.headers['content-disposition'], rp.headers['content-type'], rp.buf.length)
show('photo with grant, other moderator mod2', await c.get(url, { cookie: M2 }))
show('photo with grant, operator', await c.get(url, { cookie: OP }))
show('photo with grant, member A', await c.get(url, { cookie: A.cookie }))
show('photo with grant, signed out', await c.get(url, { cookie: ' ' }))
const token = new URL('http://x' + url).searchParams.get('token')
// grant used on the member gateway
show('grant on /v1/media/get as member A (owner)', await c.get(`/v1/media/get?token=${token}`, { cookie: A.cookie }))
show('grant on /v1/media/get as member B', await c.get(`/v1/media/get?token=${token}`, { cookie: B.cookie }))
show('grant on /v1/media/get as mod1', await c.get(`/v1/media/get?token=${token}`, { cookie: M1 }))
show('grant on /v1/media/get anon', await c.get(`/v1/media/get?token=${token}`, { cookie: ' ' }))
// random / garbage tokens
show('photo token garbage', await c.get(`/v1/staff/review/photo?token=abc`, { cookie: M1 }))
show('photo token missing', await c.get(`/v1/staff/review/photo`, { cookie: M1 }))
show('photo token array', await c.get(`/v1/staff/review/photo?token=${token}&token=${token}`, { cookie: M1 }))
// blur grant (case view) as photo token
const cv = await c.get(`/v1/staff/review/cases/${A.id}`, { cookie: M1 })
const blurTok = new URL('http://x' + cv.json.photos[0].blur_url).searchParams.get('token')
show('member-gateway blur grant used on staff photo endpoint', await c.get(`/v1/staff/review/photo?token=${blurTok}`, { cookie: M1 }))
const bl = await c.get(cv.json.photos[0].blur_url, { cookie: M1 }); console.log('blur via gateway', bl.status, bl.headers['content-type'], bl.headers['cache-control'], bl.buf.length)
// expiry
L.sql(`update signed_grant set expires_at = now() - interval '1 second' where id='${token}'`)
show('photo after grant expiry (DB-forced)', await c.get(url, { cookie: M1 }))
// real expiry: new grant, wait 61s
r = await un(M1, good); const url2 = r.json.url
console.log('waiting 62s for natural expiry'); await L.sleep(62000)
show('photo after 62s natural expiry', await c.get(url2, { cookie: M1 }))
console.log(L.sql(`select action, payload::text from audit_event where action='moderator_photo_unblur' order by id desc limit 3`))
console.log(L.sql(`select id, derivative, expires_at, revoked_at from signed_grant where derivative='staff_unblur' order by id desc limit 3`))
