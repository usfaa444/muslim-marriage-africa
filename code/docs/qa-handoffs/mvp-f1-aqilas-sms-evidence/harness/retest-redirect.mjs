import { execFileSync } from 'node:child_process'
const WEB = 'http://localhost:4021', STUB = 'http://localhost:4023'
const sh = (c) => execFileSync('sh', ['-c', c], { encoding: 'utf8' })
const psql = (q) => execFileSync('docker', ['exec', '-i', 'ankanu-qa-postgres-1', 'psql', '-U', 'ankanu', '-d', 'ankanu', '-At', '-c', q], { encoding: 'utf8' }).trim()
const stubIp = sh("docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ankanu-qa-sms-stub-1").trim()
const mode = (m) => fetch(`${STUB}/__mode`, { method: 'POST', body: JSON.stringify({ status: 201, delay: 0, mode: 'normal', redirectStatus: undefined, noLocation: undefined, location: undefined, ...m }) })
const seen = async () => (await fetch(`${STUB}/__seen`)).json()
let n = Number(process.env.QA_START ?? 2000)
async function acct() {
  n++
  const res = await fetch(`${WEB}/v1/accounts`, { method: 'POST', headers: { 'content-type': 'application/json', origin: WEB }, body: JSON.stringify({ email: `qa.rd.${n}@example.bf`, password: 'phrase avec espaces', pseudonym: `QaRd${n}`, gender: 'brother', pledge_accepted: true, civil_given_name: 'S', civil_family_name: 'O', recaptcha_token: 'x', coc_version: 'FR-089', dob: '1990-01-15' }) })
  const j = await res.json()
  return { id: j.id, cookie: res.headers.getSetCookie()[0].split(';')[0] }
}
const send = (cookie, phone) => fetch(`${WEB}/v1/verifications/otp`, { method: 'POST', headers: { 'content-type': 'application/json', origin: WEB, cookie }, body: JSON.stringify({ action: 'send', phone_e164: phone }) }).then(async (r) => ({ status: r.status, text: await r.text() }))
let fails = 0
const cases = []
for (const st of [301, 302, 303, 307, 308]) cases.push([`${st} to another host (${stubIp})`, { mode: 'redirect', redirectStatus: st, location: `http://${stubIp}:8099/redirected-target` }, st])
cases.push(['307 to the same host, relative Location', { mode: 'redirect', redirectStatus: 307, location: '/redirected-target' }, 307])
cases.push(['307 without a Location header', { mode: 'redirect', redirectStatus: 307, noLocation: true }, 307])
cases.push(['302 to a hostile external name', { mode: 'redirect', redirectStatus: 302, location: 'http://attacker.invalid/collect' }, 302])
for (const [name, m, st] of cases) {
  const a = await acct()
  await mode(m); await fetch(`${STUB}/__reset`)
  const lines0 = Number(sh("docker logs ankanu-qa-api-1 2>&1 | grep -c 'sms aqilas status " + st + "' || true").trim())
  const phone = `+22600${String(n).padStart(6, '0')}`
  const r = await send(a.cookie, phone)
  const s = await seen()
  const lines1 = Number(sh("docker logs ankanu-qa-api-1 2>&1 | grep -c 'sms aqilas status " + st + "' || true").trim())
  const rows = psql(`select count(*) from verification_record where account_id='${a.id}' and kind='phone_otp'`)
  const disp = psql(`select count(*) from sms_dispatch where account_id='${a.id}'`)
  const followed = s.filter((e) => e.url !== '/api/v1/sms')
  const tokenElsewhere = s.filter((e) => e.url !== '/api/v1/sms' && e.token)
  const ok = r.status === 503 && r.text.includes("L'envoi du code a échoué.") && r.text.includes('"retryable":true') && s.length === 1 && followed.length === 0 && tokenElsewhere.length === 0 && lines1 === lines0 + 1 && rows === '0' && disp === '0' && !r.text.includes(phone)
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: api=${r.status} vendorRequests=${s.length} followedRequests=${followed.length} keySeenElsewhere=${tokenElsewhere.length} logLine+${lines1 - lines0} storedRows=${rows} dispatch=${disp}`)
}
await mode({})
// vendor still healthy afterwards -> normal send works
const a = await acct(); await fetch(`${STUB}/__reset`)
const ok = await send(a.cookie, '+22600099999'); const s = await seen()
console.log(`${ok.status === 201 && s.length === 1 ? 'PASS' : 'FAIL'} control: healthy vendor after the redirect cases -> ${ok.status}, ${s.length} vendor request`)
if (ok.status !== 201) fails++
console.log(fails ? `FAILED ${fails}` : 'ALL PASS')
