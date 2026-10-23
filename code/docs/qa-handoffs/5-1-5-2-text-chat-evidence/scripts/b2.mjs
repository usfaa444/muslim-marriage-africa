import { chromium } from '/home/claude/muslim-marriage-africa/code/node_modules/playwright/index.mjs'
import AxeBuilder from '/home/claude/muslim-marriage-africa/code/node_modules/@axe-core/playwright/dist/index.mjs'
const E=process.argv[2]+'/shots'
const C1='01990000-0000-7000-8000-00000000c001', C2='01990000-0000-7000-8000-00000000c002'
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'})
const mk=async(sid,w=390,h=800)=>{const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'fr-FR'});await ctx.addCookies([{name:'ankanu_session',value:`01990000-0000-7000-8000-00000000${sid}`,url:'http://localhost:4012'}]);
 await ctx.route(/cdn\.tailwindcss\.com|fonts\.(googleapis|gstatic)\.com|google\.com\/recaptcha|gstatic/,r=>r.fulfill({status:200,contentType:'text/css',body:''}))
 const page=await ctx.newPage(); const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); page.on('pageerror',e=>{if(!/tailwind is not defined/.test(e.message))errs.push('PAGEERR '+e.message)}); page.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())}); return {ctx,page,errs}}
const tags=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']
const axeRes={}
for (const w of [360,390,768,1024,1280,1440]) {
  const u=await mk('f001',w,900)
  for (const [name,path] of [['list','/discussions'],['thread','/discussions/'+C1]]) {
    await u.page.goto('http://localhost:4012'+path); await u.page.waitForTimeout(1200)
    const o=await u.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}))
    const ax=await new AxeBuilder({page:u.page}).withTags(tags).analyze()
    axeRes[`${name}@${w}`]=ax.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,2).map(n=>n.target.join(' '))}))
    console.log(name,w,'overflow',o.sw>o.iw?`YES ${o.sw}>${o.iw}`:'no','axe',ax.violations.map(v=>v.id+':'+v.impact).join(',')||'none')
    await u.page.screenshot({path:`${E}/${name}-${w}.png`,fullPage:true})
  }
  if (u.errs.length) console.log('errs',w,u.errs)
  await u.ctx.close()
}
import fs from 'fs'; fs.writeFileSync(E+'/../g6-axe.json',JSON.stringify(axeRes,null,1))
// touch targets, tab order, keyboard
const u=await mk('f001',390,800); const p=u.page
await p.goto('http://localhost:4012/discussions/'+C1); await p.waitForTimeout(1200)
console.log('targets <44:', JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('a,button,textarea,input,select,[role=button]')].map(e=>{const r=e.getBoundingClientRect();return {t:(e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w<44||x.h<44))))
const order=[]; for(let i=0;i<14;i++){await p.keyboard.press('Tab'); order.push(await p.evaluate(()=>{const e=document.activeElement;return (e.getAttribute('aria-label')||e.id||e.textContent||e.tagName).trim().slice(0,40)+'|'+e.tagName+'|outline:'+getComputedStyle(e).outlineStyle+getComputedStyle(e).outlineWidth}))}
console.log('tab order:',order)
// keyboard-only: focus textarea, type, ctrl+enter
const before=await p.locator('[role=log] >> text=Clavier').count()
await p.getByLabel('Réponse réfléchie et posée').focus(); await p.keyboard.type('Clavier seul: Ctrl+Entrée'); await p.keyboard.press('Control+Enter'); await p.waitForTimeout(800)
console.log('ctrl+enter sent:', await p.getByText('Clavier seul').count(), 'status:', await p.locator('#thread-status').textContent(), 'focus now:', await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName))
// counter
await p.getByLabel('Réponse réfléchie et posée').fill('x'.repeat(1850)); console.log('counter @1850:', await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>/\d+\/2000/.test(e.textContent)&&e.children.length===0).map(e=>e.textContent)))
await p.getByLabel('Réponse réfléchie et posée').fill('x'.repeat(2001)); console.log('counter @2001:', await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>/\d+\/2000/.test(e.textContent)&&e.children.length===0).map(e=>e.textContent)), 'maxlength attr:', await p.getByLabel('Réponse réfléchie et posée').getAttribute('maxlength'))
await p.getByRole('button',{name:'Envoyer'}).click(); await p.waitForTimeout(800)
console.log('2001 send alert:', await p.locator('[role=alert]').allTextContents(), 'text kept len:', (await p.getByLabel('Réponse réfléchie et posée').inputValue()).length)
await p.screenshot({path:E+'/thread-too-long-390.png',fullPage:true})
await p.getByLabel('Réponse réfléchie et posée').fill('   '); console.log('spaces-only disabled:', await p.getByRole('button',{name:'Envoyer'}).isDisabled())
// network fail on send
await p.getByLabel('Réponse réfléchie et posée').fill('Test hors ligne')
await p.route('**/v1/conversations/*/messages',r=>r.request().method()==='POST'?r.abort():r.continue())
await p.getByRole('button',{name:'Envoyer'}).click(); await p.waitForTimeout(800)
console.log('offline send alert:', await p.locator('[role=alert]').allTextContents(), 'kept:', await p.getByLabel('Réponse réfléchie et posée').inputValue())
await p.unroute('**/v1/conversations/*/messages')
// API 500 on thread load
await p.route('**/v1/conversations/*/messages?*',r=>r.fulfill({status:500,body:'{}',contentType:'application/json'}))
await p.reload(); await p.waitForTimeout(1200); console.log('thread load 500 ->', (await p.locator('main').innerText()).slice(0,300).replace(/\n/g,' | '))
await p.screenshot({path:E+'/thread-load-error.png'})
await p.unroute('**/v1/conversations/*/messages?*')
// not mine
await p.goto('http://localhost:4012/discussions/'+C2); await p.waitForTimeout(1200); console.log('IDOR page ->', (await p.locator('main').innerText()).replace(/\n/g,' | ').slice(0,200))
await p.screenshot({path:E+'/thread-not-mine.png'})
await p.goto('http://localhost:4012/discussions/abc'); console.log('abc ->', p.url())
// list 500
await p.route('**/v1/conversations',r=>r.fulfill({status:500,body:'{}',contentType:'application/json'}))
await p.goto('http://localhost:4012/discussions'); await p.waitForTimeout(1200); console.log('list 500 ->', (await p.locator('main').innerText()).replace(/\n/g,' | ').slice(0,250))
await p.unroute('**/v1/conversations')
// signed out
const anon=await browser.newContext(); const ap=await anon.newPage(); await ap.goto('http://localhost:4012/discussions/'+C1); console.log('signed-out ->', ap.url())
// brother with no conversation (nolist user f006 -> not listable)
console.log('errors', u.errs)
await browser.close()
