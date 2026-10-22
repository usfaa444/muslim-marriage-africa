// QA API checks for mvp-f1-aqilas-sms against the local stack (project ankanu-qa).
// Fake key (test-key) and fake numbers only. Stub stands in for Aqilas.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const WEB = 'http://localhost:4021'
const STUB = 'http://localhost:4023'
const results = []
const allCodes = []
const allPhones = new Set()
let counter = Number(process.env.QA_START ?? 100)

function psql(sqlText) {
  return execFileSync('docker', ['exec', '-i', 'ankanu-qa-postgres-1', 'psql', '-U', 'ankanu', '-d', 'ankanu', '-At', '-F', '|', '-c', sqlText], { encoding: 'utf8' }).trim()
}
function dockerLogs() {
  try {
    return execFileSync('docker', ['logs', 'ankanu-qa-api-1'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch (e) {
    return String(e.stdout ?? '') + String(e.stderr ?? '')
  }
}
function dockerLogsBoth() {
  const r = execFileSync('sh', ['-c', 'docker logs ankanu-qa-api-1 2>&1'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return r
}
async function stubMode(mode) {
  await fetch(`${STUB}/__mode`, { method: 'POST', body: JSON.stringify({ status: 201, delay: 0, mode: 'normal', location: undefined, ...mode }) })
}
async function stubSeen() {
  return (await fetch(`${STUB}/__seen`)).json()
}
async function stubReset() {
  await fetch(`${STUB}/__reset`)
}
async function api(path, { method = 'GET', cookie, body, raw, headers = {} } = {}) {
  const started = Date.now()
  const res = await fetch(`${WEB}${path}`, {
    method,
    headers: { origin: WEB, ...(body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, text, json, ms: Date.now() - started, headers: res.headers }
}
async function signup(label) {
  counter += 1
  const email = `qa.${label}.${counter}@example.bf`
  const res = await fetch(`${WEB}/v1/accounts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB },
    body: JSON.stringify({
      email, password: 'phrase avec espaces', pseudonym: `Qa${label}${counter}`, gender: 'brother', pledge_accepted: true,
      civil_given_name: 'Salif', civil_family_name: 'Ouedraogo', recaptcha_token: 'qa-token', coc_version: 'FR-089', dob: '1990-01-15',
    }),
  })
  const j = await res.json()
  if (res.status !== 201) throw new Error(`signup failed ${res.status} ${JSON.stringify(j)}`)
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  return { id: j.id, email, cookie }
}
function phoneFor(n) {
  const p = `+2260000${String(n).padStart(4, '0')}`
  allPhones.add(p)
  return p
}
let phoneN = Number(process.env.QA_PHONE_START ?? 10)
function nextPhone() { phoneN += 1; return phoneFor(phoneN) }
const send = (cookie, phone) => api('/v1/verifications/otp', { method: 'POST', cookie, body: { action: 'send', phone_e164: phone } })
const verify = (cookie, code) => api('/v1/verifications/otp', { method: 'POST', cookie, body: { action: 'verify', code } })
function codeFrom(entry) {
  const m = /votre code est (\d{6})\./.exec(entry?.body?.text ?? '')
  if (m) allCodes.push(m[1])
  return m?.[1]
}
function check(id, desc, ok, detail = '') {
  results.push({ id, desc, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${desc}${detail ? ' | ' + detail : ''}`)
}
const sha = (c) => createHash('sha256').update(c).digest('hex')
const TEXT = (c) => `AnKanu : votre code est ${c}. Il expire dans 10 minutes. Ne le partagez avec personne.`

const only = (process.env.QA_ONLY ?? '').split(',').filter(Boolean)
const want = (id) => only.length === 0 || only.includes(id)

async function main() {
  await stubMode({})
  await stubReset()

  if (want('S01')) {
    const a = await api('/v1/verifications/otp', { method: 'POST', body: { action: 'send', phone_e164: '+22600009999' } })
    const g = await api('/v1/verifications/otp')
    const bad = await api('/v1/verifications/otp', { method: 'POST', cookie: 'ankanu_session=00000000-0000-0000-0000-000000000000', body: { action: 'send', phone_e164: '+22600009999' } })
    const seen = await stubSeen()
    check('S01', 'signed out / bogus session: send is 401, GET is 401, vendor never called', a.status === 401 && g.status === 401 && bad.status === 401 && seen.length === 0, `send=${a.status} get=${g.status} bogus=${bad.status} vendorCalls=${seen.length}`)
  }

  if (want('S02')) {
    const acc = await signup('alpha')
    const phone = nextPhone()
    await stubReset()
    const r = await send(acc.cookie, phone)
    const seen = await stubSeen()
    const entry = seen[0]
    const code = codeFrom(entry)
    check('S02a', 'send: 201 {expires_at}, exactly one POST to vendor', r.status === 201 && Object.keys(r.json ?? {}).join() === 'expires_at' && seen.length === 1, `status=${r.status} body=${r.text} vendorCalls=${seen.length}`)
    check('S02b', 'vendor request: POST /api/v1/sms, X-AUTH-TOKEN test-key, JSON, from/to/text exact', entry?.method === 'POST' && entry?.url === '/api/v1/sms' && entry?.token === 'test-key' && /^application\/json/.test(entry?.type ?? '') && entry?.body?.from === 'AnKanu' && JSON.stringify(entry?.body?.to) === JSON.stringify([phone]) && entry?.body?.text === TEXT(code) && Object.keys(entry.body).sort().join() === 'from,text,to', JSON.stringify(entry))
    check('S02c', 'SMS text is one GSM-7 segment (<=160, basic charset)', (entry?.body?.text ?? '').length <= 160 && /^[A-Za-z0-9 .:,'!?-]+$/.test(entry?.body?.text ?? ''), `len=${(entry?.body?.text ?? '').length}`)
    const row = psql(`select hash, phone_e164, status from verification_record where account_id='${acc.id}' and kind='phone_otp'`)
    check('S02d', 'stored hash is sha256 of the code in the SMS; phone stored; status pending', row === `${sha(code)}|${phone}|pending`, row)
    const wrong = await verify(acc.cookie, code === '000000' ? '111111' : '000000')
    check('S02e', 'wrong code -> 400 OTP_INVALID', wrong.status === 400 && wrong.json?.error?.code === 'OTP_INVALID', `${wrong.status} ${wrong.text}`)
    const ok = await verify(acc.cookie, code)
    check('S02f', 'code from the vendor SMS verifies -> 200 granted', ok.status === 200 && ok.json?.status === 'granted', `${ok.status} ${ok.text}`)
    const rd = await api('/v1/verifications/otp', { cookie: acc.cookie })
    check('S02g', 'GET returns masked phone, never the E.164 or code', rd.status === 200 && !rd.text.includes(phone) && !rd.text.includes(code), rd.text)
    const disp = psql(`select count(*), string_agg(template,',') from sms_dispatch where account_id='${acc.id}'`)
    check('S02h', 'sms_dispatch: one row, template OTP', disp === '1|OTP', disp)
    const cols = psql(`select column_name from information_schema.columns where table_name='sms_dispatch' order by 1`).split('\n').join(',')
    check('S02i', 'sms_dispatch has no phone/code column', cols === 'account_id,created_at,id,template', cols)
    const again = await send(acc.cookie, phone)
    const seen2 = await stubSeen()
    check('S02j', 'send after granted -> 200, no new vendor call', again.status === 200 && seen2.length === 1, `${again.status} calls=${seen2.length}`)
  }

  if (want('S03')) {
    const acc = await signup('cool')
    const phone = nextPhone()
    await stubReset()
    const r1 = await send(acc.cookie, phone)
    const r2 = await send(acc.cookie, phone)
    const seen = await stubSeen()
    check('S03', 'second send inside 60 s -> 200 same expires_at, vendor called once (Story 2.7 cooldown)', r1.status === 201 && r2.status === 200 && r1.json?.expires_at === r2.json?.expires_at && seen.length === 1, `${r1.status}/${r2.status} calls=${seen.length}`)
    codeFrom(seen[0])
  }

  if (want('S04')) {
    const acc = await signup('race')
    const phone = nextPhone()
    await stubReset()
    const rs = await Promise.all(Array.from({ length: 8 }, () => send(acc.cookie, phone)))
    const seen = await stubSeen()
    seen.forEach(codeFrom)
    const statuses = rs.map((r) => r.status).sort().join(',')
    check('S04', '8 concurrent sends -> one 201, rest 200, ONE vendor SMS (no double-send)', rs.filter((r) => r.status === 201).length === 1 && seen.length === 1, `statuses=${statuses} vendorCalls=${seen.length}`)
  }

  if (want('S05')) {
    for (const status of [500, 401, 400, 429, 404, 503, 200, 202, 204]) {
      const acc = await signup('fail')
      const phone = nextPhone()
      await stubMode({ status })
      await stubReset()
      const r = await send(acc.cookie, phone)
      const seen = await stubSeen()
      seen.forEach(codeFrom)
      const rows = psql(`select count(*) from verification_record where account_id='${acc.id}' and kind='phone_otp'`)
      const disp = psql(`select count(*) from sms_dispatch where account_id='${acc.id}'`)
      if (status < 300) {
        check(`S05-${status}`, `vendor ${status} counts as success -> 201`, r.status === 201 && seen.length === 1, `${r.status} ${r.text}`)
        continue
      }
      const ok = r.status === 503 && r.json?.error?.code === 'UNHANDLED' && r.json?.error?.retryable === true && r.json?.error?.message === "L'envoi du code a échoué." && seen.length === 1 && rows === '0' && disp === '0'
      check(`S05-${status}`, `vendor ${status} -> 503 UNHANDLED retryable, French message, nothing stored`, ok, `${r.status} ${r.text} verification_rows=${rows} dispatch=${disp} vendorCalls=${seen.length} ${r.ms}ms`)
      check(`S05-${status}-leak`, 'error body has no code/phone/key/vendor text', !r.text.includes(phone) && !r.text.includes('test-key') && !r.text.includes('secret-vendor-detail') && !r.text.includes('stub failure'), r.text)
      await stubMode({ status: 201 })
      const retry = await send(acc.cookie, phone)
      const seen2 = await stubSeen()
      seen2.slice(1).forEach(codeFrom)
      check(`S05-${status}-retry`, 'immediate retry after failure works (no cooldown from the rolled-back attempt)', retry.status === 201, `${retry.status}`)
    }
    await stubMode({})
  }

  if (want('S05b')) {
    // rollback preserves the prior pending code
    const acc = await signup('prior')
    const phone = nextPhone()
    await stubMode({}); await stubReset()
    const r1 = await send(acc.cookie, phone)
    const s1 = await stubSeen(); const c1 = codeFrom(s1[0])
    psql(`update sms_dispatch set created_at = now() - interval '2 minutes' where account_id='${acc.id}'`)
    const before = psql(`select hash||'|'||phone_e164||'|'||expires_at from verification_record where account_id='${acc.id}' and kind='phone_otp'`)
    await stubMode({ status: 500 })
    const r2 = await send(acc.cookie, nextPhone())
    const after = psql(`select hash||'|'||phone_e164||'|'||expires_at from verification_record where account_id='${acc.id}' and kind='phone_otp'`)
    const disp = psql(`select count(*) from sms_dispatch where account_id='${acc.id}'`)
    const stillValid = await verify(acc.cookie, c1)
    check('S05b', 'failed re-send keeps the earlier hash/phone/expiry and dispatch count; earlier code still verifies', r1.status === 201 && r2.status === 503 && before === after && disp === '1' && stillValid.status === 200, `before=${before.slice(0, 20)}.. same=${before === after} dispatch=${disp} verifyOld=${stillValid.status}`)
    await stubMode({})
  }

  if (want('S06')) {
    const acc = await signup('slow')
    const phone = nextPhone()
    await stubMode({ delay: 12000 }); await stubReset()
    const r = await send(acc.cookie, phone)
    const seen = await stubSeen()
    const rows = psql(`select count(*) from verification_record where account_id='${acc.id}' and kind='phone_otp'`)
    check('S06', 'vendor silent for 12 s -> 503 after ~10 s (9.5-11.5 s), nothing stored', r.status === 503 && r.ms >= 9500 && r.ms <= 11500 && rows === '0' && r.json?.error?.retryable === true, `${r.status} after ${r.ms}ms rows=${rows} vendorCalls=${seen.length}`)
    await stubMode({ delay: 3000 }); await stubReset()
    const r2 = await send(acc.cookie, phone)
    const s2 = await stubSeen(); s2.forEach(codeFrom)
    check('S06b', 'vendor slow but under 10 s (3 s) -> 201', r2.status === 201 && r2.ms >= 2900 && r2.ms < 6000, `${r2.status} ${r2.ms}ms`)
    await stubMode({})
  }

  if (want('S07')) {
    for (const [status, expectStatus] of [[201, 201], [500, 503]]) {
      const acc = await signup('hang')
      await stubMode({ mode: 'hangbody', status }); await stubReset()
      const r = await send(acc.cookie, nextPhone())
      const s = await stubSeen(); s.forEach(codeFrom)
      check(`S07-${status}`, `vendor sends ${status} headers then stalls the body -> ${expectStatus} within 3 s (body not awaited)`, r.status === expectStatus && r.ms < 3000, `${r.status} ${r.ms}ms`)
    }
    await stubMode({})
  }

  if (want('S08')) {
    for (const [status, expectStatus] of [[500, 503], [201, 201]]) {
      const acc = await signup('big')
      await stubMode({ mode: 'bigbody', status }); await stubReset()
      const r = await send(acc.cookie, nextPhone())
      const s = await stubSeen(); s.forEach(codeFrom)
      check(`S08-${status}`, `5 MB vendor body with ${status} -> ${expectStatus}, body not echoed, fast`, r.status === expectStatus && r.ms < 3000 && r.text.length < 500, `${r.status} ${r.ms}ms respLen=${r.text.length}`)
    }
    await stubMode({})
  }

  if (want('S09')) {
    const acc = await signup('redir')
    // 172.18.0.3 is the stub container: same server, different origin host string
    await stubMode({ mode: 'redirect', location: 'http://172.18.0.3:8099/redirected-target' }); await stubReset()
    const r = await send(acc.cookie, nextPhone())
    const s = await stubSeen(); s.forEach(codeFrom)
    const second = s[1]
    check('S09', 'vendor 307 to ANOTHER host: the key must not follow it (expect no second request carrying X-AUTH-TOKEN)', !(second && second.token === 'test-key'), `status=${r.status} requests=${s.length} second=${JSON.stringify(second ? { host: second.host, token: second.token, url: second.url } : null)}`)
    await stubMode({})
  }

  if (want('S10')) {
    const acc = await signup('valid')
    await stubMode({}); await stubReset()
    const bad = [
      ['missing phone', { action: 'send' }],
      ['phone null', { action: 'send', phone_e164: null }],
      ['phone number type', { action: 'send', phone_e164: 22600000001 }],
      ['phone array', { action: 'send', phone_e164: ['+22600000001'] }],
      ['phone object', { action: 'send', phone_e164: { a: 1 } }],
      ['spaces', { action: 'send', phone_e164: '+226 00 00 00 01' }],
      ['no plus', { action: 'send', phone_e164: '22600000001' }],
      ['script', { action: 'send', phone_e164: '<script>alert(1)</script>' }],
      ['sql', { action: 'send', phone_e164: "+226'; DROP TABLE account;--" }],
      ['300 chars', { action: 'send', phone_e164: '+' + '1'.repeat(300) }],
      ['16 digits', { action: 'send', phone_e164: '+1234567890123456' }],
      ['leading zero cc', { action: 'send', phone_e164: '+0226000001' }],
      ['trailing newline', { action: 'send', phone_e164: '+22600000001\n' }],
      ['arabic-indic digits', { action: 'send', phone_e164: '+٢٢٦٠٠٠٠٠٠٠٠١' }],
      ['emoji', { action: 'send', phone_e164: '+226😀000001' }],
      ['json-injection', { action: 'send', phone_e164: '+22600000001","to":["+99999999999' }],
      ['unknown action', { action: 'sms', phone_e164: '+22600000001' }],
      ['no action', { phone_e164: '+22600000001' }],
    ]
    let allBad = true
    const detail = []
    for (const [name, body] of bad) {
      const r = await api('/v1/verifications/otp', { method: 'POST', cookie: acc.cookie, body })
      const ok = r.status === 400
      if (!ok) allBad = false
      detail.push(`${name}:${r.status}`)
    }
    const nonJson = await api('/v1/verifications/otp', { method: 'POST', cookie: acc.cookie, raw: 'not json{' })
    const arr = await api('/v1/verifications/otp', { method: 'POST', cookie: acc.cookie, raw: '[1,2]' })
    detail.push(`nonJson:${nonJson.status}`, `arrayBody:${arr.status}`)
    const seen = await stubSeen()
    check('S10', 'invalid/hostile phone inputs and bodies -> 400 (never 5xx), vendor never called', allBad && nonJson.status === 400 && arr.status === 400 && seen.length === 0, `${detail.join(' ')} vendorCalls=${seen.length}`)
    const sixx = [nonJson, arr].every((r) => r.status < 500)
    check('S10b', 'malformed bodies do not 5xx', sixx, `${nonJson.status} ${arr.status}`)
    const fr = await send(acc.cookie, '+33612345678')
    const s2 = await stubSeen(); s2.forEach(codeFrom)
    check('S10c', 'valid non-BF E.164 (+33...) -> 201 and `to` carries it verbatim in a one-element list', fr.status === 201 && JSON.stringify(s2[0]?.body?.to) === JSON.stringify(['+33612345678']), `${fr.status} ${JSON.stringify(s2[0]?.body?.to)}`)
    allPhones.add('+33612345678')
  }

  if (want('S11')) {
    const a = await signup('ownerA'); const b = await signup('ownerB')
    await stubMode({}); await stubReset()
    await send(a.cookie, nextPhone())
    const s = await stubSeen(); const code = codeFrom(s[0])
    const cross = await verify(b.cookie, code)
    const own = await verify(a.cookie, code)
    check('S11', "another member's session cannot verify with A's code (400); A still can (200)", cross.status === 400 && own.status === 200, `B=${cross.status} A=${own.status}`)
    const readB = await api('/v1/verifications/otp', { cookie: b.cookie })
    check('S11b', "B's GET shows no pending phone (no cross-account bleed)", readB.json?.status === 'none', readB.text)
  }

  if (want('S12')) {
    const acc = await signup('limit')
    await stubMode({}); await stubReset()
    const out = []
    for (let i = 0; i < 6; i++) {
      const r = await send(acc.cookie, nextPhone())
      out.push(r.status)
      psql(`update sms_dispatch set created_at = created_at - interval '2 minutes' where account_id='${acc.id}'`)
    }
    const s = await stubSeen(); s.forEach(codeFrom)
    check('S12', 'hourly cap (5): sends 1-5 -> 201, 6th -> 429 with no vendor call', out.slice(0, 5).every((x) => x === 201) && out[5] === 429 && s.length === 5, `${out.join(',')} vendorCalls=${s.length}`)
  }

  if (want('S13')) {
    // no-leak sweep over everything this run produced
    const logs = dockerLogsBoth()
    const smsLines = logs.split('\n').filter((l) => /sms|otp/i.test(l) && !/RouterExplorer|Mapped/.test(l))
    const uniq = [...new Set(smsLines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').trim()))]
    console.log('api log sms/otp lines (distinct):', JSON.stringify(uniq))
    const leaks = []
    for (const c of new Set(allCodes)) if (logs.includes(c)) leaks.push(`code ${c}`)
    for (const p of allPhones) { if (logs.includes(p) || logs.includes(p.replace('+', ''))) leaks.push(`phone ${p}`) }
    for (const w of ['test-key', 'secret-vendor-detail', 'stub failure', 'bulk_id', 'X-AUTH-TOKEN']) if (logs.includes(w)) leaks.push(w)
    check('S13a', `api container output has no code (${new Set(allCodes).size} codes), phone (${allPhones.size}), key or vendor text`, leaks.length === 0, leaks.join('; '))
    check('S13b', 'api log has no `otp <code>` line in aqilas mode', !/(^|\n)otp \d{6}/.test(logs), '')
    const bad = uniq.filter((l) => !/^sms aqilas (status \d{3}|timeout|network error)$/.test(l))
    check('S13c', 'only fixed `sms aqilas ...` lines are emitted for failures', bad.length === 0, bad.join(' // '))
    const dump = execFileSync('sh', ['-c', "docker exec ankanu-qa-postgres-1 pg_dump -U ankanu -d ankanu --data-only --inserts"], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    const dbLeaks = []
    for (const c of new Set(allCodes)) if (dump.includes(`'${c}'`) || dump.includes(TEXT(c))) dbLeaks.push(`code ${c}`)
    const dumpNoVerification = dump.split('\n').filter((l) => !l.startsWith('INSERT INTO public.verification_record ')).join('\n')
    for (const p of allPhones) if (dumpNoVerification.includes(p)) dbLeaks.push(`phone ${p} outside verification_record`)
    if (dump.includes('test-key') || dump.includes('secret-vendor-detail')) dbLeaks.push('key/vendor text')
    check('S13d', 'DB dump: no plaintext code anywhere; phone only in verification_record (Story 2.7 design); no key/vendor text', dbLeaks.length === 0, dbLeaks.join('; '))
  }

  const fails = results.filter((r) => !r.ok)
  console.log(`\nSUMMARY ${results.length - fails.length}/${results.length} passed`)
  if (fails.length) console.log('FAILED:', fails.map((f) => f.id).join(', '))
}
main().catch((e) => { console.error(e); process.exit(2) })
