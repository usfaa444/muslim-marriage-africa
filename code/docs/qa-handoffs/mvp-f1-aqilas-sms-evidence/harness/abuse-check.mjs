const WEB='http://localhost:4021', STUB='http://localhost:4023'
await fetch(`${STUB}/__mode`,{method:'POST',body:JSON.stringify({status:201,delay:0,mode:'normal'})}); await fetch(`${STUB}/__reset`)
const target='+22600077777'
const out=[]
for (let i=0;i<4;i++){
  const res = await fetch(`${WEB}/v1/accounts`, { method:'POST', headers:{'content-type':'application/json', origin: WEB}, body: JSON.stringify({ email:`qa.abuse.${Date.now()}.${i}@throwaway.example`, password:'phrase avec espaces', pseudonym:`QaAbuse${Date.now()%100000}${i}`, gender:'brother', pledge_accepted:true, civil_given_name:'A', civil_family_name:'B', recaptcha_token:'x', coc_version:'FR-089', dob:'1990-01-15' }) })
  const cookie = res.headers.getSetCookie()[0].split(';')[0]
  const r = await fetch(`${WEB}/v1/verifications/otp`, { method:'POST', headers:{'content-type':'application/json', origin: WEB, cookie}, body: JSON.stringify({action:'send', phone_e164: target}) })
  out.push(r.status)
}
const seen = await (await fetch(`${STUB}/__seen`)).json()
console.log(`4 fresh accounts (email NOT verified) each sent to the same number: statuses=${out.join(',')} vendor SMS to that number=${seen.filter(s=>s.body.to[0]===target).length}`)
