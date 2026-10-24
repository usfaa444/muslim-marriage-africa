// Mac live QA, stories 8.5 / 8.6: two disposable members (Brother A, Sister B) through the real API on
// http://localhost:4012, approved by a disposable Moderator, then an invite, an accept and one message each way.
// usage: node setup-pair.mjs <out pair.json (kept outside the repo)> <moderator email> <one-time password>
// Images are synthetic (flat PNG / JPEG-signed blobs), never a real face. Codes come from the api log.
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../../../../package.json', import.meta.url))
const { PNG } = require('pngjs')

const [OUT, MOD_EMAIL, MOD_OTP] = process.argv.slice(2)
const BASE = 'http://localhost:4012'
const log = (...a) => console.log(...a)

class Client {
  constructor(name) { this.name = name; this.jar = new Map() }
  async call(method, path, body) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(BASE + path, {
        method,
        headers: { origin: BASE, 'content-type': 'application/json', cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
      })
      for (const line of res.headers.getSetCookie()) {
        const [pair] = line.split(';'); const i = pair.indexOf('=')
        this.jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
      }
      const text = await res.text()
      let json = null; try { json = JSON.parse(text) } catch {}
      if (res.status === 429 && attempt === 0 && /sessions|accounts/.test(path)) { log('429, waiting 61 s'); await new Promise((r) => setTimeout(r, 61_000)); continue }
      return { status: res.status, json, text }
    }
  }
  async ok(method, path, body, expected = [200, 201]) {
    const r = await this.call(method, path, body)
    if (!expected.includes(r.status)) throw new Error(`${this.name} ${method} ${path} -> ${r.status} ${r.text.slice(0, 300)}`)
    return r.json
  }
}

const apiLog = () => execFileSync('docker', ['compose', '-p', 'ankanu-local', 'logs', 'api', '--no-log-prefix'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
const logLen = () => apiLog().split('\n').length - 1
async function fromLog(re, mark) {
  for (let i = 0; i < 40; i++) {
    const hits = apiLog().split('\n').slice(mark).map((l) => re.exec(l)?.[1]).filter(Boolean)
    if (hits.length) return hits.at(-1)
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`not in api log: ${re}`)
}

function png(seed) {
  const p = new PNG({ width: 240, height: 240 })
  for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4
    p.data[i] = (x + seed) % 256; p.data[i + 1] = (y * 2 + seed) % 256; p.data[i + 2] = 150; p.data[i + 3] = 255
  }
  return PNG.sync.write(p).toString('base64')
}
const jpeg = (tag) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`synthetic-${tag}-${Date.now()}`), Buffer.from([0xff, 0xd9])]).toString('base64')

function totp(secret) {
  const clean = secret.replace(/[\s=-]/g, '').toUpperCase(); const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0, value = 0; const out = []
  for (const c of clean) { value = (value << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 } }
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))
  const h = createHmac('sha1', Buffer.from(out)).update(counter).digest(); const o = h[h.length - 1] & 15
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, '0')
}

