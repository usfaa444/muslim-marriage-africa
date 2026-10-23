import { chromium } from '/home/claude/muslim-marriage-africa/code/node_modules/playwright/index.mjs'
import AxeBuilder from '/home/claude/muslim-marriage-africa/code/node_modules/@axe-core/playwright/dist/index.mjs'
const E=process.argv[2]+'/shots'
const C1='01990000-0000-7000-8000-00000000c001'
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'})
const mk=async(sid,w=390,h=800)=>{const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'fr-FR'});await ctx.addCookies([{name:'ankanu_session',value:`01990000-0000-7000-8000-00000000${sid}`,url:'http://localhost:4012'}]);
 await ctx.route(/cdn\.tailwindcss\.com|fonts\.(googleapis|gstatic)\.com|google\.com\/recaptcha|gstatic/,r=>r.fulfill({status:200,contentType:'text/css',body:''}))
 const page=await ctx.newPage(); const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); page.on('pageerror',e=>errs.push('PAGEERR '+e.message)); page.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())}); return {ctx,page,errs}}
const bro=await mk('f001'), sis=await mk('f002')
await bro.page.goto('http://localhost:4012/discussions/'+C1); await sis.page.goto('http://localhost:4012/discussions/'+C1)
await bro.page.waitForTimeout(1500)
console.log('TEXT brother thread:\n'+await bro.page.locator('body').innerText())
await bro.page.screenshot({path:E+'/thread-brother-initial.png',fullPage:true})
// typing
const t=bro.page.getByLabel('Réponse réfléchie et posée')
const t0=Date.now()
await t.pressSequentially('As-salāmu',{delay:60})
await sis.page.getByText('QA_Frere écrit').waitFor({timeout:3000}).then(()=>console.log('typing visible on sister after',Date.now()-t0,'ms')).catch(()=>console.log('TYPING NOT SHOWN'))
console.log('typing region live attrs:', await sis.page.evaluate(()=>{const e=[...document.querySelectorAll('[aria-live],[role=status]')].map(e=>e.outerHTML.slice(0,160));return e}))
await sis.page.screenshot({path:E+'/thread-sister-typing.png',fullPage:true})
await t.fill('As-salāmu ʿalaykum, test navigateur')
await bro.page.getByRole('button',{name:'Envoyer'}).dblclick()
await sis.page.getByText('test navigateur').waitFor({timeout:4000}).then(()=>console.log('sister got message without reload')).catch(()=>console.log('SISTER DID NOT GET MESSAGE'))
await bro.page.waitForTimeout(500)
console.log('brother status:', await bro.page.evaluate(()=>[...document.querySelectorAll('[role=status],[aria-live]')].map(e=>e.textContent)))
console.log('composer value after send:', JSON.stringify(await t.inputValue()))
console.log('bubbles brother:', await bro.page.locator('[role=log]').innerText())
await bro.page.screenshot({path:E+'/thread-brother-sent.png',fullPage:true})
await sis.page.screenshot({path:E+'/thread-sister-received.png',fullPage:true})
await sis.page.waitForTimeout(5000)
console.log('typing gone after 5s:', !(await sis.page.getByText('écrit…').isVisible().catch(()=>false)))
// list
await sis.page.goto('http://localhost:4012/discussions'); await sis.page.waitForTimeout(1200)
console.log('LIST sister:\n'+await sis.page.locator('main').innerText())
await sis.page.screenshot({path:E+'/list-sister.png',fullPage:true})
// reload thread persistence
await bro.page.reload(); await bro.page.waitForTimeout(1200)
console.log('after reload messages:', (await bro.page.locator('[role=log]').innerText()).replace(/\n/g,' | '))
// hold copy scan
const all=(await bro.page.locator('body').innerText())+(await sis.page.locator('body').innerText())
console.log('hold-copy regex hit:', /vérification|modération|scan|retenu|non lu|\bLu\b/i.test(all))
console.log('errors brother', bro.errs, 'sister', sis.errs)
await browser.close()
