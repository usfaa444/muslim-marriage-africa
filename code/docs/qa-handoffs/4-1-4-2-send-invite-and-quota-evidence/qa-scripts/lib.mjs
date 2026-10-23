import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire('/home/claude/muslim-marriage-africa/code/apps/api/package.json')
const { PNG } = require('pngjs')
export const API = process.env.API ?? 'http://127.0.0.1:3000'
export const sql = (q) => execSync(`docker exec -i qa-pg psql -U ankanu -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim()
export function png() {
  const p = new PNG({ width: 64, height: 64 })
  for (let i = 0; i < p.data.length; i += 4) { p.data[i] = 40; p.data[i+1] = 80; p.data[i+2] = 120; p.data[i+3] = 255 }
  return PNG.sync.write(p)
}
export async function call(path, cookie, method = 'GET', body, extra = {}) {
  const headers = { ...extra }
  if (cookie) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  const r = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, json: j, headers: r.headers }
}
let n = Date.now() % 1000000
export async function member(gender, { photo = true, publish = true, tag = '' } = {}) {
  n += 1
  const email = `qa${n}@example.bf`
  const c = await call('/v1/accounts', undefined, 'POST', { email, password: 'phrase avec espaces', pseudonym: `QA${tag}${n}`, gender, pledge_accepted: true, civil_given_name: 'Awa', civil_family_name: 'Sawadogo', recaptcha_token: 'test-ok', coc_version: 'FR-089', dob: '1990-01-15' })
  if (c.status !== 201) throw new Error('create ' + JSON.stringify(c))
  const s = await fetch(API + '/v1/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: email, password: 'phrase avec espaces', remember_me: false, recaptcha_token: 'test-ok' }) })
  if (s.status !== 201) throw new Error('signin ' + s.status)
  const raw = s.headers.getSetCookie().join('\n')
  const m = /(__Host-[^=]*|[A-Za-z_.-]+)=([^;]+)/.exec(s.headers.getSetCookie()[0])
  const cookie = `${m[1]}=${m[2]}`
  const id = c.json.id
  if (publish) {
    const p = await call('/v1/me/profile', cookie, 'PUT', { dob: '1990-01-15', city: 'ouagadougou', country: 'BF', profession: 'ingenierie', marital_status: 'single', polygamy_intent: 'no', madhhab: 'maliki', practice: 'assidue', life_plans: 'tf:6months\nUnion stable' })
    if (p.status !== 200) throw new Error('profile ' + JSON.stringify(p))
    sql(`update profile set visibility='public' where account_id='${id}'`)
  }
  if (photo) {
    const ph = await call('/v1/media', cookie, 'POST', { kind: 'profile_photo', image: png().toString('base64') })
    if (ph.status !== 201) throw new Error('photo ' + JSON.stringify(ph))
    sql(`update photo_asset set moderation_state='live', is_main=true where id='${ph.json.id}'`)
  }
  sql(`update credential set email_verified_at=now() where account_id='${id}' and kind='password'`)
  for (const k of ['phone_otp','id_document','liveness']) sql(`insert into verification_record(id,account_id,kind,status,phone_e164,decided_at,expires_at) values (gen_random_uuid(),'${id}','${k}','granted',${k==='phone_otp'?`'+2267000'||floor(random()*9000+1000)::text`:'null'},now(),now()+interval '1 year')`)
  return { id, email, cookie, gender }
}
