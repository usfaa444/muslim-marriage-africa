import { io } from '/home/claude/muslim-marriage-africa/code/node_modules/socket.io-client/build/esm/index.js'
const BASE='http://localhost:4012'
const C1='01990000-0000-7000-8000-00000000c001', C2='01990000-0000-7000-8000-00000000c002'
const sess=s=>`ankanu_session=01990000-0000-7000-8000-00000000${s}`
const mk=(s,origin='http://localhost:4012')=>new Promise(res=>{const so=io(BASE,{path:'/v1/realtime',transports:['websocket'],extraHeaders:{Cookie:sess(s),Origin:origin},reconnection:false,addTrailingSlash:false,timeout:5000});so.on('connect',()=>res({ok:true,so}));so.on('connect_error',e=>res({ok:false,err:e.message,data:e.data}))})
const t0=Date.now(); const log=(...a)=>console.log(`+${Date.now()-t0}ms`,...a)
const bro=await mk('f001'), sis=await mk('f002'), oth=await mk('f003')
log('brother',bro.ok,'sister',sis.ok,'other',oth.ok)
for (const [n,s,o] of [['foreign origin','f001','https://evil.example'],['no session','zzzz'],['staff','f005'],['unlisted','f006'],['mahram','f007']]) { const r=await mk(s,o); log(n,'->',r.ok?'CONNECTED (BAD)':'refused',r.err,JSON.stringify(r.data)); r.so?.close() }
const ev={bro:[],sis:[],oth:[]}
for (const [k,c] of [['bro',bro],['sis',sis],['oth',oth]]) { c.so.onAny((n,...a)=>ev[k].push([Date.now()-t0,n,a])) }
// typing
const ts=Date.now(); bro.so.emit('conversation.typing',{conversation_id:C1})
for (let i=0;i<5;i++){ bro.so.emit('conversation.typing',{conversation_id:C1}); await new Promise(r=>setTimeout(r,100)) }
oth.so.emit('conversation.typing',{conversation_id:C1}) // non participant
bro.so.emit('conversation.typing',{conversation_id:'abc'})
bro.so.emit('conversation.typing',{})
bro.so.emit('conversation.typing',null)
await new Promise(r=>setTimeout(r,1200))
log('typing events sister got:',JSON.stringify(ev.sis.filter(e=>e[1]==='conversation.typing')))
log('typing events brother got (should be 0):',ev.bro.filter(e=>e[1]==='conversation.typing').length,' other got:',ev.oth.length)
bro.so.emit('conversation.typing',{conversation_id:C1}); await new Promise(r=>setTimeout(r,1200))
log('after 1s window, sister typing count:',ev.sis.filter(e=>e[1]==='conversation.typing').length)
// send
const r=await fetch(BASE+`/v1/conversations/${C1}/messages`,{method:'POST',headers:{Cookie:sess('f001'),'Content-Type':'application/json'},body:JSON.stringify({kind:'text',text:'Bonjour realtime'})})
const ts2=Date.now(); const j=await r.json(); log('POST',r.status,'ack ms',Date.now()-ts2)
await new Promise(r=>setTimeout(r,800))
for (const k of ['bro','sis','oth']) log(k,'events:',JSON.stringify(ev[k].filter(e=>e[1]!=='conversation.typing')))
log('event names seen',[...new Set(Object.values(ev).flat().map(e=>e[1]))])
// other pair isolation: other member sends in C2, brother must not see
const r2=await fetch(BASE+`/v1/conversations/${C2}/messages`,{method:'POST',headers:{Cookie:sess('f003'),'Content-Type':'application/json'},body:JSON.stringify({kind:'text',text:'autre paire'})})
await new Promise(r=>setTimeout(r,500)); log('C2 post',r2.status,'brother/sister events for C2:',ev.bro.concat(ev.sis).filter(e=>JSON.stringify(e[2]).includes(C2)).length)
// join other rooms attempt
bro.so.emit('join',{room:'account:01990000-0000-7000-8000-00000000a003'}); bro.so.emit('join','account:01990000-0000-7000-8000-00000000a003')
await new Promise(r=>setTimeout(r,300))
// session expiry mid-socket: delete session of sister, then brother types -> ?
console.log(JSON.stringify(j.message?.id))
for (const c of [bro,sis,oth]) c.so.close()
