import { execFileSync } from 'node:child_process'
import { totpCode } from '/home/claude/ankanu-qa-review/code/apps/api/src/staff-totp.ts'
import { createRequire } from 'node:module'
const require = createRequire('/home/claude/ankanu-qa-review/code/package.json')
const { PNG } = require('pngjs')
export const BASE = 'http://localhost:4022'
const S = process.env.QAS
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const png = (shade = 180) => { const p = new PNG({ width: 16, height: 16 }); p.data.fill(shade); return PNG.sync.write(p) }
export const jpeg = (tag) => Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]), Buffer.from('synthetic-'+tag+'-'+Date.now()), Buffer.from([0xff,0xd9])])
export function logs() { return execFileSync('bash', ['-c', `source ${S}/dc.sh; $DC logs api --no-log-prefix`], { encoding: 'utf8', maxBuffer: 1<<28 }) }
export class Client {
  constructor(name = 'c') { this.name = name; this.jar = new Map(); this.headers = {} }
  cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') }
  async raw(method, path, { json, body, headers = {}, cookie } = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const h = { origin: BASE, ...headers }
      const ck = cookie ?? this.cookieHeader()
      if (ck) h.cookie = ck
      let b = body
      if (json !== undefined) { h['content-type'] = 'application/json'; b = JSON.stringify(json) }
      const res = await fetch(BASE + path, { method, headers: h, body: b, redirect: 'manual' })
      for (const sc of res.headers.getSetCookie?.() ?? []) { const [kv] = sc.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); if (v === '' || /max-age=0/i.test(sc)) this.jar.delete(k); else this.jar.set(k, v) }
      if (res.status === 429 && /auth|sessions|accounts|otp/.test(path) && attempt < 2 && !this.noRetry) { console.error('429 on', path, 'sleep 62s'); await sleep(62000); continue }
      const buf = Buffer.from(await res.arrayBuffer())
      let parsed = null
      try { parsed = JSON.parse(buf.toString('utf8')) } catch {}
      return { status: res.status, headers: Object.fromEntries(res.headers), buf, json: parsed }
    }
  }
  get(p, o) { return this.raw('GET', p, o) }
  post(p, json, o = {}) { return this.raw('POST', p, { json, ...o }) }
}
let n = 0
export async function createMember({ gender = 'sister', dob = '1995-03-02', pseudo, phoneOtp = true, photo = true } = {}) {
  const c = new Client('member')
  const stamp = Date.now() + '' + (n++)
  const email = `qa${stamp}@example.bf`
  const password = 'phrase membre qa revue'
  c.email = email
  c.pseudo = pseudo ?? `Qa_${stamp.slice(-9)}`
  let r = await c.post('/v1/accounts', { email, password, pseudonym: c.pseudo, gender, pledge_accepted: true, civil_given_name: 'Awa', civil_family_name: 'Test', recaptcha_token: 'test-ok', coc_version: 'FR-089', dob })
  if (r.status !== 201) throw new Error('create ' + r.status + r.buf)
  c.id = r.json.id
  r = await c.post('/v1/sessions', { identifier: email, password, remember_me: false, recaptcha_token: 'test-ok' })
  if (r.status !== 201) throw new Error('session ' + r.status + r.buf)
  let mark = logs().length
  r = await c.post('/v1/accounts/email-verifications', {})
  await sleep(800)
  const l = logs().slice(mark)
  const m = l.match(new RegExp(`email ${email.replace(/\./g, '\\.')} AnKanu (\\S+)`))
  if (!m) throw new Error('no email link ' + r.status)
  r = await c.post('/v1/accounts/email-verifications/consume', { token: new URL(m[1]).searchParams.get('token') })
  if (r.status !== 200) throw new Error('consume ' + r.status)
  if (phoneOtp) {
    mark = logs().length
    const phone = `+2267${stamp.slice(-7)}`
    r = await c.post('/v1/verifications/otp', { action: 'send', phone_e164: phone })
    if (r.status !== 201) throw new Error('otp send ' + r.status + r.buf)
    await sleep(500)
    const code = logs().slice(mark).match(/^otp (\d{6})$/m)[1]
    r = await c.post('/v1/verifications/otp', { action: 'verify', code })
    if (r.status !== 200) throw new Error('otp verify ' + r.status)
  }
  r = await c.raw('PUT', '/v1/me/profile', { json: { dob, city: 'ouagadougou', marital_status: 'single', polygamy_intent: 'no', bio_pending: 'Une présentation sobre.' } })
  if (r.status !== 200) throw new Error('profile ' + r.status + r.buf)
  if (photo) { r = await c.post('/v1/media', { kind: 'profile_photo', image: png().toString('base64') }); if (r.status !== 201) throw new Error('photo ' + r.status + r.buf); c.photoId = r.json.id ?? r.json.asset_id }
  return c
}
export async function challenge(c) { return c.post('/v1/verifications/liveness-challenge', {}) }
export async function uploadId(c, tag = 'id') { return c.post('/v1/verifications/id', { image: jpeg(tag).toString('base64') }) }
export async function uploadSelfie(c, challenge_id, tag = 'self') { return c.post('/v1/verifications/liveness', { image: jpeg(tag).toString('base64'), challenge_id }) }
export async function captureBoth(c) {
  const a = await uploadId(c); const ch = await challenge(c); const b = await uploadSelfie(c, ch.json.challenge_id)
  return { id: a, ch, live: b }
}
export function staffCreate(email, role) {
  const out = execFileSync('bash', ['-c', `source ${S}/dc.sh; $DC exec -T api node apps/api/dist/staff-cli.js create --email ${email} --role ${role}`], { encoding: 'utf8' })
  return out
}
export async function staffSignIn(email, oneTime) {
  const c = new Client('staff:' + email)
  let r = await c.post('/v1/staff/sessions', { email, password: oneTime, recaptcha_token: 'test-ok' })
  if (r.status !== 201) throw new Error('staff signin ' + r.status + r.buf)
  r = await c.post('/v1/staff/sessions/password', { new_password: `phrase revue qa ${Date.now()}` })
  if (r.status !== 200) throw new Error('pw ' + r.status + r.buf)
  r = await c.get('/v1/staff/sessions/enrollment')
  const secret = r.json.secret.replace(/\s/g, '')
  c.secret = secret
  r = await c.post('/v1/staff/sessions/mfa', { code: totpCode(secret, new Date()) })
  if (r.status !== 200) throw new Error('mfa ' + r.status + r.buf)
  return c
}
export function sql(q) { return execFileSync('bash', ['-c', `source ${S}/dc.sh; $DC exec -T postgres psql -U ankanu -At -F '|' -c "${q.replace(/"/g, '\\"')}"`], { encoding: 'utf8' }).trim() }
