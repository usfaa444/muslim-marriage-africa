import { chromium } from '/home/claude/muslim-marriage-africa/code/node_modules/playwright/index.mjs'
import { execSync } from 'child_process'
const E=process.argv[2]+'/shots'
const C1='01990000-0000-7000-8000-00000000c001'
const sql=q=>execSync(`docker exec ankanu-local-postgres-1 psql -U ankanu -d ankanu -At -c "${q}"`).toString().trim()
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'})
const mk=async(sid,w=390,h=800)=>{const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'fr-FR'});await ctx.addCookies([{name:'ankanu_session',value:`01990000-0000-7000-8000-00000000${sid}`,url:'http://localhost:4012'}]);
 await ctx.route(/cdn\.tailwindcss\.com|fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,contentType:'text/css',body:''}))
 return {ctx,page:await ctx.newPage()}}
// thread load fail
{ const {page:p}=await mk('f001'); await p.route('**/v1/conversations/*/messages**',r=>r.fulfill({status:500,body:'{}',contentType:'application/json'}))
  await p.goto('http://localhost:4012/discussions/'+C1); await p.waitForTimeout(1500)
  console.log('THREAD messages 500 ->', (await p.locator('main').innerText()).replace(/\n+/g,' | ').slice(0,300)); console.log('visible alerts:', await p.locator('[role=alert]:visible').allTextContents()); await p.screenshot({path:E+'/thread-messages-500.png'}) }
// 3G timing
{ const {ctx,page:p}=await mk('f001'); const c=await ctx.newCDPSession(p); await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:50*1024,uploadThroughput:50*1024})
  const t=Date.now(); await p.goto('http://localhost:4012/discussions/'+C1,{waitUntil:'commit'}); await p.locator('[role=log] >> text=scan store down').first().waitFor({timeout:30000}); console.log('3G (400ms, 50KB/s) thread content visible after',Date.now()-t,'ms')
  const t2=Date.now(); await p.getByLabel('Réponse réfléchie et posée').fill('Envoi 3G'); const t3=Date.now(); await p.getByRole('button',{name:'Envoyer'}).click(); await p.locator('[role=log] >> text=Envoi 3G').waitFor(); console.log('3G send->bubble',Date.now()-t3,'ms')
  const t4=Date.now(); await p.goto('http://localhost:4012/discussions',{waitUntil:'commit'}); await p.getByText('Accéder à la conversation').first().waitFor({timeout:30000}); console.log('3G list visible',Date.now()-t4,'ms')
  const bytes=await p.evaluate(()=>performance.getEntriesByType('resource').reduce((a,e)=>a+(e.transferSize||0),0)); console.log('list resource bytes',bytes) }
// unavailable other member (brother's thread, sister deactivated)
sql("update account set status='deactivated' where id='01990000-0000-7000-8000-00000000a002'")
{ const {page:p}=await mk('f001'); await p.goto('http://localhost:4012/discussions/'+C1); await p.waitForTimeout(1500)
  console.log('UNAVAILABLE thread ->', (await p.locator('main').innerText()).replace(/\n+/g,' | ').slice(0,400).replace(/(Vous :[^|]*\|)+/g,'')); console.log('composer disabled:', await p.getByLabel('Réponse réfléchie et posée').isDisabled().catch(e=>'n/a '+e.message.slice(0,40)), 'send disabled:', await p.getByRole('button',{name:'Envoyer'}).isDisabled().catch(()=>'n/a'))
  await p.screenshot({path:E+'/thread-unavailable.png',fullPage:true})
  await p.goto('http://localhost:4012/discussions'); await p.waitForTimeout(1200); console.log('LIST unavailable ->',(await p.locator('main').innerText()).replace(/\n+/g,' | ').slice(0,300)) }
sql("update account set status='Active' where id='01990000-0000-7000-8000-00000000a002'")
// closed (paused) conversation
sql("update conversation set paused_by='01990000-0000-7000-8000-00000000a002' where id='01990000-0000-7000-8000-00000000c001'")
{ const {page:p}=await mk('f001'); await p.goto('http://localhost:4012/discussions/'+C1); await p.waitForTimeout(1500); await p.getByLabel('Réponse réfléchie et posée').fill('Après pause'); await p.getByRole('button',{name:'Envoyer'}).click().catch(()=>{}); await p.waitForTimeout(800); console.log('PAUSED send alerts:', await p.locator('[role=alert]:visible').allTextContents(), 'text kept:', await p.getByLabel('Réponse réfléchie et posée').inputValue()); await p.screenshot({path:E+'/thread-paused-send.png',fullPage:true}) }
sql("update conversation set paused_by=null, ended_at=now() where id='01990000-0000-7000-8000-00000000c001'")
console.log('ENDED via api:', execSync(`bash ${process.argv[3]}/api.sh f001 POST /v1/conversations/${C1}/messages '{"kind":"text","text":"x"}'`).toString().replace(/\n/g,' ').slice(0,260))
sql("update conversation set ended_at=null where id='01990000-0000-7000-8000-00000000c001'")
// session expiry
sql("update session set expires_at=now()-interval '1 minute' where id='01990000-0000-7000-8000-00000000f006'")
{ const {page:p}=await mk('f001'); await p.goto('http://localhost:4012/discussions/'+C1); await p.waitForTimeout(1200); sql("update session set expires_at=now()-interval '1 minute' where id='01990000-0000-7000-8000-00000000f001'"); await p.getByLabel('Réponse réfléchie et posée').fill('Session expirée'); await p.getByRole('button',{name:'Envoyer'}).click(); await p.waitForTimeout(1000); console.log('EXPIRED send ->', await p.locator('[role=alert]:visible').allTextContents(), p.url(), 'kept:', await p.getByLabel('Réponse réfléchie et posée').inputValue().catch(()=>'n/a')); await p.screenshot({path:E+'/thread-session-expired.png'}) }
sql("update session set expires_at=now()+interval '1 day' where id='01990000-0000-7000-8000-00000000f001'")
await browser.close()