async function member(gender, given, seed) {
  const stamp = Date.now(); const c = new Client(gender)
  const email = `qa85-${gender}-${stamp}@example.bf`; const password = `phrase qa signalement ${stamp}`
  const pseudonym = `${gender === 'brother' ? 'Issa' : 'Mariam'}${String(stamp).slice(-5)}`
  let mark = logLen()
  const created = await c.ok('POST', '/v1/accounts', { email, password, pseudonym, gender, pledge_accepted: true, civil_given_name: given, civil_family_name: 'Test', recaptcha_token: 'test-ok', coc_version: 'FR-089', dob: gender === 'brother' ? '1992-05-10' : '1996-03-02' })
  await c.ok('POST', '/v1/sessions', { identifier: email, password, remember_me: false, recaptcha_token: 'test-ok' })
  await c.call('POST', '/v1/accounts/email-verifications')
  const link = await fromLog(new RegExp(`email ${email.replace(/[.+]/g, '\\$&')} AnKanu (\\S+)`), mark)
  await c.ok('POST', '/v1/accounts/email-verifications/consume', { token: new URL(link).searchParams.get('token') })
  mark = logLen()
  await c.ok('POST', '/v1/verifications/otp', { action: 'send', phone_e164: `+2267${String(stamp).slice(-7)}` })
  const code = await fromLog(/^otp (\d{6})$/, mark)
  await c.ok('POST', '/v1/verifications/otp', { action: 'verify', code })
  await c.ok('PUT', '/v1/me/profile', { dob: gender === 'brother' ? '1992-05-10' : '1996-03-02', city: 'ouagadougou', country: 'BF', madhhab: 'maliki', practice: 'assidue', life_plans: 'tf:1year\nFonder un foyer serein.', education: 'licence', profession: 'enseignement', ...(gender === 'brother' ? { marital_status: 'single', polygamy_intent: 'no' } : { marital_status: 'single' }), bio_pending: 'Une présentation sobre et sincère, en vue du mariage.' })
  await c.ok('POST', '/v1/media', { kind: 'profile_photo', image: png(seed) })
  await c.ok('POST', '/v1/verifications/id', { image: jpeg(`id-${gender}`) })
  const ch = await c.ok('POST', '/v1/verifications/liveness-challenge')
  await c.ok('POST', '/v1/verifications/liveness', { image: jpeg(`live-${gender}`), challenge_id: ch.challenge_id })
  log(gender, 'created', created.id, pseudonym)
  return { c, id: created.id, email, password, pseudonym }
}

const A = await member('brother', 'Issa', 10)
const B = await member('sister', 'Mariam', 90)

const staff = new Client('moderator')
const opened = await staff.ok('POST', '/v1/staff/sessions', { email: MOD_EMAIL, password: MOD_OTP, recaptcha_token: 'test-ok' })
log('staff', opened.mfa_state)
await staff.ok('POST', '/v1/staff/sessions/password', { new_password: `phrase moderation qa ${Date.now()}` })
const enr = await staff.ok('GET', '/v1/staff/sessions/enrollment')
await staff.ok('POST', '/v1/staff/sessions/mfa', { code: totp(enr.secret) })
for (const m of [A, B]) {
  const view = await staff.ok('GET', `/v1/staff/review/cases/${m.id}`)
  for (const kind of ['id_document', 'liveness']) {
    const card = kind === 'id_document' ? view.id_document : view.liveness
    await staff.ok('POST', '/v1/staff/review/decisions', { kind, account_id: m.id, record_id: card.record_id, decision: 'approve' })
  }
  const again = await staff.ok('GET', `/v1/staff/review/cases/${m.id}`)
  const r = again.profile_review
  const body = { kind: 'profile_review', account_id: m.id, photos: r.photo_ids.map((asset_id) => ({ asset_id, decision: 'allow' })) }
  if (r.profile_required) body.profile = 'allow'
  if (r.bio_required) body.bio = 'allow'
  const done = await staff.ok('POST', '/v1/staff/cases', body)
  log(m.pseudonym, 'visibility', done.visibility)
}

const invite = await A.c.ok('POST', '/v1/invites', { to_id: B.id })
const inviteId = invite.invite?.id ?? invite.id
const accepted = await B.c.ok('POST', `/v1/invites/${inviteId}/accept`)
const conversation = accepted.conversation.id
const mA = await A.c.ok('POST', `/v1/conversations/${conversation}/messages`, { kind: 'text', text: 'As-salāmu ʿalaykum, merci d’avoir accepté la démarche.' })
const mB = await B.c.ok('POST', `/v1/conversations/${conversation}/messages`, { kind: 'text', text: 'Wa ʿalaykum as-salām. Je suis célibataire, jamais mariée.' })
const pair = {
  conversation, staffCookies: [...staff.jar],
  brother: { id: A.id, email: A.email, password: A.password, pseudonym: A.pseudonym, cookies: [...A.c.jar], messageId: mA.message.id },
  sister: { id: B.id, email: B.email, password: B.password, pseudonym: B.pseudonym, cookies: [...B.c.jar], messageId: mB.message.id },
}
writeFileSync(OUT, JSON.stringify(pair, null, 2), { mode: 0o600 })
log('pair ready', { conversation, brother: A.pseudonym, sister: B.pseudonym, sisterMessage: mB.message.id })
