import * as L from './lib.mjs'
import { writeFileSync } from 'node:fs'
const st = {}
const parse = (o) => o.match(/password[^:]*: (\S+)/i)[1]
async function staff(role, email) { const o = L.staffCreate(email, role); const c = await L.staffSignIn(email, parse(o)); return { email, secret: c.secret, cookie: c.cookieHeader(), id: L.sql(`select id from account where email='${email}'`) } }
st.mod1 = await staff('moderator', 'qa-mod1d@example.bf')
st.mod2 = await staff('moderator', 'qa-mod2d@example.bf')
st.op1 = await staff('operator', 'qa-op1d@example.bf')
// MFA pending staff: sign in + change password + enrollment fetched, no code
{
  const email = 'qa-pendd@example.bf'; const o = L.staffCreate(email, 'moderator'); const c = new L.Client()
  let r = await c.post('/v1/staff/sessions', { email, password: parse(o), recaptcha_token: 'test-ok' })
  r = await c.post('/v1/staff/sessions/password', { new_password: 'phrase revue qa pend 1' })
  r = await c.get('/v1/staff/sessions/enrollment')
  st.pend = { cookie: c.cookieHeader() }
}
// members
const mk = async (name, o) => { const c = await L.createMember(o); st[name] = { id: c.id, email: c.email, pseudo: c.pseudo, cookie: c.cookieHeader(), photoId: c.photoId }; return c }
const mA = await mk('memberA', {})
const cap = await L.captureBoth(mA)
st.memberA.idRec = cap.id.json.id; st.memberA.liveRec = cap.live.json.id; st.memberA.pose = cap.ch.json.pose
const mB = await mk('memberB', { gender: 'brother', dob: '1990-01-01' })
const capB = await L.captureBoth(mB)
st.memberB.idRec = capB.id.json.id; st.memberB.liveRec = capB.live.json.id
const mm = await mk('mahram', { gender: 'brother', dob: '1985-05-05', photo: false })
L.sql(`update account set roles = array['mahram'] where id='${mm.id}'`)
writeFileSync('state.json', JSON.stringify(st, null, 1))
console.log(JSON.stringify(st, null, 1).replace(/"cookie": "[^"]+"/g, '"cookie":"…"'))
