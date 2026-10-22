import { execFileSync } from 'node:child_process'
const WEB='http://localhost:4021'
const sh=(c)=>execFileSync('sh',['-c',c],{encoding:'utf8'})
const res = await fetch(`${WEB}/v1/accounts`, { method:'POST', headers:{'content-type':'application/json', origin: WEB}, body: JSON.stringify({ email:'qa.net.1@example.bf', password:'phrase avec espaces', pseudonym:'QaNet1', gender:'brother', pledge_accepted:true, civil_given_name:'Salif', civil_family_name:'Ouedraogo', recaptcha_token:'qa-token', coc_version:'FR-089', dob:'1990-01-15' }) })
const cookie = res.headers.getSetCookie()[0].split(';')[0]
sh('docker stop ankanu-qa-sms-stub-1')
const t=Date.now()
const r = await fetch(`${WEB}/v1/verifications/otp`, { method:'POST', headers:{'content-type':'application/json', origin: WEB, cookie}, body: JSON.stringify({action:'send', phone_e164:'+22600001234'}) })
const body = await r.text()
console.log('stub stopped ->', r.status, Date.now()-t, 'ms', body)
sh('docker start ankanu-qa-sms-stub-1')
console.log(sh("docker logs ankanu-qa-api-1 2>&1 | grep -E 'sms aqilas' | tail -n 2"))
